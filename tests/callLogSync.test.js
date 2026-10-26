import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {callLogSyncSignature,callLogSyncStatus,callLogCloudPayload} from '../src/callLogSync.js';
import {cloudWriteRetryDelay,boundedCloudWriteQuery} from '../src/cloudWriteRecovery.js';
import {CALL_EVIDENCE_FIELDS,callKey,normalizeCallLedger} from '../src/callIntegrity.js';
import {mergeWeatherRecords} from '../src/weatherRecord.js';
import {supabaseHourlyTransport} from '../src/hourlyAdmission.js';
import {createClient} from '@supabase/supabase-js';

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

function harness({initial={entries:[base]},readError=false,writeError=false,conflicts=0,beforeWrite,failThenCommit=false,clientOverride,boundQuery=q=>q}={}) {
  const timers=new Map(),queue=new Map(),pending=new Map(),synced=new Map(),failures=new Map(),health=[];
  let sequence=0,cloud=initial,reads=0,writes=0,failed=writeError,readFailed=readError,active=0,maxActive=0;
  const timer=(fn,delay)=>{if(delay<1000){queueMicrotask(fn);return ++sequence;}timers.set(++sequence,{fn,delay});return sequence;};
  const client={from:()=>({
    select:()=>({eq:()=>({maybeSingle:async()=>{reads++;return {data:cloud?{data:cloud,updated_at:'version'}:null,error:readFailed?(typeof readFailed==='object'?readFailed:{message:'read failure'}):null};}})}),
    update:payload=>{const q={eq:()=>q,is:()=>q,then(resolve){return (async()=>{writes++;active++;maxActive=Math.max(maxActive,active);try{if(beforeWrite)await beforeWrite(writes);if(failed){if(failThenCommit)cloud=payload.data;return{error:typeof failed==='object'?failed:{message:'write failure'},count:0};}
      if(conflicts-->0)return{error:null,count:0};cloud=payload.data;return{error:null,count:1};}finally{active--;}})().then(resolve);}};return q;},
    insert:async payload=>{writes++;if(failed)return{error:{message:'insert failure'}};cloud=payload.data;return{error:null};}
  })};
  const body=app.slice(app.indexOf('const cloudSupabaseWriteDebouncedRMW='),app.indexOf('// Force-flush all pending Supabase RMW writes'));
  const sync=new Function('supabaseHourlyTransport','_sbClient','_sbWriteQueueRMW','_sbWritePendingRMW','_sbLastSyncSig','callLogSyncSignature','_stripEntryForCloud','_sbWriteInFlightRMW','_sbWriteFailuresRMW','cloudWriteRetryDelay','boundedCloudWriteQuery',
    '_setCloudStatus','_cloudSyncStatus','setTimeout','clearTimeout','console',body+';return cloudSupabaseWriteDebouncedRMW;')(
      supabaseHourlyTransport,clientOverride||client,queue,pending,synced,callLogSyncSignature,e=>e,new Set(),failures,cloudWriteRetryDelay,boundQuery,s=>health.push(s),{writes:0},timer,id=>timers.delete(id),{warn:()=>{}});
  const mergeBody=app.slice(app.indexOf('  const _mergeCallLogEntries='),app.indexOf('  const[callStorageStatus',app.indexOf('  const _mergeCallLogEntries=')));
  const merge=new Function('React','CALL_EVIDENCE_FIELDS','normalizeCallLedger','TARA_CALL_LOG_CAP','_auditLogEvent',mergeBody+';return _mergeCallLogEntries;')(
    {useCallback:fn=>fn},CALL_EVIDENCE_FIELDS,normalizeCallLedger,1000,()=>{});
  const send=entries=>sync(path,()=>entries,(current,local)=>({entries:merge(current?.entries||[],local)}),60000);
  const sendExact=(entries,delay=60000)=>sync(path,()=>entries,(current,local)=>callLogCloudPayload(current?.entries||[],local,merge,e=>e,1000),delay);
  const flushBody=app.slice(app.indexOf('const _cloudSupabaseFlushAllRMW='),app.indexOf('// V10.2.0: stubbed.'));
  const flushAll=new Function('_sbWriteQueueRMW','_sbWritePendingRMW','_sbWriteFailuresRMW','clearTimeout','cloudSupabaseWriteDebouncedRMW','cloudSupabaseWrite',flushBody+';return _cloudSupabaseFlushAllRMW;')(
    queue,pending,failures,id=>timers.delete(id),sync,()=>{throw Error('No blind record write allowed');});
  const flush=async()=>{const [id,{fn}]=timers.entries().next().value;timers.delete(id);await fn();};
  return {send,sendExact,sync,flush,flushAll,timers,synced,health,get cloud(){return cloud;},get reads(){return reads;},get writes(){return writes;},get maxActive(){return maxActive;},
    setCloud:value=>{cloud=value;},recover:()=>{failed=false;readFailed=false;}};
}

