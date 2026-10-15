import test from 'node:test';
import assert from 'node:assert/strict';
import * as h from '../src/hourlyDecision.js';
import {hourlyHarness,actualHourlyModel} from './helpers/hourlyHarness.js';
const start=Date.parse('2026-10-13T23:20:00Z'),close=start+40*60000,event='KXBTCD-26OCT1320';
const policy=h.readHourlyPolicy({getItem:()=>null});
const model=actualHourlyModel();
function input(direction='UP',at=start,extra={}){
  const row={ticker:event+'-T83300',event,status:'active',strikeType:'greater',strike:83300,closeMs:close,bid:49,ask:50,vol:500};
  const spot=direction==='UP'?83450:83150;
  return {now:at,asset:'BTC',source:'coinbase',spot,spotAt:at,readiness:{ready:true},signal:{call:direction,confidence:70},
    record:{pending:[],history:[]},enabled:true,
    lad:{sampleId:String(at),requestedAt:at,receivedAt:at,event,closeMs:close,strikes:[row],fees:{type:'quadratic',multiplier:1}},...extra};
}
const sample=(previous,i)=>h.advanceHourlyConfirmation(previous,h.assessHourlyPick(i,policy,model),i);
const props=i=>({spot:i.spot,spotAt:i.spotAt,source:i.source,asset:i.asset,readiness:i.readiness,taraCall:i.signal});

test('repeated renders cannot confirm; three fresh 20s market and spot observations confirm the same contract in either direction',()=>{
  for(const dir of ['UP','DOWN']){
    let i=input(dir),step=sample(null,i);
    for(let j=0;j<100;j++)step=sample(step.state,{...i,now:start+j,spotAt:start+j});
    assert.equal(step.state.samples.length,1);assert.equal(step.ok,false);
    i=input(dir,start+20000);step=sample(step.state,i);assert.equal(step.ok,false);
    i=input(dir,start+40000);step=sample(step.state,i);assert.equal(step.ok,true);
    assert.equal(step.pick.side,dir==='UP'?'YES':'NO');assert.equal(step.evidence.samples.length,3);
    assert.equal(step.evidence.spanMs,40000);assert.ok(step.evidence.netEdgeCents>0);
  }
});

test('new quote with no new spot observation, out-of-order polls, and rapid polls cannot manufacture confirmation time',()=>{
  const first=input(),a=sample(null,first);
  const frozen=input('UP',start+10000,{spotAt:start});const b=sample(a.state,frozen);assert.equal(b.state.samples.length,1);
  let step=a;for(let n=1;n<=3;n++)step=sample(step.state,input('UP',start+n));
  assert.equal(step.ok,false);assert.equal(step.evidence,null);
  const old=input('UP',start-1);step=sample(step.state,old);assert.equal(step.ok,false);
});

test('candidate, direction, source and hour changes require fresh confirmations for the new identity',()=>{
  const first=input();let a=sample(null,first);a=sample(a.state,input('UP',start+20000));
  for(const changed of [input('DOWN',start+40000),input('UP',start+40000,{source:'kraken'}),input('UP',start+40000)]){
    if(changed.source==='coinbase'&&changed.signal.call==='UP'){changed.lad.strikes[0].ticker=event+'-T83299.99';changed.lad.strikes[0].strike=83299.99;}
    const b=sample(a.state,changed);assert.equal(b.ok,false);assert.equal(b.state.samples.length,1);
  }
});

test('weak confidence, stale or failed data and a gap in observation reset the chain with the actual reason',()=>{
  let step=sample(null,input());step=sample(step.state,input('UP',start+20000));
  for(const [patch,code] of [
    [{signal:{call:'UP',confidence:64.99}},'confidence'],[{readiness:{ready:false,reason:'Loading candles'}},'readiness'],
    [{spotAt:start},'spot-stale'],[{spotAt:start+90000},'spot-stale'],[{spot:null},'spot-stale'],
    [{signal:{call:'SIT_OUT',reason:'Signal weak'}},'signal'],[{signal:{call:'UP',confidence:90,isNoGo:true}},'signal']
  ]){const rejected=sample(step.state,input('UP',start+40000,patch));assert.equal(rejected.code,code);assert.equal(rejected.state.samples.length,0);}
  const gap=sample(step.state,input('UP',start+80000));assert.equal(gap.state.samples.length,1);
  const stale=input('UP',start+50000);stale.lad.requestedAt=start;assert.equal(sample(step.state,stale).code,'quote-stale');
  const failed=input();failed.lad.err='offline';assert.equal(sample(step.state,failed).code,'quote-error');
  const missing=input();missing.lad.receivedAt=null;assert.equal(sample(step.state,missing).code,'quote-stale');
});

