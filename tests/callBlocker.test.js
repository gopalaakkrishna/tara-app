import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describeCallBlocker} from '../src/callBlocker.js';
import {captureOriginalDecision,isDirection,normalizeCallLedger} from '../src/callIntegrity.js';
import {callLockDeadline,deadlineSitout} from '../src/callPolicy.js';

const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const windowId='15m-2026-10-12T18:30:00.000Z',close=Date.parse('2026-10-12T18:45:00Z'),now=close-600000;
const quote={ticker:'KXBTC15M-26OCT121445-45',closeTime:'2026-10-12T18:45:00Z',at:now,bid:40,ask:42};
const baseline={windowId,asset:'BTC',now,quote,call:{call:'DOWN',reason:'TRAJ priority DOWN',confidence:58},
  readiness:{ready:true,code:'ready',samples:150,spanMs:170000},samples:{dir:'UP',count:405.9}};
const hold={windowId,asset:'BTC',at:now,direction:'DOWN',code:'timing-confidence',
  reason:'Patient: letting tape/momentum decide (58% conviction)',details:{confidence:58,requiredConfidence:65,phase:'mid',secondsLeft:600,cutoff:420}};

test('hundreds of samples cannot hide the actual timing confidence hold',()=>{
  const blocked=describeCallBlocker({...baseline,hold});
  assert.equal(blocked.code,'timing-confidence');assert.equal(blocked.reason,hold.reason);
  assert.equal(blocked.gate.confidence,58);assert.equal(blocked.gate.requiredConfidence,65);
  assert.equal(blocked.samples,405.9);assert.equal(blocked.dataReady,true);assert.equal(blocked.quoteIssue,null);
});

test('wrong-window/asset, stale or future holds cannot explain this window',()=>{
  for(const patch of [{windowId:'15m-2026-10-12T18:15:00.000Z'},{asset:'ETH'},{at:now-10000},{at:now+1}]){
    const blocked=describeCallBlocker({...baseline,hold:{...hold,...patch}});
    assert.equal(blocked.code,'forming');assert.equal(blocked.gate,null);assert.equal(blocked.lastGate,null);
  }
});

test('a direction change labels the previous evaluated gate rather than attributing it to the new candidate',()=>{
  const blocked=describeCallBlocker({...baseline,call:{call:'UP'},hold});
  assert.equal(blocked.code,'direction-changed');assert.match(blocked.reason,/Direction changed to UP after DOWN was blocked/);
  assert.equal(blocked.gate,null);assert.equal(blocked.lastGate.direction,'DOWN');
  assert.equal(blocked.lastGate.appliesToCurrentDirection,false);
});

test('window-wide adverse cooldown holds still apply after a candidate flip',()=>{
  const blocked=describeCallBlocker({...baseline,call:{call:'UP'},hold:{...hold,scope:'window',
    code:'adverse-kalshi-cooldown',reason:'3 aborts; 120s cooldown remaining',details:{abortCount:3,remainingMs:120000}}});
  assert.equal(blocked.code,'adverse-kalshi-cooldown');assert.equal(blocked.gate.remainingMs,120000);
});

test('missing readiness remains the primary blocker even if an old timing hold exists',()=>{
  const blocked=describeCallBlocker({...baseline,hold,readiness:{ready:false,code:'startup-history',reason:'Loading current candles'}});
  assert.equal(blocked.code,'startup-history');assert.equal(blocked.reason,'Loading current candles');assert.equal(blocked.gate,null);
});

test('diagnostic and commit holds use the latest valid evaluated branch without mutating either ref',()=>{
  const older={...hold,at:now-1000},newer={...hold,code:'commit-check',reason:'Model does not support proposed direction'};
  assert.equal(describeCallBlocker({...baseline,gateHold:older,hold:newer}).code,'commit-check');
  assert.equal(describeCallBlocker({...baseline,gateHold:newer,hold:older}).reason,newer.reason);
  assert.equal(describeCallBlocker({...baseline,gateHold:{...newer,asset:'ETH'},hold:older}).reason,older.reason);
  assert.equal(older.at,now-1000);assert.equal(newer.reason,'Model does not support proposed direction');
});

