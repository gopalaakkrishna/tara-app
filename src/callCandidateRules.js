import {finiteNumber} from './callIntegrity.js';
import {directionalConfidence} from './callPolicy.js';

// Call-only policy. The intentional user cost band is independent of the
// disabled older EV filters. Do not change execution settings/readers here.
export function readCallCostBand(storage) {
  let enabled=true,minCost=44,maxCost=77;
  try { enabled=storage.getItem('taraCostBandGate')!=='off'; } catch {}
  try { const v=parseFloat(storage.getItem('taraCostBandMin'));if(Number.isFinite(v)&&v>=0&&v<100)minCost=v; } catch {}
  try { const v=parseFloat(storage.getItem('taraCostBandMax'));if(Number.isFinite(v)&&v>0&&v<=100)maxCost=v; } catch {}
  return enabled?{enabled,minCost,maxCost}:{enabled,minCost:0,maxCost:100};
}

// Legacy lean promotion is not signal qualification. Its explicit opt-in must
// agree with the commit policy; a rejected quality read remains a rejected read.
export function postProcessLegacyCall(call, analysis, {allowQualityOverride = false} = {}) {
  if (!call || call.call !== 'SIT_OUT' || call.startupBlocked || !allowQualityOverride) return call;
  const reason = String(call.reason || '').toLowerCase();
  if (['engine still loading','new window','searching for direction','observing fresh data','cold-start-warming-up']
    .some(value => reason.includes(value))) return call;
  const post = finiteNumber(analysis?.rawProbAbove);
  if (post === null || post < 0 || post > 100 || post === 50) return call;
  const direction = post > 50 ? 'UP' : 'DOWN';
  const rangeBps = analysis?.windowAmplitude?.rangeBps || 0;
  return {...call, call:direction, direction, confidence:directionalConfidence(post, direction),
    conviction:Math.abs(post - 50),
    reason:`Directional lock · ${direction} ${Math.abs(post - 50).toFixed(0)}pt · ${rangeBps.toFixed(0)}bps window momentum`,
    _v10_6_8_deadWindow:analysis?.windowAmplitude?.label !== 'OPENING' && rangeBps < 5,
    _v10_6_8_forced:true, _v10_6_8_originalReason:call.reason, _v10_6_8_rangeBps:rangeBps};
}
