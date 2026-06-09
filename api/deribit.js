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

    // V10.8.6 FIX: properly isolate the NEAREST expiry, not all options.
    //   Old filter matched ~everything (includes('C')), averaging IV across
    //   months of expiries that barely move → 3 stuck signal values.
    //   New: parse expiry date from instrument_name (BTC-31MAY26-70000-C),
    //   find the soonest expiry, and use only those options.
    const MONTHS = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
    const parseExpiry = (name) => {
      // BTC-31MAY26-70000-C → Date
      const m = name.match(/^BTC-(\d{1,2})([A-Z]{3})(\d{2})-/);
      if (!m) return null;
      const [, dd, mon, yy] = m;
      if (MONTHS[mon] === undefined) return null;
      return Date.UTC(2000 + Number(yy), MONTHS[mon], Number(dd), 8, 0, 0); // Deribit expires 08:00 UTC
    };
    const now = Date.now();
    // Find the soonest future expiry timestamp
    let soonestExp = null;
    for (const o of items) {
      if (!o.instrument_name) continue;
      const exp = parseExpiry(o.instrument_name);
      if (exp && exp > now && (soonestExp === null || exp < soonestExp)) soonestExp = exp;
    }
    // Keep options at the soonest expiry (plus the next one if soonest is <12h away,
    //   since same-day expiries can be thin)
    const nearTerm = items.filter(o => {
      if (!o.instrument_name) return false;
      const exp = parseExpiry(o.instrument_name);
      if (!exp || exp <= now) return false;
      // within 3 days of soonest expiry captures the front 1-2 expiries
      return soonestExp && exp <= soonestExp + 3 * 86400000;
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
    // V10.8.6: front-expiry IV skew is more sensitive — recalibrated thresholds.
    //   Near-term skew swings harder than the all-expiry average did.
    let signal = 0;
    let reason = 'neutral';
    if (skew != null) {
      if (skew > 4) { signal -= 3; reason = `put skew +${skew.toFixed(1)} (bears buying protection)`; }
      else if (skew > 1.5) { signal -= 1.5; reason = `mild put skew +${skew.toFixed(1)}`; }
      else if (skew < -4) { signal += 3; reason = `call skew ${skew.toFixed(1)} (bulls loading calls)`; }
      else if (skew < -1.5) { signal += 1.5; reason = `mild call skew ${skew.toFixed(1)}`; }
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
      nearestExpiry: soonestExp ? new Date(soonestExp).toISOString().slice(0,10) : null,
      nearTermN: nearTerm.length,
      fetchedAt: Date.now(),
    };

    _cache = { at: Date.now(), data: result };
    return respond(res, result);
  } catch (e) {
    return respond(res, { ok: false, signal: 0, direction: 'neutral', error: e.message, fetchedAt: Date.now() });
  }
}
