import test from 'node:test';
import assert from 'node:assert/strict';
import {makeHarness} from './helpers/callDecisionHarness.js';
import {postProcessLegacyCall,readCallCostBand} from '../src/callCandidateRules.js';
import {normalizeCallLedger,settlementPatch} from '../src/callIntegrity.js';
import {app} from './helpers/callDecisionHarness.js';

test('legacy DOWN probability is mirrored correctly, including zero, without promoting failed quality by default',()=>{
  const call={call:'SIT_OUT',reason:'FGT mixed',confidence:0};
  for(const p of [0,1,20.055,35]){
    const analysis={rawProbAbove:p,windowAmplitude:{rangeBps:10}};
    assert.equal(postProcessLegacyCall(call,analysis),call);
    const down=postProcessLegacyCall(call,analysis,{allowQualityOverride:true});
    const up=postProcessLegacyCall(call,{...analysis,rawProbAbove:100-p},{allowQualityOverride:true});
    assert.equal(down.call,'DOWN');assert.equal(down.confidence,100-p);assert.equal(up.confidence,down.confidence);
  }
  for(const p of [null,undefined,NaN,-1,101,50])assert.equal(postProcessLegacyCall(call,{rawProbAbove:p},{allowQualityOverride:true}),call);
});

test('complete actual UP lifecycle passes timing, disabled legacy price/edge gates, seal, and canonical record at 74c',()=>{
  const h=makeHarness();const snapshot=h.run();
  assert.deepEqual(h.errors,[]);assert.ok(snapshot);assert.equal(snapshot.call,'UP');
  assert.equal(h.logs.length,1);assert.equal(h.logs[0].dir,'UP');assert.equal(h.cloud.length,1);
  assert.equal(snapshot.callPolicy.action,'allow');assert.equal(snapshot.originalDecision.direction,'UP');
  assert.equal(snapshot.originalDecision.marketTicker,h.scope._kalshiQuote.ticker);
  assert.deepEqual(h.logs[0].originalDecision,snapshot.originalDecision);
  const original=structuredClone(snapshot.originalDecision);
  h.scope.analysis.rawProbAbove=1;h.advance(73);h.run();
  assert.equal(h.logs.length,1);assert.deepEqual(snapshot.originalDecision,original);
});

test('complete actual DOWN lifecycle records DOWN, not P(UP), with matching original and persisted direction',()=>{
  const h=makeHarness({probabilityUp:20.055,yesPrice:42,mtf:-2,tapeBuy:10,quality:80,regime:'TRENDING DOWN'});
  const snapshot=h.run();assert.deepEqual(h.errors,[]);assert.ok(snapshot);assert.equal(snapshot.call,'DOWN');
  assert.ok(snapshot.confidence>=65);assert.equal(h.logs.length,1);assert.equal(h.logs[0].dir,'DOWN');
  assert.equal(snapshot.originalDecision.direction,'DOWN');assert.equal(h.cloud[0].call,'DOWN');
});

test('unchanged early and mid65 timing threshold holds64.99, permits65 after qualifying samples',()=>{
  for(const secondsLeft of [850,631,420.001]){
    const h=makeHarness({secondsLeft,confidence:64.99});assert.equal(h.run(),null);
    assert.equal(h.scope.currentCallBlockerRef.current.code,'timing-confidence');
    assert.equal(h.scope.currentCallBlockerRef.current.gate.requiredConfidence,65);
    assert.equal(h.logs.length,0);assert.equal(h.cloud.length,0);
    const pass=makeHarness({secondsLeft,confidence:65});assert.equal(pass.run()?.call,'UP');
    assert.deepEqual(pass.errors,[]);
  }
});

test('actual15m deadline precedes inherited late/final logic and retains exact latest reason',()=>{
  for(const left of [420,419,180,75,0]){
    const h=makeHarness({secondsLeft:421,confidence:58});h.run();h.advance(left);
    const snapshot=h.run();assert.equal(snapshot.call,'SIT_OUT');assert.equal(snapshot.tier,'decision-deadline');
    assert.equal(h.logs.length,1);assert.deepEqual(h.errors,[]);
    if(left>=419){assert.equal(snapshot.blockedDecision.code,'timing-confidence');
      assert.equal(snapshot.blockedDecision.gate.confidence,58);assert.equal(snapshot.blockedDecision.gate.requiredConfidence,65);
      assert.match(snapshot.reason,/58% conviction/);
    }else assert.notEqual(snapshot.blockedDecision.code,'timing-confidence','do not fabricate an expired hold after an observation gap');
    assert.equal(snapshot.originalDecision.direction,'SIT_OUT');
  }
});

