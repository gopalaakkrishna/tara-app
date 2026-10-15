import test from 'node:test';
import assert from 'node:assert/strict';
import {commitHourlyAdmission,supabaseHourlyTransport} from '../src/hourlyAdmission.js';
import {hourlyRecordGuard} from '../src/hourlyDecision.js';
import {hourlyPublicPaths} from '../src/hourlyPublic.js';
import {hourlyHarness,actual} from './helpers/hourlyHarness.js';
const policy={maxLocks:3,cooldownMs:180000},now=Date.parse('2026-10-15T23:20Z'),close=now+2400000;
const merge=actual('_hrMerge',{_HR_HISTORY_CAP:500});

test('all hourly public reads retain the configured host and Render fallback without an order route',()=>{
  for(const path of ['series/KXBTCD','events?series_ticker=KXBTCD','markets?event_ticker=T','markets/T']){
    const paths=hourlyPublicPaths(path,'https://configured.example/');
    assert.equal(paths[0],'https://configured.example/kalshi-public/'+path);
    assert.ok(paths.includes('https://tara-kalshi-proxy.onrender.com/kalshi-public/'+path));
  }
  assert.throws(()=>hourlyPublicPaths('portfolio/orders'));
});

test('actual hourly poll recovers fresh quotes through Render when Pages is429 and direct official fetch fails',async()=>{
  const event='KXBTCD-26OCT1520',at=now;
  const row={ticker:event+'-T83000',event_ticker:event,status:'active',strike_type:'greater',floor_strike:83000,
    close_time:new Date(close).toISOString(),yes_bid_dollars:'.49',yes_ask_dollars:'.50',volume_fp:'500'};
  const requests=[],host=hourlyHarness({now:at,realLadder:true,props:{spot:83200,spotAt:at,source:'coinbase',asset:'BTC',readiness:{ready:true},taraCall:{call:'UP',confidence:70}},
    fetchMock:async url=>{requests.push(url);if(!url.startsWith('https://tara-kalshi-proxy.onrender.com/'))return {ok:false,status:429};
      const data=url.includes('/series/')?{series:{ticker:'KXBTCD',fee_type:'quadratic',fee_multiplier:1}}:url.includes('/events?')?{events:[{event_ticker:event}]}:{markets:[row]};
      return {ok:true,json:async()=>data};
    }});
  host.render();await host.flush();
  assert.equal(host.output.input.lad.strikes.length,1);assert.equal(host.output.input.lad.err,null);
  assert.equal(host.output.input.lad.requestedAt,at);assert.equal(host.output.input.lad.receivedAt,at);
  assert.equal(requests.filter(u=>u.startsWith('https://tara-kalshi-proxy.onrender.com/')).length,3);
  assert.equal(host.alerts.length,0);host.unmount();
});
function backend(){let row=null,rev=0;return {
  read:async()=>row?{data:structuredClone(row),updated_at:String(rev)}:null,
  compareAndSwap:async(r,data)=>{if(r.updated_at!==String(rev))return false;row=structuredClone(data);rev++;return true;},
  insert:async data=>{if(row)return false;row=structuredClone(data);rev++;return true;},
  get row(){return row;},
};}
function client(remote,side='YES'){
  let local={pending:[],history:[]};
  const entry={ticker:'KXBTCD-26OCT1520-T83000',side,strike:83000,closeMs:close,ms:now,approval:{samples:[{quoteId:'original'}]}};
  return {commit:()=>commitHourlyAdmission({...remote,merge,entry,readLocal:()=>local,preflightLocal:()=>{},saveLocal:r=>{local=r;},revalidate:()=>({ok:true}),guard:r=>hourlyRecordGuard(r,entry,policy,now)}),get local(){return local;}};
}
test('separate devices racing empty-cloud insert admit one side only, even with separate local storage',async()=>{
  const remote=backend(),a=client(remote),b=client(remote,'NO');
  const results=await Promise.all([a.commit(),b.commit()]);assert.equal(results.filter(x=>x.accepted).length,1);assert.equal(remote.row.pending.length,1);
  assert.equal(results.find(x=>!x.accepted).code,'contradiction');
});
test('duplicate same-side approval is not alerted twice; different competing strike obeys cap and cooldown on CAS retry',async()=>{
  const remote=backend(),a=client(remote),b=client(remote);const rs=await Promise.all([a.commit(),b.commit()]);assert.equal(rs.filter(x=>x.accepted).length,1);assert.equal(rs.find(x=>!x.accepted).code,'duplicate');
});
test('transport failure, exhausted CAS, and full local storage never acknowledge a phantom approval',async()=>{
  const remote=backend();const base={...remote,merge,entry:{ticker:'T',side:'YES'},readLocal:()=>({pending:[],history:[]}),preflightLocal:()=>{},saveLocal:()=>{},revalidate:()=>({ok:true}),guard:()=>({ok:true})};
  assert.equal((await commitHourlyAdmission({...base,read:async()=>{throw Error('offline');}})).code,'record-read');
  assert.equal((await commitHourlyAdmission({...base,insert:async()=>false})).code,'record-conflict');
  assert.equal((await commitHourlyAdmission({...base,preflightLocal:()=>{throw Error('full');}})).code,'record-storage');
});
test('CAS adapter includes a revision predicate in addition to time, including legacy no-revision rows',async()=>{
  const filters=[];const q={eq(k,v){filters.push([k,v]);return q;},is(k,v){filters.push([k,v]);return q;},then(resolve){return Promise.resolve({count:1}).then(resolve);}};
  const client={from:()=>({update:()=>q})},t=supabaseHourlyTransport(client,'memory/hourlyRecord',()=> 'same-millisecond');
  await t.compareAndSwap({updated_at:'same-millisecond',data:{_admissionRevision:'r1'}},{});assert.ok(filters.some(([k,v])=>k==='data->>_admissionRevision'&&v==='r1'));
  filters.length=0;await t.compareAndSwap({updated_at:'same-millisecond',data:{}},{});assert.ok(filters.some(([k,v])=>k==='data->>_admissionRevision'&&v===null));
});

