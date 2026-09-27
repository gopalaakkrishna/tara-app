// Read-only, bounded calls. Cache receipt time is preserved across failures.
export async function fetchBounded(url,{fetcher=fetch,maxBytes=1200000,timeoutMs=8000}={}) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetcher(url,{signal:controller.signal,redirect:'manual',headers:{Accept:'application/json, text/calendar;q=0.9, text/plain;q=0.8','User-Agent':'TaraMarketData/14.3 (+https://taracalls.pages.dev)'}});
    if(!r.ok)throw new Error(`Upstream HTTP ${r.status}`);
    if(Number(r.headers.get('content-length'))>maxBytes)throw new Error('Upstream response too large');
    if(!r.body)throw new Error('Empty upstream response');
    const reader=r.body.getReader(),decoder=new TextDecoder();let text='',bytes=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new Error('Upstream response too large');}text+=decoder.decode(value,{stream:true});}}finally{reader.releaseLock();}
    return text+decoder.decode();
  }finally{clearTimeout(timer);}
}
export const jsonResponse=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

export async function cachedSource(ctx,source,parse,{cache=globalThis.caches?.default,fetcher=fetch,now=Date.now(),freshMs=3600000,retainMs=86400000}={}) {
  const key=new Request(`${new URL(ctx.request.url).origin}/__tara-data-cache/v14.3.0/${source.id}`);
  const cached=await cache?.match(key).then(r=>r?.json()).catch(()=>null);
  if(cached?.fetchedAt&&now-cached.fetchedAt>=0&&now-cached.fetchedAt<freshMs)return {...cached,status:'fresh',error:null};
  try{
    const body=await fetchBounded(source.url,{fetcher}),events=parse(body,source,{from:now-86400000,to:now+91*86400000});
    if(!events.length)throw new Error('No recognized scheduled events');
    const value={id:source.id,name:source.name,url:source.page,fetchedAt:Date.now(),events};
    if(cache)ctx.waitUntil(cache.put(key,Response.json(value,{headers:{'Cache-Control':`public, max-age=${Math.floor(retainMs/1000)}`}})).catch(()=>{}));
    return {...value,status:'fresh',error:null};
  }catch(error){
    const usable=cached?.fetchedAt&&now-cached.fetchedAt>=0&&now-cached.fetchedAt<retainMs;
    return {id:source.id,name:source.name,url:source.page,fetchedAt:usable?cached.fetchedAt:null,events:usable?cached.events:[],status:usable?'stale':'unavailable',error:error.name==='AbortError'?'Upstream timed out':String(error.message).slice(0,120)};
  }
}
