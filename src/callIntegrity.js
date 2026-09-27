// Prediction records are not order/fill records. No exchange writes live here.
export const CALL_INTEGRITY_VERSION = 1;
// All persistence fallbacks share this list so original evidence cannot drift
// out of one of the older, compacted cache formats.
export const CALL_EVIDENCE_FIELDS = Object.freeze(['originalDecision','recordRevisions','recordIntegrity','officialSettlement','manualEditedAt','marketTicker','marketCloseTime','quoteObservedAt','kalshiBidAtLock','kalshiAskAtLock','kalshiResolved','taraVersion']);
export const finiteNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
export const isDirection = value => value === 'UP' || value === 'DOWN';
export const callDirection = entry => entry?.dir ?? entry?.call ?? entry?.direction ?? null;
export const callKey = entry => `${entry?.asset || 'BTC'}|${entry?.windowType || '15m'}|${entry?.windowId || entry?.wid || entry?.id || ''}`;
export const windowCloseMs = windowId => {
  const match = /^(5m|15m|1h)-(.+)$/.exec(windowId || '');
  return match ? Date.parse(match[2]) + ({'5m':300000,'15m':900000,'1h':3600000}[match[1]]) : NaN;
};

export function inspectDecisionQuote(quote, {windowId, asset = 'BTC', now = Date.now(), maxAgeMs = 30000, ticker} = {}) {
  const bid = finiteNumber(quote?.bid), ask = finiteNumber(quote?.ask), at = finiteNumber(quote?.at);
  if (!quote?.ticker || (ticker && quote.ticker !== ticker)) return {ok:false, reason:'market-mismatch'};
  const series = `${asset}${windowId?.startsWith('5m-') ? '5M' : '15M'}`;
  if (!quote.ticker.startsWith(`KX${series}-`)) return {ok:false, reason:'market-mismatch'};
  const close = Date.parse(quote.closeTime || '');
  if (!Number.isFinite(close) || Math.abs(close - windowCloseMs(windowId)) > 1000) return {ok:false, reason:'window-mismatch'};
  if (now >= close) return {ok:false, reason:'window-closed'};
  if (at === null || now - at < -2000 || now - at > maxAgeMs) return {ok:false, reason:'stale-quote'};
  if (bid === null || ask === null || bid <= 0 || ask >= 100 || ask < bid) return {ok:false, reason:'empty-or-crossed-book'};
  const mid = finiteNumber(quote.mid);
  return {ok:true, bid, ask, mid:mid !== null && mid > 0 && mid < 100 ? mid : (bid + ask) / 2, at, closeTime:quote.closeTime, ticker:quote.ticker, ageMs:Math.max(0, now-at)};
}

// Hydrate before any cost guard. Never substitute a stale or wrong-window quote.
export function hydrateDecisionQuote(snapshot, context) {
  if (!snapshot) return snapshot;
  if (snapshot.originalDecision) return snapshot;
  const checked = inspectDecisionQuote(context.quote, context);
  const out = {...snapshot};
  if (checked.ok) {
    if (finiteNumber(out.kalshiAtLock) === null) out.kalshiAtLock = checked.mid;
    out.marketTicker ||= checked.ticker;
    out.marketCloseTime ||= checked.closeTime;
    out.kalshiBidAtLock ??= checked.bid;
    out.kalshiAskAtLock ??= checked.ask;
    out.quoteObservedAt ??= checked.at;
  }
  return out;
}

export function captureOriginalDecision(entry, {now = Date.now(), provenance = 'captured-at-lock'} = {}) {
  if (entry?.originalDecision) return entry.originalDecision;
  return {
    schema:1, provenance, capturedAt:now,
    asset:entry.asset || 'BTC', windowType:entry.windowType || '15m', windowId:entry.windowId || null,
    direction:callDirection(entry), lockedAt:finiteNumber(entry._committedAt ?? entry.lockedAt ?? entry.time ?? entry.id) ?? now,
    secondsLeft:finiteNumber(entry.atSecondsLeft),
    strike:finiteNumber(entry.strikeAtLock ?? entry.strike), marketTicker:entry.marketTicker || null,
    marketCloseTime:entry.marketCloseTime || null, yesPrice:finiteNumber(entry.kalshiAtLock),
    yesBid:finiteNumber(entry.kalshiBidAtLock), yesAsk:finiteNumber(entry.kalshiAskAtLock),
    quoteObservedAt:finiteNumber(entry.quoteObservedAt),
    probabilityUpRaw:finiteNumber(entry.rawPosteriorAtLock ?? entry.atPosterior ?? entry.posterior),
    probabilityUpCurrent:finiteNumber(entry.calibratedPosteriorAtLock ?? entry.atPosterior ?? entry.posterior),
    signalScore:finiteNumber(entry.confidence), modelVersion:entry.taraVersion || null, tier:entry.tier || null,
    reason:entry.reason || null,
  };
}