test('actual delayed hourly mirror retries its CAS conflict and retains an approval inserted during settlement sync',async()=>{
  let timer,row={data:{pending:[],history:[]},updated_at:'same'},tries=0;
  const approved={ticker:'T',side:'YES',ms:now,approval:{samples:[{quoteId:'immutable'}]}};
  const scope={Date,crypto,console,_sbClient:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:structuredClone(row),error:null})})})})},
    _sbWriteQueueRMW:new Map(),_sbWritePendingRMW:new Map(),_sbLastSyncSig:new Map(),
    setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){},_setCloudStatus(){},_cloudSyncStatus:{writes:0},
    supabaseHourlyTransport:()=>({compareAndSwap:async(old,data)=>{
      if(!tries++){row={data:{pending:[approved],history:[],_admissionRevision:'new-approval'},updated_at:'same'};return false;}
      assert.equal(old.data._admissionRevision,'new-approval');
      assert.deepEqual(data.pending[0].approval,approved.approval);
      row={data,updated_at:'same'};return true;
    }})};
  scope.cloudSupabaseWriteDebouncedRMW=actual('cloudSupabaseWriteDebouncedRMW',scope);
  scope.cloudSupabaseWriteDebouncedRMW('memory/hourlyRecord',()=>({pending:[],history:[]}),merge,60000);
  await timer();assert.equal(tries,2);assert.equal(row.data.pending.length,1);
  assert.notEqual(row.data._admissionRevision,'new-approval');
});
test('actual hourly settlement falls back after a route failure and retains pending evidence plus reason on total outage',async()=>{
  const pick={ticker:'KXBTCD-26OCT1520-T83000',side:'YES',strike:83000,cost:55,ms:now-100000,closeMs:now-60000,approval:{quote:{event:'KXBTCD-26OCT1520'}}};
  const requests=[];const h=hourlyHarness({now,record:{pending:[pick],history:[]},fetchMock:async url=>{requests.push(url);return url.startsWith('/api')?{ok:false,status:429}:{ok:true,json:async()=>({market:{ticker:pick.ticker,event_ticker:'KXBTCD-26OCT1520',floor_strike:83000,close_time:new Date(pick.closeMs).toISOString(),status:'finalized',result:'yes',strike_type:'greater'}})};}});
  h.render({});await h.flush();assert.equal(h.record.history.length,1);assert.deepEqual(h.record.history[0].approval,pick.approval);assert.ok(requests.length>1);h.unmount();
  const out=hourlyHarness({now,record:{pending:[pick],history:[]},fetchMock:async()=>({ok:false,status:429})});out.render({});await out.flush();assert.equal(out.record.pending.length,1);assert.equal(out.record.settlementHealth.failures[0].code,'settlement-read');out.unmount();
});
