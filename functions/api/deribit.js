// /functions/api/deribit.js — Cloudflare Pages Function port of the dead
// Vercel serverless function at api/deribit.js (V10.7.73). Same logic,
// ported from Node's (req,res) handler shape to Cloudflare's
// onRequest(context) shape returning a Fetch API Response. See
// api/deribit.js for the original history/comments.

const CACHE_TTL_MS = 30000; // 30s — options pricing moves slowly
let _cache = null;

const respond = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
});

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return respond({ ..._cache.data, cached: true });
  }

  try {
    const r = await fetch(
      'https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option',
      { headers: { 'User-Agent': 'TaraApp/10.7.73' }, signal: AbortSignal.timeout(4000) }
    );
    if (!r.ok) throw new Error(`Deribit ${r.status}`);
    const d = await r.json();
    const items = d?.result || [];

    const MONTHS = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
    const parseExpiry = (name) => {
      const m = name.match(/^BTC-(\d{1,2})([A-Z]{3})(\d{2})-/);
      if (!m) return null;
      const [, dd, mon, yy] = m;
      if (MONTHS[mon] === undefined) return null;
      return Date.UTC(2000 + Number(yy), MONTHS[mon], Number(dd), 8, 0, 0);
    };
    const now = Date.now();
    let soonestExp = null;
    for (const o of items) {
      if (!o.instrument_name) continue;
      const exp = parseExpiry(o.instrument_name);
      if (exp && exp > now && (soonestExp === null || exp < soonestExp)) soonestExp = exp;
    }
    const nearTerm = items.filter(o => {
      if (!o.instrument_name) return false;
      const exp = parseExpiry(o.instrument_name);
      if (!exp || exp <= now) return false;
      return soonestExp && exp <= soonestExp + 3 * 86400000;
    });

    const spotApprox = items.find(o => o.underlying_price)?.underlying_price || 70000;
    const strikeMin = spotApprox * 0.95;
    const strikeMax = spotApprox * 1.05;

    const calls = nearTerm.filter(o => o.instrument_name?.endsWith('-C') && o.mark_iv > 0);
    const puts = nearTerm.filter(o => o.instrument_name?.endsWith('-P') && o.mark_iv > 0);

    const parseStrike = (name) => {
      const parts = name.split('-');
      return parts.length >= 3 ? parseFloat(parts[2]) : null;
    };

    const atmCalls = calls.filter(o => { const s = parseStrike(o.instrument_name); return s && s >= strikeMin && s <= strikeMax; });
    const atmPuts = puts.filter(o => { const s = parseStrike(o.instrument_name); return s && s >= strikeMin && s <= strikeMax; });

    const wAvgIV = (opts) => {
      const totalOI = opts.reduce((s, o) => s + (o.open_interest || 1), 0);
      return totalOI > 0 ? opts.reduce((s, o) => s + o.mark_iv * (o.open_interest || 1), 0) / totalOI : null;
    };

    const callIV = wAvgIV(atmCalls);
    const putIV = wAvgIV(atmPuts);
    const skew = (putIV != null && callIV != null) ? putIV - callIV : null;

    const totalCallOI = calls.reduce((s, o) => s + (o.open_interest || 0), 0);
    const totalPutOI = puts.reduce((s, o) => s + (o.open_interest || 0), 0);
    const pcRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : null;

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
    return respond(result);
  } catch (e) {
    return respond({ ok: false, signal: 0, direction: 'neutral', error: e.message, fetchedAt: Date.now() });
  }
}