const correctionFields = ['dir','call','result','outcomeDir','strike','strikeAtLock','closingPrice'];
const selectCorrectionFields = entry => Object.fromEntries(correctionFields.map(k => [k, entry[k] ?? null]));
export function amendCallRecord(entry, patch, {source = 'record-update', at = Date.now()} = {}) {
  const next = {...entry, ...patch, originalDecision:captureOriginalDecision(entry, {now:at, provenance:'legacy-observed'})};
  const before = selectCorrectionFields(entry), after = selectCorrectionFields(next);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    next.recordRevisions = [...(entry.recordRevisions || []), {at, source, before, after}].slice(-30);
  }
  return next;
}

export function settlementPatch(entry, market, now = Date.now()) {
  const close = Date.parse(market?.close_time || '');
  const expectedTicker = entry.originalDecision?.marketTicker || entry.marketTicker;
  const strike = finiteNumber(entry.originalDecision?.strike ?? entry.strikeAtLock ?? entry.strike);
  const actualStrike = finiteNumber(market?.floor_strike);
  const series = `KX${entry.asset || 'BTC'}${entry.windowType === '5m' ? '5M' : '15M'}-`;
  if (!market?.ticker?.startsWith(series) || !Number.isFinite(close) || Math.abs(close-windowCloseMs(entry.windowId)) > 1000) return {ok:false, reason:'market-identity-mismatch'};
  if (expectedTicker && expectedTicker !== market.ticker) return {ok:false, reason:'ticker-mismatch'};
  // Legacy rows must prove strike identity as well as time; never relabel a different contract.
  if (!expectedTicker && (strike === null || actualStrike === null || Math.abs(strike-actualStrike) > 0.02)) return {ok:false, reason:'strike-mismatch'};
  if (!['yes','no'].includes(market.result) || !['settled','finalized'].includes(market.status) || now < close) return {ok:false, reason:'not-settled'};
  const outcomeDir = market.result === 'yes' ? 'UP' : 'DOWN';
  const direction = callDirection(entry);
  return {ok:true, patch:{
    result:isDirection(direction) ? (direction === outcomeDir ? 'WIN' : 'LOSS') : 'SITOUT',
    outcomeDir, kalshiResolved:true,
    officialSettlement:{schema:1, source:'kalshi-public-api', ticker:market.ticker, closeTime:market.close_time, strike:actualStrike, outcomeDir, verifiedAt:now},
  }};
}

// Read-only exchange audit 2026-09-27. Exact record identity and original result
// are required. Two wrong-strike rows are quarantined, not silently relabeled.
const historicalAudit = [
  [1787532681706,'2026-08-24T00:45:00.000Z','UP','LOSS',77413.14,77254.58,'yes','KXBTC15M-26AUG232100-00'],
  [1787533801453,'2026-08-24T01:00:00.000Z','DOWN','LOSS',77634.44,77634.44,'no','KXBTC15M-26AUG232115-15'],
  [1787534256814,'2026-08-24T01:15:00.000Z','DOWN','LOSS',77634.44,77465.36,'no','KXBTC15M-26AUG232130-30'],
  [1787711605089,'2026-08-26T02:30:00.000Z','UP','WIN',79216.71,79216.71,'no','KXBTC15M-26AUG252245-45'],
  [1788599779051,'2026-09-05T09:15:00.000Z','DOWN','LOSS',79730.74,79730.74,'no','KXBTC15M-26SEP050530-30'],
  [1788805973096,'2026-09-07T18:30:00.000Z','DOWN','WIN',79139.36,79139.36,'yes','KXBTC15M-26SEP071445-45'],
  [1789107423798,'2026-09-11T06:15:00.000Z','UP','WIN',77374.66,77374.66,'no','KXBTC15M-26SEP110230-30'],
];
const AUDIT_AT = Date.parse('2026-09-27T01:07:02.193Z');

