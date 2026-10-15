# Tara 14.7.2 — window rollover and durable records

## Reproduced causes

- The displayed timer used `ceil((now + 500ms) / interval)` while Call identity
  used epoch floor. Rollover could run 500ms early and restoration could reload
  the previous Call; the lifecycle's unscoped non-null check then skipped the new
  window. Four regression tests reproduced these failures before the fix.
- Closed sit-outs depended on strike availability. A missing snapshot also
  enabled a fallback to an unrelated pending row.
- Fresh-device fast-cache writes never ran with fewer than 50 records. A refresh
  during delayed persistence could lose a capture before its archive/cloud save.
- Hourly discarded unresolved picks after six hours / forty pending entries,
  used blind cloud writes, and inspected only the first open event even when it
  had expired. Missing close metadata produced negative epoch-based timing.

## Changes

Clock, restoration, rendered Call and lifecycle now share epoch window identity.
Stale refs cannot block a new Call. Rollover audit uses canonical IDs; deferred
resolution retains the captured window, not the later callback's clock. Closed
captured sit-outs finalize without price data, including delayed logger updates;
no sit-outs or results are invented for unobserved gaps. Directional results
still require exact-market official settlement.

A synchronous write-ahead journal preserves original capture before React and
throttled persistence. Recovery restores only validated captured decisions,
retains blockers/trace, deduplicates against existing records, and leaves
directional results pending. Successful fast-cache writes acknowledge only the
rows actually saved; small fresh-device records now persist too.

Cloud queues keep a bounded first deadline, send the latest payload, allow urgent
captures to expedite the write, and retry failed record writes without requiring
a new Call. Hourly uses conditional read/merge/write rather than last-write-wins.
Unload no longer bypasses conditional history writes. Offline local records
remain durable; an unloaded/suspended browser cannot guarantee network delivery.

Hourly keeps unresolved records regardless of age or size, retains original
approval evidence on merge, discovers the next valid future market, and labels
unavailable markets honestly. Settlement checks the captured ticker, close,
strike, event where captured, side, official status and yes/no result. A failed
or unavailable verification remains pending and retries normally.

## Unchanged boundaries

- Automatic 15-minute cutoff: strictly before 420 seconds remaining.
- Existing confidence (65), formation/tier/quality, 44–77c default Call band,
  user overrides, hourly price/timing/confirmation/cooldown/lock-count thresholds.
- AutoTrade settings, staking, account/order/exit/reconciliation logic, credentials
  and live-entry safety pause. No orders or production-record edits in this work.
- Pages, controls, options, TradingView and shadow-learning activation policy.

## Verification

Tests execute the production candidate, lifecycle, seal, logger, clock,
rollover and shared restoration code with isolated clocks/storage/transport.
Coverage includes consecutive windows, precise boundary, format-only changes,
missing spot/strike, delayed old callbacks, original evidence, capture recovery,
small caches, pending-to-finalized cloud updates, failure/retry/CAS, hourly fresh
confirmation, event rollover, approvals, duplicate guards, unresolved retention,
exact official settlement and concurrent pending picks. Full build includes the
complete test suite, with two workers to bound memory use of App AST harnesses.
Release validation: all 270 tests passed and Vite production build succeeded.
`tests/buildSmoke.mjs` also rendered the built app at desktop/mobile sizes and
visited AutoTrade, Hourly, Memory, Sports, Weather, Analytics, Brain and Trade
with zero unhandled page errors. It intercepts all backend/market/execution
requests and stubs external Tailwind configuration; this is an isolated runtime
smoke test, not a live-feed or visual-fidelity claim.

No historical gaps are backfilled from guesses. These deterministic tests prove
the exercised paths, not future market wins or successful forward observation.
Production target is Cloudflare Pages at https://taracalls.pages.dev; deployment
verification must check the served release bundle after the main-branch push.
Rollback baseline: 84f4527ad16f7f946e83a5fb65437627d7c97b64 (14.7.1); keep live
execution paused if a new runtime or record-integrity regression appears.
