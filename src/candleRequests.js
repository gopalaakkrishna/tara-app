// Coinbase supports explicit start/end ranges of at most 300 candles. A moving
// 30-second range also prevents a cached no-range response from staying stale.
export function coinbaseCandleRange(intervalSeconds,now=Date.now()) {
  if(![60,300,900,3600,21600,86400].includes(intervalSeconds)||!Number.isFinite(now))throw new Error('Invalid candle range');
  const end=Math.floor(now/30000)*30000;
  return new URLSearchParams({start:new Date(end-299*intervalSeconds*1000).toISOString(),end:new Date(end).toISOString()}).toString();
}
