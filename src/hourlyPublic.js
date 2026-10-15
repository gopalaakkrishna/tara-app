// Public GET-only routes. Honor the existing API host, then retain a CORS-enabled
// public proxy if Pages is rate-limited and official browser access is blocked.
export function hourlyPublicPaths(path,apiBase=''){
  const base=String(apiBase||'').trim().replace(/\/+$/,'');
  if(!/^(series\/KXBTCD|events\?|markets[/?])/.test(path))throw Error('Unsupported public hourly path');
  return [...new Set([
    base?base+'/kalshi-public/'+path:'/api/kalshi-public/'+path,
    'https://tara-kalshi-proxy.onrender.com/kalshi-public/'+path,
    'https://external-api.kalshi.com/trade-api/v2/'+path,
    'https://api.elections.kalshi.com/trade-api/v2/'+path,
  ])];
}
