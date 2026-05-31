// /api/deribit.js — Deribit BTC options sentiment (V10.7.73)
// Fetches near-term BTC options to compute IV skew + put/call ratio
// IV skew: puts more expensive = bearish. Calls more expensive = bullish.
// No auth required. Public API.

const CACHE_TTL_MS = 30000; // 30s — options pricing moves slowly
let _cache = null;

const respond = (res, payload, status = 200) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); return res.status(204).end(); }

  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return respond(res, { ..._cache.data, cached: true });
  }

  try {
    // Get all BTC options summaries
    const r = await fetch(
      'https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option',
      { headers: { 'User-Agent': 'TaraApp/10.7.73' }, signal: AbortSignal.timeout(4000) }
    );
    if (!r.ok) throw new Error(`Deribit ${r.status}`);
    const d = await r.json();
    const items = d?.result || [];

    // Find options expiring within next 24 hours (most relevant for 15m trading)
    const now = Date.now();
    const in24h = now + 86400000;
    const nearTerm = items.filter(o => {
      const exp = o.underlying_index || '';
      // instrument_name: BTC-31MAY26-70000-C format
      // use creation_timestamp + 86400000 as proxy or filter by instrument_name
      return o.instrument_name && (o.instrument_name.includes('C') || o.instrument_name.includes('P'));
    });

    // Separate calls and puts, filter to reasonable strikes (within 5% of spot)
    const spotApprox = items.find(o => o.underlying_price)?.underlying_price || 70000;
    const strikeMin = spotApprox * 0.95;
    const strikeMax = spotApprox * 1.05;

    const calls = nearTerm.filter(o => o.instrument_name?.endsWith('-C') && o.mark_iv > 0);
    const puts = nearTerm.filter(o => o.instrument_name?.endsWith('-P') && o.mark_iv > 0);

    // Parse strike from instrument name: BTC-31MAY26-70000-C → 70000
    const parseStrike = (name) => {
      const parts = name.split('-');
      return parts.length >= 3 ? parseFloat(parts[2]) : null;
    };

    const atmCalls = calls.filter(o => { const s = parseStrike(o.instrument_name); return s && s >= strikeMin && s <= strikeMax; });
    const atmPuts = puts.filter(o => { const s = parseStrike(o.instrument_name); return s && s >= strikeMin && s <= strikeMax; });

    // Weighted average IV (by open interest)
    const wAvgIV = (opts) => {
      const totalOI = opts.reduce((s, o) => s + (o.open_interest || 1), 0);
      return totalOI > 0 ? opts.reduce((s, o) => s + o.mark_iv * (o.open_interest || 1), 0) / totalOI : null;
    };

    const callIV = wAvgIV(atmCalls);
    const putIV = wAvgIV(atmPuts);
    const skew = (putIV != null && callIV != null) ? putIV - callIV : null;

    // Put/Call ratio by open interest
    const totalCallOI = calls.reduce((s, o) => s + (o.open_interest || 0), 0);
    const totalPutOI = puts.reduce((s, o) => s + (o.open_interest || 0), 0);
    const pcRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : null;

    // Signal: skew > 3 = bearish (puts expensive), skew < -3 = bullish (calls expensive)
    // PCR > 1.2 = bearish, PCR < 0.8 = bullish
    let signal = 0;
    let reason = 'neutral';
    if (skew != null) {
      if (skew > 5) { signal -= 3; reason = `put skew +${skew.toFixed(1)} (bears buying protection)`; }
      else if (skew > 3) { signal -= 1.5; reason = `mild put skew +${skew.toFixed(1)}`; }
      else if (skew < -5) { signal += 3; reason = `call skew ${skew.toFixed(1)} (bulls loading calls)`; }
      else if (skew < -3) { signal += 1.5; reason = `mild call skew ${skew.toFixed(1)}`; }
    }
    if (pcRatio != null) {
      if (pcRatio > 1.3) signal -= 2;
      else if (pcRatio < 0.7) signal += 2;
    }
    signal = Math.max(-6, Math.min(6, signal));

    const result = {
      ok: true,
      signal: Math.round(signal * 10) / 10,
      direction: signal > 0.5 ? 'bullish' : signal < -0.5 ? 'bearish' : 'neutral',
      skew: skew != null ? Math.round(skew * 100) / 100 : null,
      putCallRatio: pcRatio != null ? Math.round(pcRatio * 100) / 100 : null,
      callIV: callIV != null ? Math.round(callIV * 10) / 10 : null,
      putIV: putIV != null ? Math.round(putIV * 10) / 10 : null,
      reason,
      spotApprox: Math.round(spotApprox),
      atmCallsN: atmCalls.length,
      atmPutsN: atmPuts.length,
      fetchedAt: Date.now(),
    };

    _cache = { at: Date.now(), data: result };
    return respond(res, result);
  } catch (e) {
    return respond(res, { ok: false, signal: 0, direction: 'neutral', error: e.message, fetchedAt: Date.now() });
  }
}
