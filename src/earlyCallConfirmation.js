import {finiteNumber,isDirection,inspectDecisionQuote,windowCloseMs} from './callIntegrity.js';
import {directionalConfidence} from './callPolicy.js';
import {advanceCallFormation,callFormationReady} from './decisionAuthority.js';

// A narrow alternative to flat-gap waiting, not a new forecast or force-lock.
// Reuse the existing first-two-minute/75-score/72-posterior/68c watch bounds.
// All ordinary candidate, timing, tier, sample, commit and execution gates run.
// No outcome, settlement, historical win or order data is accepted here.
export function observeEarlyFlatGap(previous,input) {
  const {asset='BTC',windowType='15m',windowId,direction,source,now,ready,
    score,probabilityUp,mtfAlignment,tapeWindows,quote,spotAt,referencePrice,strike,
    minCost=44,maxCost=77,candidateQualified=false}=input;
  const fail=reason=>({eligible:false,fresh:false,state:null,reason});
  const at=finiteNumber(now),close=windowCloseMs(windowId);
  if(asset!=='BTC'||windowType!=='15m'||!windowId?.startsWith('15m-')||at===null||
    !Number.isFinite(close)||at<close-900000||at>=close-780000)return fail('outside-early-window');
  if(ready!==true||candidateQualified!==true||!isDirection(direction)||!source)return fail('unqualified-candidate');
  const strength=finiteNumber(score),probability=directionalConfidence(probabilityUp,direction);
  if(strength===null||strength<75||strength>100||probability===null||probability<72)return fail('insufficient-strength');
  const checked=inspectDecisionQuote(quote,{windowId,asset,now:at});
  if(!checked.ok)return fail(checked.reason);
  const lower=finiteNumber(minCost),upper=finiteNumber(maxCost);
  const entry=direction==='UP'?checked.ask:100-checked.bid;
  if(lower===null||upper===null||entry<Math.max(44,lower)||entry>Math.min(68,upper))return fail('early-price-band');
  if(checked.ask-checked.bid>2)return fail('wide-spread');
  const spot=finiteNumber(spotAt),reference=finiteNumber(referencePrice),line=finiteNumber(strike);
  if(spot===null||spot<close-900000||spot>at+2000||at-spot>15000)return fail('stale-spot');
  const sign=direction==='UP'?1:-1,alignment=finiteNumber(mtfAlignment);
  if(alignment===null||alignment*sign<.7)return fail('forecast-alignment');
  if(reference===null||reference<=0||line===null||line<=0||(reference-line)*sign<=0)return fail('strike-opposes');
  const tapes=['w15','w30','w60'].map(k=>finiteNumber(tapeWindows?.[k]?.buyPct));
  if(tapes.some(x=>x===null||x<0||x>100)||tapes.filter(x=>direction==='UP'?x>=70:x<=30).length<2)
    return fail('tape-not-confirmed');

  const key=`${asset}|${windowId}|${source}|${direction}`,bid=direction==='UP'?checked.bid:100-checked.ask;
  const marketKey=`${checked.ticker}|${checked.closeTime}|${line}`;
  let prior=previous?.marketKey===marketKey&&previous?.formation?.key===key&&at>=previous.formation.lastAt&&
    at-previous.formation.lastAt<=15000&&finiteNumber(previous.bid)!==null?previous:null;
  // A renewed qualified view starts over after a quote retreat. Never borrow
  // cheap-price confirmations from another source, direction, window or burst.
  if(prior&&(bid<prior.bid||checked.at<prior.formation.lastQuoteAt))prior=null;
  if(prior&&(spot<=prior.formation.lastSpotAt||checked.at<=prior.formation.lastQuoteAt||at-prior.formation.lastAt<1000))
    return {eligible:true,fresh:false,state:prior,reason:'waiting-distinct-observations'};
  const advanced=advanceCallFormation(prior?.formation,{direction,windowId,asset,source,spotAt:spot,
    quote,probabilityUp,now:at});
  if(!advanced.fresh)return fail('fresh-confirmation-unavailable');
  return {eligible:true,fresh:true,state:{formation:advanced.state,bid,marketKey},reason:'early-confirmation',
    evidence:{rule:'btc15m-early-flat-gap-v1',direction,source,marketTicker:checked.ticker,strike:line,
      firstObservedAt:advanced.state.firstAt,lastObservedAt:advanced.state.lastAt,
      quoteObservedAt:checked.at,spotObservedAt:spot,
      score:strength,probabilitySide:probability,entryCost:entry,
      spread:checked.ask-checked.bid,alignedForecast:alignment*sign,
      samples:advanced.state.count,observations:advanced.state.observations}};
}

export function earlyFlatGapReady(observation,requiredSamples,now) {
  const required=finiteNumber(requiredSamples),formation=observation?.state?.formation;
  return observation?.eligible===true&&observation.fresh===true&&required!==null&&required>0&&
    formation?.observations>=2&&callFormationReady(formation,Math.max(3,required),now);
}
