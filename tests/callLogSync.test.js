import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {callLogSyncSignature,callLogSyncStatus} from '../src/callLogSync.js';
import {CALL_EVIDENCE_FIELDS,callKey,normalizeCallLedger} from '../src/callIntegrity.js';

const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const path='memory/taraCallLog';
const base={id:1000,asset:'BTC',windowType:'15m',windowId:'15m-2026-10-12T18:30:00.000Z',dir:'SIT_OUT',result:null,
  originalDecision:{direction:'SIT_OUT',capturedAt:1000}};

test('same-id SITOUT, NO_TRADE, W/L corrections and blocker-only changes invalidate the sync gate',()=>{
  const signature=callLogSyncSignature([base]);
  for(const patch of [{result:'SITOUT'},{result:'NO_TRADE'},{result:'WIN'},
    {blockedDecision:{code:'timing-confidence',reason:'58% is below 65%',gate:{confidence:58,requiredConfidence:65}}},
    {recordRevisions:[{at:2000,source:'lifecycle-update'}]}, {resolution:'immediate-no-kalshi-needed'}]) {
    assert.notEqual(callLogSyncSignature([{...base,...patch}]),signature);
  }
  assert.notEqual(callLogSyncSignature([{...base,result:'WIN'}]),callLogSyncSignature([{...base,result:'LOSS'}]));
});

test('equivalent row/key order does not produce a new signature; stripped-only details do not sync',()=>{
  const other={...base,id:2000,windowId:'15m-2026-10-12T18:15:00.000Z'};
  assert.equal(callLogSyncSignature([base,other]),callLogSyncSignature([other,{result:null,dir:'SIT_OUT',windowId:base.windowId,
    windowType:'15m',asset:'BTC',id:1000,originalDecision:{capturedAt:1000,direction:'SIT_OUT'}}]));
  const project=({reasoning,...rest})=>rest;
  assert.equal(callLogSyncSignature([base],project),callLogSyncSignature([{...base,reasoning:['local only']}],project));
});

test('peer status includes sit-out finalization and blocker/correction timestamps without changing W/L count',()=>{
  const pending=callLogSyncStatus([base]);
  const finished=callLogSyncStatus([{...base,result:'SITOUT',resolvedAt:2000}]);
  assert.equal(pending.resolved,finished.resolved);assert.equal(finished.finalized,1);
  assert.equal(finished.evidenceAt,2000);
  assert.equal(callLogSyncStatus([{...base,blockedDecision:{observedAt:3000}}]).evidenceAt,3000);
  assert.equal(callLogSyncStatus([{...base,recordRevisions:[{at:4000}]}]).evidenceAt,4000);
  assert.equal(callLogSyncStatus([{...base,recordRevisions:{legacy:true}}]).evidenceAt,1000);
  const compare=app.slice(app.indexOf('const _sigBehind='),app.indexOf('// Element-wise max'));
  const behind=new Function(compare+';return _sigBehind;')();
  assert.equal(behind(pending,finished),true);
  assert.equal(behind(finished,finished),false);
});

function harness({initial={entries:[base]},readError=false,writeError=false,conflicts=0,beforeWrite}={}) {
  const timers=new Map(),queue=new Map(),pending=new Map(),synced=new Map(),health=[];
  let sequence=0,cloud=initial,reads=0,writes=0,failed=writeError,readFailed=readError;
  const timer=(fn,delay)=>{if(delay<1000){queueMicrotask(fn);return ++sequence;}timers.set(++sequence,{fn,delay});return sequence;};
  const client={from:()=>({
    select:()=>({eq:()=>({maybeSingle:async()=>{reads++;return {data:cloud?{data:cloud,updated_at:'version'}:null,error:readFailed?{message:'read failure'}:null};}})}),
    update:payload=>({eq:()=>({eq:async()=>{writes++;if(beforeWrite)await beforeWrite(writes);if(failed)return{error:{message:'write failure'},count:0};
      if(conflicts-->0)return{error:null,count:0};cloud=payload.data;return{error:null,count:1};}})}),
    insert:async payload=>{writes++;if(failed)return{error:{message:'insert failure'}};cloud=payload.data;return{error:null};}
  })};
  const body=app.slice(app.indexOf('const cloudSupabaseWriteDebouncedRMW='),app.indexOf('// Force-flush all pending Supabase RMW writes'));
  const sync=new Function('_sbClient','_sbWriteQueueRMW','_sbWritePendingRMW','_sbLastSyncSig','callLogSyncSignature','_stripEntryForCloud',
    '_setCloudStatus','_cloudSyncStatus','setTimeout','clearTimeout','console',body+';return cloudSupabaseWriteDebouncedRMW;')(
      client,queue,pending,synced,callLogSyncSignature,e=>e,s=>health.push(s),{writes:0},timer,id=>timers.delete(id),{warn:()=>{}});
  const mergeBody=app.slice(app.indexOf('  const _mergeCallLogEntries='),app.indexOf('  useEffect(()=>{',app.indexOf('  const _mergeCallLogEntries=')));
  const merge=new Function('React','CALL_EVIDENCE_FIELDS','normalizeCallLedger','TARA_CALL_LOG_CAP','_auditLogEvent',mergeBody+';return _mergeCallLogEntries;')(
    {useCallback:fn=>fn},CALL_EVIDENCE_FIELDS,normalizeCallLedger,1000,()=>{});
  const send=entries=>sync(path,()=>entries,(current,local)=>({entries:merge(current?.entries||[],local)}),60000);
  const flush=async()=>{const [id,{fn}]=timers.entries().next().value;timers.delete(id);await fn();};
  return {send,sync,flush,timers,synced,health,get cloud(){return cloud;},get reads(){return reads;},get writes(){return writes;},
    recover:()=>{failed=false;readFailed=false;}};
}

