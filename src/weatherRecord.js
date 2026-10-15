import {capturePickSettlement} from './learningCapture.js';

export const weatherPickKey=p=>`${p?.ticker}|${p?.side}`;
const finite=v=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const settlementFields=['result','settledAt','settledResult','pnl','learningSettlement','officialSettlement'];

// Only the original exact binary contract can supply an outcome. An absent
// result is not a void, and an unavailable feed is not a loss.
export function gradeWeatherPick(pick,market,now=Date.now()) {
  const close=Date.parse(market?.close_time),captured=finite(pick?.closeMs??pick?.learningCapture?.close);
  if(!pick?.ticker||market?.ticker!==pick.ticker||!['YES','NO'].includes(pick.side)||
    !['settled','finalized'].includes(market?.status)||!['yes','no'].includes(market?.result)||
    !Number.isFinite(close)||close>now||(captured!==null&&Math.abs(close-captured)>1000)||
    (pick.event&&market.event_ticker!==pick.event))return null;
  const price=finite(pick.price);
  if(price===null||price<=0||price>=100)return null;
  const won=pick.side==='YES'?market.result==='yes':market.result==='no';
  const fee=Math.ceil(.07*(price/100)*(1-price/100)*100);
  return {...pick,result:won?'win':'loss',settledAt:now,settledResult:market.result,
    pnl:Math.round((won?100-price-fee:-price-fee)*100)/100,
    officialSettlement:{source:'kalshi-public-api',ticker:market.ticker,result:market.result,
      closeTime:market.close_time,verifiedAt:now},
    learningSettlement:capturePickSettlement(pick,market,now)};
}

// Keep every unresolved pick. The rolling cap applies to settled history only.
// A later device may add settlement, never replace price/time/original capture.
export function mergeWeatherRecords(a,b,{cap=400,tickerDay=()=>null}={}) {
  const byKey=new Map();
  for(const ledger of [a,b])for(const pick of Array.isArray(ledger?.picks)?ledger.picks:[]){
    if(!pick?.ticker||!pick.dayKey||!['YES','NO'].includes(pick.side))continue;
    const day=tickerDay(pick.ticker);if(day&&day!==pick.dayKey)continue;
    const key=weatherPickKey(pick),old=byKey.get(key);
    if(!old){byKey.set(key,{...pick});continue;}
    const first=Number(pick.atMs)>0&&Number(pick.atMs)<Number(old.atMs)?pick:old;
    const second=first===old?pick:old;
    const outcome=old.result?old:pick.result?pick:null;
    const merged={...second,...first,learningCapture:first.learningCapture||second.learningCapture};
    if(outcome)for(const field of settlementFields){if(outcome[field]!==undefined)merged[field]=outcome[field];}
    byKey.set(key,merged);
  }
  const rows=[...byKey.values()].sort((x,y)=>(x.atMs||0)-(y.atMs||0));
  const retained=new Set((cap>0?rows.filter(p=>p.result).slice(-cap):[]).map(weatherPickKey));
  return {picks:rows.filter(p=>!p.result||retained.has(weatherPickKey(p)))};
}
