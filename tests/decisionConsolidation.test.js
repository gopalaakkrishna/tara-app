import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
import {makeHarness,app,compile} from './helpers/callDecisionHarness.js';
import {callDecisionEvidence,advanceCallFormation,callFormationReady} from '../src/decisionAuthority.js';
import {quietWindowEvidence,windowSecondsElapsed} from '../src/forecastTiming.js';
import {normalizeCallLedger,applyAutomaticCallSettlement,hasDecisionAmendment,amendCallRecord,callKey} from '../src/callIntegrity.js';
import {directionFeatures,callLearningRow,verifiedSummaryCall,learningSummarySource} from '../src/learningCore.js';
import {readCapturedCallSettlement} from '../src/callSettlement.js';
import {callLogSyncSignature} from '../src/callLogSync.js';
import {evidenceCohort} from '../src/presentationEvidence.js';
import {chooseSharedSnapshot,ledgerDecision} from '../src/sharedDecision.js';
import {scoreEngine,scoringInputs} from './helpers/scoreEngineHarness.js';
import {CALL_EVIDENCE_FIELDS} from '../src/callIntegrity.js';

const hOptions={samples:0,claimedDirection:null,quality:80,mtf:2,tapeBuy:90,yesPrice:50};
function observed(direction='UP') {
  const h=makeHarness({...hOptions,...(direction==='DOWN'?{probabilityUp:22.75,mtf:-2,tapeBuy:10}:{} )});
  const signals=Object.fromEntries(['gap','momentum','flow','structure','technical','regime','rangePosition'].map(k=>[k,0]));
  for(let i=0;i<40&&!h.scope.taraCallSnapshotRef.current;i++){
    h.advance(631-i);
    h.scope.analysis.learningFeatures=directionFeatures({signals,baseUp:h.scope.analysis.rawProbAbove,atrBps:12,secondsLeft:631-i});
    h.run();
  }
  assert.equal(h.scope.taraCallSnapshotRef.current?.call,direction);
  assert.deepEqual(h.errors,[]);assert.equal(h.logs.length,1);
  return h;
}

test('the same market data cannot turn clock ticks into confirmation',()=>{
  const h=makeHarness(hOptions),spot=h.scope.lastPriceSourceRef.current.time,quote=h.scope._kalshiQuote.at;
  for(let i=0;i<12;i++){
    h.advance(631-i);h.scope.lastPriceSourceRef.current.time=spot;h.scope._kalshiQuote.at=quote;
    assert.equal(h.run(),null);
  }
  assert.equal(h.scope.taraCallSampleRef.current.observations,1);
  assert.equal(h.scope.taraCallSampleRef.current.count,1.5);assert.equal(h.logs.length,0);
  assert.equal(h.scope.currentCallBlockerRef.current.code,'sample-freshness');
});

test('real millisecond evaluation time does not reject a fresh qualified formation',()=>{
  const h=makeHarness(hOptions),now=h.clock;
  const state={schema:2,count:6,firstAt:now-3000,lastAt:now,observations:4};
  assert.equal(callFormationReady(state,6,now+5),true);
  assert.equal(callFormationReady(state,6,now+999),true);
  assert.equal(callFormationReady(state,6,now-1),false);
  assert.equal(callFormationReady(state,6,now+1001),false);
});

test('new observations faster than one second, regressing quotes and future/stale spot do not confirm',()=>{
  const h=makeHarness(hOptions),q=h.scope._kalshiQuote,now=q.at;
  const input={direction:'UP',windowId:h.windowId,asset:'BTC',source:'coinbase',spotAt:now,quote:q,probabilityUp:77,now};
  const first=advanceCallFormation(null,input);
  for(const patch of [{now:now+100,spotAt:now+100},{now:now+1000,spotAt:now},
    {now:now+1000,spotAt:now+1000,quote:{...q,at:now-1}},
    {now:now+1000,spotAt:now+5000},{now:now+20000,spotAt:now}])
    assert.equal(advanceCallFormation(first.state,{...input,...patch}).fresh,false);
  assert.equal(callFormationReady(first.state,6,now),false);
});

test('direction, source and window changes cannot borrow confirmations',()=>{
  const h=makeHarness(hOptions);h.run();const previous=h.scope.taraCallSampleRef.current;
  for(const patch of [{direction:'DOWN',probabilityUp:20},{source:'okx'}]){
    const next=advanceCallFormation(previous,{direction:'UP',windowId:h.windowId,asset:'BTC',source:'coinbase',
      spotAt:h.clock+1000,quote:{...h.scope._kalshiQuote,at:h.clock+1000},probabilityUp:77,now:h.clock+1000,...patch});
    assert.equal(next.state.observations,1);assert.equal(next.state.count,1.5);
  }
  assert.equal(advanceCallFormation({dir:'UP',count:999},{direction:'UP',windowId:h.windowId,asset:'BTC',source:'coinbase',
    spotAt:h.clock,quote:h.scope._kalshiQuote,probabilityUp:77,now:h.clock}).state.observations,1);
});

