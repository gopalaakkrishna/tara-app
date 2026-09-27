import {finiteNumber as number, inspectDecisionQuote, isDirection, windowCloseMs} from './callIntegrity.js';

// Frozen research protocol. This module cannot return an order or arm AutoTrade.
export const LOCK_STUDY_POLICY = Object.freeze({id:'early-7m-v1', mode:'shadow-only', cutoffSeconds:420, cadenceMs:15000, stabilityMs:30000, maxGapMs:22000, minRawSideProbability:0.65, minEstimatedEdgeCents:3});
// One-contract paper trade; exchange fees round up to the next cent.
export const estimatedTakerFeeCents = cost => Math.ceil(7 * (cost / 100) * (1 - cost / 100));
const side = (up, direction) => direction === 'UP' ? up : 1-up;

export function createLockStudy({windowId, asset='BTC', device, version, now=Date.now()}) {
  return {schema:1, policy:{...LOCK_STUDY_POLICY}, windowId, asset, windowType:'15m', device, version,
    firstObservedAt:now, lastObservedAt:null, observations:[], early:{status:'observing', reason:'collecting-stability'}, marketAtEarly:null, current:null, settlement:null};
}

export function observeLockStudy(study, input) {
  if (!study || study.settlement || input.windowId !== study.windowId || input.asset !== study.asset) return study;
  const now=number(input.now), close=windowCloseMs(study.windowId), start=close-900000;
  if (now===null || now<start || now>close || (study.lastObservedAt!==null && now-study.lastObservedAt<10000)) return study;
  const quote=inspectDecisionQuote(input.quote,{windowId:study.windowId,asset:study.asset,now});
  const posterior=number(input.probabilityUpRaw);
  const p=posterior!==null&&posterior>=0&&posterior<=100?posterior/100:null;
  const direction=p===null||p===0.5?null:p>0.5?'UP':'DOWN';
  const cost=quote.ok&&direction?(direction==='UP'?quote.ask:100-quote.bid):null;
  const estimate=cost!==null&&p!==null?100*side(p,direction)-cost-estimatedTakerFeeCents(cost):null;
  const remaining=(close-now)/1000;
  const o={at:now, secondsLeft:remaining, probabilityUpRaw:p, signalScore:number(input.signalScore), direction,
    probabilityUpCurrent:number(input.probabilityUpCurrent)===null?null:number(input.probabilityUpCurrent)/100,probabilitySource:input.probabilitySource||'unspecified',
    quote:quote.ok?{ticker:quote.ticker,closeTime:quote.closeTime,bid:quote.bid,ask:quote.ask,mid:quote.mid,at:quote.at,strike:number(input.quote.strike)}:null,
    quoteIssue:quote.ok?null:quote.reason, costCents:cost, estimatedEdgeCents:estimate,
    referencePrice:number(input.referencePrice), spot:number(input.spot), strike:number(input.strike), atrBps:number(input.atrBps),
    tape15:number(input.tape15), tape30:number(input.tape30), tape60:number(input.tape60), momentum:number(input.momentum),
    regime:input.regime||null, visibility:input.visibility||'unknown',dataProvenance:input.dataProvenance||null};
  const observations=[...study.observations,o].slice(-100);
  const next={...study,lastObservedAt:now,observations};
  const decision=input.currentDecision, original=decision?.originalDecision;
  const decisionWindow=original?.windowId||decision?.windowId||decision?.wid;
  const decisionAt=number(original?.lockedAt ?? decision?._committedAt);
  if (!next.current && decision?.locked && isDirection(decision.call) && decisionWindow===study.windowId && decisionAt!==null && decisionAt>=start && decisionAt<=now) {
    const s=decision;
    // No later candidate or outcome can rewrite this first observed committed call.
    next.current={direction:s.call, at:number(original?.lockedAt ?? s._committedAt)??now,
      observedAt:now, costCents:s.call==='UP'?number(s.kalshiAskAtLock):number(s.kalshiBidAtLock)!==null?100-number(s.kalshiBidAtLock):null,
      probability:original?.probabilityUpRaw!=null?side(original.probabilityUpRaw/100,s.call):null,
      provenance:original?.provenance||'observed-live-snapshot'};
  }
  if (study.early.status==='locked'||study.early.status==='sitout') return next;
  const policy=study.policy;
  if (remaining<policy.cutoffSeconds) {
    next.early={status:'sitout',at:now,reason:'cutoff-without-qualified-opportunity',lastWaitReason:study.early.reason};
    return next;
  }
  const qualifies=sample=>sample.quote&&sample.direction&&sample.probabilityUpRaw!==null&&side(sample.probabilityUpRaw,sample.direction)>=policy.minRawSideProbability&&sample.estimatedEdgeCents>=policy.minEstimatedEdgeCents;
  if (!quote.ok) {next.early={status:'waiting',reason:quote.reason};return next;}
  if (!qualifies(o)) {next.early={status:'waiting',reason:direction?'raw-score-or-price-insufficient':'no-direction'};return next;}
  let first=observations.length-1;
  while(first>0&&observations[first].at-observations[first-1].at<=policy.maxGapMs&&observations[first-1].direction===direction&&qualifies(observations[first-1]))first--;
  if(now-observations[first].at<policy.stabilityMs){next.early={status:'waiting',reason:'collecting-stability'};return next;}
  next.early={status:'locked',at:now,direction,costCents:cost,probability:side(p,direction),probabilityUp:p,estimatedEdgeCents:estimate,ticker:quote.ticker,reason:'stable-raw-score-and-price',probabilityStatus:'uncalibrated-research-score'};
  if(quote.mid!==50){
    const favorite=quote.mid>50?'UP':'DOWN';
    next.marketAtEarly={direction:favorite,at:now,costCents:favorite==='UP'?quote.ask:100-quote.bid,probability:side(quote.mid/100,favorite),ticker:quote.ticker};
  }
  return next;
}

