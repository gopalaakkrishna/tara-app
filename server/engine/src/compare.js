// Shadow-week comparison: the cloud engine's Calls against the website's.
//
// One row per 15-minute window since the comparison started. The engine side
// is what this engine committed. The site side is the shared lock the website
// published (state/currentLock_BTC_15m), read just after the 7-minute cutoff
// and again after close. That doc is written only while someone has Tara open,
// so the site side is empty for windows nobody watched. Every window is
// settled from Kalshi's official market result, and both sides are graded the
// same way: a Call costs the ask on its side at lock, wins 100, and pays
// Kalshi's taker fee (src/executionSafety.js executionFeeCents).

export const WINDOW_MS = 15 * 60 * 1000;
const SITE_DOC = 'state/currentLock_BTC_15m';
const MAX_WINDOWS = 3000;
const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const isDir = (c) => c === 'UP' || c === 'DOWN';

export const windowIdAt = (ms) => `15m-${new Date(Math.floor(ms / WINDOW_MS) * WINDOW_MS).toISOString()}`;
export const windowClose = (windowId) => Date.parse(String(windowId).slice(4)) + WINDOW_MS;
export const feeCents = (price) => Math.ceil(7 * (price / 100) * (1 - price / 100));

// What one side paid for its Call, in cents, from the quote at lock.
export function costCents(side) {
  if (!side || !isDir(side.call)) return null;
  let ask;
  if (side.call === 'UP') ask = num(side.yesAsk) ?? num(side.yesPrice);
  else { const bid = num(side.yesBid) ?? num(side.yesPrice); ask = bid === null ? null : 100 - bid; } // NO costs 100 minus the YES bid
  return ask !== null && ask > 0 && ask < 100 ? ask : null;
}

// Net cents per contract after fees, or null when not gradable.
export function netCents(side, outcome) {
  const cost = costCents(side);
  if (cost === null || !isDir(outcome)) return null;
  return (side.call === outcome ? 100 - cost : -cost) - feeCents(cost);
}

// A sit-out forced because that side was still starting up (page reload, engine
// restart) is not a decision. src/startupReadiness.js reasons and codes.
const NOT_READY = /Warming up live observations|Loading candle history|Waiting for a fresh spot-price observation|Waiting for the signal engine to finish computing|Startup hold set on this device|cold-start-warming-up/;
export const notReady = (snap) => snap?.call === 'SIT_OUT' && (/^startup-/.test(String(snap.blockedDecision?.code || '')) || NOT_READY.test(String(snap.reason || '')));

// The fields kept from a committed snapshot (engine or site).
export function sideFromSnapshot(snap, extra = {}) {
  const o = snap?.originalDecision || {};
  return {
    call: snap.call, notReady: notReady(snap), intended: snap._intendedDir || null, tier: snap.tier || null, score: num(snap.confidence),
    reason: String(snap.reason || '').slice(0, 240), lockedAt: num(snap._committedAt) ?? num(o.lockedAt),
    secondsLeft: num(o.secondsLeft ?? snap.atSecondsLeft), strike: num(snap.strikeAtLock ?? o.strike),
    yesPrice: num(snap.kalshiAtLock ?? o.yesPrice), yesBid: num(snap.kalshiBidAtLock ?? o.yesBid), yesAsk: num(snap.kalshiAskAtLock ?? o.yesAsk),
    marketTicker: snap.marketTicker || o.marketTicker || null, version: snap.taraVersion || o.modelVersion || null, ...extra,
  };
}

export class ShadowCompare {
  // readDoc(path) -> doc data or null. settle(entry) -> {ok, patch:{outcomeDir}} like
  // src/callSettlement.js readCapturedCallSettlement.
  constructor({readDoc, settle, log = () => {}}) {
    Object.assign(this, {readDoc, settle, log});
    this.rows = new Map();
    this.startedAt = null;
    this.boots = 0;
    this.busy = false;
  }

  restore(saved, now = Date.now()) {
    this.startedAt = num(saved?.startedAt) ?? now;
    this.boots = (num(saved?.boots) ?? 0) + 1;
    for (const r of saved?.rows || []) {
      if (!r?.windowId) continue;
      for (const side of [r.engine, r.site]) if (side && side.notReady === undefined) side.notReady = notReady(side); // rows saved before the flag existed
      this.rows.set(r.windowId, r);
    }
  }

  snapshot() {
    return {startedAt: this.startedAt, boots: this.boots, rows: [...this.rows.values()]};
  }

  row(windowId) {
    if (!this.rows.has(windowId)) {
      this.rows.set(windowId, {windowId, engine: null, site: null, outcome: null, ticker: null, siteReads: 0, settleTries: 0});
      if (this.rows.size > MAX_WINDOWS) this.rows.delete(this.rows.keys().next().value);
    }
    return this.rows.get(windowId);
  }

  recordEngine(snap) {
    const r = this.row(snap.windowId);
    if (r.engine) return false;
    r.engine = sideFromSnapshot(snap);
    r.ticker ||= r.engine.marketTicker;
    return true;
  }

  async readSite(windowId, phase, now) {
    const r = this.row(windowId);
    r.siteReads++;
    r[`siteRead_${phase}`] = now;
    const doc = await this.readDoc(SITE_DOC);
    const snap = doc?.taraSnapshot;
    if (doc?.windowId !== windowId || !snap || !['UP', 'DOWN', 'SIT_OUT'].includes(snap.call)) return false;
    const side = sideFromSnapshot(snap, {savedAt: num(doc.savedAt), revision: num(doc._revision)});
    if (r.site && (r.site.call !== side.call || r.site.lockedAt !== side.lockedAt)) side.changedAfterCutoff = true;
    r.site = side;
    r.ticker ||= side.marketTicker;
    return true;
  }

