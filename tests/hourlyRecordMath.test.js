import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHourlyRecord } from '../src/hourlyRecordMath.js';

test('recounts the latest 500 settled hourly locks instead of stale lifetime counters', () => {
  const history = [
    { won: true }, { won: true },
    ...Array.from({ length: 264 }, () => ({ won: true })),
    ...Array.from({ length: 236 }, () => ({ won: false })),
  ];
  const result = normalizeHourlyRecord({ w: 266, l: 236, pending: [], history });
  assert.equal(result.history.length, 500);
  assert.equal(result.w, 264);
  assert.equal(result.l, 236);
});

test('keeps legacy counters when there is no retained history', () => {
  const result = normalizeHourlyRecord({ w: 4, l: 2, history: [], pending: [{ ticker: 'OPEN' }] });
  assert.equal(result.w, 4);
  assert.equal(result.l, 2);
  assert.equal(result.pending[0].ticker, 'OPEN');
});

test('does not score entries without a settled result', () => {
  const result = normalizeHourlyRecord({ history: [{ won: true }, { won: false }, { won: null }] });
  assert.equal(result.w, 1);
  assert.equal(result.l, 1);
});
