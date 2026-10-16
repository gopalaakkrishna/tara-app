// Private, paper-only natural expiry. This module has no order or cloud-write
// transport. Reservations and original fills are never released or repriced.
import {windowCloseMs} from './callIntegrity.js';
import {readExecutionJournal,updateExecutionIntent,writeExecutionState} from './executionJournal.js';

const number=x=>x==null||x===''||typeof x==='boolean'?null:Number.isFinite(Number(x))?Number(x):null;
export const isUnresolvedPaperFill=x=>x?.dryRun===true&&x.status==='filled'&&!!x.ticker;
export function capturePaperMarketIdentity({ticker,windowId,asset='BTC',strike,callId=null,source='execution-capture'}={}){
  const closeMs=windowCloseMs(windowId),price=number(strike),type=String(windowId||'').startsWith('5m-')?'5M':'15M';
  if(!Number.isFinite(closeMs)||price===null||price<=0||!String(ticker||'').startsWith(`KX${asset}${type}-`))return null;
  return {ticker,windowId,asset,closeMs,strike:price,eventTicker:ticker.slice(0,ticker.lastIndexOf('-')),callId,source};
}
const fillIdentity=x=>JSON.stringify([x?.id,x?.asset,x?.windowId,x?.at,x?.dryRun,x?.ticker,x?.dir,x?.filledCount,x?.filledAtCents,x?.filledFeesCents]);
function originalIdentity(intent,rows){
  const matches=(Array.isArray(rows)?rows:[]).filter(r=>r?.windowId===intent.windowId&&(r.asset||'BTC')===(intent.asset||'BTC')&&r.originalDecision?.marketTicker===intent.ticker);
  if(!matches.length)return null;
  const candidates=matches.map(r=>capturePaperMarketIdentity({ticker:intent.ticker,windowId:intent.windowId,asset:intent.asset||'BTC',strike:r.originalDecision.strike,callId:r.id,source:'original-call-recovery'}));
  if(candidates.some(x=>!x)||new Set(candidates.map(x=>JSON.stringify([x.ticker,x.windowId,x.strike,x.callId]))).size!==1)return null;
  return candidates[0];
}
function validateMarket(intent,identity,market,now){
  const close=Date.parse(market?.close_time||''),floor=number(market?.floor_strike);
  if(market?.ticker!==intent.ticker||market?.event_ticker!==identity.eventTicker||Math.abs(close-identity.closeMs)>1000||!Number.isFinite(close)||floor===null||Math.abs(floor-identity.strike)>.02||!['greater','greater_or_equal'].includes(market.strike_type))return {ok:false,reason:'paper-market-identity-mismatch'};
  if(!['finalized','settled'].includes(market.status)||!['yes','no'].includes(market.result)||now<close)return {ok:false,reason:'paper-official-result-pending'};
  const count=number(intent.filledCount),price=number(intent.filledAtCents),fees=number(intent.filledFeesCents);
  if(!Number.isInteger(count)||count<=0||!['UP','DOWN'].includes(intent.dir))return {ok:false,reason:'paper-fill-unverified'};
  const outcomeDir=market.result==='yes'?'UP':'DOWN',won=intent.dir===outcomeDir,payout=won?count:0;
  const principal=price!==null&&price>0&&price<100?count*price/100:null;
  const pnl=principal!==null&&fees!==null&&fees>=0?Number((payout-principal-fees/100).toFixed(8)):null;
  return {ok:true,patch:{status:'settled',settlementKind:'paper-expiry',settlementResult:won?'WIN':'LOSS',settledAt:now,
    paperMarketIdentity:identity,settlementPayoutDollars:payout,stakeDollars:principal,realizedPnLDollars:pnl,
    pnlCentsPerContract:pnl===null?null:pnl*100/count,pnlStatus:pnl===null?'unverified-fill-cost':'captured-fill-and-fee',
    officialSettlement:{schema:1,source:'kalshi-public-api',ticker:market.ticker,eventTicker:market.event_ticker,closeTime:market.close_time,strike:floor,outcomeDir,verifiedAt:now}}};
}
function currentState(storage,readState){
  return readState?readState():JSON.parse(storage.getItem('taraExecutionState_v1')||'null');
}
function repairMatchingState(storage,intent,readState){
  const state=currentState(storage,readState);
  if(!state||state.dryRun!==true||state.intentId!==intent.id||state.ticker!==intent.ticker||!['filled','settlement-pending'].includes(state.status))return null;
  const next={...state,status:'exited',exitReason:'paper-official-settlement',paperSettlementPending:false,rolloverPending:false,
    settledAt:intent.settledAt,settlementKind:'paper-expiry',settlementResult:intent.settlementResult,
    officialSettlement:intent.officialSettlement,realizedPnLDollars:intent.realizedPnLDollars,pnlCentsPerContract:intent.pnlCentsPerContract};
  writeExecutionState(storage,next);return next;
}
export async function recoverExpiredPaperExecutions({storage,readOriginalCalls,readMarket,withLock,readState,now=Date.now(),onSettled=()=>{}}){
  const result={at:now,settled:[],failures:[]};
  if(typeof withLock!=='function'){result.failures.push({reason:'paper-execution-lock-unavailable'});return result;}
  let initial;try{initial=readExecutionJournal(storage);}catch{result.failures.push({reason:'paper-execution-journal-unavailable'});return result;}
  // A quota error can leave the journal final but its UI mirror unfinished.
  for(const saved of Object.values(initial.intents))if(saved.dryRun===true&&saved.status==='settled'&&saved.settlementKind==='paper-expiry'){
    try{await withLock('account-budget',async()=>{const latest=readExecutionJournal(storage).intents[saved.id];if(latest?.dryRun===true&&latest.status==='settled'){const state=repairMatchingState(storage,latest,readState);if(state)onSettled(latest,state);}});}catch{result.failures.push({id:saved.id,reason:'paper-state-recovery-unavailable'});}
  }
  const pending=Object.values(initial.intents).filter(isUnresolvedPaperFill);
  let calls;
  for(const intent of pending){
    const close=windowCloseMs(intent.windowId);if(!Number.isFinite(close)||now<close+30000)continue;
    try{
      let identity=intent.paperMarketIdentity;
      const captured=identity&&capturePaperMarketIdentity(identity);
      if(!captured||captured.ticker!==intent.ticker||captured.windowId!==intent.windowId||captured.asset!==(intent.asset||'BTC')){
        if(calls===undefined)calls=await readOriginalCalls();
        identity=originalIdentity(intent,calls);
      }else identity={...identity,...captured};
      if(!identity){result.failures.push({id:intent.id,reason:'paper-original-identity-unavailable'});continue;}
      const market=await readMarket(intent.ticker),verified=validateMarket(intent,identity,market,now);
      if(!verified.ok){result.failures.push({id:intent.id,reason:verified.reason});continue;}
      await withLock('account-budget',async()=>{
        const latest=readExecutionJournal(storage).intents[intent.id];
        // An early exit or another tab may have finished while the GET waited.
        if(!isUnresolvedPaperFill(latest)||fillIdentity(latest)!==fillIdentity(intent))return;
        const state=currentState(storage,readState);
        if(state?.intentId===intent.id&&state.dryRun===true&&['exiting','exit-pending','unknown'].includes(state.status)){result.failures.push({id:intent.id,reason:'paper-exit-in-flight'});return;}
        const saved=updateExecutionIntent(storage,intent.id,verified.patch);result.settled.push(saved);
        let next=null;try{next=repairMatchingState(storage,saved,readState);}catch{result.failures.push({id:intent.id,reason:'paper-state-recovery-unavailable'});}
        onSettled(saved,next);
      });
    }catch{result.failures.push({id:intent.id,reason:'paper-settlement-unavailable'});}
  }
  return result;
}