test('warmup and rejected quality remain genuine waits even with a strong posterior',()=>{
  for(const options of [{ready:false},{quality:10,probabilityUp:65},{probabilityUp:50},{mtf:0,tapeBuy:10,quality:40,probabilityUp:65}]){
    const h=makeHarness(options);assert.equal(h.run(),null);
    assert.equal(h.scope.taraCall.call,'SIT_OUT');assert.equal(h.logs.length,0);assert.equal(h.cloud.length,0);
    assert.equal(h.scope.taraCall._v10_6_8_forced,undefined);
  }
  const h=makeHarness({quality:10,probabilityUp:65});h.run();const reason=h.scope.taraCall.reason;
  h.advance(420);const snapshot=h.run();assert.equal(snapshot.call,'SIT_OUT');
  assert.ok(snapshot.reason.includes(reason));assert.equal(h.logs.length,1);assert.deepEqual(h.errors,[]);
});

test('missing, stale, future, crossed and wrong-window/asset quotes cannot create or persist a Call',()=>{
  const good=makeHarness();
  for(const quotePatch of [{ticker:null},{at:good.clock-31000},{at:good.clock+3000},
    {bid:80,ask:70},{ask:100},{ticker:'KXETH15M-26OCT131700-00'},
    {closeTime:'2026-10-13T21:15:00Z'}]){
    const h=makeHarness({quotePatch});assert.equal(h.run(),null);assert.equal(h.logs.length,0);assert.equal(h.cloud.length,0);
    assert.match(h.scope.callCommitHoldRef.current?.reason||h.scope.currentCallBlockerRef.current?.reason||'',/quote|market|book|window/);
  }
});

test('legacy price and final edge guards cannot veto a qualified candidate when Call entry filters are off',()=>{
  for(const cost of [44,74,77]){
    const h=makeHarness({yesPrice:cost});assert.equal(h.run()?.call,'UP',`cost${cost}`);
    assert.equal(h.logs.length,1);assert.deepEqual(h.errors,[]);
  }
  for(const cost of [14,90,98]){
    const h=makeHarness({yesPrice:cost,probabilityUp:95,mtf:2,quality:80});assert.equal(h.run(),null);
    assert.match(h.scope.taraCall.reason,/cost band 44-77c/);assert.equal(h.logs.length,0);
  }
  const filtered=makeHarness({noEntryGates:false,yesPrice:74});assert.equal(filtered.run(),null);
  assert.match(filtered.scope.currentCallBlockerRef.current.reason,/entry band/);
  assert.equal(filtered.scope.getEntryMaxCost(),70);
  // Existing numeric price/edge thresholds remain available when filters are enabled.
  assert.match(app,/const KALSHI_ENTRY_THRESH=Math\.min\(85,Math\.max\(_entryFloor,Math\.round\(_convictionNow-_entryBuffer\)\)\)/);
  assert.match(app,/const _thresh=_isThinBook\?-3:-7/);
  assert.match(app,/if\(_edgeAtCommit<=-7\)/);
});

test('a retained claim cannot seal or log the opposite candidate confidence',()=>{
  const h=makeHarness({probabilityUp:20.055,yesPrice:42,mtf:-2,tapeBuy:10,quality:80,regime:'TRENDING DOWN',claimedDirection:'UP',samples:999,secondsLeft:421});
  assert.equal(h.run(),null);assert.equal(h.scope.currentCallBlockerRef.current.code,'direction-stability');
  assert.equal(h.scope.taraCallSampleRef.current.dir,'UP');assert.equal(h.scope.taraCallSampleRef.current.count,999);
  assert.equal(h.logs.length,0);assert.equal(h.cloud.length,0);
  h.advance(420);assert.equal(h.run().call,'SIT_OUT');assert.match(h.logs[0].reason,/current candidate is DOWN/);
});