test('confidence boundary is65; model must support the proposed side and pay the executable price plus fee symmetrically',()=>{
  for(const dir of ['UP','DOWN']){
    const i=input(dir);i.signal.confidence=65;assert.equal(h.assessHourlyPick(i,policy,model).ok,true);
    i.signal.confidence=64.999;assert.equal(h.assessHourlyPick(i,policy,model).code,'confidence');i.signal.confidence=70;
    assert.equal(h.assessHourlyPick(i,policy,()=>.5).code,'model-edge');
    const price=dir==='UP'?50:51;
    const p=(price+2)/100;
    assert.equal(h.assessHourlyPick(i,policy,()=>dir==='UP'?p:1-p).ok,false);
    assert.equal(h.assessHourlyPick(i,policy,()=>dir==='UP'?p+.01:1-p-.01).ok,true);
    assert.equal(h.assessHourlyPick(i,policy,()=>null).code,'model');
    i.lad.fees={type:'unknown',multiplier:1};assert.equal(h.assessHourlyPick(i,policy,model).code,'fees');
  }
});

test('pick ranking prefers estimated net edge and skips a conflicting first strike rather than taking the cheapest price',()=>{
  const i=input();i.lad.strikes.push({...i.lad.strikes[0],ticker:event+'-T83200',strike:83200,ask:59,bid:58});
  assert.equal(h.assessHourlyPick(i,policy,model).pick.strike,83200);
  i.record.pending=[{ticker:'previous',side:'NO',strike:83250,closeMs:close,ms:start-200000}];
  assert.equal(h.assessHourlyPick(i,policy,model).pick.strike,83200);
});

test('market normalization rejects crossed/missing/closed/wrong-event quotes and retains exact executable prices and per-market close',()=>{
  const row={ticker:event+'-T83300',event_ticker:event,status:'active',strike_type:'greater',floor_strike:83300,
    close_time:new Date(close).toISOString(),volume_fp:'500.00',yes_bid_dollars:'0.4990',yes_ask_dollars:'0.5001'};
  const invalid=[{yes_bid_dollars:null},{yes_bid_dollars:'0.60'},{status:'finalized'},{event_ticker:'KXBTC15M-OTHER'},
    {strike_type:'between'},{close_time:new Date(start).toISOString()},{ticker:'other'}];
  const result=h.normalizeHourlyMarkets([row,...invalid.map(p=>({...row,...p}))],event,start,start+200,{type:'quadratic',multiplier:1});
  assert.equal(result.strikes.length,1);assert.equal(result.strikes[0].ask,50.01);assert.equal(result.closeMs,close);
  assert.equal(result.requestedAt,start);assert.equal(result.receivedAt,start+200);
});

test('existing hourly overrides, time band, duplicate/contradiction, flip confirmation, cap and restored cooldown remain enforced',()=>{
  const storage=new Map([['taraHourlyConfirmTicks','4'],['taraHourlyMinCost','46'],['taraHourlyMaxCost','59'],['taraHourlyMaxLocks','2'],['taraHourlyCooldownMin','5']]);
  const p=h.readHourlyPolicy({getItem:k=>storage.get(k)??null});assert.equal(p.confirmTicks,4);assert.equal(p.minCost,46);assert.equal(p.maxCost,59);assert.equal(p.maxLocks,2);assert.equal(p.cooldownMs,300000);
  assert.equal(h.assessHourlyPick(input('UP',start-1),policy,model).code,'timing');
  assert.equal(h.assessHourlyPick(input('UP',close-14*60000),policy,model).code,'timing');
  const i=input();i.record.pending=[{ticker:'earlier',side:'NO',strike:83400,closeMs:close,ms:start-200000}];
  assert.equal(h.assessHourlyPick(i,policy,model).pick.needTicks,6);
  i.record.pending[0].ms=start-1000;assert.equal(h.assessHourlyPick(i,policy,model).code,'cooldown');
  i.record.pending[0].ms=null;assert.equal(h.assessHourlyPick(i,policy,model).code,'cooldown');
  i.record.pending=[{ticker:i.lad.strikes[0].ticker,side:'YES',strike:83300,closeMs:close,ms:start-200000}];
  assert.equal(h.assessHourlyPick(i,policy,model).code,'duplicate');
});