test('opposite trajectory and reversal diagnostics cannot flip qualified direction or stale tier flags',()=>{
  const h=makeHarness({...hOptions,probabilityUp:65,samples:200});
  h.scope.analysis.projectedGapBps=-38;h.scope.analysis.last60sDriftBps=-6;
  h.scope.analysis.trendChannel={valid:true,slopeBpsPerBar:-1,channelPos:.5};
  h.scope.analysis.grandTrend={valid:true,dir:'DOWN',strengthBps:30,slopeBpsPerBar:-1};
  h.run();const call=h.scope.taraCall;
  assert.equal(call.call,'UP');assert.equal(call.decisionEvidence.direction,'UP');
  assert.equal(call.decisionEvidence.trajectoryDirection,'DOWN');
  assert.equal(call._v10_7_4_flipped,undefined);assert.equal(call._v10_7_11_universalFlipped,undefined);
  assert.equal(call._ctx.isSuperConfluent,true);assert.equal(call._ctx.tapeStronglyAgrees,true);
  assert.equal(call.decisionEvidence.scoreKind,'signal-score');assert.deepEqual(h.errors,[]);
});

test('pump/dump warnings use a bound analysis input without synthesizing probability',()=>{
  const pump=callDecisionEvidence({call:'UP',confidence:82},{rawProbAbove:70,last60sDriftBps:10},{w15:{buyPct:90}});
  assert.equal(pump.reversalWarning,'pump-exhaustion');assert.equal(pump.direction,'UP');assert.equal(pump.probabilitySide,70);
  const dump=callDecisionEvidence({call:'DOWN',confidence:82},{rawProbAbove:0,last60sDriftBps:-10},{w15:{buyPct:10}});
  assert.equal(dump.reversalWarning,'dump-exhaustion');assert.equal(dump.probabilitySide,100);
  const traverse=traverseModule.default||traverseModule,missing=[];
  traverse(parse(app,{sourceType:'module',plugins:['jsx']}),{ReferencedIdentifier(p){
    if(p.node.name==='_ana'&&!p.scope.getBinding('_ana'))missing.push(p.node.loc.start.line);
  }});
  assert.deepEqual(missing,[]);
});

test('quiet regime classification uses elapsed time with the original180-second/0.4 thresholds',()=>{
  assert.equal(windowSecondsElapsed(850,true),50);assert.equal(windowSecondsElapsed(120,false),180);
  const input={is15m:true,atrBps:20,windowOpenPrice:80000,currentPrice:80040};
  assert.equal(quietWindowEvidence({...input,clockSeconds:850}),null);
  const r=quietWindowEvidence({...input,clockSeconds:600});
  assert.equal(r.elapsed,300);assert.ok(Math.abs(r.expected-20/3)<1e-9);assert.equal(r.realized,5);
  assert.equal(quietWindowEvidence({...input,clockSeconds:null}),null);
});

test('UP and DOWN complete scoring→qualification→timing→fresh formation→seal→restore→official settlement→learning',async()=>{
  for(const direction of ['UP','DOWN']){
    const h=observed(direction),row=h.logs[0],original=structuredClone(row.originalDecision),now=h.close+60000;
    assert.equal(original.decisionEvidence.authority,'single-forecast-v1');assert.equal(original.decisionEvidence.direction,direction);
    assert.ok(original.formation.observations>=2);assert.ok(original.secondsLeft>420);
    const context={windowId:h.windowId,windowType:'15m',asset:'BTC',now:original.lockedAt+1000};
    const restored=ledgerDecision([row],context);assert.equal(restored.call,direction);
    assert.deepEqual(chooseSharedSnapshot(restored,null,context).originalDecision,original);
    const fetchImpl=async()=>({ok:true,json:async()=>({market:{ticker:original.marketTicker,
      close_time:original.marketCloseTime,floor_strike:original.strike,status:'finalized',result:direction==='UP'?'yes':'no'}})});
    const verified=await readCapturedCallSettlement(row,{fetchImpl,now});assert.equal(verified.ok,true);
    const final=normalizeCallLedger([applyAutomaticCallSettlement(row,verified.patch,now)],[row],null,now)[0];
    assert.equal(final.result,'WIN');assert.equal(final.manualEdit,undefined);assert.equal(hasDecisionAmendment(final),false);
    assert.deepEqual(final.originalDecision,original);assert.equal(callKey(final),callKey(row));
    assert.notEqual(callLogSyncSignature([final]),callLogSyncSignature([row]));
    assert.equal(verifiedSummaryCall(final,now),true);assert.equal(callLearningRow(final,{asOf:now}).ok,true);
    assert.equal(evidenceCohort([final]).priced,1);
    assert.equal(learningSummarySource([final]).count,1);
    const merged=normalizeCallLedger([{...row,originalDecision:undefined}],[final],null,now+1000)[0];
    assert.equal(merged.result,'WIN');assert.deepEqual(merged.officialSettlement,final.officialSettlement);
  }
});