test('actual RMW flush persists a pending -> SITOUT update without a new window and preserves original evidence',async()=>{
  const h=harness();h.send([base]);await h.flush();
  const original=h.cloud.entries[0].originalDecision;
  h.send([{...base,result:'SITOUT',resolvedAt:2000}]);await h.flush();
  assert.equal(h.cloud.entries.length,1);assert.equal(h.cloud.entries[0].result,'SITOUT');
  assert.deepEqual(h.cloud.entries[0].originalDecision,original);assert.equal(h.writes,2);
  h.send([{...base,result:'SITOUT',resolvedAt:2000}]);await h.flush();
  assert.equal(h.writes,2);assert.equal(h.reads,2,'unchanged evidence skips the full read/write');
});

test('actual RMW flush propagates blocker-only evidence and cached same-id corrections',async()=>{
  const h=harness();h.send([base]);await h.flush();
  const blocker={code:'timing-confidence',reason:'Patient: 58% conviction building',observedAt:2000,gate:{confidence:58,requiredConfidence:65}};
  h.send([{...base,blockedDecision:blocker,reason:blocker.reason}]);await h.flush();
  assert.deepEqual(h.cloud.entries[0].blockedDecision,blocker);
  assert.equal(h.cloud.entries[0].originalDecision.capturedAt,1000);assert.equal(h.writes,2);
});

test('frequent log changes keep the first flush deadline but write the latest payload',async()=>{
  const h=harness();h.send([base]);const firstTimer=[...h.timers.keys()][0];
  for(let i=0;i<30;i++)h.send([{...base,result:'SITOUT',resolvedAt:2000+i}]);
  assert.equal(h.timers.size,1);assert.equal([...h.timers.keys()][0],firstTimer);
  assert.equal([...h.timers.values()][0].delay,60000);await h.flush();
  assert.equal(h.cloud.entries[0].resolvedAt,2029);assert.equal(h.writes,1);
});

for(const failure of ['read','write'])test(`failed ${failure} never marks evidence synced; next attempt retries`,async()=>{
  const h=harness({readError:failure==='read',writeError:failure==='write'});
  h.send([{...base,result:'SITOUT'}]);await h.flush();assert.equal(h.synced.size,0);
  assert.equal(h.health.at(-1).state,'error');h.recover();
  h.send([{...base,result:'SITOUT'}]);await h.flush();assert.equal(h.cloud.entries[0].result,'SITOUT');
  assert.equal(h.synced.size,1);assert.equal(h.health.at(-1).state,'ok');
});

test('new-row insert and optimistic concurrency retry also acknowledge the exact written evidence',async()=>{
  for(const config of [{initial:null},{conflicts:1}]){
    const h=harness(config);h.send([{...base,result:'SITOUT'}]);await h.flush();
    assert.equal(h.cloud.entries[0].result,'SITOUT');assert.equal(h.synced.size,1);
    const reads=h.reads;h.send([{...base,result:'SITOUT'}]);await h.flush();assert.equal(h.reads,reads);
  }
});

test('an in-flight write cannot acknowledge a newer queued blocker which it has not written',async()=>{
  let release;
  const barrier=new Promise(resolve=>{release=resolve;});
  const h=harness({beforeWrite:number=>number===1?barrier:null});
  h.send([base]);const first=h.flush();
  for(let i=0;i<10&&h.writes===0;i++)await Promise.resolve();
  assert.equal(h.writes,1);
  const newer={...base,blockedDecision:{code:'timing-confidence',reason:'new evaluated hold',observedAt:2000}};
  h.send([newer]);release();await first;
  assert.equal(h.synced.get(path),callLogSyncSignature([base]));
  await h.flush();assert.equal(h.writes,2);assert.deepEqual(h.cloud.entries[0].blockedDecision,newer.blockedDecision);
});

