# Tara 14.6 — verified continuous shadow learning

## What is automatic

- Capture the original BTC feature vector at the engine's pre-ML checkpoint. Seal a copy and frozen model predictions into the original Call, never a reconstructed historical row.
- Observe BTC 15-minute windows, including fully observed sit-outs. Existing research coordination remains one writer per device. A closed/throttled browser produces an observation gap, not a simulated sit-out.
- Capture hourly probability, confidence, executable side cost and fresh quote identity at approval. Weather captures its original probability, price and market close; live arithmetic and paper forecasts remain separate.
- The hosted hourly workflow reads public evidence, checks new labels against exact official markets, deduplicates and maintains a bounded derived archive independent of the dashboard's rolling cap. It never writes Calls, Supabase history, account state, orders or settings.
- Fit deterministic models only after 80 training and 30 later held-out independent windows/events, with a one-hour purge. Normalization is fitted on training data only. Freeze the candidate and holdout while collecting forward predictions.
- Forward predictions must have been independently seen by a trainer job at least a minute before market close. A backdated browser timestamp or a prediction reconstructed after settlement does not pass. Hourly scheduling can miss some windows; those predictions do not become independent forward proof.
- Source corrections or exclusions invalidate affected candidates. Failed forward candidates are retired and retrained. Failed source reads retain the archive and expose source health rather than silently clearing evidence.
- Publish an aggregate versioned registry without rebuilding production on every fit. The Pages GET-only endpoint reads this fixed, owned artifact. Analytics and Brain display coverage, held-out metrics, forward counts, exclusions and source health.

## What is deliberately NOT automatic

Live promotion is disabled. A probability improvement in a shadow classifier is not proof that the full Call policy or AutoTrade will earn more. The registry reports `ready-for-policy-review`, never silently activates it. At least 100 independent forward groups, chronological and forward probability improvement, and estimated fee-aware evidence are required even for review readiness. Pick-calibration profiles keep the same picks: they cannot claim improved trading profit simply from recalibrating probabilities.

The old random/in-sample ML activation and event-by-event live gradient updates are retired. Existing saved weights are retained, not reset. Existing statistical summary/multiplier formulas remain, but refresh on canonical evidence contents instead of the stale maximum lifetime count. In 14.6.1 these summaries also require matching official early-window outcomes; legacy unverified WIN/LOSS labels and manual results cannot adjust them. The Analytics adapter now understands the real writer's `outcomeDir` schema and rejects known wrong-window or conflicting settlement evidence. Personal/manual outcomes do not update model weights.

The 15-minute cutoff stays at 420 seconds. Call/hourly lock thresholds, confirmation policy, cost bands, cooldown rules and all AutoTrade settings remain unchanged. Live execution remains paused. Original Calls, records, controls and TradingView remain in place.

## Profiles and current limits

| Profile | Trusted evidence | Limitation |
| --- | --- | --- |
| BTC 15m | Original Calls and complete data-ready research windows; exact Kalshi result | Old captures lack features; partial/unobserved windows excluded |
| BTC 5m | Original Calls; exact Kalshi result | No full-window 5m research collector in this release |
| BTC hourly | Original approved pick and matching official close/result | Old picks remain visible but do not acquire invented captures |
| Weather paper / live | Original pick, fresh quote and exact Kalshi result | Model calibration is not an independent proof of live profitability |
| Sports | Prospective frozen external-source pick snapshots and source-health reporting | Existing export lacks independently verifiable settlement identity; not admitted as trusted labels |

## Operations and rollback

Production is Cloudflare Pages at `https://taracalls.pages.dev`, deployed from `main` of `gopalaakkrishna/tara-app`. The Sites URL is only the design preview.

`Tara continuous learning - shadow validation` runs hourly around minute 23 UTC and via workflow dispatch. GitHub scheduling is best-effort, not an exact execution deadline. A public-repo workflow token publishes only this repo's derived release assets; no new persistent keys or account credentials are required. No Supabase permissions/migrations change.

`learning-registry-v1` retains immutable `registry-<timestamp>.json` audit snapshots, one rolling trainer archive and the current registry. Archive loss fails closed. A registry older than 48 hours is shown as stale; no model becomes live on endpoint failure. Evidence retention is bounded to 20,000 derived rows and 180 days of pre-close witnesses.

To roll back UI/source: revert this release commit and redeploy the previous production commit. Do not reset history, weights, orders or local storage. To stop training: disable this one GitHub workflow. A failed trainer/publication keeps the previous artifact; it is not a reason to rewrite Call outcomes or loosen gates. Future live-model promotion requires a separately reviewed full-policy experiment and an explicit release, with a previous champion kept for rollback.

## Release verification

- Pure tests cover missing signals, immutable capture, exact label identity, manual exclusions, chronology/purge, no test normalization leakage, deduplication, frozen forward evidence, independent pre-close witnessing, source correction invalidation, fee-aware review readiness and no live activation.
- Production scoring/Call/hourly harnesses execute the real decision path. Legacy 99% training accuracy cannot activate ML.
- All original decision, refresh/restoration, exact blocker, cloud sync, settlement and execution-pause regression tests remain mandatory.
- Desktop and 390px mobile visual QA use an isolated local fixture with network writes intercepted. The fixture's 61%/56% metrics and counts are invented test data, not production performance. TradingView telemetry can be blocked in the test environment; this is not a React/model failure.
- Before claiming live: require a successful Cloudflare deployment for the exact commit, a served bundle carrying `v14.6.0-verified-shadow-learning`, a successful independent trainer workflow/public artifact and a valid GET `/api/learning`. Do not reload the user's active trading tab for verification.

References: [GitHub scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [Cloudflare Pages build limits](https://developers.cloudflare.com/pages/platform/limits/).
