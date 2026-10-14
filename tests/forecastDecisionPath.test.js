import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastSecondsRemaining,cappedForecastBars,forecastAvailability} from '../src/forecastTiming.js';
import {appendDecisionTrace,captureDecisionTrace} from '../src/callDecisionTrace.js';
import {callLogSyncSignature} from '../src/callLogSync.js';
import {normalizeCallLedger} from '../src/callIntegrity.js';
import {makeHarness} from './helpers/callDecisionHarness.js';
import {scoreEngine,scoringInputs} from './helpers/scoreEngineHarness.js';

test('forecast clock contract uses remaining time at start, middle, cutoff and close for both window types',()=>{
  for(const [is15m,length] of [[true,900],[false,300]])for(const left of [length,length-1,length/2,30,1,0]){
    assert.equal(forecastSecondsRemaining(left,is15m),left);
    for(const tf of [1,5,15])assert.ok(cappedForecastBars(left,tf,40)*tf*60<=left+1e-9);
  }
  for(const invalid of [null,undefined,'',NaN,Infinity,-1])assert.equal(forecastSecondsRemaining(invalid,true),0);
  assert.equal(forecastSecondsRemaining('631',true),631);
  assert.equal(forecastSecondsRemaining(1000,false),300);
});

test('actual FGT estimates with historical bars but projects only over the short fractional horizon',()=>{
  const e=scoreEngine();const candles=scoringInputs().tfCandles.c15m;
  const five=e.computeFGT(candles,50,5);
  for(const horizon of [.05,.5,1,2.8,4.5,5,7]){
    const r=e.computeFGT(candles,50,horizon);
    assert.equal(r.valid,true);assert.equal(r.forecast,horizon);
    assert.equal(r.slopeLookback,Math.max(5,Math.ceil(horizon)));
    if(horizon<=5)assert.ok(Math.abs(r.slope-five.slope*horizon/5)<.015);
  }
  assert.equal(e.computeFGT(candles,50,0).valid,false);
  assert.equal(e.computeFGT(candles,50,0).reason,'window-closed');
  assert.equal(e.computeFGT(candles,50,NaN).valid,false);
  assert.equal(e.computeFGT([],50,2).reason,'insufficient');
});

test('malformed historical prices cannot masquerade as valid neutral forecasts',()=>{
  const e=scoreEngine();
  for(const c of [null,undefined,'',NaN,Infinity,0,-1]){
    const candles=scoringInputs().tfCandles.c1m;candles[10].c=c;
    const r=e.computeFGT(candles,30,2);assert.equal(r.valid,false);assert.equal(r.reason,'invalid-candles');
  }
});

test('real scoring engine supplies usable bounded forecasts early rather than marking every timeframe too short',()=>{
  for(const is15m of [true,false])for(const secondsLeft of is15m?[850,780,631,480,421]:[280,200,90,31]){
    const e=scoreEngine();const r=e.computeV99Posterior(scoringInputs({is15m,secondsLeft}));
    for(const [label,tf] of [['1m',1],['5m',5],['15m',15]]){
      const f=r.fgtResults[label];assert.equal(f.valid,true,`${secondsLeft}s ${label}`);
      assert.ok(Math.abs(f.forecast*tf*60-secondsLeft)<1e-6,`${label} ends at settlement`);
    }
    assert.equal(forecastAvailability(r.fgtResults).status,'ready');assert.deepEqual(e.errors,[]);
  }
});

test('invalid timeframe inputs are distinct from valid neutral forecasts in the actual candidate and blocker path',()=>{
  const engine=scoreEngine(),input=scoringInputs();input.tfCandles.c5m=[];
  const r=engine.computeV99Posterior(input);
  const availability=forecastAvailability(r.fgtResults);
  assert.equal(availability.status,'partial');assert.equal(availability.validCount,2);
  assert.equal(availability.timeframes[1].reason,'insufficient');
  for(const results of [r.fgtResults,{},Object.fromEntries(['1m','5m','15m'].map(k=>[k,{valid:true,forecastDir:'NEUTRAL',forecast:1}]))]){
    const h=makeHarness({probabilityUp:65,mtf:0,quality:50,tapeBuy:50,yesPrice:50});
    h.scope.analysis.fgtResults=results;assert.equal(h.run(),null);
    const b=h.scope.currentCallBlockerRef.current;
    assert.equal(b.code,forecastAvailability(results).status==='ready'?'forecast-mixed':'forecast-unavailable');
    assert.equal(b.gate.requiredAlignment,1);assert.equal(b.gate.availability.validCount,forecastAvailability(results).validCount);
  }
});

