import test from 'node:test';
import assert from 'node:assert/strict';
import * as safe from '../src/executionSafety.js';
import * as journal from '../src/executionJournal.js';
import {checkEntryMode} from '../src/executionIntegrity.js';
import {windowCloseMs,inspectDecisionQuote} from '../src/callIntegrity.js';
import {callLockDeadline} from '../src/callPolicy.js';
import {actual} from './helpers/hourlyHarness.js';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),m};};
const settings={maxBetPerTrade:1,maxDailyLoss:6,maxAutoTradesPerDay:8,maxAutoTradesPerWindow:1};

test('fee-inclusive entry rejects invalid prices, zero/underfunded stakes and caps principal plus fees',()=>{
  for(const p of [NaN,null,0,100,-1,50.1])assert.equal(safe.buildSafeEntry({ticker:'T',dir:'UP',limitCents:p,betDollars:1,clientOrderId:'intent'}).ok,false);
  assert.equal(safe.buildSafeEntry({ticker:'T',dir:'UP',limitCents:75,betDollars:.1,clientOrderId:'intent'}).ok,false);
  for(const dir of ['UP','DOWN'])for(let p=1;p<100;p++){const b=safe.buildSafeEntry({ticker:'T',dir,limitCents:p,betDollars:1,clientOrderId:'intent'});if(b.ok)assert.ok(b.count*b.costPerContractCents+safe.executionFeeCents(b.costPerContractCents,b.count)<=100);}
});
test('normalization divides total fill costs, preserves fractional quantities and never substitutes a limit',()=>{
  const r=safe.normalizeExecutionOrder({status:'executed',fill_count_fp:'5',taker_fill_cost_dollars:'2',maker_fill_cost_dollars:'1',taker_fees_dollars:'.03',maker_fees_dollars:'.01',price:'.75'});
  assert.equal(r.fillPriceCents,60);assert.equal(r.feeCents,4);
  assert.equal(safe.normalizeExecutionOrder({status:'executed',fill_count_fp:'.5',price:'.7'}).filledCount,.5);
  assert.equal(safe.normalizeExecutionOrder({status:'executed',fill_count_fp:'5',price:'.7'}).fillPriceCents,null);
});
test('exits require valid positive integral size, are reduce-only, and use only held-contract quotes',()=>{
  for(const count of [0,null,-1,NaN,.5])assert.equal(safe.buildSafeExit({ticker:'T',side:'yes',count,limitCents:50,clientOrderId:'i'}).ok,false);
  assert.equal(safe.buildSafeExit({ticker:'T',side:'no',count:2,limitCents:50,clientOrderId:'i'}).body.reduce_only,true);
  const q={ticker:'NEW',at:100,bid:40,ask:42};assert.equal(safe.heldQuote(q,{ticker:'OLD',dir:'UP',now:100}),null);
  assert.equal(safe.heldQuote(q,{ticker:'NEW',dir:'DOWN',now:100}).value,58);
  assert.equal(safe.heldQuote(q,{ticker:'NEW',dir:'UP',now:40000}),null);
});
test('verified exits sum exact fills and fees; duplicates, wrong side and missing price cannot fabricate P&L',()=>{
  const f={fill_id:'f',order_id:'o',ticker:'T',side:'no',action:'sell',count_fp:'2',no_price_dollars:'.6',fee_cost:'.03'};
  const opts={orderId:'o',ticker:'T',side:'no',action:'sell',count:2};
  assert.deepEqual(safe.summarizeOrderFills([f,f],opts),{filledCount:2,fillPriceCents:60,feeCents:3});
  for(const bad of [{...f,side:'yes'},{...f,fee_cost:null},{...f,no_price_dollars:null},{...f,order_id:'other'}])assert.equal(safe.summarizeOrderFills([bad],opts),null);
});
const plan={ok:true,rungs:[{priceCents:60,takesSpread:true,waitSec:0},{priceCents:61,takesSpread:true,waitSec:0}]};
const full={order_id:'o',status:'executed',fill_count_fp:'4',remaining_count_fp:'0',average_fill_price:'.6'};
async function ladder(overrides={}){
  const calls={place:0,amend:0,cancel:0,read:0};
  const result=await safe.runSafeEntryLadder({plan,dir:'UP',betDollars:3,clientOrderId:'intent',
    place:async a=>{calls.place++;return overrides.place?overrides.place(a):{ok:true,order:{order_id:'o',status:'resting',fill_count_fp:'0',remaining_count_fp:'4'}};},
    read:async()=>{calls.read++;return overrides.read?overrides.read(calls.read):{ok:true,order:full};},
    amend:async()=>{calls.amend++;return {ok:true,order:{order_id:'o'}};},
    cancel:async()=>{calls.cancel++;return overrides.cancel?overrides.cancel():{ok:true,order:{order_id:'o',reduced_by:'4'}};},...overrides.options});
  return {result,calls};
}
test('ambiguous placement never creates another order; successful ladder amends one order',async()=>{
  const timeout=await ladder({place:async()=>({ok:false,reason:'timeout'})});assert.equal(timeout.result.reason,'unknown-verify-kalshi-directly');assert.equal(timeout.calls.place,1);assert.equal(timeout.calls.amend,0);
  const h=await ladder({read:n=>({ok:true,order:n===1?{...full,status:'resting',fill_count_fp:'0',remaining_count_fp:'4'}:full})});assert.equal(h.result.ok,true);assert.equal(h.calls.place,1);assert.equal(h.calls.amend,1);
});
test('partial fill cancels remainder, retains exact fill, and never submits the next full-size order',async()=>{
  const h=await ladder({place:async()=>({ok:true,order:{...full,status:'resting',fill_count_fp:'2',remaining_count_fp:'2'}}),read:()=>({ok:true,order:{...full,status:'canceled',fill_count_fp:'2',remaining_count_fp:'0'}})});
  assert.equal(h.result.ok,true);assert.equal(h.result.normalized.filledCount,2);assert.equal(h.calls.place,1);assert.equal(h.calls.cancel,1);assert.equal(h.calls.amend,0);
});
test('V2 cancel ack requires a subsequent terminal read; uncertainty is never a confirmed non-fill',async()=>{
  for(const failure of ['cancel','read','resting']){
    const h=await ladder({options:{plan:{...plan,rungs:plan.rungs.slice(0,1)}},cancel:()=>({ok:failure!=='cancel'}),read:()=>failure==='read'?{ok:false}:{ok:true,order:{...full,status:failure==='resting'?'resting':'canceled',fill_count_fp:'0',remaining_count_fp:failure==='resting'?'4':'0'}}});
    assert.equal(h.result.reason,'unknown-verify-kalshi-directly');assert.equal(h.calls.place,1);
  }
  const h=await ladder({options:{plan:{...plan,rungs:plan.rungs.slice(0,1)}},read:()=>({ok:true,order:{...full,status:'canceled',fill_count_fp:'0',remaining_count_fp:'0'}})});
  assert.equal(h.result.confirmedNoFill,true);assert.equal(h.calls.read,1);
});
test('pagination passes the old ten-page boundary and rejects repeated cursors or partial failure',async()=>{
  let n=0;const ok=await safe.fetchAllExecutionPages(async()=>({ok:true,data:{fills:[++n],cursor:n<13?String(n):null}}),'/fills','fills');assert.equal(ok.ok,true);assert.equal(ok.items.length,13);
  const repeat=await safe.fetchAllExecutionPages(async()=>({ok:true,data:{fills:[],cursor:'same'}}),'/fills','fills');assert.equal(repeat.ok,false);
  assert.equal((await safe.fetchAllExecutionPages(async()=>({ok:false}),'/fills','fills')).ok,false);
});
test('risk snapshots require every endpoint and reserve account-wide debits, fees, resting orders and exposure',()=>{
  const complete=Object.fromEntries(['orders','historicalOrders','fills','historicalFills','settlements','positions','balance'].map(k=>[k,true]));
  const now=Date.parse('2026-10-15T12:00Z'),orders=[{order_id:'o',ticker:'T',created_time:'2026-10-15T11:00Z',status:'executed'}];
  const fills=[{fill_id:'f',order_id:'o',ticker:'T',created_time:'2026-10-15T11:00Z',side:'yes',action:'buy',count_fp:'2',yes_price_dollars:'.6',fee_cost:'.04'}];
  const r=safe.accountRiskSnapshot({orders,fills,complete,now,balance:{balance:100},positions:[]});assert.equal(r.verified,true);assert.equal(r.lossAndExposureDollars,1.24);assert.equal(r.dayTrades,1);
  assert.equal(safe.accountRiskSnapshot({orders,fills,complete:{},now,balance:{balance:100}}).verified,false);
});
test('durable journal enforces day/window/loss caps, cooldowns and no repeat after a reload',async()=>{
  const storage=store(),now=Date.parse('2026-10-15T12:00Z');
  const withLock=async(_name,fn)=>fn();
  const args={storage,id:'a',windowId:'15m-2026-10-15T12:00:00.000Z',stake:1,settings,dryRun:true,now,withLock};
  assert.equal((await journal.reserveExecutionIntent(args)).ok,true);
  assert.equal((await journal.reserveExecutionIntent(args)).reason,'intent-already-recorded');
  assert.equal((await journal.reserveExecutionIntent({...args,id:'b'})).reason,'window-trade-cap');
  assert.equal((await journal.reserveExecutionIntent({...args,id:'b',windowId:'15m-next',settings:{...settings,maxAutoTradesPerDay:1}})).reason,'daily-trade-cap');
  assert.equal((await journal.reserveExecutionIntent({...args,id:'b',windowId:'15m-next',settings:{...settings,maxDailyLoss:1.5}})).reason,'daily-loss-and-exposure-cap');
  assert.equal((await journal.reserveExecutionIntent({...args,id:'b',windowId:'15m-next',settings:{...settings,cooldownUntil:now+1000}})).reason,'execution-cooldown');
  assert.equal((await journal.reserveExecutionIntent({...args,id:'live',dryRun:false})).reason,'account-risk-unverified');
  storage.setItem('taraExecutionJournal_v1','broken');assert.equal((await journal.reserveExecutionIntent(args)).reason,'execution-journal-unavailable');
});
test('stable account/window IDs are identical across devices but reveal no account identifier',async()=>{
  const args={account:'private-api-key',windowId:'15m-2026-10-15T12:00:00.000Z'};
  const a=await journal.executionIntentId(args),b=await journal.executionIntentId(args);assert.equal(a,b);assert.ok(!a.includes(args.account));
  assert.notEqual(a,await journal.executionIntentId({...args,account:'other'}));
});

