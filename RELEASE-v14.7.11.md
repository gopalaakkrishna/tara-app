# v14.7.11 — fresh early BTC Call confirmation

Human-authorized response to excessive waits. Personal Cloudflare taracalls only
(5bd757dd1285beb06bf95ef9e2962c6b). No live-entry activation, order, setting,
budget reset, scheduler, account, credential or historical-record changes.

## Intentional policy change

The flat-gap branch previously returned before the ordinary tier/sample checks,
even when an early candidate was otherwise strong and cheap. In BTC15m's first
120 seconds only, a separately confirmed candidate may now continue through
those checks. This is a narrow additional eligibility path, not a promise of
more winners and not a blanket reduction in signal or price thresholds.

Eligibility requires an already qualified direction, signal score at least75,
same-side forecast probability at least72%, aligned FGT at least0.7, at least two
of the15/30/60-second tape windows70% aligned, reference on the favorable side of
the strike, valid current-market book with spread at most2c, and executable
directional ask44–68c (also respecting any tighter user Call bounds).

Confirmation uses distinct spot and quote receipts, at least one second apart,
fresh spot within15s and quote within30s. It requires the ordinary current tier's
weighted sample requirement with a minimum of3, never a single clock tick.
Direction/source/window/market/strike changes, bid retreats, qualification dips,
invalid data and gaps over15s restart or discard the early proof. Existing
readiness, timing, no-go, frozen-feed, adverse cooldown, Tier1, shared capture,
commit/seal and immutable-original checks still run.

The global44–77c band,420-second cutoff, raw forecast and candidate producer,
ordinary tier thresholds, hourly policy, AutoTrade defaults/migrations, risk
limits, consumed reservations, order/exit transport and v14.7.10 sync remain
unchanged. Live entry remains unconditionally paused even if local settings
were previously armed. A Call is not an executed trade.

## Verification and remaining uncertainty

Regression first reproduced the old failure. Unit and real lifecycle tests cover
UP/DOWN, exact eligibility boundaries, missing/stale/future/wrong-market data,
duplicate clock/quote/spot observations, source and bid resets, genuine waits,
adverse cooldown and cutoff, plus single immutable local/cloud capture and exact
official settlement identity. The complete production suite and build must pass
before release. Isolated UI smoke blocks production traffic and uses no account
credentials. Release evidence is saved separately in outputs.

This prospective policy has no validated new live/paper performance sample.
The earlier missed winning window is diagnosis, not a filled trade or backtest.
No claim about after-fee improvement, stop-loss benefit, slippage or profitability
is made. Old paper cohorts remain final and are not resumed or backfilled.

## Rollout and rollback

Release only to the existing personal Cloudflare Pages taracalls project. Verify
the delivered source/version and successful exact-commit deployment; never use
company/Evolve infrastructure. Do not reload or open another production engine.
The human refreshes their existing Tara tab once after the release is verified.

Hold release on any protected-policy drift, duplicate or wrong-identity capture,
unsafe data confirmation, app-render regression, settings change or loss of the
live-entry pause. If one appears after deployment, stop new testing, preserve
evidence and propose restoring the prior18fedbd personal deployment. No automatic
rollback, record rewrite, trade, settings change or budget reset is authorized.
