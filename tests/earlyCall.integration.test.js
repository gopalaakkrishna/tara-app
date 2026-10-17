import test from 'node:test';
import assert from 'node:assert/strict';
import {makeHarness} from './helpers/callDecisionHarness.js';
import {settlementPatch,normalizeCallLedger} from '../src/callIntegrity.js';

function early(direction='UP',patch={}) {
  const up=direction==='UP';
  const h=makeHarness({probabilityUp:up?77:23,confidence:77,yesPrice:up?52:48,
    secondsLeft:838,quality:24,mtf:up?1:-1,tapeBuy:up?80:20,
    regime:'RANGE-CHOP',gapScore:.1,claimedDirection:null,samples:0,...patch});
  h.scope.analysis.referencePrice=up?83400:83000;
  return h;
}

function observe(h,start=838,count=12){
  for(let i=0;i<count&&!h.scope.taraCallSnapshotRef.current;i++){
    h.advance(start-i);h.run();
  }
  assert.deepEqual(h.errors,[]);
  return h.scope.taraCallSnapshotRef.current;
}

test('strong cheap early UP and DOWN candidates pass flat-gap only after fresh confirmation',()=>{
  for(const direction of ['UP','DOWN']) {
    const h=early(direction);
    // Both sides must be on their own favorable side of the captured strike.
    h.scope.analysis.referencePrice=direction==='UP'?83400:83000;
    assert.equal(h.run(),null);
    assert.equal(h.logs.length,0);
    for(let i=1;i<=12&&!h.scope.taraCallSnapshotRef.current;i++)h.advance(838-i),h.run();
    const snapshot=h.scope.taraCallSnapshotRef.current;
    assert.equal(snapshot?.call,direction);
    assert.ok(snapshot.atSecondsLeft>780);
    assert.equal(h.logs.length,1);assert.equal(h.cloud.length,1);
    const proof=snapshot.originalDecision.decisionTrace.events.find(e=>e.code==='early-flat-gap-confirmed');
    assert.ok(proof);assert.equal(proof.gate.rule,'btc15m-early-flat-gap-v1');
    assert.equal(proof.gate.marketTicker,snapshot.originalDecision.marketTicker);
    assert.equal(proof.gate.strike,snapshot.originalDecision.strike);
    assert.ok(proof.gate.observations>=2);assert.ok(proof.gate.lastObservedAt>proof.gate.firstObservedAt);
    assert.deepEqual(h.errors,[]);
  }
});

test('weak, late, expensive, opposed or unready candidates retain genuine waits',()=>{
  for(const patch of [{confidence:74},{probabilityUp:71},{yesPrice:68},
    {mtf:0},{tapeBuy:50},{tapeBuy:10},{ready:false},{secondsLeft:780},
    {noEntryGates:false},{windowType:'5m',secondsLeft:238}]){
    const h=early('UP',patch),left=patch.secondsLeft??838;
    assert.equal(observe(h,left),null,JSON.stringify(patch));
    assert.equal(h.logs.length,0);assert.equal(h.cloud.length,0);
  }
});

test('actual lifecycle cannot confirm from repeated clock ticks, quotes or spot',()=>{
  for(const keep of ['both','spot','quote']){
    const h=early(),spot=h.scope.lastPriceSourceRef.current.time,quote=h.scope._kalshiQuote.at;
    for(let i=0;i<12;i++){
      h.advance(838-i);
      if(keep!=='quote')h.scope.lastPriceSourceRef.current.time=spot;
      if(keep!=='spot')h.scope._kalshiQuote.at=quote;
      assert.equal(h.run(),null);
    }
    assert.equal(h.scope._flatGapWatchRef.current.earlyConfirmation.formation.observations,1);
    assert.equal(h.logs.length,0);assert.equal(h.cloud.length,0);assert.deepEqual(h.errors,[]);
  }
});

test('timing, readiness, stale data and frozen-feed failures discard early confirmation',()=>{
  const failures=[
    h=>{h.scope.startupReadiness.ready=false;},
    h=>{h.scope.analysis.rawProbAbove=60;h.scope.qualityGate.score=10;h.scope.qualityGateV2.score=10;},
    h=>{h.scope._kalshiQuote.at=h.clock-31000;},
    h=>{h.scope.lastPriceSourceRef.current.time=h.clock-16000;},
    h=>{h.scope.feedFrozenRef.current=true;},
  ];
  for(const fail of failures){
    const h=early();assert.equal(h.run(),null);
    assert.equal(h.scope._flatGapWatchRef.current.earlyConfirmation.formation.observations,1);
    h.advance(837);fail(h);assert.equal(h.run(),null);
    assert.equal(h.scope._flatGapWatchRef.current.earlyConfirmation,null);
    h.scope.startupReadiness.ready=true;h.scope.analysis.rawProbAbove=77;
    h.scope.qualityGate.score=h.scope.qualityGateV2.score=24;h.scope.feedFrozenRef.current=false;
    h.advance(836);assert.equal(h.run(),null);
    assert.equal(h.scope._flatGapWatchRef.current.earlyConfirmation.formation.observations,1);
    assert.equal(h.logs.length,0);assert.deepEqual(h.errors,[]);
  }
});

test('source changes and directional bid retreats cannot borrow the earlier cheap confirmation',()=>{
  for(const change of [h=>{h.scope.priceSourceRef.current='okx';},
    h=>{h.scope._kalshiQuote.bid=50;h.scope._kalshiQuote.ask=52;h.scope.kalshiYesPrice=51;}]){
    const h=early();h.run();h.advance(837);change(h);assert.equal(h.run(),null);
    assert.equal(h.scope._flatGapWatchRef.current.earlyConfirmation.formation.observations,1);
    assert.equal(h.logs.length,0);assert.deepEqual(h.errors,[]);
  }
});

test('adverse cooldown and exact420s deadline still veto even a strong early candidate',()=>{
  const h=early();h.scope._v104_1_abortCountRef.current={windowId:h.windowId,count:3,lastAbortAt:h.clock-1000};
  assert.equal(observe(h),null);assert.equal(h.scope.currentCallBlockerRef.current.code,'adverse-kalshi-cooldown');
  const deadline=early();deadline.run();deadline.advance(420);const final=deadline.run();
  assert.equal(final.call,'SIT_OUT');assert.equal(final.callPolicy.cutoff,420);
  assert.equal(deadline.logs.length,1);assert.equal(deadline.cloud.length,1);assert.deepEqual(deadline.errors,[]);
});

test('an early Call is immutable, deduplicated and settled only against its captured exact market',()=>{
  for(const direction of ['UP','DOWN']){
    const h=early(direction),snap=observe(h);assert.equal(snap.call,direction);
    const row=h.logs[0],original=structuredClone(row.originalDecision);
    h.scope.analysis.rawProbAbove=direction==='UP'?1:99;h.advance(700);h.run();
    assert.equal(h.logs.length,1);assert.equal(h.cloud.length,1);assert.deepEqual(snap.originalDecision,original);
    const restored=normalizeCallLedger([{...row,originalDecision:undefined}],[row]);
    assert.equal(restored.length,1);assert.deepEqual(restored[0].originalDecision,original);
    const market={ticker:original.marketTicker,close_time:original.marketCloseTime,
      floor_strike:original.strike,status:'finalized',result:direction==='UP'?'yes':'no'};
    assert.equal(settlementPatch(row,{...market,ticker:'wrong'},h.close+1000).ok,false);
    assert.equal(settlementPatch(row,market,h.close+1000).patch.result,'WIN');
    assert.deepEqual(row.originalDecision,original);assert.deepEqual(h.errors,[]);
  }
});