test('Weather conditional writer retries concurrent peer changes and retains both original captures',async()=>{
  const a={ticker:'WX-A',side:'YES',dayKey:'2026-10-15',atMs:1,price:60,learningCapture:{original:'A'}},
    b={ticker:'WX-B',side:'NO',dayKey:'2026-10-15',atMs:2,price:55,learningCapture:{original:'B'}};
  const h=harness({initial:{picks:[]},conflicts:1,beforeWrite:async n=>{if(n===1)h.setCloud({picks:[b]});}});
  h.sync('memory/weatherPicks',()=>({picks:[a]}),mergeWeatherRecords,4000);await h.flush();
  assert.equal(h.writes,2);assert.equal(h.cloud.picks.length,2);
  assert.deepEqual(h.cloud.picks.find(p=>p.ticker==='WX-A').learningCapture,a.learningCapture);
  assert.deepEqual(h.cloud.picks.find(p=>p.ticker==='WX-B').learningCapture,b.learningCapture);
});

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

test('unchanged pending 1000-row evidence does not rewrite the full document; finalization still does',async()=>{
  const rows=Array.from({length:1000},(_,i)=>({...base,id:1000+i,windowId:'15m-'+new Date(Date.parse(base.windowId.slice(4))+i*900000).toISOString(),originalDecision:{direction:'SIT_OUT',capturedAt:1000+i,trace:'x'.repeat(5000)}}));
  const merge=(_cloud,local)=>local;
  assert.ok(JSON.stringify(rows).length>5000000);
  assert.equal(callLogCloudPayload(rows,rows,merge,e=>e,1000),null);
  const final=rows.map((r,i)=>i===999?{...r,result:'SITOUT',resolvedAt:8000}:r);
  const payload=callLogCloudPayload(rows,final,merge,e=>e,1000,9000);
  assert.equal(payload.entries[999].result,'SITOUT');assert.equal(payload._strippedAt,9000);
  assert.deepEqual(payload.entries[999].originalDecision,rows[999].originalDecision);
  assert.equal(callLogCloudPayload(final,[...final].reverse(),(_c,l)=>[...l].reverse(),e=>e,1000),null);
  assert.match(app,/return callLogCloudPayload\(cloudEntries,localEntries,_mergeCallLogEntries,_stripEntryForCloud,_TARA_CLOUD_LOG_CAP\)/);
});

test('statement-timeout recovery is bounded, backs off, and never retries permissions at the fast cadence',async()=>{
  assert.deepEqual([1,2,3,4,5].map(n=>cloudWriteRetryDelay({code:'57014',message:'canceling statement due to statement timeout'},n)),[1500,5000,15000,60000,120000]);
  assert.equal(cloudWriteRetryDelay({code:'42501',message:'permission denied'},1),60000);
  for(const failure of ['read','write']){
    const error={code:'57014',message:'canceling statement due to statement timeout'};
    const h=harness({readError:failure==='read'?error:false,writeError:failure==='write'?error:false});
    h.sendExact([{...base,result:'SITOUT'}]);
    for(const delay of [1500,5000,15000,60000]){await h.flush();assert.equal(h.synced.size,0);assert.equal([...h.timers.values()][0].delay,delay);}
    h.recover();await h.flush();assert.equal(h.cloud.entries[0].result,'SITOUT');assert.equal(h.synced.size,1);assert.equal(h.health.at(-1).state,'ok');
  }
});

