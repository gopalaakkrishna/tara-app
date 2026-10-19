import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeHarness} from './helpers/callDecisionHarness.js';
import {projectBtcCall,collectBtcCalls,btcCallRecord,discordCallPayload,BTC_DISCORD_CHANNEL} from '../src/discordCalls.js';
import {settlementPatch,applyAutomaticCallSettlement} from '../src/callIntegrity.js';
import {DISCORD_OUTBOX_KEY,discordDestination,readDiscordOutbox,saveDiscordOutbox,reconcileDiscordOutbox,
  drainDiscordOutbox,discordWebhookTransport,verifyDiscordDestination} from '../src/discordDelivery.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const destination=discordDestination('https://discord.com/api/webhooks/123456789/fixture-not-a-real-token');
const good=id=>({kind:'ok',messageId:id||'777',channelId:BTC_DISCORD_CHANNEL,webhookId:destination.id});
function captured(dir='UP') {
  const h=makeHarness(dir==='UP'?{probabilityUp:77,yesPrice:60}:
    {probabilityUp:20.055,yesPrice:42,mtf:-2,tapeBuy:10,quality:80,regime:'TRENDING DOWN'});h.run();
  assert.ok(h.logs.length);return h.logs[0];
}
function setup() {
  const row=captured(),call=projectBtcCall(row,'15m',row.originalDecision.lockedAt+5000),now=call.lockedAt+5000;
  const store=storage(),box=readDiscordOutbox(store,call.lockedAt-1),payload=(c,delayed)=>discordCallPayload(c,btcCallRecord([c],c.kind,now),{now,delayed});
  return {row,call,now,store,payload,box:reconcileDiscordOutbox(box,[call],payload,destination,now)};
}
const hourly=(extra={})=>{
  const ms=Date.parse('2026-10-19T15:25:00Z'),closeMs=Date.parse('2026-10-19T16:00:00Z');
  return {ticker:'KXBTCD-26OCT1912-T82000',side:'NO',strike:82000,cost:51,ms,closeMs,conf:75,
    approval:{asset:'BTC',recordedAt:ms+100,modelVersion:'v14.7.11',samples:[{quoteId:'one'}],
      quote:{event:'KXBTCD-26OCT1912',ticker:'KXBTCD-26OCT1912-T82000',closeMs}},...extra};
};

