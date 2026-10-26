// The shadow-week comparison: grading, timing of the site reads, settlement
// and the summary. Synthetic docs only; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ShadowCompare, netCents, costCents, feeCents, windowIdAt, windowClose, WINDOW_MS} from '../src/compare.js';
import {renderReport} from '../src/report.js';

const T0 = Date.parse('2026-10-26T18:30:00.000Z');
const W1 = windowIdAt(T0), W2 = windowIdAt(T0 + WINDOW_MS);
const snap = (windowId, call, extra = {}) => ({windowId, call, confidence: 72, tier: 'tier-1', _committedAt: windowClose(windowId) - 500_000,
  kalshiAtLock: 60, kalshiBidAtLock: 59, kalshiAskAtLock: 61, strikeAtLock: 80000, marketTicker: `T-${windowId}`, ...extra});

test('grades a Call at the ask on its side, with the Kalshi taker fee', () => {
  assert.equal(feeCents(61), 2);
  assert.equal(costCents({call: 'UP', yesAsk: 61, yesBid: 59}), 61);
  assert.equal(costCents({call: 'DOWN', yesAsk: 61, yesBid: 59}), 41); // NO costs 100 minus the YES bid
  assert.equal(netCents({call: 'UP', yesAsk: 61}, 'UP'), 100 - 61 - 2);
  assert.equal(netCents({call: 'UP', yesAsk: 61}, 'DOWN'), -61 - 2);
  assert.equal(netCents({call: 'DOWN', yesBid: 59}, 'DOWN'), 100 - 41 - 2);
  assert.equal(netCents({call: 'SIT_OUT'}, 'UP'), null);
  assert.equal(netCents({call: 'UP', yesAsk: 61}, null), null);
});

test('reads the site lock after the cutoff and after close, settles, and summarises', async () => {
  let siteDoc = null;
  const reads = [];
  const settled = [];
  const c = new ShadowCompare({
    readDoc: async (path) => { reads.push(path); return siteDoc; },
    settle: async (entry) => { settled.push(entry.marketTicker); return {ok: true, patch: {outcomeDir: entry.windowId === W1 ? 'UP' : 'DOWN'}}; },
  });
  c.restore(null, T0 - 1000);
  c.recordEngine(snap(W1, 'UP'));
  assert.equal(c.recordEngine(snap(W1, 'DOWN')), false, 'first engine decision for a window wins');
  // Before the cutoff: no read.
  await c.tick(windowClose(W1) - 500_000);
  assert.equal(reads.length, 0);
  // 25 s after the 420 s cutoff: read; the site sat out.
  siteDoc = {windowId: W1, savedAt: 1, taraSnapshot: snap(W1, 'SIT_OUT', {tier: 'decision-deadline'})};
  await c.tick(windowClose(W1) - 390_000);
  assert.equal(c.rows.get(W1).site.call, 'SIT_OUT');
  // Window 2: both call DOWN; the doc for the wrong window is ignored.
  c.recordEngine(snap(W2, 'DOWN'));
  siteDoc = {windowId: W1, taraSnapshot: snap(W1, 'UP')};
  await c.tick(windowClose(W2) - 390_000);
  assert.equal(c.rows.get(W2).site, null);
  siteDoc = {windowId: W2, taraSnapshot: snap(W2, 'DOWN')};
  await c.tick(windowClose(W2) + 50_000); // after close: second look at W2, and W1 settles
  assert.equal(c.rows.get(W2).site.call, 'DOWN');
  assert.equal(c.rows.get(W1).outcome, 'UP');
  await c.tick(windowClose(W2) + 120_000);
  assert.equal(c.rows.get(W2).outcome, 'DOWN');
  const s = c.summary(windowClose(W2) + 130_000);
  assert.equal(s.windowsElapsed, 2);
  assert.deepEqual(s.engineCoverage, {windows: 2, of: 2});
  assert.equal(s.both.windows, 2);
  assert.equal(s.both.agree, 1);
  assert.deepEqual(s.both.disagreements, {'engine UP / site SIT_OUT': 1});
  assert.equal(s.engine.wins, 2);
  assert.equal(s.engine.netCentsTotal, (100 - 61 - 2) + (100 - 41 - 2));
  assert.equal(s.site.wins, 1);
  assert.equal(s.site.sitOuts, 1);
  // Survives a save and restore, and counts the restart.
  const c2 = new ShadowCompare({readDoc: async () => null, settle: async () => ({ok: false})});
  c2.restore(JSON.parse(JSON.stringify(c.snapshot())));
  assert.equal(c2.boots, 2);
  assert.equal(c2.summary(windowClose(W2) + 130_000).engine.wins, 2);
  const html = renderReport({summary: s, rows: [...c.rows.values()], health: {errors: 0}, now: windowClose(W2) + 130_000});
  assert.match(html, /Tara shadow week/);
  assert.match(html, /differs/);
});

test('a window the engine missed still counts against its coverage', async () => {
  const c = new ShadowCompare({readDoc: async () => ({windowId: W1, taraSnapshot: snap(W1, 'UP')}), settle: async () => ({ok: false, reason: 'not-settled'})});
  c.restore(null, T0 - 1000);
  await c.tick(windowClose(W1) - 390_000);
  const s = c.summary(windowClose(W1) + 1000);
  assert.deepEqual(s.engineCoverage, {windows: 0, of: 1});
  assert.deepEqual(s.siteCoverage, {windows: 1, of: 1});
});
