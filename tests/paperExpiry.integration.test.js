// Production controllers and worker, with isolated storage/transport only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {app,compile} from './helpers/callDecisionHarness.js';
import {actual} from './helpers/hourlyHarness.js';
import * as safety from '../src/executionSafety.js';
import * as journal from '../src/executionJournal.js';
import * as paper from '../src/paperExpiry.js';
import {checkEntryMode} from '../src/executionIntegrity.js';
import {windowCloseMs,inspectDecisionQuote} from '../src/callIntegrity.js';
import {callLockDeadline} from '../src/callPolicy.js';
const settings={enabled:true,dryRun:true,signalSource:'snapshot',maxBetPerTrade:1,maxDailyLoss:6,maxAutoTradesPerDay:8,maxAutoTradesPerWindow:1};
const close=Date.parse('2026-10-15T06:15:00Z'),wid='15m-2026-10-15T06:00:00.000Z',ticker='KXBTC15M-26OCT150215-15',strike=83400;
const rolloverStart=app.indexOf('        const _rollAos=autoOrderStateRef.current;');
const rollover=compile(app.slice(rolloverStart,app.indexOf("        taraAdviceRef.current='SEARCHING...';",rolloverStart)));
function host(dir){
  let clock=close-840000,state=null,network=0;
  const values=new Map(),writes=[],storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{writes.push(k);values.set(k,v);}};
  const FakeDate=class extends Date{static now(){return clock;}};
  const snapshot={id:7,windowId:wid,locked:true,call:dir,_committedAt:clock,originalDecision:{marketTicker:ticker,strike}};
  const scope={...safety,...journal,...paper,Date:FakeDate,crypto,encodeURIComponent,Promise,useCallback:f=>f,autoExecSettings:{...settings},autoExecCooldownUntil:0,exchangeAudit:{},killSwitchEngaged:false,kalshiCreds:{},autoOrderState:state,autoOrderStateRef:{current:state},lockedCallRef:{current:null},taraCallSnapshotRef:{current:snapshot},windowType:'15m',_resolveStakeDollars:()=>1,_entryBusyRef:{current:false},_entryFiredForRef:{current:null},_lossCooldownRef:{current:{windowsRemaining:0}},_execSettlementLedgerRef:{current:{}},_executionControlRef:{current:{enabled:true,kill:false,windowId:wid}},computeWindowId:()=>wid,_autoExecLogPushBlockOnce(){},_autoExecLogPush(){},checkEntryMode,localStorage:storage,windowCloseMs,callLockDeadline,_execCostCents:()=>60,_quoteUsable:()=>true,inspectDecisionQuote,currentAssetRef:{current:'BTC'},_execFairCents:()=>60,_kalshiQuote:{ticker,at:clock,bid:dir==='UP'?59:40,ask:dir==='UP'?60:41,closeTime:new Date(close).toISOString()},navigator:{locks:{request:async(_n,fn)=>fn()}},setAutoOrderState:v=>{state=typeof v==='function'?v(state):v;scope.autoOrderState=state;scope.autoOrderStateRef.current=state;journal.writeExecutionState(storage,state);},kalshiAuthedFetch:()=>{network++;throw Error('No authenticated transport allowed');},_exitBusyRef:{current:false},_exitFiredForRef:{current:null},_exitYesLimitCents:()=>dir==='UP'?70:30,kalshiNormalizeOrder:safety.normalizeExecutionOrder};
  for(const name of ['readLockState','kalshiBuildOrder','kalshiPlaceOrder','kalshiGetOrder','kalshiCancelOrder','planEntryLadder','kalshiRunEntryLadder','kalshiExitPosition'])scope[name]=actual(name,scope);
  return {scope,storage,values,writes,get state(){return state;},get network(){return network;},setClock:t=>{clock=t;}};
}
function worker(scope){
  const start=app.indexOf('  const _paperExpiryHealthRef=useRef('),end=app.indexOf('  const _executionControlRef=',start);
  return compile(app.slice(start,end),'return _paperExpiryHealthRef;')(scope);
}
test('actual paper entry -> rollover -> official expiry -> reload is durable and idempotent, without orders or cloud writes',async()=>{
  for(const dir of ['UP','DOWN']){
    const h=host(dir),s=h.scope;
    assert.equal((await actual('_runEntry',s)()).ok,true);const id=h.state.intentId;
    const original=structuredClone(journal.readExecutionJournal(h.storage).intents[id]);
    assert.equal(original.paperMarketIdentity.strike,strike);assert.equal(original.paperMarketIdentity.callId,7);
    h.setClock(close+1000);rollover(s);assert.equal(h.state.paperSettlementPending,true);assert.equal(h.state.intentId,id);assert.equal(h.state.status,'filled');
    h.setClock(close+60000);
    const reads=[],timers=[];let cleanup;const ws={...s,useRef:current=>({current}),useEffect:fn=>{cleanup=fn();},taraCallLogRef:{current:[]},API_BASE:'https://configured.invalid',
      hourlyPublicPaths:(path,base)=>{assert.equal(base,'https://configured.invalid');return [base+'/'+path];},
      readHourlyPublic:async url=>{reads.push(url);assert.equal(url,'https://configured.invalid/markets/'+ticker);return {ok:true,data:{market:{ticker,event_ticker:'KXBTC15M-26OCT150215',floor_strike:strike,strike_type:'greater',close_time:new Date(close).toISOString(),status:'finalized',result:dir==='UP'?'yes':'no'}}};},
      cloudSupabaseRead:()=>{throw Error('Captured identity must not need a cloud lookup');},
      setInterval:(fn,ms)=>{assert.equal(ms,20000);timers.push(fn);return 1;},clearInterval(){}};
    const health=worker(ws);for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));
    assert.equal(health.current.failures.length,0);assert.equal(h.state.status,'exited');assert.equal(h.state.exitReason,'paper-official-settlement');
    const saved=journal.readExecutionJournal(h.storage).intents[id];assert.equal(saved.status,'settled');assert.equal(saved.realizedPnLDollars,.38);
    for(const [k,v] of Object.entries(original))if(k!=='status')assert.deepEqual(saved[k],v,k);
    assert.equal(saved.exitOrderId,undefined);assert.equal(saved.reservedDollars,1);assert.equal(journal.readExecutionState(h.storage).status,'exited');
    const persisted=h.values.get('taraExecutionJournal_v1');await timers[0]();assert.equal(h.values.get('taraExecutionJournal_v1'),persisted);assert.equal(reads.length,1);
    assert.equal(journal.restoreExecutionLedger(h.storage)['BTC|'+wid].realizedPnLDollars,.38);
    s.autoOrderState=null;s._entryFiredForRef.current=null;h.setClock(close-500000);s._kalshiQuote.at=close-500000;assert.equal((await actual('_runEntry',s)()).reason,'intent-already-recorded');
    s.autoExecSettings={...settings,dryRun:false};assert.equal((await actual('_runEntry',s)()).reason,'live-execution-paused-until-account-risk-is-verified');
    s.autoExecSettings={...settings};h.setClock(close-420000);assert.equal((await actual('_runEntry',s)()).reason,'execution-cutoff');
    assert.ok(h.writes.every(k=>['taraExecutionJournal_v1','taraExecutionState_v1'].includes(k)));assert.equal(h.network,0);cleanup();
  }
});
test('actual worker recovers an older paper fill with missing screen state using original Call GET; retries do not invent a result',async()=>{
  const h=host('DOWN'),s=h.scope;await actual('_runEntry',s)();const id=h.state.intentId,j=journal.readExecutionJournal(h.storage);delete j.intents[id].paperMarketIdentity;h.storage.setItem('taraExecutionJournal_v1',JSON.stringify(j));s.setAutoOrderState(null);h.setClock(close+60000);
  let official='';const reads=[],timers=[];const ws={...s,useRef:current=>({current}),useEffect:fn=>fn(),taraCallLogRef:{current:[]},API_BASE:'',hourlyPublicPaths:path=>[path],cloudSupabaseRead:async(path,options)=>{reads.push(path);assert.equal(path,'memory/taraCallLog');assert.equal(options.throwOnError,true);return [{id:7,asset:'BTC',windowId:wid,originalDecision:{marketTicker:ticker,strike}}];},readHourlyPublic:async()=>({ok:true,data:{market:{ticker,event_ticker:'KXBTC15M-26OCT150215',floor_strike:strike,strike_type:'greater',close_time:new Date(close).toISOString(),status:'finalized',result:official}}}),setInterval:fn=>{timers.push(fn);return 1;},clearInterval(){}};
  const health=worker(ws);for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));assert.equal(journal.readExecutionJournal(h.storage).intents[id].status,'filled');assert.equal(health.current.failures[0].reason,'paper-official-result-pending');
  official='no';h.setClock(close+121000);await timers[0]();assert.equal(journal.readExecutionJournal(h.storage).intents[id].status,'settled');assert.equal(h.state,null);assert.equal(reads.length,1);
});
test('actual rollover retains existing unresolved live branches and clears terminal states, with settings untouched',()=>{
  for(const status of ['placing','resting','filled','exiting','exit-pending','unknown']){
    const h=host('UP');h.scope.setAutoOrderState({status,dryRun:false,ticker,intentId:'live'});rollover(h.scope);assert.equal(h.state.rolloverPending,true);assert.equal(h.state.paperSettlementPending,undefined);
  }
  for(const status of ['exited','no-fill']){const h=host('UP');h.scope.setAutoOrderState({status,dryRun:true,ticker});rollover(h.scope);assert.equal(h.state,null);assert.deepEqual(h.scope.autoExecSettings,settings);}
});