test('journal lock failure fails closed and updates cannot release an existing reservation',async()=>{
  const storage=store(),args={storage,id:'a',asset:'BTC',windowId:'15m-test',stake:1,settings,dryRun:true,now:1000,withLock:async(_n,fn)=>fn()};
  assert.equal((await journal.reserveExecutionIntent({...args,withLock:async()=>{throw Error('denied');}})).reason,'execution-lock-unavailable');
  await journal.reserveExecutionIntent(args);
  journal.updateExecutionIntent(storage,'a',{status:'filled',filled:true,reservedDollars:0,asset:'ETH'});
  assert.equal(journal.readExecutionJournal(storage).intents.a.reservedDollars,1);
  assert.equal(journal.readExecutionJournal(storage).intents.a.asset,'BTC');
});

test('contradictory filled status with remaining exposure must cancel and verify rather than report fully closed',async()=>{
  const h=await ladder({place:async()=>({ok:true,order:{...full,remaining_count_fp:'2'}}),read:()=>({ok:false})});
  assert.equal(h.result.ok,false);assert.equal(h.calls.cancel,1);assert.equal(h.calls.place,1);
});
test('real unresolved state and fill ledger survive reload; no optimistic synthetic closure',()=>{
  const storage=store();journal.writeExecutionState(storage,{status:'filled',ticker:'T',filledCount:2,dryRun:false});assert.equal(journal.readExecutionState(storage).status,'unknown');
  storage.setItem('taraExecutionJournal_v1',JSON.stringify({schema:1,intents:{a:{filled:true,asset:'BTC',windowId:'w',filledCount:2,filledAtCents:60}}}));assert.equal(journal.restoreExecutionLedger(storage)['BTC|w'].filledCount,2);
});

