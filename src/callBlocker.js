import {inspectDecisionQuote,isDirection,finiteNumber} from './callIntegrity.js';

export function describeCallBlocker({call,readiness,hold,samples,quote,windowId,asset='BTC',now=Date.now()}) {
  const checked=inspectDecisionQuote(quote,{windowId,asset,now});
  let code='signal',reason=call?.caution||call?.reason||'Waiting for a qualifying signal.';
  if(!readiness?.ready){code=readiness?.code||'startup';reason=readiness?.reason||'Waiting for startup data.';}
  else if(hold?.windowId===windowId&&now-(hold.at||0)<10000){code='commit-check';reason=hold.reason;}
  else if(!checked.ok){code='market-quote';reason=`Waiting for a current Kalshi quote (${checked.reason}).`;}
  else if(isDirection(call?.call)){
    code='forming';reason=`Forming ${call.call}: ${Math.round((samples?.count||0)*10)/10} stability samples. ${reason}`;
  }
  return {code,reason,windowId,asset,observedAt:now,dataReady:!!readiness?.ready,
    samples:finiteNumber(samples?.count)??0,claimedDirection:samples?.dir||null,
    proposedDirection:isDirection(call?.call)?call.call:null,quoteIssue:checked.ok?null:checked.reason,
    startup:{code:readiness?.code,samples:readiness?.samples,spanMs:readiness?.spanMs}};
}
