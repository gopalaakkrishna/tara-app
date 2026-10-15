import test from 'node:test';
import assert from 'node:assert/strict';
import {app,compile,makeHarness,runCallLifecycle,produceCallCandidate} from './helpers/callDecisionHarness.js';
import * as shared from '../src/sharedDecision.js';

const clockStart=app.indexOf('const u=()=>{const now=new Date();');
const clockBody=app.slice(clockStart,app.indexOf('u();const t=setInterval',clockStart));
assert.ok(clockBody.length>0,'actual production window clock found');
const tick=compile(clockBody,'u();');
const rolloverStart=app.indexOf('  // Window rollover');
const rolloverEnd=app.indexOf('  // V10.7.60: removed targetMargin',rolloverStart);
const rolloverBody=app.slice(app.indexOf('useEffect(()=>{',rolloverStart)+'useEffect(()=>{'.length,
  app.lastIndexOf('},[timeState.nextWindowMs',rolloverEnd));
const rollover=compile(rolloverBody);
const restore=compile(app.slice(app.indexOf('  const _applySharedDecision='),
  app.indexOf('  // V7.10.5: regimeMemory now persists')),'return _applySharedDecision;');
const start=Date.parse('2026-10-14T22:00:00Z'),close=start+900000;

function harness(at=close-300) {
  const h=makeHarness({samples:0}),s=h.scope;let now=at;
  s.Date=class extends Date {constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}};
  for(const name of rollover.dependencies)if(!(name in s)){
    if(name.endsWith('Ref'))s[name]={current:null};else s[name]=()=>{};
  }
  Object.assign(s,shared,{timeFormat:'UTC',setTimeState:value=>{s.timeState=value;},
    computeWindowId:type=>shared.sharedWindowId(type,now),currentPrice:null,
    currentPriceRef:{current:null},lastWindowRef:{current:'22:15'},_lastWindowMsRef:{current:close},
    _postLockTrajRef:{current:{}},mtfLocksRef:{current:{}},_lossCooldownRef:{current:{windowsRemaining:0}},
    windowWhaleStatsRef:{current:{}},_mountTimeRef:{current:now-180000},
    setForceRender(){},_clearLock(){},setAutoOrderState(){},
    _sharedRestoreGenerationRef:{current:0},_cloudLockMirrorRef:{current:null},
    readDecisionCache:shared.readDecisionCache,sessionStorage:s.localStorage,
    taraCallLogRef:{current:h.logs},_recomputeLearningsFromLog(){}});
  const original={locked:true,call:'SIT_OUT',dir:'SIT_OUT',windowId:shared.sharedWindowId('15m',start),
    windowType:'15m',asset:'BTC',_committedAt:start+480000,lockedAt:start+480000,reason:'Exact captured blocker'};
  delete original.originalDecision;
  s.taraCallSnapshotRef.current=original;
  return {...h,s,original,setTime:t=>{now=t;},tick:()=>tick(s),roll:()=>rollover(s),restore:()=>restore(s)(null,'local')};
}

test('actual clock does not roll early and uses the same epoch window at the exact boundary',()=>{
  const h=harness();h.tick();assert.equal(h.s.timeState.nextWindowMs,close);
  h.setTime(close);h.tick();assert.equal(h.s.timeState.nextWindowMs,close+900000);
  assert.equal(h.s.timeState.minsRemaining,15);assert.equal(h.s.timeState.secsRemaining,0);
});

test('actual restoration retires an old Call and engine instead of treating it as decided',()=>{
  const h=harness(close+1000);
  h.s.lockedCallRef.current={dir:'DOWN',windowId:h.original.windowId,lockedAt:start+10000};
  h.s.engineLockedDirRef.current='DOWN';h.restore();
  assert.equal(h.s.taraCallSnapshotRef.current,null);assert.equal(h.s.lockedCallRef.current,null);
  assert.equal(h.s.engineLockedDirRef.current,null);
});

