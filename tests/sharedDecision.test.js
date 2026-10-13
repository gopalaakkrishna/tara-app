import test from 'node:test';
import assert from 'node:assert/strict';
import {makeHarness,app} from './helpers/callDecisionHarness.js';
import {restoreHarness,actualCloudWatch,actualCloudRead,actualCloudWrite} from './helpers/sharedDecisionHarness.js';
import * as shared from '../src/sharedDecision.js';
import {createClient} from '@supabase/supabase-js';
const savedCall=(direction='UP')=>{
  const h=makeHarness(direction==='DOWN'?{probabilityUp:20.055,yesPrice:42,mtf:-2,tapeBuy:10,quality:80,regime:'TRENDING DOWN'}:{});
  h.run();return {snapshot:structuredClone(h.scope.taraCallSnapshotRef.current),row:structuredClone(h.logs[0]),h};
};
const savedSitout=()=>{const h=makeHarness({confidence:58,secondsLeft:421});h.run();h.advance(420);h.run();
  return {snapshot:structuredClone(h.scope.taraCallSnapshotRef.current),row:structuredClone(h.logs[0]),h};};
const doc=s=>({windowId:s.windowId,windowType:s.windowType,asset:s.asset,taraSnapshot:s,engineLock:null,taraSamples:null});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('fresh load after cutoff restores UP and DOWN while warmup is incomplete, with no new history entry',()=>{
  for(const direction of ['UP','DOWN']){
    const saved=savedCall(direction),h=restoreHarness({rows:[saved.row]});
    h.startWatch();h.callbacks[0].callback(doc(saved.snapshot),'ok');h.run();
    assert.equal(h.scope.taraCallSnapshotRef.current.call,direction);
    assert.deepEqual(h.scope.taraCallSnapshotRef.current.originalDecision,saved.snapshot.originalDecision);
    assert.equal(h.logs.length,1);assert.deepEqual(h.logs[0],saved.row);assert.equal(h.writes.length,0);
  }
});

test('fresh load retains a captured sit-out reason rather than replacing it with warmup or startup-analysis',()=>{
  const saved=savedSitout(),h=restoreHarness({rows:[saved.row]});h.startWatch();
  h.callbacks[0].callback(doc(saved.snapshot),'ok');h.run();
  assert.equal(h.scope.taraCallSnapshotRef.current.call,'SIT_OUT');
  assert.equal(h.scope.taraCallSnapshotRef.current.blockedDecision.reason,saved.snapshot.blockedDecision.reason);
  assert.equal(h.scope.taraCallSnapshotRef.current._committedAt,saved.snapshot._committedAt);
  assert.deepEqual(h.logs[0].originalDecision,saved.row.originalDecision);
  assert.equal(h.logs.length,1);assert.equal(h.writes.length,0);
});

test('a damaged later shared startup sitout is repaired from an earlier captured canonical local record',()=>{
  const saved=savedSitout(),h=restoreHarness({rows:[saved.row]});
  const bad={...saved.snapshot,_committedAt:saved.snapshot._committedAt+90000,originalDecision:undefined,reason:'Warmup replacement'};
  h.startWatch();h.callbacks[0].callback(doc(bad),'ok');
  assert.equal(h.scope.taraCallSnapshotRef.current.reason,saved.snapshot.reason);
  assert.equal(h.writes.length,1);assert.deepEqual(h.writes[0].data.taraSnapshot.originalDecision,saved.row.originalDecision);
  assert.deepEqual(h.logs[0],saved.row);
});

test('successful missing shared doc uses cache/ledger but a failed read never authorizes replacement or publication',async()=>{
  const saved=savedSitout(),h=restoreHarness({rows:[saved.row]});
  h.startWatch();h.callbacks[0].callback(null,'error');
  assert.equal(h.scope._cloudRestoreCompletedRef.current,false);h.persist();assert.equal(h.writes.length,0);
  assert.match(h.scope._cloudRestoreErrorRef.current,/read failed/);
  h.scope.cloudSupabaseRead=async()=>doc(saved.snapshot);
  // The actual closure captured the original read function, so inject result via
  // its existing callback to also test error→successful response without reload.
  h.callbacks[0].callback(doc(saved.snapshot),'ok');
  assert.equal(h.scope._cloudRestoreCompletedRef.current,true);assert.equal(h.scope._cloudRestoreErrorRef.current,null);
  assert.ok(h.timers[0].cancelled);assert.equal(h.writes.length,0);
  const missing=restoreHarness({rows:[saved.row]});missing.startWatch();missing.callbacks[0].callback(null,'ok');
  assert.equal(missing.writes.length,1);assert.deepEqual(missing.writes[0].data.taraSnapshot.originalDecision,saved.row.originalDecision);
});

