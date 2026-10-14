# Tara 14.7.1 — single decision authority

## Changes

The existing scoring engine owns the forecast direction. The candidate producer
qualifies that direction once; post-qualification side-flip, direction-balancing,
trajectory/reversal flips and extra historical confidence rewrites are retired.
Those features remain upstream inputs or explicitly non-authoritative diagnostics.
Signal score is not advertised as a calibrated probability. No newly trained
shadow model is activated.

Only the verified original P(UP) and official UP outcome enter empirical
probability buckets. Sit-outs, pending records, manual corrections and unverified
history do not enter this feedback. Repeated regime/band/day-hour calibration
pulls and duplicate historical score boosts cannot apply the same outcome again.
Bucket counts, priors and blend caps retain their existing numeric definitions;
this release repairs the eligible data and target, not those numeric thresholds.

Fresh formation is scoped by asset, source, window and direction. A genuinely
new, fresh spot observation is required; a quote must be fresh, correctly scoped
and non-regressing. At most one observation per second advances the original
0.5–1.5 weighted count. Existing tier counts and early-lock conditions remain,
with a minimum elapsed span corresponding to the existing count. A clock render,
old restored counter, stale feed or opposite direction cannot provide evidence.
Manual force overrides remain explicitly manual.
The point release allows up to1 second of synchronous evaluation time after a
fresh receipt. It does not require the clock to remain in the exact same
millisecond; duplicate observations still return before the lock readiness check.

Quiet classification uses elapsed rather than remaining time, retaining the
180-second and 0.4-ratio checks. All downstream trend/chop flags agree with the
final regime; source classifier diagnostics remain in separate fields.
Learning features capture the actual finalized pre-calibration forecast, rather
than a different reconstruction from an intermediate score.

Normal pending-to-settled lifecycle revisions remain auditable but do not count
as prediction amendments. Genuine edits still exclude a row from learning.
Automatic exact-ticker settlement does not mark a row as manually edited.
Closed new-protocol Calls lacking official evidence are queued after30 seconds,
including already locally scored rows. Same-record official evidence triggers
local/cloud sync. A conflicting prior result is preserved and quarantined for
review, not silently relabeled. New-protocol directional Calls remain pending
until this official verification; a rollover price guess is diagnostic only.
Call net cents are explicitly original-quote gross estimates, not fill-based
AutoTrade account profit. No script directly rewrites production history.

## Preserved boundaries

- Automatic15m Call cutoff:420 seconds; no late or clock-forced rescue.
- Early/mid score threshold:65; existing numeric quality, tier and entry checks.
- Intentional Call band:44–77 cents by default, including existing user overrides.
- All AutoTrade settings, staking, orders, exit logic, credentials and live pause.
- Hourly decision algorithm: unchanged except its release version string.
- Original captures, records, existing pages/options and TradingView.

Repairing a feedback input can change the resulting forecast or effective
adaptive state. Retiring an inconsistent override changes which candidate is
presented. Neither is a promise of more locks or greater profitability.

## Verification plan

1. Unit: stale/duplicate/future observations, source/direction changes, weighted
   counts, confirmation span, quiet time semantics, model/score distinction.
2. Actual engine: final regime flags, forecast feature identity, UP/DOWN symmetry.
3. Full extracted application: qualification,65 boundary,420 cutoff, original
   sealing, shared restoration, local canonical row and exact blocker capture.
4. Settlement: exact ticker/window/strike, unavailable or conflicting outcome,
   actual automatic/manual reconciliation function, IDB/local cache and cloud
   signature, unchanged original, eligibility in presentation and learning.
5. Existing entire regression suite including hourly/AutoTrade pause; production
   build and exact-commit Cloudflare public bundle verification.

Tests use isolated fixtures with mocked transport, not an active-money browser.
No production engine is opened or refreshed by deployment checks. A deployment
does not upgrade an already open client. Future live observations are still
required to demonstrate profitable predictive edge or forward-model readiness.

## Rollback

Revert this release commit and redeploy the preceding14.6.1 source if cutoff,
readiness, quote identity, confirmation or settlement invariants fail. Preserve
all history, captures, audit trails and private execution state. Do not reset
records or enable live execution to compensate. Shadow model activation stays off.
