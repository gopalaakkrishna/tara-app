// The shadow-week report page served at /report. Plain server-rendered HTML,
// no scripts, refreshes itself every minute.
import {netCents, costCents, windowClose} from './compare.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const et = (ms, opts = {}) => (Number.isFinite(ms) ? new Date(ms).toLocaleString('en-US', {timeZone: 'America/New_York', ...opts}) : '');
const pct = (x) => (x === null || x === undefined ? 'n/a' : `${Math.round(x * 100)}%`);
const cents = (x) => (x === null || x === undefined ? '' : `${x > 0 ? '+' : ''}${Math.round(x * 10) / 10}c`);

function sideCell(side) {
  if (!side) return '<td class="muted">no record</td>';
  const cls = side.call === 'UP' ? 'up' : side.call === 'DOWN' ? 'down' : 'muted';
  const cost = costCents(side);
  const detail = side.call === 'SIT_OUT' ? (side.tier || '') : `${cost === null ? '' : `${cost}c`}${side.score !== null ? ` · score ${Math.round(side.score)}` : ''}`;
  const t = side.lockedAt ? et(side.lockedAt, {hour: 'numeric', minute: '2-digit', second: '2-digit'}) : '';
  return `<td><span class="${cls}">${esc(side.call === 'SIT_OUT' ? 'sit out' : side.call)}</span><div class="sub">${esc(detail)}${t ? ` · ${esc(t)}` : ''}</div></td>`;
}

function record(label, g, note) {
  const body = g.graded
    ? `<div class="big">${g.wins}-${g.losses}</div><div class="sub">${pct(g.winRate)} won · ${cents(g.netCentsPerCall)} per Call after fees</div>`
    : `<div class="big muted">no graded Calls</div><div class="sub">${g.calls} Calls waiting on settlement</div>`;
  return `<section class="card"><h2>${esc(label)}</h2>${body}<div class="sub">${g.sitOuts} sit-outs${note ? ` · ${esc(note)}` : ''}</div></section>`;
}

export function renderReport({summary: s, rows, health, now = Date.now()}) {
  const closed = rows.filter((r) => windowClose(r.windowId) <= now).reverse().slice(0, 192);
  const dis = Object.entries(s.both.disagreements);
  const trs = closed.map((r) => {
    const both = r.engine && r.site;
    const agree = both ? (r.engine.call === r.site.call ? '<span class="ok">same</span>' : '<span class="bad">differs</span>') : '<span class="muted">n/a</span>';
    const out = r.outcome ? `<span class="${r.outcome === 'UP' ? 'up' : 'down'}">${r.outcome}</span>` : `<span class="muted">${r.ticker ? 'pending' : 'no ticker'}</span>`;
    const en = netCents(r.engine, r.outcome), sn = netCents(r.site, r.outcome);
    return `<tr><td>${esc(et(Date.parse(r.windowId.slice(4)), {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}))}</td>${sideCell(r.engine)}${sideCell(r.site)}<td>${agree}</td><td>${out}</td><td class="num ${en > 0 ? 'ok' : en < 0 ? 'bad' : ''}">${cents(en)}</td><td class="num ${sn > 0 ? 'ok' : sn < 0 ? 'bad' : ''}">${cents(sn)}</td></tr>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="60">
<title>Tara shadow week</title><style>
:root{--bg:#f7f7f5;--card:#fff;--ink:#1d1d1b;--muted:#77756f;--line:#e4e2dc;--up:#137a3f;--down:#b3261e;--ok:#137a3f;--bad:#b3261e;--accent:#3b5bdb}
@media (prefers-color-scheme:dark){:root{--bg:#121211;--card:#1c1c1a;--ink:#ecebe7;--muted:#9b998f;--line:#2e2d2a;--up:#4cc27a;--down:#ff7b72;--ok:#4cc27a;--bad:#ff7b72;--accent:#8ea2ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:1080px;margin:0 auto;padding:24px 16px 48px}h1{font-size:24px;margin:0 0 4px}h2{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:0 0 8px}
.lede{color:var(--muted);margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}.big{font-size:26px;font-weight:650;font-variant-numeric:tabular-nums}
.sub{color:var(--muted);font-size:13px}.muted{color:var(--muted)}.up{color:var(--up);font-weight:600}.down{color:var(--down);font-weight:600}.ok{color:var(--ok)}.bad{color:var(--bad)}
.wrap{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:10px}table{border-collapse:collapse;width:100%;min-width:760px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;color:var(--muted);font-weight:600}td.num{text-align:right;font-variant-numeric:tabular-nums}
ul{margin:6px 0 0;padding-left:18px}.notes{color:var(--muted);font-size:13px;margin-top:20px}a{color:var(--accent)}</style></head><body><main>
<h1>Tara shadow week</h1>
<p class="lede">The cloud engine's Calls next to the website's, window by window. Since ${esc(et(s.startedAt, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}))} ET · ${s.windowsElapsed} windows closed · updated ${esc(et(now, {hour: 'numeric', minute: '2-digit'}))} ET</p>
<div class="grid">
<section class="card"><h2>Engine ran</h2><div class="big">${s.engineCoverage.windows} of ${s.engineCoverage.of}</div><div class="sub">windows decided · ${s.boots} restart${s.boots === 1 ? '' : 's'} · ${health.errors} errors</div></section>
<section class="card"><h2>Same decision</h2><div class="big">${s.both.windows ? `${s.both.agree} of ${s.both.windows}` : 'n/a'}</div><div class="sub">${s.both.windows ? `${pct(s.both.agreeRate)} of windows where both decided` : 'needs a window with the site open'}${s.both.medianLockGapSeconds !== null ? ` · lock time gap ${s.both.medianLockGapSeconds}s` : ''}</div></section>
${record('Engine record', s.engine, `${s.settled} windows settled`)}
${record('Website record', s.site, `site open ${s.siteCoverage.windows} of ${s.siteCoverage.of} windows`)}
</div>
${dis.length ? `<section class="card" style="margin-bottom:20px"><h2>Where they differed</h2><ul>${dis.map(([k, v]) => `<li>${esc(k)}: ${v}</li>`).join('')}</ul><div class="sub">On windows where both decided: engine ${cents(s.both.engineNetCents)}, website ${cents(s.both.siteNetCents)} in total.</div></section>` : ''}
<div class="wrap"><table><thead><tr><th>Window (ET)</th><th>Engine</th><th>Website</th><th>Match</th><th>Result</th><th>Engine net</th><th>Website net</th></tr></thead><tbody>${trs || '<tr><td colspan="7" class="muted">No closed windows yet.</td></tr>'}</tbody></table></div>
<p class="notes">Shadow mode: the engine places no orders and writes nothing the site reads. The website side exists only for windows where someone had Tara open. Each Call is graded at the ask on its side at lock, wins 100c, and pays Kalshi's taker fee. Results come from Kalshi's official settlement. Raw data: <a href="/compare">/compare</a> · <a href="/health">/health</a></p>
</main></body></html>`;
}
