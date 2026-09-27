import {finiteNumber, inspectDecisionQuote, isDirection, windowCloseMs} from './callIntegrity.js';

export const CALL_POLICY_VERSION = '14.4.1';
export const ALLOW_CLOCK_FORCED_CALLS = false;
export const callLockDeadline = windowType => windowType === '15m' ? 420 : 30;
export function directionalConfidence(probabilityUp, direction) {
  const p = finiteNumber(probabilityUp);
  if (p === null || p < 0 || p > 100 || !isDirection(direction)) return null;
  return direction === 'UP' ? p : 100 - p;
}

const fallbackTiers = new Set(['late-window-forced', 'no-sitout-commit', 'time-cap-commit', 'timer-commit', 'no-go-edge', 'no-go-data']);

// One decision boundary for fresh automatic Calls. Existing sealed decisions and
// explicit manual overrides retain their identity. No outcome data is used here.
export function assessCallCommit(snapshot, context) {
  if (!snapshot || snapshot.originalDecision || snapshot.tier === 'decision-deadline') return {action:'keep'};
  if (snapshot.isUserForced || snapshot.tier === 'user-forced') return {action:'manual'};
  const {windowId, windowType = '15m', now = Date.now()} = context;
  const secondsLeft = (windowCloseMs(windowId) - now) / 1000;
  const cutoff = callLockDeadline(windowType);
  if (!Number.isFinite(secondsLeft)) return {action:'wait', reason:'Window timing is unavailable.'};
  if (secondsLeft <= cutoff) return {action:'sitout', reason:windowType === '15m'
    ? 'No qualifying Call before the 7-minute cutoff. Sitting out this window.'
    : 'No qualifying Call before the 30-second cutoff. Sitting out this window.', secondsLeft, cutoff};
  if (!isDirection(snapshot.call)) return {action:'wait', reason:snapshot.reason || 'Waiting for a qualifying signal before the cutoff.', secondsLeft, cutoff};
  if (fallbackTiers.has(snapshot.tier) || snapshot._v10_7_5_forced || snapshot._noSitoutFrom || snapshot.isNoGo || snapshot.wasOverriddenNoTrade) {
    return {action:'wait', reason:'Waiting for a qualifying signal; a timer or failed quality check cannot force a Call.', secondsLeft, cutoff};
  }
  const quote = inspectDecisionQuote(context.quote, {...context, now});
  if (!quote.ok) return {action:'wait', reason:`Waiting for a current market quote (${quote.reason}).`, secondsLeft, cutoff};
  const confidence = directionalConfidence(snapshot.atPosterior, snapshot.call);
  if (confidence === null || confidence <= 50) return {action:'wait', reason:'Waiting for the model probability to support the proposed direction.', secondsLeft, cutoff};
  return {action:'allow', secondsLeft, cutoff};
}

export function deadlineSitout(snapshot, decision) {
  return {...snapshot, call:'SIT_OUT', direction:'SIT_OUT', dir:'SIT_OUT', locked:true,
    tier:'decision-deadline', noGoCategory:'decision-deadline', isNoGo:false,
    wasOverriddenNoTrade:false, earlyLock:false, reason:decision.reason, caution:null,
    atSecondsLeft:decision.secondsLeft,
    callPolicy:{version:CALL_POLICY_VERSION, action:'sitout', reason:decision.reason,
      proposedDirection:isDirection(snapshot?.call) ? snapshot.call : null,
      proposedTier:snapshot?.tier || null, cutoff:decision.cutoff}};
}
