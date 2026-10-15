import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
import {gradeWeatherPick,mergeWeatherRecords} from '../src/weatherRecord.js';
import {primaryShadowView} from '../src/primaryShadow.js';
import {boundedCallCache,persistCallCaches,updateIndexedRecord,mergeDurableCallArchive} from '../src/callStorage.js';
import {lifecycleAuditState} from '../src/lifecycleAudit.js';
import {assessHourlyPick,readHourlyPolicy} from '../src/hourlyDecision.js';
import {app,compile,makeHarness} from './helpers/callDecisionHarness.js';
import {acknowledgeCapturedCalls,CALL_CAPTURE_JOURNAL} from '../src/callCaptureJournal.js';
import {actual} from './helpers/hourlyHarness.js';
import * as callIntegrity from '../src/callIntegrity.js';
const traverse=traverseModule.default||traverseModule;
const close=Date.parse('2026-10-15T07:00:00Z');
const pick={ticker:'KXHIGHNY-26OCT15-T70',side:'YES',price:60,dayKey:'2026-10-15',closeMs:close,atMs:close-60000,
  learningCapture:{original:'never rewrite'}};
const market={ticker:pick.ticker,status:'finalized',result:'yes',close_time:new Date(close).toISOString()};
const storage=(initial={})=>{const map=new Map(Object.entries(initial));return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map};};

test('actual Weather grader rejects wrong identities and unknown outcomes, not synthetic wins or voids',()=>{
  const grade=actual('_wxGrade',{gradeWeatherPick});
  for(const change of [{ticker:'other'},{result:''},{result:'scalar'},{status:'active'},
    {close_time:new Date(close+60000).toISOString()},{close_time:null}])
    assert.equal(grade(pick,{...market,...change}),null);
  assert.equal(gradeWeatherPick(pick,market,close-1),null);
  const won=gradeWeatherPick(pick,market,close+1000);
  assert.equal(won.result,'win');assert.equal(won.pnl,38);assert.equal(won.officialSettlement.ticker,pick.ticker);
  assert.deepEqual(won.learningCapture,pick.learningCapture);
  assert.equal(gradeWeatherPick({...pick,side:'NO'},market,close+1000).result,'loss');
});
test('actual Weather settlement retries the official exact ticker after an invalid proxy response',async()=>{
  const calls=[],settle=actual('_wxSettleOne',{encodeURIComponent,_wxGrade:(p,m)=>gradeWeatherPick(p,m,close+1000),
    _wxJson:async url=>{calls.push(url);return{ok:true,data:{market:calls.length===1?{...market,ticker:'foreign'}:market}};}});
  const result=await settle(pick);assert.equal(calls.length,2);assert.equal(result.result,'win');
  assert.ok(calls.every(url=>url.includes(encodeURIComponent(pick.ticker))));assert.equal(result.officialSettlement.ticker,pick.ticker);
});

test('Weather merge preserves both devices, original price/evidence, terminal results, and all pending picks',()=>{
  const first={...pick,atMs:100,price:60},other={...pick,ticker:'other',atMs:101};
  const terminal={...first,atMs:200,price:99,result:'win',pnl:38,settledAt:300,learningCapture:{wrong:'later'}};
  const merge=(a,b)=>mergeWeatherRecords(a,b,{cap:1});
  const combined=merge({picks:[first]},{picks:[other,terminal]});
  assert.equal(combined.picks.length,2);const saved=combined.picks.find(p=>p.ticker===first.ticker);
  assert.equal(saved.result,'win');assert.equal(saved.price,60);assert.equal(saved.atMs,100);
  assert.deepEqual(saved.learningCapture,first.learningCapture);
  assert.equal(merge(combined,{picks:[first]}).picks.find(p=>p.ticker===first.ticker).result,'win');
  const pending=Array.from({length:405},(_,i)=>({...pick,ticker:'open'+i,atMs:i}));
  assert.equal(merge({picks:pending},{picks:[]}).picks.length,405);
  assert.equal(mergeWeatherRecords({picks:[terminal]},{picks:[]},{cap:0}).picks.length,0);
});