export function repairCallRecord(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  let next = entry;
  if (!isDirection(callDirection(next)) && ['WIN','LOSS'].includes(next.result)) {
    const repairAt=Math.max(AUDIT_AT,finiteNumber(next.manualEditedAt)??0)+1;
    next = amendCallRecord(next, {result:'SITOUT', recordIntegrity:{version:1, status:'repaired', reason:'non-directional-result'}, manualEdit:true, manualEditedAt:repairAt}, {source:'v14.2-non-directional-scoring', at:repairAt});
  }
  const audit = historicalAudit.find(([id, start, direction, result, strike]) =>
    entry.id === id && entry.windowId === `15m-${start}` && (entry.asset || 'BTC') === 'BTC' && entry.windowType === '15m' && callDirection(entry) === direction && entry.result === result && finiteNumber(entry.strikeAtLock) === strike);
  if (audit && !entry.officialSettlement && !entry.recordIntegrity?.historicalAudit) {
    const [,start,,, ,strike,result,ticker] = audit;
    const check = settlementPatch(entry, {ticker, floor_strike:strike, result, status:'settled', close_time:new Date(Date.parse(start)+900000).toISOString()}, AUDIT_AT);
    next = amendCallRecord(next, {...(check.ok ? check.patch : {}), recordIntegrity:{version:1, historicalAudit:true, status:check.ok?'repaired':'review-required', reason:check.ok?'official-settlement-correction':check.reason}, manualEdit:true, manualEditedAt:AUDIT_AT}, {source:'v14.2-verified-history-audit', at:AUDIT_AT});
  }
  return next;
}

export function isScoredCall(entry) {
  return !!entry && isDirection(callDirection(entry)) && ['WIN','LOSS'].includes(entry.result) && entry.wasOverriddenNoTrade !== true && entry.recordIntegrity?.status !== 'review-required' && !(entry.tier === 'no-go-data' && !entry.closingPrice);
}

// All state updates, imports and cloud restores pass through this. Old devices
// cannot remove the captured original by sending a slimmer row later.
export function normalizeCallLedger(incoming, previous = [], snapshot = null, now = Date.now()) {
  if (!Array.isArray(incoming)) return previous;
  const prior = new Map(previous.filter(Boolean).map(e => [callKey(e), e]));
  let changed = false;
  const entries = incoming.map(entry => {
    if (!entry) return entry;
    const old = prior.get(callKey(entry));
    if (old === entry) return entry;
    let next = entry;
    if (old?.originalDecision) {
      next = {...next, originalDecision:old.originalDecision, recordRevisions:old.recordRevisions || next.recordRevisions};
      // A legacy browser's slim/stale copy is not a new correction. Preserve
      // stronger official evidence unless the user supplied a newer explicit edit.
      const newerEdit=next.manualEdit===true && (finiteNumber(next.manualEditedAt)??0)>(finiteNumber(old.manualEditedAt)??0);
      if (old.officialSettlement && !entry.officialSettlement && !newerEdit) {
        next={...next,result:old.result,outcomeDir:old.outcomeDir,officialSettlement:old.officialSettlement,kalshiResolved:old.kalshiResolved,recordIntegrity:old.recordIntegrity,manualEdit:old.manualEdit,manualEditedAt:old.manualEditedAt};
      }
      if(old.recordIntegrity?.status==='review-required'&&!entry.recordIntegrity&&!newerEdit)next.recordIntegrity=old.recordIntegrity;
      const amended = amendCallRecord(old, next, {source:next.officialSettlement?'official-settlement':next.manualEdit?'reconciliation-or-manual-edit':'lifecycle-update', at:now});
      next = amended;
    } else if (!next.originalDecision) {
      const matching = snapshot?.originalDecision && snapshot.originalDecision.windowId === next.windowId && snapshot.originalDecision.direction === callDirection(next) && snapshot.originalDecision.asset === (next.asset || 'BTC');
      next = {...next, originalDecision:matching ? snapshot.originalDecision : captureOriginalDecision(next, {now, provenance:next.result == null && String(next.taraVersion).includes('v14.2')?'captured-at-lock':'legacy-observed'})};
    }
    next = repairCallRecord(next);
    if (next !== entry) changed = true;
    return next;
  });
  return changed ? entries : incoming;
}
