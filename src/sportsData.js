export const SPORTS_LIVE_URL = 'https://raw.githubusercontent.com/gopalaakkrishna/sports-model/main/public/sports.json';
export const SPORTS_STALE_MS = 30*60*1000;

export function sportsPaperSettlementStatus(data) {
  const lanes=['open','totals'].map(key=>data?.paper_settlement?.[key]).filter(Boolean);
  const count=(x,k)=>Number.isSafeInteger(x?.[k])&&x[k]>=0?x[k]:0;
  return {available:lanes.length>0,
    pending:lanes.reduce((n,x)=>n+count(x,'pending'),0),
    overdue:lanes.reduce((n,x)=>n+count(x,'past_date_pending'),0),
    nonBinary:lanes.reduce((n,x)=>n+count(x,'non_binary_resolved'),0),
    cancelled:lanes.reduce((n,x)=>n+count(x,'cancelled_resolved'),0),
    sourceErrors:lanes.reduce((n,x)=>n+count(x,'source_errors'),0),
    attention:lanes.flatMap(x=>Array.isArray(x.attention)?x.attention:[]).slice(0,25)};
}

function validBoard(data) {
  return data && Number.isFinite(Date.parse(data.generated)) &&
    Array.isArray(data.open) && Array.isArray(data.settled);
}

const snapshotTime=data=>Math.max(Date.parse(data.generated),Date.parse(data.record_updated)||0);

// A successful HTTP download is not proof the upstream refresh actually ran.
// Record-only updates must not make old forecasts/quotes look fresh.
export function sportsFreshnessStatus(data,now=Date.now()) {
  const generated=Date.parse(data?.generated),age=now-generated;
  if(!Number.isFinite(generated))return {stale:true,ageMs:null,warning:'Sports source freshness is unavailable.'};
  if(age < -120000)return {stale:true,ageMs:age,warning:'Sports source timestamp is ahead of the clock; freshness is unverified.'};
  if(data?.refresh?.status==='degraded')return {stale:true,ageMs:Math.max(0,age),warning:'Sports refresh completed with source errors. Some prices or results may be delayed.'};
  if(age>SPORTS_STALE_MS)return {stale:true,ageMs:age,
    warning:`Sports refresh delayed: forecasts and quoted prices are ${Math.floor(age/60000)} minutes old. Refresh results checks the published source; it does not create fresh market quotes.`};
  return {stale:false,ageMs:Math.max(0,age),warning:null};
}

export async function loadSportsBoard({previous=null, fetchImpl=fetch, now=Date.now(), timeoutMs=15000}={}) {
  const get=async(url)=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const response=await fetchImpl(`${url}?t=${now}`,{signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!validBoard(data))throw new Error('Invalid Sports snapshot');
      return data;
    } finally {clearTimeout(timer);}
  };
  let next, warning=null;
  try {next=await get(SPORTS_LIVE_URL);}
  catch {
    warning='Live Sports refresh failed. Showing the latest available snapshot; results may be delayed.';
    // A cached live board must never roll back to an older bundled record.
    if(validBoard(previous))return {data:previous,warning};
    next=await get('/sports.json');
  }
  const previousRecord=Date.parse(previous?.record_updated),nextRecord=Date.parse(next?.record_updated||next?.generated);
  if(validBoard(previous)&&(snapshotTime(previous)>snapshotTime(next)||
    (Number.isFinite(previousRecord)&&(!Number.isFinite(nextRecord)||previousRecord>nextRecord)))) {
    return {data:previous,warning:'The source returned an older Sports snapshot. Keeping the newer record while updates catch up.'};
  }
  return {data:next,warning};
}

export function sportsSettlementStatus(data,now=Date.now()) {
  const pending=data?.open||[];
  const overdue=pending.filter(row=>{
    const start=Date.parse(row.start);
    return Number.isFinite(start)&&now-start>=48*60*60*1000;
  }).length;
  const times=(data?.settled||[]).map(r=>Date.parse(r.settled_at)).filter(Number.isFinite);
  return {pending:pending.length,overdue,lastSettled:times.length?Math.max(...times):null,
    nonBinary:(data?.disclosures||[]).filter(r=>r.kind==='non-binary')};
}
