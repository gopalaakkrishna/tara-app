// Execution transport is injected. This module cannot connect or place orders
// by itself. The application's unconditional live-entry pause remains in force.
const num=x=>x==null||x===''||typeof x==='boolean'?null:Number.isFinite(Number(x))?Number(x):null;
export const executionFeeCents=(price,count=1)=>Math.ceil(7*count*(price/100)*(1-price/100));
export function affordableContracts(stake,price){
  const dollars=num(stake),p=num(price);
  if(!(dollars>0)||!(p>0&&p<100))return 0;
  let n=Math.min(250,Math.floor(dollars*100/p));
  while(n>0&&n*p+executionFeeCents(p,n)>Math.floor(dollars*100+1e-7))n--;
  return n;
}
export function buildSafeEntry({ticker,dir,limitCents,betDollars,clientOrderId,count,now=Date.now()}){
  const lim=num(limitCents);
  if(!ticker||!['UP','DOWN'].includes(dir)||lim===null||!Number.isInteger(lim)||lim<1||lim>99)return {ok:false,reason:'bad-order-arguments'};
  const side=dir==='UP'?'yes':'no',cost=side==='yes'?lim:100-lim;
  const affordable=affordableContracts(betDollars,cost),n=count??affordable;
  if(!Number.isInteger(n)||n<1||n>affordable)return {ok:false,reason:'stake-below-fee-inclusive-contract'};
  if(!clientOrderId)return {ok:false,reason:'missing-durable-intent'};
  const v2Side=side==='yes'?'bid':'ask';
  return {ok:true,count:n,costPerContractCents:cost,side,v2Side,client_order_id:clientOrderId,body:{ticker,client_order_id:clientOrderId,side:v2Side,price:(lim/100).toFixed(4),count:String(n),time_in_force:'good_till_canceled',expiration_time:Math.floor(now/1000)+90,self_trade_prevention_type:'taker_at_cross',cancel_order_on_pause:true}};
}
export function normalizeExecutionOrder(order){
  if(!order||typeof order!=='object')return {status:null,filledCount:0,remainingCount:null,fillPriceCents:null,feeCents:null};
  const filled=num(order.fill_count_fp??order.fill_count),remaining=num(order.remaining_count_fp??order.remaining_count);
  const synthetic=order._simulated===true;
  const count=filled??(synthetic&&order.status==='filled'?num(order.count):null);
  const raw=order.status;
  const status=['filled','executed'].includes(raw)?'filled':remaining===0&&count>0?'filled':raw;
  const dollars=num(order.average_fill_price);
  const taker=num(order.taker_fill_cost_dollars),maker=num(order.maker_fill_cost_dollars);
  const total=taker!==null||maker!==null?(taker??0)+(maker??0):null;
  const average=dollars!==null?dollars*100:total!==null&&count>0?100*total/count:num(order.fill_price);
  const side=order.outcome_side||order.side;
  // Costs are on the purchased side; a limit is never evidence of a fill.
  const price=average!==null&&average>0&&average<100?average:null;
  const fees=[order.taker_fees_dollars,order.maker_fees_dollars].map(num);
  return {status,filledCount:count??0,countKnown:count!==null,remainingCount:remaining,fillPriceCents:price,
    feeCents:fees.some(x=>x!==null)?100*fees.reduce((a,b)=>a+(b??0),0):synthetic?0:null,side,_raw:order};
}
export function buildSafeExit({ticker,side,count,limitCents,clientOrderId,now=Date.now()}){
  const n=num(count),p=num(limitCents);
  if(!ticker||!['yes','no'].includes(side)||!Number.isInteger(n)||n<=0||!Number.isInteger(p)||p<1||p>99||!clientOrderId)return {ok:false,reason:'invalid-exit-arguments'};
  return {ok:true,count:n,body:{ticker,client_order_id:clientOrderId,side:side==='yes'?'ask':'bid',price:(p/100).toFixed(4),count:String(n),time_in_force:'good_till_canceled',expiration_time:Math.floor(now/1000)+30,self_trade_prevention_type:'taker_at_cross',reduce_only:true,cancel_order_on_pause:true}};
}
export function heldQuote(quote,{ticker,dir,now=Date.now(),maxAgeMs=30000}={}){
  if(!ticker||quote?.ticker!==ticker||!(num(quote.at)>0)||now-quote.at>maxAgeMs||quote.at>now+2000)return null;
  const bid=num(quote.bid),ask=num(quote.ask);
  if(!(bid>0&&ask<100&&bid<=ask))return null;
  return dir==='UP'?{yesLimit:bid,value:bid}:dir==='DOWN'?{yesLimit:ask,value:100-ask}:null;
}
export function summarizeOrderFills(fills,{ticker,orderId,side,action,count}){
  const seen=new Set();let n=0,cost=0,fees=0;
  for(const f of fills){
    const id=f.fill_id||f.trade_id;if(!id)return null;if(seen.has(id))continue;seen.add(id);
    if(f.ticker!==ticker||f.order_id!==orderId||(f.outcome_side||f.side)!==side||f.action!==action)return null;
    const qty=num(f.count_fp??f.count),price=num(side==='yes'?f.yes_price_dollars:f.no_price_dollars),fee=num(f.fee_cost);
    if(!(qty>0&&price>0&&price<1&&fee!==null&&fee>=0))return null;n+=qty;cost+=qty*price;fees+=fee;
  }
  if(!n||Math.abs(n-count)>1e-9)return null;
  return {filledCount:n,fillPriceCents:cost*100/n,feeCents:fees*100};
}

