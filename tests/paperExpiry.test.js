import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePaperMarketIdentity,isUnresolvedPaperFill,recoverExpiredPaperExecutions} from '../src/paperExpiry.js';
import {readExecutionJournal,readExecutionState,restoreExecutionLedger} from '../src/executionJournal.js';
const windowId='15m-2026-10-15T23:00:00.000Z',close=Date.parse('2026-10-15T23:15:00Z'),now=close+60000;
const ticker='KXBTC15M-26OCT151915-15',strike=82380.94;
const makeIntent=(patch={})=>({id:'original-intent',asset:'BTC',windowId,at:close-800000,dryRun:true,reservedDollars:1,status:'filled',filled:true,dir:'DOWN',ticker,filledCount:1,filledAtCents:71,filledFeesCents:2,...patch});
const originalCall={id:1792105240275,asset:'BTC',windowId,dir:'UP',result:'WIN',originalDecision:{marketTicker:ticker,strike,direction:'UP',lockedAt:close-800001}};
const market={ticker,event_ticker:'KXBTC15M-26OCT151915',close_time:new Date(close).toISOString(),floor_strike:strike,strike_type:'greater_or_equal',status:'finalized',result:'no'};
function setup(intent=makeIntent()){
  const values=new Map([['taraExecutionJournal_v1',JSON.stringify({schema:1,intents:{[intent.id]:intent}})]]),writes=[];
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{writes.push(k);values.set(k,v);}};
  const args={storage,now,readOriginalCalls:async()=>[structuredClone(originalCall)],readMarket:async()=>structuredClone(market),withLock:async(_name,fn)=>fn()};
  return {storage,values,writes,args,entry:()=>readExecutionJournal(storage).intents[intent.id]};
}
test('legacy stranded paper fill recovers from original Call, settles own side with actual fee and no new intent',async()=>{
  const h=setup(),before=structuredClone(h.entry()),callBefore=JSON.stringify(originalCall);
  const r=await recoverExpiredPaperExecutions(h.args);
  assert.equal(r.settled.length,1);assert.equal(h.entry().status,'settled');assert.equal(h.entry().settlementResult,'WIN');assert.equal(h.entry().realizedPnLDollars,.27);
  assert.equal(h.entry().settlementPayoutDollars,1);assert.equal(h.entry().officialSettlement.ticker,ticker);assert.equal(h.entry().officialSettlement.strike,strike);
  for(const [key,v] of Object.entries(before))if(key!=='status')assert.deepEqual(h.entry()[key],v,key);
  assert.equal(Object.keys(readExecutionJournal(h.storage).intents).length,1);assert.equal(JSON.stringify(originalCall),callBefore);
  assert.equal(h.entry().paperMarketIdentity.source,'original-call-recovery');assert.equal(restoreExecutionLedger(h.storage)['BTC|'+windowId].stakeDollars,.71);
  const saved=h.values.get('taraExecutionJournal_v1');const again=await recoverExpiredPaperExecutions(h.args);assert.equal(again.settled.length,0);assert.equal(h.values.get('taraExecutionJournal_v1'),saved);
});
test('captured identity needs no cloud lookup; losing/YES and winning/NO use the original fill, never Call WIN',async()=>{
  for(const [dir,outcome,pnl] of [['UP','LOSS',-.73],['DOWN','WIN',.27]]){
    const identity=capturePaperMarketIdentity({ticker,windowId,asset:'BTC',strike});
    const h=setup(makeIntent({dir,paperMarketIdentity:identity}));h.args.readOriginalCalls=()=>{throw Error('no cloud read needed');};
    await recoverExpiredPaperExecutions(h.args);assert.equal(h.entry().settlementResult,outcome);assert.equal(h.entry().realizedPnLDollars,pnl);
  }
});
test('real money, already-exited paper, and unclosed paper are never fetched, rewritten or credited',async()=>{
  for(const patch of [{dryRun:false},{dryRun:undefined},{status:'exited',realizedPnLDollars:-.42}]){
    const h=setup(makeIntent(patch)),before=h.values.get('taraExecutionJournal_v1');h.args.readMarket=()=>{throw Error('must not read');};
    await recoverExpiredPaperExecutions(h.args);assert.equal(h.writes.length,0);assert.equal(h.values.get('taraExecutionJournal_v1'),before);
  }
  const h=setup();await recoverExpiredPaperExecutions({...h.args,now:close+29999});assert.equal(h.writes.length,0);assert.equal(isUnresolvedPaperFill(makeIntent()),true);
});
test('wrong exact ticker, event, strike, close, series, scalar and unofficial outcome stay pending',async()=>{
  for(const patch of [{ticker:'KXBTC15M-OTHER'},{event_ticker:'OTHER'},{floor_strike:1},{close_time:new Date(close+900000).toISOString()},{result:'scalar'},{result:''},{status:'active'},{strike_type:'between'}]){
    const h=setup();h.args.readMarket=async()=>({...market,...patch});await recoverExpiredPaperExecutions(h.args);assert.equal(h.entry().status,'filled',JSON.stringify(patch));assert.equal(h.writes.length,0);
  }
  assert.equal(capturePaperMarketIdentity({ticker:'KXETH15M-X',windowId,asset:'BTC',strike}),null);
});
test('missing/ambiguous original capture is not filled from current market prices or another record',async()=>{
  for(const calls of [[],[{...originalCall,originalDecision:{marketTicker:'OTHER',strike}}],[originalCall,{...originalCall,id:99,originalDecision:{...originalCall.originalDecision,strike:1}}]]){
    const h=setup();h.args.readOriginalCalls=async()=>calls;h.args.readMarket=()=>{throw Error('identity first');};const r=await recoverExpiredPaperExecutions(h.args);assert.equal(r.settled.length,0);assert.equal(h.writes.length,0);
  }
});
test('unavailable market retries later without discarding the original intent',async()=>{
  const h=setup();h.args.readMarket=async()=>{throw Error('offline');};const failed=await recoverExpiredPaperExecutions(h.args);assert.equal(failed.settled.length,0);assert.equal(h.entry().status,'filled');
  h.args.readMarket=async()=>market;assert.equal((await recoverExpiredPaperExecutions(h.args)).settled.length,1);
});
test('a concurrent early exit wins over a delayed official read',async()=>{
  const h=setup();h.args.readMarket=async()=>{const j=readExecutionJournal(h.storage);j.intents['original-intent']={...j.intents['original-intent'],status:'exited',realizedPnLDollars:-.42};h.storage.setItem('taraExecutionJournal_v1',JSON.stringify(j));return market;};
  const r=await recoverExpiredPaperExecutions(h.args);assert.equal(r.settled.length,0);assert.equal(h.entry().status,'exited');assert.equal(h.entry().realizedPnLDollars,-.42);
});
test('matching held paper state becomes terminal; another active state and every real state remain untouched',async()=>{
  for(const mode of ['matching','other','real']){
    const h=setup(),s={status:'filled',intentId:mode==='other'?'new-intent':'original-intent',ticker,dryRun:mode!=='real',windowId};h.storage.setItem('taraExecutionState_v1',JSON.stringify(s));
    await recoverExpiredPaperExecutions(h.args);const saved=JSON.parse(h.storage.getItem('taraExecutionState_v1'));
    if(mode==='matching'){assert.equal(saved.status,'exited');assert.equal(saved.exitReason,'paper-official-settlement');assert.equal(readExecutionState(h.storage).realizedPnLDollars,.27);}else assert.deepEqual(saved,s);
  }
});
test('unknown fill fees never become zero fees, and full storage/absent lock fail closed',async()=>{
  const h=setup(makeIntent({filledFeesCents:null}));await recoverExpiredPaperExecutions(h.args);assert.equal(h.entry().status,'settled');assert.equal(h.entry().realizedPnLDollars,null);
  const quota=setup();quota.storage.setItem=()=>{throw Error('full');};assert.equal((await recoverExpiredPaperExecutions(quota.args)).settled.length,0);assert.equal(quota.entry().status,'filled');
  const unlocked=setup();await recoverExpiredPaperExecutions({...unlocked.args,withLock:null});assert.equal(unlocked.writes.length,0);
});
test('settled journal survives one failed state write and repairs the same state on a later tick',async()=>{
  const h=setup();h.storage.setItem('taraExecutionState_v1',JSON.stringify({status:'filled',intentId:'original-intent',ticker,dryRun:true}));
  const write=h.storage.setItem;h.storage.setItem=(k,v)=>{if(k==='taraExecutionState_v1')throw Error('quota');write(k,v);};
  await recoverExpiredPaperExecutions(h.args);assert.equal(h.entry().status,'settled');
  h.storage.setItem=write;h.args.readMarket=()=>{throw Error('already final');};await recoverExpiredPaperExecutions(h.args);assert.equal(readExecutionState(h.storage).status,'exited');
});

test('two recovery workers serialize the final write; immutable fill changes and in-flight exits stay protected',async()=>{
  const h=setup();let tail=Promise.resolve();h.args.withLock=(_name,fn)=>{const run=tail.then(fn);tail=run.catch(()=>{});return run;};
  const results=await Promise.all([recoverExpiredPaperExecutions(h.args),recoverExpiredPaperExecutions(h.args)]);
  assert.equal(results.reduce((s,r)=>s+r.settled.length,0),1);assert.equal(h.writes.filter(k=>k==='taraExecutionJournal_v1').length,1);
  for(const mode of ['changed-fill','exiting']){
    const q=setup();q.args.readMarket=async()=>{
      if(mode==='changed-fill'){const j=readExecutionJournal(q.storage);j.intents['original-intent'].filledAtCents=75;q.storage.setItem('taraExecutionJournal_v1',JSON.stringify(j));}
      else q.storage.setItem('taraExecutionState_v1',JSON.stringify({intentId:'original-intent',ticker,dryRun:true,status:'exiting'}));
      return market;
    };
    assert.equal((await recoverExpiredPaperExecutions(q.args)).settled.length,0);assert.equal(q.entry().status,'filled');
  }
});