test('a cloud deadline cancels the underlying request and TimeoutError uses bounded recovery',async()=>{
  const controller=new AbortController();let attached;
  const query={abortSignal(signal){attached=signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}};
  const request=boundedCloudWriteQuery(query,controller.signal);assert.equal(attached,controller.signal);
  controller.abort(new DOMException('signal timed out','TimeoutError'));
  await assert.rejects(request,{name:'TimeoutError'});
  assert.equal(cloudWriteRetryDelay(controller.signal.reason,1),1500);
  const signal=boundedCloudWriteQuery({abortSignal:s=>s});assert.equal(signal instanceof AbortSignal,true);
});

test('a timeout after commit is proven by a fresh read and no duplicate PATCH or premature acknowledgement',async()=>{
  const h=harness({writeError:{code:'57014',message:'statement timeout'},failThenCommit:true});
  h.sendExact([{...base,result:'SITOUT',resolvedAt:3000}]);await h.flush();
  assert.equal(h.synced.size,0);assert.equal(h.writes,1);assert.equal(h.health.at(-1).state,'error');
  h.recover();await h.flush();assert.equal(h.reads,2);assert.equal(h.writes,1);
  assert.equal(h.cloud.entries.length,1);assert.equal(h.cloud.entries[0].result,'SITOUT');assert.equal(h.synced.size,1);assert.equal(h.health.at(-1).state,'ok');
});

test('one in-flight CAS coalesces 100 new payloads, then writes the latest without overlapping',async()=>{
  let release;const barrier=new Promise(resolve=>release=resolve);
  const h=harness({beforeWrite:n=>n===1?barrier:null});
  h.send([base]);const first=h.flush();for(let n=0;n<10&&h.writes===0;n++)await Promise.resolve();
  for(let n=0;n<100;n++)h.send([{...base,result:'SITOUT',resolvedAt:3000+n}]);
  assert.equal(h.reads,1);assert.equal(h.writes,1);assert.equal(h.timers.size,0);
  release();await first;assert.equal(h.timers.size,1);await h.flush();
  assert.equal(h.maxActive,1);assert.equal(h.writes,2);assert.equal(h.cloud.entries[0].resolvedAt,3099);
});

test('settlement arriving during a failed PATCH is retained for the faster fresh-read retry',async()=>{
  let release;const barrier=new Promise(resolve=>release=resolve);
  const h=harness({writeError:{code:'57014',message:'statement timeout'},beforeWrite:n=>n===1?barrier:null});
  h.sendExact([base]); // no-op read is acknowledged, so start with new evidence
  h.sendExact([{...base,reason:'fresh captured blocker'}]);const first=h.flush();
  for(let n=0;n<10&&h.writes===0;n++)await Promise.resolve();
  const final={...base,reason:'fresh captured blocker',result:'SITOUT',resolvedAt:5000};h.sendExact([final]);
  release();await first;assert.equal(h.synced.size,0);assert.equal([...h.timers.values()][0].delay,1500);
  h.recover();await h.flush();assert.equal(h.cloud.entries[0].result,'SITOUT');assert.equal(h.cloud.entries[0].resolvedAt,5000);
  assert.deepEqual(h.cloud.entries[0].originalDecision,base.originalDecision);assert.equal(h.maxActive,1);
});

test('urgent flush keeps a latest payload behind an active writer without a blind overwrite or dropped follow-up',async()=>{
  let release;const barrier=new Promise(resolve=>release=resolve),h=harness({beforeWrite:n=>n===1?barrier:null});
  h.send([base]);const first=h.flush();for(let n=0;n<10&&h.writes===0;n++)await Promise.resolve();
  h.send([{...base,result:'SITOUT',resolvedAt:7000}]);assert.equal(h.flushAll(),1);assert.equal(h.writes,1);
  release();await first;
  // An urgent timer is queued as a microtask by this isolated timer host.
  for(let n=0;n<12;n++)await new Promise(r=>setImmediate(r));
  assert.equal(h.cloud.entries[0].result,'SITOUT');assert.equal(h.cloud.entries[0].resolvedAt,7000);assert.equal(h.maxActive,1);
});