  async settleRow(r, now) {
    r.settleTries++;
    r.lastSettleTry = now;
    const res = await this.settle({windowId: r.windowId, windowType: '15m', asset: 'BTC', marketTicker: r.ticker,
      strikeAtLock: r.engine?.strike ?? r.site?.strike ?? null, call: r.engine?.call || r.site?.call || 'SIT_OUT', dir: r.engine?.call || r.site?.call || 'SIT_OUT'}, now);
    if (res?.ok && isDir(res.patch?.outcomeDir)) { r.outcome = res.patch.outcomeDir; r.settledAt = now; return true; }
    r.settleError = res?.reason || 'unknown';
    return false;
  }

  // Called every few seconds. Does at most a few small reads per call.
  async tick(now = Date.now()) {
    if (this.busy) return false;
    this.busy = true;
    let changed = false;
    try {
      const current = windowIdAt(now);
      const close = windowClose(current);
      // Site side, first look: 25 s after the 420 s cutoff.
      if (now >= close - 395_000 && !this.row(current).siteRead_cutoff) changed = (await this.readSite(current, 'cutoff', now)) || changed;
      // Second look just after close, before the next window's lock replaces the doc.
      const prev = windowIdAt(now - WINDOW_MS);
      if (Date.parse(prev.slice(4)) >= this.startedAt - WINDOW_MS && now >= windowClose(prev) + 45_000 && now < windowClose(prev) + 6 * 60_000 && !this.row(prev).siteRead_close) {
        changed = (await this.readSite(prev, 'close', now)) || changed;
      }
      // Settle closed windows that have a ticker. Retries back off to every 5 minutes.
      for (const r of this.rows.values()) {
        if (r.outcome || !r.ticker || now < windowClose(r.windowId) + 60_000 || r.settleTries >= 30) continue;
        if (r.lastSettleTry && now - r.lastSettleTry < Math.min(300_000, 30_000 * r.settleTries)) continue;
        changed = (await this.settleRow(r, now)) || changed;
        break; // one Kalshi read per tick is plenty
      }
    } catch (err) {
      this.log('compare', {error: err?.message || String(err)});
    } finally {
      this.busy = false;
    }
    return changed;
  }

  summary(now = Date.now()) {
    // Closed windows only, from the first window the comparison saw whole.
    const lastClosed = windowClose(windowIdAt(now)) - WINDOW_MS;
    const firstFull = Math.ceil(this.startedAt / WINDOW_MS) * WINDOW_MS;
    const rows = [...this.rows.values()].filter((r) => windowClose(r.windowId) <= lastClosed && Date.parse(r.windowId.slice(4)) >= firstFull);
    const elapsed = Math.max(0, Math.round((lastClosed - firstFull) / WINDOW_MS));
    const grade = (pick) => {
      const calls = rows.map((r) => ({side: pick(r), outcome: r.outcome})).filter((x) => x.side && isDir(x.side.call));
      const graded = calls.map((x) => ({...x, net: netCents(x.side, x.outcome)})).filter((x) => x.net !== null);
      const wins = graded.filter((x) => x.side.call === x.outcome).length;
      const total = graded.reduce((a, x) => a + x.net, 0);
      return {calls: calls.length, graded: graded.length, wins, losses: graded.length - wins,
        winRate: graded.length ? wins / graded.length : null, netCentsPerCall: graded.length ? total / graded.length : null, netCentsTotal: total,
        sitOuts: rows.filter((r) => pick(r)?.call === 'SIT_OUT').length};
    };
    // Agreement counts only windows where both sides were up and deciding.
    const decided = (side) => side && !side.notReady;
    const both = rows.filter((r) => decided(r.engine) && decided(r.site));
    const agree = both.filter((r) => r.engine.call === r.site.call);
    const kinds = {};
    for (const r of both) if (r.engine.call !== r.site.call) { const k = `engine ${r.engine.call} / site ${r.site.call}`; kinds[k] = (kinds[k] || 0) + 1; }
    const gaps = both.map((r) => (r.engine.lockedAt ?? 0) - (r.site.lockedAt ?? 0)).filter((g) => Number.isFinite(g)).sort((a, b) => a - b);
    const sameWindows = both.filter((r) => isDir(r.engine.call) || isDir(r.site.call));
    const h2h = (pick) => sameWindows.reduce((a, r) => a + (netCents(pick(r), r.outcome) ?? 0), 0);
    return {
      startedAt: this.startedAt, boots: this.boots, windowsElapsed: elapsed,
      engineCoverage: {windows: rows.filter((r) => decided(r.engine)).length, of: elapsed, notReady: rows.filter((r) => r.engine?.notReady).length},
      siteCoverage: {windows: rows.filter((r) => decided(r.site)).length, of: elapsed, notReady: rows.filter((r) => r.site?.notReady).length},
      settled: rows.filter((r) => r.outcome).length,
      both: {windows: both.length, agree: agree.length, agreeRate: both.length ? agree.length / both.length : null, disagreements: kinds,
        medianLockGapSeconds: gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)] / 100) / 10 : null,
        engineNetCents: h2h((r) => r.engine), siteNetCents: h2h((r) => r.site)},
      engine: grade((r) => r.engine),
      site: grade((r) => r.site),
    };
  }
}
