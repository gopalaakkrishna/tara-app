const KEY='taraExecutionJournal_v1';
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
export function readExecutionJournal(storage){
  const raw=storage.getItem(KEY);if(!raw)return {schema:1,intents:{}};
  const j=JSON.parse(raw);if(j?.schema!==1||!j.intents||typeof j.intents!=='object'||Array.isArray(j.intents))throw Error('Execution journal is invalid; entry blocked.');
  return j;
}
export async function stableExecutionId(parts,cryptoApi=crypto){
  const digest=await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(parts)));
  return 'tara_'+Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,48);
}
export async function executionIntentId({account='simulation',asset='BTC',windowId,cryptoApi=crypto}){
  if(!/^(15m|5m)-\d{4}-/.test(windowId||''))throw Error('Invalid execution window');
  return stableExecutionId([account,asset,windowId],cryptoApi);
}
export function checkExecutionBudget(settings,summary,stake,now=Date.now()){
  if(!summary?.verified||!valid(summary.at)||now-summary.at>15000||summary.at>now+2000)return {ok:false,reason:'account-risk-unverified'};
  if(Number(settings.cooldownUntil)>now)return {ok:false,reason:'execution-cooldown'};
  const dayCap=Number(settings.maxAutoTradesPerDay),windowCap=Number(settings.maxAutoTradesPerWindow),lossCap=Number(settings.maxDailyLoss);
  if(!valid(dayCap)||!valid(windowCap)||!valid(lossCap)||!valid(summary.dayTrades)||!valid(summary.windowTrades)||!valid(summary.lossAndExposureDollars)||!valid(stake))return {ok:false,reason:'risk-input-invalid'};
  if(summary.dayTrades>=dayCap)return {ok:false,reason:'daily-trade-cap'};
  if(summary.windowTrades>=windowCap)return {ok:false,reason:'window-trade-cap'};
  if(summary.lossAndExposureDollars+stake>lossCap+1e-9)return {ok:false,reason:'daily-loss-and-exposure-cap'};
  return {ok:true};
}
export async function reserveExecutionIntent({storage,id,windowId,asset='BTC',stake,settings,dryRun,now=Date.now(),withLock,accountRisk}){
  // Web Locks serializes same-origin tabs; deterministic exchange client IDs
  // protect the same account/window on other devices. No public cloud orders.
  if(!withLock)return {ok:false,reason:'execution-lock-unavailable'};
  try{return await withLock('account-budget',async()=>{
    try{
      const journal=readExecutionJournal(storage);
      if(journal.intents[id])return {ok:false,reason:'intent-already-recorded',intent:journal.intents[id]};
      const day=Math.floor(now/86400000),same=Object.values(journal.intents).filter(x=>x.dryRun===dryRun&&Math.floor(x.at/86400000)===day);
      // Simulation uses a conservative loss+reserved-principal budget, never
      // credits forecast wins or reset-on-refresh counters. Live needs exchange evidence.
      const summary=dryRun?{verified:true,at:now,dayTrades:same.length,windowTrades:same.filter(x=>x.windowId===windowId).length,lossAndExposureDollars:same.reduce((s,x)=>s+x.reservedDollars,0)}:accountRisk;
      const gate=checkExecutionBudget(settings,summary,stake,now);if(!gate.ok)return gate;
      journal.intents[id]={id,asset,windowId,at:now,dryRun,reservedDollars:stake,status:'reserved'};
      storage.setItem(KEY,JSON.stringify(journal));
      return {ok:true,intent:journal.intents[id]};
    }catch(e){return {ok:false,reason:'execution-journal-unavailable',detail:e.message};}
  });}catch(e){return {ok:false,reason:'execution-lock-unavailable',detail:e.message};}
}
export function updateExecutionIntent(storage,id,patch){
  const j=readExecutionJournal(storage),old=j.intents[id];if(!old)throw Error('Missing execution intent');
  j.intents[id]={...old,...patch,id:old.id,asset:old.asset,windowId:old.windowId,dryRun:old.dryRun,at:old.at,reservedDollars:old.reservedDollars};storage.setItem(KEY,JSON.stringify(j));return j.intents[id];
}
export function readExecutionState(storage){
  try{const state=JSON.parse(storage.getItem('taraExecutionState_v1')||'null');return state&&state.dryRun===false&&!['exited','no-fill'].includes(state.status)?{...state,status:'unknown',reason:'reload-requires-exchange-verification'}:state;}catch{return {status:'unknown',reason:'execution-state-invalid',dryRun:false};}
}
export function writeExecutionState(storage,state){
  // Retain unresolved real positions until an exchange-confirmed closure.
  storage.setItem('taraExecutionState_v1',JSON.stringify(state));
}
export function restoreExecutionLedger(storage){
  try{return Object.fromEntries(Object.values(readExecutionJournal(storage).intents).filter(x=>x.filled).map(x=>[`${x.asset}|${x.windowId}`,x]));}catch{return {};}
}