test('normal lifecycle settlement is eligible; a true correction, manual edit and unknown revision remain excluded',()=>{
  const h=observed(),row=h.logs[0],now=h.close+60000;
  const proof={schema:1,source:'kalshi-public-api',ticker:row.originalDecision.marketTicker,closeTime:row.originalDecision.marketCloseTime,
    strike:row.originalDecision.strike,outcomeDir:'UP',verifiedAt:now};
  const lifecycle=normalizeCallLedger([{...row,result:'WIN',outcomeDir:'UP',strike:row.originalDecision.strike}],[row],null,now)[0];
  const final=applyAutomaticCallSettlement(lifecycle,{result:'WIN',outcomeDir:'UP',officialSettlement:proof},now);
  assert.equal(callLearningRow(final,{asOf:now}).ok,true);
  for(const patch of [{manualEdit:true},{manualEditedAt:now},{recordRevisions:[{}]},
    {recordRevisions:[{source:'lifecycle-update',before:{dir:'DOWN'},after:{dir:'UP',result:'WIN'}}]}])
    assert.equal(callLearningRow({...final,...patch},{asOf:now}).ok,false);
  const wrong=applyAutomaticCallSettlement({...row,result:'LOSS'},{result:'WIN',outcomeDir:'UP',officialSettlement:proof},now);
  assert.equal(wrong.result,'LOSS');assert.equal(wrong.recordIntegrity.status,'review-required');assert.equal(verifiedSummaryCall(wrong,now),false);
  assert.equal(applyAutomaticCallSettlement(row,{result:'WIN',officialSettlement:{...proof,ticker:'wrong'}},now),row);
  assert.equal(hasDecisionAmendment(amendCallRecord(final,{result:'LOSS'},{source:'manual'})),true);
});

test('live probability calibration excludes sit-outs and grades P(UP) against UP outcomes, not directional wins',()=>{
  const ast=parse(app,{sourceType:'module',plugins:['jsx']}),parts=[];
  for(const s of ast.program.body)if(s.type==='VariableDeclaration')for(const d of s.declarations)
    if(['DEFAULT_CALIBRATION','buildCalibration'].includes(d.id.name))parts.push(`const ${d.id.name}=${app.slice(d.init.start,d.init.end)};`);
  const build=compile(parts.join('\n'),'return buildCalibration;')({verifiedSummaryCall});
  const h=observed(),e=h.logs[0],at=h.close+60000;
  const settled=applyAutomaticCallSettlement(e,{result:'WIN',officialSettlement:{source:'kalshi-public-api',
    ticker:e.originalDecision.marketTicker,closeTime:e.originalDecision.marketCloseTime,strike:e.originalDecision.strike,outcomeDir:'UP',verifiedAt:at}},at);
  const copies=Array.from({length:10},(_,i)=>({...settled,id:i}));
  const clean=build(copies),mixed=build([...copies,...Array.from({length:74},()=>({...settled,dir:'SIT_OUT',result:'SITOUT'}))]);
  assert.deepEqual(mixed.__buckets,clean.__buckets);assert.equal(clean[70],100);
  const down={...settled,dir:'DOWN',originalDecision:{...settled.originalDecision,direction:'DOWN',probabilityUpRaw:20},
    officialSettlement:{...settled.officialSettlement,outcomeDir:'DOWN'},recordRevisions:[]};
  assert.equal(build(Array.from({length:10},()=>down))[20],0);
});

