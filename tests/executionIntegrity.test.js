import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildExchangeAudit,callWindowCoverage,checkEntryMode,LIVE_ENTRY_PAUSE_REASON} from '../src/executionIntegrity.js';

test('live entry is closed even if stored settings say armed; dry run remains usable',()=>{
  assert.equal(checkEntryMode({dryRun:true,signalSource:'snapshot'}).ok,true);
  assert.equal(checkEntryMode({dryRun:false,signalSource:'snapshot'}).reason,LIVE_ENTRY_PAUSE_REASON);
  assert.equal(checkEntryMode({dryRun:false,signalSource:'lock'}).reason,'live-entry-requires-tara-call');
});
test('the live-mode check runs before the only order-entry ladder call',()=>{
  const source=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const entry=source.slice(source.indexOf('const _runEntry=useCallback'),source.indexOf('const _handlePlaceOrderOnTaraCall'));
  assert.ok(entry.indexOf('checkEntryMode({dryRun,signalSource:_signalSource})')>=0);
  assert.ok(entry.indexOf('if(!_entryMode.ok)return blocked(_entryMode.reason)')>=0);
  assert.ok(entry.indexOf('if(!_entryMode.ok)return blocked(_entryMode.reason)')<entry.indexOf('kalshiRunEntryLadder({'));
  assert.equal(source.match(/await kalshiRunEntryLadder\(\{/g)?.length,1);
});
test('closed-market account cashflow requires complete fills, settlements and actual fees',()=>{
  const orders=[{order_id:'o1',ticker:'BTC',client_order_id:'tara_1'}];
  const fills=[{fill_id:'f1',order_id:'o1',ticker:'BTC',outcome_side:'yes',action:'buy',count_fp:'2.00',yes_price_dollars:'0.6000',fee_cost:'0.0300'}];
  const settlements=[{ticker:'BTC',market_result:'yes',settled_time:'2026-09-27T00:15:00Z',revenue:200}];
  const partial=buildExchangeAudit({orders,fills,settlements,complete:{fills:true,settlements:true}});
  assert.equal(partial.rows[0].status,'partial-exchange-history');assert.equal(partial.closedNetDollars,null);
  const audit=buildExchangeAudit({orders,fills,settlements,complete:{fills:true,historicalFills:true,settlements:true}});
  assert.equal(audit.rows[0].source,'tara-tagged');assert.equal(audit.rows[0].netDollars,.77);
  assert.equal(audit.accountRiskVerified,false);
});
test('unattributed, incomplete and duplicate fills never become a made-up AutoTrade profit',()=>{
  const fills=[{fill_id:'same',ticker:'BTC',outcome_side:'no',action:'buy',count_fp:'1',no_price_dollars:'0.42',fee_cost:null}];
  const settlements=[{ticker:'BTC',market_result:'no',settled_time:'2026-09-27T00:15:00Z',revenue:100}];
  const audit=buildExchangeAudit({fills:[...fills,...fills],settlements,complete:{fills:true,historicalFills:true,settlements:true}});
  assert.equal(audit.rows[0].fills,1);assert.equal(audit.rows[0].source,'unattributed');
  assert.equal(audit.rows[0].status,'unpriceable');assert.equal(audit.closedNetDollars,null);
});
test('missing windows are unobserved, not sitouts',()=>{
  const now=Date.parse('2026-09-27T01:00:00Z');
  const c=callWindowCoverage([{windowId:'15m-2026-09-27T00:00:00.000Z',result:'SITOUT'},{windowId:'15m-2026-09-27T00:30:00.000Z',result:'WIN'},{windowId:'1h-2026-09-27T00:00:00.000Z',result:'WIN'}],now,1);
  assert.deepEqual(c,{expected:4,recorded:2,unobserved:2,periodHours:1});
});