test('failed initial read without a cache holds even past cutoff with its actual restore error',()=>{
  const h=restoreHarness();h.startWatch();h.callbacks[0].callback(null,'error');h.run();
  assert.equal(h.scope.taraCallSnapshotRef.current,null);assert.equal(h.logs.length,0);assert.equal(h.writes.length,0);
  assert.equal(h.scope.currentCallBlockerRef.current.code,'shared-lock-restore-error');
});

test('a successful empty restore allows the unchanged deadline sitout, not an UP or DOWN late lock',async()=>{
  const h=restoreHarness({ready:true});h.startWatch();await h.callbacks[0].callback(null,'ok');h.run();
  assert.equal(h.scope.taraCallSnapshotRef.current.call,'SIT_OUT');assert.equal(h.logs.length,1);
  assert.equal(h.logs[0].callPolicy.cutoff,420);
});

test('rollover clears only local refs; delayed old callbacks cannot unlock the restore gate or overwrite the new window',async()=>{
  const saved=savedCall(),h=restoreHarness();const cleanup=h.startWatch();
  h.callbacks[0].callback(doc(saved.snapshot),'ok');h.clear();
  h.scope.taraCallSnapshotRef.current=null;h.scope.lockedCallRef.current=null;
  h.scope._cloudRestoreCompletedRef.current=false;h.advance(-1);cleanup();
  h.callbacks[0].callback(doc(saved.snapshot),'ok');
  assert.equal(h.scope.taraCallSnapshotRef.current,null);assert.equal(h.scope._cloudRestoreCompletedRef.current,false);
  assert.equal(h.writes.length,0);
  h.startWatch();assert.equal(h.callbacks.length,2);await h.callbacks[1].callback(null,'ok');
  assert.equal(h.scope._cloudRestoreCompletedRef.current,true);assert.equal(h.scope.taraCallSnapshotRef.current,null);
  assert.match(app,/\[_priceAlive,windowType,currentAsset,timeState.nextWindowMs\]/);
});

test('wrong-window, asset, type and nested identities do not restore a decision or carry formation samples',()=>{
  const saved=savedCall();
  for(const patch of [{windowId:'15m-2026-10-13T20:30:00.000Z'},{asset:'ETH'},{windowType:'5m'},
    {taraSnapshot:{...saved.snapshot,windowId:'15m-2026-10-13T20:30:00.000Z'}}]){
    const h=restoreHarness();h.startWatch();h.callbacks[0].callback({...doc(saved.snapshot),...patch},'ok');
    assert.equal(h.scope.taraCallSnapshotRef.current,null);assert.equal(h.logs.length,0);
  }
});

test('forming samples and engine-only locks stay distinct from a committed Call, with preserved matching time-series',async()=>{
  const h=restoreHarness({secondsLeft:600}),wid=h.scope.computeWindowId('15m'),at=h.scope.Date.now()-1000;
  const data={windowId:wid,asset:'BTC',windowType:'15m',taraSnapshot:null,
    engineLock:{dir:'UP',_committedAt:at,lockedAt:at,windowId:wid},taraSamples:{dir:'UP',count:20}};
  h.scope.localStorage.setItem('taraLockedTimeSeries_v1',JSON.stringify({windowId:wid,ts:[{at,price:83400}]}));
  h.startWatch();await h.callbacks[0].callback(data,'ok');
  assert.equal(h.scope.taraCallSnapshotRef.current,null);assert.equal(h.scope.taraCallSampleRef.current.count,20);
  assert.equal(h.scope.lockedCallRef.current.timeSeries.length,1);assert.equal(h.logs.length,0);
});