// One order per intent: ladder repricing AMENDS that order. Never create a
// replacement after an ambiguous POST/cancel or abandon a partially filled leg.
export async function runSafeEntryLadder({plan,dir,betDollars,clientOrderId,place,read,cancel,amend,shouldAbort=()=>false,onRung=()=>{},onPlaced=()=>{},now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),pollMs=1000}){
  if(!plan?.ok)return {ok:false,reason:plan?.reason||'bad-plan'};
  const attempts=[],offer=plan.rungs.at(-1)?.priceCents,count=affordableContracts(betDollars,offer);
  if(!count)return {ok:false,reason:'stake-below-fee-inclusive-contract',attempts};
  let order=null,orderId=null,norm=null,latestRung=null;
  const unknown=()=>({ok:false,reason:'unknown-verify-kalshi-directly',orderId,order,normalized:norm,attempts,plan});
  const checked=async()=>{const r=await read(orderId);if(!r.ok)return false;order=r.order;norm=normalizeExecutionOrder(order);return true;};
  const finish=async(aborted=false)=>{
    if(norm?.status==='filled'&&norm.countKnown&&norm.filledCount>0&&norm.remainingCount===0)return {ok:true,order,normalized:norm,rung:latestRung,attempts,plan};
    // Always read AFTER cancel, including a V2 acknowledgment or cancel failure.
    let response;try{response=await cancel(orderId);}catch{return unknown();}
    if(!await checked())return unknown();
    const terminal=['filled','canceled','cancelled','expired'].includes(norm.status)&&norm.remainingCount===0;
    if(!terminal)return unknown();
    if(norm.filledCount>0)return {ok:true,partial:norm.filledCount<count,order,normalized:norm,rung:latestRung,attempts,plan};
    if(!norm.countKnown||!response.ok)return unknown();
    return {ok:false,reason:aborted?'aborted':'no-fill',confirmedNoFill:true,orderId,attempts,plan};
  };
  try{
    for(let i=0;i<plan.rungs.length;i++){
      const rung=plan.rungs[i];latestRung=rung;
      if(shouldAbort())return orderId?finish(true):{ok:false,reason:'aborted',attempts};
      onRung(rung);
      if(i===0){
        const r=await place({rung,count,clientOrderId});
        if(!r.ok)return {...unknown(),reason:r.definitiveRejection?'order-rejected':'unknown-verify-kalshi-directly'};
        order=r.order;orderId=order?.order_id;if(!orderId)return unknown();
        onPlaced({orderId,clientOrderId,rung});norm=normalizeExecutionOrder(order);
      }else{
        if(!await checked())return finish();
        if(norm.filledCount>0||norm.status==='filled')return finish();
        if(norm.status!=='resting'||!norm.countKnown||shouldAbort())return finish(true);
        const r=await amend({orderId,rung,count,clientOrderId});
        if(!r.ok)return finish();
        if(r.order?.order_id&&r.order.order_id!==orderId)return unknown();
        if(!await checked())return finish();
      }
      attempts.push({rung,orderId,status:norm.status});
      const until=now()+(rung.takesSpread?0:rung.waitSec*1000);
      while(norm.status!=='filled'&&!(norm.filledCount>0)&&now()<until){
        if(shouldAbort())return finish(true);
        await sleep(pollMs);if(!await checked())continue;
      }
      if(norm.status==='filled'||norm.filledCount>0)return finish();
    }
    return finish(shouldAbort());
  }catch{return orderId?finish():unknown();}
}

