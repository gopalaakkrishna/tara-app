import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// ═══════════════════════════════════════
// ICONS
// ═══════════════════════════════════════
const IC={
Clock:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
Crosshair:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>,
Zap:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
Terminal:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
Alert:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
Activity:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
Bell:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
TrendUp:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
Globe:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
Msg:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
X:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
Info:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
Vol2:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
VolX:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>,
Help:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
Link:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
ChevronDown:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polyline points="6 9 12 15 18 9"/></svg>,
BarChart:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
};

// ═══════════════════════════════════════
// MATH & INDICATORS (V99 ENHANCED)
// ═══════════════════════════════════════
const formatUSD=(val)=>{const abs=Math.abs(val);if(abs>=1e6)return(val/1e6).toFixed(2)+'M';if(abs>=1e3)return(val/1e3).toFixed(1)+'K';return val.toFixed(0);};
const calcEMA=(d,p)=>{if(!d||d.length<p)return new Array(d?.length||0).fill(null);const k=2/(p+1),r=new Array(d.length).fill(null);let s=0;for(let i=0;i<p;i++)s+=d[i];r[p-1]=s/p;for(let i=p;i<d.length;i++)r[i]=(d[i]-r[i-1])*k+r[i-1];return r;};
const calcVWAP=(h)=>{if(!h||!h.length)return null;let t=0,v=0;h.forEach(c=>{t+=((c.h+c.l+c.c)/3)*c.v;v+=c.v;});return v===0?null:t/v;};
const calcRSI=(d,p=14)=>{if(!d||d.length<p+1)return 50;let ag=0,al=0;for(let i=1;i<=p;i++){const x=d[i-1]-d[i];if(x>0)ag+=x;else al-=x;}ag/=p;al/=p;for(let i=p+1;i<Math.min(d.length,p+30);i++){const x=d[i-1]-d[i];ag=(ag*(p-1)+Math.max(x,0))/p;al=(al*(p-1)+Math.max(-x,0))/p;}return al===0?100:100-(100/(1+(ag/al)));};
const calcATR=(h,p=14)=>{if(!h||h.length<p+1)return 0;let s=0;for(let i=0;i<p;i++){const H=h[i].h,L=h[i].l,pc=h[i+1]?.c||h[i].o;s+=Math.max(H-L,Math.abs(H-pc),Math.abs(L-pc));}return s/p;};
const calcBB=(c,p=20)=>{if(!c||c.length<p)return{upper:0,mid:0,lower:0,pctB:0.5,width:0};const s=c.slice(0,p),m=s.reduce((a,b)=>a+b,0)/p,sd=Math.sqrt(s.reduce((a,b)=>a+Math.pow(b-m,2),0)/p);const u=m+2*sd,l=m-2*sd;return{upper:u,mid:m,lower:l,pctB:(u-l)>0?(c[0]-l)/(u-l):0.5,width:m>0?((u-l)/m)*10000:0};};

// V99 NEW INDICATORS
const calcConsecutiveCandles=(history)=>{if(!history||history.length<2)return{green:0,red:0};let green=0,red=0;for(const c of history){if(c.c>c.o){if(red>0)break;green++;}else if(c.c<c.o){if(green>0)break;red++;}else break;}return{green,red};};
const calcVolumeRatio=(history,recent=5,baseline=25)=>{if(!history||history.length<baseline)return 1;const rv=history.slice(0,recent).reduce((s,c)=>s+(c.v||0),0)/recent;const bv=history.slice(recent,baseline).reduce((s,c)=>s+(c.v||0),0)/(baseline-recent);return bv>0?rv/bv:1;};
const calcPriceChannel=(history,n=20)=>{if(!history||history.length<n)return 0.5;const hi=Math.max(...history.slice(0,n).map(c=>c.h));const lo=Math.min(...history.slice(0,n).map(c=>c.l));return hi>lo?(history[0].c-lo)/(hi-lo):0.5;};
const calcMomentumAlignment=(d1,d5,d15)=>{const signs=[Math.sign(d1),Math.sign(d5),Math.sign(d15)];const sum=signs.reduce((a,b)=>a+b,0);if(Math.abs(sum)===3)return{aligned:true,strong:true,dir:sum>0?1:-1};if(Math.abs(sum)>=2)return{aligned:true,strong:false,dir:sum>0?1:-1};return{aligned:false,strong:false,dir:0};};
const sigmoid=(x,steep=0.035)=>1/(1+Math.exp(-steep*x));

// ═══════════════════════════════════════
// TARA SELF-TRAINING ENGINE V1
// Adaptive weights + calibration + trade log
// ═══════════════════════════════════════

// Default signal weights (match original hardcoded values)
const DEFAULT_WEIGHTS={gap:35,momentum:30,structure:15,flow:20,technical:25,regime:15};
const WEIGHT_BOUNDS={gap:[5,55],momentum:[5,50],structure:[2,30],flow:[2,40],technical:[5,45],regime:[2,30]};
const LEARNING_RATE=0.8; // how aggressively to update weights per trade

// Load weights from localStorage or use defaults
const loadWeights=()=>{try{const s=localStorage.getItem('taraWeightsV100');if(s){const w=JSON.parse(s);if(w&&typeof w.gap==='number')return w;}return{...DEFAULT_WEIGHTS};}catch(e){return{...DEFAULT_WEIGHTS};}};
const saveWeights=(w)=>{try{localStorage.setItem('taraWeightsV100',JSON.stringify(w));}catch(e){}};

// Load trade log
const loadTradeLog=()=>{try{const s=localStorage.getItem('taraTradeLogV100');if(s)return JSON.parse(s);return[];}catch(e){return[];}};
const saveTradeLog=(log)=>{try{localStorage.setItem('taraTradeLogV100',JSON.stringify(log.slice(-500)));}catch(e){}}; // keep last 500

// ── GRADIENT DESCENT WEIGHT UPDATE ──
// After each trade, credit/blame each signal proportionally to its contribution
const updateWeights=(weights,tradeLog,result)=>{
  // Only update if we have signal data
  const last=tradeLog[tradeLog.length-1];
  if(!last||!last.signals||!last.posterior)return weights;
  const won=result==='WIN';
  const sig=last.signals;
  const totalAbs=Object.values(sig).reduce((s,v)=>s+Math.abs(v),0)||1;
  const conviction=Math.abs(last.posterior-50)/50; // how confident was the prediction
  const newW={...weights};

  Object.keys(sig).forEach(k=>{
    if(!(k in newW))return;
    const contribution=Math.abs(sig[k])/totalAbs; // how much this signal contributed (0-1)
    const aligned=Math.sign(sig[k])===Math.sign(last.posterior-50); // did signal agree with direction?
    // If we won AND signal was aligned → reinforce it
    // If we lost AND signal was aligned → reduce it (it was wrong)
    // If signal was opposite to final call → inverse logic
    let delta=LEARNING_RATE*contribution*conviction;
    if(won&&aligned)newW[k]+=delta;
    else if(won&&!aligned)newW[k]-=delta*0.3; // mild penalty for opposing signals on wins
    else if(!won&&aligned)newW[k]-=delta;      // strong penalty for aligned signals on losses
    else if(!won&&!aligned)newW[k]+=delta*0.2; // mild reward for opposing signals on losses
    // Clamp to bounds
    const[lo,hi]=WEIGHT_BOUNDS[k]||[2,55];
    newW[k]=Math.max(lo,Math.min(hi,newW[k]));
  });
  saveWeights(newW);
  return newW;
};

// ── CALIBRATION ENGINE ──
// Maps raw posterior buckets → actual historical win rates
const buildCalibration=(tradeLog)=>{
  const buckets={};
  for(let b=0;b<=90;b+=10)buckets[b]={wins:0,total:0};
  tradeLog.filter(t=>t.result).forEach(t=>{
    const bucket=Math.floor(Math.max(0,Math.min(90,t.posterior-50+50))/10)*10; // center on 50
    // Map: posterior 50=neutral, >50=UP bias
    const upBias=t.posterior>50;
    const b2=Math.floor(t.posterior/10)*10;
    const key=Math.max(0,Math.min(90,b2));
    if(!buckets[key])buckets[key]={wins:0,total:0};
    buckets[key].total++;
    if(t.result==='WIN')buckets[key].wins++;
  });
  // Compute calibrated win rates per bucket
  const cal={};
  Object.keys(buckets).forEach(k=>{
    const{wins,total}=buckets[k];
    cal[k]=total>=3?(wins/total)*100:null; // null = not enough data
  });
  return cal;
};

// Apply calibration correction to raw posterior
const calibratePosterior=(raw,calibration)=>{
  if(!calibration)return raw;
  const bucket=Math.floor(raw/10)*10;
  const calVal=calibration[Math.max(0,Math.min(90,bucket))];
  if(calVal==null)return raw; // no data for this bucket yet
  // Blend: 70% calibrated, 30% raw (trust grows with more data)
  return calVal*0.7+raw*0.3;
};

// ── PER-SIGNAL ACCURACY TRACKER ──
const buildSignalAccuracy=(tradeLog)=>{
  const signals={gap:{right:0,total:0},momentum:{right:0,total:0},structure:{right:0,total:0},flow:{right:0,total:0},technical:{right:0,total:0},regime:{right:0,total:0}};
  tradeLog.filter(t=>t.result&&t.signals).forEach(t=>{
    const won=t.result==='WIN';
    const finalDir=t.posterior>50; // true=UP prediction
    Object.keys(t.signals).forEach(k=>{
      if(!signals[k])return;
      const sigDir=t.signals[k]>0; // true=this signal voted UP
      const aligned=sigDir===finalDir;
      signals[k].total++;
      // Signal was "right" if it voted same direction as outcome
      const outcomeUp=t.dir==='UP';
      if(sigDir===outcomeUp)signals[k].right++;
    });
  });
  return signals;
};

// ── SESSION PERFORMANCE ──
const buildSessionPerf=(tradeLog)=>{
  const sessions={ASIA:{wins:0,losses:0},EU:{wins:0,losses:0},US:{wins:0,losses:0},'OFF-HOURS':{wins:0,losses:0}};
  tradeLog.filter(t=>t.result).forEach(t=>{
    const s=t.session||'OFF-HOURS';
    if(!sessions[s])sessions[s]={wins:0,losses:0};
    if(t.result==='WIN')sessions[s].wins++;else sessions[s].losses++;
  });
  return sessions;
};

// ── TIME-OF-DAY PERFORMANCE ──
const buildHourlyPerf=(tradeLog)=>{
  const hourly={};
  tradeLog.filter(t=>t.result&&t.hour!=null).forEach(t=>{
    const h=t.hour;if(!hourly[h])hourly[h]={wins:0,losses:0};
    if(t.result==='WIN')hourly[h].wins++;else hourly[h].losses++;
  });
  return hourly;
};

// ═══════════════════════════════════════
// MARKET SESSIONS
// ═══════════════════════════════════════
const getMarketSessions=()=>{const now=new Date();const utcH=now.getUTCHours();const asia=utcH>=0&&utcH<9;const eu=utcH>=7&&utcH<16;const us=utcH>=13&&utcH<22;const sessions=[];if(asia)sessions.push({name:'ASIA',flag:'🌏',color:'text-amber-400'});if(eu)sessions.push({name:'EU',flag:'🌍',color:'text-blue-400'});if(us)sessions.push({name:'US',flag:'🌎',color:'text-emerald-400'});const dominant=sessions.length>0?sessions[sessions.length-1].name:'OFF-HOURS';return{sessions,dominant,utcH};};

// ═══════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════
const useVelocity=(tickH,price,target)=>{const ref=useRef({v1s:0,v5s:0,v15s:0,v30s:0,accel:0,jerk:0,peakPnL:0,troughPnL:0,pnlSlope:0});const pnlH=useRef([]);useEffect(()=>{const iv=setInterval(()=>{if(!price||!target)return;const now=Date.now(),ticks=tickH.current||[];const ga=(ms)=>{const r=ticks.filter(t=>Math.abs((now-t.time)-ms)<2000);return r.length>0?r.reduce((a,b)=>a+b.p,0)/r.length:null;};const p1=ga(1000),p5=ga(5000),p15=ga(15000),p30=ga(30000);const v1s=p1?(price-p1):0,v5s=p5?(price-p5)/5:0,v15s=p15?(price-p15)/15:0,v30s=p30?(price-p30)/30:0;const cpnl=target>0?((price-target)/target)*10000:0;pnlH.current.push({pnl:cpnl,time:now});pnlH.current=pnlH.current.filter(p=>now-p.time<120000);const peakPnL=Math.max(...pnlH.current.map(p=>p.pnl),cpnl);const troughPnL=Math.min(...pnlH.current.map(p=>p.pnl),cpnl);const recent=pnlH.current.filter(p=>now-p.time<10000);const pnlSlope=recent.length>=3?recent[recent.length-1].pnl-recent[0].pnl:0;ref.current={v1s,v5s,v15s,v30s,accel:v5s-v15s,jerk:v1s-v5s,peakPnL,troughPnL,pnlSlope};},500);return()=>clearInterval(iv);},[price,target]);return ref;};

const useGlobalTape=()=>{const tapeRef=useRef({coinbase:{buys:0,sells:0},binanceFutures:{buys:0,sells:0},bybit:{buys:0,sells:0},globalBuys:0,globalSells:0,globalImbalance:1,cbFlow:0,bnFlow:0,byFlow:0,divergence:0,whaleAlerts:[],binancePrice:0,bybitPrice:0});const ticksRef=useRef([]);const[whaleLog,setWhaleLog]=useState([]);const[globalFlow,setGlobalFlow]=useState({imbalance:1,divergence:0,whaleAlert:null,feeds:0,deltaUSD:0});useEffect(()=>{if(typeof window==='undefined')return;let wsBN=null,wsBY=null,feedCount=0;try{wsBN=new WebSocket('wss://fstream.binance.com/ws/btcusdt@aggTrade');wsBN.onopen=()=>{feedCount++;};wsBN.onmessage=(e)=>{try{const d=JSON.parse(e.data);const price=parseFloat(d.p),qty=parseFloat(d.q),usd=price*qty,isBuy=!d.m,now=Date.now();ticksRef.current.push({p:price,s:qty,usd,t:isBuy?'B':'S',src:'bn',time:now});tapeRef.current.binancePrice=price;if(usd>25000){const alert={src:'Binance',side:isBuy?'BUY':'SELL',size:qty,usd,price,time:now};tapeRef.current.whaleAlerts.push(alert);tapeRef.current.whaleAlerts=tapeRef.current.whaleAlerts.slice(-20);setWhaleLog(prev=>[alert,...prev].slice(0,50));}}catch(er){}}}catch(e){}try{wsBY=new WebSocket('wss://stream.bybit.com/v5/public/linear');wsBY.onopen=()=>{feedCount++;wsBY.send(JSON.stringify({op:'subscribe',args:['publicTrade.BTCUSDT']}));};wsBY.onmessage=(e)=>{try{const msg=JSON.parse(e.data);if(msg.topic==='publicTrade.BTCUSDT'&&msg.data){msg.data.forEach(trade=>{const price=parseFloat(trade.p),qty=parseFloat(trade.v),usd=price*qty,isBuy=trade.S==='Buy',now=Date.now();ticksRef.current.push({p:price,s:qty,usd,t:isBuy?'B':'S',src:'by',time:now});tapeRef.current.bybitPrice=price;if(usd>25000){const alert={src:'Bybit',side:isBuy?'BUY':'SELL',size:qty,usd,price,time:now};tapeRef.current.whaleAlerts.push(alert);tapeRef.current.whaleAlerts=tapeRef.current.whaleAlerts.slice(-20);setWhaleLog(prev=>[alert,...prev].slice(0,50));}});}}catch(er){}}}catch(e){}const aggIv=setInterval(()=>{const now=Date.now();ticksRef.current=ticksRef.current.filter(t=>now-t.time<30000);let cbB=0,cbS=0,bnB=0,bnS=0,byB=0,byS=0;ticksRef.current.forEach(t=>{const u=t.usd||(t.s*t.p);if(t.src==='cb'){if(t.t==='B')cbB+=u;else cbS+=u;}else if(t.src==='bn'){if(t.t==='B')bnB+=u;else bnS+=u;}else if(t.src==='by'){if(t.t==='B')byB+=u;else byS+=u;}});const gB=cbB+bnB+byB,gS=cbS+bnS+byS,gI=gS===0?(gB>0?2:1):gB/gS;const cbF=(cbB+cbS)>0?(cbB-cbS)/(cbB+cbS):0,bnF=(bnB+bnS)>0?(bnB-bnS)/(bnB+bnS):0,byF=(byB+byS)>0?(byB-byS)/(byB+byS):0;const dF=(bnB+byB-bnS-byS),sF=(cbB-cbS);const div=(bnB+bnS+byB+byS)>0?(sF>0&&dF<0?-1:sF<0&&dF>0?1:0)*Math.min(1,Math.abs(sF-dF)/Math.max(1,gB+gS)*10):0;tapeRef.current={...tapeRef.current,coinbase:{buys:cbB,sells:cbS},binanceFutures:{buys:bnB,sells:bnS},bybit:{buys:byB,sells:byS},globalBuys:gB,globalSells:gS,globalImbalance:gI,cbFlow:cbF,bnFlow:bnF,byFlow:byF,divergence:div};const rW=tapeRef.current.whaleAlerts.find(w=>now-w.time<5000);setGlobalFlow({imbalance:gI,divergence:div,whaleAlert:rW||null,feeds:feedCount,deltaUSD:gB-gS});},1000);return()=>{clearInterval(aggIv);if(wsBN?.readyState===1)wsBN.close();if(wsBY?.readyState===1)wsBY.close();};},[]);return{tapeRef,globalFlow,ticksRef,whaleLog};};

