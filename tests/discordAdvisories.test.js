import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADVISORY_POLICY,coachCondition,advisoryCandidates,observeAdvisories,advisoryPayload,reconcileAdvisories,drainAdvisories} from '../src/discordAdvisories.js';
import {saveDiscordOutbox,readDiscordOutbox,discordDestination,drainDiscordOutbox} from '../src/discordDelivery.js';
import {BTC_DISCORD_CHANNEL} from '../src/discordCalls.js';
const now=Date.parse('2026-10-19T16:03:00Z'),start=Date.parse('2026-10-19T16:00:00Z'),end=start+900000;
const call={key:'BTC|15m|15m-2026-10-19T16:00:00.000Z',kind:'15m',dir:'UP',ticker:'KXBTC15M-26OCT191215-15',strike:82000,closeMs:end,lockedAt:start+60000,result:null};
const destination=discordDestination('https://discord.com/api/webhooks/123456789/fixture-not-a-real-token');
const input=(at=now)=>({asset:'BTC',ready:true,spot:82100,spotAt:at,
  coach:{title:'Drawing down from +35bps peak — thin-volume chop',position:'UP',callKey:call.key,strike:call.strike,gap:15,peak:35,observedAt:at,trackingStartedAt:call.lockedAt},
  quote:{ticker:call.ticker,closeTime:new Date(end).toISOString(),bid:64,ask:65,at},
  flow:{score:85,streakCount:6,divergence:false},
  ticks:[{src:'bn',time:at,usd:1000000,t:'B'},{src:'by',time:at,usd:900000,t:'B'}],
  spotTicks:[{time:at-10000,p:82000},{time:at,p:82100}]});
const box=()=>({schema:1,activatedAt:start,rows:[{key:call.key,call,state:'delivered',messageId:'777',
  webhookId:destination.id,channelId:BTC_DISCORD_CHANNEL}],advisories:[]});
const store=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
const ok={kind:'ok',messageId:'888',channelId:BTC_DISCORD_CHANNEL,webhookId:destination.id};
const candidate=(kind='coach',at=now)=>advisoryCandidates(input(at),[call],at).find(c=>c.family===kind);

