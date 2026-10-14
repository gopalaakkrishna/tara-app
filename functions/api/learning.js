import {LEARNING_PROTOCOL} from '../../src/learningCore.js';
export const REGISTRY_URL='https://github.com/gopalaakkrishna/tara-app/releases/download/learning-registry-v1/registry.json';
export async function onRequest({request}){
  if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
  try{const r=await fetch(REGISTRY_URL,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),cf:{cacheTtl:120}});
    if(!r.ok)throw new Error('Registry unavailable');const data=await r.json();
    if(data.protocol!==LEARNING_PROTOCOL||!Number.isFinite(data.generatedAt)||!data.profiles)throw new Error('Invalid registry');
    return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=60'}});
  }catch{return new Response(JSON.stringify({status:'unavailable',reason:'Learning trainer registry is unavailable; no model activation.'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
}
