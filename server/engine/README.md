# Tara always-on engine (Cloudflare, free plan)

Step 2 of the always-on engine plan. The goal: Tara makes her BTC 15-minute
Calls in the cloud, every window, without a browser tab open.

## Status

- Running in **shadow mode** since 2026-10-26:
  `https://tara-engine.gopalaakkrishna.workers.dev/health` (status) and
  `/calls` (the engine's Calls).
- Shadow mode means the engine makes its own Calls but cannot touch anything:
  no orders, no Discord, no writes to the site's docs. It publishes only its
  own Calls to `shadow/engineCalls_v1` in `tara_state`, so they can be
  compared with the website's.
- The website still makes the real Calls. Next: a shadow week comparing the
  two, then cutover (browsers display, the engine writes).

## How it works

The engine runs the website's own code, not a copy.
`scripts/build-app.mjs` pulls out of `src/App.jsx` the part of TaraApp that
makes Calls:

- the feeds and polls;
- window tracking and rollover;
- the `analysis` memo;
- the Call candidate, commit/seal and the lifecycle effect;
- every helper and `src/*.js` module those reach.

It finds that slice automatically. It starts from the four decision blocks,
then adds every TaraApp statement that declares or writes something the kept
code reads, and repeats until nothing changes. UI handlers, orders,
positions, cloud restore and alert sound are never pulled in. The build fails
if a kept statement can place an order or post to Discord.

`src/runtime/` lets that code run with no browser:

| File | What it stands in for |
| --- | --- |
| `react.js` | React hooks: one component, same slot order, effects after render |
| `browser.js` | localStorage, IndexedDB, fetch, WebSocket, document, window |
| `server.js` | Supabase reads (REST), live watches (slow poll), writes (dropped) |

The fetch layer sends the site's `/api/*` calls, Kalshi and OKX through the
free Render proxy, since Kalshi answers 429 to Cloudflare. In shadow mode it
refuses every request that is not a plain read, every signed Kalshi request,
the Kalshi WebSocket and Discord.

Durable Objects restart every few hours. localStorage, the IndexedDB archive
(the full ledger) and the Call list are saved to the object's SQLite storage
every 2 minutes and on each Call, so a restart resumes like a page reload. The
9 MB cloud call log is read only on first boot, or when it changed since.

`src/generated/` is not committed. Cloudflare rebuilds it on every deploy
(`npm run build`), so the engine cannot drift from the website.

`scripts/build-core.mjs` is the earlier extraction (four plain functions)
that the decision tests use.

## Checks

- `test/decision.test.mjs` reruns the website's decision scenarios (UP, DOWN,
  the 65 threshold, the 420 s cutoff, bad quotes, formation, cooldown)
  through the generated functions.
- `test/runtime.test.mjs` covers the shadow guard, URL routing, the
  IndexedDB stand-in and the mini React.
- `.github/workflows/engine.yml` runs both generators and all tests whenever
  the app or the engine changes. It is separate from the Pages build, so
  engine work never blocks a website deploy.

From the repo root, after `npm ci`:

```
node server/engine/scripts/build-core.mjs
node server/engine/scripts/build-app.mjs
node --test "server/engine/test/*.test.mjs"
```

A short live check in Node, shadow mode, nothing written anywhere:

```
node server/engine/scripts/run-local.mjs <some-scratch-file.json> 180
```

## Cloudflare settings (Workers Builds)

These apply only to the personal account. Never use the Evolve Pictures account.

| Setting | Value |
| --- | --- |
| Repo | gopalaakkrishna/tara-app |
| Branch | main |
| Root directory | `/server/engine` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview builds | off |

`ENGINE_MODE` in `wrangler.toml` must be `shadow`. The engine refuses to start
otherwise, because live mode is not built yet.

## Free-plan budget

Measured on the feed probe, 2026-10-26. Trade-stream messages do not count as
requests.

| Measure | Used per day | Free allowance per day |
| --- | --- | --- |
| Requests | about 17.6k | 100k |
| Duration | about 7.5k GB-s | 13k GB-s |
| Peak memory | 31 MB | 128 MB |

One always-on object uses about 10.8k GB-s a day, so only one can run. The
feed probe was retired (`server/probe-cf`) when the engine's loop started.
