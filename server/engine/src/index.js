// Tara always-on Call engine, step 2 scaffold.
//
// This first version only proves the deploy path: the Worker and its Durable
// Object exist on the personal Cloudflare account and redeploy from GitHub on
// every push. It runs no loop, opens no connections and writes nothing, so it
// costs no free-plan allowance while the engine is built.
import {DurableObject} from 'cloudflare:workers';

const VERSION = 'tara-engine-scaffold-1';

export class TaraEngine extends DurableObject {
  async fetch() {
    return Response.json({version: VERSION, state: 'scaffold', note: 'No loop yet. Calls are still made by the website.'});
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