test('wake uses canonical IDs despite formatted clock labels and rejects responses arriving after rollover',async()=>{
  const saved=savedCall(),h=restoreHarness();h.scope.timeState.nextWindow='05:00 PM';h.scope.timeState.startWindow='04:45 PM';
  h.scope.cloudSupabaseRead=async()=>doc(saved.snapshot);h.startWake();
  await h.scope.window.listeners.focus();assert.equal(h.scope.taraCallSnapshotRef.current.call,'UP');
  const stale=restoreHarness();let resolve;stale.scope.cloudSupabaseRead=()=>new Promise(r=>resolve=r);stale.startWake();
  const request=stale.scope.window.listeners.focus();stale.advance(-1);resolve(doc(saved.snapshot));await request;
  assert.equal(stale.scope.taraCallSnapshotRef.current,null);assert.equal(stale.scope._cloudRestoreCompletedRef.current,false);
});

test('the actual cloud watch ignores a late initial read after a newer realtime event, and suppresses callbacks after unsubscribe',async()=>{
  let resolve,realtime;const seen=[];
  const scope={cloudSupabaseRead:()=>new Promise(r=>resolve=r),cloudSupabaseWatch:(_,fn)=>{realtime=fn;return()=>{};},
    _setCloudStatus(){},_cloudSyncStatus:{listeners:0,reads:0},Date,console};
  const watch=actualCloudWatch(scope),unsub=watch('state/currentLock_BTC_15m',(d,status)=>seen.push({d,status}));
  realtime({version:'new'});resolve({version:'old'});await tick();assert.equal(seen.length,1);assert.equal(seen[0].d.version,'new');
  unsub();realtime({version:'after-close'});assert.equal(seen.length,1);
});

test('strict read distinguishes a real empty document from transport/database failure',async()=>{
  const client=response=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>response})})})});
  const error=new Error('offline');const read=actualCloudRead({_sbClient:client({data:null,error}),console});
  assert.equal(await read('state/currentLock_BTC_15m'),null);
  await assert.rejects(read('state/currentLock_BTC_15m',{throwOnError:true}),/offline/);
  const empty=actualCloudRead({_sbClient:client({data:null,error:null}),console});
  assert.equal(await empty('state/currentLock_BTC_15m',{throwOnError:true}),null);
});

test('local cache failures are tolerated and stale/future/wrong-scope records are never relabelled',()=>{
  const saved=savedCall(),context={windowId:saved.snapshot.windowId,windowType:'15m',asset:'BTC',now:saved.h.clock+100000};
  const blocked={getItem(){throw new Error('storage denied');},setItem(){throw new Error('quota');}};
  assert.equal(shared.readDecisionCache(blocked,context),null);assert.equal(shared.cacheSharedDecision(blocked,doc(saved.snapshot),context),false);
  assert.equal(shared.ledgerDecision([{...saved.row,originalDecision:{...saved.row.originalDecision,asset:'ETH'}}],context),null);
  assert.equal(shared.restoredSnapshot({...saved.snapshot,_committedAt:context.now+3000,originalDecision:undefined},context),null);
});

function memoryServer(initial=null){
  let row=initial?{data:structuredClone(initial),updated_at:'revision-0'}:null,n=0,writes=0;
  return {get row(){return row;},get writes(){return writes;},
    readRow:async()=>structuredClone(row),
    compareAndSwap:async(_,expected,data)=>{
      if(row?.updated_at!==expected.updated_at||row?.data?._revision!==expected.data?._revision)return false;
      row={data:structuredClone(data),updated_at:`revision-${++n}`};writes++;return true;
    },
    insertIfAbsent:async(_,data)=>{if(row)return false;row={data:structuredClone(data),updated_at:`revision-${++n}`};writes++;return true;}};
}

test('competing first inserts converge without clobbering a committed Call with a null/formation write',async()=>{
  const saved=savedCall(),server=memoryServer(),incoming=doc(saved.snapshot);
  const formation={...incoming,taraSnapshot:null,taraSamples:{dir:'DOWN',count:10}};
  const now=()=>saved.h.clock+1000,path='state/currentLock_BTC_15m';
  await Promise.all([shared.publishSharedDecision(path,incoming,{...server,now}),shared.publishSharedDecision(path,formation,{...server,now})]);
  assert.equal(server.row.data.taraSnapshot.call,'UP');
  assert.deepEqual(server.row.data.taraSnapshot.originalDecision,saved.snapshot.originalDecision);
});