function liveHarness({confidence=58,direction='DOWN',secondsLeft=600,price=78,maxPrice=100}={}) {
  const clock=close-secondsLeft*1000,tc={call:direction,confidence},current={current:null},holds={current:null},delay={current:null};
  const samples={current:{dir:'UP',count:405.9}},liveQuote={...quote,at:clock};
  const noteBody=app.slice(app.indexOf('    const _noteGateHold='),app.indexOf('    // Read the shared window first',app.indexOf('    const _noteGateHold=')));
  const commitHold={current:null};
  const note=new Function('computeWindowId','windowType','currentAssetRef','Date','callGateHoldRef','isDirection','tc',
    'currentCallBlockerRef','describeCallBlocker','startupReadiness','taraCallSampleRef','_kalshiQuote','callCommitHoldRef',noteBody+';return _noteGateHold;')(
      ()=>windowId,'15m',{current:'BTC'},{now:()=>clock},holds,isDirection,tc,current,describeCallBlocker,
      baseline.readiness,samples,liveQuote,commitHold);
  const timingBody=app.slice(app.indexOf('      const _winLenSec112='),app.indexOf("      // If we got here with a delay state,"));
  const timing=new Function('windowType','_secsLeft','_convNow','_kForDir','getEntryMaxCost','_hasTimeToWait',
    'tc','_v112Live','_v1364_oppRef','computeWindowId','_v104_1_delayStateRef','currentAssetRef','currentAsset',
    '_lifecycleRecordSnapshot','Date','_noteGateHold','callLockDeadline','callCommitHoldRef','currentCallBlockerRef',
    'describeCallBlocker','startupReadiness','taraCallSampleRef','_kalshiQuote','_dirNow','callGateHoldRef',timingBody+';return "progress";');
  const run=()=>timing('15m',secondsLeft,confidence,price,()=>maxPrice,secondsLeft>180,tc,{},
    {current:null},()=>windowId,delay,{current:'BTC'},'BTC',()=>{},{now:()=>clock},note,callLockDeadline,
    commitHold,current,describeCallBlocker,baseline.readiness,samples,liveQuote,direction,holds);
  return {run,note,tc,holds,commitHold,current,clock};
}

test('real timing controller stamps the held confidence and unchanged threshold before returning',()=>{
  for(const confidence of [49,58,64.99]){
    const h=liveHarness({confidence});assert.equal(h.run(),undefined);
    assert.equal(h.current.current.code,'timing-confidence');assert.equal(h.current.current.gate.confidence,confidence);
    assert.equal(h.current.current.gate.requiredConfidence,65);assert.equal(h.current.current.gate.maxDirectionalPrice,100);
    assert.match(h.current.current.reason,/Patient:/);assert.equal(h.tc.confidence,confidence);assert.equal(h.tc.call,'DOWN');
    assert.equal(h.commitHold.current,null,'diagnostic waits do not alter the commit/persistence control ref');
  }
  const allowed=liveHarness({confidence:65});assert.equal(allowed.run(),'progress');assert.equal(allowed.holds.current,null);
});

test('price hold reports the effective ceiling instead of inventing a default entry setting',()=>{
  const h=liveHarness({confidence:70,price:78,maxPrice:70});h.run();
  assert.equal(h.current.current.code,'timing-price');assert.equal(h.current.current.gate.directionalPrice,78);
  assert.equal(h.current.current.gate.maxDirectionalPrice,70);assert.equal(h.current.current.gate.oddsOk,false);
  assert.equal(liveHarness({confidence:70,price:78,maxPrice:100}).run(),'progress');
});

