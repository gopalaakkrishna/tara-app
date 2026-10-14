import test from 'node:test';import assert from 'node:assert/strict';
import {capturedReason,recordVersion,presentationRows,evidenceCohort} from '../src/presentationEvidence.js';
import {captureOriginalDecision,settlementPatch} from '../src/callIntegrity.js';
const row=(dir='UP',result='WIN')=>({asset:'BTC',windowType:'15m',dir,result,reason:'changed live reason',originalDecision:{provenance:'captured-at-lock',direction:dir,signalScore:72,secondsLeft:495,modelVersion:'2026.10.13-v14.4.10-hourly-fresh-approval',reason:'original reason',marketTicker:'KXBTC15M-test',yesBid:62,yesAsk:64},officialSettlement:{source:'kalshi-public-api',ticker:'KXBTC15M-test',result:dir==='UP'?(result==='WIN'?'yes':'no'):(result==='WIN'?'no':'yes')}});
test('version and reason prefer original capture and expose missing evidence',()=>{assert.equal(recordVersion(row()),'14.4.10');assert.equal(capturedReason(row()),'original reason');assert.equal(recordVersion({}),'Unknown');assert.equal(capturedReason({}), 'No captured reason available.');assert.equal(recordVersion({approval:{modelVersion:'TARA 14.5.0'}}),'14.5.0');});
test('version/window/asset filters never mutate or drop unknown records from all',()=>{const a=row(),b={...row(),asset:'ETH'},c={...row(),originalDecision:null};const data=[a,b,c];assert.equal(presentationRows(data,{asset:'BTC',windowType:'15m'}).length,2);assert.equal(presentationRows(data,{version:'14.4.10'}).length,2);assert.equal(data.length,3);assert.equal(a.reason,'changed live reason');});
test('return estimate correctly prices DOWN and subtracts rounded fees',()=>{const u=evidenceCohort([row()]),d=evidenceCohort([row('DOWN')]);assert.equal(u.estimatedNet,34);assert.equal(d.estimatedNet,60);assert.equal(u.priced,1);assert.equal(d.priced,1);assert.equal(d.winRate,100);});
test('missing, stale identity, amended and contradictory official evidence cannot be priced',()=>{const variants=[{...row(),manualEdit:true},{...row(),officialSettlement:null},{...row(),officialSettlement:{source:'kalshi-public-api',ticker:'other',result:'yes'}},{...row(),originalDecision:{...row().originalDecision,provenance:'legacy-observed'}},{...row(),officialSettlement:{...row().officialSettlement,result:'no'}}];const c=evidenceCohort(variants);assert.equal(c.priced,0);assert.equal(c.estimatedNet,null);});
test('sit-out blockers retain the actual gate and unavailable trace stays explicit',()=>{const c=evidenceCohort([{dir:'SIT_OUT',result:'SITOUT',originalDecision:{blockedDecision:{code:'timing-confidence',reason:'Observed 61; required 65'}}},{dir:'SIT_OUT',result:'SITOUT',reason:'forming'}]);assert.equal(c.sitouts,2);assert.equal(c.settled,0);assert.equal(c.blockers[0].reason,'Observed 61; required 65');assert.equal(c.blockers[1].code,'uncaptured');assert.equal(c.winRate,null);});
test('legacy missing timing and score stay unavailable; historical late locks remain visible',()=>{const a={...row(),originalDecision:null},b=row();b.originalDecision.secondsLeft=410;const c=evidenceCohort([a,b]);assert.equal(c.timing[0].label,'Capture time unavailable');assert.equal(c.timing[1].label,'<7m / historical');assert.equal(c.confidence[0].label,'Score unavailable');});
test('the real settlement writer outcomeDir is understood and a wrong-close or contradictory result is excluded',()=>{
  const start=Date.parse('2026-01-01T00:00:00Z'),close=start+900000;
  const e={asset:'BTC',windowType:'15m',windowId:'15m-2026-01-01T00:00:00.000Z',dir:'DOWN',lockedAt:start+180000,
    atSecondsLeft:720,strike:84000,marketTicker:'KXBTC15M-TEST',marketCloseTime:new Date(close).toISOString(),kalshiBidAtLock:54,kalshiAskAtLock:56};
  e.originalDecision=captureOriginalDecision(e,{now:e.lockedAt});
  Object.assign(e,settlementPatch(e,{ticker:e.marketTicker,close_time:e.marketCloseTime,status:'settled',result:'no',floor_strike:84000},close+1000).patch);
  assert.equal(e.officialSettlement.result,undefined);assert.equal(evidenceCohort([e]).priced,1);assert.equal(evidenceCohort([e]).estimatedNet,52);
  assert.equal(evidenceCohort([{...e,officialSettlement:{...e.officialSettlement,result:'yes'}}]).priced,0);
  assert.equal(evidenceCohort([{...e,officialSettlement:{...e.officialSettlement,closeTime:new Date(close+900000).toISOString()}}]).priced,0);
  assert.equal(evidenceCohort([{...e,windowId:'malformed'}]).priced,0);
  assert.equal(evidenceCohort([{...e,recordRevisions:[{}]}]).priced,0);
  assert.equal(evidenceCohort([{...e,officialSettlement:{...e.officialSettlement,result:'unknown'}}]).priced,0);
});
