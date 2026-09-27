# 14.4.1 — Call commit policy

The September 27 shared BTC 15-minute record contained seven consecutive resolved
Call losses with seven intervening sit-outs. Kalshi's public market results
confirmed each of the seven losses. These were Call outcomes; no account fills or
dollar losses were established by this audit.

## Changes

- New automatic 15-minute Calls must commit with more than 420 seconds remaining.
  The clock is derived from the actual window ID, not a candidate's claimed time.
  Five-minute windows retain a separate 30-second cutoff.
- A shared policy runs before snapshot sealing, persistence and logging. It blocks
  forced no-sitout, late-window, timer, no-go edge/data and flagged fallback Calls.
- Clock-only fallback branches are disabled so they cannot prevent normal sample
  formation from qualifying later. Temporary quality/quote blocks keep evaluating
  until the deadline, at which point a clear SITOUT is recorded.
- Quotes must match the asset/window and be current; the probability must support
  the proposed direction. No new win-rate threshold or fitted strategy is introduced.
- DOWN confidence is 100 minus probability of UP; zero and missing inputs are
  distinguished. Decision countdown and visible cutoff match the new policy.
- Existing captured decisions/history are preserved. Explicit user overrides remain
  available and labeled manual. Live AutoTrade entry remains paused from 14.4.0;
  this release changes automatic Calls, not account permissions or position exits.

## Validation and limits

Regression fixtures cover the 17:45 ET UP lock at 73 seconds remaining and 19:00 ET
DOWN lock at 89 seconds remaining. Both are rejected prospectively by the policy;
historical rows are unchanged. Tests cover cutoff boundaries, recovery, quote
identity/freshness, normal valid Calls, manual overrides, persistence and scoring.

This is correctness testing, not evidence of improved future profitability. Earlier
ordinary signals can still lose. All active tabs/devices must reload the new build;
an already captured shared Call retains its original decision.