test('a released timing hold is cleared and cannot mask a subsequent gate',()=>{
  const h=liveHarness({confidence:70});h.note('timing-confidence','Old 58% wait',{confidence:58});
  assert.equal(h.run(),'progress');assert.equal(h.holds.current,null);assert.equal(h.current.current.code,'forming');
});

test('exact actual hold survives deadline, original capture, slim restore and settlement without altering direction',()=>{
  const h=liveHarness();h.run();
  const snapshot=deadlineSitout({blockedDecision:h.current.current},{reason:'No qualifying Call before the 7-minute cutoff.',secondsLeft:419.5,cutoff:420});
  const entry={...snapshot,id:h.clock,windowId,windowType:'15m',asset:'BTC',result:null};
  entry.originalDecision=captureOriginalDecision(entry,{now:h.clock});
  const restored=normalizeCallLedger([{id:h.clock,windowId,windowType:'15m',asset:'BTC',dir:'SIT_OUT',result:'SITOUT'}],[entry])[0];
  assert.equal(restored.originalDecision,entry.originalDecision);assert.equal(restored.dir,'SIT_OUT');assert.equal(restored.result,'SITOUT');
  assert.equal(restored.blockedDecision.code,'timing-confidence');assert.equal(restored.blockedDecision.gate.requiredConfidence,65);
  assert.match(restored.reason,/Patient:/);assert.equal(restored.originalDecision.blockedDecision.gate.confidence,58);
});

test('actual lifecycle deadline logs the latest evaluated hold rather than a generic forming reason',()=>{
  const h=liveHarness({secondsLeft:421});h.run();
  const snapshots={current:null},lock={current:{dir:'UP'}},logs=[];
  const body=app.slice(app.indexOf('    const _decisionSecondsLeft='),app.indexOf('    if(!startupReadiness.ready&&',app.indexOf('    const _decisionSecondsLeft=')));
  const expire=new Function('computeWindowId','windowType','Date','callLockDeadline','hardForceRef','taraCallSnapshotRef','deadlineSitout',
    'analysis','currentCallBlockerRef','lockedCallRef','_logSnapshotEntry','_persistLock',body);
  expire(()=>windowId,'15m',{now:()=>close-419500,parse:Date.parse},callLockDeadline,{current:0},snapshots,deadlineSitout,
    {rawProbAbove:71},h.current,lock,snapshot=>logs.push(snapshot),()=>{});
  assert.equal(logs.length,1);assert.equal(logs[0].call,'SIT_OUT');assert.equal(lock.current,null);
  assert.match(logs[0].reason,/Patient:/);assert.equal(logs[0].blockedDecision.gate.confidence,58);
  assert.equal(logs[0].blockedDecision.gate.requiredConfidence,65);
  assert.equal(logs[0].atSecondsLeft,419.5);assert.equal(h.commitHold.current,null);
});

test('actual lifecycle cooldown branch records duration/count without changing cooldown/abort behavior',()=>{
  const h=liveHarness(),abort={current:{windowId,count:3,lastAbortAt:h.clock-1000}};
  const body=app.slice(app.indexOf('      const _curWid=computeWindowId(windowType);',app.indexOf('// V10.4.1 MODULE A')),
    app.indexOf('      // Kalshi price FROM TARA',app.indexOf('// V10.4.1 MODULE A')));
  const run=new Function('computeWindowId','windowType','Date','analysis','_v104_1_abortCountRef','_noteGateHold',body+';return "progress";');
  assert.equal(run(()=>windowId,'15m',{now:()=>h.clock},{regime:'RANGE-CHOP'},abort,h.note),undefined);
  assert.equal(abort.current.count,3);assert.equal(h.current.current.gate.cooldownMs,300000);
  assert.equal(h.current.current.gate.remainingMs,299000);assert.equal(h.current.current.code,'adverse-kalshi-cooldown');
  assert.equal(run(()=>windowId,'15m',{now:()=>h.clock+300001},{regime:'RANGE-CHOP'},abort,h.note),'progress');
  assert.equal(abort.current.count,0);
});