test('actual sealed and saved 15m Calls project symmetrically from their original executable quote',()=>{
  for(const dir of ['UP','DOWN']){
    const row=captured(dir),o=row.originalDecision,c=projectBtcCall(row,'15m',o.lockedAt+5000);
    assert.ok(c);assert.equal(c.dir,dir);assert.equal(c.cost,dir==='UP'?o.yesAsk:100-o.yesBid);
    const before=JSON.stringify(row);collectBtcCalls([row],{},o.lockedAt+5000);assert.equal(JSON.stringify(row),before);
  }
});
test('candidates, other assets/windows, sit-outs, manual/override and wrong contract evidence never become Calls',()=>{
  const row=captured(),o=row.originalDecision,now=o.lockedAt+5000;
  for(const patch of [{originalDecision:null},{dir:'SIT_OUT'},{asset:'ETH'},{windowType:'5m'},
    {manualEdit:true},{manualEditedAt:now},{wasOverriddenNoTrade:true},{isUserForced:true},
    {originalDecision:{...o,provenance:'legacy-observed'}},{originalDecision:{...o,commitPolicy:{action:'manual'}}},
    {originalDecision:{...o,marketTicker:'KXETH15M-wrong'}},{originalDecision:{...o,marketCloseTime:null}},
    {originalDecision:{...o,strike:null}},{originalDecision:{...o,lockedAt:null}},
    {originalDecision:{...o,asset:'ETH'}},{originalDecision:{...o,windowId:'bad'}}])
    assert.equal(projectBtcCall({...row,...patch},'15m',now),null,JSON.stringify(patch));
});
test('exact official settlements update results; guessed, early, edited and wrong identities do not score',()=>{
  const {row,call}=setup(),now=call.closeMs+60000;
  const market={ticker:call.ticker,close_time:new Date(call.closeMs).toISOString(),floor_strike:call.strike,status:'settled',result:'yes'};
  const result=settlementPatch(row,market,now),settled=applyAutomaticCallSettlement(row,result.patch,now);
  assert.equal(projectBtcCall(settled,'15m',now).result,'WIN');
  for(const p of [{ticker:'wrong'},{strike:call.strike+1},{closeTime:new Date(call.closeMs+900000).toISOString()},
    {verifiedAt:call.closeMs-1},{outcomeDir:'DOWN'}]) {
    const c=projectBtcCall({...settled,officialSettlement:{...settled.officialSettlement,...p}},'15m',now);
    assert.equal(c.result,null);
  }
  assert.equal(projectBtcCall({...row,result:'WIN'},'15m',now).result,null);
});
test('hourly requires accepted persisted BTC approval; exact settlement stays separate from15m',()=>{
  const row=hourly(),now=row.closeMs+60000;
  assert.equal(projectBtcCall(row,'1h',now).dir,'DOWN');
  for(const patch of [{approval:null},{approval:{...row.approval,recordedAt:null}},{approval:{...row.approval,asset:'ETH'}},
    {approval:{...row.approval,quote:{...row.approval.quote,ticker:'wrong'}}},{ticker:'KXETHD-wrong'}])assert.equal(projectBtcCall({...row,...patch},'1h',now),null);
  const settled={...row,won:true,officialSettlement:{source:'kalshi-public-api',ticker:row.ticker,
    closeTime:new Date(row.closeMs).toISOString(),strike:row.strike,outcome:'no',verifiedAt:now}};
  assert.equal(projectBtcCall(settled,'1h',now).result,'WIN');
  assert.equal(projectBtcCall({...settled,officialSettlement:{...settled.officialSettlement,strike:82001}},'1h',now).result,null);
  const calls=collectBtcCalls([captured()],{pending:[row],history:[settled]},now).calls;
  assert.equal(calls.filter(c=>c.kind==='1h').length,1);assert.equal(btcCallRecord(calls,'1h',now).retained.wins,1);
  assert.equal(btcCallRecord(calls,'15m',now).retained.n,0);
});
test('canonical duplicates collapse and conflicting originals are withheld, independent of row order',()=>{
  const row=captured(),now=row.originalDecision.lockedAt+5000;
  assert.equal(collectBtcCalls([row,copy(row)],{},now).calls.length,1);
  const other={...row,originalDecision:{...row.originalDecision,yesAsk:55}};
  for(const rows of [[row,other],[other,row]]){const r=collectBtcCalls(rows,{},now);assert.equal(r.calls.length,0);assert.equal(r.conflicts.length,1);}
});
test('record counts denominators and ET day correctly; all pending and sit-outs are excluded',()=>{
  const now=Date.parse('2026-10-19T15:00:00Z');
  const calls=Array.from({length:25},(_,i)=>({kind:'15m',closeMs:now-i*3600000,settledAt:now-i*3600000+1,result:i%2?'LOSS':'WIN'}));
  calls.push({kind:'15m',closeMs:now,result:null},{kind:'1h',closeMs:now,result:'WIN'});
  const r=btcCallRecord(calls,'15m',now);assert.equal(r.retained.n,25);assert.equal(r.last20.n,20);assert.equal(r.last20.pct,50);
  assert.equal(r.today.n,12);assert.equal(r.pending,1);assert.equal(r.sevenDays.n,25);
});
test('message is a compact paper Call with quote not fill, score not probability, separate rates and no fee/profit claim',()=>{
  const {call,now}=setup(),r=btcCallRecord([call],'15m',now),p=discordCallPayload(call,r,{now});
  const text=JSON.stringify(p);assert.match(text,/BTC 15m/);assert.match(text,/Paper Call/);assert.match(text,/not a fill/);assert.match(text,/not win probability/);
  assert.match(text,/Last 20/);assert.match(text,/Last 7 days/);assert.match(text,/fees extra/);assert.deepEqual(p.allowed_mentions,{parse:[]});
  assert.equal(p.embeds[0].timestamp,new Date(call.lockedAt).toISOString());
});
test('webhook validation rejects arbitrary URLs, credentials, query, fragment and non-Discord destinations',()=>{
  assert.ok(destination);
  for(const url of ['https://maps.google.com/example','https://discord.com.evil/api/webhooks/1/t',
    'http://discord.com/api/webhooks/1/t','https://u:p@discord.com/api/webhooks/1/t',
    'https://discord.com/api/webhooks/1/t?x=1','https://discord.com/api/webhooks/1/t#x'])assert.equal(discordDestination(url),null);
});
test('destination metadata must match the existing tara-btc channel before sending',async()=>{
  const fetchImpl=async()=>({ok:true,json:async()=>({id:destination.id,channel_id:BTC_DISCORD_CHANNEL})});
  assert.equal(await verifyDiscordDestination(destination,{fetchImpl}),true);
  await assert.rejects(verifyDiscordDestination(destination,{fetchImpl:async()=>({ok:true,json:async()=>({id:destination.id,channel_id:'wrong'})})}));
});
test('first activation never blasts historical Calls; no candidates or coach/whale events can enqueue',()=>{
  const x=setup(),fresh=readDiscordOutbox(storage(),x.now);
  assert.equal(reconcileDiscordOutbox(fresh,[x.call],x.payload,destination,x.now).rows.length,0);
  assert.equal(reconcileDiscordOutbox(x.box,[],x.payload,null,x.now).rows.length,1);
});
test('save before send; acknowledge and refresh are durable, with no repeat post',async()=>{
  const x=setup(),requests=[];
  const transport=async request=>{assert.equal(JSON.parse(x.store.getItem(DISCORD_OUTBOX_KEY)).rows[0].state,'posting');requests.push(request);return good();};
  const result=await drainDiscordOutbox(x.box,{storage:x.store,destination,transport,now:x.now});
  assert.equal(result.rows[0].state,'delivered');assert.equal(result.rows[0].messageId,'777');
  const restored=reconcileDiscordOutbox(readDiscordOutbox(x.store),[x.call],x.payload,destination,x.now+1000);
  await drainDiscordOutbox(restored,{storage:x.store,destination,transport,now:x.now+1000});assert.equal(requests.length,1);
});
test('official result and rolling record edits PATCH only the acknowledged original, never a result POST',async()=>{
  const x=setup(),requests=[],transport=async r=>{requests.push(r);return good();};
  await drainDiscordOutbox(x.box,{storage:x.store,destination,transport,now:x.now});
  const c={...x.call,result:'LOSS',settledAt:x.call.closeMs+60000},now=c.settledAt;
  const updated=reconcileDiscordOutbox(readDiscordOutbox(x.store),[c],cc=>discordCallPayload(cc,btcCallRecord([c],'15m',now),{now}),destination,now);
  await drainDiscordOutbox(updated,{storage:x.store,destination,transport,now});
  assert.deepEqual(requests.map(r=>r.method),['POST','PATCH']);assert.equal(requests[1].messageId,'777');
  assert.match(JSON.stringify(requests[1].payload),/LOSS/);assert.equal('username'in requests[1].payload,false);
});
test('quota failure blocks the first network write; malformed queues are preserved, not reset',async()=>{
  const x=setup();let sent=0;
  await assert.rejects(drainDiscordOutbox(x.box,{storage:{setItem(){throw Error('quota');}},destination,transport:async()=>{sent++;return good();},now:x.now}));
  assert.equal(sent,0);assert.throws(()=>readDiscordOutbox({getItem:()=>'{broken'}));
});
test('a slim later source cannot erase an acknowledged official result, and conflicting verified results are quarantined',()=>{
  const x=setup(),settled={...x.call,result:'WIN',settledAt:x.call.closeMs+60000};
  x.box.rows[0].call=settled;x.box.rows[0].messageId='777';x.box.rows[0].state='delivered';
  const slim=reconcileDiscordOutbox(x.box,[x.call],x.payload,destination,settled.settledAt);
  assert.equal(slim.rows[0].call.result,'WIN');assert.match(JSON.stringify(slim.rows[0].payload),/WIN/);
  const conflict=reconcileDiscordOutbox(x.box,[{...settled,result:'LOSS'}],x.payload,destination,settled.settledAt);
  assert.equal(conflict.rows[0].state,'blocked');
});
test('crash after POST began, no receipt, network timeout and 5xx never blind-repost',async()=>{
  for(const response of [{kind:'unknown'},{kind:'ok',messageId:null}]){
    const x=setup();let n=0;const transport=async()=>{n++;return response;};
    await drainDiscordOutbox(x.box,{storage:x.store,destination,transport,now:x.now});
    assert.equal(x.box.rows[0].state,'uncertain');
    await drainDiscordOutbox(x.box,{storage:x.store,destination,transport,now:x.now+60000});assert.equal(n,1);
  }
  const x=setup();x.box.rows[0].state='posting';saveDiscordOutbox(x.store,x.box);
  assert.equal(reconcileDiscordOutbox(readDiscordOutbox(x.store),[x.call],x.payload,destination,x.now).rows[0].state,'uncertain');
});
test('rate limits delay the whole webhook bucket and retry a bounded number of times',async()=>{
  const x=setup();let n=0,now=x.now;
  const transport=async()=>{n++;return {kind:'rate-limit',retryAfterMs:9000};};
  for(let i=0;i<5;i++){
    await drainDiscordOutbox(x.box,{storage:x.store,destination,transport,now});
    await drainDiscordOutbox(x.box,{storage:x.store,destination,transport,now:now+1000});assert.equal(n,i+1);now+=9000;
  }
  assert.equal(x.box.rows[0].state,'failed');assert.equal(n,5);
});
test('failed edits retry idempotently by message ID; deleted originals are never replaced',async()=>{
  const x=setup();await drainDiscordOutbox(x.box,{storage:x.store,destination,transport:async()=>good(),now:x.now});
  x.box.rows[0].payload.embeds[0].title+=' · WIN';const methods=[];
  await drainDiscordOutbox(x.box,{storage:x.store,destination,transport:async r=>{methods.push(r.method);return {kind:'unknown'};},now:x.now+1});
  assert.equal(x.box.rows[0].state,'retry');
  await drainDiscordOutbox(x.box,{storage:x.store,destination,transport:async r=>{methods.push(r.method);return {kind:'rejected'};},now:x.now+60000});
  assert.deepEqual(methods,['PATCH','PATCH']);assert.equal(x.box.rows[0].state,'failed');
});
test('closed unsent Calls expire, recipient changes never retarget, conflicting evidence blocks',async()=>{
  const x=setup();let n=0;const transport=async()=>{n++;return good();};
  await drainDiscordOutbox(x.box,{storage:x.store,destination:{...destination,id:'other'},transport,now:x.now});assert.equal(n,0);
  await drainDiscordOutbox(x.box,{storage:x.store,destination,transport,now:x.call.closeMs});assert.equal(n,0);assert.equal(x.box.rows[0].state,'expired');
  const y=setup(),c={...y.call,dir:'DOWN'};
  assert.equal(reconcileDiscordOutbox(y.box,[c],y.payload,destination,y.now).rows[0].state,'blocked');
});
test('transport uses wait=true, explicit PATCH and receipt IDs, honors429 and sanitizes failures',async()=>{
  const x=setup(),seen=[];
  const fetchImpl=async(url,opts)=>{seen.push({url,opts});return {ok:true,status:200,json:async()=>({id:'777',channel_id:BTC_DISCORD_CHANNEL,webhook_id:destination.id})};};
  assert.deepEqual(await discordWebhookTransport({destination,method:'POST',payload:x.box.rows[0].payload},{fetchImpl}),good());
  await discordWebhookTransport({destination,method:'PATCH',messageId:'777',payload:x.box.rows[0].payload},{fetchImpl});
  assert.ok(seen[0].url.endsWith('?wait=true'));assert.ok(seen[1].url.endsWith('/messages/777'));
  assert.equal((await discordWebhookTransport({destination,method:'POST',payload:{}},{fetchImpl:async()=>({status:429,json:async()=>({retry_after:2.5})})})).retryAfterMs,2500);
  assert.equal((await discordWebhookTransport({destination,method:'POST',payload:{}},{fetchImpl:async()=>({status:500})})).kind,'unknown');
});
test('receipt time and a live per-operation clock prevent a delayed metadata or earlier send from posting an expired Call',async()=>{
  const x=setup();let n=0;
  await drainDiscordOutbox(x.box,{storage:x.store,destination,now:x.now,clock:()=>x.call.closeMs,
    transport:async()=>{n++;return good();}});
  assert.equal(n,0);assert.equal(x.box.rows[0].state,'expired');
  const y=setup(),received=y.now+12000;let reads=0;
  await drainDiscordOutbox(y.box,{storage:y.store,destination,now:y.now,clock:()=>++reads===1?y.now:received,
    transport:async()=>({kind:'rate-limit',retryAfterMs:9000})});
  assert.equal(y.box.nextAt,received+9000);
});
test('production wiring has one saved-Call sender, no manual/synthetic/coach/whale HTTP path, and a read-only connection check',()=>{
  const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.match(app,/useDiscordCalls\(\{entries:taraCallLog,hourly:_hourlyEngine.rec/);
  assert.doesNotMatch(app,/broadcastToDiscord\('(COACH_ALERT|WHALE|HOURLY_LOCK|TARA_LOCK|TARA_RESULT|SIGNAL)'/);
  assert.doesNotMatch(app,/Test sent ✓|Discord allows edits or deletes within 15 minutes/);
  assert.match(app,/Check connection/);assert.match(app,/DiscordDeliveryPanel delivery=\{btcDiscordDelivery\}/);
});