test('consolidation keeps the420 cutoff,65 timing threshold,44–77 Call band and AutoTrade/hourly algorithms',()=>{
  assert.match(app,/const _convDecent112=_convNow>=65/);
  assert.match(app,/if\(_decisionSecondsLeft<=callLockDeadline\(windowType\)/);
  assert.match(app,/callFormationReady\(taraCallSampleRef.current,needSamples,Date.now\(\)\)/);
  assert.doesNotMatch(app,/confidence:100-call.confidence/);
  assert.doesNotMatch(app,/const _v10_7_11_universalOverride=/);
  assert.match(app,/taraCostBand/);
});

test('real final regime flags and captured raw-forecast features agree with the authoritative engine output',()=>{
  for(const direction of ['UP','DOWN']){
    const engine=scoreEngine(),input=scoringInputs({direction});input.recentWindowMovesBps=[1,2,3,4,5];
    const result=engine.computeV99Posterior(input);
    assert.equal(result.regime,'RANGE-CHOP');assert.equal(result.rawSignalScores._isTrend,false);
    assert.equal(result.rawSignalScores._isChop,true);assert.equal(result.rawSignalScores._v10736regime,result.regime);
    assert.ok(Math.abs(result.learningFeatures.baseProbability*100-result.rawPosterior)<1e-8);assert.deepEqual(engine.errors,[]);
  }
});

test('actual automatic reconciliation writes one canonical local row and preserves capture without marking manual',async()=>{
  const traverse=traverseModule.default||traverseModule;let body;
  traverse(parse(app,{sourceType:'module',plugins:['jsx']}),{AssignmentExpression(p){
    if(p.node.left.type==='MemberExpression'&&p.node.left.property.name==='_taraApplyReconcile')body=app.slice(p.node.start,p.node.end);
  }});
  const h=observed(),row=h.logs[0],now=h.close+60000,storage=new Map();let idb=[row],state=[row];
  const scope={window:{},_idbRead:async()=>idb,taraCallLogRef:{current:[row]},applyAutomaticCallSettlement,
    amendCallRecord,Date:{now:()=>now},TARA_CALL_LOG_CAP:1000,normalizeCallLedger,taraCallSnapshotRef:{current:h.scope.taraCallSnapshotRef.current},
    _idbWrite:async(key,value)=>{idb=value;},localStorage:{setItem:(k,v)=>storage.set(k,v)},
    sessionStorage:{removeItem(){}},CALL_EVIDENCE_FIELDS,setForceRender(){},console:{info(){},warn(){},log(){}},
    setTaraCallLog:value=>{state=typeof value==='function'?value(state):value;}};
  const apply=compile(body,'return window._taraApplyReconcile;')(scope);
  const proof={source:'kalshi-public-api',ticker:row.originalDecision.marketTicker,closeTime:row.originalDecision.marketCloseTime,
    strike:row.originalDecision.strike,outcomeDir:'UP',verifiedAt:now};
  assert.equal(await apply(new Map([[row.id,{result:'WIN',outcomeDir:'UP',officialSettlement:proof}]]),{automatic:true}),1);
  assert.equal(idb.length,1);assert.equal(state.length,1);assert.equal(state[0].manualEdit,undefined);
  assert.deepEqual(state[0].originalDecision,row.originalDecision);
  assert.equal(callLearningRow(state[0],{asOf:now}).ok,true);
  assert.equal(JSON.parse(storage.get('taraCallLog_v1'))[0].officialSettlement.ticker,proof.ticker);
  assert.equal(await apply(new Map([[row.id,{result:'LOSS',outcomeDir:'DOWN'}]])),1);
  assert.equal(state[0].manualEdit,true);assert.equal(callLearningRow(state[0],{asOf:now}).ok,false);
});

test('a provisional rollover guess stays ungraded and official settlement supplies the final result and estimate',()=>{
  const h=observed(),row=h.logs[0],now=h.close+60000;
  const pending={...row,result:null,provisionalResult:'LOSS',netCents:-51,realizedPnLDollars:123};
  assert.equal(callLearningRow(pending,{asOf:now}).ok,false);
  const proof={source:'kalshi-public-api',ticker:row.originalDecision.marketTicker,closeTime:row.originalDecision.marketCloseTime,
    strike:row.originalDecision.strike,outcomeDir:'UP',verifiedAt:now};
  const final=applyAutomaticCallSettlement(pending,{result:'WIN',outcomeDir:'UP',officialSettlement:proof},now);
  assert.equal(final.result,'WIN');assert.equal(final.provisionalResult,null);assert.equal(final.netCents,49);
  assert.equal(final.netCentsSource,'original-quote-gross-estimate');assert.equal(final.realizedPnLDollars,123);
  assert.equal(callLearningRow(final,{asOf:now}).ok,true);
  for(const bad of [{...proof,strike:proof.strike+1},{...proof,verifiedAt:now+1000}])
    assert.equal(applyAutomaticCallSettlement(pending,{result:'WIN',officialSettlement:bad},now),pending);
  assert.match(app,/result:idx.e.originalDecision\?\.learningFeatures&&isDirection\(idx.e.dir\)\?null:_resolvedResult/);
});
