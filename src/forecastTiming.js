// clockSeconds is the application's REMAINING seconds, not elapsed seconds.
export function forecastSecondsRemaining(clockSeconds, is15m) {
  const n=clockSeconds===null||clockSeconds===undefined||clockSeconds===''?NaN:Number(clockSeconds);
  return Number.isFinite(n)?Math.max(0,Math.min(is15m?900:300,n)):0;
}

// Fractional bars express a projection ending at settlement. Historical slope
// estimation may use more bars, but the projected horizon must not do so.
export function cappedForecastBars(secondsRemaining, timeframeMinutes, baseForecast) {
  if(!(secondsRemaining>0)||!(timeframeMinutes>0)||!(baseForecast>0))return 0;
  return Math.max(0,Math.min(baseForecast,secondsRemaining/(timeframeMinutes*60)));
}

export function forecastAvailability(results) {
  const timeframes=['1m','5m','15m'].map(timeframe=>{
    const r=results?.[timeframe];
    return {timeframe,valid:r?.valid===true,direction:r?.valid?r.forecastDir:null,
      reason:r?.valid?null:(r?.reason||'unavailable'),forecastBars:r?.forecast??null};
  });
  const validCount=timeframes.filter(r=>r.valid).length;
  return {validCount,total:3,status:validCount===3?'ready':validCount?'partial':'unavailable',timeframes};
}