export async function fetchAllExecutionPages(get,base,key,{maxPages=100,limit=1000}={}){
  const items=[],seen=new Set();let cursor=null;
  for(let page=0;page<maxPages;page++){
    const r=await get(`${base}${base.includes('?')?'&':'?'}limit=${limit}${cursor?'&cursor='+encodeURIComponent(cursor):''}`);
    if(!r.ok||!Array.isArray(r.data?.[key]))return {ok:false,items,error:`${base}: ${r.reason||r.status||'invalid response'}`};
    items.push(...r.data[key]);cursor=r.data.cursor||null;
    if(!cursor)return {ok:true,items};
    if(typeof cursor!=='string'||seen.has(cursor))return {ok:false,items,error:`${base}: repeated/invalid pagination cursor`};
    seen.add(cursor);
  }
  return {ok:false,items,error:`${base}: safety pagination bound reached; history incomplete`};
}

// Conservative ACCOUNT-wide risk reservation, not a P&L statistic: never spend
// today's loss budget twice because a forecast or an unrealized gain looks good.
// Gross paid debits + fees remain reserved until the UTC day changes. Existing
// exposure and all resting-order commitments are included, even if not Tara's.
export function accountRiskSnapshot({orders=[],fills=[],positions=[],balance,complete={},now=Date.now()}){
  const out={verified:false,at:now,dayTrades:0,tradesByTicker:{},lossAndExposureDollars:0,issues:[]};
  if(!['orders','historicalOrders','fills','historicalFills','settlements','positions','balance'].every(k=>complete[k]===true))out.issues.push('incomplete-account-snapshot');
  if(num(balance?.balance)===null||num(balance?.balance)<0)out.issues.push('balance-unavailable');
  const start=Math.floor(now/86400000)*86400000,ids=new Set(),seen=new Set();
  for(const f of fills){
    const id=f.fill_id||f.trade_id;if(!id){out.issues.push('fill-identity-missing');continue;}if(seen.has(id))continue;seen.add(id);
    const at=Date.parse(f.created_time||'');if(!Number.isFinite(at)||at>now+2000){out.issues.push('fill-time-unverified');continue;}if(at<start)continue;
    const n=num(f.count_fp??f.count),side=f.outcome_side||f.side,price=num(side==='yes'?f.yes_price_dollars:f.no_price_dollars),fee=num(f.fee_cost);
    if(!(n>0&&price>0&&price<1&&fee!==null&&fee>=0)||!['buy','sell'].includes(f.action)){out.issues.push('fill-cost-unverified');continue;}
    out.lossAndExposureDollars+=fee+(f.action==='buy'?n*price:0);
    if(f.action==='buy'&&f.order_id)ids.add(f.order_id);
    else if(f.action==='buy')out.issues.push('order-identity-missing');
  }
  const byId=new Map(orders.filter(o=>o?.order_id).map(o=>[o.order_id,o]));
  for(const o of byId.values()){
    if(Date.parse(o.created_time||'')>=start&&['executed','resting','filled'].includes(o.status))ids.add(o.order_id);
    if(o.status==='resting'){
      const n=num(o.remaining_count_fp??o.remaining_count),p=num(o.price??o.yes_price_dollars);
      if(!(n!==null&&n>=0&&p>0&&p<1))out.issues.push('resting-exposure-unverified');
      else out.lossAndExposureDollars+=n*Math.max(p,1-p)+Math.ceil(.07*n*p*(1-p)*100)/100;
    }
  }
  for(const id of ids){const o=byId.get(id);if(!o?.ticker){out.issues.push('order-attribution-unavailable');continue;}out.tradesByTicker[o.ticker]=(out.tradesByTicker[o.ticker]||0)+1;}
  out.dayTrades=ids.size;
  for(const p of positions){
    const count=num(p.position_fp??p.position);if(count===0)continue;
    const exposure=num(p.market_exposure_dollars);
    if(count===null||exposure===null||exposure<0)out.issues.push('position-exposure-unverified');else out.lossAndExposureDollars+=exposure;
  }
  // Deliberate over-reservation where today's fills and current exposure
  // overlap. Conservative refusals are preferable to claiming a false limit.
  out.verified=out.issues.length===0;return out;
}
