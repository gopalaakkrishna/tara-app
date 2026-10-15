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

// One bounded retry for transient rate limits/service failures. A retry never
// promotes the previous quote or changes its receipt time; only valid new JSON
// can become an observation. Long Retry-After responses stay blocked.
export async function readHourlyPublic(url,{validate,timeoutMs=6000,fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
  for(let attempt=0;attempt<2;attempt++){
    try{
      const r=await fetchImpl(url,{method:'GET',signal:AbortSignal.timeout(timeoutMs),cache:'no-store'});
      if(!r.ok){
        const retry=Number(r.headers?.get?.('retry-after'))*1000;
        if(attempt===0&&[429,502,503,504].includes(r.status)&&(!retry||retry<=2000)){await sleep(Math.max(750,retry||0));continue;}
        return {ok:false,reason:'http '+r.status};
      }
      const text=await r.text();if(!text||text.trimStart().startsWith('<'))return {ok:false,reason:'HTML not JSON'};
      let data;try{data=JSON.parse(text);}catch{return {ok:false,reason:'invalid JSON'};}
      if(validate&&!validate(data))return {ok:false,reason:'unexpected payload'};
      return {ok:true,data};
    }catch(e){
      if(attempt===0){await sleep(750);continue;}
      return {ok:false,reason:String(e?.message||'fetch failed').slice(0,48)};
    }
  }
  return {ok:false,reason:'public read unavailable'};
}