test('conflicting later Call loses the conditional-write race and preserves the earlier original capture',async()=>{
  const saved=savedCall(),server=memoryServer(doc(saved.snapshot));
  const other={...saved.snapshot,call:'DOWN',dir:'DOWN',direction:'DOWN',_committedAt:saved.snapshot._committedAt+2000,originalDecision:undefined};
  const result=await shared.publishSharedDecision('state/currentLock_BTC_15m',doc(other),{...server,now:()=>saved.h.clock+5000});
  assert.equal(result.reason,'shared-canonical-preserved');assert.equal(server.writes,0);
  assert.deepEqual(server.row.data.taraSnapshot.originalDecision,saved.snapshot.originalDecision);
});

test('a failed compare-and-swap re-reads the winner instead of replaying a stale null write',async()=>{
  const saved=savedCall(),server=memoryServer({...doc(saved.snapshot),taraSnapshot:null});let first=true;
  const cas=server.compareAndSwap;
  const result=await shared.publishSharedDecision('state/currentLock_BTC_15m',{...doc(saved.snapshot),taraSnapshot:null},{...server,now:()=>saved.h.clock+2000,
    compareAndSwap:async(...args)=>{
      if(first){first=false;await cas(args[0],args[1],{...doc(saved.snapshot),_revision:'winner'});return false;}
      return cas(...args);
    }});
  assert.equal(result.reason,'shared-canonical-preserved');assert.equal(server.row.data.taraSnapshot.call,'UP');assert.equal(server.writes,1);
});

test('queued old-window payload, future shared window and path mismatch cannot overwrite the active decision',async()=>{
  const saved=savedCall(),server=memoryServer(doc(saved.snapshot));
  const stale=await shared.publishSharedDecision('state/currentLock_BTC_15m',doc(saved.snapshot),{...server,now:()=>saved.h.close+1000});
  assert.equal(stale.reason,'stale-window-payload');assert.equal(server.writes,0);
  const bad=await shared.publishSharedDecision('state/currentLock_ETH_15m',doc(saved.snapshot),{...server,now:()=>saved.h.clock});
  assert.equal(bad.reason,'path-identity-mismatch');assert.equal(server.writes,0);
  const future=memoryServer({...doc(saved.snapshot),windowId:shared.sharedWindowId('15m',saved.h.close+1000)});
  const result=await shared.publishSharedDecision('state/currentLock_BTC_15m',doc(saved.snapshot),{...future,now:()=>saved.h.clock});
  assert.equal(result.reason,'newer-shared-window');assert.equal(future.writes,0);
});

test('read failures and repeated CAS conflicts do not fall back to unconditional writes',async()=>{
  const saved=savedCall(),server=memoryServer(doc(saved.snapshot));
  await assert.rejects(shared.publishSharedDecision('state/currentLock_BTC_15m',doc(saved.snapshot),{
    ...server,now:()=>saved.h.clock,readRow:async()=>{throw new Error('offline');}}),/offline/);
  assert.equal(server.writes,0);
  const result=await shared.publishSharedDecision('state/currentLock_BTC_15m',doc(saved.snapshot),{
    readRow:async()=>null,insertIfAbsent:async()=>false,now:()=>saved.h.clock});
  assert.equal(result.reason,'shared-write-conflict');assert.equal(result.ok,false);
});