test('actual component and record hook save one evidence-bearing pick and emit one alert only after fresh confirmation',async()=>{
  let i=input();const host=hourlyHarness({lad:i.lad,now:i.now,props:props(i)});host.render();await host.flush();
  for(let n=0;n<30;n++){host.render();await host.flush();}
  assert.equal(host.record.pending.length,0);assert.equal(host.alerts.length,0);assert.equal(host.output.confirmation.samples.length,1);
  for(const elapsed of [20000,40000]){i=input('UP',start+elapsed);host.setTime(i.now);host.setLadder(i.lad);host.render(props(i));await host.flush();}
  assert.equal(host.record.pending.length,1);assert.equal(host.alerts.length,1);assert.equal(host.output.LOCKS.length,1);
  const pick=host.record.pending[0];assert.equal(pick.side,'YES');assert.equal(pick.approval.samples.length,3);
  assert.equal(pick.approval.confidence,70);assert.ok(pick.approval.netEdgeCents>0);assert.equal(host.writes.at(-1)[0],'memory/hourlyRecord');
  const restored=hourlyHarness({lad:i.lad,now:i.now,props:props(i),record:host.record});restored.render();await restored.flush();
  assert.equal(restored.output.LOCKS[0].ms,pick.ms);assert.deepEqual(restored.output.LOCKS[0].approval,pick.approval);assert.equal(restored.alerts.length,0);
});

test('a failed shared-record check cannot show or alert a phantom lock',async()=>{
  let i=input();const host=hourlyHarness({lad:i.lad,now:i.now,props:props(i),readCloud:async()=>{throw Error('offline');}});
  host.render();await host.flush();for(const elapsed of [20000,40000]){i=input('UP',start+elapsed);host.setTime(i.now);host.setLadder(i.lad);host.render(props(i));await host.flush();}
  assert.equal(host.record.pending.length,0);assert.equal(host.alerts.length,0);assert.equal(host.output.LOCKS.length,0);
  assert.equal(host.output.status.code,'record-read');
});

test('the actual commit path rechecks a direction change and the hourly time boundary after an awaited record read',async()=>{
  for(const changed of ['direction','closed']){
    let resolve,reads=0,i=input();const host=hourlyHarness({lad:i.lad,now:i.now,props:props(i),readCloud:()=>++reads===1?Promise.resolve(null):new Promise(r=>resolve=r)});
    host.render();await host.flush();for(const elapsed of [20000,40000]){i=input('UP',start+elapsed);host.setTime(i.now);host.setLadder(i.lad);host.render(props(i));await host.flush();}
    assert.equal(host.record.pending.length,0);assert.equal(host.output.LOCKS.length,0);
    if(changed==='direction'){i=input('DOWN',start+41000);host.setTime(i.now);host.render(props(i));await host.flush();}else host.setTime(close-14*60000);
    resolve(null);await host.flush();assert.equal(host.record.pending.length,0);assert.equal(host.alerts.length,0);
  }
});

test('today\'s three captured losing picks fail the new approval inputs without using their outcomes',()=>{
  for(const row of [{conf:55.75,model:46.1,cost:56},{conf:34.715286619196505,model:50.2,cost:45},{conf:57.2,model:41.6,cost:60}]){
    const i=input('DOWN');i.signal.confidence=row.conf;i.lad.strikes[0].bid=100-row.cost;i.lad.strikes[0].ask=101-row.cost;
    assert.equal(h.assessHourlyPick(i,policy,()=>row.model/100).code,'confidence');
    i.signal.confidence=70;assert.equal(h.assessHourlyPick(i,policy,()=>row.model/100).code,'model-edge');
  }
});

