// Runs the website's own Call engine (generated from App.jsx) on a server.
//
// Storage and publishing are passed in, so the same core runs in the Durable
// Object and in a plain Node process for local checks. In shadow mode the app
// cannot write anywhere: every cloud write is dropped, every non-read request
// is refused. The engine itself publishes only its own Calls, to a separate doc.

import {createRoot} from './runtime/react.js';
import {configureBrowser, localStorage, idbData, browserStats} from './runtime/browser.js';
import {configureServer, serverStats} from './runtime/server.js';
import {createEngine, APP_SHA256} from './generated/engine-app.js';

export const ENGINE_DEVICE_ID = 'cloud-engine';
export const SHADOW_DOC = 'shadow/engineCalls_v1';
const MAX_CALLS = 300;
const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null);

export class EngineCore {
  // storage: {load(): Promise<{localStorage, idb, calls}>, save({localStorage, idb, calls}): Promise<void>}
  // localStorage and idb carry only changed keys (null = removed).
  // publish: async (doc) => void, for SHADOW_DOC. log: (event, data) => void.
  constructor({storage, publish, mode = 'shadow', log = () => {}, saveMs = 60_000, publishMs = 5 * 60_000}) {
    Object.assign(this, {storage, publishDoc: publish, mode, log, saveMs, publishMs});
    this.calls = [];
    this.errors = [];
    this.errorCounts = {};
    this.alerts = 0;
    this.renders = 0;
    this.last = null;
    this.publishPending = null;
    this.lastPublishAt = 0;
    this.lastPublishError = null;
  }

  async start() {
    const saved = await this.storage.load();
    localStorage.restore(saved.localStorage || {});
    idbData.restore(saved.idb || {});
    this.calls = Array.isArray(saved.calls) ? saved.calls : [];
    // The app tags ledger rows with this id, so the server's rows are easy to tell apart.
    if (localStorage.getItem('tara_deviceId') !== ENGINE_DEVICE_ID) localStorage.setItem('tara_deviceId', ENGINE_DEVICE_ID);
    configureBrowser({mode: this.mode, log: (k, d) => this.log(k, d)});
    configureServer({mode: this.mode, log: (k, d) => this.log(k, d), memo: localStorage});
    const mod = createEngine();
    this.vars = mod.vars;
    this.startedAt = Date.now();
    this.root = createRoot(mod.EngineApp, {__engine: {
      onRender: (s) => this.onRender(s),
      onPersistLock: (snap) => this.recordCall(snap),
      onAlert: () => { this.alerts++; },
    }}, {onError: (err, where) => this.error(err, where)});
    this.root.render();
    this.saveTimer = setInterval(() => this.save().catch((err) => this.error(err, 'save')), this.saveMs);
    this.publishTimer = setInterval(() => this.publish('heartbeat'), this.publishMs);
  }

  stop() {
    clearInterval(this.saveTimer);
    clearInterval(this.publishTimer);
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

  onRender(s) {
    this.renders++;
    this.last = s;
    // Copy settlement results from the app's own ledger onto the server's Calls.
    if (this.renders % 20 === 0 && this.calls.length && Array.isArray(s.taraCallLog)) {
      const byWindow = new Map(s.taraCallLog.filter((e) => e?.windowId).map((e) => [e.windowId, e]));
      let changed = false;
      for (const c of this.calls) {
        const e = byWindow.get(c.windowId);
        if (!e || c.result === (e.result ?? null)) continue;
        c.result = e.result ?? null;
        c.outcomeDir = e.outcomeDir ?? null;
        c.closingPrice = num(e.closingPrice);
        changed = true;
      }
      if (changed) this.publish('settled');
    }
  }

  recordCall(snap) {
    if (!snap?.windowId || !['UP', 'DOWN', 'SIT_OUT'].includes(snap.call)) return;
    if (this.calls.some((c) => c.windowId === snap.windowId)) return;
    const o = snap.originalDecision || {};
    this.calls.push({
      windowId: snap.windowId, call: snap.call, intended: snap._intendedDir || null,
      lockedAt: num(snap._committedAt) ?? Date.now(), secondsLeft: num(o.secondsLeft ?? snap.atSecondsLeft),
      score: num(snap.confidence), tier: snap.tier || null, reason: String(snap.reason || '').slice(0, 240),
      strike: num(snap.strikeAtLock), yesPrice: num(snap.kalshiAtLock), yesBid: num(snap.kalshiBidAtLock), yesAsk: num(snap.kalshiAskAtLock),
      marketTicker: snap.marketTicker || null, probabilityUp: num(o.probabilityUpCurrent), policy: snap.callPolicy || null,
      version: snap.taraVersion || null, result: null,
    });
    if (this.calls.length > MAX_CALLS) this.calls.splice(0, this.calls.length - MAX_CALLS);
    this.log('call', {windowId: snap.windowId, call: snap.call, score: snap.confidence});
    this.publish('call');
    this.save().catch((err) => this.error(err, 'save'));
  }

  async save() {
    await this.storage.save({localStorage: localStorage.takeChanges(), idb: idbData.takeChanges(), calls: this.calls});
  }

  // Coalesces bursts into one write.
  publish(reason) {
    if (!this.publishDoc || this.publishPending) return;
    this.publishPending = setTimeout(async () => {
      this.publishPending = null;
      try { await this.publishDoc(this.doc(reason)); this.lastPublishAt = Date.now(); this.lastPublishError = null; } catch (err) { this.lastPublishError = err?.message || String(err); this.error(err, 'publish'); }
    }, 3000);
  }

  doc(reason) {
    return {schema: 1, reason, updatedAt: new Date().toISOString(), mode: this.mode, appSha256: APP_SHA256, startedAt: this.startedAt,
      health: this.health({brief: true}), calls: this.calls};
  }

  health({brief = false} = {}) {
    const s = this.last || {};
    const tc = s.taraCall || {};
    const r = s.startupReadiness || {};
    const out = {
      mode: this.mode, appSha256: APP_SHA256.slice(0, 16), startedAt: this.startedAt, uptimeS: this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0,
      renders: this.renders, errors: Object.values(this.errorCounts).reduce((a, b) => a + b, 0), alerts: this.alerts,
      price: num(s.currentPrice), kalshiYes: num(s.kalshiYesPrice), strike: num(s.kalshiStrike), windowType: s.windowType || null,
      ready: r.ready ?? null, readiness: r.ready ? undefined : {code: r.code || null, reason: r.reason || null, samples: r.samples ?? null, remainingSeconds: r.remainingSeconds ?? null},
      call: tc.call || null, score: num(tc.confidence ?? tc.score), lockedThisWindow: s.taraCallSnapshotRef?.current?.windowId || null,
      blocker: s.currentCallBlockerRef?.current?.code || null, ledgerRows: Array.isArray(s.taraCallLog) ? s.taraCallLog.length : null,
      calls: this.calls.length, lastPublishAt: this.lastPublishAt || null, lastPublishError: this.lastPublishError,
    };
    if (brief) return out;
    return {...out, recentErrors: this.errors.slice(-15), network: browserStats, cloud: serverStats, localStorageBytes: localStorage.bytes(), idbBytes: idbData.bytes(), lastCalls: this.calls.slice(-8)};
  }
}