test('a timeout retry re-merges a peer capture rather than replaying the old full payload',async()=>{
  const peer={...base,id:2000,windowId:'15m-2026-10-12T18:45:00.000Z',originalDecision:{direction:'UP',capturedAt:2000}};
  const h=harness({writeError:{code:'57014',message:'statement timeout'},beforeWrite:n=>{if(n===1)h.setCloud({entries:[peer]});}});
  h.sendExact([{...base,result:'SITOUT',resolvedAt:6000}]);await h.flush();assert.equal(h.synced.size,0);
  h.recover();await h.flush();assert.equal(h.cloud.entries.length,2);
  assert.deepEqual(h.cloud.entries.find(e=>e.id===peer.id).originalDecision,peer.originalDecision);
  assert.equal(h.cloud.entries.find(e=>e.id===base.id).result,'SITOUT');
});

test('installed Supabase SDK executes real fluent GET/PATCH/CAS with abort signals and recovers a 57014 response',async()=>{
  let cloud={entries:[base]},gets=0,patches=0,bounded=0;
  const client=createClient('https://isolated.invalid','test-public-config',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(url,init)=>{
    assert.equal(new URL(url).hostname,'isolated.invalid');assert.ok(init.signal instanceof AbortSignal);
    if(init.method==='GET'){gets++;return new Response(JSON.stringify([{data:cloud,updated_at:'2026-10-16T00:00:00Z'}]),{status:200,headers:{'content-type':'application/json'}});}
    assert.equal(init.method,'PATCH');assert.match(String(url),/updated_at=eq\./);patches++;
    if(patches===1)return new Response(JSON.stringify({code:'57014',message:'canceling statement due to statement timeout'}),{status:500,headers:{'content-type':'application/json'}});
    cloud=JSON.parse(init.body).data;return new Response(null,{status:204,headers:{'content-range':'0-0/1'}});
  }}});
  const h=harness({clientOverride:client,boundQuery:q=>{bounded++;return boundedCloudWriteQuery(q);}});
  h.sendExact([{...base,result:'SITOUT',resolvedAt:9000}]);await h.flush();assert.equal(h.synced.size,0);assert.equal([...h.timers.values()][0].delay,1500);
  await h.flush();assert.equal(gets,2);assert.equal(patches,2);assert.equal(bounded,4);assert.equal(cloud.entries[0].result,'SITOUT');assert.deepEqual(cloud.entries[0].originalDecision,base.originalDecision);assert.equal(h.synced.size,1);
});

test('a failing call-log save backs off to 30 minutes and new Calls cannot pull the retry forward',async()=>{
  const timeout={code:'57014',message:'canceling statement due to statement timeout'};
  assert.deepEqual([1,2,3,4,5,6,7,8,9,12].map(n=>cloudWriteRetryDelay(timeout,n)),
    [1500,5000,15000,60000,120000,240000,480000,960000,1800000,1800000]);
  assert.deepEqual([1,2,3,8].map(n=>cloudWriteRetryDelay({code:'42501',message:'permission denied'},n)),[60000,120000,240000,1800000]);
  const h=harness({writeError:timeout});
  h.sendExact([{...base,result:'SITOUT'}],1500);
  for(const delay of [1500,5000,15000,60000,120000]){await h.flush();assert.equal([...h.timers.values()][0].delay,delay);}
  const writes=h.writes;
  h.sendExact([{...base,result:'SITOUT',resolvedAt:4000}],1500);
  assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].delay,120000,'a new Call waits out the backoff');
  assert.equal(h.writes,writes);
  h.recover();await h.flush();
  assert.equal(h.cloud.entries[0].resolvedAt,4000,'the held retry carries the newest evidence');
  assert.equal(h.timers.size,0);
  h.sendExact([{...base,result:'SITOUT',resolvedAt:5000}],1500);
  assert.equal([...h.timers.values()][0].delay,1500,'after a success, new evidence is expedited again');
});

