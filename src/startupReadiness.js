import {useEffect,useRef} from 'react';
import {finiteNumber} from './callIntegrity.js';

export const STARTUP_SAMPLE_COUNT=50;
export const STARTUP_SAMPLE_SPAN_MS=60000;
const MAX_SAMPLE_GAP_MS=15000;
const CACHE_KEY='taraStartupSamples_v1';

export function candleReadiness(candles,intervalSeconds,minimum,now) {
  const byTime=new Map();
  for(const candle of candles||[]) {
    const time=finiteNumber(candle?.time);
    const values=['o','h','l','c'].map(k=>finiteNumber(candle?.[k]));
    if(time===null||values.some(v=>v===null||v<=0)||time*1000>now+2000)continue;
    if(candle.h<Math.max(candle.o,candle.c)||candle.l>Math.min(candle.o,candle.c)||candle.h<candle.l)continue;
    byTime.set(time,candle);
  }
  const times=[...byTime.keys()].sort((a,b)=>b-a).slice(0,minimum);
  if(times.length<minimum)return {ok:false,reason:`${times.length}/${minimum} valid candles`};
  if(now-times[0]*1000>(intervalSeconds*2+30)*1000)return {ok:false,reason:'latest candle is stale'};
  for(let i=1;i<times.length;i++) {
    if(Math.abs(times[i-1]-times[i]-intervalSeconds)>1)return {ok:false,reason:'candle history has gaps'};
  }
  return {ok:true,count:times.length};
}

export function observeStartupSamples(previous,{asset,source,spotAt,spot,now}) {
  const same=previous?.asset===asset&&previous?.source===source;
  let samples=same?[...new Set((Array.isArray(previous.samples)?previous.samples:[]).filter(t=>Number.isFinite(t)&&t<=now&&now-t<=300000))].sort((a,b)=>a-b):[];
  for(let i=1;i<samples.length;i++)if(samples[i]-samples[i-1]>MAX_SAMPLE_GAP_MS)samples=samples.slice(i);
  const at=finiteNumber(spotAt),price=finiteNumber(spot);
  if(at===null||price===null||price<=0||at>now+2000||now-at>MAX_SAMPLE_GAP_MS) {
    return {asset,source,samples:[]};
  }
  // Poll timestamps are observations. Repeated renders and synthetic candles
  // cannot manufacture live history, and a disconnected feed starts afresh.
  if(samples.length&&at-samples.at(-1)>MAX_SAMPLE_GAP_MS)samples.length=0;
  if(!samples.length||at>samples.at(-1))samples.push(at);
  return {asset,source,samples:samples.slice(-150)};
}

export function assessStartupReadiness({history=[],tfCandles={},samples=[],spot,spotAt,
  analysis,intervalSeconds=900,now=Date.now(),minimumUntil=0}={}) {
  const checks=[['window',history,intervalSeconds,30],['1m',tfCandles.c1m,60,60],
    ['5m',tfCandles.c5m,300,60],['15m',tfCandles.c15m,900,60]];
  const missing=checks.map(([label,bars,interval,count])=>({label,...candleReadiness(bars,interval,count,now)})).filter(c=>!c.ok);
  const last=finiteNumber(spotAt),price=finiteNumber(spot);
  const fresh=last!==null&&price!==null&&price>0&&now-last>=-2000&&now-last<=MAX_SAMPLE_GAP_MS;
  const liveSamples=samples.filter(t=>Number.isFinite(t)&&now-t<=300000&&t<=now);
  const count=liveSamples.length;
  const spanMs=count?liveSamples.at(-1)-liveSamples[0]:0;
  const remainingSeconds=Math.max(0,Math.ceil((STARTUP_SAMPLE_SPAN_MS-spanMs)/1000));
  let code='ready',reason='Data ready — candle history and live observations verified.';
  if(missing.length){code='startup-history';reason=`Loading candle history: ${missing.map(c=>`${c.label} ${c.reason}`).join('; ')}.`;}
  else if(!fresh){code='startup-feed';reason='Waiting for a fresh spot-price observation.';}
  else if(count<STARTUP_SAMPLE_COUNT||spanMs<STARTUP_SAMPLE_SPAN_MS){
    code='startup-sampling';reason=`Warming up live observations: ${Math.min(count,STARTUP_SAMPLE_COUNT)}/${STARTUP_SAMPLE_COUNT} samples${remainingSeconds?` · at least ${remainingSeconds}s of observation remaining`:''}.`;
  }else if(!analysis||analysis.prediction==='ERROR'||finiteNumber(analysis.rawProbAbove)===null||analysis.rawProbAbove<0||analysis.rawProbAbove>100){
    code='startup-analysis';reason='Waiting for the signal engine to finish computing.';
  }else if(now<minimumUntil){code='startup-user-hold';reason=`Startup hold set on this device: ${Math.ceil((minimumUntil-now)/60000)} min remaining.`;}
  return {ready:code==='ready',code,reason,samples:count,spanMs,remainingSeconds,checkedAt:now};
}

export function useStartupReadiness(input) {
  const tracker=useRef(null);
  const persistedAt=useRef(0);
  if(tracker.current===null){
    try{tracker.current=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');}catch{}
  }
  const now=input.now??Date.now();
  tracker.current=observeStartupSamples(tracker.current,{...input,now});
  const result=assessStartupReadiness({...input,samples:tracker.current.samples,now});
  useEffect(()=>{
    if(now-persistedAt.current<5000)return;
    persistedAt.current=now;
    try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(tracker.current));}catch{}
  },[now,input.asset,input.source]);
  return result;
}
