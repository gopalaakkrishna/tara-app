import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transformSync} from 'esbuild';
import * as L from '../src/learningCore.js';
import {capturePickLearning,capturePickSettlement,setLearningRegistry,learningPredictions} from '../src/learningCapture.js';
import {trainLearningRegistry,LEARNING_PROFILES,witnessKey} from '../src/learningTrainer.js';
import {captureOriginalDecision,settlementPatch,callKey} from '../src/callIntegrity.js';
import {createLockStudy,observeLockStudy,settleLockStudy} from '../src/lockStudy.js';
import {actual} from './helpers/hourlyHarness.js';
import {app,compile} from './helpers/callDecisionHarness.js';
import {scoreEngine,scoringInputs} from './helpers/scoreEngineHarness.js';
import {onRequest,REGISTRY_URL} from '../functions/api/learning.js';
const start=Date.parse('2026-01-01T00:00:00Z'),now=Date.parse('2026-10-14T16:00:00Z');
const features=(s=1,secondsLeft=720)=>L.directionFeatures({signals:{gap:s*15,momentum:s*8,flow:s*10,structure:0,technical:0,regime:s*4,rangePosition:0},baseUp:55,atrBps:12,secondsLeft});
function call(i=0){const at=start+i*3600000+180000,close=start+i*3600000+900000,windowId=`15m-${new Date(start+i*3600000).toISOString()}`;
  const e={id:at,asset:'BTC',windowType:'15m',windowId,dir:'UP',time:at,lockedAt:at,atSecondsLeft:720,confidence:70,
    taraVersion:'14.6.0',strike:84000,marketTicker:`KXBTC15M-TEST${i}`,marketCloseTime:new Date(close).toISOString(),
    rawPosteriorAtLock:55,kalshiBidAtLock:54,kalshiAskAtLock:56,quoteObservedAt:at,learningFeatures:features(i%2?1:-1),learningDataReady:true,callPolicy:{action:'allow',cutoff:420}};
  e.originalDecision=captureOriginalDecision(e,{now:at});Object.assign(e,settlementPatch(e,{ticker:e.marketTicker,status:'settled',result:i%2?'yes':'no',close_time:e.marketCloseTime,floor_strike:84000},close+1000).patch);return e;}