test('semantic coach IDs ignore peak numbers and thin-volume title flicker',()=>{
  assert.equal(coachCondition('Drawing down from +35bps peak'),coachCondition('Drawing down from +42bps peak — thin-volume chop'));
  assert.equal(coachCondition('Price spiking DOWN · against you'),coachCondition('Sudden DOWN move · against you'));
  for(const title of ['Early lead · let it develop','Late-window contrary whale','Stop hit — exit now','Reversal expected · entered with caution'])assert.equal(coachCondition(title),null);
});
test('coach context requires a matching genuine active Call, marker direction, quote identity and fresh observation',()=>{
  const i=input();assert.ok(candidate('coach'));
  for(const p of [{asset:'ETH'},{ready:false},{spotAt:now-15001},{coach:{...i.coach,callKey:'wrong'}},
    {coach:{...i.coach,position:'DOWN'}},{coach:{...i.coach,strike:83000}},{coach:{...i.coach,observedAt:now-10001}},
    {coach:{...i.coach,trackingStartedAt:start-900000}},
    {quote:{...i.quote,ticker:'KXBTC15M-other'}},{quote:{...i.quote,at:now-30001}}])
    assert.equal(advisoryCandidates({...i,...p},[call],now).filter(c=>c.family==='coach').length,0,JSON.stringify(p));
  assert.equal(advisoryCandidates(i,[],now).filter(c=>c.family==='coach').length,0);
});
test('whale requires fresh independent Binance+Bybit flow and real same-way spot price movement',()=>{
  const i=input();assert.ok(candidate('whale'));
  for(const p of [{flow:{...i.flow,score:74}},{flow:{...i.flow,streakCount:3}},{flow:{...i.flow,divergence:true}},
    {ticks:i.ticks.slice(0,1)},{ticks:i.ticks.map(t=>({...t,time:now-10001}))},
    {ticks:[i.ticks[0],{...i.ticks[1],t:'S'}]},
    {ticks:i.ticks.map(t=>({...t,usd:500000}))},{spotTicks:[{time:now-10000,p:82100},{time:now,p:82000}]},
    {spotTicks:[{time:now-10000,p:82000},{time:now,p:82000}]},{spotTicks:[{time:now,p:82100}]}])
    assert.equal(advisoryCandidates({...i,...p},[call],now).filter(c=>c.family==='whale').length,0,JSON.stringify(p));
  const sell={...i,ticks:i.ticks.map(t=>({...t,t:'S'})),spotTicks:[{time:now-10000,p:82100},{time:now,p:82000}]};
  assert.equal(advisoryCandidates(sell,[call],now).find(c=>c.family==='whale').condition,'SELL');
});
test('no last-minute, ended-window, stale-spot or missing-readiness coaching',()=>{
  for(const at of [end-60000,end-1000,end]){
    if(at===end)continue;assert.deepEqual(advisoryCandidates(input(at),[call],at),[]);
  }
  assert.deepEqual(advisoryCandidates({...input(),ready:false},[call],now),[]);
});
test('confirmation needs actual observations at least5s apart, not clock ticks or title/value changes',()=>{
  const c=candidate(),first=observeAdvisories({},[c],now);
  assert.equal(first.ready.length,0);
  const repeat=observeAdvisories(first.state,[{...c,title:'numeric title changed'}],now+5000);
  assert.equal(repeat.ready.length,0);
  const tooClose=observeAdvisories(first.state,[{...c,observations:c.observations.map(t=>t+100)}],now+5000);
  assert.equal(tooClose.ready.length,0);
  const fresh=observeAdvisories(first.state,[candidate('coach',now+5000)],now+5000);assert.equal(fresh.ready.length,1);
  const gap=observeAdvisories(first.state,[candidate('coach',now+16000)],now+16000);assert.equal(gap.ready.length,0);
  const disappeared=observeAdvisories(first.state,[],now+5000);assert.deepEqual(disappeared.state,{});
});
test('messages are observational, never legacy scale/exit instructions, pseudo print counts or replay claims',()=>{
  for(const family of ['coach','whale']){
    const p=advisoryPayload(candidate(family),{version:'14.7.13'}),text=JSON.stringify(p);
    assert.match(text,/CONTEXT/);assert.match(text,/not a new Call, verified position/);assert.match(text,/Real trading remains paused/);
    assert.doesNotMatch(text,/your position|scale up|consider closing|454|0\.67|prints|Watch the next 30s/i);
    assert.deepEqual(p.allowed_mentions,{parse:[]});
  }
});
test('durable combined budget is max2/window and5min apart; number/title changes cannot bypass it after refresh',()=>{
  let b=box(),c=candidate('coach');b=reconcileAdvisories(b,[c],[call],destination,{},now);assert.equal(b.advisories.length,1);
  const s=store();saveDiscordOutbox(s,b);b=readDiscordOutbox(s);
  for(const offset of [1000,10000,100000,299999]){
    reconcileAdvisories(b,[{...c,title:'different peak'},candidate('whale',now+offset)],[call],destination,{},now+offset);
    assert.equal(b.advisories.length,1);
  }
  reconcileAdvisories(b,[candidate('whale',now+300000)],[call],destination,{},now+300000);assert.equal(b.advisories.length,2);
  const third={...candidate('coach',now+600000),condition:'adverse-risk',key:'different-condition'};
  reconcileAdvisories(b,[third],[call],destination,{},now+600000);assert.equal(b.advisories.length,2);
});
test('coach context cannot precede its acknowledged Call; new Calls take priority over pending context',async()=>{
  const c=candidate(),b=box();b.rows[0].messageId=null;b.rows[0].state='queued';
  reconcileAdvisories(b,[c],[call],destination,{},now);assert.equal(b.advisories.length,0);
  b.advisories=[{...c,payload:advisoryPayload(c),state:'queued',attempts:0,nextAt:0,webhookId:destination.id}];
  let sent=0;await drainAdvisories(b,{storage:store(),save:saveDiscordOutbox,destination,transport:async()=>{sent++;return ok;},now});assert.equal(sent,0);
});
test('context TTL expires after30s with no stale replay, while Calls and their original payloads remain unchanged',async()=>{
  const b=box(),before=JSON.stringify(b.rows),s=store();reconcileAdvisories(b,[candidate()],[call],destination,{},now);
  let sent=0;await drainAdvisories(b,{storage:s,save:saveDiscordOutbox,destination,now:now+30001,transport:async()=>{sent++;return ok;}});
  assert.equal(sent,0);assert.equal(b.advisories[0].state,'expired');assert.equal(JSON.stringify(b.rows),before);
});
test('acknowledgements persist, timeout never blind-reposts, quota blocks send, and receipt delay extends cooldown',async()=>{
  for(const response of [ok,{kind:'unknown'}]){
    const b=box(),s=store();reconcileAdvisories(b,[candidate()],[call],destination,{},now);let sent=0;
    const transport=async()=>{sent++;return response;};
    await drainAdvisories(b,{storage:s,save:saveDiscordOutbox,destination,transport,now});
    await drainAdvisories(b,{storage:s,save:saveDiscordOutbox,destination,transport,now:now+5000});assert.equal(sent,1);
    assert.equal(readDiscordOutbox(s).advisories[0].state,response===ok?'delivered':'uncertain');
  }
  const b=box();reconcileAdvisories(b,[candidate()],[call],destination,{},now);let sent=0;
  await assert.rejects(drainAdvisories(b,{storage:{setItem(){throw Error('quota');}},save:saveDiscordOutbox,destination,
    transport:async()=>{sent++;return ok;},now}));assert.equal(sent,0);
  const delayed=box();reconcileAdvisories(delayed,[candidate()],[call],destination,{},now);let at=now;
  await drainAdvisories(delayed,{storage:store(),save:saveDiscordOutbox,destination,now,clock:()=>at,
    transport:async()=>{at+=12000;return ok;}});
  assert.equal(delayed.advisoryLastAt,now+12000);
  reconcileAdvisories(delayed,[candidate('whale',now+300000)],[call],destination,{},now+300000);assert.equal(delayed.advisories.length,1);
});
test('advisory429 applies the same webhook bucket backoff to confirmed Call delivery',async()=>{
  const b=box(),s=store();reconcileAdvisories(b,[candidate()],[call],destination,{},now);
  await drainAdvisories(b,{storage:s,save:saveDiscordOutbox,destination,now,transport:async()=>({kind:'rate-limit',retryAfterMs:12000})});
  let sent=0;b.rows.push({key:'new',call:{...call,key:'new'},state:'queued',nextAt:0,messageId:null,webhookId:destination.id});
  await drainDiscordOutbox(b,{storage:s,destination,now:now+1000,transport:async()=>{sent++;return ok;}});assert.equal(sent,0);
});
test('context links the acknowledged original and old ambiguous notes compact without crowding out Call receipts',()=>{
  const b=box();reconcileAdvisories(b,[candidate()],[call],destination,{},now);
  assert.match(JSON.stringify(b.advisories[0].payload),/\/777/);
  const before=JSON.stringify(b.rows);b.advisories[0].state='uncertain';
  reconcileAdvisories(b,[],[],destination,{},now+2*86400000);
  assert.equal(b.advisories.length,0);assert.equal(b.archivedAdvisoryUncertain,1);assert.equal(JSON.stringify(b.rows),before);
});
test('production wiring restores observations, not the spammy old broadcaster; original entry/exit policies stay isolated',()=>{
  const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.match(app,/onUrgentCoachAlert=\{payload=>\{discordCoachObservationRef.current=/);
  assert.match(app,/const _discordCard=cards.find\(c=>c.tone==='urgent'&&coachCondition\(c.title\)\)/);
  assert.doesNotMatch(app,/_lastDiscordAlertRef/);assert.equal(ADVISORY_POLICY.maxPerWindow,2);assert.equal(ADVISORY_POLICY.cooldownMs,300000);
});
