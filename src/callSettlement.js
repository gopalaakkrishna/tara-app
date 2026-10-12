import {finiteNumber,settlementPatch,windowCloseMs} from './callIntegrity.js';

// A captured ticker remains queryable after it leaves the recent-event list.
// Fetching and checking this exact identity avoids an endless 50-event sweep.
export async function readCapturedCallSettlement(entry,{fetchImpl=fetch,now=Date.now()}={}) {
  const ticker=entry?.originalDecision?.marketTicker||entry?.marketTicker;
  if(!ticker)return {ok:false,reason:'missing-captured-ticker'};
  const close=windowCloseMs(entry.windowId);
  if(!Number.isFinite(close))return {ok:false,reason:'missing-window-identity'};
  if(now<close+30000)return {ok:false,reason:'settlement-buffer'};
  try{
    const response=await fetchImpl(`/api/kalshi-public/markets/${encodeURIComponent(ticker)}`,{signal:AbortSignal.timeout(10000),cache:'no-store'});
    if(!response.ok)return {ok:false,reason:`settlement-http-${response.status}`};
    const {market}=await response.json();
    const strike=finiteNumber(entry.originalDecision?.strike??entry.strikeAtLock??entry.strike);
    if(strike!==null&&(finiteNumber(market?.floor_strike)===null||Math.abs(strike-market.floor_strike)>0.02))return {ok:false,reason:'strike-mismatch'};
    const verified=settlementPatch(entry,market,now);
    return verified.ok?{ok:true,patch:{...verified.patch,resolvedAt:now,resolution:'captured-ticker-settlement'}}:verified;
  }catch{return {ok:false,reason:'settlement-read-unavailable'};}
}
