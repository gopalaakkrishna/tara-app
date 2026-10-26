# Tara always-on engine (Cloudflare, free plan)

Step 2 of the always-on engine plan. The goal: Tara makes her BTC 15-minute
Calls in the cloud, every window, without a browser tab open.

## Status

- Done: the decision path is extracted from `src/App.jsx` and loads on
  Cloudflare. `/health` reports it.
  `https://tara-engine.gopalaakkrishna.workers.dev/health`
- Next: the feeds, the per-second loop, shadow writes, and saving state
  across Cloudflare restarts. The feed probe saw about 4 restarts a day.
- Calls are still made by the website. The engine writes nothing until the
  shadow week, and becomes the Call writer only at cutover.

## How the decision code gets here

`scripts/build-core.mjs` pulls four blocks out of `src/App.jsx` as plain
functions. Nothing is copied by hand.

| Function | Source in App.jsx |
| --- | --- |
| `computeAnalysis(scope)` | the `analysis` useMemo body |
| `produceTaraCall(scope)` | the `taraCall` candidate IIFE and its post-processing |
| `makeCallCommit(scope)` | `_prepareCallCommit` / `_sealCallSnapshot` |
| `runCallLifecycle(scope)` | the Call lifecycle useEffect |

`scope` carries what TaraApp keeps in hooks. `src/generated/manifest.json`
lists the inputs each function needs.

Along with the four blocks, the generator also:

- emits every App.jsx top-level helper the blocks reach, with setters for the
  mutable ones;
- vendors the `src/*.js` modules they import. React hooks are stripped from
  `useEconomicCalendar.js` and `startupReadiness.js`, and their plain exports
  are kept.

`src/generated/` is not committed. Cloudflare rebuilds it on every deploy
(`npm run build`), so the engine cannot drift from the website.

## Checks

`test/decision.test.mjs` reruns the website's decision-path scenarios through
the generated functions:

- UP and DOWN locks
- the 65 threshold
- the 420 s cutoff
- bad quotes
- formation
- the adverse cooldown

`.github/workflows/engine.yml` runs it whenever the app or the engine changes.
It is kept separate from the Pages build, so engine work never blocks a website
deploy.

From the repo root, after `npm ci`:

```
node server/engine/scripts/build-core.mjs
node --test "server/engine/test/*.test.mjs"
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

## Free-plan budget

Measured on the feed probe, 2026-10-26. Trade-stream messages do not count as
requests.

| Measure | Used per day | Free allowance per day |
| --- | --- | --- |
| Requests | about 17.6k | 100k |
| Duration | about 7.5k GB-s | 13k GB-s |
| Peak memory | 31 MB | 128 MB |

The probe and the engine cannot both run around the clock: delete the probe
Worker before the engine's loop starts.