test('production adapter uses real Supabase SDK conditional PATCH and ignore-duplicate insertion without network writes',async()=>{
  const saved=savedCall(),path='state/currentLock_BTC_15m';let row=null;const requests=[];
  const fetch=async(url,options={})=>{
    const u=new URL(url),method=options.method||'GET';requests.push({method,params:Object.fromEntries(u.searchParams),headers:options.headers});
    if(method==='GET')return new Response(JSON.stringify(row?[row]:[]),{status:200,headers:{'content-type':'application/json'}});
    const body=JSON.parse(options.body);
    if(method==='POST'){
      assert.match(new Headers(options.headers).get('prefer'),/resolution=ignore-duplicates/);
      if(row)return new Response('[]',{status:200,headers:{'content-type':'application/json'}});
      row=body;return new Response(JSON.stringify([{doc_path:path}]),{status:201,headers:{'content-type':'application/json'}});
    }
    assert.equal(method,'PATCH');assert.equal(u.searchParams.get('doc_path'),`eq.${path}`);
    assert.equal(u.searchParams.get('updated_at'),`eq.${row.updated_at}`);
    assert.equal(u.searchParams.get('data->>_revision'),row.data._revision?`eq.${row.data._revision}`:'is.null');
    row={...row,...body};return new Response(JSON.stringify([{doc_path:path}]),{status:200,headers:{'content-type':'application/json'}});
  };
  const client=createClient('https://shared-decision-test.invalid','public-test-key',
    {global:{fetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const scope={...shared,_sbClient:client,_incActiveWrites(){},_decActiveWrites(){},_setCloudStatus(){},
    _cloudSyncStatus:{writes:0,reads:0},cloudSupabaseWrite(){throw new Error('Unconditional shared upsert forbidden');},console,
    Date:class extends Date{static now(){return saved.h.clock;}}};
  // Date.now alone is used by publishSharedDecision through its default binding;
  // inject the actual fake clock via the transport wrapper, not the host clock.
  scope.publishSharedDecision=(p,d,options)=>shared.publishSharedDecision(p,d,{...options,now:()=>saved.h.clock});
  const write=actualCloudWrite(scope);
  assert.equal(await write(path,{...doc(saved.snapshot),taraSnapshot:null}),true);
  assert.equal(await write(path,doc(saved.snapshot)),true);
  const writesBefore=requests.filter(r=>r.method!=='GET').length;
  assert.equal(await write(path,{...doc(saved.snapshot),taraSnapshot:null}),true);
  assert.equal(requests.filter(r=>r.method!=='GET').length,writesBefore);
  assert.equal(row.data.taraSnapshot.call,'UP');assert.deepEqual(row.data.taraSnapshot.originalDecision,saved.snapshot.originalDecision);
  assert.ok(requests.some(r=>r.method==='POST'));assert.ok(requests.some(r=>r.method==='PATCH'));
});

test('automatic retry after a failed initial read restores the exact capture before allowing publication',async()=>{
  const saved=savedSitout(),h=restoreHarness();let reads=0;
  h.scope.cloudSupabaseRead=async()=>{reads++;return doc(saved.snapshot);};h.startWatch();
  h.callbacks[0].callback(null,'error');assert.equal(h.scope._cloudRestoreCompletedRef.current,false);
  h.timers[0].fn();await tick();
  assert.equal(reads,1);assert.equal(h.scope._cloudRestoreCompletedRef.current,true);
  assert.deepEqual(h.scope.taraCallSnapshotRef.current.originalDecision,saved.snapshot.originalDecision);
  assert.equal(h.writes.length,0);assert.equal(h.logs.length,0);
});

test('formation backup is throttled but a new committed decision publishes immediately with no threshold changes',()=>{
  const h=restoreHarness({secondsLeft:600,ready:true});h.scope._cloudRestoreCompletedRef.current=true;
  h.persist();h.advance(599);h.persist();assert.equal(h.writes.length,1);
  h.advance(590);h.persist();assert.equal(h.writes.length,2);
  const saved=savedCall();h.scope.taraCallSnapshotRef.current=saved.snapshot;h.persist();
  assert.equal(h.writes.length,3);assert.deepEqual(h.writes[2].data.taraSnapshot.originalDecision,saved.snapshot.originalDecision);
});

test('a conflicting already displayed Call is corrected to the earlier shared capture with an explicit alert, not a silent reversal',()=>{
  const saved=savedCall(),h=restoreHarness();
  h.scope.taraCallSnapshotRef.current={...saved.snapshot,call:'DOWN',dir:'DOWN',direction:'DOWN',
    _committedAt:saved.snapshot._committedAt+2000,originalDecision:undefined};
  h.apply(doc(saved.snapshot),'manual');
  assert.equal(h.scope.taraCallSnapshotRef.current.call,'UP');assert.equal(h.toasts.length,1);
  assert.match(h.toasts[0][1],/Shared Call restored: UP/);assert.equal(h.logs.length,0);
});

test('a new device with a missing shared slot restores the cloud ledger capture before deadline or warmup can replace it',async()=>{
  const saved=savedSitout(),h=restoreHarness();const reads=[];
  h.scope.cloudSupabaseRead=async path=>{reads.push(path);return {entries:[saved.row]};};h.startWatch();
  const restore=h.callbacks[0].callback(null,'ok');
  assert.equal(h.scope._cloudRestoreCompletedRef.current,false);h.run();assert.equal(h.logs.length,0);
  await restore;assert.deepEqual(h.scope.taraCallSnapshotRef.current.originalDecision,saved.row.originalDecision);
  assert.deepEqual(reads,['memory/taraCallLog']);assert.equal(h.writes.length,1);assert.equal(h.logs.length,0);
});

test('a late ledger response cannot replace a newer realtime shared decision',async()=>{
  const saved=savedCall(),h=restoreHarness();let resolve;
  h.scope.cloudSupabaseRead=()=>new Promise(r=>resolve=r);h.startWatch();
  const old=h.callbacks[0].callback(null,'ok');await h.callbacks[0].callback(doc(saved.snapshot),'ok');
  resolve({entries:[savedSitout().row]});await old;
  assert.equal(h.scope.taraCallSnapshotRef.current.call,'UP');assert.deepEqual(h.scope.taraCallSnapshotRef.current.originalDecision,saved.snapshot.originalDecision);
});

test('a failed canonical history lookup blocks replacement and reports its own error, not generic warmup',async()=>{
  const h=restoreHarness();h.scope.cloudSupabaseRead=async()=>{throw new Error('history unavailable');};h.startWatch();
  await h.callbacks[0].callback(null,'ok');h.run();
  assert.equal(h.scope._cloudRestoreCompletedRef.current,false);assert.equal(h.logs.length,0);assert.equal(h.writes.length,0);
  assert.match(h.scope.currentCallBlockerRef.current.reason,/history lookup failed/);
});

test('wake with a missing shared slot consults the captured cloud ledger before creating any new decision',async()=>{
  const saved=savedSitout(),h=restoreHarness();
  h.scope.cloudSupabaseRead=async path=>path==='memory/taraCallLog'?{entries:[saved.row]}:null;h.startWake();
  await h.scope.window.listeners.focus();
  assert.deepEqual(h.scope.taraCallSnapshotRef.current.originalDecision,saved.row.originalDecision);assert.equal(h.logs.length,0);
  assert.equal(h.writes.length,1);
});

test('successful restore clears a transient restore error so it cannot become the next captured sit-out reason',async()=>{
  const h=restoreHarness({ready:true});h.startWatch();h.callbacks[0].callback(null,'error');h.run();
  assert.equal(h.scope.currentCallBlockerRef.current.code,'shared-lock-restore-error');
  await h.callbacks[0].callback(null,'ok');assert.equal(h.scope.callGateHoldRef.current,null);h.run();
  assert.equal(h.scope.taraCallSnapshotRef.current.call,'SIT_OUT');
  assert.notEqual(h.scope.taraCallSnapshotRef.current.blockedDecision.code,'shared-lock-restore-error');
  assert.doesNotMatch(h.scope.taraCallSnapshotRef.current.reason,/Shared decision read failed/);
});

test('a capture made while the fallback ledger read was in flight is restored using receipt-time validation',async()=>{
  const saved=savedSitout(),h=restoreHarness({secondsLeft:425});let resolve;
  h.scope.cloudSupabaseRead=()=>new Promise(r=>resolve=r);h.startWatch();
  const request=h.callbacks[0].callback(null,'ok');h.advance(418);h.run();assert.equal(h.logs.length,0);
  resolve({entries:[saved.row]});await request;
  assert.deepEqual(h.scope.taraCallSnapshotRef.current.originalDecision,saved.row.originalDecision);
  assert.equal(h.logs.length,0);assert.equal(h.writes.length,1);
});

test('a write whose server read spans rollover cannot insert an expired window payload',async()=>{
  const saved=savedCall(),server=memoryServer();let reads=0;
  const result=await shared.publishSharedDecision('state/currentLock_BTC_15m',doc(saved.snapshot),{
    ...server,now:()=>reads++?saved.h.close+1000:saved.h.clock});
  assert.equal(result.reason,'stale-window-payload');assert.equal(server.writes,0);
});

test('a delayed wake read failure cannot label a later window with the old restoration error',async()=>{
  const h=restoreHarness({secondsLeft:10});let reject;
  h.scope.cloudSupabaseRead=()=>new Promise((_,r)=>reject=r);h.startWake();
  const request=h.scope.window.listeners.focus();h.advance(-1);
  reject(new Error('Old window read failed'));await request;
  assert.equal(h.scope._cloudRestoreErrorRef.current,null);assert.equal(h.writes.length,0);
});