test('fresh sample counter resets after a rejected poll and on the next hourly market',()=>{
  let a=sample(null,input());a=sample(a.state,input('UP',start+20000));
  const bad=input('UP',start+40000);bad.signal.confidence=30;a=sample(a.state,bad);
  const next=sample(a.state,input('UP',start+60000));assert.equal(next.state.samples.length,1);
  const later=input('UP',start+3600000);later.lad.closeMs+=3600000;later.lad.event=event+'NEXT';
  Object.assign(later.lad.strikes[0],{closeMs:later.lad.closeMs,event:later.lad.event,ticker:later.lad.event+'-T83300'});
  const changed=sample(next.state,later);assert.equal(changed.state.samples.length,1);assert.equal(changed.ok,false);
});

test('hourly lock cap and contradictory positions include the persisted record after refresh',()=>{
  const i=input();i.record.pending=Array.from({length:3},(_,n)=>({ticker:'old'+n,strike:83100+n,side:'YES',closeMs:close,ms:start-200000-n}));
  assert.equal(h.assessHourlyPick(i,policy,model).code,'lock-cap');
  i.record.pending=[{ticker:'opposite',strike:83300,side:'NO',closeMs:close,ms:start-200000}];
  assert.equal(h.assessHourlyPick(i,policy,model).code,'contradiction');
});

test('two actual panels sharing local storage accept and alert a confirmed contract only once',async()=>{
  let i=input();const sharedStorage=new Map([['taraHourlyRecord_v1',JSON.stringify({pending:[],history:[]})]]);
  const hosts=[0,1].map(()=>hourlyHarness({lad:i.lad,now:i.now,props:props(i),sharedStorage}));
  for(const host of hosts)host.render();await Promise.all(hosts.map(x=>x.flush()));
  for(const elapsed of [20000,40000]){i=input('UP',start+elapsed);for(const host of hosts){host.setTime(i.now);host.setLadder(i.lad);host.render(props(i));}await Promise.all(hosts.map(x=>x.flush()));}
  assert.equal(hosts[0].record.pending.length,1);assert.equal(hosts.reduce((n,x)=>n+x.alerts.length,0),1);
});

test('actual shared-record conflict and full local storage reject without a lock or alert',async()=>{
  for(const mode of ['cloud-conflict','storage']){
    let i=input();const cloud={pending:[{ticker:'remote-opposite',side:'NO',strike:83300,closeMs:close,ms:start-500000}],history:[]};
    let reads=0;
    const host=hourlyHarness({lad:i.lad,now:i.now,props:props(i),readCloud:async()=>++reads>1&&mode==='cloud-conflict'?cloud:null});
    host.render();await host.flush();
    if(mode==='storage')host.scope.localStorage.setItem=()=>{throw Error('quota exceeded');};
    for(const elapsed of [20000,40000]){i=input('UP',start+elapsed);host.setTime(i.now);host.setLadder(i.lad);host.render(props(i));await host.flush();}
    assert.equal(host.alerts.length,0);assert.equal(host.record.pending.length,0);
    assert.equal(host.output.status.code,mode==='storage'?'record-storage':'contradiction');
  }
});

test('disabled hourly panel cannot count, save, or alert a pick',async()=>{
  const i=input(),host=hourlyHarness({lad:i.lad,now:i.now,props:props(i)});host.storage.set('taraHourlyLadder','off');
  host.render();await host.flush();assert.equal(host.output.confirmation.samples.length,0);assert.equal(host.output.status.code,'disabled');assert.equal(host.alerts.length,0);
});

