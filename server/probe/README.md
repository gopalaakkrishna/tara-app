# Tara feed probe

Step 1 of the always-on engine plan. It answers one question before any engine
work starts: which market-data feeds can Tara's Call engine reach from a cloud
server, and how reliably?

It is read-only. It places no orders, holds no exchange credentials and posts
nothing to Discord.

## What it checks

- 22 REST endpoints the browser app polls today: spot, candles, OKX derivatives,
  order book, Bybit, Kalshi 15m and hourly events, Deribit, and two Tara
  Cloudflare functions. Cadences mirror the app.
- 5 trade streams: Binance futures and Bybit, which feed Tara's trade tape today,
  plus OKX, Coinbase and Kraken as replacements in case those two block servers.

## Where results go

Every 5 minutes it upserts `research/feedProbe_railway_v1` in the shared
`tara_state` table, a few KB each time. Each feed gets a verdict:

- `ok`: 99%+ success and no outage over 60s
- `flaky`: reachable but below that bar
- `blocked`: never succeeded

If Railway assigns a port, `GET /health` shows the same summary.

## Deploy (Railway)

- Root directory `server/probe`, start command `npm start`, Node 22 or later.
- Variables `SUPABASE_URL` and `SUPABASE_ANON_KEY`. These are the same public
  values the website already ships.
- Serverless (sleeping) off. Restart policy on failure.

Run it for 24 hours, read the summary, then delete the service. The real
engine replaces it in step 2.
