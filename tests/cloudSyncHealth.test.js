import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudSyncHealth} from '../src/cloudSyncHealth.js';
import {callLogPublicationKey} from '../src/callLogSync.js';
test('Call write timeout cannot be cleared by an unrelated successful cloud operation',()=>{
 const error={path:'memory/taraCallLog',message:'statement timeout',at:100};
 let s=cloudSyncHealth({}, {state:'error',lastError:error});
 for(const patch of [{state:'ok',lastOk:101},{state:'ok',path:'state/currentLock_BTC_15m'},{state:'writing'}]){
  s=cloudSyncHealth(s,patch);assert.equal(s.state,'error');assert.deepEqual(s.lastError,error);
 }
 s=cloudSyncHealth(s,{state:'ok',path:'memory/taraCallLog',lastOk:102});
 assert.equal(s.state,'ok');assert.deepEqual(s.recordWriteErrors,{});
});
test('separate hourly/Call failures each require their own acknowledged recovery',()=>{
 let s={};for(const path of ['memory/taraCallLog','memory/hourlyRecord'])s=cloudSyncHealth(s,{state:'error',lastError:{path,at:1}});
 s=cloudSyncHealth(s,{state:'ok',path:'memory/taraCallLog'});assert.equal(s.state,'error');
 assert.equal(s.lastError.path,'memory/hourlyRecord');
 s=cloudSyncHealth(s,{state:'ok',path:'memory/hourlyRecord'});assert.equal(s.state,'ok');
});
test('only new captures and durable same-ID lifecycle evidence expedite publication',()=>{
 const e={id:1,asset:'BTC',windowId:'15m-a',originalDecision:{capturedAt:1,direction:'UP'},result:null};
 const key=callLogPublicationKey([e]);
 assert.equal(key,callLogPublicationKey([{...e,timeSeries:[1,2],reasoning:'live tick'}]));
 for(const patch of [{result:'WIN',resolvedAt:2},{result:'SITOUT'},{blockedDecision:{code:'cutoff'}},{recordRevisions:[{at:3}]},{originalDecision:{...e.originalDecision,reason:'capture'}}])assert.notEqual(key,callLogPublicationKey([{...e,...patch}]));
 assert.notEqual(key,callLogPublicationKey([e,{...e,id:2,windowId:'15m-b'}]));
});