function applyScore(h,direction,secondsLeft=631,{trendingTape=false}={}){
  const e=scoreEngine();const input=scoringInputs({direction,secondsLeft});
  input.targetMargin=input.currentPrice+(direction==='UP'?-300:300);
  input.windowHigh=input.currentPrice+150;input.windowLow=input.currentPrice-150;
  if(!trendingTape)for(let i=0;i<input.liveHistory.length;i++){
    const b=input.liveHistory[i];b.o=b.c=input.currentPrice+(i%2?5:-5);b.h=b.c+2;b.l=b.c-2;
  }
  const r=e.computeV99Posterior(input);
  Object.assign(h.scope.analysis,r,{rawProbAbove:r.posterior,rawPosteriorUncalibrated:r.rawPosterior});
  h.scope.tapeWindows=input.tapeWindows;h.scope.tapeBuyPct=input.tapeWindows.w30.buyPct;
  h.scope.currentPrice=input.currentPrice;h.scope.targetMargin=input.targetMargin;
  h.scope.targetMarginRef.current=input.targetMargin;h.scope.kalshiStrike=input.targetMargin;
  h.scope.kalshiStrikeRef.current=input.targetMargin;
  h.advance(secondsLeft);
  return {r,e};
}

test('actual scoring engine → candidate → timing → fresh formation → canonical UP and DOWN captures',()=>{
  for(const direction of ['UP','DOWN']){
    const h=makeHarness({yesPrice:50,quality:85,claimedDirection:null,samples:0});
    const {r,e}=applyScore(h,direction);
    assert.equal(h.run(),null);assert.equal(h.scope.taraCall.call,direction);
    assert.ok(h.scope.taraCall.confidence>=65);assert.equal(h.scope.currentCallBlockerRef.current.code,'sample-stability');
    for(let i=0;i<150&&!h.scope.taraCallSnapshotRef.current;i++){h.advance(630-i);h.run();}
    const snap=h.scope.taraCallSnapshotRef.current;assert.ok(snap);assert.equal(snap.call,direction);
    assert.equal(snap.originalDecision.direction,direction);assert.ok(snap.atSecondsLeft>420);
    assert.equal(h.logs.length,1);assert.equal(h.cloud.length,1);assert.deepEqual(h.errors,[]);assert.deepEqual(e.errors,[]);
    assert.equal(snap.forecastAvailability.status,'ready');
    assert.ok(snap.decisionTrace.events.some(e=>e.code==='timing-approved'));
    assert.ok(snap.decisionTrace.events.some(e=>e.code==='sample-stability'));
    assert.equal(snap.decisionTrace.events.at(-1).code,'call-committed');
    const original=structuredClone(snap.originalDecision);
    applyScore(h,direction==='UP'?'DOWN':'UP',500);h.run();
    assert.equal(h.scope.taraCallSnapshotRef.current.call,direction);assert.equal(h.logs.length,1);
    assert.deepEqual(snap.originalDecision,original);
  }
});

test('chronological opposite candidate re-forms, cannot use 999 old samples, and later commits the correct new direction',()=>{
  const h=makeHarness({yesPrice:50,quality:85,claimedDirection:'UP',samples:999});
  applyScore(h,'DOWN');assert.equal(h.run(),null);
  assert.equal(h.scope.taraCallSampleRef.current.dir,'DOWN');assert.equal(h.scope.taraCallSampleRef.current.count,1.5);
  assert.equal(h.scope.currentCallBlockerRef.current.gate.requiredSamples,h.scope.taraCall._ctx.needSamples);
  const reset=h.scope.callDecisionTraceRef.current.events.find(e=>e.code==='formation-direction-reset');
  assert.equal(reset.gate.previousSamples,999);assert.equal(reset.direction,'DOWN');
  for(let i=0;i<150&&!h.scope.taraCallSnapshotRef.current;i++){h.advance(630-i);h.run();}
  assert.equal(h.scope.taraCallSnapshotRef.current?.call,'DOWN');assert.equal(h.logs.length,1);
  assert.ok(h.logs[0].decisionTrace.events.some(e=>e.code==='formation-direction-reset'));
});

