// Evidence only. This module cannot decide a Call or change an execution gate.
export function appendDecisionTrace(previous, event) {
  const trace=previous?.windowId===event.windowId?previous:{schema:1,windowId:event.windowId,events:[],omitted:0};
  const events=trace.events.slice();
  // Aggregate consecutive repeated branches (timing/sample often interleave).
  // Keep first timestamp and values, latest values, count and peak confidence.
  // This is bounded evidence, not a claim that every tick was retained.
  const key=e=>JSON.stringify([e.code,e.direction,e.rejectedTier,e.gate?.timing,e.gate?.tier,
    e.gate?.requiredConfidence,e.gate?.requiredSamples,e.quoteIssue,e.dataReady,
    ['timing-approved','sample-stability'].includes(e.code)?null:e.reason]);
  const index=events.findLastIndex((e,i)=>i>=events.length-2&&key(e)===key(event)&&event.at-(e.lastAt||e.at)<5000);
  if(index>=0){
    const first=events[index];
    const merged={...first,lastAt:event.at,evaluations:(first.evaluations||1)+1,
      latest:{confidence:event.confidence??null,directionalPrice:event.directionalPrice??null,
        samples:event.samples??null,requiredSamples:event.requiredSamples??null,reason:event.reason,gate:event.gate||null},
      peakConfidence:Math.max(first.peakConfidence??first.confidence??0,event.confidence??0)};
    events.splice(index,1);events.push(merged);
    return {...trace,events};
  }
  events.push({...event});
  // Preserve the initial chronology and the most recent returning branches.
  if(events.length>16){events.splice(6,1);return {...trace,events,omitted:trace.omitted+1};}
  return {...trace,events};
}

export function captureDecisionTrace(trace, windowId) {
  return trace?.windowId===windowId?JSON.parse(JSON.stringify(trace)):null;
}
