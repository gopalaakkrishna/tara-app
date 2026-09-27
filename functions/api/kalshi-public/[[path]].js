import {fetchBounded,jsonResponse} from '../../../lib/publicData.js';
// Public market reads only. Account/order routes remain separate and authenticated.
export async function onRequest(context) {
  const {request,params}=context;
  if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
  const path=Array.isArray(params.path)?params.path.join('/'):(params.path||'');
  if(!/^(events|markets|series|exchange|historical)(\/[A-Za-z0-9_.,-]+)*$/.test(path)||path.includes('..'))return jsonResponse({error:'Unsupported public market path'},400);
  try{
    const text=await fetchBounded(`https://external-api.kalshi.com/trade-api/v2/${path}${new URL(request.url).search}`,{maxBytes:4000000,timeoutMs:7000});
    return jsonResponse(JSON.parse(text));
  }catch(error){
    const limited=error.message==='Upstream HTTP 429';
    return jsonResponse({error:limited?'Exchange rate limit; retry later':'Public exchange read failed'},limited?429:502);
  }
}