const useBloomberg=()=>{const[data,setData]=useState({fundingRate:0,fundingRatePrev:0,nextFundingTime:0,openInterest:0,openInterestUSD:0,oiChange5m:0,basisBps:0,markPrice:0,indexPrice:0,longShortRatio:1,topTraderLSPositions:1,binanceFuturesVol24h:0,liqLongWall:0,liqShortWall:0,liqLongUSD:0,liqShortUSD:0,lastUpdate:0,status:'connecting'});const oiSnaps=useRef([]);useEffect(()=>{if(typeof window==='undefined')return;const f=async()=>{try{const R=await Promise.allSettled([fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=3').then(r=>r.json()),fetch('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1').then(r=>r.json()),fetch('https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=5m&limit=1').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=50').then(r=>r.json())]);const[pR,oR,fR,gR,tR,t24R,dR]=R;const now=Date.now();let u={lastUpdate:now,status:'live'};if(pR.status==='fulfilled'&&pR.value){const p=pR.value;const mk=parseFloat(p.markPrice)||0,ix=parseFloat(p.indexPrice)||0;u.fundingRate=parseFloat(p.lastFundingRate)||0;u.markPrice=mk;u.indexPrice=ix;u.basisBps=ix>0?((mk-ix)/ix)*10000:0;u.nextFundingTime=parseInt(p.nextFundingTime)||0;}if(oR.status==='fulfilled'&&oR.value){const oi=parseFloat(oR.value.openInterest)||0;oiSnaps.current.push({oi,time:now});oiSnaps.current=oiSnaps.current.filter(s=>now-s.time<600000);const o5=oiSnaps.current.find(s=>now-s.time>=270000&&now-s.time<=330000);u.openInterest=oi;u.openInterestUSD=oi*(u.markPrice||0);u.oiChange5m=o5?((oi-o5.oi)/o5.oi)*100:0;}if(fR.status==='fulfilled'&&Array.isArray(fR.value)&&fR.value.length>=2)u.fundingRatePrev=parseFloat(fR.value[1]?.fundingRate)||0;if(gR.status==='fulfilled'&&Array.isArray(gR.value)&&gR.value[0])u.longShortRatio=parseFloat(gR.value[0].longShortRatio)||1;if(tR.status==='fulfilled'&&Array.isArray(tR.value)&&tR.value[0])u.topTraderLSPositions=parseFloat(tR.value[0].longShortRatio)||1;if(t24R.status==='fulfilled'&&t24R.value)u.binanceFuturesVol24h=parseFloat(t24R.value.quoteVolume)||0;if(dR.status==='fulfilled'&&dR.value?.bids&&dR.value?.asks){const mp=u.markPrice||0;if(mp>0){let mBW=0,mBP=0,tBL=0,mAW=0,mAP=0,tAL=0;dR.value.bids.forEach(([p,q])=>{const pr=parseFloat(p),qt=parseFloat(q),dist=((mp-pr)/mp)*100;if(dist<2&&dist>0){const usd=pr*qt;tBL+=usd;if(usd>mBW){mBW=usd;mBP=pr;}}});dR.value.asks.forEach(([p,q])=>{const pr=parseFloat(p),qt=parseFloat(q),dist=((pr-mp)/mp)*100;if(dist<2&&dist>0){const usd=pr*qt;tAL+=usd;if(usd>mAW){mAW=usd;mAP=pr;}}});u.liqLongWall=mAP;u.liqShortWall=mBP;u.liqLongUSD=tAL;u.liqShortUSD=tBL;}}setData(prev=>({...prev,...u}));}catch(e){setData(prev=>({...prev,status:'error'}));}};f();const iv=setInterval(f,8000);return()=>clearInterval(iv);},[]);return data;};

// ═══════════════════════════════════════
// SYNTHETIC DATA FALLBACK (always shows a chart)
// ═══════════════════════════════════════
const generateSyntheticBTC=(basePrice=84000,candles=120,intervalSec=60)=>{
  const out=[];let p=basePrice;const now=Math.floor(Date.now()/1000);
  // seeded random for consistency
  let seed=now%99999;const rng=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
  for(let i=candles-1;i>=0;i--){
    const vol=p*0.0009;
    const trend=(rng()-0.48)*vol;
    const range=rng()*vol*2.5;
    const o=p;const c=p+trend;
    const h=Math.max(o,c)+rng()*range;
    const l=Math.min(o,c)-rng()*range;
    const v=5+rng()*40;
    out.push({time:now-(i*intervalSec),o,h,l,c,v});
    p=c;
  }
  return out;
};

// ═══════════════════════════════════════
// TARA CHART — TRADINGVIEW EMBEDDED WIDGET
// ═══════════════════════════════════════
const TV_INTERVAL_MAP={'1m':'1','3m':'3','5m':'5','15m':'15','30m':'30','1h':'60'};