test('actual entry freezes original paper identity before an awaited fill response observes another window',async()=>{
  const h=host('UP'),s=h.scope;
  const ladder=s.kalshiRunEntryLadder;s.kalshiRunEntryLadder=async options=>{const result=await ladder(options);s.taraCallSnapshotRef.current={id:99,windowId:'15m-2026-10-15T06:15:00.000Z',originalDecision:{marketTicker:'OTHER',strike:1}};return result;};
  assert.equal((await actual('_runEntry',s)()).ok,true);const saved=journal.readExecutionJournal(h.storage).intents[h.state.intentId];
  assert.equal(saved.paperMarketIdentity.ticker,ticker);assert.equal(saved.paperMarketIdentity.strike,strike);assert.equal(saved.paperMarketIdentity.callId,7);
});

test('actual BTC paper entry -> fee/slippage-aware early exit -> reload preserves economics and never resettles',async()=>{
  for(const dir of ['UP','DOWN'])for(const slip of [0,1,2,5]){
    const h=host(dir),s=h.scope,place=s.kalshiPlaceOrder;
    // Controlled execution-cost stress in the isolated transport only. No
    // settings/thresholds are edited and these fixtures are not performance.
    s.kalshiPlaceOrder=args=>place({...args,limitCents:args.limitCents+(dir==='UP'?slip:-slip)});
    s.kalshiRunEntryLadder=actual('kalshiRunEntryLadder',s);
    assert.equal((await actual('_runEntry',s)()).ok,true);
    const id=h.state.intentId,before=structuredClone(journal.readExecutionJournal(h.storage).intents[id]);
    assert.equal(before.filledAtCents,60+slip);assert.equal(before.filledCount,1);
    s._exitYesLimitCents=()=>dir==='UP'?70-slip:30+slip;
    h.setClock(close-600000);
    assert.equal((await actual('_runExit',s)()).ok,true);
    const saved=journal.readExecutionJournal(h.storage).intents[id];
    const expected=(70-slip-(60+slip)-safety.executionFeeCents(60+slip,1)-safety.executionFeeCents(70-slip,1))/100;
    assert.equal(saved.status,'exited');assert.equal(saved.exitAtCents,70-slip);
    assert.ok(Math.abs(saved.realizedPnLDollars-expected)<1e-9);
    assert.equal(journal.restoreExecutionLedger(h.storage)['BTC|'+wid].realizedPnLDollars,saved.realizedPnLDollars);
    for(const k of ['id','asset','windowId','at','dryRun','reservedDollars','ticker','dir','filledCount','filledAtCents','filledFeesCents','paperMarketIdentity'])assert.deepEqual(saved[k],before[k],k);
    assert.equal(journal.readExecutionState(h.storage).status,'exited');
    const bytes=h.values.get('taraExecutionJournal_v1');
    await paper.recoverExpiredPaperExecutions({storage:h.storage,now:close+60000,withLock:async(_n,fn)=>fn(),readMarket:()=>{throw Error('Early exit is final');}});
    assert.equal(h.values.get('taraExecutionJournal_v1'),bytes);
    s.setAutoOrderState(null);s._entryFiredForRef.current=null;
    s._kalshiQuote.at=close-600000;
    assert.equal((await actual('_runEntry',s)()).reason,'intent-already-recorded');
    assert.equal(h.network,0);assert.deepEqual(s.autoExecSettings,settings);
    assert.ok(h.writes.every(k=>['taraExecutionJournal_v1','taraExecutionState_v1'].includes(k)));
  }
});

test('actual paper controller refuses the consumed six-dollar budget without changing it or creating an order',async()=>{
  const h=host('UP'),s=h.scope,now=close-840000;
  for(let n=0;n<6;n++){
    const id='existing-'+n;
    assert.equal((await journal.reserveExecutionIntent({storage:h.storage,id,windowId:'15m-'+new Date(now-(n+1)*900000).toISOString(),asset:'BTC',stake:1,settings,dryRun:true,now,withLock:async(_n,fn)=>fn()})).ok,true);
    journal.updateExecutionIntent(h.storage,id,{status:'exited'});
  }
  const before=h.values.get('taraExecutionJournal_v1');
  assert.equal((await actual('_runEntry',s)()).reason,'daily-loss-and-exposure-cap');
  assert.equal(h.values.get('taraExecutionJournal_v1'),before);assert.equal(h.state,null);assert.equal(h.network,0);assert.deepEqual(s.autoExecSettings,settings);
});
