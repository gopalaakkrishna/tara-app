import {LEARNING_PROTOCOL,calibrationFeatures,validFeatures,recordPrediction} from './learningCore.js';
import {finiteNumber as num} from './callIntegrity.js';
let registry=null;
export function setLearningRegistry(value){registry=value?.protocol===LEARNING_PROTOCOL?value:null;}
export function learningPredictions(features,{profile,key,at=Date.now()}={}){
  if(!validFeatures(features)||!registry||at-registry.generatedAt>48*3600000)return [];
  const p=registry.profiles?.[profile];
  return [p?.challenger?.model,p?.champion].filter(Boolean).map(m=>recordPrediction(m,features,{profile,key,at})).filter(Boolean);
}
// Called only at the original decision. Old records never gain reconstructed
// features, and later settlements cannot rewrite this capture.
export function capturePickLearning(p,{profile,at,close,version,probability,confidence,price,event,quoteAt}={}){
  const f=calibrationFeatures({probability,confidence,secondsLeft:(close-at)/1000});
  if(!f||num(at)===null||num(close)===null||at>=close||num(price)===null||price<=0||price>=100||
    !p?.ticker||!['YES','NO'].includes(p.side)||num(quoteAt)===null||at-quoteAt>30000||quoteAt>at+2000)return null;
  return {protocol:LEARNING_PROTOCOL,profile,features:f,ticker:p.ticker,side:p.side,at,close,version,price,event:event||p.ticker,quoteAt,
    predictions:learningPredictions(f,{profile,key:`${profile}|${p.ticker}|${p.side}`,at})};
}
export function capturePickSettlement(p,market,now=Date.now()){
  const c=p?.learningCapture,close=Date.parse(market?.close_time);
  if(!c||market?.ticker!==c.ticker||!['settled','finalized'].includes(market.status)||!['yes','no'].includes(market.result)||
    !Number.isFinite(close)||Math.abs(close-c.close)>1000||now<close)return null;
  return {protocol:LEARNING_PROTOCOL,ticker:market.ticker,result:market.result,at:now,verified:true,source:'kalshi-public-api',close};
}