test('actual Weather save queues conditional merge of fresh local state, not a last-writer replacement',()=>{
  const store=storage(),writes=[],scope={localStorage:store,_WX_LEDGER_KEY:'wx',_WX_LEDGER_PATH:'memory/weatherPicks',
    _WX_PICK_CAP:400,_wxTickerDay:()=>null,mergeWeatherRecords,_wxMemoryLedger:null,
    cloudWriteDebounced(){throw Error('Unsafe replacement');},
    cloudWriteDebouncedRMW:(path,get,merge,delay)=>writes.push({path,get,merge,delay})};
  scope._wxLedgerMerge=actual('_wxLedgerMerge',scope);scope._wxLedgerLoad=()=>JSON.parse(store.getItem('wx')||'{"picks":[]}');
  const save=actual('_wxLedgerSave',scope);save({picks:[pick]});
  assert.equal(writes.length,1);assert.equal(writes[0].path,'memory/weatherPicks');
  const peer={...pick,ticker:'peer'};assert.equal(writes[0].merge({picks:[peer]},writes[0].get()).picks.length,2);
  save({picks:[pick,peer]},{sync:false});assert.equal(writes.length,1,'peer hydration does not echo a stale payload');
});

test('advisory mirror uses primary output exactly, never fake flow, soft commitments or a second scoring pass',()=>{
  const args={analysis:{rawProbAbove:0,regime:'RANGE-CHOP'},price:80000,strike:80100,windowId:'15m-test',now:100,ready:true,spotAt:99};
  const v=primaryShadowView(args);assert.equal(v.posterior,0);assert.equal(v.confidence,100);assert.equal(v.leanDir,'DOWN');
  assert.equal(v.mode,'primary-mirror');assert.equal(v.committedDir,null);
  assert.equal(v.updatedAt,99);assert.equal(primaryShadowView({...args,now:20000}),null);
  assert.equal(primaryShadowView({...args,ready:false}),null);
  for(const analysis of [null,{rawProbAbove:NaN},{rawProbAbove:60,prediction:'ERROR'}])
    assert.equal(primaryShadowView({...args,analysis}),null);
  const ast=parse(app,{sourceType:'module',plugins:['jsx']});let calls=0;
  traverse(ast,{CallExpression(p){if(p.node.callee.name==='computeV99Posterior')calls++;}});
  assert.equal(calls,1,'only the primary engine computes a posterior');
  assert.doesNotMatch(app,/setInterval\(_runShadow/);
  assert.match(app,/const view=primaryShadowView\(\{analysis/);
});

test('budgeted caches keep whole evidence, all pending rows and accurate counts after verified archive save',()=>{
  const rows=Array.from({length:100},(_,i)=>({id:i,asset:'BTC',windowType:'15m',windowId:'window'+i,
    result:i===0?null:'WIN',originalDecision:{reason:'x'.repeat(100),id:i}}));
  const original=JSON.stringify(rows),store=storage();
  const status=persistCallCaches(store,rows,{archiveSaved:true,deepChars:3000,fastChars:600});
  assert.equal(status.state,'ok');assert.ok(status.deepRows<100);assert.ok(status.fastRows<status.deepRows);
  const deep=JSON.parse(store.getItem('taraCallLog_deep'));
  assert.equal(Number(store.getItem('taraCallLog_deepCount')),deep.length);
  assert.equal(deep.find(e=>e.id===0).result,null);assert.deepEqual(deep[0].originalDecision,rows[0].originalDecision);
  assert.equal(JSON.stringify(rows),original);assert.ok(store.getItem('taraCallLog_deep').length<=3000);
  assert.equal(boundedCallCache([{originalDecision:{large:'x'.repeat(1000)}}],100),null);
});

test('archive failure or quota never evicts the only old cache or claims saved history',()=>{
  const old=[{id:1,windowType:'15m',windowId:'old',result:'WIN'}],store=storage({taraCallLog_deep:JSON.stringify(old)});
  const status=persistCallCaches(store,[{id:2,windowType:'15m',windowId:'new',result:null}],{archiveSaved:false});
  assert.equal(status.state,'degraded');assert.deepEqual(JSON.parse(store.getItem('taraCallLog_deep')),old);
  const quota=persistCallCaches({getItem:()=>null,setItem(){throw Error('quota');}},old,{archiveSaved:true});
  assert.equal(quota.state,'degraded');assert.equal(quota.fastRows,0);
});
test('actual local persistence retries failed archive/quota writes without another Call and preserves journal recovery',async()=>{
  const h=makeHarness();h.run();let failing=true;const timers=[],statuses=[];
  const local={getItem:k=>h.storage.get(k)??null,setItem:(k,v)=>{if(failing)throw Error('quota');h.storage.set(k,v);}};
  const a=app.indexOf('    let _persistCancelled=false;'),b=app.indexOf('    const _persistTimer=setTimeout',a);
  const run=compile('let _lastLocalPersistAt=0;'+app.slice(a,b),'return _persistLocal;')({Date,
    CALL_EVIDENCE_FIELDS:callIntegrity.CALL_EVIDENCE_FIELDS,_MINI_AUDITED:true,_MINI_DROP_OK:new Set(),console,
    taraCallLog:h.logs,TARA_CALL_LOG_CAP:1000,localStorage:local,sessionStorage:storage(),
    _mergeCallLogEntries:mergeDurableCallArchive,_openIDB:()=>null,_IDB_STORE:'callLog',persistCallCaches,
    updateIndexedRecord:async(open,store,key,merge)=>failing?{ok:false,error:'disk abort'}:{ok:true,value:merge([])},
    setCallStorageStatus:s=>statuses.push(s),setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},acknowledgeCapturedCalls});
  await run();assert.equal(statuses.at(-1).state,'degraded');assert.equal(timers[0].ms,10000);
  assert.equal(JSON.parse(local.getItem(CALL_CAPTURE_JOURNAL)).length,1);
  failing=false;timers.shift().fn();await new Promise(r=>setImmediate(r));
  assert.equal(statuses.at(-1).state,'ok');assert.equal(statuses.at(-1).archiveRows,1);
  assert.equal(JSON.parse(local.getItem(CALL_CAPTURE_JOURNAL)).length,0);
  assert.equal(JSON.parse(local.getItem('taraCallLog_v1')).length,1);
  assert.ok(app.includes('clearTimeout(_archiveRetryTimer)'));
});

function indexedFake({abort=false}={}){
  let value=[{id:1}],written,request,transaction;
  const db={transaction(name,mode){assert.equal(mode,'readwrite');transaction={
    objectStore(){return{get(){request={};queueMicrotask(()=>{request.result={value};request.onsuccess();});return request;},
      put(record){written=record;queueMicrotask(()=>{if(abort){transaction.error={message:'disk abort'};transaction.onabort();}
        else{value=record.value;transaction.oncomplete();}});return {onsuccess:null};}}},abort(){this.onabort?.();}};return transaction;}};
  return{open:async()=>db,get written(){return written;}};
}
test('durable writer waits for transaction completion and reports a later abort as failure',async()=>{
  for(const abort of [false,true]){const db=indexedFake({abort});const r=await updateIndexedRecord(db.open,'callLog','log',old=>[...old,{id:2}],10);
    assert.equal(r.ok,!abort);assert.equal(db.written.value.length,2);if(!abort)assert.equal(r.value.length,2);}
});
test('all archive writers retain older rows and cannot erase original evidence or verified settlement',()=>{
  const original={direction:'UP',windowId:'15m-2026-10-15T06:15:00.000Z',provenance:'captured-at-lock'};
  const settled={id:1,asset:'BTC',windowType:'15m',windowId:original.windowId,dir:'UP',result:'WIN',originalDecision:original,
    officialSettlement:{source:'kalshi-public-api',ticker:'exact'}};
  const next=mergeDurableCallArchive([settled],[{...settled,result:null,originalDecision:{wrong:true},officialSettlement:null},
    {id:2,windowId:'15m-2026-10-15T06:30:00.000Z',dir:'SIT_OUT',windowType:'15m',result:'SITOUT'}]);
  assert.equal(next.length,2);assert.equal(next[0].result,'WIN');assert.deepEqual(next[0].originalDecision,original);
  assert.equal(next[0].officialSettlement.ticker,'exact');
});

test('archive merge has no rolling cap and cannot overwrite old originals or verified outcomes',()=>{
  const body=app.slice(app.indexOf('  const _mergeCallLogEntries='),app.indexOf('  const[callStorageStatus',app.indexOf('  const _mergeCallLogEntries=')));
  const {normalizeCallLedger,CALL_EVIDENCE_FIELDS}=callIntegrity;
  const merge=compile(body,'return _mergeCallLogEntries;')({React:{useCallback:fn=>fn},normalizeCallLedger,CALL_EVIDENCE_FIELDS,TARA_CALL_LOG_CAP:2,_auditLogEvent(){}});
  const prior=Array.from({length:4},(_,i)=>({id:i+1,windowId:'15m-'+new Date(close+i*900000).toISOString(),windowType:'15m',dir:'SIT_OUT',result:'SITOUT'}));
  assert.equal(merge(prior,[],{cap:Infinity}).length,4);assert.equal(merge(prior,[]).length,2);
});

test('canonical membership confirms every logger route; provisional snapshots are not missing trades',()=>{
  const rec={wid:'15m-test',asset:'BTC',snapshotSets:[{call:'UP'}],logCalls:[],logConfirmedAt:null};
  assert.equal(lifecycleAuditState(rec,[]).diagnosis,'candidate-only-not-committed');
  const row={id:1,windowId:rec.wid,asset:'BTC',dir:'UP'};
  assert.equal(lifecycleAuditState(rec,[row],100).diagnosis,'ok');assert.equal(lifecycleAuditState(rec,[row],100).logConfirmedAt,100);
  assert.equal(lifecycleAuditState({...rec,snapshotSets:[{committed:true}]},[]).diagnosis,'committed-snapshot-without-record');
  assert.equal(lifecycleAuditState({...rec,logCalls:[{}]},[]).diagnosis,'log-called-but-not-confirmed');
  assert.equal(lifecycleAuditState({...rec,logConfirmedAt:5},[]).diagnosis,'ok');
});

test('a distant future ladder reports unavailable current-hour coverage without changing entry policy',()=>{
  const now=close-600000,policy=readHourlyPolicy({getItem:()=>null});
  const input={now,enabled:true,spot:80000,spotAt:now,readiness:{ready:true},record:{history:[],pending:[]},
    signal:{call:'UP',confidence:80},lad:{sampleId:'poll',requestedAt:now,receivedAt:now,event:'KXBTCD-next',closeMs:close+14*3600000,strikes:[{}]}};
  const r=assessHourlyPick(input,policy,()=>.9);assert.equal(r.code,'market-unavailable');assert.match(r.reason,/No current-hour/);
  assert.equal(policy.maxMinsLeft,40);assert.equal(policy.confirmTicks,3);
});

test('hourly has a single workspace-independent decision owner; placement changes only presentation',()=>{
  const ast=parse(app,{sourceType:'module',plugins:['jsx']});let owners=0;
  traverse(ast,{CallExpression(p){if(p.node.callee.name==='useHourlyEngine'){owners++;assert.equal(p.getFunctionParent().node.id.name,'TaraApp');}}});
  assert.equal(owners,1);const a=app.indexOf('function HourlyLadderPanel({engine})'),b=app.indexOf('\nfunction ',a+1);
  const panel=app.slice(a,b);assert.doesNotMatch(panel,/useHourlyRecord\(|useHourlyLadder\(|advanceHourlyConfirmation\(/);
  assert.match(app,/hourlyContext=\{\{engine:_hourlyEngine\}\}/);
});
