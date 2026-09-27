// AutoTrade is a separate execution layer. A Tara Call result is never proof of
// an exchange fill or of account profit. Keep live entry closed until the
// account-wide risk limits can be enforced against complete exchange data.
export const LIVE_ENTRY_PAUSE_REASON = 'live-execution-paused-until-account-risk-is-verified';

export function checkEntryMode({dryRun, signalSource}) {
  if (dryRun !== false) return {ok:true, mode:'simulation'};
  if (signalSource !== 'snapshot') return {ok:false, reason:'live-entry-requires-tara-call'};
  return {ok:false, reason:LIVE_ENTRY_PAUSE_REASON};
}

const finite = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const dollars = value => {
  const n=finite(value);
  return n === null || n < 0 ? null : n;
};
const tally = () => ({fills:0, orders:0, ticker:null, result:null, settlementAt:null,
  buyDollars:0, sellDollars:0, feeDollars:0, payoutDollars:null,
  netDollars:null, source:'unattributed', status:'open-or-unverified', issues:[]});

// This is an ACCOUNT activity audit, not a Tara Call ledger. A closed-market
// cashflow is shown only when every fills/settlements page (including historical
// fills) was retrieved and all prices, counts and fees on that market parse.
// Auto attribution requires the order's client_order_id or a local order event;
// otherwise the account trade remains explicitly unattributed.
export function buildExchangeAudit({orders=[],fills=[],settlements=[],complete={},localEvents=[]}={}) {
  const byOrder=new Map(orders.filter(o=>o?.order_id).map(o=>[o.order_id,o]));
  const localIds=new Set(localEvents.filter(e=>e?.orderId&&e.dryRun===false).map(e=>e.orderId));
  const settled=new Map(settlements.filter(s=>s?.ticker).map(s=>[s.ticker,s]));
  const rows=new Map();
  const seen=new Set();
  for(const fill of fills){
    if(!fill?.ticker)continue;
    const id=fill.fill_id||fill.trade_id;
    if(id&&seen.has(id))continue;
    if(id)seen.add(id);
    const row=rows.get(fill.ticker)||tally();
    row.ticker=fill.ticker;
    row.fills++;
    const order=byOrder.get(fill.order_id);
    const tagged=String(order?.client_order_id||'').startsWith('tara_')||localIds.has(fill.order_id);
    const origin=tagged?'tara-tagged':order?'other-order':'unattributed';
    row.source=row.fills===1?origin:row.source===origin?origin:'mixed-or-unattributed';
    const side=fill.outcome_side||fill.side;
    const action=fill.action;
    const count=finite(fill.count_fp ?? fill.count);
    const price=dollars(side==='yes'?fill.yes_price_dollars:side==='no'?fill.no_price_dollars:null);
    const fee=dollars(fill.fee_cost);
    if(!['yes','no'].includes(side)||!['buy','sell'].includes(action)||count===null||count<=0||price===null||price<=0||price>=1||fee===null){
      row.issues.push('fill-field-missing-or-invalid');
    }else{
      if(action==='buy')row.buyDollars+=count*price;
      else row.sellDollars+=count*price;
      row.feeDollars+=fee;
    }
    rows.set(fill.ticker,row);
  }
  for(const order of orders){
    if(!order?.ticker)continue;
    const row=rows.get(order.ticker)||tally();
    row.ticker=order.ticker;row.orders++;
    rows.set(order.ticker,row);
  }
  for(const [ticker,settlement] of settled){
    const row=rows.get(ticker)||tally();
    row.ticker=ticker;
    row.result=settlement.market_result||null;
    row.settlementAt=settlement.settled_time||null;
    const revenue=finite(settlement.revenue);
    if(revenue!==null&&revenue>=0)row.payoutDollars=revenue/100;
    else row.issues.push('settlement-revenue-missing');
    rows.set(ticker,row);
  }
  const historyComplete=complete.fills===true&&complete.historicalFills===true&&complete.settlements===true;
  for(const row of rows.values()){
    if(!row.settlementAt){row.status='open-or-unverified';continue;}
    if(!historyComplete){row.status='partial-exchange-history';continue;}
    if(row.fills===0||row.issues.length||row.payoutDollars===null){row.status='unpriceable';continue;}
    row.netDollars=Math.round((row.sellDollars-row.buyDollars+row.payoutDollars-row.feeDollars)*10000)/10000;
    row.status='exchange-derived-closed';
  }
  const sorted=[...rows.values()].sort((a,b)=>String(b.settlementAt||'').localeCompare(String(a.settlementAt||'')));
  const priced=sorted.filter(r=>r.status==='exchange-derived-closed');
  return {rows:sorted,counts:{orders:orders.length,fills:seen.size||fills.length,settlements:settlements.length,priced:priced.length},
    historyComplete,closedNetDollars:priced.length?Math.round(priced.reduce((sum,r)=>sum+r.netDollars,0)*100)/100:null,
    accountRiskVerified:false};
}

// Expected 15-minute slots absent from the Call record are *unobserved*.
// Never count a browser-offline interval as a deliberate SIT_OUT.
export function callWindowCoverage(entries, now=Date.now(), hours=24) {
  const end=Math.floor(now/900000)*900000;
  const slots=Math.max(0,Math.round(hours*4));
  const seen=new Set();
  for(const entry of entries||[]){
    if(entry?.windowType&&entry.windowType!=='15m')continue;
    if(entry?.windowId&&!String(entry.windowId).startsWith('15m-'))continue;
    const parsed=Date.parse(String(entry?.windowId||'').replace(/^15m-/,''));
    const timestamp=Number.isFinite(parsed)?parsed:finite(entry?.time ?? entry?.id);
    if(timestamp!==null){const start=Math.floor(timestamp/900000)*900000;if(start>=end-slots*900000&&start<end)seen.add(start);}
  }
  return {expected:slots,recorded:seen.size,unobserved:Math.max(0,slots-seen.size),periodHours:hours};
}
