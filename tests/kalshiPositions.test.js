import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKalshiPositionsPage } from '../src/kalshiPositions.js';

test('normalizes current fixed-point YES and NO positions', () => {
  const result = normalizeKalshiPositionsPage({ market_positions: [
    { ticker: 'BTC-YES', position_fp: '3.00' },
    { ticker: 'BTC-NO', position_fp: '-2.00' },
    { ticker: 'BTC-CLOSED', position_fp: '0.00' },
  ], cursor: '' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.positions.map(({ ticker, count, side }) => ({ ticker, count, side })), [
    { ticker: 'BTC-YES', count: 3, side: 'yes' },
    { ticker: 'BTC-NO', count: 2, side: 'no' },
  ]);
});

test('prefers fixed-point position over a stale legacy field', () => {
  const result = normalizeKalshiPositionsPage({ market_positions: [
    { ticker: 'BTC-OPEN', position_fp: '4.00', position: 0 },
  ] });
  assert.equal(result.ok, true);
  assert.equal(result.positions[0].count, 4);
});

test('supports a legacy position only when the fixed-point field is absent', () => {
  const result = normalizeKalshiPositionsPage({ market_positions: [
    { ticker: 'LEGACY', position: -1 },
  ] });
  assert.equal(result.ok, true);
  assert.equal(result.positions[0].side, 'no');
});

test('rejects incomplete or malformed responses instead of confirming flat', () => {
  for (const data of [
    {},
    { market_positions: null },
    { market_positions: [{ ticker: 'BTC' }] },
    { market_positions: [{ ticker: 'BTC', position_fp: 'n/a' }] },
    { market_positions: [{ ticker: 'BTC', position_fp: null, position: 0 }] },
    { market_positions: [{ ticker: 'BTC', position_fp: '0x10' }] },
    { market_positions: [{ position_fp: '2.00' }] },
    { market_positions: [], cursor: 42 },
  ]) {
    assert.equal(normalizeKalshiPositionsPage(data).ok, false);
  }
});

test('accepts a genuinely empty page as flat evidence', () => {
  const result = normalizeKalshiPositionsPage({ market_positions: [], cursor: '' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.positions, []);
});
