// Tara always-on Call engine, step 2.
//
// src/generated/core.js is Tara's real decision path (analysis, Call candidate,
// commit/seal and the Call lifecycle) pulled out of src/App.jsx at build time
// by scripts/build-core.mjs, so the cloud engine runs exactly the code the
// website runs. This version only loads it and reports its fingerprint: no
// loop, no connections, no writes, so it uses no free-plan allowance yet.
import {DurableObject} from 'cloudflare:workers';
import * as core from './generated/core.js';
import manifest from './generated/manifest.json';

const VERSION = 'tara-engine-core-loaded-2';

export class TaraEngine extends DurableObject {
  async fetch() {
    const functions = Object.fromEntries(Object.entries(manifest.functions).map(([name, f]) => [name, {loaded: typeof core[name] === 'function', scopeKeys: f.scopeKeys.length}]));
    return Response.json({version: VERSION, state: 'core-loaded', appJsxSha256: manifest.sha256.slice(0, 16),
      topLevelHelpers: manifest.topLevel.length, vendoredModules: manifest.vendor.length, functions,
      note: 'Decision code loads on Cloudflare. No loop yet: Calls are still made by the website.'});
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' || (url.pathname !== '/' && url.pathname !== '/health')) return new Response('Not found', {status: 404});
    const stub = env.ENGINE.get(env.ENGINE.idFromName('btc-15m'), {locationHint: 'enam'});
    return Response.json(await (await stub.fetch('https://do/status')).json(), {headers: {'Cache-Control': 'no-store'}});
  },
};
