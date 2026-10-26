// The cloud layer TaraApp sees when it runs on the server.
//
// Reads go straight to Supabase's REST API with the site's public anon key.
// Live subscriptions become a slow poll (only small docs; the big ledger is
// read once). In shadow mode every write the app attempts is dropped and
// counted, so the engine can never change what the live site shows.

// memo: a localStorage-like store (the engine's, saved across restarts).
const cfg = {mode: 'shadow', pollMs: 5 * 60 * 1000, log: () => {}, memo: null};
export const serverStats = {reads: 0, readBytes: 0, readErrors: 0, polls: 0, bigSkipped: 0, droppedWrites: {}};
export function configureServer(options = {}) { Object.assign(cfg, options); }

// Docs too big to fetch on every pull (the call log is ~9 MB of JSON). The
// app's catch-up pull fires whenever another device heartbeats, so these are
// fetched only when their updated_at moved since this engine last read them.
// The watch's first read (hydrate) is the full load; other reads (catch-up
// pull, log check) wait until a hydrate has succeeded in this process, so a
// partial merge can never mark the doc as already loaded.
const BIG_DOCS = new Set(['memory/taraCallLog', 'memory/hourlyRecord', 'memory/weatherPicks']);
const hydrated = new Set();

const docUrl = (base, path, cols = 'data,updated_at') => `${base}/rest/v1/tara_state?select=${cols}&doc_path=eq.${encodeURIComponent(path)}`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Supabase now and then answers 500 on the 9 MB ledger read; retry 5xx twice.
async function readRow(base, key, path, cols) {
  for (let attempt = 0; ; attempt++) {
    const resp = await globalThis.fetch(docUrl(base, path, cols), {headers: {apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json'}});
    const text = await resp.text();
    serverStats.reads++;
    serverStats.readBytes += text.length;
    if (resp.status >= 500 && attempt < 2) { await wait(2000 * (attempt + 1) ** 2); continue; }
    if (!resp.ok) throw new Error(`Supabase read ${path}: HTTP ${resp.status}`);
    const rows = JSON.parse(text);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }
}

// Two startup effects ask for the same doc at once; share one fetch.
const inflight = new Map();
export function cloudRead(base, key, path, opts = {}) {
  if (!path) return Promise.resolve(null);
  const id = `${path}|${opts.throwOnError ? 1 : 0}|${opts.hydrate ? 1 : 0}`;
  if (!inflight.has(id)) inflight.set(id, readDoc(base, key, path, opts).finally(() => inflight.delete(id)));
  return inflight.get(id);
}

async function readDoc(base, key, path, {throwOnError = false, hydrate = false} = {}) {
  try {
    if (BIG_DOCS.has(path) && cfg.memo) {
      if (!hydrate && !hydrated.has(path)) { serverStats.bigSkipped++; return null; }
      const seenKey = `__engine_seen:${path}`;
      const head = await readRow(base, key, path, 'updated_at');
      if (!head || head.updated_at === cfg.memo.getItem(seenKey)) { serverStats.bigSkipped++; if (hydrate) hydrated.add(path); return null; }
      const row = await readRow(base, key, path);
      if (row?.updated_at) cfg.memo.setItem(seenKey, row.updated_at);
      if (hydrate) hydrated.add(path);
      return row?.data ?? null;
    }
    return (await readRow(base, key, path))?.data ?? null;
  } catch (err) {
    serverStats.readErrors++;
    cfg.log('cloud-read', {path, error: err?.message});
    if (throwOnError) throw err;
    return null;
  }
}

// Stands in for the realtime subscription: calls back when updated_at moves.
export function cloudPoll(base, key, path, callback) {
  let stopped = false, seen = null;
  const tick = async () => {
    if (stopped) return;
    serverStats.polls++;
    try {
      const row = await readRow(base, key, path);
      const at = row?.updated_at ?? null;
      if (seen !== null && at !== seen && !stopped) callback(row?.data ?? null);
      seen = at;
    } catch (err) { serverStats.readErrors++; cfg.log('cloud-poll', {path, error: err?.message}); }
  };
  tick();
  const id = setInterval(tick, cfg.pollMs);
  return () => { stopped = true; clearInterval(id); };
}

export function droppedWrite(kind, path) {
  const k = `${kind}:${path || '?'}`;
  serverStats.droppedWrites[k] = (serverStats.droppedWrites[k] || 0) + 1;
  return Promise.resolve(null);
}
