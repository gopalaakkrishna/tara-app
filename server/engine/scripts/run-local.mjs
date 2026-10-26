// Runs the engine in Node against live feeds, in shadow mode, for a short
// check before deploying. Nothing is written anywhere: storage is a JSON file
// you name, and publishing only prints.
//   node scripts/run-local.mjs <state.json> [seconds=180]
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {EngineCore} from '../src/engine.js';

const [file, seconds = '180'] = process.argv.slice(2);
if (!file) { console.error('usage: node scripts/run-local.mjs <state.json> [seconds]'); process.exit(2); }
const state = {localStorage: {}, idb: {}, calls: [], ...(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {})};
const storage = {
  load: async () => state,
  save: async ({localStorage, idb, calls}) => {
    for (const [part, changes] of [['localStorage', localStorage], ['idb', idb]]) {
      for (const [k, v] of Object.entries(changes)) { if (v === null) delete state[part][k]; else state[part][k] = v; }
    }
    state.calls = calls;
    writeFileSync(file, JSON.stringify(state));
  },
};
const t0 = Date.now();
const engine = new EngineCore({storage, mode: 'shadow', saveMs: 30_000, publishMs: 60_000,
  publish: async (doc) => console.log(`[publish] ${doc.reason} calls=${doc.calls.length}`),
  log: (event, data) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${event}`, JSON.stringify(data).slice(0, 300))});
await engine.start();
const every = setInterval(() => console.log('[health]', JSON.stringify(engine.health({brief: true}))), 20_000);
setTimeout(async () => {
  clearInterval(every);
  await engine.save();
  console.log('[final]', JSON.stringify(engine.health(), null, 1).slice(0, 6000));
  engine.stop();
  process.exit(0);
}, Number(seconds) * 1000);