test('catch-up merge and heartbeat do not discard same-count finalization or blocker additions',()=>{
  assert.match(app,/if\(callLogSyncSignature\(_merged,_stripEntryForCloud\)===callLogSyncSignature\(prev,_stripEntryForCloud\)\)return prev/);
  const max=app.slice(app.indexOf('const _sigMax='),app.indexOf('// V11.2 live timing recommendation'));
  const combine=new Function(max+';return _sigMax;')();
  assert.equal(combine({resolved:4,finalized:5,evidenceAt:3000},{resolved:3,finalized:6,evidenceAt:4000}).finalized,6);
  assert.equal(combine({evidenceAt:3000},{evidenceAt:4000}).evidenceAt,4000);
});

test('record write failures retry automatically even if no new Call or hourly pick is made',async()=>{
  for(const failure of ['read','write']){
    const h=harness({readError:failure==='read',writeError:failure==='write'});
    h.send([{...base,result:'SITOUT',resolvedAt:2000}]);await h.flush();
    assert.equal(h.timers.size,1,'failed evidence retains a bounded retry');
    h.recover();await h.flush();assert.equal(h.cloud.entries[0].result,'SITOUT');
    assert.equal(h.timers.size,0);assert.equal(h.synced.size,1);
  }
});

test('hourly RMW has a fixed first deadline, urgent captures expedite it, and a peer pick survives sync',async()=>{
  const body=app.slice(app.indexOf('const _hrMerge='),app.indexOf('function useHourlyRecord'));
  const merge=new Function('_HR_HISTORY_CAP','_HR_PENDING_CAP',body+';return _hrMerge;')(500,40);
  const peer={ticker:'KXBTCD-PEER',side:'NO',closeMs:10000,approval:{samples:[{quoteId:'original'}]}};
  const own={ticker:'KXBTCD-OWN',side:'YES',closeMs:20000};
  const h=harness({initial:{pending:[peer],history:[]}}),hourly='memory/hourlyRecord';
  let local={pending:[own],history:[]};h.sync(hourly,()=>local,merge,60000);
  const first=[...h.timers.keys()][0];
  for(let n=0;n<20;n++){local={pending:[{...own,conf:n}],history:[]};h.sync(hourly,()=>local,merge,60000);}
  assert.equal([...h.timers.keys()][0],first);
  h.sync(hourly,()=>local,merge,1500);assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].delay,1500);
  await h.flush();assert.equal(h.cloud.pending.length,2);
  assert.deepEqual(h.cloud.pending.find(p=>p.ticker===peer.ticker).approval,peer.approval);
  assert.equal(h.cloud.pending.find(p=>p.ticker===own.ticker).conf,19);
});

test('plain debounced progress writes keep a bounded deadline, send latest evidence, expedite and retry failure',async()=>{
  let now=0,seq=0,fail=false,slow=false,release;const timers=new Map(),queue=new Map(),pending=new Map(),writes=[];
  const body=app.slice(app.indexOf('const cloudWriteDebounced='),app.indexOf('// V8.1: Synchronously fire all pending debounced writes'));
  const send=new Function('_writeQueue','_writePending','_writeLatest','Date','setTimeout','clearTimeout','cloudWrite',body+';return cloudWriteDebounced;')(
    queue,pending,new Map(),{now:()=>now},(fn,delay)=>{timers.set(++seq,{fn,at:now+delay,delay});return seq;},id=>timers.delete(id),
    async(path,data)=>{writes.push({path,data});return slow?new Promise(r=>release=r):!fail;});
  const flush=async()=>{const [id,t]=timers.entries().next().value;timers.delete(id);now=t.at;t.fn();await new Promise(r=>setImmediate(r));};
  send('state/currentLock_BTC_15m',{n:1},300);const first=[...timers.keys()][0];
  for(let n=2;n<=20;n++){now++;send('state/currentLock_BTC_15m',{n},300);}
  assert.equal([...timers.keys()][0],first);await flush();assert.equal(writes[0].data.n,20);
  fail=true;send('test',{n:21},60000);send('test',{n:22},1500);
  assert.equal([...timers.values()][0].delay,1500);await flush();assert.equal(timers.size,1);
  fail=false;await flush();assert.equal(writes.at(-1).data.n,22);assert.equal(timers.size,0);
  slow=true;send('test',{n:23},300);await flush();
  slow=false;send('test',{n:24},300);await flush();release(false);await new Promise(r=>setImmediate(r));
  assert.equal(timers.size,0,'a late failed old write cannot retry over a newer successful payload');
});
