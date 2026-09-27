import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ALLOW_CLOCK_FORCED_CALLS, CALL_POLICY_VERSION, assessCallCommit, callLockDeadline, deadlineSitout, directionalConfidence} from '../src/callPolicy.js';
import {captureOriginalDecision, settlementPatch} from '../src/callIntegrity.js';

const windowId='15m-2026-09-27T22:45:00.000Z';
const close=Date.parse('2026-09-27T23:00:00Z');
const context=secondsLeft=>({windowId,windowType:'15m',asset:'BTC',now:close-secondsLeft*1000,
  quote:{ticker:'KXBTC15M-26SEP271900-00',closeTime:'2026-09-27T23:00:00Z',at:close-secondsLeft*1000,bid:60,ask:62}});
const candidate={call:'UP',direction:'UP',locked:true,atPosterior:68,confidence:68,tier:'patient'};

test('automatic Calls can form before 7:00 but never at or after it, regardless of displayed clock',()=>{
  assert.equal(assessCallCommit(candidate,context(420.001)).action,'allow');
  for(const seconds of [420,419,89,73,30,0,-1]){
    assert.equal(assessCallCommit({...candidate,atSecondsLeft:800},context(seconds)).action,'sitout');
  }
});
test('5-minute Calls keep a separate 30-second cutoff',()=>{
  assert.equal(callLockDeadline('5m'),30);
  const c={...context(31),windowType:'5m',windowId:'5m-2026-09-27T22:55:00.000Z'};
  c.quote={...c.quote,ticker:'KXBTC5M-26SEP271900-00'};
  assert.equal(assessCallCommit(candidate,c).action,'allow');
  assert.equal(assessCallCommit(candidate,{...c,now:close-30000}).action,'sitout');
});
test('failed quality checks and clock fallbacks wait rather than create a Call',()=>{
  for(const tier of ['late-window-forced','no-sitout-commit','time-cap-commit','timer-commit','no-go-edge','no-go-data']){
    assert.equal(assessCallCommit({...candidate,tier},context(680)).action,'wait',tier);
  }
  for(const flag of ['_v10_7_5_forced','isNoGo','wasOverriddenNoTrade','_noSitoutFrom']){
    assert.equal(assessCallCommit({...candidate,[flag]:true},context(680)).action,'wait',flag);
  }
});
test('a recovered qualified signal remains eligible before cutoff',()=>{
  assert.equal(assessCallCommit({...candidate,tier:'no-go-edge'},context(700)).action,'wait');
  assert.equal(assessCallCommit(candidate,context(600)).action,'allow');
});
test('a temporary quality sitout keeps scanning, and timer branches cannot starve normal sample formation',()=>{
  assert.equal(assessCallCommit({...candidate,call:'SIT_OUT',tier:'mid-range-chop-sitout'},context(700)).action,'wait');
  assert.equal(assessCallCommit({...candidate,call:'SIT_OUT',tier:'mid-range-chop-sitout'},context(420)).action,'sitout');
  assert.equal(ALLOW_CLOCK_FORCED_CALLS,false);
  assert.match(app,/if\(ALLOW_CLOCK_FORCED_CALLS&&_hardCapElapsed/);
  assert.match(app,/if\(ALLOW_CLOCK_FORCED_CALLS&&_etaExpired/);
});
test('fresh quote and probability direction must both support an automatic commit',()=>{
  const c=context(600);
  for(const quote of [null,{...c.quote,at:c.now-31000},{...c.quote,ticker:'KXETH15M-OTHER'},{...c.quote,bid:0}]){
    assert.equal(assessCallCommit(candidate,{...c,quote}).action,'wait');
  }
  for(const atPosterior of [null,NaN,50,35,101])assert.equal(assessCallCommit({...candidate,atPosterior},c).action,'wait');
  assert.equal(assessCallCommit({...candidate,call:'DOWN',atPosterior:35},c).action,'allow');
});
test('UP and DOWN confidence use the same directional scale, including zero',()=>{
  assert.equal(directionalConfidence(35,'DOWN'),65);
  assert.equal(directionalConfidence(65,'UP'),65);
  assert.equal(directionalConfidence(0,'DOWN'),100);
  assert.equal(directionalConfidence(100,'UP'),100);
  for(const p of [null,undefined,'',NaN,-1,101])assert.equal(directionalConfidence(p,'DOWN'),null);
});
test('both reported final-90-second failures become explicit sitouts and cannot score as losses',()=>{
  for(const sample of [{call:'UP',atPosterior:56.75,seconds:73},{call:'DOWN',atPosterior:35.13,seconds:89}]){
    const proposed={...candidate,...sample,tier:'late-window-forced',asset:'BTC',windowType:'15m',windowId,strikeAtLock:84179.88};
    const decision=assessCallCommit(proposed,context(sample.seconds));
    const final=deadlineSitout(proposed,decision);
    final.originalDecision=captureOriginalDecision(final,{now:close-sample.seconds*1000});
    assert.equal(final.call,'SIT_OUT');
    assert.equal(final.originalDecision.direction,'SIT_OUT');
    assert.equal(final.callPolicy.proposedDirection,sample.call);
    const settled=settlementPatch(final,{ticker:context(600).quote.ticker,floor_strike:84179.88,close_time:'2026-09-27T23:00:00Z',status:'settled',result:'yes'},close+1000);
    assert.equal(settled.patch.result,'SITOUT');
    assert.equal(proposed.call,sample.call);
  }
});
test('existing captured locks and explicit manual overrides retain their identity',()=>{
  const originalDecision={direction:'UP'};
  assert.equal(assessCallCommit({...candidate,originalDecision},context(20)).action,'keep');
  assert.equal(assessCallCommit({...candidate,isUserForced:true,tier:'user-forced'},context(20)).action,'manual');
});

// Exercise the application's real shared boundary with isolated refs. This catches
// a guard which computes the right answer but fails to clear/preserve live state.
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
test('the actual reversal helper returns directionally correct confidence without reversing a zero input',()=>{
  const body=app.slice(app.indexOf('  const _v10_7_6_reversalCheck='),app.indexOf('  const _v10_7_11_universalOverride='));
  const check=new Function('tapeWindows','directionalConfidence',body+'; return _v10_7_6_reversalCheck;')(null,directionalConfidence);
  assert.equal(check(35,{}).conf,65);
  assert.equal(check(35,{}).dir,'DOWN');
  assert.equal(check(0,{}).conf,100);
  assert.equal(check(0,{}).dir,'DOWN');
  assert.equal(check(65,{}).conf,65);
  assert.equal(check(null,{}).dir,null);
});
function boundaryHarness(secondsLeft) {
  const clock=context(secondsLeft);
  const taraCallSnapshotRef={current:null},lockedCallRef={current:{dir:'UP'}},callCommitHoldRef={current:null};
  const body=app.slice(app.indexOf('  const _prepareCallCommit='),app.indexOf('  const _sealCallSnapshot='));
  const prepare=new Function('assessCallCommit','deadlineSitout','CALL_POLICY_VERSION','computeWindowId','windowType','currentAssetRef','_kalshiQuote','Date','taraCallSnapshotRef','lockedCallRef','callCommitHoldRef',body+'; return _prepareCallCommit;')(
    assessCallCommit,deadlineSitout,CALL_POLICY_VERSION,()=>windowId,'15m',{current:'BTC'},clock.quote,{now:()=>clock.now},taraCallSnapshotRef,lockedCallRef,callCommitHoldRef);
  return {prepare,taraCallSnapshotRef,lockedCallRef,callCommitHoldRef};
}
test('application boundary clears a rejected candidate without sealing or logging it',()=>{
  const h=boundaryHarness(600),snap={...candidate,tier:'time-cap-commit'};
  h.taraCallSnapshotRef.current=snap;
  assert.equal(h.prepare(snap),false);
  assert.equal(h.taraCallSnapshotRef.current,null);
  assert.equal(h.lockedCallRef.current,null);
  assert.equal(snap.originalDecision,undefined);
  assert.match(h.callCommitHoldRef.current.reason,/Waiting/);
  const recovered={...candidate};h.taraCallSnapshotRef.current=recovered;
  assert.equal(h.prepare(recovered),true);
  assert.equal(recovered.callPolicy.action,'allow');
  assert.equal(h.callCommitHoldRef.current,null);
});
test('application boundary mutates the same shared snapshot to sitout at the cutoff',()=>{
  const h=boundaryHarness(420),snap={...candidate};h.taraCallSnapshotRef.current=snap;
  assert.equal(h.prepare(snap),true);
  assert.equal(h.taraCallSnapshotRef.current.call,'SIT_OUT');
  assert.equal(h.lockedCallRef.current,null);
});
test('logger, persistence and main automatic path use the policy before committing',()=>{
  assert.match(app,/const NO_SITOUT_MODE=false/);
  const logger=app.slice(app.indexOf('    function _logSnapshotEntry('),app.indexOf('    function _logSnapshotEntry(')+300);
  assert.match(logger,/_prepareCallCommit\(snapshot\)/);
  assert.match(app,/if\(!_prepareCallCommit\(snapshot\)\)return false/);
  assert.match(app,/if\(_sealCallSnapshot\(taraCallSnapshotRef.current\)===false\)return/);
  assert.match(app,/const _pastLockDeadline=clockSeconds<=callLockDeadline\(windowType\)/);
  const lifecycle=app.slice(app.indexOf('    const isCall=tc.call===\'UP\'||tc.call===\'DOWN\';'));
  assert.ok(lifecycle.indexOf('if(!_cloudRestoreCompletedRef.current')<lifecycle.indexOf('const _decisionSecondsLeft='));
  assert.match(app,/conf:Math.round\(directionalConfidence\(_p,_proposedDir\)\)/);
});
test('waiting persistence cannot publish a null snapshot over another device lock',()=>{
  const body=app.slice(app.indexOf('  const _persistLock=()=>'),app.indexOf('  const _clearLock='));
  const h=boundaryHarness(600),snap={...candidate,tier:'time-cap-commit'};
  h.taraCallSnapshotRef.current=snap;h.prepare(snap);
  let sealCalls=0;
  const persist=new Function('taraCallSnapshotRef','callCommitHoldRef','computeWindowId','windowType','_sealCallSnapshot',body+'; return _persistLock;')(
    h.taraCallSnapshotRef,h.callCommitHoldRef,()=>windowId,'15m',()=>{sealCalls++;throw new Error('must not reach persistence');});
  persist();
  assert.equal(sealCalls,0);
});
