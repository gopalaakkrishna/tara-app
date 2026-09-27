const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
export function assessSpotResponse(name,data,price,receivedAt=Date.now()) {
  const p=Number(price);
  let sourceAt=null;
  if(name==='CB')sourceAt=Date.parse(data?.time)||null;
  if(name==='OKX')sourceAt=Number(data?.data?.[0]?.ts)||null;
  if(name==='BYB')sourceAt=Number(data?.time)||null;
  const valid=Number.isFinite(p)&&p>0;
  const fresh=valid&&(!sourceAt||(receivedAt-sourceAt>=-5000&&receivedAt-sourceAt<=30000));
  return {name,price:valid?p:null,receivedAt,sourceAt,timestampBasis:sourceAt?'exchange':'receipt-only',status:fresh?'fresh':valid?'stale':'unavailable'};
}

// Discard stale/invalid groups independently; a successful HTTP response alone is not live data.
export function freshOkxResults(results,now=Date.now()) {
  const names=['mark','index','funding','fundingHistory','openInterest','accountRatio','book'];
  const fields=['markPx','idxPx','fundingRate',null,'oiCcy',null,null];
  const health={};
  const values=names.map((name,i)=>{
    const result=results[i],data=result?.status==='fulfilled'&&result.value?.code==='0'?result.value.data:null;
    const row=Array.isArray(data)?data[0]:null;
    let valid=!!row;
    if(fields[i])valid=valid&&finite(row[fields[i]])&&(i===2||Number(row[fields[i]])>0);
    if(i===3)valid=valid&&(finite(row.realizedRate)||finite(row.fundingRate));
    if(i===5)valid=Array.isArray(row)&&finite(row[1])&&Number(row[1])>0;
    if(i===6)valid=valid&&Array.isArray(row.bids)&&row.bids.length>0&&Array.isArray(row.asks)&&row.asks.length>0;
    const sourceAt=Number(i===5?row?.[0]:i===3?row?.fundingTime:row?.ts)||null;
    const maxAge=i===3?48*3600000:i===5?15*60000:i===2?60000:30000;
    const stale=sourceAt&&(now-sourceAt>maxAge||sourceAt-now>5000);
    // Funding history describes a completed interval, not a real-time price tick.
    health[name]={status:!valid?'unavailable':stale?'stale':'fresh',sourceAt,receivedAt:valid?now:null,timestampBasis:sourceAt?'exchange':'receipt-only'};
    return valid&&!stale?result:{status:'rejected',reason:health[name].status};
  });
  const fresh=Object.values(health).filter(s=>s.status==='fresh').length;
  return {values,health,status:fresh===names.length?'live':fresh?'partial':'unavailable',lastUpdate:fresh?now:0};
}

export function freshFeedStatus(at,maxAge,now=Date.now()) {
  return Number.isFinite(at)&&at>0&&now-at>=-5000&&now-at<=maxAge?'fresh':at?'stale':'unavailable';
}
