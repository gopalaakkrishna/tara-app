// Normalize a single Kalshi positions page without turning an unfamiliar API
// response into a false "no position" result. Current Kalshi responses use the
// signed, fixed-point position_fp field; position is a legacy fallback only.
export function normalizeKalshiPositionsPage(data) {
  if (!data || !Array.isArray(data.market_positions)) {
    return { ok: false, reason: 'Kalshi positions response has no market_positions array' };
  }
  if (data.cursor != null && typeof data.cursor !== 'string') {
    return { ok: false, reason: 'Kalshi positions response has an invalid cursor' };
  }

  const positions = [];
  for (const row of data.market_positions) {
    if (!row || typeof row.ticker !== 'string' || !row.ticker.trim()) {
      return { ok: false, reason: 'Kalshi position row is missing a ticker' };
    }
    const hasFixedPoint = Object.prototype.hasOwnProperty.call(row, 'position_fp');
    const value = hasFixedPoint ? row.position_fp : row.position;
    if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
      return { ok: false, reason: `Kalshi position row ${row.ticker} has no signed position` };
    }
    if (typeof value === 'string' && !/^-?\d+(?:\.\d+)?$/.test(value.trim())) {
      return { ok: false, reason: `Kalshi position row ${row.ticker} has a malformed fixed-point position` };
    }
    const signedPosition = Number(value);
    if (!Number.isFinite(signedPosition)) {
      return { ok: false, reason: `Kalshi position row ${row.ticker} has an invalid signed position` };
    }
    if (signedPosition === 0) continue;
    positions.push({
      ticker: row.ticker,
      count: Math.abs(signedPosition),
      side: signedPosition > 0 ? 'yes' : 'no',
      signedPosition,
      raw: row,
    });
  }
  return { ok: true, positions, cursor: data.cursor || null };
}