test('alternating qualifying candidates each start fresh and cannot lock by combining opposite samples',()=>{
  const h=makeHarness({yesPrice:50,quality:85,claimedDirection:null,samples:0});
  for(let i=0;i<8;i++){
    applyScore(h,i%2?'DOWN':'UP',631-i);assert.equal(h.run(),null);
    assert.equal(h.scope.taraCallSampleRef.current.count,1.5);
  }
  h.advance(421);h.run();h.advance(420);const snap=h.run();assert.equal(snap.call,'SIT_OUT');
  assert.equal(snap.blockedDecision.code,'sample-stability');assert.match(snap.reason,/fresh stability samples/);
  assert.equal(h.logs.length,1);
});

test('an actual trend-at-lock rejection stays enforced and its exact branch is traced after timing approval',()=>{
  const h=makeHarness({yesPrice:50,quality:85,claimedDirection:null,samples:0});
  applyScore(h,'UP',631,{trendingTape:true});
  // Exercise the intentional trend policy, not the old contradictory state
  // where a final RANGE-CHOP forecast still retained _isTrend=true.
  h.scope.analysis.regime='TRENDING UP';h.scope.analysis.rawSignalScores._isTrend=true;
  for(let i=0;i<30;i++){h.advance(631-i);h.run();}
  assert.equal(h.scope.taraCallSnapshotRef.current,null);assert.equal(h.logs.length,0);
  assert.match(h.scope.currentCallBlockerRef.current.reason,/trend-at-lock/);
  const trace=h.scope.callDecisionTraceRef.current.events;
  assert.ok(trace.some(e=>e.code==='timing-approved'));
  assert.equal(trace.at(-1).code,'commit-check');assert.match(trace.at(-1).reason,/trend-at-lock/);
  h.advance(421);h.run();h.advance(420);const snap=h.run();
  assert.match(snap.blockedDecision.reason,/trend-at-lock/);assert.equal(h.logs.length,1);
  assert.ok(snap.originalDecision.decisionTrace.events.some(e=>e.code==='commit-check'));
});

test('timing approval followed by a true gap wait is captured locally, in cloud projection and original evidence',()=>{
  const h=makeHarness({gapScore:2});h.scope.analysis.fgtResults={};
  h.run();assert.equal(h.scope.currentCallBlockerRef.current.code,'flat-gap-signal');
  h.advance(420);const snap=h.run();
  const codes=snap.decisionTrace.events.map(e=>e.code);
  assert.ok(codes.includes('timing-approved'));assert.ok(codes.includes('flat-gap-signal'));
  assert.equal(codes.at(-1),'sitout-committed');
  assert.deepEqual(h.logs[0].decisionTrace,snap.originalDecision.decisionTrace);
  assert.deepEqual(h.cloud[0].decisionTrace,h.logs[0].decisionTrace);
  const restored=normalizeCallLedger([{...h.logs[0],decisionTrace:undefined}],[h.logs[0]]);
  assert.deepEqual(restored[0].decisionTrace,h.logs[0].decisionTrace);
  assert.notEqual(callLogSyncSignature(h.logs),callLogSyncSignature([{...h.logs[0],decisionTrace:null}]));
});

test('trace stays bounded, retains opening and latest branches, freezes captures, and resets on window rollover',()=>{
  let trace=null;for(let i=0;i<130;i++)trace=appendDecisionTrace(trace,{windowId:'a',at:i*1000,code:`gate${i}`,direction:'UP'});
  assert.equal(trace.events.length,16);assert.equal(trace.omitted,114);
  assert.equal(trace.events[0].code,'gate0');assert.equal(trace.events.at(-1).code,'gate129');
  const capture=captureDecisionTrace(trace,'a');trace.events[0].code='changed';assert.equal(capture.events[0].code,'gate0');
  assert.equal(captureDecisionTrace(trace,'b'),null);
  trace=appendDecisionTrace(trace,{windowId:'b',at:130000,code:'opening'});assert.equal(trace.events.length,1);
});

test('interleaved timing approvals and sample waits aggregate without bloating the canonical log',()=>{
  const h=makeHarness({samples:0,claimedDirection:null});
  for(let i=0;i<15&&!h.scope.taraCallSnapshotRef.current;i++){h.advance(631-i);h.run();}
  const trace=h.scope.callDecisionTraceRef.current;
  assert.ok(trace.events.length<6);assert.ok(trace.events.some(e=>e.evaluations>1));
  const approvals=trace.events.find(e=>e.code==='timing-approved');
  assert.ok(approvals.lastAt>=approvals.at);assert.ok(approvals.latest.samples>approvals.samples);
  assert.ok(JSON.stringify(trace).length<4000);
});
