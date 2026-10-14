// Public market/history reads only. Produces aggregate models + a derived
// evidence archive; never updates tara_state, Calls, account state or orders.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {trainLearningRegistry} from '../src/learningTrainer.js';
import {callLearningRow,studyLearningRows,pickLearningRow} from '../src/learningCore.js';
const root=new URL('../',import.meta.url),out=new URL('../learning-output/',import.meta.url);
const app=await readFile(new URL('src/App.jsx',root),'utf8');
const literal=name=>{const m=app.match(new RegExp(`const\\s+${name}\\s*=\\s*['\"]([^'\"]+)['\"]`));if(!m)throw new Error('Public database configuration missing');return m[1];};
const url=literal('SUPABASE_URL'),key=literal('SUPABASE_ANON_KEY'),health={};
const read=async(u,headers={})=>{const r=await fetch(u,{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`Read failed (${r.status})`);return r.json();};
const stateURL='https://github.com/gopalaakkrishna/tara-app/releases/download/learning-registry-v1/trainer-state.json';
const stateResponse=await fetch(stateURL,{signal:AbortSignal.timeout(20000)});
if(!stateResponse.ok&&stateResponse.status!==404)throw new Error('Previous trainer state unavailable; retaining published registry');
if(stateResponse.status===404){
  const release=await fetch('https://api.github.com/repos/gopalaakkrishna/tara-app/releases/tags/learning-registry-v1',{signal:AbortSignal.timeout(10000)});
  if(release.ok&&(await release.json()).assets?.some(a=>a.name==='registry.json'))throw new Error('Existing registry lost its archive; refusing to reset training');
  if(!release.ok&&release.status!==404)throw new Error('Bootstrap cannot verify an absent registry');
}
const previous=stateResponse.status===404?{}:await stateResponse.json();
const db=async(query)=>read(`${url}/rest/v1/tara_state?${query}`,{apikey:key,Authorization:`Bearer ${key}`});
const doc=async(path)=>{try{const r=(await db(`select=data,updated_at&doc_path=eq.${encodeURIComponent(path)}`))[0];health[path]={status:r?'read':'missing',updatedAt:r?.updated_at||null};return r?.data||{};}catch{health[path]={status:'read-failed'};return null;}};
const now=Date.now();
const [callDoc,hourlyDoc,weatherDoc,sports]=await Promise.all([doc('memory/taraCallLog'),doc('memory/hourlyRecord'),doc('memory/weatherPicks'),
  read('https://raw.githubusercontent.com/gopalaakkrishna/sports-model/main/public/sports.json').then(d=>{health.Sports={status:'external-source-not-independent-proof',updatedAt:d.generated};return d;}).catch(()=>{health.Sports={status:'read-failed'};return {};})]);
// A failed source read must not advance its watermark or erase archived data.
const since=new Date((previous.watermark||now-48*3600000)-300000).toISOString();
let studies=[],researchOK=false;
try{const records=await db(`select=data,updated_at&doc_path=like.research%2FlockStudy_v1_%25&updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc&limit=500`);
  studies=records.map(r=>r.data);researchOK=records.length<500;
  health.research={status:researchOK?'read':'backlog-limit-watermark-retained',rows:records.length};
}catch{health.research={status:'read-failed-watermark-retained'};}
const calls=callDoc?.entries||[],hourly=[...(hourlyDoc?.history||[]),...(hourlyDoc?.pending||[])],weather=weatherDoc?.picks||[];
// Re-read the exact official market for NEW eligible outcomes. A label's
// self-declared provenance in the anonymous shared document is not proof.
const cache=new Map();
const official=async(ticker)=>{if(!cache.has(ticker))cache.set(ticker,read(`https://api.elections.kalshi.com/trade-api/v2/markets/${encodeURIComponent(ticker)}`).then(d=>d.market).catch(()=>null));return cache.get(ticker);};
const rowId=r=>JSON.stringify([r.key,r.labelAt,r.y,r.x,r.at,r.close,r.base,r.bid,r.ask,r.cost]);
const priorKeys=new Set((previous.rows||[]).map(rowId));
const verify=async(rows,ticker,close,outcome)=>{
  if(!rows.length)return true;
  if(rows.every(r=>priorKeys.has(rowId(r))))return true;
  const m=await official(ticker);return !!m&&m.ticker===ticker&&['settled','finalized'].includes(m.status)&&m.result===outcome&&Date.parse(m.close_time)===close;
};
for(const e of calls){const c=callLearningRow(e,{asOf:now});if(c.ok&&!await verify([c.row],e.officialSettlement.ticker,c.row.close,c.row.y?'yes':'no'))e.officialSettlement={...e.officialSettlement,source:'official-recheck-failed'};}
for(const s of studies){const rows=studyLearningRows(s,{asOf:now});if(rows.length&&!await verify(rows,s.settlement.ticker,rows[0].close,rows[0].y?'yes':'no'))s.settlement={...s.settlement,source:'official-recheck-failed'};}
for(const [list,profile] of [[hourly,'BTC_hourly'],[weather,null]])for(const p of list){const c=pickLearningRow(p,profile||`Weather_${p.tier}`,{asOf:now});if(c.ok&&!await verify([c.row],p.learningSettlement.ticker,c.row.close,p.learningSettlement.result))p.learningSettlement={...p.learningSettlement,verified:false};}
health.official={status:'exact-market-reads-only',newMarketReads:cache.size};
// On a failed fetch retain previous evidence; on a successful read, normal
// amendments/exclusions invalidate that source's previously accepted rows.
const result=trainLearningRegistry({calls,studies,hourly,weather,sports,previous,now,sourceHealth:health});
result.watermark=researchOK?now:previous.watermark;
// Membership fingerprints are kept in the trainer archive, not sent to every
// dashboard poll. Published models contain no account data or trading keys.
const publicRegistry={...result.registry,profiles:Object.fromEntries(Object.entries(result.registry.profiles).map(([name,p])=>
  [name,{...p,challenger:{...p.challenger,evidence:undefined}}]))};
await mkdir(out,{recursive:true});
await writeFile(new URL('registry.json',out),JSON.stringify(publicRegistry));
await writeFile(new URL('trainer-state.json',out),JSON.stringify(result));
await writeFile(new URL(`registry-${now}.json`,out),JSON.stringify(publicRegistry));
console.log(JSON.stringify({protocol:result.registry.protocol,dataset:result.registry.datasetId,profiles:Object.fromEntries(Object.entries(result.registry.profiles).map(([k,p])=>[k,{status:p.status,groups:p.independentGroups,forward:p.forwardGroups}])),sources:health}));
