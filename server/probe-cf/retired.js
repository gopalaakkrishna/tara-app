// tara-feed-probe is retired (2026-10-26). Step 1 of the always-on engine plan
// passed; the verdict stays in tara_state at research/feedProbe_cloudflare_v1
// and the code in src/ is kept as the record of what was tested.
//
// The engine (server/engine, Worker tara-engine) now needs this account's free
// Durable Object time, so the probe's objects are deleted by migration v2 and
// this Worker only answers with a pointer. No cron, no alarms, no fetches.
export default {
  async fetch() {
    return Response.json({retired: '2026-10-26', results: 'tara_state research/feedProbe_cloudflare_v1',
      engine: 'https://tara-engine.gopalaakkrishna.workers.dev/health'}, {headers: {'Cache-Control': 'no-store'}});
  },
};
