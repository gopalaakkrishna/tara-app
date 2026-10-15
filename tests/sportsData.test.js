import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSportsBoard,sportsSettlementStatus,sportsFreshnessStatus,sportsPaperSettlementStatus,SPORTS_STALE_MS} from '../src/sportsData.js';
const board=(generated='2026-10-05T20:00:00Z')=>({generated,open:[],settled:[],record:{wins:81,losses:45}});
const response=data=>({ok:true,json:async()=>data});

test('paper health keeps future pending separate from actual overdue and scalar/cancelled from W/L',()=>{
  const data={...board(),paper_settlement:{open:{pending:559,past_date_pending:3,non_binary_resolved:19,cancelled_resolved:1,attention:[{id:1304,blocker:{code:'postponed',detail:'Rain'}}]},totals:{pending:0}}};
  const h=sportsPaperSettlementStatus(data);
  assert.equal(h.pending,559);assert.equal(h.overdue,3);assert.equal(h.nonBinary,19);assert.equal(h.cancelled,1);
  assert.equal(h.attention[0].blocker.code,'postponed');assert.deepEqual(data.record,{wins:81,losses:45});
  assert.equal(sportsPaperSettlementStatus(board()).available,false);
});

test('paper health rejects invalid counters without hiding exact reasons',()=>{
  const h=sportsPaperSettlementStatus({paper_settlement:{open:{pending:-1,past_date_pending:NaN,non_binary_resolved:Infinity,source_errors:2,attention:'bad'}}});
  assert.equal(h.pending,0);assert.equal(h.overdue,0);assert.equal(h.nonBinary,0);assert.equal(h.sourceErrors,2);assert.deepEqual(h.attention,[]);
});
test('Sports loads the live record',async()=>{
  const data=board();
  assert.deepEqual(await loadSportsBoard({fetchImpl:async()=>response(data)}),{data,warning:null});
});
test('live failure preserves cached record, never fetches old bundle',async()=>{
  const data=board();let calls=0;
  const result=await loadSportsBoard({previous:data,fetchImpl:async()=>{calls++;throw Error('offline');}});
  assert.equal(result.data,data);assert.ok(result.warning);assert.equal(calls,1);
});
test('first offline load explicitly labels bundled fallback',async()=>{
  let calls=0;const data=board();
  const result=await loadSportsBoard({fetchImpl:async()=>{if(++calls===1)throw Error('offline');return response(data);}});
  assert.equal(result.data,data);assert.ok(result.warning);
});
test('older live snapshot cannot regress a newer cached record',async()=>{
  const data=board();
  const result=await loadSportsBoard({previous:data,fetchImpl:async()=>response(board('2026-09-07T00:00:00Z'))});
  assert.equal(result.data,data);assert.ok(result.warning);
});
test('malformed live payload cannot replace valid cache',async()=>{
  const data=board();
  const result=await loadSportsBoard({previous:data,fetchImpl:async()=>response({generated:'bad'})});
  assert.equal(result.data,data);assert.ok(result.warning);
});
test('record-only refresh timestamp prevents settlement rollback',async()=>{
  const data={...board(),record_updated:'2026-10-05T21:00:00Z'};
  const result=await loadSportsBoard({previous:data,fetchImpl:async()=>response(board())});
  assert.equal(result.data,data);assert.ok(result.warning);
});
test('both sources failing with no cache rejects honestly',async()=>{
  await assert.rejects(loadSportsBoard({fetchImpl:async()=>{throw Error('offline');}}));
});
test('stalled settlement is visible even with a fresh generated timestamp',()=>{
  const data={...board(),open:[{start:'2026-09-10'},{start:'2026-10-06'}],
    settled:[{settled_at:'2026-10-05T19:00:00Z'}],disclosures:[{kind:'non-binary',id:116}]};
  const status=sportsSettlementStatus(data,Date.parse(data.generated));
  assert.equal(status.pending,2);assert.equal(status.overdue,1);
  assert.equal(status.lastSettled,Date.parse('2026-10-05T19:00:00Z'));
  assert.equal(status.nonBinary.length,1);
});
test('HTTP200 and a new record-only timestamp cannot hide delayed forecasts',async()=>{
  const now=Date.parse('2026-10-15T17:30:00Z');
  const old={...board('2026-10-15T16:00:00Z'),record_updated:new Date(now).toISOString()};
  const result=await loadSportsBoard({now,fetchImpl:async()=>response(old)});
  assert.match(sportsFreshnessStatus(result.data,now).warning,/90 minutes old/);
  assert.equal(result.data.generated,old.generated);
});
test('freshness recovers only on a genuinely fresh board and flags partial pipeline failures',()=>{
  const now=Date.parse('2026-10-15T17:30:00Z'),data=board(new Date(now).toISOString());
  assert.equal(sportsFreshnessStatus(data,now+SPORTS_STALE_MS).stale,false);
  assert.equal(sportsFreshnessStatus(data,now+SPORTS_STALE_MS+1).stale,true);
  assert.equal(sportsFreshnessStatus(data,now).warning,null);
  assert.match(sportsFreshnessStatus({...data,refresh:{status:'degraded'}},now).warning,/source errors/);
  assert.equal(sportsFreshnessStatus(board('invalid'),now).stale,true);
  assert.equal(sportsFreshnessStatus(board(new Date(now+180000).toISOString()),now).stale,true);
});
test('a newer forecast cannot roll the settled record back after a record-only refresh',async()=>{
  const data={...board('2026-10-15T16:00:00Z'),record_updated:'2026-10-15T17:00:00Z'};
  const incoming={...board('2026-10-15T17:15:00Z'),record_updated:'2026-10-15T16:30:00Z'};
  const result=await loadSportsBoard({previous:data,fetchImpl:async()=>response(incoming)});
  assert.equal(result.data,data);assert.ok(result.warning);
  const fresh=board('2026-10-15T17:20:00Z');
  assert.equal((await loadSportsBoard({previous:data,fetchImpl:async()=>response(fresh)})).data,fresh);
});
