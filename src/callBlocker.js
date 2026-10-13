import {inspectDecisionQuote,isDirection,finiteNumber} from './callIntegrity.js';

export function describeCallBlocker({call,readiness,hold,gateHold,samples,quote,windowId,asset='BTC',now=Date.now()}) {
  const checked=inspectDecisionQuote(quote,{windowId,asset,now});
  // Diagnostic holds live separately from the commit/persistence guard. Use
  // the latest evaluated valid branch, without changing either control ref.
  hold=[gateHold,hold].filter(value=>value?.windowId===windowId&&(!value.asset||value.asset===asset)&&
    now-(value.at||0)>=0&&now-(value.at||0)<10000).sort((a,b)=>b.at-a.at)[0];
  const recentHold=!!hold;
  const currentHold=recentHold&&(!hold.direction||hold.scope==='window'||hold.direction===call?.call);
  const lastGate=recentHold&&!currentHold?{...hold.details,code:hold.code||'commit-check',reason:hold.reason,
    at:hold.at,direction:hold.direction||null,appliesToCurrentDirection:!!currentHold}:null;
  let code=call?.signalBlocker?.code||'signal',reason=call?.caution||call?.reason||'Waiting for a qualifying signal.',
    gate=call?.signalBlocker?{...call.signalBlocker.details,code,reason}:null;
  if(!readiness?.ready){code=readiness?.code||'startup';reason=readiness?.reason||'Waiting for startup data.';gate=null;}
  else if(currentHold){
    code=hold.code||'commit-check';reason=hold.reason;
    gate={...hold.details,code,reason,at:hold.at,direction:hold.direction||null};
  }
  else if(!checked.ok){code='market-quote';reason=`Waiting for a current Kalshi quote (${checked.reason}).`;gate=null;}
  else if(lastGate&&isDirection(call?.call)&&isDirection(hold.direction)){
    code='direction-changed';reason=`Direction changed to ${call.call} after ${hold.direction} was blocked: ${hold.reason}`;
  }
  else if(isDirection(call?.call)){
    code='forming';reason=`Forming ${call.call}: ${Math.round((samples?.count||0)*10)/10} stability samples. ${reason}`;
  }
  return {code,reason,gate,lastGate,windowId,asset,observedAt:now,dataReady:!!readiness?.ready,
    samples:finiteNumber(samples?.count)??0,claimedDirection:samples?.dir||null,
    proposedDirection:isDirection(call?.call)?call.call:null,quoteIssue:checked.ok?null:checked.reason,
    startup:{code:readiness?.code,samples:readiness?.samples,spanMs:readiness?.spanMs}};
}