test('actual ladder polling carries request/receipt identity, rejects overlaps and marks failed polls instead of rejuvenating stale data',async()=>{
  let resolve,hold=false,fail=false,marketCalls=0;
  const i=input();const row={ticker:event+'-T83300',event_ticker:event,status:'active',strike_type:'greater',floor_strike:83300,
    close_time:new Date(close).toISOString(),volume_fp:'500',yes_bid_dollars:'0.49',yes_ask_dollars:'0.50'};
  const race=async urls=>{
    if(urls[0].includes('series/'))return {ok:true,data:{series:{ticker:'KXBTCD',fee_type:'quadratic',fee_multiplier:1}}};
    if(urls[0].includes('events?'))return {ok:true,data:{events:[{event_ticker:event}]}};
    marketCalls++;if(fail)return {ok:false,reason:'offline'};
    if(hold)return new Promise(r=>resolve=r);return {ok:true,data:{markets:[row]}};
  };
  const host=hourlyHarness({now:i.now,props:props(i),realLadder:true,race});host.render();await host.flush();
  host.setTime(start+1);host.render(props(input('UP',start+1)));await host.flush();
  assert.equal(host.output.input.lad.receivedAt,start);assert.equal(host.output.confirmation.samples.length,1);
  const poll=host.intervals.find(x=>x.ms===20000).fn;
  hold=true;host.setTime(start+20000);host.render(props(input('UP',start+20000)));const first=poll();await new Promise(r=>setImmediate(r));await poll();assert.equal(marketCalls,2);
  resolve({ok:true,data:{markets:[row]}});await first;await host.flush();
  assert.equal(host.output.input.lad.requestedAt,start+20000);
  fail=true;host.setTime(start+40000);await poll();await host.flush();
  assert.match(host.output.input.lad.err,/offline/);assert.equal(host.output.input.lad.receivedAt,start+20000);assert.equal(host.output.confirmation.samples.length,0);
});

test('settlement preserves original hourly approval and cannot erase a new pending pick saved during the settlement read',async()=>{
  const evidence={policyVersion:'14.4.10',samples:[{quoteId:'captured'}]},pending={ticker:'KXBTCD-26OCT1319-T80000',side:'YES',strike:80000,cost:50,closeMs:start-60000,ms:start-200000,approval:evidence};
  let resolve;const i=input(),host=hourlyHarness({lad:i.lad,now:i.now,props:props(i),record:{pending:[pending],history:[]},fetchMock:()=>new Promise(r=>resolve=r)});
  host.render();await new Promise(r=>setImmediate(r));
  const cur=host.record;cur.pending.push({ticker:'NEW',side:'YES',strike:83300,cost:50,closeMs:close,ms:start});host.storage.set('taraHourlyRecord_v1',JSON.stringify(cur));
  resolve({ok:true,json:async()=>({market:{ticker:pending.ticker,floor_strike:80000,close_time:new Date(pending.closeMs).toISOString(),status:'settled',result:'yes'}})});await host.flush();
  assert.equal(host.record.pending.length,1);assert.equal(host.record.pending[0].ticker,'NEW');
  assert.deepEqual(host.record.history[0].approval,evidence);assert.equal(host.record.history[0].won,true);
});

test('missing hourly market metadata reports unavailable market, never negative-epoch timing',()=>{
  for(const closeMs of [null,undefined,NaN,0]){
    const i=input();i.lad.closeMs=closeMs;
    const result=h.assessHourlyPick(i,policy,model);
    assert.equal(result.code,'market-unavailable');assert.doesNotMatch(result.reason,/-\d+m/);
  }
});

test('actual hourly save and merge preserve unresolved picks beyond six hours and the former pending cap',async()=>{
  const i=input(),pending=Array.from({length:45},(_,n)=>({ticker:`KXBTCD-OLD-T${n}`,side:'YES',strike:80000+n,cost:50,
    closeMs:start-7*3600000,ms:start-8*3600000+n,approval:{samples:[{quoteId:'captured'+n}]}}));
  const host=hourlyHarness({lad:i.lad,now:i.now,props:props(i),record:{pending,history:[]}});
  const merged=host.scope._hrMerge({pending,history:[]},{pending:[],history:[]});
  host.scope._hrSave(merged);assert.equal(host.record.pending.length,45);
  assert.deepEqual(host.record.pending[0].approval,pending[0].approval);
  assert.equal(host.writes.at(-1)[1].pending.length,45);
});

