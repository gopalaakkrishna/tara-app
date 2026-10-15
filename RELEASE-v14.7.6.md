# Tara 14.7.6 — execution safeguards and honest reporting

Live trading remains paused. This release is not approval to trade or proof of a profitable strategy.

- Execution uses durable account/window intent IDs, private reload recovery and same-browser admission locking. A ladder amends one order; ambiguous submissions/cancellations stop, and partial fills retain their actual size.
- Existing trade/day/window/cooldown limits are checked against a conservative reserved-spend budget. Real execution requires complete, fresh account evidence, and the independent unconditional live-entry pause remains enforced.
- Entry sizing includes estimated fees without forcing one unaffordable contract. In-flight work observes current disarm/kill/rollover/cutoff. Exits reject invalid quantity, require the held ticker's fresh quote and use reduce-only orders.
- Fill-derived prices, quantities and fees replace limit-price or quote-based profit. Missing cost/fee evidence remains unknown; an early exit with missing costs cannot be reinterpreted as a hold-to-settlement profit.
- Hourly fresh confirmations save through conditional shared admission before alerting. Delayed settlement writers use the same revision protection. Fees, event discovery, quotes and exact-market settlement honor the configured public API host with a CORS-enabled proxy fallback, retain unresolved picks and expose read failures.
- Public hourly reads make one bounded retry for transient429/service/network failures. Failed or malformed reads never rejuvenate cached quotes or count as confirmations. Extended rate limits stay blocked and visible.
- Sports totals and unfiltered PAPER results use one price-matched sample for win rate, break-even, edge and estimated return. Missing original prices are counted and disclosed. Scalar/cancelled records stay outside binary W/L. Headline, totals and unfiltered lanes remain separate.

Protected: 420-second Call cutoff, Call lock thresholds, hourly thresholds, AutoTrade defaults/migrations and user settings. No credential, scheduler or company Cloudflare change.

Verification: automated failure-path tests plus isolated built-page smoke tests. No real order was placed. Real exchange fill/recovery operation and current-policy forward profitability remain prerequisites to a future live-readiness decision.
