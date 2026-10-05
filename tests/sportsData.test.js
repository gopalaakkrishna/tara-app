import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSportsBoard,sportsSettlementStatus} from '../src/sportsData.js';
const board=(generated='2026-10-05T20:00:00Z')=>({generated,open:[],settled:[],record:{wins:81,losses:45}});
const response=data=>({ok:true,json:async()=>data});
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