test('actual dry-run order builder through ladder and exit controller preserves fill counts and fee-adjusted P&L',async()=>{
  const scope={...safe,...journal,Date,crypto,encodeURIComponent,Promise,useCallback:f=>f,kalshiCreds:{},
    kalshiAuthedFetch:()=>{throw Error('No exchange traffic permitted in this test');}};
  scope.kalshiBuildOrder=actual('kalshiBuildOrder',scope);
  scope.kalshiPlaceOrder=actual('kalshiPlaceOrder',scope);
  scope.kalshiExitPosition=actual('kalshiExitPosition',scope);
  const entry=await safe.runSafeEntryLadder({plan,dir:'UP',betDollars:3,clientOrderId:'sandbox',
    place:({rung,count,clientOrderId})=>scope.kalshiPlaceOrder({ticker:'T',dir:'UP',limitCents:rung.priceCents,betDollars:3,clientOrderId,count,dryRun:true}),
    read:async()=>{throw Error('Immediate dry fill requires no lookup');},cancel:async()=>{throw Error('No cancel needed');}});
  assert.equal(entry.ok,true);assert.equal(entry.normalized.filledCount,4);assert.equal(entry.normalized.fillPriceCents,60);
  let state={status:'filled',dryRun:true,dir:'UP',ticker:'T',at:1,windowId:'w',asset:'BTC',filledCount:4,filledAtCents:60,filledFeesCents:entry.normalized.feeCents};
  Object.assign(scope,{autoOrderState:state,_exitBusyRef:{current:false},_exitFiredForRef:{current:null},
    _execSettlementLedgerRef:{current:{}},_exitYesLimitCents:()=>70,kalshiNormalizeOrder:safe.normalizeExecutionOrder,
    setAutoOrderState:fn=>{state=fn(state);},_autoExecLogPush:()=>{}});
  const exited=await actual('_runExit',scope)('test');
  assert.equal(exited.ok,true);assert.equal(state.status,'exited');assert.equal(state.filledCount,4);
  assert.equal(state.pnlCentsPerContract,10-(entry.normalized.feeCents+safe.executionFeeCents(70,4))/4);
});
test('actual entry remains paused for real money and cutoff/kill checks precede all new submission',async()=>{
  const at=Date.parse('2026-10-15T06:01:00Z');const FakeDate=class extends Date{static now(){return at;}};
  const s={...settings,enabled:true,dryRun:false,signalSource:'snapshot'},storage=store();
  const scope={...safe,...journal,Date:FakeDate,useCallback:f=>f,autoExecSettings:s,autoExecCooldownUntil:0,exchangeAudit:{},killSwitchEngaged:false,kalshiCreds:{},autoOrderState:null,lockedCallRef:{current:null},taraCallSnapshotRef:{current:{_committedAt:at,originalDecision:{marketTicker:'KXBTC15M-26OCT150215-15'}}},windowType:'15m',_resolveStakeDollars:()=>1,
    _entryBusyRef:{current:false},_entryFiredForRef:{current:null},_lossCooldownRef:{current:{windowsRemaining:0}},_execSettlementLedgerRef:{current:{}},_executionControlRef:{current:{enabled:true,kill:false,windowId:'15m-2026-10-15T06:00:00.000Z'}},
    computeWindowId:()=> '15m-2026-10-15T06:00:00.000Z',_autoExecLogPushBlockOnce:()=>{},_autoExecLogPush:()=>{},checkEntryMode,localStorage:storage,windowCloseMs,callLockDeadline,readLockState:()=>({dir:'UP',tradeable:true}),_execCostCents:()=>60,_quoteUsable:()=>true,inspectDecisionQuote,currentAssetRef:{current:'BTC'},_execFairCents:()=>60,_kalshiQuote:{ticker:'KXBTC15M-26OCT150215-15',at,bid:59,ask:60,closeTime:'2026-10-15T06:15:00Z'},navigator:{locks:{request:async(_n,fn)=>fn()}},setAutoOrderState:()=>{}};
  let calls=0;scope.kalshiRunEntryLadder=async args=>{calls++;scope._executionControlRef.current.kill=true;assert.equal(args.shouldAbort(),true);return {ok:false,reason:'aborted',confirmedNoFill:true};};
  assert.equal((await actual('_runEntry',scope)()).reason,'live-execution-paused-until-account-risk-is-verified');assert.equal(calls,0);
  scope.autoExecSettings={...s,dryRun:true};await actual('_runEntry',scope)();assert.equal(calls,1);
  scope.Date=class extends Date{static now(){return Date.parse('2026-10-15T06:08:00Z');}};
  assert.equal((await actual('_runEntry',scope)()).reason,'execution-cutoff');assert.equal(calls,1);
});
