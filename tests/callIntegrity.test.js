import test from 'node:test';
import assert from 'node:assert/strict';
import {amendCallRecord, captureOriginalDecision, hydrateDecisionQuote, inspectDecisionQuote, isScoredCall, normalizeCallLedger, repairCallRecord, settlementPatch} from '../src/callIntegrity.js';

const start=Date.parse('2026-09-27T00:00:00Z'),now=start+120000,windowId='15m-2026-09-27T00:00:00.000Z';
const quote={ticker:'KXBTC15M-26SEP262015-15',closeTime:'2026-09-27T00:15:00Z',at:now,bid:60,ask:62,mid:61,strike:75000};
const context={windowId,asset:'BTC',now,quote};
const entry={id:now,windowId,windowType:'15m',asset:'BTC',dir:'UP',call:'UP',result:null,strikeAtLock:75000,marketTicker:quote.ticker};
const market={ticker:quote.ticker,close_time:quote.closeTime,floor_strike:75000,result:'yes',status:'settled'};

test('hydrates the late-force snapshot before the missing-price guard',()=>{
  const snapshot={call:'UP',locked:true};
  const prepared=hydrateDecisionQuote(snapshot,context);
  assert.equal(prepared.kalshiAtLock,61);
  assert.equal(prepared.marketTicker,quote.ticker);
  assert.equal(prepared.kalshiAskAtLock,62);
  assert.equal(snapshot.kalshiAtLock,undefined);
});
test('stale, future, wrong-window, wrong-asset, closed and malformed quotes cannot hydrate or execute',()=>{
  for(const q of [{...quote,at:now-31000},{...quote,at:now+3000},{...quote,closeTime:'2026-09-27T00:30:00Z'},{...quote,ticker:'KXETH15M-26SEP262015-15'},{...quote,bid:null},{...quote,bid:0},{...quote,ask:100},{...quote,bid:65,ask:60},{...quote,closeTime:null}]){
    assert.equal(inspectDecisionQuote(q,context).ok,false,JSON.stringify(q));
    assert.equal(hydrateDecisionQuote({call:'UP'}, {...context,quote:q}).kalshiAtLock,undefined);
  }
  assert.equal(inspectDecisionQuote(quote,{...context,now:start+900000}).ok,false);
});
test('a snapshot price is not retroactively replaced with a later quote',()=>{
  assert.equal(hydrateDecisionQuote({kalshiAtLock:55},context).kalshiAtLock,55);
  assert.equal(hydrateDecisionQuote({originalDecision:{yesPrice:null}},context).kalshiAtLock,undefined);
});
test('SIT_OUT results never enter the directional win/loss denominator',()=>{
  assert.equal(isScoredCall({...entry,result:'WIN'}),true);
  for(const result of ['WIN','LOSS'])assert.equal(isScoredCall({...entry,dir:'SIT_OUT',result}),false);
  assert.equal(isScoredCall({...entry,result:'LOSS',recordIntegrity:{status:'review-required'}}),false);
});
test('malformed sit-out repair preserves the original and a correction trail',()=>{
  const broken={...entry,dir:'SIT_OUT',call:'SIT_OUT',result:'LOSS'};
  const repaired=repairCallRecord(broken);
  assert.equal(broken.result,'LOSS');
  assert.equal(repaired.result,'SITOUT');
  assert.equal(repaired.recordRevisions[0].before.result,'LOSS');
  assert.equal(repairCallRecord(repaired),repaired);
});
test('official scoring requires exact market identity, time and legacy strike',()=>{
  assert.equal(settlementPatch(entry,market,start+1000000).patch.result,'WIN');
  assert.equal(settlementPatch({...entry,dir:'SIT_OUT'},market,start+1000000).patch.result,'SITOUT');
  assert.equal(settlementPatch(entry,{...market,ticker:'KXBTC15M-WRONG'},start+1000000).ok,false);
  assert.equal(settlementPatch(entry,{...market,status:'active'},start+1000000).ok,false);
  assert.equal(settlementPatch(entry,market,now).ok,false);
  assert.equal(settlementPatch({...entry,marketTicker:null,strikeAtLock:76000},market,start+1000000).reason,'strike-mismatch');
});
test('original lock stays unchanged after a settlement or manual correction',()=>{
  const original=captureOriginalDecision(entry,{now});
  const before={...entry,originalDecision:original};
  const after=amendCallRecord(before,{result:'WIN'},{source:'official-settlement',at:start+1000000});
  assert.equal(after.originalDecision,original);
  assert.equal(after.recordRevisions[0].before.result,null);
  assert.equal(before.result,null);
});
test('historical strike mismatches are quarantined, matching-strike corrections are auditable',()=>{
  const wrong={id:1787532681706,windowId:'15m-2026-08-24T00:45:00.000Z',asset:'BTC',windowType:'15m',dir:'UP',result:'LOSS',strikeAtLock:77413.14};
  assert.equal(repairCallRecord(wrong).result,'LOSS');
  assert.equal(repairCallRecord(wrong).recordIntegrity.status,'review-required');
  const matched={id:1787711605089,windowId:'15m-2026-08-26T02:30:00.000Z',asset:'BTC',windowType:'15m',dir:'UP',result:'WIN',strikeAtLock:79216.71};
  const fixed=repairCallRecord(matched);
  assert.equal(fixed.result,'LOSS');
  assert.equal(fixed.officialSettlement.outcomeDir,'DOWN');
  assert.equal(fixed.recordRevisions[0].before.result,'WIN');
});
test('ledger captures once and preserves evidence through compacted cloud restores',()=>{
  const first=normalizeCallLedger([entry],[],null,now)[0];
  const updated=normalizeCallLedger([{...entry,result:'WIN'}],[first],null,now+1000)[0];
  assert.equal(updated.originalDecision,first.originalDecision);
  assert.equal(updated.recordRevisions.length,1);
});
test('stale cloud results cannot undo a verified correction or quarantine',()=>{
  const original={...entry,result:'LOSS'};
  const fixed={...original,result:'WIN',originalDecision:captureOriginalDecision(original),officialSettlement:{outcomeDir:'UP'},manualEdit:true,manualEditedAt:1000};
  const merged=normalizeCallLedger([original],[fixed],null,2000)[0];
  assert.equal(merged.result,'WIN');assert.equal(merged.officialSettlement.outcomeDir,'UP');
  const quarantine={...fixed,officialSettlement:undefined,recordIntegrity:{status:'review-required'}};
  assert.equal(normalizeCallLedger([original],[quarantine])[0].recordIntegrity.status,'review-required');
});