test('exact hourly ticker, close, strike, event and official result are required; unresolved records remain pending',()=>{
  const pick={ticker:event+'-T83300',side:'NO',strike:83300,closeMs:close,approval:{quote:{event}}};
  const market={ticker:pick.ticker,event_ticker:event,close_time:new Date(close).toISOString(),floor_strike:83300,status:'settled',result:'no',strike_type:'greater'};
  assert.equal(h.inspectHourlySettlement(pick,market,close+60000).won,true);
  for(const patch of [{ticker:event+'-OTHER'},{close_time:new Date(close+3600000).toISOString()},
    {floor_strike:80000},{event_ticker:'other'},{result:''},{status:'active'},{strike_type:'between'}])
    assert.equal(h.inspectHourlySettlement(pick,{...market,...patch},close+60000).ok,false);
  assert.equal(h.inspectHourlySettlement(pick,market,close-1).ok,false);
});

test('actual hourly poll advances past the expired first event without carrying confirmation samples into the next hour',async()=>{
  const i=input(),nextEvent='KXBTCD-26OCT1321',seen=[];
  const race=async urls=>{
    const url=urls[0];
    if(url.includes('series/'))return {ok:true,data:{series:{ticker:'KXBTCD',fee_type:'quadratic',fee_multiplier:1}}};
    if(url.includes('events?'))return {ok:true,data:{events:[{event_ticker:event},{event_ticker:nextEvent}]}};
    const ev=url.includes(nextEvent)?nextEvent:event;seen.push(ev);
    return {ok:true,data:{markets:[{ticker:ev+'-T83300',event_ticker:ev,status:'active',strike_type:'greater',floor_strike:83300,
      close_time:new Date(ev===event?start-1000:close).toISOString(),volume_fp:'500',yes_bid_dollars:'0.49',yes_ask_dollars:'0.50'}]}};
  };
  const host=hourlyHarness({now:i.now,props:props(i),realLadder:true,race});host.render();await host.flush();
  assert.deepEqual(seen,[event,nextEvent]);assert.equal(host.output.input.lad.event,nextEvent);
  host.setTime(start+1);host.render(props(input('UP',start+1)));await host.flush();
  assert.equal(host.output.confirmation.samples.length,1);assert.equal(host.record.pending.length,0);
  host.unmount();
});

test('commit rechecks a newly discovered opposite lock and requires the existing doubled flip sample count',()=>{
  let step;for(const elapsed of [0,20000,40000])step=sample(step?.state,input('UP',start+elapsed));
  const i=input('UP',start+40000),proposal=h.hourlyProposal(step,i,'test');
  i.record.pending=[{ticker:'REMOTE',side:'NO',strike:83500,closeMs:close,ms:start-300000}];
  assert.equal(h.revalidateHourlyProposal(proposal,i,policy,model).code,'confirmation-changed');
  i.record.pending=[];
  assert.equal(h.revalidateHourlyProposal(proposal,i,{...policy,confirmTicks:4},model).code,'confirmation-changed');
});

test('fee estimate honors the fetched series multiplier, rounds one-contract taker cost up, and rejects unknown metadata',()=>{
  assert.equal(h.hourlyFeeCents(50,{type:'quadratic',multiplier:1}),2);
  assert.equal(h.hourlyFeeCents(50,{type:'quadratic',multiplier:2}),4);
  assert.equal(h.hourlyFeeCents(50,{type:'quadratic',multiplier:0}),0);
  assert.equal(h.hourlyFeeCents(50,{type:'quadratic',multiplier:null}),null);
  assert.equal(h.hourlyFeeCents(50,{type:'unknown',multiplier:1}),null);
});

test('cloud hydration applies approval evidence even when pending and history counts are unchanged',async()=>{
  const i=input(),entry={ticker:i.lad.strikes[0].ticker,side:'YES',strike:83300,cost:50,closeMs:close,ms:start-50000};
  const fresh={pending:[{...entry,approval:{policyVersion:'14.4.10',samples:[{quoteId:'original'}]}}],history:[]};
  const host=hourlyHarness({lad:i.lad,now:i.now,props:props(i),record:{pending:[entry],history:[]},readCloud:async()=>fresh});
  host.render();await host.flush();assert.deepEqual(host.output.LOCKS[0].approval,fresh.pending[0].approval);assert.equal(host.alerts.length,0);
});