const TradingViewChart=({resolution,onResolutionChange,windowType})=>{
  const containerRef=useRef(null);
  const widgetCreatedRef=useRef(false);
  const[loaded,setLoaded]=useState(false);
  const[error,setError]=useState(false);

  const buildWidget=useCallback(()=>{
    if(!containerRef.current||widgetCreatedRef.current)return;
    const interval=TV_INTERVAL_MAP[resolution]||'1';
    try{
      containerRef.current.innerHTML='';
      const el=document.createElement('div');
      el.id='tara_tv_'+Date.now();
      el.style.cssText='width:100%;height:100%;';
      containerRef.current.appendChild(el);
      // eslint-disable-next-line no-undef
      new window.TradingView.widget({
        autosize:true,
        symbol:'COINBASE:BTCUSD',
        interval,
        timezone:'Etc/UTC',
        theme:'dark',
        style:'1',
        locale:'en',
        toolbar_bg:'#111312',
        backgroundColor:'rgba(17,19,18,1)',
        gridColor:'rgba(232,233,228,0.03)',
        enable_publishing:false,
        hide_side_toolbar:true,
        allow_symbol_change:false,
        save_image:false,
        container_id:el.id,
        studies:['STD;Volume'],
        show_popup_button:false,
        withdateranges:true,
        details:false,
        hotlist:false,
        calendar:false,
        hide_volume:false,
      });
      widgetCreatedRef.current=true;
      setLoaded(true);
    }catch(e){console.error('TV widget error:',e);setError(true);}
  },[resolution]);

  // Load TradingView script once
  useEffect(()=>{
    if(window.TradingView){buildWidget();return;}
    if(document.getElementById('tv-script')){
      const poll=setInterval(()=>{if(window.TradingView){clearInterval(poll);buildWidget();}},300);
      setTimeout(()=>clearInterval(poll),15000);
      return;
    }
    const s=document.createElement('script');
    s.id='tv-script';s.async=true;
    s.src='https://s3.tradingview.com/tv.js';
    s.onload=()=>buildWidget();
    s.onerror=()=>setError(true);
    document.head.appendChild(s);
  },[]);

  // Rebuild widget on resolution change
  useEffect(()=>{
    widgetCreatedRef.current=false;
    setLoaded(false);
    if(window.TradingView)buildWidget();
  },[resolution,buildWidget]);

  return(
    <div style={{userSelect:'none',width:'100%'}}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-[#111312] rounded-lg border border-[#E8E9E4]/5 overflow-hidden">
          {['1m','3m','5m','15m','30m','1h'].map(r=>(
            <button key={r} onClick={()=>{widgetCreatedRef.current=false;onResolutionChange&&onResolutionChange(r);}}
              className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors ${resolution===r?'bg-indigo-500/20 text-indigo-400':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/70'}`}>{r}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#E8E9E4]/30">
          <span className="hidden sm:inline">COINBASE:BTCUSD · TradingView</span>
          {!loaded&&!error&&<span className="text-indigo-400 animate-pulse">Loading chart...</span>}
          {error&&<span className="text-amber-400">TV blocked — check network</span>}
        </div>
      </div>

      {/* TV container */}
      <div ref={containerRef} style={{width:'100%',height:'420px',borderRadius:'8px',overflow:'hidden',background:'#111312',position:'relative'}}>
        {!loaded&&!error&&(
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'8px'}}>
            <div style={{width:'32px',height:'32px',border:'2px solid rgba(99,102,241,0.3)',borderTop:'2px solid #6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
            <span style={{fontSize:'11px',color:'rgba(232,233,228,0.3)',fontFamily:'monospace',letterSpacing:'0.1em'}}>LOADING TRADINGVIEW...</span>
          </div>
        )}
        {error&&(
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'8px'}}>
            <span style={{fontSize:'24px'}}>📡</span>
            <span style={{fontSize:'11px',color:'rgba(232,233,228,0.4)',fontFamily:'monospace',textAlign:'center',padding:'0 16px'}}>TradingView blocked by network/CSP<br/>Check your browser or Vercel headers</span>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};



// ═══════════════════════════════════════
// V99 ADVISOR STATE MACHINE
// ═══════════════════════════════════════
const computeAdvisor=(params)=>{
  const{userPosition,positionStatus,currentOdds,offerVal,betAmount,maxPayout,clockSeconds,windowType,tickSlope,isRugPull,showRugPullAlerts,hasReversedRef,peakOfferRef,posterior,targetMargin,currentPrice,minsRemaining,secsRemaining,accel,pnlSlope,atrBps,activePrediction,lockInfo}=params;
  const intervalSeconds=windowType==='15m'?900:300;
  const timeRemainingFrac=Math.max(0,clockSeconds/intervalSeconds);
  const timeLabel=`${minsRemaining}m ${secsRemaining}s left`;
  const isLate=timeRemainingFrac<0.15;
  const isVeryLate=timeRemainingFrac<0.08;
  const cp=currentPrice||0;
  const tm=targetMargin||0;
  const gapBps=tm>0?((cp-tm)/tm)*10000:0;
  const isUP=userPosition==='UP';const isDN=userPosition==='DOWN';
  const isLocked=activePrediction?.includes('LOCKED');
  const lockDir=lockInfo?.dir||null;

  // ── NO POSITION — pre-entry advisor ──
  if(!userPosition){
    // Rug pull always first
    if(isRugPull&&showRugPullAlerts)return{label:'RUG PULL — ABORT LONGS',reason:`Massive liquidity collapse detected. Do not enter long. [${timeLabel}]`,color:'rose',animate:true,hasAction:false};

    // Window too late
    if(isVeryLate)return{label:'WINDOW CLOSED',reason:`Only ${secsRemaining}s remain. Entry window is closed — wait for next candle.`,color:'zinc',animate:false,hasAction:false};
    if(isLate&&!isLocked)return{label:'WINDOW CLOSING',reason:`${timeLabel} — no confirmed lock. High-risk to enter now. Stand by for next window.`,color:'amber',animate:false,hasAction:false};

    // Tara has a committed lock — this is the ONLY time to show an entry signal
    if(isLocked&&lockDir){
      const lockGap=lockInfo?.lockPrice>0?((cp-lockInfo.lockPrice)/lockInfo.lockPrice)*10000:0;
      const lockedSec=lockInfo?.lockedAt>0?Math.floor((Date.now()-lockInfo.lockedAt)/1000):0;
      if(lockDir==='UP')return{label:`ENTRY SIGNAL: UP`,reason:`Tara locked UP ${lockedSec}s ago at ${lockInfo.lockedPosterior?.toFixed(0)||'—'}% conf. Gap: ${gapBps.toFixed(1)} bps. [${timeLabel}]`,color:'emerald',animate:false,hasAction:true,actionLabel:`CONFIRM ENTRY 'UP'`,actionTarget:'UP'};
      if(lockDir==='DOWN')return{label:`ENTRY SIGNAL: DOWN`,reason:`Tara locked DOWN ${lockedSec}s ago at ${lockInfo.lockedPosterior?.toFixed(0)||'—'}% conf. Gap: ${gapBps.toFixed(1)} bps. [${timeLabel}]`,color:'rose',animate:false,hasAction:true,actionLabel:`CONFIRM ENTRY 'DOWN'`,actionTarget:'DOWN'};
    }

    // Already manually closed this window — no new entries
    if(activePrediction==='CLOSED'||activePrediction==='SIT OUT')return{label:'TRADE CLOSED',reason:`Position manually closed this window. Score recorded. Standing by for next window. [${timeLabel}]`,color:'zinc',animate:false,hasAction:false};

    // Forming — show progress, no action button
    if(activePrediction?.includes('UP (FORMING)'))return{label:'SIGNAL FORMING — UP',reason:`Bullish bias building (${posterior.toFixed(1)}%). Waiting for ${windowType==='15m'?3:2} consecutive samples to confirm lock. [${timeLabel}]`,color:'amber',animate:false,hasAction:false};
    if(activePrediction?.includes('DOWN (FORMING)'))return{label:'SIGNAL FORMING — DOWN',reason:`Bearish bias building (${(100-posterior).toFixed(1)}%). Waiting for ${windowType==='15m'?3:2} consecutive samples to confirm lock. [${timeLabel}]`,color:'amber',animate:false,hasAction:false};

    // No call yet / endgame no-call
    if(activePrediction==='NO CALL')return{label:'NO CALL THIS WINDOW',reason:`Lock threshold not reached before endgame. Sit out and wait for next window.`,color:'zinc',animate:false,hasAction:false};
    return{label:'SCANNING...',reason:`Analyzing ${windowType} window. No confirmed lock yet — ${posterior.toFixed(1)}% UP / ${(100-posterior).toFixed(1)}% DN. [${timeLabel}]`,color:'zinc',animate:false,hasAction:false};
  }

  // ── IN-TRADE ADVISOR ──
  const pnlPct=positionStatus?.pnlPct||0;
  const offerAboveBet=offerVal>betAmount;
  const profitPct=offerAboveBet?((offerVal-betAmount)/Math.max(1,betAmount))*100:0;
  const peakOffer=peakOfferRef?.current||0;
  const drawdownFromPeak=peakOffer>0?((peakOffer-offerVal)/peakOffer):0;
  const momentumWith=(isUP&&tickSlope>0)||(isDN&&tickSlope<0);
  const momentumAgainst=(isUP&&tickSlope<0)||(isDN&&tickSlope>0);
  const adverseAccel=(isUP&&(accel||0)<-0.5)||(isDN&&(accel||0)>0.5);
  const winSide=isUP?posterior:(100-posterior);
  const isWinning=winSide>52;
  const gapForPosition=isUP?gapBps:-gapBps;
  const gapStr=`Gap: ${gapForPosition>=0?'+':''}${gapBps.toFixed(0)} bps`;

  // Priority chain (highest first)
  if(positionStatus?.isStopHit)return{label:'30% STOP HIT — EXIT NOW',reason:`Hard stop breached. Entry: $${(positionStatus.entry||0).toFixed(0)} → Now: $${cp.toFixed(0)}. PnL: ${pnlPct.toFixed(1)}%. [${timeLabel}]`,color:'rose',animate:true,hasAction:true,actionLabel:'EXECUTE EMERGENCY EXIT',actionTarget:'SIT OUT'};
  if(isRugPull&&showRugPullAlerts&&isUP)return{label:'RUG PULL — EMERGENCY EXIT',reason:`Catastrophic liquidity drop. Exit long immediately. Price collapsing. [${timeLabel}]`,color:'rose',animate:true,hasAction:true,actionLabel:'EMERGENCY CASHOUT',actionTarget:'SIT OUT'};
  if(winSide<20&&!hasReversedRef?.current&&timeRemainingFrac>0.25)return{label:'REVERSE POSITION',reason:`Trend collapsed. ${winSide.toFixed(0)}% win chance. Flip to ${isUP?'DOWN':'UP'} — 1 reversal limit applies. [${timeLabel}]`,color:'amber',animate:true,hasAction:true,actionLabel:`REVERSE TO '${isUP?'DOWN':'UP'}'`,actionTarget:isUP?'DOWN':'UP'};
  if(winSide<20&&hasReversedRef?.current)return{label:'CUT LOSSES — EXIT NOW',reason:`Win rate at ${winSide.toFixed(0)}%. Reversal already used. Cut and protect capital. [${timeLabel}]`,color:'rose',animate:true,hasAction:true,actionLabel:'CUT LOSSES — CASHOUT',actionTarget:'SIT OUT'};
  if(profitPct>40&&momentumAgainst)return{label:'TAKE MAX PROFIT',reason:`Outstanding profit (+${profitPct.toFixed(0)}%). Momentum reversing. Lock it in now. ${gapStr}. [${timeLabel}]`,color:'emerald',animate:true,hasAction:true,actionLabel:'CASHOUT — MAX PROFIT',actionTarget:'CASH'};
  if(profitPct>20&&drawdownFromPeak>0.12)return{label:'TRAILING STOP HIT',reason:`Pulled back ${(drawdownFromPeak*100).toFixed(0)}% from peak offer. Securing profits before further drop. [${timeLabel}]`,color:'emerald',animate:true,hasAction:true,actionLabel:'EXECUTE CASHOUT',actionTarget:'CASH'};
  if(profitPct>12&&momentumAgainst&&isLate)return{label:'SCALP PROFIT',reason:`+${profitPct.toFixed(0)}% on offer with ${timeLabel} left. Momentum fading — scalp now. ${gapStr}.`,color:'emerald',animate:false,hasAction:true,actionLabel:'SCALP CASHOUT',actionTarget:'CASH'};
  if(offerAboveBet&&momentumAgainst&&winSide<60)return{label:'SECURE PROFIT',reason:`Profit on table (+${profitPct.toFixed(0)}%) but odds slipping to ${winSide.toFixed(0)}%. Consider exit. ${gapStr}. [${timeLabel}]`,color:'emerald',animate:false,hasAction:true,actionLabel:'EXECUTE CASHOUT',actionTarget:'CASH'};
  if(winSide<38&&momentumAgainst&&adverseAccel)return{label:'CUT LOSSES — NOW',reason:`${winSide.toFixed(0)}% win rate + adverse acceleration. Exit before this worsens. ${gapStr}. [${timeLabel}]`,color:'rose',animate:false,hasAction:true,actionLabel:'EXECUTE CASHOUT',actionTarget:'SIT OUT'};
  if(winSide<42&&isLate&&!isWinning)return{label:'CUT LOSSES',reason:`Only ${timeLabel} remain. At ${winSide.toFixed(0)}% odds and losing — unlikely recovery. ${gapStr}.`,color:'rose',animate:false,hasAction:true,actionLabel:'EXECUTE CASHOUT',actionTarget:'SIT OUT'};
  if(winSide<42&&momentumAgainst)return{label:'CUT LOSSES',reason:`Win rate declining (${winSide.toFixed(0)}%) with momentum against. Monitor closely. ${gapStr}. [${timeLabel}]`,color:'rose',animate:false,hasAction:false};
  if(winSide>82&&!offerAboveBet)return{label:'MAX PROFIT ZONE',reason:`Odds at ${winSide.toFixed(0)}% — excellent position. Stand by to lock gains if offer appears. ${gapStr}. [${timeLabel}]`,color:'emerald',animate:false,hasAction:true,actionLabel:'CASHOUT IF OFFERED',actionTarget:'CASH'};
  if(isWinning&&momentumWith)return{label:'HOLD STRONG',reason:`Win rate: ${winSide.toFixed(0)}%. Momentum aligned. Price firmly ${gapForPosition>=0?'above':'below'} strike by ${Math.abs(gapBps).toFixed(0)} bps. [${timeLabel}]`,color:'emerald',animate:false,hasAction:false};
  if(isWinning&&!momentumAgainst)return{label:'HOLD FIRM',reason:`${winSide.toFixed(0)}% win chance. ${gapStr}. Momentum neutral — position stable. [${timeLabel}]`,color:'emerald',animate:false,hasAction:false};
  if(!isWinning&&momentumWith)return{label:'RECOVERY IN PROGRESS',reason:`Price moving toward strike. Momentum is with you. ${gapStr}. Win rate: ${winSide.toFixed(0)}%. [${timeLabel}]`,color:'amber',animate:false,hasAction:false};
  return{label:'HOLD FIRM',reason:`${winSide.toFixed(0)}% win rate. ${gapStr}. Watching for cleaner signal. [${timeLabel}]`,color:'emerald',animate:false,hasAction:false};
};

// ═══════════════════════════════════════
// V99 PREDICTION ENGINE (Weighted Composite + Adaptive)
// ═══════════════════════════════════════
const computeV99Posterior=(params)=>{
  const{currentPrice,liveHistory,targetMargin,globalFlow,bloomberg,velocityRef,tickHistoryRef,priceMemoryRef,windowType,timeFraction,clockSeconds,is15m,regimeMemory,adaptiveWeights,calibration}=params;
  const W=adaptiveWeights||DEFAULT_WEIGHTS; // use adaptive or default
  const reasoning=[];let totalScore=0;
  const rawSignalScores={}; // for training log

  const closes=liveHistory.map(x=>x.c);
  const rsi=calcRSI(closes,14)||50;
  const atr=calcATR(liveHistory,14)||10;
  const atrBps=atr>0?(atr/currentPrice)*10000:15;
  const vwap=calcVWAP(liveHistory);
  const bb=calcBB([...closes].reverse(),20);
  const realGapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
  const vwapGapBps=vwap?((currentPrice-vwap)/vwap)*10000:0;
  const{v1s,v5s,v15s,v30s,accel,pnlSlope}=velocityRef.current||{};

  // Historic price lookup
  const getHP=(msAgo)=>{const t=Date.now()-msAgo;const m=priceMemoryRef.current;if(!m||m.length===0)return currentPrice;let c=m[0];for(let i=m.length-1;i>=0;i--){if(m[i].time<=t){c=m[i];break;}}return c.p;};
  const drift1m=((currentPrice-getHP(60000))/currentPrice)*10000;
  const drift5m=((currentPrice-getHP(300000))/currentPrice)*10000;
  const drift15m=((currentPrice-getHP(900000))/currentPrice)*10000;

  // V99 NEW SIGNALS
  const consecutive=calcConsecutiveCandles(liveHistory);
  const volRatio=calcVolumeRatio(liveHistory,5,25);
  const channel=calcPriceChannel(liveHistory,20);
  const momentumAlign=calcMomentumAlignment(drift1m,drift5m,drift15m);
  const aggrFlow=Math.max(-1,Math.min(1,globalFlow.imbalance-1));
  const ticks=tickHistoryRef.current;
  const tickSlope=ticks.length>=10?(currentPrice-ticks[0].p):0;

  // ── SIGNAL 1: GAP GRAVITY ──
  const timeDecay=Math.pow(timeFraction,is15m?1.8:1.3);
  const isPostDecay=timeFraction>0.6;
  const decayMult=isPostDecay?1.5:1.0;
  let gapScore=realGapBps*(is15m?0.65:0.85)*(0.15+0.85*timeDecay)*decayMult;
  const gapMag=Math.abs(realGapBps);
  if(gapMag>15)gapScore+=Math.sign(realGapBps)*Math.pow(gapMag-10,1.3)*(is15m?0.45:0.65);
  if(gapMag>50)gapScore*=0.7;
  const gapClamped=Math.max(-W.gap,Math.min(W.gap,gapScore));
  rawSignalScores.gap=gapClamped;
  totalScore+=gapClamped;
  if(gapMag>15)reasoning.push(`[GAP] ${realGapBps.toFixed(1)} bps — gravity ${realGapBps>0?'bullish':'bearish'} | W:${W.gap.toFixed(0)}`);

  // ── SIGNAL 2: MOMENTUM COMPOSITE ──
  let momScore=0;
  if(is15m){momScore=drift5m*0.6+drift1m*0.4;}
  else{momScore=(v30s||0)*(10000/currentPrice)*1.5+drift1m*1.0+drift5m*0.5;}
  if(momentumAlign.aligned&&momentumAlign.strong)momScore*=1.5;
  else if(momentumAlign.aligned)momScore*=1.2;
  const momClamped=Math.max(-W.momentum,Math.min(W.momentum,momScore*0.8));
  rawSignalScores.momentum=momClamped;
  totalScore+=momClamped;
  reasoning.push(`[MOMENTUM] ${drift1m.toFixed(1)} bps/1m | ${drift5m.toFixed(1)} bps/5m${momentumAlign.aligned?' ✦ ALIGNED':''} | W:${W.momentum.toFixed(0)}`);

  // ── SIGNAL 3: CANDLE STRUCTURE ──
  let structScore=0;
  if(consecutive.green>=3)structScore+=consecutive.green*3;
  if(consecutive.red>=3)structScore-=consecutive.red*3;
  if(volRatio>1.5&&consecutive.green>=2)structScore+=8;
  if(volRatio>1.5&&consecutive.red>=2)structScore-=8;
  const structClamped=Math.max(-W.structure,Math.min(W.structure,structScore));
  rawSignalScores.structure=structClamped;
  totalScore+=structClamped;
  if(consecutive.green>=2||consecutive.red>=2)reasoning.push(`[STRUCTURE] ${consecutive.green>0?consecutive.green+'× green':consecutive.red+'× red'} | Vol: ${volRatio.toFixed(1)}x | W:${W.structure.toFixed(0)}`);

  // ── SIGNAL 4: FLOW IMBALANCE ──
  let flowScore=aggrFlow*(is15m?W.flow:W.flow*1.5);
  if(accel&&drift1m>0&&accel>0)flowScore+=8;
  if(accel&&drift1m<0&&accel<0)flowScore-=8;
  const flowClamped=Math.max(-W.flow,Math.min(W.flow,flowScore));
  rawSignalScores.flow=flowClamped;
  totalScore+=flowClamped;
  reasoning.push(`[FLOW] Delta: ${globalFlow.deltaUSD>0?'+':''}${formatUSD(globalFlow.deltaUSD)} | Imbalance: ${aggrFlow.toFixed(2)} | W:${W.flow.toFixed(0)}`);

  // ── SIGNAL 5: TECHNICAL COMPOSITE ──
  let techScore=0;
  if(rsi>70&&realGapBps>0){techScore-=15;reasoning.push(`[RSI] Overbought (${rsi.toFixed(0)}) — fading top`);}
  else if(rsi<30&&realGapBps<0){techScore+=15;reasoning.push(`[RSI] Oversold (${rsi.toFixed(0)}) — fading bottom`);}
  else if(rsi>60&&drift1m<0)techScore-=8;
  else if(rsi<40&&drift1m>0)techScore+=8;
  if(drift1m>0&&vwapGapBps<-5){techScore-=10;reasoning.push(`[VWAP] Below VWAP — suppressing UP`);}
  if(drift1m<0&&vwapGapBps>5){techScore+=10;reasoning.push(`[VWAP] Above VWAP — suppressing DOWN`);}
  if(bb.pctB>0.85&&realGapBps>0){techScore-=8;reasoning.push(`[BB] Upper band squeeze — overbought`);}
  if(bb.pctB<0.15&&realGapBps<0){techScore+=8;reasoning.push(`[BB] Lower band squeeze — oversold`);}
  if(channel>0.8&&drift1m>0)techScore-=5;
  if(channel<0.2&&drift1m<0)techScore+=5;
  const techClamped=Math.max(-W.technical,Math.min(W.technical,techScore));
  rawSignalScores.technical=techClamped;
  totalScore+=techClamped;

  // ── SIGNAL 6: FUNDING & REGIME ──
  const funding=bloomberg?.fundingRate||0;
  const fundingPrev=bloomberg?.fundingRatePrev||0;
  const delta=globalFlow.deltaUSD||0;
  let regime='RANGE/CHOP';
  let regimeBonus=0;
  let upThreshold=68,downThreshold=32;
  const isHighVol=atrBps>35;
  const retailShorting=funding<0.005,retailLonging=funding>0.015;
  const whalesBuying=delta>500000,whalesSelling=delta<-500000;
  const isCleanUp=drift1m>5&&whalesBuying&&atrBps<30;
  const isCleanDn=drift1m<-5&&whalesSelling&&atrBps<30;
  const fundingAccel=(funding-fundingPrev);
  if(retailShorting&&whalesBuying){regime='SHORT SQUEEZE';regimeBonus=W.regime;upThreshold=60;downThreshold=20;}
  else if(retailLonging&&whalesSelling){regime='LONG SQUEEZE';regimeBonus=-W.regime;upThreshold=80;downThreshold=40;}
  else if(isCleanUp){regime='TRENDING UP';upThreshold=64;downThreshold=25;}
  else if(isCleanDn){regime='TRENDING DOWN';upThreshold=75;downThreshold=36;}
  else if(isHighVol){regime='HIGH VOL CHOP';upThreshold=75;downThreshold=25;reasoning.push(`[REGIME] High vol — strict thresholds`);}
  if(fundingAccel>0.0001)regimeBonus-=5;
  if(fundingAccel<-0.0001)regimeBonus+=5;
  const regimeClamped=Math.max(-W.regime,Math.min(W.regime,regimeBonus));
  rawSignalScores.regime=regimeClamped;
  totalScore+=regimeClamped;

  // Synaptic memory override
  const mem=regimeMemory?regimeMemory[regime]:null;
  if(mem&&(mem.wins+mem.losses)>=3){const wr=mem.wins/(mem.wins+mem.losses);if(wr<0.45){upThreshold+=6;downThreshold-=6;reasoning.push(`[MEMORY] Low WR (${(wr*100).toFixed(0)}%) in ${regime} — tightening`);}else if(wr>0.65){upThreshold-=4;downThreshold+=4;reasoning.push(`[MEMORY] High WR (${(wr*100).toFixed(0)}%) in ${regime} — loosening`);}}

  // Convert to posterior
  const rawPosterior=50+totalScore*0.95;
  let posterior=Math.max(1,Math.min(99,rawPosterior));

  // Reality caps
  if(realGapBps<-40){posterior=Math.min(posterior,18);reasoning.push(`[CAP] Deep underwater — UP capped at 18%`);}
  else if(realGapBps<-18){posterior=Math.min(posterior,42);}
  else if(realGapBps>40){posterior=Math.max(posterior,82);reasoning.push(`[CAP] Deep ITM — UP floored at 82%`);}
  else if(realGapBps>18){posterior=Math.max(posterior,58);}

  // Apply calibration if available (makes % accurate to actual historical win rate)
  const calibratedPosterior=calibration?calibratePosterior(posterior,calibration):posterior;
  const totalSignalWeight=Object.values(W).reduce((a,b)=>a+b,0)||1;

  reasoning.push(`[ATR] Volatility: ${atrBps.toFixed(1)} bps | Regime: ${regime}${isPostDecay?' | POST-DECAY ⚡':''}`);
  if(calibration&&Object.values(calibration).some(v=>v!=null))reasoning.push(`[CAL] Calibrated posterior applied (${calibratedPosterior.toFixed(1)}% vs raw ${posterior.toFixed(1)}%)`);

  // Rug pull check
  const isRugPull=tickSlope<-5&&aggrFlow<-0.6;

  return{posterior:calibratedPosterior,rawPosterior:posterior,regime,upThreshold,downThreshold,reasoning,atrBps,rsi,bb,vwap,realGapBps,drift1m,drift5m,drift15m,accel,pnlSlope,tickSlope,aggrFlow,isRugPull,isPostDecay,consecutive,volRatio,channel,momentumAlign,rawSignalScores,totalSignalWeight};
};

// ═══════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════
class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e){return{hasError:true,error:e};}
  componentDidCatch(e,i){console.error('Tara crash:',e,i);}
  render(){if(this.state.hasError)return<div className="min-h-screen bg-[#111312] text-rose-500 p-8 font-mono"><h1 className="text-2xl font-bold mb-4">Tara Engine Crash</h1><pre className="bg-black p-4 rounded text-xs mb-4 whitespace-pre-wrap border border-rose-500/30">{this.state.error?.toString()}</pre><button onClick={()=>{try{localStorage.clear();}catch(e){}window.location.reload();}} className="px-4 py-2 bg-rose-500 text-white rounded font-bold">Reset & Reload</button></div>;return this.props.children;}
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
function TaraApp(){
  const[isMounted,setIsMounted]=useState(false);
  const[showCandles,setShowCandles]=useState(true);
  const[showOverlays,setShowOverlays]=useState(true);
  const[showWhaleAlerts,setShowWhaleAlerts]=useState(true);
  const[showRugPullAlerts,setShowRugPullAlerts]=useState(true);
  const[showSettings,setShowSettings]=useState(false);
  const[discordWebhook,setDiscordWebhook]=useState('');
  const[useLocalTime,setUseLocalTime]=useState(true);
  const[mobileTab,setMobileTab]=useState('signal'); // signal | chart | logs
  const[currentPrice,setCurrentPrice]=useState(null);
  const[tickDirection,setTickDirection]=useState(null);
  const currentPriceRef=useRef(null);
  const tickHistoryRef=useRef([]);
  const priceMemoryRef=useRef([]);
  const lastPriceSourceRef=useRef({source:'none',time:0});
  const[history,setHistory]=useState([]);
  const[orderBook,setOrderBook]=useState({localBuy:0,localSell:0,imbalance:1});
  const[liquidations,setLiquidations]=useState([]);
  const[newsEvents,setNewsEvents]=useState([]);
  const[targetMargin,setTargetMargin]=useState(0);
  const hasSetInitialMargin=useRef(false);
  // Auto-strike: tracks the window's opening price, fetched at each new window
  const windowOpenPriceRef=useRef(0);
  // When user manually edits strike, this is true — we skip auto-set until next window
  const isManualStrikeRef=useRef(false);
  const[strikeMode,setStrikeMode]=useState('auto'); // 'auto' | 'manual'
  const[betAmount,setBetAmount]=useState(0);
  const[maxPayout,setMaxPayout]=useState(0);
  const[currentOffer,setCurrentOffer]=useState('');
  const[windowType,setWindowType]=useState('15m');
  const[chartRes,setChartRes]=useState('1m');
  const[timeState,setTimeState]=useState({currentTime:'',startWindow:'',nextWindow:'',minsRemaining:0,secsRemaining:0,currentHour:0});
  const[isLoading,setIsLoading]=useState(true);
  // ── COMMITTED LOCK STATE MACHINE ──
  // These refs form an immutable lock per window. Once locked, only reality caps can unlock.
  const taraAdviceRef=useRef('SEARCHING...');
  const lockedCallRef=useRef(null);        // null | {dir:'UP'|'DOWN', lockedAt:timestamp, lockedPosterior:number, lockedRegime:string, lockPrice:number}
  const posteriorHistoryRef=useRef([]);    // rolling 10-sample history for confirming lock
  const biasCountRef=useRef({UP:0,DOWN:0}); // consecutive samples in same direction before lock
  const peakOfferRef=useRef(0);
  const hasReversedRef=useRef(false);
  // Tracks whether user manually closed the trade this window (prevents double-scoring at rollover)
  // Values: null=no trade, 'WIN'=user cashed out profit, 'LOSS'=user cut losses
  const manuallyClosedRef=useRef(null);
  const[positionEntry,setPositionEntry]=useState(null);
  const[activeProjectionTab,setActiveProjectionTab]=useState('5m');
  const[scorecards,setScorecards]=useState({'15m':{wins:159,losses:111},'5m':{wins:10,losses:7}});
  const[regimeMemory,setRegimeMemory]=useState({'TRENDING UP':{wins:0,losses:0},'TRENDING DOWN':{wins:0,losses:0},'HIGH VOL CHOP':{wins:0,losses:0},'SHORT SQUEEZE':{wins:0,losses:0},'LONG SQUEEZE':{wins:0,losses:0},'RANGE/CHOP':{wins:0,losses:0}});
  const lastRegimeRef=useRef('RANGE/CHOP');
  // ── TARA SELF-TRAINING STATE ──
  const[adaptiveWeights,setAdaptiveWeights]=useState(()=>loadWeights());
  const[tradeLog,setTradeLog]=useState(()=>loadTradeLog());
  const tradeLogRef=useRef([]);
  tradeLogRef.current=tradeLog;
  const pendingTradeRef=useRef(null);
  const[showAnalytics,setShowAnalytics]=useState(false);
  const[showGuide,setShowGuide]=useState(false);
  const calibration=useMemo(()=>buildCalibration(tradeLog),[tradeLog]);
  const signalAccuracy=useMemo(()=>buildSignalAccuracy(tradeLog),[tradeLog]);
  const sessionPerf=useMemo(()=>buildSessionPerf(tradeLog),[tradeLog]);
  const hourlyPerf=useMemo(()=>buildHourlyPerf(tradeLog),[tradeLog]);
  const[manualAction,setManualAction]=useState(null);
  const[forceRender,setForceRender]=useState(0);
  const[isChatOpen,setIsChatOpen]=useState(false);
  const[chatLog,setChatLog]=useState([{role:'tara',text:'Tara V101 online — Canvas Chart + Weighted Signal Engine + Smart Advisor active.'}]);
  const[chatInput,setChatInput]=useState('');
  const lastWindowRef=useRef('');
  const[userPosition,setUserPosition]=useState(null);
  const[showHelp,setShowHelp]=useState(false);
  const[soundEnabled,setSoundEnabled]=useState(false);
  const[showWhaleLog,setShowWhaleLog]=useState(false);
  const velocityRef=useVelocity(tickHistoryRef,currentPrice,targetMargin);
  const bloomberg=useBloomberg();
  const{tapeRef,globalFlow,ticksRef,whaleLog}=useGlobalTape();
  const marketSessions=useMemo(()=>getMarketSessions(),[timeState.currentHour]);
  const[klines,setKlines]=useState([]);

  useEffect(()=>{setIsMounted(true);try{const s=localStorage.getItem('taraV100Score');if(s){const p=JSON.parse(s);if(p?.['15m']?.wins!=null)setScorecards(p);}const m=localStorage.getItem('taraV100Mem');if(m)setRegimeMemory(JSON.parse(m));const w=localStorage.getItem('taraV100Hook');if(w)setDiscordWebhook(w);const tz=localStorage.getItem('taraV100TZ');if(tz!=null)setUseLocalTime(tz==='true');}catch(e){};},[]);
  useEffect(()=>{if(!isMounted)return;try{localStorage.setItem('taraV100Score',JSON.stringify(scorecards));localStorage.setItem('taraV100Mem',JSON.stringify(regimeMemory));localStorage.setItem('taraV100Hook',discordWebhook);localStorage.setItem('taraV100TZ',String(useLocalTime));}catch(e){};},[scorecards,regimeMemory,discordWebhook,useLocalTime,isMounted]);

  useEffect(()=>{if(!currentPrice)return;const iv=setInterval(()=>{priceMemoryRef.current.push({p:currentPrice,time:Date.now()});priceMemoryRef.current=priceMemoryRef.current.filter(t=>Date.now()-t.time<600000);},2000);return()=>clearInterval(iv);},[currentPrice]);

  // Kline fetch with dual fallback
  useEffect(()=>{
    const fetch_=async()=>{try{const cbMap={'1m':60,'3m':60,'5m':300,'15m':900,'30m':900,'1h':3600};const gran=cbMap[chartRes]||60;const r=await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${gran}`);if(!r.ok)throw new Error('CB fail');const d=await r.json();const f=d.map(c=>({time:c[0],o:parseFloat(c[3]),h:parseFloat(c[2]),l:parseFloat(c[1]),c:parseFloat(c[4]),v:parseFloat(c[5])})).reverse();setKlines(f);}catch(e){try{const r2=await fetch(`https://api.binance.com/api/v3/uiKlines?symbol=BTCUSDT&interval=${chartRes}&limit=200`);const d2=await r2.json();setKlines(d2.map(d=>({time:d[0]/1000,o:parseFloat(d[1]),h:parseFloat(d[2]),l:parseFloat(d[3]),c:parseFloat(d[4]),v:parseFloat(d[5])})));}catch(e2){console.warn('All chart APIs blocked');}}};
    fetch_();const iv=setInterval(fetch_,10000);return()=>clearInterval(iv);
  },[chartRes]);

  // Live price
  useEffect(()=>{let last=0;const f=async()=>{try{const r=await fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker');if(!r.ok)return;const d=await r.json();if(d.price){const p=parseFloat(d.price),now=Date.now();currentPriceRef.current=p;lastPriceSourceRef.current={source:'rest',time:now};if(now-last>300){setCurrentPrice(prev=>{if(prev!==null&&p!==prev)setTickDirection(p>prev?'up':'down');return p;});last=now;}tickHistoryRef.current.push({p,s:parseFloat(d.size||0.1),t:'B',time:Date.now(),ex:'CB'});}}catch(e){}};f();const iv=setInterval(f,1500);return()=>clearInterval(iv);},[]);

  // Heavy data
  useEffect(()=>{const f=async()=>{try{const gran=windowType==='15m'?900:300;const r=await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${gran}`);if(r.ok){const d=await r.json();if(Array.isArray(d))setHistory(d.slice(0,60).map(c=>({time:c[0],l:parseFloat(c[1]),h:parseFloat(c[2]),o:parseFloat(c[3]),c:parseFloat(c[4]),v:parseFloat(c[5])})));}const r2=await fetch('https://api.exchange.coinbase.com/products/BTC-USD/book?level=2');if(r2.ok){const d2=await r2.json();if(d2?.bids&&d2?.asks){let lb=0,ls=0;d2.bids.forEach(([p,s])=>{if(p<=targetMargin&&p>=targetMargin-150)lb+=parseFloat(s);});d2.asks.forEach(([p,s])=>{if(p>=targetMargin&&p<=targetMargin+150)ls+=parseFloat(s);});setOrderBook({localBuy:lb,localSell:ls,imbalance:ls===0?1:lb/ls});}}setIsLoading(false);}catch(e){setIsLoading(false);}};f();const iv=setInterval(f,5000);return()=>clearInterval(iv);},[targetMargin,windowType]);

  // ── AUTO-STRIKE: fetch the window's opening candle price ──
  const fetchWindowOpenPrice=useCallback(async(wType)=>{
    try{
      const gran=wType==='15m'?900:300;
      // Get the most recent completed + current candle
      const r=await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${gran}&limit=2`);
      if(!r.ok)throw new Error('CB fail');
      const d=await r.json();
      // d[0] = most recent candle [time, low, high, open, close, volume]
      // Its OPEN price is the price at the start of the current window
      const openPrice=parseFloat(d[0]?.[3])||0;
      if(openPrice>0){
        windowOpenPriceRef.current=openPrice;
        if(!isManualStrikeRef.current){
          setTargetMargin(openPrice);
          setStrikeMode('auto');
        }
      }
    }catch(e){
      // Fallback: use current price if API fails
      if(!hasSetInitialMargin.current&&currentPrice){
        windowOpenPriceRef.current=currentPrice;
        if(!isManualStrikeRef.current)setTargetMargin(currentPrice);
      }
    }
    hasSetInitialMargin.current=true;
  },[currentPrice]);

  // Fetch window open price on mount and when window type changes
  useEffect(()=>{fetchWindowOpenPrice(windowType);},[windowType]);
  useEffect(()=>{if(!hasSetInitialMargin.current&&currentPrice){fetchWindowOpenPrice(windowType);}},[currentPrice]);

  const liveHistory=useMemo(()=>{if(history.length===0||!currentPrice)return history;const u=[...history];u[0]={...u[0],c:currentPrice,h:Math.max(u[0].h||currentPrice,currentPrice),l:Math.min(u[0].l||currentPrice,currentPrice)};return u;},[history,currentPrice]);

  // Chart data: prefer klines, fallback to liveHistory
  const chartData=useMemo(()=>klines.length>0?klines:liveHistory,[klines,liveHistory]);

  // Time
  useEffect(()=>{const u=()=>{const now=new Date();const ms=now.getTime();const iMs=(windowType==='15m'?15:5)*60*1000;const nMs=Math.ceil((ms+500)/iMs)*iMs;const nW=new Date(nMs);const sW=new Date(nMs-iMs);const diff=nW.getTime()-now.getTime();const tz=useLocalTime?undefined:{timeZone:'America/New_York'};let ct,sw,nw;try{ct=now.toLocaleTimeString('en-US',{...tz,hour12:true,hour:'2-digit',minute:'2-digit',second:'2-digit'});sw=sW.toLocaleTimeString('en-US',{...tz,hour12:true,hour:'2-digit',minute:'2-digit'});nw=nW.toLocaleTimeString('en-US',{...tz,hour12:true,hour:'2-digit',minute:'2-digit'});}catch(e){ct=now.toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit',second:'2-digit'});sw=sW.toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit'});nw=nW.toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit'});}setTimeState({currentTime:String(ct),startWindow:String(sw),nextWindow:String(nw),minsRemaining:Math.floor(diff/60000),secsRemaining:Math.floor((diff%60000)/1000),currentHour:now.getHours()});};u();const t=setInterval(u,1000);return()=>clearInterval(t);},[windowType,useLocalTime]);

  // Position status
  const positionStatus=useMemo(()=>{if(!positionEntry||!currentPrice)return null;const{price:entry,side}=positionEntry;const pnlPct=side==='UP'?((currentPrice-entry)/entry)*100:((entry-currentPrice)/entry)*100;return{entry,side,pnlPct,isStopHit:pnlPct<=-30};},[positionEntry,currentPrice,betAmount]);

  const updateScore=(type,wl,amt)=>setScorecards(prev=>({...prev,[type]:{...prev[type],[wl]:Math.max(0,(Number(prev[type]?.[wl])||0)+amt)}}));

  const broadcastToDiscord=async(type,data)=>{if(!discordWebhook||!discordWebhook.startsWith('http'))return;try{let embed={};if(type==='SIGNAL')embed={title:`${data.dir==='UP'?'🟢':'🔴'} TARA V101 SIGNAL: ${data.dir}`,color:data.dir==='UP'?3404125:16478549,fields:[{name:'BTC Price',value:`$${data.price.toFixed(2)}`,inline:true},{name:'Strike',value:`$${data.strike.toFixed(2)}`,inline:true},{name:'Gap',value:`${data.gap.toFixed(2)} bps`,inline:true},{name:'Clock',value:data.clock,inline:true}],timestamp:new Date().toISOString()};else if(type==='LOCK')embed={title:`TARA V101 — ${data.dir} LOCKED`,color:data.dir==='UP'?3404125:16478549,description:`**BTC:** $${data.price.toFixed(2)} | **Strike:** $${data.strike.toFixed(2)}\n**Gap:** ${data.gap.toFixed(2)} bps | **Clock:** ${data.clock}`,timestamp:new Date().toISOString()};else if(type==='CLOSE')embed={title:`TARA V101 ROUND CLOSED: ${data.window}`,color:data.won?3404125:16478549,description:`**Result:** ${data.won?'WIN ✅':'LOSS ❌'}\n**Closing:** $${data.price.toFixed(2)}\n**Regime:** ${data.regime}`,timestamp:new Date().toISOString()};await fetch(discordWebhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'Tara Terminal V101',embeds:[embed]})});}catch(e){}};

  // Window rollover
  useEffect(()=>{if(timeState.nextWindow&&timeState.nextWindow!==lastWindowRef.current){if(currentPrice!==null){if(lastWindowRef.current!==''){const pc=taraAdviceRef.current;let won=false,active=false;
          // ── SCORING: only auto-score if user did NOT manually close this window ──
          if(manuallyClosedRef.current!==null){
            // User already settled — use their recorded result
            won=manuallyClosedRef.current==='WIN';
            active=true;
          } else if(pc.includes('UP-LOCK')||pc.includes('UP - LOCK')){
            active=true;
            if(currentPrice>targetMargin){won=true;updateScore(windowType,'wins',1);}
            else updateScore(windowType,'losses',1);
          } else if(pc.includes('DOWN-LOCK')||pc.includes('DOWN - LOCK')){
            active=true;
            if(currentPrice<targetMargin){won=true;updateScore(windowType,'wins',1);}
            else updateScore(windowType,'losses',1);
          }
          if(active){setRegimeMemory(prev=>{const u={...prev};const r=lastRegimeRef.current||'RANGE/CHOP';if(!u[r])u[r]={wins:0,losses:0};if(won)u[r].wins++;else u[r].losses++;return u;});broadcastToDiscord('CLOSE',{window:windowType,won,prediction:pc,regime:lastRegimeRef.current,price:currentPrice});
          // ── TRAINING ENGINE: resolve pending trade + update weights ──
          if(pendingTradeRef.current&&pendingTradeRef.current.result===null){
            const result=won?'WIN':'LOSS';
            const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin};
            const newLog=[...tradeLogRef.current,resolvedTrade];
            saveTradeLog(newLog);setTradeLog(newLog);
            const newWeights=updateWeights(adaptiveWeights,newLog,result);
            setAdaptiveWeights(newWeights);
            pendingTradeRef.current=null;
          }
        }}
        // ── AUTO-STRIKE: fetch new window's opening price, reset manual flag ──
        isManualStrikeRef.current=false;
        setStrikeMode('auto');
        fetchWindowOpenPrice(windowType);
        // Fallback set while fetch is in-flight
        if(!isManualStrikeRef.current)setTargetMargin(currentPrice);
        taraAdviceRef.current='SEARCHING...';lockedCallRef.current=null;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};hasReversedRef.current=false;manuallyClosedRef.current=null;setUserPosition(null);setPositionEntry(null);lastWindowRef.current=timeState.nextWindow;setManualAction(null);tickHistoryRef.current=[];setCurrentOffer('');setBetAmount(0);setMaxPayout(0);peakOfferRef.current=0;hasSetInitialMargin.current=true;}}},[timeState.nextWindow,currentPrice,windowType,targetMargin,adaptiveWeights]);

  useEffect(()=>{if(userPosition===null){peakOfferRef.current=0;}else{const o=parseFloat(currentOffer)||0;if(o>peakOfferRef.current)peakOfferRef.current=o;}},[currentOffer,userPosition]);

  // News
  useEffect(()=>{let news=[];if(orderBook.imbalance>1.5)news.push({title:`Maker Alert: BID wall near $${targetMargin.toFixed(0)}`,type:'info'});if(orderBook.imbalance<0.6)news.push({title:`Maker Alert: ASK pressure defending $${targetMargin.toFixed(0)}`,type:'info'});if(showWhaleAlerts&&whaleLog.length>0){const w=whaleLog[0];news.push({title:`🐋 WHALE: ${w.side} $${(w.usd/1000).toFixed(0)}K on ${w.src}`,type:'whale'});}if(news.length<3)news.push({title:'Engine: V100 Weighted Signal Composite active...',type:'info'});setNewsEvents(news);},[orderBook.imbalance,globalFlow,targetMargin,windowType,showWhaleAlerts,whaleLog]);

  // ── MAIN ANALYSIS ──
  const analysis=useMemo(()=>{
    try{
      if(!currentPrice||liveHistory.length<30||!targetMargin||!isMounted||!velocityRef.current)return null;
      const is15m=windowType==='15m';
      const intervalSeconds=is15m?900:300;
      const clockSeconds=(timeState.minsRemaining*60)+timeState.secsRemaining;
      const timeFraction=Math.max(0,Math.min(1,1-(clockSeconds/intervalSeconds)));
      const isEndgameLock=is15m?(clockSeconds<90):(clockSeconds<45);
      const isCalibrating=(intervalSeconds-clockSeconds)<10;
      const isEarlyWindow=is15m?((intervalSeconds-clockSeconds)<300):((intervalSeconds-clockSeconds)<90);

      // V101 weighted posterior (adaptive)
      const eng=computeV99Posterior({currentPrice,liveHistory,targetMargin,globalFlow,bloomberg,velocityRef,tickHistoryRef,priceMemoryRef,windowType,timeFraction,clockSeconds,is15m,regimeMemory,adaptiveWeights,calibration});
      const{posterior,regime,upThreshold,downThreshold,reasoning,atrBps,realGapBps,drift1m,drift5m,accel,pnlSlope,tickSlope,aggrFlow,isRugPull,isPostDecay,bb}=eng;
      lastRegimeRef.current=regime;

      // ══════════════════════════════════════════════════════
      // COMMITTED LOCK STATE MACHINE (Chamiko/Jerome style)
      // Rules:
      //  1. Only lock after N consecutive aligned samples (no one-tick locks)
      //  2. Once locked, STAY locked for the window — never flip direction
      //  3. Only two unlock conditions: reality cap (gap > 50bps wrong) OR rugpull
      //  4. Endgame (last 90s/45s): freeze whatever state we're in
      // ══════════════════════════════════════════════════════
      const LOCK_THRESHOLD_UP=is15m?70:68;
      const LOCK_THRESHOLD_DN=is15m?30:32;
      const CONSECUTIVE_NEEDED=is15m?3:2; // need N consecutive samples above threshold before locking

      // Add current posterior to history (capped at 12 samples)
      posteriorHistoryRef.current.push(posterior);
      if(posteriorHistoryRef.current.length>12)posteriorHistoryRef.current.shift();

      // Count consecutive bullish/bearish samples from recent history
      const recentHist=posteriorHistoryRef.current.slice(-6);
      const bullCount=recentHist.filter(p=>p>=LOCK_THRESHOLD_UP).length;
      const bearCount=recentHist.filter(p=>p<=LOCK_THRESHOLD_DN).length;

      // ── Phase 1: Pre-lock ──
      if(!lockedCallRef.current){
        if(bullCount>=CONSECUTIVE_NEEDED&&!isEndgameLock){
          lockedCallRef.current={dir:'UP',lockedAt:Date.now(),lockedPosterior:posterior,lockedRegime:regime,lockPrice:currentPrice};
          taraAdviceRef.current='UP - LOCKED';
          biasCountRef.current={UP:0,DOWN:0};
          // Log pending trade for training
          pendingTradeRef.current={id:Date.now(),dir:'UP',posterior,regime,clockAtLock:clockSeconds,hour:new Date().getHours(),session:getMarketSessions().dominant,windowType,signals:eng.rawSignalScores,result:null};
        } else if(bearCount>=CONSECUTIVE_NEEDED&&!isEndgameLock){
          lockedCallRef.current={dir:'DOWN',lockedAt:Date.now(),lockedPosterior:posterior,lockedRegime:regime,lockPrice:currentPrice};
          taraAdviceRef.current='DOWN - LOCKED';
          biasCountRef.current={UP:0,DOWN:0};
          pendingTradeRef.current={id:Date.now(),dir:'DOWN',posterior,regime,clockAtLock:clockSeconds,hour:new Date().getHours(),session:getMarketSessions().dominant,windowType,signals:eng.rawSignalScores,result:null};
        } else {
          const avgRecent=recentHist.reduce((a,b)=>a+b,0)/(recentHist.length||1);
          if(avgRecent>=58&&!isEndgameLock)taraAdviceRef.current='UP (FORMING)';
          else if(avgRecent<=42&&!isEndgameLock)taraAdviceRef.current='DOWN (FORMING)';
          else taraAdviceRef.current='SEARCHING...';
        }
      }

      // ── Phase 2: Post-lock — check only EXTREME unlock conditions ──
      if(lockedCallRef.current){
        const lock=lockedCallRef.current;
        const gapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
        // Unlock only if price has MASSIVELY moved against the locked direction
        const deepWrong=(lock.dir==='UP'&&gapBps<-55)||(lock.dir==='DOWN'&&gapBps>55);
        const catastrophicRugpull=isRugPull&&lock.dir==='UP'&&posterior<10;
        if(deepWrong||catastrophicRugpull){
          // Release lock — window is clearly wrong
          lockedCallRef.current=null;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};
          taraAdviceRef.current='LOCK RELEASED';
          reasoning.push(`[LOCK] Released — extreme adverse gap (${gapBps.toFixed(0)} bps)`);
        } else {
          // Hold the lock regardless of posterior fluctuation
          taraAdviceRef.current=lock.dir==='UP'?'UP - LOCKED':'DOWN - LOCKED';
        }
      }

      // ── Phase 3: Endgame freeze ──
      if(isEndgameLock){
        if(!taraAdviceRef.current.includes('LOCKED')&&taraAdviceRef.current!=='LOCK RELEASED'){
          taraAdviceRef.current='NO CALL'; // too late to lock
        }
      }

      // ── User manual override always wins ──
      let activePrediction=userPosition!==null?(userPosition==='UP'?'UP - LOCKED':'DOWN - LOCKED'):taraAdviceRef.current;
      let textColor='text-zinc-500';
      if(activePrediction.includes('UP - LOCKED'))textColor='text-emerald-400';
      else if(activePrediction.includes('DOWN - LOCKED'))textColor='text-rose-400';
      else if(activePrediction.includes('UP (FORMING)'))textColor='text-emerald-600';
      else if(activePrediction.includes('DOWN (FORMING)'))textColor='text-rose-600';
      else if(activePrediction==='LOCK RELEASED')textColor='text-amber-400';

      const isUP=activePrediction.includes('UP'),isDN=activePrediction.includes('DOWN');
      const currentOdds=(!isUP&&!isDN)?50:(isUP?posterior:(100-posterior));
      const offerVal=parseFloat(currentOffer)||0;
      const liveEstValue=isUP?maxPayout*(posterior/100):(isDN?maxPayout*((100-posterior)/100):0);
      const livePnL=offerVal>0?(offerVal-betAmount):(liveEstValue-betAmount);
      let kellyPct=0;
      if((isUP||isDN)&&betAmount>0&&maxPayout>betAmount){const b=(maxPayout-betAmount)/betAmount;const p=currentOdds/100;const k=((p*b)-(1-p))/b;kellyPct=Math.max(0,(k/2)*100);}

      // V101 Smart Advisor — lock-state-aware
      const advisor=computeAdvisor({userPosition,positionStatus,currentOdds,offerVal,betAmount,maxPayout,clockSeconds,windowType,tickSlope,isRugPull,showRugPullAlerts,hasReversedRef,peakOfferRef,posterior,targetMargin,currentPrice,minsRemaining:timeState.minsRemaining,secsRemaining:timeState.secsRemaining,accel,pnlSlope,atrBps,activePrediction,lockInfo:lockedCallRef.current?{dir:lockedCallRef.current.dir,lockedAt:lockedCallRef.current.lockedAt,lockedPosterior:lockedCallRef.current.lockedPosterior,lockPrice:lockedCallRef.current.lockPrice,lockRegime:lockedCallRef.current.lockedRegime}:null});

      // Projections
      const getHP=(msAgo)=>{const t=Date.now()-msAgo;const m=priceMemoryRef.current;if(!m||m.length===0)return currentPrice;let c=m[0];for(let i=m.length-1;i>=0;i--){if(m[i].time<=t){c=m[i];break;}}return c.p;};
      let trendBps=isNaN(drift1m)?0:drift1m;
      if(isUP&&trendBps<=0)trendBps=2;if(isDN&&trendBps>=0)trendBps=-2;
      const genTimeline=(min,steps)=>{const out=[],iMs=min*60*1000,now=Date.now();let nT=Math.ceil(now/iMs)*iMs;if(nT-now<iMs*0.1)nT+=iMs;const tz=useLocalTime?undefined:{timeZone:'America/New_York'};for(let i=0;i<steps;i++){const sT=nT+(i*iMs);const diff=(sT-now)/60000;const p=currentPrice*(1+(trendBps/10000)*diff);const d=new Date(sT);let ts=`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;try{ts=d.toLocaleTimeString('en-US',{...tz,hour12:true,hour:'numeric',minute:'2-digit'});}catch(e){}out.push({timeStr:ts,timestamp:Math.floor(sT/1000),price:p});}return out;};
      const t5=genTimeline(5,8),t15=genTimeline(15,8),t60=genTimeline(60,8);
      const projections=[{id:'5m',time:'5 MIN',price:t5[0]?.price||currentPrice,conf:Math.min(95,posterior+5),timeline:t5},{id:'15m',time:'15 MIN',price:t15[0]?.price||currentPrice,conf:posterior,timeline:t15},{id:'1h',time:'1 HOUR',price:t60[0]?.price||currentPrice,conf:Math.max(10,posterior-15),timeline:t60}];

      return{confidence:String(isDN?(100-posterior).toFixed(1):posterior.toFixed(1)),prediction:String(activePrediction),textColor:String(textColor),rawProbAbove:Number(posterior),regime:String(regime),reasoning,atrBps:Number(atrBps),realGapBps:Number(realGapBps),clockSeconds:Number(clockSeconds),isSystemLocked:Boolean(isEndgameLock),isPostDecay:Boolean(isPostDecay),isRugPull:Boolean(isRugPull),bb,livePnL:Number(livePnL),liveEstValue:Number(liveEstValue),kellyPct:Number(kellyPct),projections,advisor,currentOdds:Number(currentOdds),aggrFlow:Number(aggrFlow),isEarlyWindow:Boolean(isEarlyWindow),consecutive:eng.consecutive,volRatio:Number(eng.volRatio),
        lockInfo:lockedCallRef.current?{dir:lockedCallRef.current.dir,lockedAt:lockedCallRef.current.lockedAt,lockedPosterior:lockedCallRef.current.lockedPosterior,lockPrice:lockedCallRef.current.lockPrice,lockRegime:lockedCallRef.current.lockedRegime}:null,
        bullCount:Number(bullCount),bearCount:Number(bearCount),consecutiveNeeded:Number(CONSECUTIVE_NEEDED)};
    }catch(err){return{prediction:'ERROR',rawProbAbove:50,projections:[],reasoning:[err.stack||String(err)],textColor:'text-rose-500',advisor:{label:'MATH CRASH',reason:String(err),color:'rose',animate:false,hasAction:false},regime:'ERROR'};}
  },[currentPrice,liveHistory,targetMargin,timeState.minsRemaining,timeState.secsRemaining,timeState.currentHour,orderBook,forceRender,betAmount,maxPayout,currentOffer,globalFlow,userPosition,windowType,isMounted,showRugPullAlerts,positionStatus,velocityRef,bloomberg,useLocalTime,regimeMemory]);

  // ── LOCK BROADCAST EFFECT — fires once when a new lock is committed ──
  const lastBroadcastLockRef=useRef(null);
  useEffect(()=>{
    if(!analysis?.lockInfo)return;
    const lock=analysis.lockInfo;
    if(lastBroadcastLockRef.current===lock.lockedAt)return; // already broadcast this lock
    lastBroadcastLockRef.current=lock.lockedAt;
    const gapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
    broadcastToDiscord('LOCK',{dir:lock.dir,price:lock.lockPrice,strike:targetMargin,gap:gapBps,clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`,regime:lock.lockRegime,posterior:lock.lockedPosterior});
    // Play alert sound on lock
    if(soundEnabled){try{const a=new(window.AudioContext||window.webkitAudioContext)();const o=a.createOscillator();const g=a.createGain();o.type='sine';o.frequency.setValueAtTime(lock.dir==='UP'?587.33:369.99,a.currentTime);g.gain.setValueAtTime(0.08,a.currentTime);g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+0.6);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+0.6);}catch(e){}}
  },[analysis?.lockInfo?.lockedAt]);

  const handleManualSync=(dir)=>{
    if(userPosition!==null&&userPosition!==dir)hasReversedRef.current=true;
    if(userPosition===dir){taraAdviceRef.current='SEARCHING...';setUserPosition(null);setPositionEntry(null);setForceRender(p=>p+1);return;}
    taraAdviceRef.current=String(dir);setUserPosition(String(dir));
    if(currentPrice){setPositionEntry({price:currentPrice,side:dir,time:Date.now()});const gapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;broadcastToDiscord('LOCK',{dir,price:currentPrice,strike:targetMargin,gap:gapBps,clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`});}
    setForceRender(p=>p+1);
  };

  const executeAction=(target)=>{
    if(target==='UP'||target==='DOWN'){handleManualSync(target);return;}
    if(target==='CASH'||target==='SIT OUT'){
      const hasActiveLock=taraAdviceRef.current.includes('LOCKED');
      if(hasActiveLock&&manuallyClosedRef.current===null){
        // ── CORRECT SCORING ──
        // CASH = user took profit = WIN regardless of current price vs strike
        // SIT OUT = user cut losses or stopped out = LOSS
        const result=target==='CASH'?'WIN':'LOSS';
        manuallyClosedRef.current=result; // prevent double-scoring at rollover
        if(result==='WIN')updateScore(windowType,'wins',1);
        else updateScore(windowType,'losses',1);
        // Resolve training trade immediately
        if(pendingTradeRef.current&&pendingTradeRef.current.result===null){
          const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin,earlyExit:true};
          const newLog=[...tradeLogRef.current,resolvedTrade];
          saveTradeLog(newLog);setTradeLog(newLog);
          const newWeights=updateWeights(adaptiveWeights,newLog,result);
          setAdaptiveWeights(newWeights);
          pendingTradeRef.current=null;
        }
      }
      // Clear position state
      setUserPosition(null);setPositionEntry(null);setCurrentOffer('');
      taraAdviceRef.current='CLOSED';
      setForceRender(p=>p+1);
    }
  };

  const handleChatSubmit=(e)=>{if(e.key!=='Enter'||!chatInput.trim())return;const ut=chatInput.trim();const log=[...chatLog,{role:'user',text:ut}];setChatLog(log);setChatInput('');setTimeout(()=>{let r='';const u=ut.toLowerCase();if(u.includes('/broadcast')){const g=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;const dir=analysis?.prediction.includes('UP')?'UP':analysis?.prediction.includes('DOWN')?'DOWN':'SIT OUT';broadcastToDiscord('SIGNAL',{dir,price:currentPrice,strike:targetMargin,gap:g,clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`});r='Signal broadcasted to Discord.';}else if(u.includes('why')||u.includes('explain'))r=`Posterior UP: ${Number(analysis?.rawProbAbove||0).toFixed(1)}%. Regime: ${analysis?.regime}. Signal composite output. Ask 'whale' or 'position'.`;else if(u.includes('whale'))r=whaleLog.length>0?whaleLog.slice(0,8).map(w=>{const d=new Date(w.time);return`${d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})} ${w.src} ${w.side} $${(w.usd/1000).toFixed(0)}K @ $${w.price.toFixed(0)}`;}).join('\n'):'No whale trades yet.';else if(u.includes('position'))r=positionStatus?`${positionStatus.side} @ $${positionStatus.entry.toFixed(2)} | PnL: ${positionStatus.pnlPct>0?'+':''}${positionStatus.pnlPct.toFixed(1)}% | ${positionStatus.isStopHit?'🚨 STOP HIT':'Safe'}`:'No active position.';else if(u.includes('session'))r=`Active: ${marketSessions.sessions.map(s=>`${s.flag} ${s.name}`).join(' + ')} | Dominant: ${marketSessions.dominant}`;else r=`P(UP): ${Number(analysis?.rawProbAbove||0).toFixed(1)}%. Advisor: ${analysis?.advisor?.label||'—'}. Try: why | whale | position | session | /broadcast`;setChatLog([...log,{role:'tara',text:r}]);},400);};

  const handleWindowToggle=(t)=>{if(t===windowType)return;setWindowType(String(t));taraAdviceRef.current='SEARCHING...';lockedCallRef.current=null;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};hasReversedRef.current=false;manuallyClosedRef.current=null;setUserPosition(null);setPositionEntry(null);setManualAction(null);setCurrentOffer('');setBetAmount(0);setMaxPayout(0);lastWindowRef.current='';peakOfferRef.current=0;setForceRender(p=>p+1);};

  if(!isMounted)return<div className="min-h-screen bg-[#111312] flex items-center justify-center text-[#E8E9E4]/50 font-serif text-xl animate-pulse">Initializing Tara V101...</div>;

  const totalDOM=(orderBook.localBuy+orderBook.localSell)||1;
  const buyPct=(orderBook.localBuy/totalDOM)*100;
  const sellPct=(orderBook.localSell/totalDOM)*100;
  const advisor=analysis?.advisor||{label:'CONNECTING...',reason:'Fetching market data...',color:'zinc',animate:false,hasAction:false};
  const advisorColorMap={emerald:'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',rose:'text-rose-400 border-rose-500/40 bg-rose-500/10',amber:'text-amber-400 border-amber-500/40 bg-amber-500/10',zinc:'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'};
  const advisorStyle=advisorColorMap[advisor.color]||advisorColorMap.zinc;

  return(
    <div className="min-h-screen bg-[#111312] text-[#E8E9E4] font-sans flex flex-col selection:bg-[#E8E9E4]/20" style={{fontSize:"16px",lineHeight:"1.5"}}>
      
      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 z-40 bg-[#111312]/95 backdrop-blur-md border-b border-[#E8E9E4]/10 px-3 sm:px-5 py-3 shrink-0">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2">
          
          {/* Logo + price */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <h1 className="text-base sm:text-lg font-serif tracking-tight text-white">Tara</h1>
              <span className="hidden sm:flex items-center gap-1 text-xs font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> V101
              </span>
            </div>
            {/* Live Price — always visible */}
            <div className={`flex items-center gap-1 text-lg sm:text-2xl font-serif font-bold tracking-tight ${tickDirection==='up'?'text-emerald-400':tickDirection==='down'?'text-rose-400':'text-white'}`}>
              <IC.Zap className={`w-4 h-4 shrink-0 ${tickDirection==='up'?'text-emerald-400':tickDirection==='down'?'text-rose-400':'text-[#E8E9E4]/40'}`}/>
              ${currentPrice?currentPrice.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'---'}
            </div>
            {/* Market sessions */}
            <div className="hidden md:flex items-center gap-1 text-xs">{marketSessions.sessions.map((s,i)=><span key={i} className={`${s.color} opacity-80`}>{s.flag}</span>)}</div>
          </div>

          {/* Window toggle */}
          <div className="flex bg-[#181A19] border border-[#E8E9E4]/20 rounded-lg p-0.5 shrink-0">
            <button onClick={()=>handleWindowToggle('5m')} className={`px-4 sm:px-6 py-1 text-xs uppercase font-bold tracking-wide rounded-md transition-all ${windowType==='5m'?'bg-indigo-500 text-white shadow-md':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>5m</button>
            <button onClick={()=>handleWindowToggle('15m')} className={`px-4 sm:px-6 py-1 text-xs uppercase font-bold tracking-wide rounded-md transition-all ${windowType==='15m'?'bg-emerald-500 text-white shadow-md':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>15m</button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden lg:flex flex-col items-end cursor-pointer" onClick={()=>setUseLocalTime(!useLocalTime)}>
              <span className="text-xs text-[#E8E9E4]/40 uppercase">{useLocalTime?'LOCAL':'EST'}</span>
              <span className="text-sm font-mono text-[#E8E9E4]/80">{timeState.currentTime||'--:--:--'}</span>
            </div>
            <button onClick={()=>setShowWhaleLog(!showWhaleLog)} className={`p-2 rounded-lg border text-xs transition-colors ${showWhaleLog?'bg-purple-500/20 border-purple-500/40 text-purple-400':'border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-purple-400'}`}>🐋</button>
            <button onClick={()=>setSoundEnabled(!soundEnabled)} className={`p-2 rounded-lg border transition-colors ${soundEnabled?'bg-indigo-500/20 border-indigo-500/40 text-indigo-400':'border-[#E8E9E4]/10 text-[#E8E9E4]/40'}`}>{soundEnabled?<IC.Vol2 className="w-4 h-4"/>:<IC.VolX className="w-4 h-4"/>}</button>
            <button onClick={()=>setShowSettings(true)} className="p-2 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-indigo-400 transition-colors hidden sm:block"><IC.Link className="w-4 h-4"/></button>
            <button onClick={()=>setShowAnalytics(true)} className="p-2 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-indigo-400 transition-colors" title="Training Analytics"><IC.BarChart className="w-4 h-4"/></button>
            <button onClick={()=>setShowGuide(true)} className="p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors" title="How Tara Works">?</button>
            <button onClick={()=>setShowHelp(true)} className="p-2 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-white transition-colors"><IC.Help className="w-4 h-4"/></button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col gap-4 min-h-0">
        
        {/* STATS BAR */}
        <div className="bg-[#181A19] rounded-xl border border-[#E8E9E4]/10 shadow-md relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-70"></div>
          <div className="p-3 sm:p-4 flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-3">
            
            {/* Strike */}
            {/* Strike — auto or manual */}
            <div className="flex flex-col min-w-[110px] sm:min-w-[140px]">
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="text-xs text-[#E8E9E4]/40 uppercase tracking-wide">Strike</div>
                <span
                  onClick={()=>{isManualStrikeRef.current=false;setStrikeMode('auto');if(windowOpenPriceRef.current>0)setTargetMargin(windowOpenPriceRef.current);}}
                  title={strikeMode==='auto'?'Auto-tracking window open — click to reset':'Manual override — click to restore auto'}
                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer select-none font-bold transition-colors ${strikeMode==='auto'?'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30':'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-emerald-500/15 hover:text-emerald-400'}`}
                >{strikeMode==='auto'?'AUTO':'MANUAL'}</span>
              </div>
              <div className="flex items-center gap-1">
                <IC.Crosshair className="w-4 h-4 text-indigo-400 hidden sm:block"/>
                <input type="number"
                  value={targetMargin===0?'':\`${targetMargin}\`}
                  onChange={e=>{const v=Number(e.target.value);setTargetMargin(v);isManualStrikeRef.current=true;setStrikeMode('manual');}}
                  className="bg-transparent text-white font-serif text-base sm:text-lg w-full focus:outline-none border-b border-[#E8E9E4]/10 focus:border-indigo-400"
                  placeholder="Auto-set"
                />
              </div>
            </div>
            <div className="w-px h-8 bg-[#E8E9E4]/10 hidden sm:block"></div>

            {/* Bet/Win */}
            <div className="flex flex-col min-w-[120px] sm:min-w-[140px]">
              <div className="text-xs text-[#E8E9E4]/40 uppercase tracking-wide mb-1">Bet / Max Win</div>
              <div className="flex items-center gap-1 text-sm sm:text-base font-serif">
                $<input type="number" value={betAmount===0?'':betAmount} onChange={e=>setBetAmount(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-16 text-center outline-none text-white"/>
                <span className="text-[#E8E9E4]/30">/</span>
                $<input type="number" value={maxPayout===0?'':maxPayout} onChange={e=>setMaxPayout(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-16 text-center outline-none text-white"/>
              </div>
            </div>
            <div className="w-px h-8 bg-[#E8E9E4]/10 hidden sm:block"></div>

            {/* Live Offer */}
            <div className="flex flex-col min-w-[90px]">
              <div className="text-xs text-emerald-400/80 uppercase tracking-wide mb-1">Live Offer</div>
              <div className="flex items-center gap-1 text-emerald-400 text-sm sm:text-base font-serif">
                $<input type="number" value={currentOffer} onChange={e=>setCurrentOffer(e.target.value)} placeholder="0.00" className="bg-transparent border-b border-emerald-500/30 focus:border-emerald-400 w-20 text-center outline-none placeholder-emerald-900"/>
              </div>
            </div>
            <div className="w-px h-8 bg-[#E8E9E4]/10 hidden lg:block ml-auto"></div>

            {/* Position / Score */}
            <div className="ml-auto lg:ml-0 flex flex-col min-w-[160px]">
              {positionStatus?(
                <div className="bg-[#111312] border border-amber-500/20 rounded-lg p-1.5">
                  <div className="flex justify-between text-xs mb-1"><span className="text-[#E8E9E4]/40 uppercase">POSITION</span><span className={positionStatus.side==='UP'?'text-emerald-400 font-bold':'text-rose-400 font-bold'}>{positionStatus.side} @ ${(positionStatus.entry||0).toFixed(0)}</span></div>
                  <div className="flex justify-between items-center">
                    <span className={`text-lg font-serif font-bold ${positionStatus.pnlPct>0?'text-emerald-400':'text-rose-400'}`}>{positionStatus.pnlPct>0?'+':''}{positionStatus.pnlPct.toFixed(1)}%</span>
                    <span className={`text-xs font-bold uppercase ${positionStatus.isStopHit?'text-rose-500 animate-pulse':'text-[#E8E9E4]/30'}`}>{positionStatus.isStopHit?'STOP HIT':'SAFE'}</span>
                  </div>
                </div>
              ):(
                <div>
                  <div className="text-xs text-[#E8E9E4]/40 uppercase tracking-wide mb-1 flex items-center gap-1"><IC.Terminal className="w-4 h-4"/> {windowType.toUpperCase()} SCORE</div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center"><div className="flex items-center gap-1 text-xs text-emerald-400"><button onClick={()=>updateScore(windowType,'wins',-1)} className="hover:bg-emerald-500/20 rounded px-0.5">-</button>W<button onClick={()=>updateScore(windowType,'wins',1)} className="hover:bg-emerald-500/20 rounded px-0.5">+</button></div><span className="text-3xl font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins||0)}</span></div>
                    <div className="h-6 w-px bg-[#E8E9E4]/10"></div>
                    <div className="flex flex-col items-center"><div className="flex items-center gap-1 text-xs text-rose-400"><button onClick={()=>updateScore(windowType,'losses',-1)} className="hover:bg-rose-500/20 rounded px-0.5">-</button>L<button onClick={()=>updateScore(windowType,'losses',1)} className="hover:bg-rose-500/20 rounded px-0.5">+</button></div><span className="text-3xl font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses||0)}</span></div>
                    <div className="text-xs text-[#E8E9E4]/30">{(Number(scorecards[windowType]?.wins||0)/(Math.max(1,Number(scorecards[windowType]?.wins||0)+Number(scorecards[windowType]?.losses||0)))*100).toFixed(0)}%</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DOM bar */}
          <div className="px-3 pb-2 hidden sm:block">
            <div className="flex justify-between text-xs text-[#E8E9E4]/30 uppercase tracking-wide mb-1"><span>Depth of Market</span><span>{buyPct.toFixed(0)}% BID / {sellPct.toFixed(0)}% ASK</span></div>
            <div className="w-full h-1 bg-[#111312] rounded-full overflow-hidden flex">
              <div style={{width:`${buyPct}%`}} className="h-full bg-emerald-500/70 transition-all duration-300"></div>
              <div style={{width:`${sellPct}%`}} className="h-full bg-rose-500/70 transition-all duration-300"></div>
            </div>
          </div>
        </div>

        {/* MOBILE TAB NAV */}
        <div className="flex lg:hidden bg-[#181A19] border border-[#E8E9E4]/10 rounded-xl p-1 gap-1">
          {[{id:'signal',label:'Signal',icon:<IC.Zap className="w-4 h-4"/>},{id:'chart',label:'Chart',icon:<IC.Activity className="w-4 h-4"/>},{id:'logs',label:'Analytics',icon:<IC.BarChart className="w-4 h-4"/>}].map(tab=>(
            <button key={tab.id} onClick={()=>setMobileTab(tab.id)} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${mobileTab===tab.id?'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/70'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── MIDDLE ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
          
          {/* ── PREDICTION CARD ── */}
          <div className={`bg-[#181A19] p-4 sm:p-5 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col relative ${mobileTab!=='signal'?'hidden lg:flex':''}`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-30 rounded-t-xl"></div>
            
            {/* Clock + Force Exit */}
            <div className="flex justify-between items-center mb-3 shrink-0">
              <div onClick={()=>setUseLocalTime(!useLocalTime)} className="flex items-center gap-1.5 bg-[#111312] border border-[#E8E9E4]/10 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer hover:border-indigo-500/30 transition-colors">
                <IC.Clock className="w-4 h-4"/>
                <span className="text-[#E8E9E4]/60 hidden sm:inline">{timeState.startWindow}–{timeState.nextWindow} {useLocalTime?'LOCAL':'EST'}</span>
                <span className="text-white font-bold text-sm">{timeState.minsRemaining}m {timeState.secsRemaining}s</span>
                {analysis?.isPostDecay&&<span className="text-amber-400">⚡</span>}
              </div>
              <button onClick={()=>{
                // Force exit: score based on whether offer > bet (profit) or position in loss
                if(userPosition&&manuallyClosedRef.current===null&&taraAdviceRef.current.includes('LOCKED')){
                  const offerVal=parseFloat(currentOffer)||0;
                  const inProfit=offerVal>betAmount||(positionStatus&&positionStatus.pnlPct>0);
                  const result=inProfit?'WIN':'LOSS';
                  manuallyClosedRef.current=result;
                  if(result==='WIN')updateScore(windowType,'wins',1);else updateScore(windowType,'losses',1);
                  if(pendingTradeRef.current&&pendingTradeRef.current.result===null){
                    const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin,forceExit:true};
                    const newLog=[...tradeLogRef.current,resolvedTrade];saveTradeLog(newLog);setTradeLog(newLog);
                    const newW=updateWeights(adaptiveWeights,newLog,result);setAdaptiveWeights(newW);pendingTradeRef.current=null;
                  }
                }
                setUserPosition(null);setPositionEntry(null);taraAdviceRef.current='CLOSED';setForceRender(p=>p+1);
              }} className="bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-colors">
                <IC.Alert className="w-4 h-4"/>Force Exit
              </button>
            </div>

            {isLoading||!analysis?(
              <div className="flex-1 flex items-center justify-center text-[#E8E9E4]/30 font-serif animate-pulse">Connecting...</div>
            ):(
              <div className="flex flex-col flex-1 gap-3">
                {/* Prediction */}
                <div className="flex flex-col items-center text-center pt-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
                    <span className="text-xs text-[#E8E9E4]/40 uppercase tracking-[0.2em] font-bold">Prediction</span>
                    {analysis.regime&&<span className="text-xs text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded text-xs">{analysis.regime}</span>}
                    {/* Lock badge */}
                    {analysis.lockInfo&&<span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1">🔒 LOCKED {Math.floor((Date.now()-analysis.lockInfo.lockedAt)/1000)}s ago @ {analysis.lockInfo.lockedPosterior.toFixed(0)}%</span>}
                  </div>
                  <h2 className={`prediction-heading text-4xl sm:text-5xl font-serif font-bold leading-none tracking-tight ${analysis.textColor} drop-shadow-lg`}>{analysis.prediction}</h2>
                  
                  {/* Confidence forming progress — show when NOT locked */}
                  {!analysis.lockInfo&&(analysis.prediction.includes('FORMING')||analysis.prediction==='SEARCHING...')&&(
                    <div className="mt-2 w-full px-4">
                      <div className="flex justify-between text-xs text-[#E8E9E4]/30 uppercase mb-1">
                        <span>Confirming signal...</span>
                        <span>{analysis.prediction.includes('UP')?analysis.bullCount:analysis.bearCount}/{analysis.consecutiveNeeded} samples</span>
                      </div>
                      <div className="w-full h-1 bg-[#111312] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${analysis.prediction.includes('UP')?'bg-emerald-500/60':'bg-rose-500/60'}`}
                          style={{width:`${Math.min(100,((analysis.prediction.includes('UP')?analysis.bullCount:analysis.bearCount)/analysis.consecutiveNeeded)*100)}%`}}/>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-indigo-300">UP: {Number(analysis.rawProbAbove||0).toFixed(1)}%</span>
                    <span className="text-[#E8E9E4]/20">|</span>
                    <span className="text-rose-300">DN: {(100-Number(analysis.rawProbAbove||0)).toFixed(1)}%</span>
                    {analysis.kellyPct>0&&<span className="text-amber-400/80">Kelly: {analysis.kellyPct.toFixed(1)}%</span>}
                  </div>
                  {/* Lock price vs current */}
                  {analysis.lockInfo&&currentPrice&&(
                    <div className="text-xs text-[#E8E9E4]/40 mt-1">
                      Locked @ ${analysis.lockInfo.lockPrice.toFixed(0)} → Now ${currentPrice.toFixed(0)}
                      <span className={`ml-2 font-bold ${analysis.lockInfo.dir==='DOWN'?(currentPrice<analysis.lockInfo.lockPrice?'text-emerald-400':'text-rose-400'):(currentPrice>analysis.lockInfo.lockPrice?'text-emerald-400':'text-rose-400')}`}>
                        {analysis.lockInfo.dir==='DOWN'?(currentPrice<analysis.lockInfo.lockPrice?'▼ IN PROFIT':'▲ ADVERSE'):(currentPrice>analysis.lockInfo.lockPrice?'▲ IN PROFIT':'▼ ADVERSE')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sync buttons */}
                <div className="flex flex-col gap-1.5 border-t border-[#E8E9E4]/10 pt-3">
                  <span className="text-xs uppercase tracking-wide text-[#E8E9E4]/30 text-center">-30% Stop Guard Sync</span>
                  <div className="flex gap-2">
                    <button onClick={()=>handleManualSync('UP')} className={`flex-1 py-2 border rounded-lg text-xs uppercase font-bold tracking-wide transition-all ${userPosition==='UP'?'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]':'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'}`}>Entered UP</button>
                    <button onClick={()=>handleManualSync('DOWN')} className={`flex-1 py-2 border rounded-lg text-xs uppercase font-bold tracking-wide transition-all ${userPosition==='DOWN'?'bg-rose-600 text-white border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.4)]':'border-rose-500/30 text-rose-500 hover:bg-rose-500/10'}`}>Entered DOWN</button>
                  </div>
                </div>

                {/* ADVISOR BOX — Enhanced */}
                <div className={`w-full p-4 rounded-xl border-2 transition-all ${advisorStyle} ${advisor.animate?'animate-pulse shadow-lg':''} mt-auto`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <IC.Bell className={`w-3.5 h-3.5 ${advisorStyle.split(' ')[0]}`}/>
                    <span className="text-xs font-bold uppercase tracking-wide text-[#E8E9E4]/70">Tara Advisor</span>
                    {userPosition&&<span className={`ml-auto text-xs uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${userPosition==='UP'?'bg-emerald-500/20 text-emerald-400':'bg-rose-500/20 text-rose-400'}`}>IN TRADE: {userPosition}</span>}
                  </div>
                  <div className={`text-sm sm:text-base font-serif font-bold mb-1 uppercase leading-tight ${advisorStyle.split(' ')[0]}`}>{advisor.label}</div>
                  <p className="text-xs text-[#E8E9E4]/80 leading-snug">{advisor.reason}</p>
                  {advisor.hasAction&&(
                    <button onClick={()=>executeAction(advisor.actionTarget)} className={`w-full mt-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all hover:brightness-125 ${advisorStyle}`}>
                      {advisor.actionLabel||'EXECUTE'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── POSTERIORS + PROJECTIONS ── */}
          <div className={`flex flex-col gap-3 ${mobileTab!=='signal'?'hidden lg:flex':''}`}>
            {/* Posteriors */}
            <div className="flex gap-3">
              <div className="flex-1 bg-[#181A19] p-2.5 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md">
                <div className="text-xs text-[#E8E9E4]/40 font-bold uppercase mb-1">POSTERIOR UP</div>
                <div className="text-3xl sm:text-4xl font-serif text-indigo-300">{analysis?`${Number(analysis.rawProbAbove||0).toFixed(1)}%`:'--%'}</div>
                {analysis?.volRatio>1.5&&<div className="text-xs text-indigo-400/70 mt-0.5">Vol surge: {analysis.volRatio.toFixed(1)}×</div>}
              </div>
              <div className="flex-1 bg-[#181A19] p-2.5 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md">
                <div className="text-xs text-[#E8E9E4]/40 font-bold uppercase mb-1">POSTERIOR DN</div>
                <div className="text-3xl sm:text-4xl font-serif text-rose-300">{analysis?`${(100-Number(analysis.rawProbAbove||0)).toFixed(1)}%`:'--%'}</div>
                {analysis?.bb&&<div className="text-xs text-rose-400/70 mt-0.5">BB %B: {(analysis.bb.pctB*100).toFixed(0)}%</div>}
              </div>
            </div>

            {/* Projections */}
            {analysis&&(
              <div className="bg-[#181A19] p-2 sm:p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-[220px]">
                <h2 className="text-xs sm:text-xs font-bold text-[#E8E9E4]/70 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><IC.TrendUp className="w-3.5 h-3.5 text-purple-400"/>T-Target Projections</h2>
                <div className="flex gap-1.5 mb-2 shrink-0">
                  {(analysis.projections||[]).map((proj,idx)=>(
                    <button key={idx} onClick={()=>setActiveProjectionTab(proj.id)} className={`flex-1 rounded-lg p-1.5 text-center border transition-colors ${activeProjectionTab===proj.id?'bg-indigo-500/20 border-indigo-500/40 text-indigo-300':'bg-[#111312] border-[#E8E9E4]/5 text-[#E8E9E4]/40 hover:bg-[#E8E9E4]/5'}`}>
                      <div className="text-xs font-bold uppercase mb-1">{proj.time}</div>
                      <div className="text-xs font-serif">${Number(proj.price||0).toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                    </button>
                  ))}
                </div>
                <div className="bg-[#111312] rounded-lg border border-[#E8E9E4]/5 p-2 flex-1 overflow-y-auto" style={{scrollbarWidth:'thin'}}>
                  {(analysis.projections||[]).filter(p=>p.id===activeProjectionTab).map(proj=>(
                    <div key={proj.id} className="text-xs text-[#E8E9E4]/70">
                      <div className="flex justify-between items-center mb-1 border-b border-[#E8E9E4]/10 pb-1"><span className="font-bold text-indigo-400">TREND PATH</span><span className="text-[#E8E9E4]/40 bg-[#181A19] px-1.5 py-0.5 rounded">CONF: {proj.conf.toFixed(0)}%</span></div>
                      {(proj.timeline||[]).map((t,i)=>(
                        <div key={i} className="flex justify-between items-center py-1 px-2 rounded hover:bg-[#181A19] transition-colors">
                          <span className="font-mono text-[#E8E9E4]/50">{t.timeStr}</span>
                          <span className="font-serif font-bold text-[#E8E9E4]/90">${t.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── LIVE WIRE + ENGINE LOGS ── */}
          <div className={`flex flex-col gap-3 lg:col-span-1 md:col-span-2 ${mobileTab==='logs'?'flex':mobileTab!=='logs'&&mobileTab!=='signal'?'hidden':'hidden lg:flex'}`}>
            <div className="bg-[#181A19] p-2.5 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col min-h-[100px]">
              <div className="flex items-center gap-1.5 mb-1.5 border-b border-[#E8E9E4]/10 pb-1"><IC.Globe className="w-3.5 h-3.5 text-blue-400"/><h2 className="text-xs font-bold text-[#E8E9E4]/70 uppercase tracking-wide">Live Wire</h2></div>
              <div className="space-y-1 overflow-y-auto flex-1 max-h-32 lg:max-h-none" style={{scrollbarWidth:'thin'}}>
                {newsEvents.map((n,i)=><div key={i} className={`border-l-2 pl-1.5 py-0.5 ${n.type==='whale'?'border-purple-500':n.type==='rugpull'?'border-rose-500':'border-indigo-500/40'}`}><span className={`text-xs leading-tight ${n.type==='whale'?'text-purple-300':n.type==='rugpull'?'text-rose-400 font-bold':'text-[#E8E9E4]/80'}`}>{n.title}</span></div>)}
              </div>
            </div>
            {analysis&&(
              <div className="bg-[#181A19] p-2.5 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-[140px]">
                <div className="flex items-center gap-1.5 mb-1.5 border-b border-[#E8E9E4]/10 pb-1"><IC.Terminal className="w-3.5 h-3.5 text-amber-400"/><h2 className="text-xs font-bold text-[#E8E9E4]/70 uppercase tracking-wide">Engine Logs (V101)</h2></div>
                <div className="space-y-1 overflow-y-auto flex-1 font-mono max-h-48 lg:max-h-none" style={{scrollbarWidth:'thin'}}>
                  {(analysis.reasoning||[]).map((r,i)=>(
                    <div key={i} className={`p-1.5 rounded text-xs flex items-start gap-1 uppercase ${r.includes('CAP')||r.includes('GRAVITY')||r.includes('MEMORY')?'text-rose-400 border border-rose-500/20 bg-rose-500/5':r.includes('ALIGNED')||r.includes('STRUCTURE')?'text-emerald-400 border border-emerald-500/20 bg-emerald-500/5':'text-[#E8E9E4]/60 border border-[#E8E9E4]/5'}`}>
                      <span className="text-emerald-500 shrink-0">›</span><span className="leading-snug">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CHART — TradingView ── */}
        <div className="bg-[#181A19] rounded-xl border border-[#E8E9E4]/10 shadow-lg overflow-hidden" style={{minHeight:'490px'}}>
          <div className="flex justify-between items-center px-3 py-2 border-b border-[#E8E9E4]/10">
            <h2 className="text-xs font-bold text-[#E8E9E4]/70 uppercase tracking-[0.2em] flex items-center gap-2">
              <IC.Activity className="w-4 h-4 text-indigo-400"/>TARA LIVE CHART
              <span className="text-[10px] text-[#E8E9E4]/30 font-normal normal-case tracking-normal">· TradingView · COINBASE:BTCUSD</span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#E8E9E4]/40">
              {analysis?.isRugPull&&showRugPullAlerts&&<span className="text-rose-400 font-bold animate-pulse">🚨 RUG PULL</span>}
            </div>
          </div>
          <div style={{padding:'8px',boxSizing:'border-box'}}>
            <TradingViewChart
              resolution={chartRes}
              onResolutionChange={setChartRes}
              windowType={windowType}
            />
          </div>
        </div>
      </main>

      {/* ── MODALS & FLOATING UI ── */}

      {/* Whale Log */}
      {showWhaleLog&&(
        <div className="fixed top-14 right-2 sm:right-4 z-50 w-72 sm:w-80 bg-[#181A19] border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-[#111312] p-2.5 flex justify-between items-center border-b border-[#E8E9E4]/10"><span className="text-xs font-bold uppercase tracking-wide text-purple-400">🐋 Whale Log (&gt;$25K)</span><button onClick={()=>setShowWhaleLog(false)} className="opacity-50 hover:opacity-100"><IC.X className="w-4 h-4"/></button></div>
          <div className="max-h-72 overflow-y-auto p-2.5 space-y-1.5" style={{scrollbarWidth:'thin'}}>
            {whaleLog.length===0?<div className="text-xs text-[#E8E9E4]/40 italic text-center py-4">Waiting for whale trades...</div>:whaleLog.slice(0,25).map((w,i)=>{const d=new Date(w.time);return(<div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded bg-[#111312] border ${w.side==='BUY'?'border-emerald-500/20':'border-rose-500/20'}`}><span className="text-[#E8E9E4]/30 font-mono shrink-0">{d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span><span className={`font-bold ${w.side==='BUY'?'text-emerald-400':'text-rose-400'}`}>{w.side}</span><span className="text-[#E8E9E4]/70">${(w.usd/1000).toFixed(0)}K</span><span className="text-[#E8E9E4]/30 text-xs ml-auto">{w.src}</span></div>);})}
          </div>
        </div>
      )}

      {/* Settings */}
      {showSettings&&(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-serif text-white flex items-center gap-2"><IC.Link className="w-5 h-5 text-indigo-400"/>Discord Integration</h2><button onClick={()=>setShowSettings(false)} className="text-[#E8E9E4]/50 hover:text-white"><IC.X className="w-5 h-5"/></button></div>
            <p className="text-xs text-[#E8E9E4]/60 mb-4 leading-relaxed">Paste your Discord Webhook URL. Tara V101 will broadcast entry signals, position locks, and round closures.</p>
            <input type="password" value={discordWebhook} onChange={e=>setDiscordWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="w-full bg-[#111312] border border-[#E8E9E4]/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 text-white font-mono mb-4"/>
            <button onClick={()=>setShowSettings(false)} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wide transition-colors">Save</button>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end transition-all ${isChatOpen?'w-[90vw] sm:w-80':'w-auto'}`}>
        {isChatOpen&&(
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 shadow-2xl rounded-xl w-full mb-3 overflow-hidden flex flex-col h-[55vh] sm:h-96">
            <div className="bg-[#111312] p-2.5 flex justify-between items-center border-b border-[#E8E9E4]/10"><span className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><IC.Msg className="w-3.5 h-3.5 text-indigo-400"/>Chat w/ Tara V101</span><button onClick={()=>setIsChatOpen(false)} className="opacity-50 hover:opacity-100"><IC.X className="w-4 h-4"/></button></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#111312]/50" style={{scrollbarWidth:'thin'}}>
              {chatLog.map((msg,i)=>(
                <div key={i} className={`flex flex-col ${msg.role==='user'?'items-end':'items-start'}`}>
                  <span className={`text-xs uppercase opacity-30 mb-1 ${msg.role==='user'?'mr-1':'ml-1'}`}>{msg.role}</span>
                  <div className={`text-xs p-2 rounded-lg max-w-[88%] leading-relaxed whitespace-pre-wrap ${msg.role==='user'?'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-tr-none':'bg-[#2A2D2C] text-[#E8E9E4] border border-[#E8E9E4]/10 rounded-tl-none'}`}>{msg.text}</div>
                </div>
              ))}
            </div>
            <div className="p-2.5 bg-[#111312] border-t border-[#E8E9E4]/10"><input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={handleChatSubmit} placeholder={`Ask about ${windowType} window...`} className="w-full bg-[#181A19] border border-[#E8E9E4]/20 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-white"/></div>
          </div>
        )}
        {!isChatOpen&&<button onClick={()=>setIsChatOpen(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white p-3 rounded-full shadow-lg border border-indigo-400/50 transition-transform hover:scale-105"><IC.Msg className="w-5 h-5"/></button>}
      </div>

      {/* Help */}
      {/* ── ANALYTICS / TRAINING DASHBOARD ── */}
      {showAnalytics&&(
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" style={{scrollbarWidth:'thin'}}>
            <div className="sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-base font-serif text-white flex items-center gap-2"><IC.BarChart className="w-5 h-5 text-indigo-400"/>Tara Training Engine</h2>
                <p className="text-xs text-[#E8E9E4]/40 mt-0.5">{tradeLog.length} trades logged · Weights auto-updating every window</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>{
                  const csv=['id,dir,posterior,regime,clockAtLock,hour,session,windowType,gap,momentum,structure,flow,technical,regime_s,result'].concat(
                    tradeLog.map(t=>`${t.id},${t.dir},${t.posterior?.toFixed(1)},${t.regime},${t.clockAtLock},${t.hour},${t.session},${t.windowType},${t.signals?.gap?.toFixed(2)||0},${t.signals?.momentum?.toFixed(2)||0},${t.signals?.structure?.toFixed(2)||0},${t.signals?.flow?.toFixed(2)||0},${t.signals?.technical?.toFixed(2)||0},${t.signals?.regime?.toFixed(2)||0},${t.result||'PENDING'}`)
                  ).join('\n');
                  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='tara_training_data.csv';a.click();
                }} className="px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-colors">Export CSV</button>
                <button onClick={()=>{if(confirm('Reset all training data and weights? Cannot undo.')){setAdaptiveWeights({...DEFAULT_WEIGHTS});setTradeLog([]);saveWeights({...DEFAULT_WEIGHTS});saveTradeLog([]);pendingTradeRef.current=null;}}} className="px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-colors">Reset</button>
                <button onClick={()=>setShowAnalytics(false)} className="text-[#E8E9E4]/50 hover:text-white"><IC.X className="w-5 h-5"/></button>
              </div>
            </div>
            <div className="p-4 space-y-5">

              {/* Adaptive Weights */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-400 mb-3">Adaptive Signal Weights (auto-tuning)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(adaptiveWeights).map(([key,val])=>{
                    const def=DEFAULT_WEIGHTS[key]||20;const pct=(val/55)*100;
                    const acc=signalAccuracy[key];const wrPct=acc?.total>=3?((acc.right/acc.total)*100).toFixed(0):null;
                    const delta=val-def;
                    return(<div key={key} className="bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold uppercase text-[#E8E9E4]/70">{key}</span>
                        <div className="flex items-center gap-1.5">
                          {wrPct&&<span className="text-xs text-indigo-400/80">{wrPct}% acc</span>}
                          <span className={`text-xs font-mono font-bold ${delta>0?'text-emerald-400':delta<0?'text-rose-400':'text-[#E8E9E4]/50'}`}>{val.toFixed(1)}</span>
                          <span className={`text-xs ${delta>0?'text-emerald-400':delta<0?'text-rose-400':'text-[#E8E9E4]/30'}`}>{delta>0?'+':''}{delta.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#181A19] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${delta>2?'bg-emerald-500':delta<-2?'bg-rose-500':'bg-indigo-500'}`} style={{width:`${Math.min(100,pct)}%`}}/>
                      </div>
                      <div className="flex justify-between mt-0.5 text-xs text-[#E8E9E4]/20">
                        <span>default: {def}</span>
                        <span>{acc?.total||0} samples</span>
                      </div>
                    </div>);
                  })}
                </div>
              </section>

              {/* Calibration */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-amber-400 mb-3">Probability Calibration (posterior accuracy)</h3>
                {tradeLog.filter(t=>t.result).length<10?(
                  <div className="text-xs text-[#E8E9E4]/40 italic text-center py-4 bg-[#111312] rounded-lg border border-[#E8E9E4]/5">Need 10+ resolved trades to calibrate. Currently: {tradeLog.filter(t=>t.result).length}</div>
                ):(
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                    {[0,10,20,30,40,50,60,70,80,90].map(b=>{
                      const calVal=calibration[b];const isNull=calVal==null;
                      const diff=isNull?0:calVal-b;
                      return(<div key={b} className="bg-[#111312] rounded-lg p-1.5 border border-[#E8E9E4]/5 text-center">
                        <div className="text-xs text-[#E8E9E4]/30 mb-1">{b}-{b+10}%</div>
                        <div className={`text-xs font-bold font-mono ${isNull?'text-[#E8E9E4]/20':Math.abs(diff)<5?'text-emerald-400':Math.abs(diff)<15?'text-amber-400':'text-rose-400'}`}>
                          {isNull?'—':`${calVal.toFixed(0)}%`}
                        </div>
                        {!isNull&&<div className={`text-xs ${diff>0?'text-emerald-400':diff<0?'text-rose-400':'text-[#E8E9E4]/30'}`}>{diff>0?'+':''}{diff.toFixed(0)}</div>}
                      </div>);
                    })}
                  </div>
                )}
                <p className="text-xs text-[#E8E9E4]/30 mt-2">Green = well-calibrated. Red = raw posterior is over/underestimating actual win rate. Tara applies calibration automatically after 3+ samples per bucket.</p>
              </section>

              {/* Session Performance */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-400 mb-3">Performance by Session</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(sessionPerf).map(([sess,data])=>{
                    const total=data.wins+data.losses;const wr=total>0?((data.wins/total)*100):0;
                    return(<div key={sess} className="bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5 text-center">
                      <div className="text-xs font-bold text-[#E8E9E4]/70 mb-1">{sess}</div>
                      <div className={`text-lg font-serif font-bold ${wr>=60?'text-emerald-400':wr>=45?'text-amber-400':'text-rose-400'}`}>{total>0?`${wr.toFixed(0)}%`:'—'}</div>
                      <div className="text-xs text-[#E8E9E4]/30">{data.wins}W / {data.losses}L</div>
                    </div>);
                  })}
                </div>
              </section>

              {/* Hourly Heatmap */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-purple-400 mb-3">Performance by Hour (local)</h3>
                {Object.keys(hourlyPerf).length<3?<div className="text-xs text-[#E8E9E4]/40 italic text-center py-4 bg-[#111312] rounded-lg border border-[#E8E9E4]/5">Need more trades to build hourly map.</div>:(
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                  {Array.from({length:24},(_,h)=>{
                    const d=hourlyPerf[h];const total=d?(d.wins+d.losses):0;const wr=total>0?((d.wins/total)*100):null;
                    return(<div key={h} className="rounded p-1 text-center" style={{background:wr==null?'rgba(232,233,228,0.03)':wr>=65?'rgba(52,211,153,0.2)':wr>=45?'rgba(251,191,36,0.15)':'rgba(251,113,133,0.2)'}}>
                      <div className="text-xs text-[#E8E9E4]/30">{h}h</div>
                      <div className={`text-xs font-bold ${wr==null?'text-[#E8E9E4]/20':wr>=65?'text-emerald-400':wr>=45?'text-amber-400':'text-rose-400'}`}>{wr!=null?`${wr.toFixed(0)}%`:'·'}</div>
                    </div>);
                  })}
                </div>)}
              </section>

              {/* Recent Trade Log */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#E8E9E4]/60 mb-3">Recent Trade Log ({tradeLog.length} total)</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto" style={{scrollbarWidth:'thin'}}>
                  {tradeLog.slice(-20).reverse().map((t,i)=>{
                    const d=new Date(t.id);return(
                    <div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded border ${t.result==='WIN'?'border-emerald-500/20 bg-emerald-500/5':t.result==='LOSS'?'border-rose-500/20 bg-rose-500/5':'border-[#E8E9E4]/5'}`}>
                      <span className="text-[#E8E9E4]/30 font-mono shrink-0">{d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
                      <span className={`font-bold ${t.dir==='UP'?'text-emerald-400':'text-rose-400'}`}>{t.dir}</span>
                      <span className="text-[#E8E9E4]/50">{t.posterior?.toFixed(0)}%</span>
                      <span className="text-[#E8E9E4]/30 text-xs">{t.regime}</span>
                      <span className="ml-auto text-xs">{t.clockAtLock}s left</span>
                      <span className={`font-bold text-xs ${t.result==='WIN'?'text-emerald-400':t.result==='LOSS'?'text-rose-400':'text-[#E8E9E4]/30'}`}>{t.result||'PENDING'}</span>
                    </div>);
                  })}
                </div>
              </section>

              {/* Training Tips */}
              <section className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-400 mb-2">How to Train Tara Faster</h3>
                <div className="text-xs text-[#E8E9E4]/60 space-y-1 leading-relaxed">
                  <p>• <strong className="text-indigo-300">Every window auto-updates weights.</strong> The more she trades, the more accurate her signal weights become.</p>
                  <p>• <strong className="text-indigo-300">Export CSV</strong> and run external regression (Python sklearn) on 500+ trades to get optimal weights, then paste them back.</p>
                  <p>• <strong className="text-indigo-300">Best regime to focus on:</strong> Look at session performance — if US session is 70%+ WR, run exclusively during US hours.</p>
                  <p>• <strong className="text-indigo-300">Calibration corrects overconfidence</strong> — if Tara says 80% but only wins 60% of those, calibration fixes the displayed number after 3+ samples.</p>
                  <p>• <strong className="text-indigo-300">To beat Chamiko's 79.5%</strong>: need 100+ trades in the log. At that point weights will have converged and calibration will be reliable.</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ── HOW TARA WORKS GUIDE ── */}
      {showGuide&&(
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl" style={{scrollbarWidth:'thin'}}>
            <div className="sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2">
                  <span className="text-indigo-400 text-xl font-bold">?</span> How Tara V101 Works
                </h2>
                <p className="text-xs text-[#E8E9E4]/40 mt-0.5">Complete guide — predictions, learning, advisor, and best practices</p>
              </div>
              <button onClick={()=>setShowGuide(false)} className="text-[#E8E9E4]/50 hover:text-white p-1"><IC.X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 sm:p-6 space-y-6 text-sm text-[#E8E9E4]/80">

              {/* PREDICTIONS */}
              <section>
                <h3 className="text-indigo-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-indigo-500/20 pb-1">📊 Prediction States — What Each One Means</h3>
                <div className="space-y-3">
                  <div className="bg-[#111312] rounded-lg p-3 border border-[#E8E9E4]/5">
                    <div className="flex items-center gap-2 mb-1"><span className="text-zinc-400 font-bold text-xs">SCANNING...</span><span className="text-[10px] text-[#E8E9E4]/30 uppercase">Do nothing</span></div>
                    <p className="text-xs leading-relaxed text-[#E8E9E4]/60">Tara's composite score is between 42–58% — a coin flip zone. No structural edge exists right now. Do not enter. Most tools show a number at all times to look busy — Tara shows nothing when there's genuinely nothing to show.</p>
                  </div>
                  <div className="bg-[#111312] rounded-lg p-3 border border-amber-500/15">
                    <div className="flex items-center gap-2 mb-1"><span className="text-amber-400 font-bold text-xs">UP (FORMING) / DOWN (FORMING)</span><span className="text-[10px] text-[#E8E9E4]/30 uppercase">Get ready</span></div>
                    <p className="text-xs leading-relaxed text-[#E8E9E4]/60">Posterior has crossed 58%+ or below 42% — there's a lean — but not enough consecutive readings yet to commit. The forming progress bar shows how close she is to locking. You can enter here for more time in the trade, but it's higher risk than waiting for the lock.</p>
                  </div>
                  <div className="bg-[#111312] rounded-lg p-3 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-1"><span className="text-emerald-400 font-bold text-xs">UP — LOCKED 🔒</span><span className="text-[10px] text-[#E8E9E4]/30 uppercase">Entry signal — act now</span></div>
                    <p className="text-xs leading-relaxed text-[#E8E9E4]/60">3 consecutive readings (15m) or 2 consecutive (5m) all above 68% threshold. Tara has committed for the window. She will NOT change this prediction — the posterior can drop to 55% and she stays locked UP. The only releases are a 55+ bps adverse gap or catastrophic rug pull. This is the <strong className="text-white">only state to enter on.</strong></p>
                  </div>
                  <div className="bg-[#111312] rounded-lg p-3 border border-rose-500/20">
                    <div className="flex items-center gap-2 mb-1"><span className="text-rose-400 font-bold text-xs">DOWN — LOCKED 🔒</span><span className="text-[10px] text-[#E8E9E4]/30 uppercase">Entry signal — act now</span></div>
                    <p className="text-xs leading-relaxed text-[#E8E9E4]/60">Same as UP — LOCKED but bearish. Posterior consistently below 32% for N consecutive samples. If you missed the entry window and it's late, the advisor will say WINDOW CLOSING — don't chase it.</p>
                  </div>
                  <div className="bg-[#111312] rounded-lg p-3 border border-zinc-500/15">
                    <div className="flex items-center gap-2 mb-1"><span className="text-zinc-400 font-bold text-xs">NO CALL / WINDOW CLOSED / LOCK RELEASED</span><span className="text-[10px] text-rose-400 uppercase">Sit out</span></div>
                    <p className="text-xs leading-relaxed text-[#E8E9E4]/60"><strong className="text-white">NO CALL:</strong> Never reached threshold before endgame. Skip this round.<br/><strong className="text-white">WINDOW CLOSED:</strong> Last 90s/45s with no lock. Too late to enter safely.<br/><strong className="text-white">LOCK RELEASED:</strong> Price moved 55+ bps wrong direction, Tara released. Respect it immediately.</p>
                  </div>
                </div>
              </section>

              {/* STRIKE PRICE */}
              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-emerald-500/20 pb-1">🎯 Strike Price — Auto vs Manual</h3>
                <div className="bg-[#111312] rounded-lg p-3 border border-[#E8E9E4]/5 space-y-2 text-xs leading-relaxed text-[#E8E9E4]/60">
                  <p>The strike is automatically set to the <strong className="text-white">opening price of each window candle</strong> — fetched directly from Coinbase at the start of every 5m or 15m period. This matches what the binary options platform uses as the strike.</p>
                  <p>The <strong className="text-emerald-400">AUTO</strong> badge means Tara is tracking window opens automatically. Click it to reset to auto after a manual override.</p>
                  <p>Type any price in the Strike input to switch to <strong className="text-amber-400">MANUAL</strong> mode — useful if your platform uses a slightly different strike. Manual mode resets to auto at each new window.</p>
                </div>
              </section>

              {/* SIGNALS */}
              <section>
                <h3 className="text-purple-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-purple-500/20 pb-1">⚙️ How Tara Builds Her Prediction</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    {name:'Gap Gravity (W:35)',desc:'Distance + direction from strike, amplified by time decay. The further in profit with less time remaining, the stronger this signal.'},
                    {name:'Momentum (W:30)',desc:'1m, 5m, 15m drift readings. When all three align in the same direction, the signal gets 1.5× multiplied.'},
                    {name:'Candle Structure (W:15)',desc:'Counts consecutive same-direction candles. 3+ green with volume surge = strong bullish confirmation.'},
                    {name:'Flow Imbalance (W:20)',desc:'Real-time buy/sell delta from Binance Futures + Bybit WebSockets. Whale buying pressure directly boosts UP posterior.'},
                    {name:'Technical (W:25)',desc:'RSI divergence, VWAP position, Bollinger Band squeeze, price channel. Prevents chasing overbought tops.'},
                    {name:'Funding & Regime (W:15)',desc:'Detects SHORT SQUEEZE (retail short + whales buying), LONG SQUEEZE, TRENDING, CHOP. Adjusts thresholds per regime.'},
                  ].map((s,i)=>(
                    <div key={i} className="bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5">
                      <div className="text-indigo-300 font-bold mb-1">{s.name}</div>
                      <div className="text-[#E8E9E4]/50 leading-relaxed">{s.desc}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#E8E9E4]/40 mt-2 leading-relaxed">Weights are not fixed — they adapt automatically after every trade using gradient descent. Signals that contributed to correct predictions grow; signals that contributed to losses shrink.</p>
              </section>

              {/* LEARNING */}
              <section>
                <h3 className="text-amber-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-amber-500/20 pb-1">🧠 How Tara Learns After Every Trade</h3>
                <div className="space-y-2 text-xs leading-relaxed text-[#E8E9E4]/60">
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">1.</span><p><strong className="text-white">Lock logging:</strong> When a lock fires, all 6 raw signal scores + posterior + regime + time + session are saved to a trade log.</p></div>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">2.</span><p><strong className="text-white">Result resolution:</strong> At window close (or manual cashout/cut), WIN or LOSS is attached to the trade record.</p></div>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">3.</span><p><strong className="text-white">Gradient descent:</strong> Signals that contributed correctly get their weight increased. Signals that were misleading get reduced. Learning rate: 0.8.</p></div>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">4.</span><p><strong className="text-white">Calibration:</strong> After 3+ trades per posterior bucket, she corrects overconfidence. If she said 80% but only won 60% of those, the displayed confidence adjusts to reflect reality.</p></div>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">5.</span><p><strong className="text-white">Session & hourly tracking:</strong> Tracks win rates by ASIA/EU/US session and by hour. Check the Training panel (📊 button) to find your best windows.</p></div>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">6.</span><p><strong className="text-white">Convergence:</strong> Weights stabilize meaningfully after ~80–100 trades. Export the CSV from Training panel and run Python logistic regression to get mathematically optimal weights.</p></div>
                </div>
              </section>

              {/* ADVISOR */}
              <section>
                <h3 className="text-rose-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-rose-500/20 pb-1">🔔 Advisor Calls — In-Trade Management</h3>
                <div className="space-y-1.5 text-xs">
                  {[
                    {label:'30% STOP HIT',color:'text-rose-500',desc:'Hard floor. Position down 30% from entry. Exit immediately — no argument.'},
                    {label:'RUG PULL DETECTED',color:'text-rose-500',desc:'Tick slope + flow both collapsing while long. Flash crash in progress. Exit.'},
                    {label:'REVERSE POSITION',color:'text-amber-400',desc:'Win rate below 20%, time remaining. One reversal per window max. If reversal also fails → CUT.'},
                    {label:'TAKE MAX PROFIT',color:'text-emerald-400',desc:'Offer 40%+ above bet AND momentum reversing. Lock in exceptional returns before they vanish.'},
                    {label:'TRAILING STOP HIT',color:'text-emerald-400',desc:'Offer pulled back 12% from its peak. Momentum turned — exit before more slips.'},
                    {label:'SCALP PROFIT',color:'text-emerald-400',desc:'12%+ profit, window under 15% remaining, momentum fading. Take it — time kills you here.'},
                    {label:'CUT LOSSES — NOW',color:'text-rose-400',desc:'Win rate <38% + adverse acceleration. Getting worse faster. Exit preserves capital.'},
                    {label:'HOLD STRONG',color:'text-emerald-400',desc:'Winning + momentum aligned. Do nothing. This is the hardest discipline in trading.'},
                    {label:'RECOVERY IN PROGRESS',color:'text-amber-400',desc:'Losing but momentum just flipped toward you. Give it room — don\'t panic exit at the worst moment.'},
                  ].map((a,i)=>(
                    <div key={i} className="flex gap-3 bg-[#111312] rounded-lg p-2 border border-[#E8E9E4]/5">
                      <span className={`${a.color} font-bold shrink-0 min-w-[140px] text-[10px] uppercase`}>{a.label}</span>
                      <span className="text-[#E8E9E4]/50 text-[11px] leading-snug">{a.desc}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* BEST PRACTICES */}
              <section>
                <h3 className="text-white font-bold uppercase tracking-wide mb-3 text-xs border-b border-[#E8E9E4]/10 pb-1">✅ Best Practices for Maximum Edge</h3>
                <div className="space-y-2 text-xs leading-relaxed text-[#E8E9E4]/60">
                  <p>🔒 <strong className="text-white">Only enter on LOCKED signals.</strong> Skip FORMING, skip SCANNING. The win rate difference between LOCKED and FORMING entries is significant.</p>
                  <p>⏰ <strong className="text-white">Enter immediately when the advisor fires ENTRY SIGNAL.</strong> The lock has been held for N consecutive samples — extra waiting only reduces your time in the trade.</p>
                  <p>📊 <strong className="text-white">Check the Training panel regularly.</strong> If ASIA session shows 40% WR but US shows 72%, only trade during US hours. This alone can dramatically improve your score.</p>
                  <p>💰 <strong className="text-white">Use Kelly criterion.</strong> The % shown under the posteriors is the mathematically optimal fraction of bankroll to risk. If Kelly says 8%, don't bet 40%.</p>
                  <p>✂️ <strong className="text-white">Never fight CUT LOSSES — NOW.</strong> It requires 3 simultaneous bearish signals. When all three fire together, the trade is structurally broken.</p>
                  <p>💎 <strong className="text-white">Always hit SCALP PROFIT near end of window.</strong> This is the most chronically ignored signal and chronically correct. Time decay in the final 90 seconds is ruthless.</p>
                  <p>📈 <strong className="text-white">Sync your position with the Entered UP/DOWN buttons.</strong> This activates the 30% stop guard and gives Tara accurate P&L context for advisor calls.</p>
                  <p>🏦 <strong className="text-white">HIGH VOL CHOP regime = avoid.</strong> Tara raises thresholds in choppy markets but even a LOCKED signal in CHOP has lower reliability. Session timing matters most here.</p>
                </div>
              </section>

              {/* STRIKE + DISCORD */}
              <section>
                <h3 className="text-indigo-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-indigo-500/20 pb-1">🔗 Discord Integration</h3>
                <div className="bg-[#111312] rounded-lg p-3 border border-[#E8E9E4]/5 text-xs leading-relaxed text-[#E8E9E4]/60">
                  <p>Paste your Discord webhook URL in Settings (🔗 button). Tara will auto-broadcast:</p>
                  <ul className="mt-2 space-y-1 list-disc pl-4">
                    <li>Lock commits (with posterior, regime, gap, clock remaining)</li>
                    <li>Round closures (WIN/LOSS, closing price, regime recorded)</li>
                    <li>Manual /broadcast command in chat sends a live signal embed</li>
                  </ul>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {showHelp&&(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" style={{scrollbarWidth:'thin'}}>
            <div className="sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center">
              <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2"><IC.Info className="w-5 h-5 text-indigo-400"/>Tara V101 — What's New</h2>
              <button onClick={()=>setShowHelp(false)} className="text-[#E8E9E4]/50 hover:text-white"><IC.X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 sm:p-6 space-y-5 text-xs sm:text-sm text-[#E8E9E4]/80">
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">V101 Prediction Engine</h3><p className="leading-relaxed">Predictions now use a <strong>6-signal weighted composite</strong> instead of simple addition: (1) Gap Gravity, (2) Momentum Composite with alignment detection, (3) Candle Structure — consecutive candles + volume confirmation, (4) Flow Imbalance, (5) Technical Composite — RSI divergence, VWAP, Bollinger Bands, price channel, (6) Funding Momentum. Signals are weighted by reliability, preventing single-factor dominance.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">Smart Advisor (In-Trade)</h3><p className="leading-relaxed">The advisor now runs a <strong>10-state priority machine</strong> with time-remaining awareness. Every message shows how many minutes are left and specific price context. It distinguishes between "cut now" (late window, losing) and "hold" (time to recover). Profit recommendations include specific exit triggers relative to peak offer.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">Canvas Chart (No CDN)</h3><p className="leading-relaxed">Chart is now built entirely in canvas — no external library needed. Always renders. Dual API fallback: Coinbase first, Binance if blocked. Supports full EMA/BB overlays, strike line, live price sync, crosshair hover, and volume bars. Resize-aware.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">New Signals</h3><ul className="list-disc pl-4 space-y-1"><li><strong>Candle Structure:</strong> 3+ consecutive candles in same direction = momentum confirmation. Volume surge compounds the signal.</li><li><strong>Price Channel:</strong> Near top of 20-candle range with upward drift = resistance signal, and vice versa.</li><li><strong>RSI Divergence:</strong> Price moving up but RSI flat = hidden weakness. Price down but RSI flat = hidden strength.</li><li><strong>Funding Momentum:</strong> Direction of funding rate change, not just the level.</li></ul></section>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Tara V100 Global Reset & Responsive Base ── */
        *, *::before, *::after { box-sizing: border-box; }
        html { font-size: 16px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
        body { margin: 0; padding: 0; min-height: 100vh; overflow-x: hidden; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        /* Scrollbars */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(232,233,228,0.12); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(232,233,228,0.22); }
        /* Mobile tap highlight */
        * { -webkit-tap-highlight-color: transparent; }
        /* Fluid type scale for small screens */
        @media (max-width: 480px) {
          html { font-size: 15px; }
          .prediction-heading { font-size: 2.4rem !important; }
        }
        @media (max-width: 360px) {
          html { font-size: 14px; }
          .prediction-heading { font-size: 2rem !important; }
        }
        @media (min-width: 1400px) {
          html { font-size: 17px; }
        }
      `}</style>
    </div>
  );
}

export default function App(){return<ErrorBoundary><TaraApp/></ErrorBoundary>;}
