# v14.7.12 — quiet BTC Call delivery

Notification-only release, authorized October 19, 2026 for the existing Kalshi Demons tara-btc channel. Personal Cloudflare Pages `taracalls` only (account `5bd757dd1285beb06bf95ef9e2962c6b`).

## What changes

- Only saved, confirmed BTC 15-minute Calls and accepted persisted BTC hourly locks enter the Discord feed. Candidates, sit-outs, manually forced/edited records, and coach/whale notes never post. Coach and whale analysis remains on the dashboard.
- The old 15m sender compared a formatted clock label against an ISO window identity and marked its transient `sentLock` flag before a Discord receipt. The new projection reads the actual captured original and durable journal/ledger, independently of the visible workspace.
- One original message per canonical Call in this browser. Exact-contract official settlement and the current verified record edit that message by ID. No standalone result, coach, whale, daily, manual-signal or test-message blasts.
- Original side-aware executable quote, capture time, expiry, ticker and signal score are retained. Paper Call / not a fill / fees extra / score is not win probability are explicit. No claim of real fees, slippage, fills, P&L or profitability.
- Separate 15m/hourly verified retained records, today (ET), last 20 settled Calls and rolling 7 days, with denominators. Excludes sit-outs, manually amended/overridden Calls and unverified/legacy outcomes; not necessarily the broader dashboard historical count.
- The most recent acknowledged message per timeframe refreshes its record; any previously acknowledged Call updates its own official result. Historical Calls from before feed activation are not blasted.

## Reliability and limits

- Dedicated local durable outbox; synchronous successful save before any network POST; `wait=true` and matching message/webhook/channel receipt required before delivered. Validate the existing tara-btc destination with a read-only metadata check.
- Origin-wide Web Lock prevents competing tabs from draining this browser's queue. Whole-webhook rate-limit backoff, five bounded attempts for explicit429 and idempotent result edits. Connection verification also backs off. Refresh preserves queue and receipts. No trading journal/settings reset.
- Network timeout,5xx, invalid/missing acknowledgement, or interrupted POST are **uncertain**, never blindly reposted. There is no exactly-once guarantee from Discord webhooks. A receipt/save failure may require checking the channel.
- Closed unsent Calls expire without a stale blast. An invalid/deleted webhook or message, mismatched recipient, storage failure, conflicting original, or exhausted retries is visible on the dashboard. Never replace a missing original with a result blast.
- Browser-local receipts are not cross-device coordination or an always-on server. Existing Tara tab must remain open and online. No new Cloudflare worker, account, database, credential, cron or monitor is introduced. A user refresh of the existing tab is required after deployment; no second production engine.
- Existing historical Discord posts are not deleted or rewritten by this release. New result edits apply only to messages whose IDs this feed acknowledges.

## Protected scope

v14.7.11 baseline `74dd8a10d66fb8541663aca753a1414ea8f4cec0`. Entry rules,420s cutoff, thresholds, early confirmation, hourly admission, AutoTrade/settings, sizing, budgets, stops/exits, exchange transport, real-entry pause, original Call capture and cloud-sync code remain unchanged. Scope tests compare20 protected files and actual engine/commit/execution ASTs to that baseline.

## Verification / rollout

Run complete tests and production-equivalent build with the existing API-base build environment. Exercise isolated desktop/mobile UI with production traffic blocked. Verify the exact personal Cloudflare deployment and delivered bundle; report any unrelated Vercel failure separately. No synthetic Discord or exchange message is used as proof of natural Call delivery.

Rollback trigger: unexpected trading/policy diff, missing sender UI, duplicate synthetic/candidate posting, incorrect record denominator, or result POST. Stop rollout and revert this notification release only; never alter records, settings, production cron or live-entry pause.

Discord API reference: https://docs.discord.com/developers/resources/webhook — execute with server acknowledgement, retrieve/edit by message ID, rate-limit handling and explicit allowed_mentions.
