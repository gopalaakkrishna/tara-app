import test from 'node:test';
import assert from 'node:assert/strict';
import {makeHarness,app,compile} from './helpers/callDecisionHarness.js';
import {CALL_CAPTURE_JOURNAL,journalCapturedCall,recoverCapturedCalls,acknowledgeCapturedCalls} from '../src/callCaptureJournal.js';
import {persistCallCaches} from '../src/callStorage.js';

test('actual commit journals original Call before delayed persistence and reload restores precisely one canonical row',()=>{
  for(const directional of [true,false]){
    const h=makeHarness(directional?{}:{secondsLeft:420,confidence:50});h.run();
    const snapshot=h.scope.taraCallSnapshotRef.current;
    const storage=h.scope.localStorage,now=snapshot._committedAt+1000;
    assert.equal(JSON.parse(storage.getItem(CALL_CAPTURE_JOURNAL)).length,1);
    const recovered=recoverCapturedCalls([],storage,now);
    assert.equal(recovered.length,1);assert.equal(recovered[0].dir,snapshot.call);
    assert.deepEqual(recovered[0].originalDecision,snapshot.originalDecision);
    assert.deepEqual(recovered[0].blockedDecision,snapshot.blockedDecision);
    assert.equal(recoverCapturedCalls(recovered,storage,now).length,1);
    const closed=recoverCapturedCalls([],storage,h.close+1000);
    assert.equal(closed[0].result,directional?null:'SITOUT');
    assert.deepEqual(closed[0].originalDecision,snapshot.originalDecision);
    acknowledgeCapturedCalls(storage,closed);assert.equal(JSON.parse(storage.getItem(CALL_CAPTURE_JOURNAL)).length,0);
  }
});

test('journal tolerates broken storage, rejects uncaptured or conflicting identity, and does not overwrite a saved result',()=>{
  const h=makeHarness();h.run();const snap=h.scope.taraCallSnapshotRef.current,storage=h.scope.localStorage;
  const row={...h.logs[0],result:'WIN',officialSettlement:{ticker:snap.marketTicker}};
  assert.deepEqual(recoverCapturedCalls([row],storage,h.close+60000),[row]);
  storage.setItem(CALL_CAPTURE_JOURNAL,JSON.stringify([{...snap,asset:'ETH'}]));
  assert.equal(recoverCapturedCalls([],storage,h.close).length,0);
  assert.equal(journalCapturedCall(storage,{locked:true}),false);
  assert.equal(journalCapturedCall({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}},snap),false);
});

test('actual fast-cache writer persists the first record on a new device, not only logs of at least fifty rows',()=>{
  const from=app.indexOf('    const _cacheStatus=persistCallCaches(');
  const to=app.indexOf('    // Also persist to sessionStorage',from);
  const persist=compile(app.slice(from,to));
  const h=makeHarness();h.run();
  persist({_mergedForStorage:h.logs,_minifyEntry:e=>e,localStorage:h.scope.localStorage,acknowledgeCapturedCalls,persistCallCaches,
    archived:{ok:true,value:h.logs},_persistCancelled:false,setCallStorageStatus(){},Date});
  assert.equal(JSON.parse(h.scope.localStorage.getItem('taraCallLog_v1')).length,1);
  assert.equal(JSON.parse(h.scope.localStorage.getItem(CALL_CAPTURE_JOURNAL)).length,0);
});
