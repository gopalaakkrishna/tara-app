import test from 'node:test';
import assert from 'node:assert/strict';
import {readCapturedCallSettlement} from '../src/callSettlement.js';
import {amendCallRecord,normalizeCallLedger} from '../src/callIntegrity.js';

const entry={id:1790565588458,asset:'BTC',windowType:'15m',windowId:'15m-2026-09-28T03:15:00.000Z',dir:'UP',tier:'patient',result:null,
  originalDecision:{marketTicker:'KXBTC15M-26SEP272330-30',strike:83429.03,direction:'UP',lockedAt:1790565588458}};
const market={ticker:entry.originalDecision.marketTicker,floor_strike:83429.03,close_time:'2026-09-28T03:30:00Z',status:'finalized',result:'no'};
const now=Date.parse('2026-10-12T17:00:00Z');
const fetchMarket=(data=market)=>async url=>{
  assert.equal(url,'/api/kalshi-public/markets/KXBTC15M-26SEP272330-30');
  return {ok:true,json:async()=>({market:data})};
};
test('the stale September 27 Call resolves via its captured ticker to official LOSS',async()=>{
  const checked=await readCapturedCallSettlement(entry,{fetchImpl:fetchMarket(),now});
  assert.equal(checked.ok,true);assert.equal(checked.patch.result,'LOSS');
  const amended=amendCallRecord(entry,checked.patch,{source:'official-settlement',at:now});
  assert.equal(amended.originalDecision,entry.originalDecision);
  assert.equal(amended.recordRevisions[0].before.result,null);
  assert.equal(normalizeCallLedger([entry],[amended])[0].result,'LOSS');
});
test('an unavailable, unsettled or foreign market never fabricates a result',async()=>{
  for(const data of [{...market,result:''},{...market,status:'active'},
    {...market,ticker:'KXBTC15M-WRONG'},{...market,floor_strike:83000},{...market,close_time:'2026-09-28T03:45:00Z'}]) {
    assert.equal((await readCapturedCallSettlement(entry,{fetchImpl:fetchMarket(data),now})).ok,false);
  }
  assert.equal((await readCapturedCallSettlement(entry,{fetchImpl:async()=>{throw Error('offline');},now})).ok,false);
  assert.equal(entry.result,null);
});
test('unclosed windows and records without captured identity do not query an arbitrary market',async()=>{
  const fetchImpl=async()=>{throw Error('must not fetch');};
  assert.equal((await readCapturedCallSettlement(entry,{fetchImpl,now:Date.parse(market.close_time)})).reason,'settlement-buffer');
  assert.equal((await readCapturedCallSettlement({...entry,originalDecision:null},{fetchImpl,now})).reason,'missing-captured-ticker');
});
