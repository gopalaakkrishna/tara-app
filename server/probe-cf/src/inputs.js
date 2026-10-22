// Synthetic scoring inputs, same shape as tests/helpers/scoreEngineHarness.js
// scoringInputs(). Used only to measure the engine's CPU cost on Cloudflare;
// no Call is ever made from them.
export function scoringInputs({secondsLeft = 631, is15m = true, direction = 'UP', now = Date.now()} = {}) {
  const sign = direction === 'UP' ? 1 : -1, currentPrice = 83400;
  const candles = (step, period) => Array.from({length: 180}, (_, i) => ({t: now - i * period, o: currentPrice - sign * (i + .5) * step,
    c: currentPrice - sign * i * step, h: currentPrice - sign * i * step + 2, l: currentPrice - sign * (i + 1) * step - 2, v: 20 + i % 5}));
  return {currentPrice, referencePrice: currentPrice, targetMargin: currentPrice - sign * 35,
    liveHistory: candles(1, 60000), tfCandles: {c1m: candles(1, 60000), c5m: candles(3, 300000), c15m: candles(5, 900000)},
    globalFlow: {imbalance: sign * .6, deltaUSD: sign * 100000, totalVolume: 500000}, bloomberg: {}, velocityRef: {current: {v5s: sign * .2, v15s: sign * .18, v30s: sign * .15, accel: 0}},
    tickHistoryRef: {current: []}, priceMemoryRef: {current: []}, windowType: is15m ? '15m' : '5m', is15m,
    clockSeconds: secondsLeft, timeFraction: 1 - secondsLeft / (is15m ? 900 : 300), windowOpenPrice: currentPrice - sign * 20,
    windowHigh: currentPrice + 20, windowLow: currentPrice - 20, windowOpenTime: now - ((is15m ? 900 : 300) - secondsLeft) * 1000,
    tapeWindows: {w15: {buyPct: direction === 'UP' ? 90 : 10}, w30: {buyPct: direction === 'UP' ? 90 : 10}, w60: {buyPct: direction === 'UP' ? 90 : 10}},
    currentAsset: 'BTC', adaptiveWeights: null, calibration: null, regimeMemory: {}, currentRegime: 'RANGE-CHOP'};
}
