// Read-only presentation adapters. Never mutate records or decide a Call.
import {finiteNumber,isDirection,isScoredCall,windowCloseMs} from './callIntegrity.js';
export function recordVersion(row) {
  const raw=row?.originalDecision?.modelVersion||row?.taraVersion||row?.modelVersion||row?.approval?.modelVersion;
  const text=String(raw||'');
  return text.match(/(?:^|[^a-z0-9])v(\d+\.\d+(?:\.\d+)?)(?=$|[^.\d])/i)?.[1]||
    text.match(/^(?:TARA\s+)?(\d{1,2}\.\d+(?:\.\d+)?)(?:$|[-\s])/i)?.[1]||'Unknown';
}
export function capturedReason(row) {
  return row?.originalDecision?.blockedDecision?.reason||row?.originalDecision?.reason||row?.blockedDecision?.reason||row?.reason||'No captured reason available.';
}
export function presentationRows(entries,{asset,windowType,version='all'}={}) {
  return (Array.isArray(entries)?entries:[]).filter(e=>e&&(!asset||(e.asset||'BTC')===asset)&&
    (!windowType||(e.windowType||'15m')===windowType)&&(version==='all'||recordVersion(e)===version));
}
export function evidenceCohort(entries,scope={}) {
  const rows=presentationRows(entries,scope),settled=rows.filter(isScoredCall),wins=settled.filter(e=>e.result==='WIN').length;
  const timing=new Map(),confidence=new Map(),blockers=new Map(),versions=new Map();
  let net=0,priced=0;
  for(const e of rows){
    const v=recordVersion(e);versions.set(v,(versions.get(v)||0)+1);
    if(e.dir==='SIT_OUT'||e.result==='SITOUT'){
      const b=e.originalDecision?.blockedDecision||e.blockedDecision;
      const code=b?.code||b?.gate?.code||'uncaptured';const prior=blockers.get(code)||{code,n:0,reason:b?.reason||'Exact blocker was not captured in this record.'};
      blockers.set(code,{...prior,n:prior.n+1});
    }
  }
  for(const e of settled){
    const o=e.originalDecision,score=finiteNumber(o?.signalScore),left=finiteNumber(o?.secondsLeft);
    const add=(map,key)=>{const x=map.get(key)||{label:key,n:0,wins:0};map.set(key,{...x,n:x.n+1,wins:x.wins+(e.result==='WIN'?1:0)});};
    add(timing,left===null?'Capture time unavailable':left>600?'>10m remaining':left>480?'8–10m remaining':left>=420?'7–8m remaining':'<7m / historical');
    add(confidence,score===null?'Score unavailable':score<65?'Below 65':score<70?'65–69':score<75?'70–74':score<80?'75–79':'80+');
    // A current edited result is not substituted for an original verified result.
    if(!o||o.provenance!=='captured-at-lock'||!isDirection(o.direction)||o.direction!==e.dir||e.manualEdit||e.manualEditedAt||e.recordRevisions?.length||
      e.officialSettlement?.source!=='kalshi-public-api'||e.officialSettlement?.ticker!==o.marketTicker)continue;
    const bid=finiteNumber(o.yesBid),ask=finiteNumber(o.yesAsk);
    if(bid===null||ask===null||bid<=0||ask>=100||ask<bid)continue;
    const settlement=e.officialSettlement;
    const fromDirection=isDirection(settlement.outcomeDir)?(settlement.outcomeDir==='UP'?'yes':'no'):null;
    const fromResult=['yes','no'].includes(settlement.result)?settlement.result:null;
    if((settlement.outcomeDir!=null&&!fromDirection)||(settlement.result!=null&&!fromResult))continue;
    if(fromDirection&&fromResult&&fromDirection!==fromResult)continue;
    // The real settlement writer stores outcomeDir, not result. Do not lose
    // valid official evidence merely because a presentation fixture used the
    // older yes/no shape; when window identity is known it must also match.
    if(e.windowId&&(!Number.isFinite(windowCloseMs(e.windowId))||!Number.isFinite(Date.parse(settlement.closeTime))||Math.abs(Date.parse(settlement.closeTime)-windowCloseMs(e.windowId))>1000))continue;
    const official=fromDirection||fromResult;
    if(!['yes','no'].includes(official)||(e.result==='WIN')!==((o.direction==='UP')===(official==='yes')))continue;
    const cost=o.direction==='UP'?ask:100-bid;
    const fee=Math.ceil(.07*(cost/100)*(1-cost/100)*100);
    net+=(e.result==='WIN'?100:0)-cost-fee;priced++;
  }
  return {rows,settled: settled.length,wins,losses:settled.length-wins,sitouts:rows.filter(e=>e.result==='SITOUT').length,
    pending:rows.filter(e=>!e.result&&isDirection(e.dir)).length,winRate:settled.length?wins/settled.length*100:null,
    estimatedNet:priced?net/priced:null,priced,timing:[...timing.values()],confidence:[...confidence.values()],
    blockers:[...blockers.values()].sort((a,b)=>b.n-a.n),versions:[...versions.entries()]};
}