test('actual rollover clears old Call without spot/strike and finalizes only the exact closed sit-out',()=>{
  const h=harness(close+1000);h.s.targetMargin=0;h.s.windowOpenPriceRef.current=0;
  h.s.kalshiStrikeRef.current=null;
  const row={id:42,asset:'BTC',windowType:'15m',windowId:h.original.windowId,dir:'SIT_OUT',result:null,
    originalDecision:{reason:'Exact captured blocker',lockedAt:start+480000}};
  h.logs.push(row,{id:43,asset:'BTC',windowType:'15m',windowId:shared.sharedWindowId('15m',start-900000),dir:'DOWN',result:null});
  h.tick();h.roll();
  assert.equal(h.s.taraCallSnapshotRef.current,null);
  assert.equal(h.logs.find(r=>r.id===42).result,'SITOUT');
  assert.equal(h.logs.find(r=>r.id===43).result,null);
  assert.deepEqual(h.logs.find(r=>r.id===42).originalDecision,row.originalDecision);
});

test('actual rollover never settles an unrelated directional row as a sit-out when capture is missing',()=>{
  const h=harness(close+1000);h.s.taraCallSnapshotRef.current=null;
  h.logs.push({id:51,asset:'BTC',windowType:'15m',windowId:shared.sharedWindowId('15m',start-900000),dir:'UP',result:null});
  h.tick();h.roll();assert.equal(h.logs[0].result,null);assert.equal(h.logs.length,1);
});

test('two subsequent windows can commit and log after actual rollover and empty shared restoration, with no duplicate or stale blocker',()=>{
  const h=harness(close+1000),s=h.s;
  for(const nextStart of [close,close+900000]){
    h.setTime(nextStart+1000);h.tick();h.roll();h.restore();
    assert.equal(s.taraCallSnapshotRef.current,null);
    // Successful scoped cloud restore, then genuine fresh in-window evidence.
    s._cloudRestoreCompletedRef.current=true;s._cloudRestoreErrorRef.current=null;
    const at=nextStart+200000;h.setTime(at);h.tick();
    Object.assign(s,{currentPrice:83400,kalshiStrike:83200,kalshiYesPrice:74});
    s.currentPriceRef.current=83400;s.targetMarginRef.current=83200;s.kalshiStrikeRef.current=83200;
    s.lastPriceSourceRef.current={time:at};s.lastKalshiSuccessRef.current=at;s.windowOpenTimeRef.current=nextStart;
    const wid=shared.sharedWindowId('15m',at);
    s._kalshiQuote={ticker:'KXBTC15M-26OCT141830-00',closeTime:new Date(nextStart+900000).toISOString(),bid:73,ask:75,at};
    s.taraCallSampleRef.current={schema:2,key:`BTC|${wid}|coinbase|UP`,dir:'UP',count:200,firstAt:nextStart+60000,
      lastAt:at-1000,lastSpotAt:at-1000,lastQuoteAt:at-1000,observations:134};
    s.taraCall=produceCallCandidate(s);runCallLifecycle(s);
    assert.equal(s.taraCallSnapshotRef.current?.call,'UP');
    const rows=h.logs.filter(r=>r.windowId===wid);assert.equal(rows.length,1);
    assert.ok(rows[0].originalDecision.lockedAt<nextStart+480000,'original lock strictly before 7m cutoff');
    const original=structuredClone(rows[0].originalDecision);
    runCallLifecycle(s);assert.equal(h.logs.filter(r=>r.windowId===wid).length,1);
    assert.deepEqual(rows[0].originalDecision,original);
  }
});

test('format-only changes cannot reset a current capture, and skipped windows do not invent log entries',()=>{
  const h=harness(close-1000);h.tick();h.s.timeFormat='est';h.tick();h.roll();
  assert.equal(h.s.taraCallSnapshotRef.current,h.original);
  h.setTime(close+3*900000+1000);h.tick();h.roll();h.restore();
  assert.equal(h.s.taraCallSnapshotRef.current,null);assert.equal(h.logs.length,0);
});