export function studyCoverage(study) {
  const close=windowCloseMs(study.windowId), start=close-900000;
  const times=study.observations.map(o=>o.at).filter(t=>t<=close);
  if(!times.length)return {complete:false,reason:'not-observed-before-cutoff',maxGapMs:null};
  // Observe through the close, not only the early deadline: otherwise a late
  // current-policy lock during browser downtime would be counted as a sit-out.
  let gap=Math.max(times[0]-start,close-times.at(-1));
  for(let i=1;i<times.length;i++)gap=Math.max(gap,times[i]-times[i-1]);
  return {complete:times[0]-start<=30000&&gap<=45000,reason:gap>45000?'observation-gap':times[0]-start>30000?'opened-late':null,maxGapMs:gap};
}

export function settleLockStudy(study, market, now=Date.now()) {
  if(study.settlement)return study;
  const expected=windowCloseMs(study.windowId);
  if(!['yes','no'].includes(market?.result)||!['settled','finalized'].includes(market.status)||Date.parse(market.close_time)!==expected||now<expected||!market.ticker?.startsWith(`KX${study.asset}15M-`))return study;
  const capturedTickers=new Set(study.observations.map(o=>o.quote?.ticker).filter(Boolean));
  if(capturedTickers.size>0&&!capturedTickers.has(market.ticker))return study;
  const outcomeDir=market.result==='yes'?'UP':'DOWN';
  const score=d=>{
    if(!d||!isDirection(d.direction))return null;
    const won=d.direction===outcomeDir, cost=number(d.costCents);
    return {...d,result:won?'WIN':'LOSS',estimatedNetCents:cost!==null?(won?100:0)-cost-estimatedTakerFeeCents(cost):null,
      brier:number(d.probability)!==null?(d.probability-(won?1:0))**2:null};
  };
  return {...study,early:study.early.status==='locked'?study.early:{...study.early,status:'sitout',reason:study.early.reason||'no-qualified-opportunity'},coverage:studyCoverage(study),
    settlement:{ticker:market.ticker,closeTime:market.close_time,strike:number(market.floor_strike),outcomeDir,verifiedAt:now,source:'kalshi-public-api'},
    scores:{current:score(study.current),early:score(study.early),marketAtEarly:score(study.marketAtEarly)}};
}

export function summarizeLockStudies(studies) {
  const settled=studies.filter(s=>s.policy?.id===LOCK_STUDY_POLICY.id&&s.settlement);
  const complete=settled.filter(s=>s.coverage?.complete);
  const stats=key=>{
    const calls=complete.map(s=>s.scores?.[key]).filter(Boolean), wins=calls.filter(c=>c.result==='WIN').length;
    const priced=calls.filter(c=>number(c.estimatedNetCents)!==null), calibrated=calls.filter(c=>number(c.brier)!==null);
    return {windows:complete.length,calls:calls.length,wins,losses:calls.length-wins,winRate:calls.length?wins/calls.length:null,coverage:complete.length?calls.length/complete.length:null,
      priced:priced.length,estimatedNetCents:priced.length?priced.reduce((n,c)=>n+c.estimatedNetCents,0):null,brier:calibrated.length?calibrated.reduce((n,c)=>n+c.brier,0)/calibrated.length:null};
  };
  const calibration=[];
  for(let lower=50;lower<100;lower+=10){
    const lo=lower/100,hi=(lower+10)/100;
    const calls=complete.map(s=>s.scores?.early).filter(c=>c&&c.probability>=lo&&(lower===90?c.probability<=hi:c.probability<hi));
    calibration.push({from:lower,to:lower+10,n:calls.length,wins:calls.filter(c=>c.result==='WIN').length});
  }
  return {observed:studies.length,settled:settled.length,complete:complete.length,excludedPartial:settled.length-complete.length,
    current:stats('current'),early:stats('early'),marketAtEarly:stats('marketAtEarly'),calibration,
    readiness:'research-only',promotionAllowed:false};
}

// Chronological empirical calibration. Labels unavailable at the prediction time
// are excluded even if the caller accidentally supplies future settled rows.
export function calibrateStudyProbability(studies, rawProbability, asOf) {
  const lo=Math.min(0.9,Math.floor(rawProbability*10)/10);
  const unique=[...new Map(studies.map(s=>[`${s.asset}|${s.windowId}|${s.policy?.id}`,s])).values()];
  const rows=unique.filter(s=>s.settlement?.verifiedAt<asOf&&s.coverage?.complete&&s.policy?.id===LOCK_STUDY_POLICY.id)
    .map(s=>s.scores?.early).filter(c=>c&&c.at<asOf&&c.probability>=lo&&(lo===0.9?c.probability<=1:c.probability<lo+0.1));
  const wins=rows.filter(r=>r.result==='WIN').length;
  if(rows.length<30)return {probability:null,n:rows.length,status:'insufficient-forward-evidence'};
  return {probability:(wins+2)/(rows.length+4),n:rows.length,status:'historical-bin-estimate-not-promotion'};
}