test('flat-gap waiting reports the actual unchanged signal threshold rather than generic formation',()=>{
  const h=makeHarness({gapScore:2});assert.equal(h.run(),null);
  assert.equal(h.scope.currentCallBlockerRef.current.code,'flat-gap-signal');
  assert.equal(h.scope.currentCallBlockerRef.current.gate.gapScore,2);
  assert.equal(h.scope.currentCallBlockerRef.current.gate.requiredGap,8);assert.equal(h.logs.length,0);
});

test('existing sample formation, Tier1 preference and adverse cooldowns remain enforced',()=>{
  const sample=makeHarness({samples:0,claimedDirection:null});assert.equal(sample.run(),null);
  assert.ok(sample.scope.taraCallSampleRef.current.count>0);assert.equal(sample.logs.length,0);
  for(let i=0;i<150 && !sample.scope.taraCallSnapshotRef.current;i++)sample.run();
  assert.equal(sample.scope.taraCallSnapshotRef.current?.call,'UP');assert.equal(sample.logs.length,1);
  const tier=makeHarness({tier1Only:true,quality:70,mtf:2.5,tapeBuy:50});tier.scope.analysis.windowAmplitude.label='NORMAL';assert.equal(tier.run(),null);
  assert.match(tier.scope.callCommitHoldRef.current.reason,/Tier-1 only/);
  const abort=makeHarness();abort.scope._v104_1_abortCountRef.current={windowId:abort.windowId,count:3,lastAbortAt:abort.clock-1000};
  assert.equal(abort.run(),null);assert.equal(abort.scope.currentCallBlockerRef.current.code,'adverse-kalshi-cooldown');
  assert.equal(abort.scope.currentCallBlockerRef.current.gate.maxAborts,3);assert.equal(abort.logs.length,0);
});

test('actual recorded DOWN survives dedup/restore and settles only against its captured ticker',()=>{
  const h=makeHarness({probabilityUp:20.055,yesPrice:42,mtf:-2,tapeBuy:10,quality:80,regime:'TRENDING DOWN'});
  h.run();const row=h.logs[0],original=structuredClone(row.originalDecision);
  const restored=normalizeCallLedger([{...row,originalDecision:undefined}],[row]);
  assert.equal(restored.length,1);assert.deepEqual(restored[0].originalDecision,original);
  const market={ticker:original.marketTicker,close_time:original.marketCloseTime,floor_strike:original.strike,status:'settled',result:'no'};
  assert.equal(settlementPatch(row,{...market,ticker:market.ticker+'-WRONG'},h.close+1000).ok,false);
  const settled=settlementPatch(row,market,h.close+1000);assert.equal(settled.ok,true);assert.equal(settled.patch.result,'WIN');
  assert.deepEqual(row.originalDecision,original);
});

test('startup recovery and5m cutoff retain their separate timing policy',()=>{
  const warm=makeHarness({ready:false});warm.run();warm.scope.startupReadiness.ready=true;
  assert.equal(warm.run()?.call,'UP');assert.equal(warm.logs.length,1);
  const five=makeHarness({windowType:'5m',secondsLeft:31,confidence:62,quality:95,mtf:4,tapeBuy:90});assert.equal(five.run()?.call,'UP');
  const cutoff=makeHarness({windowType:'5m',secondsLeft:30});assert.equal(cutoff.run().call,'SIT_OUT');
  assert.equal(cutoff.logs[0].callPolicy.cutoff,30);
});

test('the separate intentional Call cost band and timing ceiling share unchanged44-77 defaults and overrides',()=>{
  const store=values=>({getItem:key=>values[key]??null});
  assert.deepEqual(readCallCostBand(store({})),{enabled:true,minCost:44,maxCost:77});
  assert.deepEqual(readCallCostBand(store({taraCostBandMin:'50',taraCostBandMax:'75'})),{enabled:true,minCost:50,maxCost:75});
  assert.deepEqual(readCallCostBand(store({taraCostBandGate:'off'})),{enabled:false,minCost:0,maxCost:100});
  assert.deepEqual(readCallCostBand({getItem(){throw new Error('blocked storage');}}),{enabled:true,minCost:44,maxCost:77});
  const h=makeHarness({confidence:58});h.run();assert.equal(h.scope.currentCallBlockerRef.current.gate.maxDirectionalPrice,77);
  const manual=makeHarness({yesPrice:74});manual.storage.set('taraCostBandMax','73');assert.equal(manual.run(),null);
  assert.match(manual.scope.taraCall.reason,/44-73c/);
});
