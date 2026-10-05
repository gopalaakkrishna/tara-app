export const SPORTS_LIVE_URL = 'https://raw.githubusercontent.com/gopalaakkrishna/sports-model/main/public/sports.json';

function validBoard(data) {
  return data && Number.isFinite(Date.parse(data.generated)) &&
    Array.isArray(data.open) && Array.isArray(data.settled);
}

const snapshotTime=data=>Math.max(Date.parse(data.generated),Date.parse(data.record_updated)||0);

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
  if(validBoard(previous)&&snapshotTime(previous)>snapshotTime(next)) {
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
