// Runs the website's own Call engine (generated from App.jsx) on a server.
//
// Storage and publishing are passed in, so the same core runs in the Durable
// Object and in a plain Node process for local checks. In shadow mode the app
// cannot write anywhere: every cloud write is dropped, every non-read request
// is refused. The engine itself publishes only its own Calls and the shadow
// comparison (src/compare.js), to a separate doc.

import {createRoot} from './runtime/react.js';
import {configureBrowser, localStorage, idbData, browserStats} from './runtime/browser.js';
import {configureServer, serverStats, cloudRead} from './runtime/server.js';
import {createEngine, APP_SHA256} from './generated/engine-app.js';
import {readCapturedCallSettlement} from './generated/vendor/callSettlement.js';
import {ShadowCompare} from './compare.js';

export const ENGINE_DEVICE_ID = 'cloud-engine';
export const SHADOW_DOC = 'shadow/engineCalls_v1';
const PUBLISH_ROWS = 96; // one day of windows in the published doc; all of them stay in storage
const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null);

export class EngineCore {
  // storage: {load(): Promise<{localStorage, idb, compare}>, save({localStorage, idb, compare}): Promise<void>}
  // localStorage and idb carry only changed keys (null = removed).
  // supabase: {url, key} for reads (the public anon key). publish: async (doc) => void, for SHADOW_DOC.
  constructor({storage, publish, supabase, mode = 'shadow', log = () => {}, saveMs = 60_000, publishMs = 5 * 60_000, compareMs = 15_000}) {
    Object.assign(this, {storage, publishDoc: publish, supabase, mode, log, saveMs, publishMs, compareMs});
    this.errors = [];
    this.errorCounts = {};
    this.alerts = 0;
    this.renders = 0;
    this.last = null;
    this.publishPending = null;
    this.lastPublishAt = 0;
    this.lastPublishError = null;
    this.compare = new ShadowCompare({
      readDoc: (path) => cloudRead(supabase.url, supabase.key, path, {throwOnError: true}),
      settle: (entry, now) => readCapturedCallSettlement(entry, {now}),
      log: (k, d) => this.log(k, d),
    });
  }

  async start() {
    const saved = await this.storage.load();
    localStorage.restore(saved.localStorage || {});
    idbData.restore(saved.idb || {});
    this.compare.restore(saved.compare);
    // The app tags ledger rows with this id, so the server's rows are easy to tell apart.
    if (localStorage.getItem('tara_deviceId') !== ENGINE_DEVICE_ID) localStorage.setItem('tara_deviceId', ENGINE_DEVICE_ID);
    configureBrowser({mode: this.mode, log: (k, d) => this.log(k, d)});
    configureServer({mode: this.mode, log: (k, d) => this.log(k, d), memo: localStorage});
    const mod = createEngine();
    this.vars = mod.vars;
    this.startedAt = Date.now();
    this.root = createRoot(mod.EngineApp, {__engine: {
      onRender: (s) => { this.renders++; this.last = s; },
      onPersistLock: (snap) => this.recordCall(snap),
      onAlert: () => { this.alerts++; },
    }}, {onError: (err, where) => this.error(err, where)});
    this.root.render();
    this.saveTimer = setInterval(() => this.save().catch((err) => this.error(err, 'save')), this.saveMs);
    this.publishTimer = setInterval(() => this.publish('heartbeat'), this.publishMs);
    this.compareTimer = setInterval(() => this.compare.tick().then((changed) => { if (changed) this.publish('compare'); }), this.compareMs);
  }

  stop() {
    for (const t of [this.saveTimer, this.publishTimer, this.compareTimer]) clearInterval(t);
    this.root?.unmount();
  }

  error(err, where) {
    const message = `${where}: ${err?.message || String(err)}`;
    this.errorCounts[message] = (this.errorCounts[message] || 0) + 1;
    if (this.errorCounts[message] <= 3) {
      this.errors.push({at: Date.now(), where, message: err?.message || String(err), stack: String(err?.stack || '').split('\n').slice(1, 3).join(' | ')});
      if (this.errors.length > 30) this.errors.shift();
      this.log('error', {where, message: err?.message});
    }
  }

  recordCall(snap) {
    if (!snap?.windowId || !['UP', 'DOWN', 'SIT_OUT'].includes(snap.call)) return;
    if (!this.compare.recordEngine(snap)) return;
    this.log('call', {windowId: snap.windowId, call: snap.call, score: snap.confidence});
    this.publish('call');
    this.save().catch((err) => this.error(err, 'save'));
  }

  async save() {
    await this.storage.save({localStorage: localStorage.takeChanges(), idb: idbData.takeChanges(), compare: this.compare.snapshot()});
  }

  // Coalesces bursts into one write.
  publish(reason) {
    if (!this.publishDoc || this.publishPending) return;
    this.publishPending = setTimeout(async () => {
      this.publishPending = null;
      try { await this.publishDoc(this.doc(reason)); this.lastPublishAt = Date.now(); this.lastPublishError = null; } catch (err) { this.lastPublishError = err?.message || String(err); this.error(err, 'publish'); }
    }, 3000);
  }

  rows() {
    return [...this.compare.rows.values()].sort((a, b) => a.windowId.localeCompare(b.windowId));
  }

  doc(reason) {
    return {schema: 2, reason, updatedAt: new Date().toISOString(), mode: this.mode, appSha256: APP_SHA256, startedAt: this.startedAt,
      health: this.health({brief: true}), comparison: this.compare.summary(), windows: this.rows().slice(-PUBLISH_ROWS)};
  }

  health({brief = false} = {}) {
    const s = this.last || {};
    const tc = s.taraCall || {};
    const r = s.startupReadiness || {};
    const out = {
      mode: this.mode, appSha256: APP_SHA256.slice(0, 16), startedAt: this.startedAt, uptimeS: this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0,
      boots: this.compare.boots, renders: this.renders, errors: Object.values(this.errorCounts).reduce((a, b) => a + b, 0), alerts: this.alerts,
      price: num(s.currentPrice), kalshiYes: num(s.kalshiYesPrice), strike: num(s.kalshiStrike), windowType: s.windowType || null,
      ready: r.ready ?? null, readiness: r.ready ? undefined : {code: r.code || null, reason: r.reason || null, samples: r.samples ?? null, remainingSeconds: r.remainingSeconds ?? null},
      call: tc.call || null, score: num(tc.confidence ?? tc.score), lockedThisWindow: s.taraCallSnapshotRef?.current?.windowId || null,
      blocker: s.currentCallBlockerRef?.current?.code || null, ledgerRows: Array.isArray(s.taraCallLog) ? s.taraCallLog.length : null,
      windows: this.compare.rows.size, lastPublishAt: this.lastPublishAt || null, lastPublishError: this.lastPublishError,
    };
    if (brief) return out;
    return {...out, recentErrors: this.errors.slice(-15), network: browserStats, cloud: serverStats, localStorageBytes: localStorage.bytes(), idbBytes: idbData.bytes(), lastWindows: this.rows().slice(-6)};
  }
}