test('hiding the tab does not skip a call-log backoff; the hourly urgent save is never held',async()=>{
  const timeout={code:'57014',message:'canceling statement due to statement timeout'};
  const h=harness({writeError:timeout});
  h.sendExact([{...base,result:'SITOUT'}],1500);
  for(let n=0;n<4;n++)await h.flush();
  assert.equal([...h.timers.values()][0].delay,60000);
  const writes=h.writes,reads=h.reads;
  h.flushAll();await new Promise(r=>setImmediate(r));
  assert.equal(h.writes,writes,'no immediate resend on tab hide');assert.equal(h.reads,reads);
  assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].delay,60000);
  h.recover();await h.flush();assert.equal(h.cloud.entries[0].result,'SITOUT');
  // Healthy call log: the hide flush still sends at once, as before.
  h.sendExact([{...base,result:'SITOUT',resolvedAt:7000}]);
  assert.equal(h.timers.size,1);h.flushAll();await new Promise(r=>setImmediate(r));
  assert.equal(h.timers.size,0);assert.equal(h.cloud.entries[0].resolvedAt,7000);
  // Failing hourly doc: a new urgent save still goes out in 1.5s.
  const hourly='memory/hourlyRecord',g=harness({initial:{pending:[],history:[]},writeError:timeout});
  const merge=(cloud,local)=>({...local});
  g.sync(hourly,()=>({pending:[{n:1}],history:[]}),merge,1500);
  for(let n=0;n<4;n++)await g.flush();
  assert.equal([...g.timers.values()][0].delay,60000);
  g.sync(hourly,()=>({pending:[{n:2}],history:[]}),merge,1500);
  assert.equal(g.timers.size,1);assert.equal([...g.timers.values()][0].delay,1500);
});

test('the cloud call log drops the duplicated decision trace; local copies keep theirs',()=>{
  const start=app.indexOf('const _stripEntryForCloud=');
  const strip=new Function(app.slice(start,app.indexOf('// V10.6.3',start))+';return _stripEntryForCloud;')();
  const trace={schema:1,windowId:base.windowId,events:[{code:'timing-approved',at:1}],omitted:0};
  const full={...base,dir:'UP',reason:'kept',decisionTrace:trace,signalScoresAtLock:{gap:1.234,vwap:9},reasoning:['local only'],
    originalDecision:{...base.originalDecision,direction:'UP',strike:80000,decisionTrace:trace}};
  const before=JSON.stringify(full);
  const slim=strip(full);
  assert.equal(JSON.stringify(full),before,'the local entry is not mutated');
  assert.equal(slim.decisionTrace,undefined);assert.equal(slim.originalDecision.decisionTrace,undefined);
  assert.equal(slim.reasoning,undefined);assert.deepEqual(slim.signalScoresAtLock,{gap:1.2});
  assert.equal(slim.reason,'kept');assert.equal(slim.originalDecision.strike,80000);assert.equal(slim.originalDecision.direction,'UP');
  assert.equal(strip(strip(full)).originalDecision.strike,80000,'stripping is idempotent');
  // A doc saved before this change is not rewritten only because its projection shrank.
  const mergeBody=app.slice(app.indexOf('  const _mergeCallLogEntries='),app.indexOf('  const[callStorageStatus',app.indexOf('  const _mergeCallLogEntries=')));
  const merge=new Function('React','CALL_EVIDENCE_FIELDS','normalizeCallLedger','TARA_CALL_LOG_CAP','_auditLogEvent',mergeBody+';return _mergeCallLogEntries;')(
    {useCallback:fn=>fn},CALL_EVIDENCE_FIELDS,normalizeCallLedger,1000,()=>{});
  assert.equal(callLogCloudPayload([full],[full],merge,strip,1000),null);
  const payload=callLogCloudPayload([full],[{...full,result:'WIN',resolvedAt:9000}],merge,strip,1000,9000);
  assert.equal(payload.entries[0].result,'WIN');assert.equal(payload.entries[0].decisionTrace,undefined);
  assert.equal(payload.entries[0].originalDecision.decisionTrace,undefined);
  // A device that already holds the full record keeps its trace when the slim copy comes back.
  const merged=merge([full],[slim]);
  assert.deepEqual(merged[0].decisionTrace,trace);assert.deepEqual(merged[0].originalDecision.decisionTrace,trace);
});