function rows(n=160){return Array.from({length:n},(_,i)=>L.callLearningRow(call(i),{asOf:now}).row);}
test('features distinguish a missing feed from an inactive conditional signal',()=>{
  const f=features();assert.equal(f.values.length,13);assert.equal(f.values[9],0);assert.equal(L.validFeatures(f),true);
  assert.equal(L.directionFeatures({signals:{gap:10,momentum:12,flow:15},baseUp:80,atrBps:12,secondsLeft:600}),null);
  // Neutral observed data is not missing data: otherwise calm sit-outs would
  // be silently excluded just because their signals were weak.
  assert.ok(L.directionFeatures({signals:{...Object.fromEntries(L.DIRECTION_FEATURES.slice(0,10).map(k=>[k,0]))},baseUp:50,atrBps:12,secondsLeft:600}));
  assert.equal(L.validFeatures({...f,values:f.values.map((x,i)=>i===0?NaN:x)}),false);
});
test('trusted original capture and exact official settlement admit UP labels, not WIN labels',()=>{
  const down=call(0),up=call(1);assert.equal(L.callLearningRow(down,{asOf:now}).row.y,0);assert.equal(L.callLearningRow(up,{asOf:now}).row.y,1);
  down.dir='DOWN';down.originalDecision={...down.originalDecision,direction:'DOWN'};down.result='WIN';assert.equal(L.callLearningRow(down,{asOf:now}).row.y,0);
});
test('pending, sit-out, amended, reconstructed, wrong-ticker and future labels cannot train',()=>{
  for(const patch of [{result:null},{dir:'SIT_OUT',result:'SITOUT'},{manualEditedAt:now},{recordRevisions:[{}]},{isUserForced:true},
    {originalDecision:{...call().originalDecision,learningDataReady:false}},{originalDecision:{...call().originalDecision,commitPolicy:{action:'manual'}}},
    {originalDecision:{...call().originalDecision,provenance:'legacy-observed'}},{officialSettlement:{...call().officialSettlement,ticker:'wrong'}},
    {officialSettlement:{...call().officialSettlement,verifiedAt:now+1}},{officialSettlement:{...call().officialSettlement,closeTime:null}}]){
    assert.equal(L.callLearningRow({...call(),...patch},{asOf:now}).ok,false,JSON.stringify(patch));}
});
test('original features are deep copied once and cannot be reconstructed during settlement',()=>{
  const e=call(1),original=JSON.stringify(e.originalDecision);e.learningFeatures.values[0]=999;assert.equal(JSON.stringify(e.originalDecision),original);
  assert.equal(captureOriginalDecision(e),e.originalDecision);assert.equal(captureOriginalDecision({dir:'UP'}).learningFeatures,undefined);
});
test('exactly-once journal rejects repeated or revised outcomes',()=>{
  const e=call(1),a=L.applyOnceLedger(null,e);assert.equal(a.apply,true);assert.equal(L.applyOnceLedger(a.ledger,e).apply,false);
  const changed={...e,officialSettlement:{...e.officialSettlement,verifiedAt:e.officialSettlement.verifiedAt+1}};
  assert.equal(L.applyOnceLedger(a.ledger,changed).reason,'changed-outcome-needs-rebuild');
});
test('chronological split has no shared windows, delayed labels or normalization leakage',()=>{
  const r=rows(),split=L.chronologicalSplit([...r,r[0],{...r[1],key:'anchor-copy'}]);assert.equal(split.ok,true);
  assert.equal(split.train.some(t=>split.test.some(s=>s.group===t.group)),false);
  const first=Math.min(...split.test.map(r=>r.at));assert.ok(split.train.every(r=>r.labelAt<first-L.LEARNING_POLICY.gapMs));
  const originalSplit=L.chronologicalSplit(r),testGroups=new Set(originalSplit.test.map(r=>r.group));
  const changed=r.map(r=>testGroups.has(r.group)?{...r,x:r.x.map(()=>999)}:r);
  const a=L.createChallenger(r,{profile:'BTC_15m',schema:'btc-direction-v1',now}),b=L.createChallenger(changed,{profile:'BTC_15m',schema:'btc-direction-v1',now});
  assert.deepEqual(a.model.means,b.model.means);assert.deepEqual(a.model.weights,b.model.weights);assert.equal(a.model.accuracy,null);
});
test('repeated anchors/contracts are not independent training windows',()=>{
  const r=rows(10).flatMap(r=>Array.from({length:40},(_,j)=>({...r,key:r.key+'|'+j})));
  assert.equal(L.createChallenger(r,{profile:'BTC_15m',schema:'btc-direction-v1',now}).status,'collecting');
});
test('fit is deterministic and holdout metrics are genuinely out of sample',()=>{
  const a=L.createChallenger(rows(),{profile:'BTC_15m',schema:'btc-direction-v1',now}),b=L.createChallenger(rows(),{profile:'BTC_15m',schema:'btc-direction-v1',now});
  assert.deepEqual(a,b);assert.equal(a.status,'shadow');assert.equal(a.model.activation,'shadow');assert.equal(a.holdout.candidate.n,a.holdout.baseline.n);
  assert.ok(a.holdout.candidate.brier<a.holdout.baseline.brier);
});
test('forward evidence requires the frozen model, exact key/features and prediction before settlement',()=>{
  const c=L.createChallenger(rows(),{profile:'BTC_15m',schema:'btc-direction-v1',now});
  const r={...rows(2)[1],key:'future',at:now+1000,close:now+600000,labelAt:now+601000};
  const f={...features(),values:r.x},p=L.recordPrediction(c.model,f,{at:r.at,profile:r.profile,key:r.key});
  assert.ok(L.forwardEvidence(c.model,r,p,{now:r.labelAt}));
  for(const patch of [{at:c.createdAt},{at:r.labelAt},{key:'another-window'},{modelId:'another-model'},{featureDigest:'wrong'},{probability:.999}])assert.equal(L.forwardEvidence(c.model,r,{...p,...patch},{now:r.labelAt}),null);
});
test('in-sample accuracy, stale registry, wrong profile and shadow model cannot affect scores',()=>{
  assert.equal(L.activeModel({protocol:L.LEARNING_PROTOCOL,generatedAt:now,profiles:{BTC_15m:{champion:{accuracy:.99,weights:[1]}}}},'BTC_15m',now),null);
  const c=L.createChallenger(rows(),{profile:'BTC_15m',schema:'btc-direction-v1',now});assert.equal(L.modelScoreImpact(c.model,features(),40),0);
  assert.equal(L.activeModel({protocol:L.LEARNING_PROTOCOL,generatedAt:NaN},'BTC_15m',now),null);
});
test('positive shadow results alone cannot auto-promote a live model',()=>{
  const c=L.createChallenger(rows(),{profile:'BTC_15m',schema:'btc-direction-v1',now});
  assert.equal(L.promotionDecision(c,[]).reason,'insufficient-frozen-forward-evidence');
  const registry=trainLearningRegistry({calls:Array.from({length:160},(_,i)=>call(i)),now}).registry;
  assert.equal(registry.liveActivationApproved,false);assert.equal(registry.profiles.BTC_15m.champion,null);
});
test('equal-size rolling windows invalidate learning summaries despite a larger stale lifetime count',()=>{
  const entries=[call(1)],source=L.learningSource(entries),a={learningProtocol:L.LEARNING_PROTOCOL,source,lastUpdated:now,totalResolved:1};
  assert.equal(L.preferLearningSummary(a,{totalResolved:553}),true);
  assert.equal(L.preferLearningSummary(a,{...a}),false);
  const next={...a,source:L.learningSource([call(2)]),lastUpdated:now+1};assert.equal(L.preferLearningSummary(next,a),true);
  const amended={...entries[0],regime:'CHANGED',manualEditedAt:now+3};assert.notEqual(L.learningSource([amended]).signature,source.signature);
});
test('authoritative deletion can lower summary count; a stale device cannot win just by touching its timestamp',()=>{
  const cloud={learningProtocol:L.LEARNING_PROTOCOL,source:L.learningSource([call(1),call(2)]),lastUpdated:now},local={learningProtocol:L.LEARNING_PROTOCOL,source:L.learningSource([call(1)]),lastUpdated:now+99};
  assert.equal(L.preferLearningSummary(local,cloud),false);assert.equal(L.preferLearningSummary(local,cloud,{canonicalSource:local.source}),true);
});
test('the production summary recomputes the right horizon and does not count corrupt or amended results',()=>{
  let summary={};const scope={React:{useCallback:f=>f},verifiedSummaryCall:L.verifiedSummaryCall,learningSummarySource:L.learningSummarySource,LEARNING_PROTOCOL:L.LEARNING_PROTOCOL,Date,
    setTaraLearnings:f=>summary=f(summary)};
  scope._deriveMultipliers=actual('_deriveMultipliers',scope);const recompute=actual('_recomputeLearningsFromLog',scope);
  recompute([call(1),{...call(2),windowType:'1h'},{...call(3),result:'NO_TRADE'},{...call(4),manualEditedAt:now}]);
  assert.equal(summary.totalResolved,1);assert.equal(summary.scope,'BTC_15m');const prior=summary;recompute([call(1),{...call(2),windowType:'1h'},{...call(3),result:'NO_TRADE'},{...call(4),manualEditedAt:now}]);assert.equal(summary,prior);
  const sameRows=[call(1),{...call(2),windowType:'1h'},{...call(3),result:'NO_TRADE'},{...call(4),manualEditedAt:now}];
  summary={...summary,source:L.learningSource(sameRows),totalResolved:999};
  recompute(sameRows);assert.equal(summary.totalResolved,1);assert.equal(summary.source.policy,'official-early-v2');
});
test('hourly and weather freeze their directional probability and verify the exact market',()=>{
  const pick={ticker:'KXBTCD-TEST',side:'NO'},capture=capturePickLearning(pick,{profile:'BTC_hourly',at:start,close:start+3600000,version:'14.6',probability:.8,confidence:70,price:60,quoteAt:start,event:'hour'});
  assert.ok(capture);const p={...pick,learningCapture:capture},market={ticker:pick.ticker,close_time:new Date(start+3600000).toISOString(),status:'settled',result:'no'};
  p.learningSettlement=capturePickSettlement(p,market,start+3600001);assert.equal(L.pickLearningRow(p,'BTC_hourly',{asOf:now}).row.y,1);
  assert.equal(L.pickLearningRow(p,'Weather_paper',{asOf:now}).ok,false);assert.equal(capturePickSettlement(p,{...market,ticker:'wrong'},now),null);
  assert.equal(capturePickLearning(pick,{profile:'BTC_hourly',at:start,close:start+3600000,probability:.8,confidence:70,price:60,quoteAt:start-31000}),null);
  assert.ok(L.calibrationFeatures({probability:1,confidence:100,secondsLeft:600}));
});
test('fully observed sit-out windows are learnable; an unobserved or not-ready window is not',()=>{
  const windowId=`15m-${new Date(start).toISOString()}`,ticker='KXBTC15M-TEST';let s=createLockStudy({windowId,now:start,device:'test',version:'14.6'});
  for(let elapsed=0;elapsed<=900;elapsed+=15)s=observeLockStudy(s,{windowId,asset:'BTC',now:start+elapsed*1000,dataReady:true,learningFeatures:features(1,900-elapsed),probabilityUpRaw:55,
    quote:{ticker,closeTime:new Date(start+900000).toISOString(),at:start+elapsed*1000,bid:54,ask:56,strike:84000}});
  s=settleLockStudy(s,{ticker,close_time:new Date(start+900000).toISOString(),result:'yes',status:'settled',floor_strike:84000},start+901000);
  assert.equal(s.coverage.complete,true);assert.equal(s.early.status,'sitout');assert.equal(L.studyLearningRows(s,{asOf:now}).length,4);
  assert.equal(L.studyLearningRows({...s,coverage:{complete:false}},{asOf:now}).length,0);
  assert.equal(L.studyLearningRows({...s,observations:s.observations.map(o=>({...o,dataReady:false}))},{asOf:now}).length,0);
});
test('frozen candidates and source archives survive a failed fetch without retraining or erasure',()=>{
  const first=trainLearningRegistry({calls:Array.from({length:160},(_,i)=>call(i)),now});
  const next=trainLearningRegistry({previous:first,now:now+3600000,sourceHealth:{calls:{status:'read-failed'}}});
  assert.equal(next.rows.length,first.rows.length);assert.deepEqual(next.registry.profiles.BTC_15m.challenger,first.registry.profiles.BTC_15m.challenger);
  assert.equal(next.registry.liveActivationApproved,false);assert.equal(next.registry.profiles.Sports.status,'source-review');
});
test('a fabricated backdated prediction is not forward evidence unless the independent trainer saw it before close',()=>{
  const first=trainLearningRegistry({calls:Array.from({length:160},(_,i)=>call(i)),now}),model=first.registry.profiles.BTC_15m.challenger.model;
  setLearningRegistry(first.registry);const e=call(300);e.originalDecision={...e.originalDecision,lockedAt:now+60000,windowId:`15m-${new Date(now).toISOString()}`,quoteObservedAt:now+60000};
  e.windowId=e.originalDecision.windowId;e.originalDecision.marketTicker=e.marketTicker;
  e.originalDecision.learningFeatures={...e.originalDecision.learningFeatures,values:[...e.originalDecision.learningFeatures.values.slice(0,-1),840]};
  e.officialSettlement={...e.officialSettlement,closeTime:new Date(now+900000).toISOString(),verifiedAt:now+901000};
  e.originalDecision.learningPredictions=learningPredictions(e.originalDecision.learningFeatures,{profile:'BTC_15m',key:callKey(e),at:now+60000});
  const forged=trainLearningRegistry({calls:[e],previous:first,now:now+1000000});assert.equal(forged.registry.profiles.BTC_15m.forwardGroups,0);
  const pending={...e,result:null,officialSettlement:null},witnessed=trainLearningRegistry({calls:[pending],previous:first,now:now+300000});
  assert.ok(witnessed.witnesses[witnessKey(e.originalDecision.learningPredictions[0])]);
  const final=trainLearningRegistry({calls:[e],previous:witnessed,now:now+1000000});assert.equal(final.registry.profiles.BTC_15m.forwardGroups,1);setLearningRegistry(null);
});
test('the real scoring path freezes features but a 99 percent legacy training fit cannot activate',()=>{
  const engine=scoreEngine(),input=scoringInputs();const a=engine.computeV99Posterior(input),b=engine.computeV99Posterior({...input,mlModel:{weights:Array(14).fill(50),accuracy:.99,bias:999}});
  assert.ok(a.learningFeatures);assert.equal(a.posterior,b.posterior);assert.equal(a.rawSignalScores.ml,undefined);assert.equal(engine.errors.length,0);
});
test('production keeps cutoff, thresholds and execution settings separate from training',()=>{
  assert.match(app,/const _mlModel=null/);assert.match(app,/const applyTradeLearning=.*[\s\S]*?return;/);
  const trainer=fs.readFileSync(new URL('../scripts/train-learning.mjs',import.meta.url),'utf8');assert.doesNotMatch(trainer,/method\s*:\s*['"](?:POST|PATCH|DELETE|PUT)/i);assert.doesNotMatch(trainer,/\/orders|\/positions/);
});
test('learning UI labels missing data honestly and renders every profile without a trading engine',()=>{
  const source=fs.readFileSync(new URL('../src/LearningStatus.jsx',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace(/export function /g,'function ');
  const compiled=transformSync(source,{loader:'jsx',format:'cjs'}).code;
  const C=new Function('React','LEARNING_PROFILES',`${compiled};return LearningStatus;`)(React,LEARNING_PROFILES);
  const html=renderToStaticMarkup(React.createElement(C,{learning:{status:'unavailable'}}));assert.match(html,/Trainer unavailable/);assert.match(html,/BTC · hourly/);assert.match(html,/Weather · live/);assert.match(html,/Sports/);assert.match(html,/No model is active/);assert.doesNotMatch(html,/100% accuracy/);
});
test('corrected training evidence retires the frozen candidate rather than preserving invalid holdout claims',()=>{
  const calls=Array.from({length:160},(_,i)=>call(i)),first=trainLearningRegistry({calls,now});
  const next=trainLearningRegistry({calls:calls.map((e,i)=>i===1?{...e,manualEditedAt:now+1}:e),previous:first,now:now+1000});
  const p=next.registry.profiles.BTC_15m;assert.equal(p.retired.at(-1).reason,'source-evidence-corrected-or-excluded');
  assert.notEqual(p.challenger.model.id,first.registry.profiles.BTC_15m.challenger.model.id);assert.equal(p.forwardGroups,0);
});
test('profitable forward classifier improvement becomes review-ready, never silently live',()=>{
  const c=L.createChallenger(rows(),{profile:'BTC_15m',schema:'btc-direction-v1',now});
  const forward=rows(120).map((r,i)=>({...r,key:`future-${i}`,group:`future-${i}`,base:.85,at:now+1+i*900000,
    close:now+899000+i*900000,labelAt:now+900000+i*900000})).map(r=>L.forwardEvidence(c.model,r,
      L.recordPrediction(c.model,{...features(),values:r.x},{at:r.at,key:r.key,profile:r.profile}),{now:r.labelAt}));
  const p=L.promotionDecision(c,forward);assert.equal(p.ok,true);assert.ok(p.pairedGainLower>0);
  assert.equal(L.activeModel({protocol:L.LEARNING_PROTOCOL,generatedAt:now,profiles:{BTC_15m:{champion:{...c.model,activation:'validated'},promotion:p}}},'BTC_15m',now),null);
});
test('conflicting duplicate labels cannot be counted twice or survive as a selected convenient result',()=>{
  const r=rows(2);assert.equal(L.uniqueLearningRows([r[0],r[0],r[1]]).length,2);
  assert.equal(L.uniqueLearningRows([r[0],{...r[0],y:1-r[0].y},r[1]]).length,1);
});
test('the hosted registry route is read-only, fixed-origin and fails closed on malformed data',async()=>{
  assert.equal((await onRequest({request:new Request('https://test.invalid/api/learning',{method:'POST'})})).status,405);
  const saved=globalThis.fetch;try{
    let target;globalThis.fetch=async url=>{target=url;return Response.json({protocol:L.LEARNING_PROTOCOL,generatedAt:now,profiles:{}});};
    const r=await onRequest({request:new Request('https://test.invalid/api/learning?url=https://evil.invalid')});assert.equal(r.status,200);assert.equal(target,REGISTRY_URL);
    globalThis.fetch=async()=>Response.json({protocol:'wrong'});assert.equal((await onRequest({request:new Request('https://test.invalid/api/learning')})).status,503);
  }finally{globalThis.fetch=saved;}
});
test('the real weight restoration loads one saved baseline and ignores subsequent legacy gradient writers',()=>{
  const code=app.match(/useEffect\(\(\)=>\{\s*const unsub=cloudWatch\('learnings\/taraWeights',[\s\S]*?return unsub;\s*\},\[\]\);/)[0];
  let receive,weights={BTC:{gap:1}},regime={BTC:{}};
  const scope={useEffect:f=>f(),cloudWatch:(_path,f)=>{receive=f;return()=>{};},_weightsCloudHydratedRef:{current:false},
    _weightsByAssetUpdatedAtRef:{current:{BTC:{adaptive:0,regime:0}}},setAdaptiveWeightsByAsset:f=>{weights=f(weights);},setRegimeWeightsByAsset:f=>{regime=f(regime);}};
  compile(code,'return;')(scope);receive(null);assert.equal(scope._weightsCloudHydratedRef.current,false);
  receive({adaptive:{BTC:{gap:12}},regime:{BTC:{TREND:{gap:8}}},updatedAtBTC:{adaptive:10,regime:10}});
  assert.equal(weights.BTC.gap,12);assert.equal(regime.BTC.TREND.gap,8);
  receive({adaptive:{BTC:{gap:99}},regime:{BTC:{TREND:{gap:99}}},updatedAtBTC:{adaptive:999,regime:999}});
  assert.equal(weights.BTC.gap,12);assert.equal(regime.BTC.TREND.gap,8);
});
test('legacy feedback summaries require a matching official early-window outcome, not a convenient WIN label',()=>{
  const e=call(1);assert.equal(L.verifiedSummaryCall(e,now),true);
  for(const patch of [{officialSettlement:null},{manualEdit:true},{officialSettlement:{...e.officialSettlement,outcomeDir:'DOWN'}},
    {officialSettlement:{...e.officialSettlement,ticker:'wrong'}},{originalDecision:{...e.originalDecision,lockedAt:Date.parse(e.marketCloseTime)-419000}}]){
    assert.equal(L.verifiedSummaryCall({...e,...patch},now),false);
  }
});
