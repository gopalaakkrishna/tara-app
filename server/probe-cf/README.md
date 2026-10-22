# Tara feed probe (Cloudflare, free plan)

Step 1 of the always-on engine plan. Before any engine work, it answers three
questions on Cloudflare's free plan:

1. Which market-data feeds answer from Cloudflare's servers?
2. Can a free Durable Object run Tara's real scoring engine on every tick?
   Cloudflare's docs disagree on the free CPU cap (10 ms or 30 s). `CpuTest`
   runs the engine in batches of 1, 5, 10, 25 and 50 and counts which finish.
3. Does an always-on object with trade streams stay inside the free limits?

It is read-only. It places no orders, holds no exchange credentials and posts
nothing to Discord. It runs only on the personal Cloudflare account
(`account_id` is pinned in `wrangler.toml`), never on the Evolve Pictures account.

## Moving parts

- **FeedProbe** (Durable Object): ticks every 5 s.
  - Runs 23 REST checks at the app's own cadences.
  - Runs the engine once per tick.
  - Keeps two trade streams open, rotating every 15 minutes:
    - Binance + Bybit
    - OKX + Coinbase
    - Kraken + Bybit
- **CpuTest** (Durable Object): one engine batch every 5 minutes.
- **Cron**: every minute, re-arms both alarms. This is the watchdog.
- **Results**: upserts `research/feedProbe_cloudflare_v1` in the shared
  `tara_state` table every 5 minutes. `GET /health` on the workers.dev URL shows
  the same summary.

## Rebuilding the engine snapshot

`src/engine.generated.js` is Tara's `computeV99Posterior` and every helper it
reaches, pulled out of `src/App.jsx` by `scripts/build-engine.mjs`. That script
uses the same AST walk as `tests/helpers/scoreEngineHarness.js`. It is committed,
because Cloudflare builds this Worker from this folder alone. Regenerate it from
the repo root after `npm ci`:

```
node server/probe-cf/scripts/build-engine.mjs
```

## Deploy

Cloudflare Workers Builds, connected to this repo:

- Root directory: `server/probe-cf`
- Deploy command: `npx wrangler deploy`

Free-plan budget per day, roughly:

- About 21k Durable Object requests out of 100k.
- About 10,800 GB-s of duration out of 13,000.
- 1,440 cron runs.

## Local testing on Windows

Pass a short `--persist-to` path. The default `.wrangler` storage path under a
deep folder exceeds Windows' 260-character limit, and every Durable Object call
then fails with an opaque "internal error".

## When step 1 is done

Delete the Worker in the Cloudflare dashboard and remove this folder. The real
engine replaces it in step 2 and needs the free duration budget for itself.
