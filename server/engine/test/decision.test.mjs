// The generated server core must make the same Calls as the website.
//
// tests/helpers/callDecisionHarness.js drives the real decision path compiled
// straight out of src/App.jsx. This file reuses that harness's scope and clock,
// but swaps in the GENERATED functions (src/generated/core.js), then repeats
// the scenarios tests/callDecisionPath.test.js checks: UP and DOWN locks, the
// 65 threshold, the 420-second cutoff, bad quotes, sample formation and the
// adverse cooldown. One difference by design: the generated core uses App.jsx's
// real top-level helpers where the harness substitutes stubs.
//
// Run from the repo root after `npm ci`:
//   node server/engine/scripts/build-core.mjs && node --test server/engine/test/
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeHarness} from '../../../tests/helpers/callDecisionHarness.js';
import {describeCallBlocker} from '../../../src/callBlocker.js';
import * as core from '../src/generated/core.js';

const RealDate = globalThis.Date;

function serverHarness(options = {}) {
  const h = makeHarness(options);
  const s = h.scope;
  // The generated core reads the global clock; point it at the harness clock.
  const withClock = (fn) => { globalThis.Date = s.Date; try { return fn(); } finally { globalThis.Date = RealDate; } };
  const bindings = withClock(() => core.makeCallCommit(s));
  Object.assign(s, bindings);
  s._persistLock = () => {
    if (!s.taraCallSnapshotRef.current) return;
    if (bindings._sealCallSnapshot(s.taraCallSnapshotRef.current) === false) return;
    h.cloud.push(structuredClone(s.taraCallSnapshotRef.current));
  };
  const run = () => withClock(() => {
    core.__set__kalshiQuote(s._kalshiQuote);
    s.taraCall = core.produceTaraCall(s);
    if (options.confidence !== undefined) s.taraCall.confidence = options.confidence;
    s.taraCall._ctx ||= {};
    s.currentCallBlockerRef.current = describeCallBlocker({call: s.taraCall, readiness: s.startupReadiness,
      hold: s.callCommitHoldRef.current, gateHold: s.callGateHoldRef.current, samples: s.taraCallSampleRef.current,
      quote: s._kalshiQuote, windowId: h.windowId, asset: 'BTC', now: s.Date.now()});
    core.runCallLifecycle(s);
    return s.taraCallSnapshotRef.current;
  });
  return {...h, run, get errors() { return h.errors; }};
}

test('generated core exports the four decision functions and nothing needs a browser', () => {
  for (const fn of ['computeAnalysis', 'produceTaraCall', 'makeCallCommit', 'runCallLifecycle']) assert.equal(typeof core[fn], 'function', fn);
});

test('UP: a qualified candidate locks UP, seals the original decision and records it once', () => {
  const h = serverHarness();
  const snapshot = h.run();
  assert.deepEqual(h.errors, []);
  assert.equal(snapshot?.call, 'UP');
  assert.equal(snapshot.callPolicy.action, 'allow');
  assert.equal(snapshot.originalDecision.direction, 'UP');
  assert.equal(snapshot.originalDecision.marketTicker, h.scope._kalshiQuote.ticker);
  assert.equal(h.logs.length, 1);
  assert.equal(h.cloud.length, 1);
  const original = structuredClone(snapshot.originalDecision);
  h.scope.analysis.rawProbAbove = 1; h.advance(73); h.run();
  assert.equal(h.logs.length, 1, 'a later opposite reading must not add a second Call');
  assert.deepEqual(snapshot.originalDecision, original);
});

test('DOWN: records DOWN with DOWN confidence, not P(UP)', () => {
  const h = serverHarness({probabilityUp: 20.055, yesPrice: 42, mtf: -2, tapeBuy: 10, quality: 80, regime: 'TRENDING DOWN'});
  const snapshot = h.run();
  assert.deepEqual(h.errors, []);
  assert.equal(snapshot?.call, 'DOWN');
  assert.ok(snapshot.confidence >= 65);
  assert.equal(h.logs[0].dir, 'DOWN');
});

test('65 threshold: 64.99 waits, 65 with qualifying samples locks', () => {
  for (const secondsLeft of [850, 631, 420.001]) {
    const h = serverHarness({secondsLeft, confidence: 64.99});
    assert.equal(h.run(), null);
    assert.equal(h.scope.currentCallBlockerRef.current.code, 'timing-confidence');
    assert.equal(h.logs.length, 0);
    const pass = serverHarness({secondsLeft, confidence: 65, quality: 85, mtf: 4, tapeBuy: 90});
    assert.equal(pass.run()?.call, 'UP', `secondsLeft ${secondsLeft}`);
  }
});

test('420-second cutoff: nothing locks at or after 7 minutes left; the window records a sit-out', () => {
  // The website test also checks 0 s left. Here the generated core uses
  // App.jsx's real computeWindowId, and at exactly 0 s left the clock reads the
  // close instant, which IS the next window (21:00:00 starts the 21:00 window).
  // The harness pins the window ID, so only its stub calls that instant 20:45.
  // 1 s left is the last real instant of the window.
  for (const left of [420, 419, 180, 75, 1]) {
    const h = serverHarness({secondsLeft: 421, confidence: 58});
    h.run(); h.advance(left);
    const snapshot = h.run();
    assert.equal(snapshot.call, 'SIT_OUT', `left ${left}`);
    assert.equal(snapshot.tier, 'decision-deadline');
    assert.equal(h.logs.length, 1);
  }
});

test('missing, stale, future, crossed and wrong-window or wrong-asset quotes never create or persist a Call', () => {
  const good = makeHarness();
  for (const quotePatch of [{ticker: null}, {at: good.clock - 31000}, {at: good.clock + 3000},
    {bid: 80, ask: 70}, {ask: 100}, {ticker: 'KXETH15M-26OCT131700-00'}, {closeTime: '2026-10-13T21:15:00Z'}]) {
    const h = serverHarness({quotePatch});
    assert.equal(h.run(), null, JSON.stringify(quotePatch));
    assert.equal(h.logs.length, 0);
    assert.equal(h.cloud.length, 0);
    assert.match(h.scope.callCommitHoldRef.current?.reason || h.scope.currentCallBlockerRef.current?.reason || '', /quote|market|book|window/);
  }
});

test('formation, Tier-1 preference and the adverse cooldown still hold', () => {
  const sample = serverHarness({samples: 0, claimedDirection: null});
  assert.equal(sample.run(), null);
  for (let i = 0; i < 150 && !sample.scope.taraCallSnapshotRef.current; i++) { sample.advance(630 - i); sample.run(); }
  assert.equal(sample.scope.taraCallSnapshotRef.current?.call, 'UP');
  assert.equal(sample.logs.length, 1);
  const abort = serverHarness();
  abort.scope._v104_1_abortCountRef.current = {windowId: abort.windowId, count: 3, lastAbortAt: abort.clock - 1000};
  assert.equal(abort.run(), null);
  assert.equal(abort.scope.currentCallBlockerRef.current.code, 'adverse-kalshi-cooldown');
});
