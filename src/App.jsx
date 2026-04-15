import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- COMPACT ICONS ---
const IC={
Clock:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
Crosshair:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>,
Zap:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
Terminal:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
Alert:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
Activity:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
Bell:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
Check:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
TrendUp:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"text-purple-400 w-4 h-4"}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
Globe:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"text-blue-400 w-4 h-4"}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
Msg:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
X:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
Info:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
Vol2:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
VolX:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>,
Help:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
Link:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
Mic:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
MicOff:({className})=><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className||"w-4 h-4"}><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
};

// ═══════════════════════════════════════
// FORMAT & INDICATORS
// ═══════════════════════════════════════
const formatUSD = (val) => { const abs = Math.abs(val); if (abs >= 1e6) return (val / 1e6).toFixed(2) + 'M'; if (abs >= 1e3) return (val / 1e3).toFixed(1) + 'K'; return val.toFixed(0); };
const calcEMA=(d,p)=>{if(!d||d.length<p)return[];const k=2/(p+1),r=new Array(d.length).fill(null);r[d.length-1]=d[d.length-1];for(let i=d.length-2;i>=0;i--)r[i]=d[i]*k+r[i+1]*(1-k);return r;};
const calcVWAP=(h)=>{if(!h||!h.length)return null;let t=0,v=0;h.forEach(c=>{t+=((c.h+c.l+c.c)/3)*c.v;v+=c.v;});return v===0?null:t/v;};
const calcRSI=(d,p=14)=>{if(!d||d.length<p+1)return 50;let ag=0,al=0;for(let i=1;i<=p;i++){const x=d[i-1]-d[i];if(x>0)ag+=x;else al-=x;}ag/=p;al/=p;for(let i=p+1;i<Math.min(d.length,p+30);i++){const x=d[i-1]-d[i];ag=(ag*(p-1)+Math.max(x,0))/p;al=(al*(p-1)+Math.max(-x,0))/p;}return al===0?100:100-(100/(1+(ag/al)));};
const calcATR=(h,p=14)=>{if(!h||h.length<p+1)return 0;let s=0;for(let i=0;i<p;i++){const H=h[i].h,L=h[i].l,pc=h[i+1]?.c||h[i].o;s+=Math.max(H-L,Math.abs(H-pc),Math.abs(L-pc));}return s/p;};
const calcMACD=(c)=>{if(!c||c.length<26)return{line:0,signal:0,hist:0};const e12=calcEMA(c,12),e26=calcEMA(c,26);if(!e12.length||!e26.length)return{line:0,signal:0,hist:0};const ml=e12.map((v,i)=>(v!==null&&e26[i]!==null)?v-e26[i]:0);const sl=calcEMA(ml,9);return{line:ml[0]||0,signal:sl[0]||0,hist:(ml[0]||0)-(sl[0]||0)};};
const calcBB=(c,p=20)=>{if(!c||c.length<p)return{upper:0,mid:0,lower:0,pctB:0.5,width:0};const s=c.slice(0,p),m=s.reduce((a,b)=>a+b,0)/p,sd=Math.sqrt(s.reduce((a,b)=>a+Math.pow(b-m,2),0)/p);const u=m+2*sd,l=m-2*sd;return{upper:u,mid:m,lower:l,pctB:(u-l)>0?(c[0]-l)/(u-l):0.5,width:m>0?((u-l)/m)*10000:0};};

// ═══════════════════════════════════════
// MARKET SESSIONS
// ═══════════════════════════════════════
const getMarketSessions = () => {
  const now = new Date(); const utcH = now.getUTCHours();
  const asia = utcH >= 0 && utcH < 9;   
  const eu = utcH >= 7 && utcH < 16;     
  const us = utcH >= 13 && utcH < 22;    
  const sessions = [];
  if (asia) sessions.push({ name: 'ASIA', flag: '🌏', color: 'text-amber-400' });
  if (eu) sessions.push({ name: 'EU', flag: '🌍', color: 'text-blue-400' });
  if (us) sessions.push({ name: 'US', flag: '🌎', color: 'text-emerald-400' });
  const dominant = sessions.length > 0 ? sessions[sessions.length - 1].name : 'OFF-HOURS';
  return { sessions, dominant, utcH };
};

// ═══════════════════════════════════════
// HOOKS (Strict Component Safety)
// ═══════════════════════════════════════
const useVelocity = (tickH, price, target) => {
  const ref = useRef({v1s:0,v5s:0,v15s:0,v30s:0,accel:0,jerk:0,peakPnL:0,troughPnL:0,pnlSlope:0});
  const pnlH = useRef([]);
  useEffect(() => {
    const iv = setInterval(() => {
      if(!price||!target) return;
      const now=Date.now(), ticks=tickH.current||[];
      const ga=(ms)=>{const r=ticks.filter(t=>Math.abs((now-t.time)-ms)<2000);return r.length>0?r.reduce((a,b)=>a+b.p,0)/r.length:null;};
      const p1=ga(1000),p5=ga(5000),p15=ga(15000),p30=ga(30000);
      const v1s=p1?(price-p1):0,v5s=p5?(price-p5)/5:0,v15s=p15?(price-p15)/15:0,v30s=p30?(price-p30)/30:0;
      const cpnl=target>0?((price-target)/target)*10000:0;
      pnlH.current.push({pnl:cpnl,time:now});pnlH.current=pnlH.current.filter(p=>now-p.time<120000);
      const peakPnL=Math.max(...pnlH.current.map(p=>p.pnl),cpnl);
      const troughPnL=Math.min(...pnlH.current.map(p=>p.pnl),cpnl);
      const recent=pnlH.current.filter(p=>now-p.time<10000);
      const pnlSlope=recent.length>=3?recent[recent.length-1].pnl-recent[0].pnl:0;
      ref.current={v1s,v5s,v15s,v30s,accel:v5s-v15s,jerk:v1s-v5s,peakPnL,troughPnL,pnlSlope};
    }, 500);
    return () => clearInterval(iv);
  }, [price, target]);
  return ref;
};

const useGlobalTape = () => {
  const tapeRef = useRef({ coinbase:{buys:0,sells:0},binanceFutures:{buys:0,sells:0},bybit:{buys:0,sells:0},globalBuys:0,globalSells:0,globalImbalance:1,cbFlow:0,bnFlow:0,byFlow:0,divergence:0,whaleAlerts:[],binancePrice:0,bybitPrice:0 });
  const ticksRef = useRef([]);
  const [whaleLog, setWhaleLog] = useState([]); 
  const [globalFlow, setGlobalFlow] = useState({ imbalance:1,divergence:0,whaleAlert:null,feeds:0,deltaUSD:0 });

  useEffect(() => {
    if(typeof window==='undefined') return;
    let isCanvas=false;try{isCanvas=window.self!==window.top;}catch(e){isCanvas=true;}
    if(isCanvas) return;
    let wsBN=null,wsBY=null,feedCount=0;

    try {
      wsBN=new WebSocket('wss://fstream.binance.com/ws/btcusdt@aggTrade');
      wsBN.onopen=()=>{feedCount++;};
      wsBN.onmessage=(e)=>{try{const d=JSON.parse(e.data);const price=parseFloat(d.p),qty=parseFloat(d.q),usd=price*qty,isBuy=!d.m,now=Date.now();
        ticksRef.current.push({p:price,s:qty,usd,t:isBuy?'B':'S',src:'bn',time:now});
        tapeRef.current.binancePrice=price;
        if(usd>200000){const alert={src:'Binance',side:isBuy?'BUY':'SELL',size:qty,usd,price,time:now};tapeRef.current.whaleAlerts.push(alert);tapeRef.current.whaleAlerts=tapeRef.current.whaleAlerts.slice(-20);setWhaleLog(prev=>[alert,...prev].slice(0,50));}
      }catch(er){}};
    }catch(e){}

    try {
      wsBY=new WebSocket('wss://stream.bybit.com/v5/public/linear');
      wsBY.onopen=()=>{feedCount++;wsBY.send(JSON.stringify({op:'subscribe',args:['publicTrade.BTCUSDT']}));};
      wsBY.onmessage=(e)=>{try{const msg=JSON.parse(e.data);if(msg.topic==='publicTrade.BTCUSDT'&&msg.data){msg.data.forEach(trade=>{const price=parseFloat(trade.p),qty=parseFloat(trade.v),usd=price*qty,isBuy=trade.S==='Buy',now=Date.now();
        ticksRef.current.push({p:price,s:qty,usd,t:isBuy?'B':'S',src:'by',time:now});
        tapeRef.current.bybitPrice=price;
        if(usd>200000){const alert={src:'Bybit',side:isBuy?'BUY':'SELL',size:qty,usd,price,time:now};tapeRef.current.whaleAlerts.push(alert);tapeRef.current.whaleAlerts=tapeRef.current.whaleAlerts.slice(-20);setWhaleLog(prev=>[alert,...prev].slice(0,50));}
      });}}catch(er){}};
    }catch(e){}

    const aggIv=setInterval(()=>{
      const now=Date.now();ticksRef.current=ticksRef.current.filter(t=>now-t.time<30000);
      let cbB=0,cbS=0,bnB=0,bnS=0,byB=0,byS=0;
      ticksRef.current.forEach(t=>{const u=t.usd||(t.s*t.p);if(t.src==='cb'){if(t.t==='B')cbB+=u;else cbS+=u;}else if(t.src==='bn'){if(t.t==='B')bnB+=u;else bnS+=u;}else if(t.src==='by'){if(t.t==='B')byB+=u;else byS+=u;}});
      const gB=cbB+bnB+byB,gS=cbS+bnS+byS,gI=gS===0?(gB>0?2:1):gB/gS;
      const cbF=(cbB+cbS)>0?(cbB-cbS)/(cbB+cbS):0,bnF=(bnB+bnS)>0?(bnB-bnS)/(bnB+bnS):0,byF=(byB+byS)>0?(byB-byS)/(byB+byS):0;
      const dF=(bnB+byB-bnS-byS),sF=(cbB-cbS);
      const div=(bnB+bnS+byB+byS)>0?(sF>0&&dF<0?-1:sF<0&&dF>0?1:0)*Math.min(1,Math.abs(sF-dF)/Math.max(1,gB+gS)*10):0;
      tapeRef.current={...tapeRef.current,coinbase:{buys:cbB,sells:cbS},binanceFutures:{buys:bnB,sells:bnS},bybit:{buys:byB,sells:byS},globalBuys:gB,globalSells:gS,globalImbalance:gI,cbFlow:cbF,bnFlow:bnF,byFlow:byF,divergence:div};
      const rW=tapeRef.current.whaleAlerts.find(w=>now-w.time<5000);
      setGlobalFlow({imbalance:gI,divergence:div,whaleAlert:rW||null,feeds:feedCount,deltaUSD:gB-gS});
    },1000);

    return()=>{clearInterval(aggIv);if(wsBN?.readyState===1)wsBN.close();if(wsBY?.readyState===1)wsBY.close();};
  },[]);

  return {tapeRef,globalFlow,ticksRef,whaleLog};
};

const useBloomberg = () => {
  const [data,setData]=useState({fundingRate:0,fundingRatePrev:0,nextFundingTime:0,openInterest:0,openInterestUSD:0,oiChange5m:0,basisBps:0,markPrice:0,indexPrice:0,longShortRatio:1,topTraderLSRatio:1,topTraderLSPositions:1,binanceFuturesVol24h:0,liqLongWall:0,liqShortWall:0,liqLongUSD:0,liqShortUSD:0,lastUpdate:0,status:'connecting'});
  const oiSnaps=useRef([]);
  useEffect(()=>{if(typeof window==='undefined')return;let isC=false;try{isC=window.self!==window.top;}catch(e){isC=true;}if(isC)return;
    const f=async()=>{try{const R=await Promise.allSettled([fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=3').then(r=>r.json()),fetch('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1').then(r=>r.json()),fetch('https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=5m&limit=1').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=50').then(r=>r.json())]);
      const [pR,oR,fR,gR,tR,t24R,dR]=R;const now=Date.now();let u={lastUpdate:now,status:'live'};
      if(pR.status==='fulfilled'&&pR.value){const p=pR.value;const mk=parseFloat(p.markPrice)||0,ix=parseFloat(p.indexPrice)||0;u.fundingRate=parseFloat(p.lastFundingRate)||0;u.markPrice=mk;u.indexPrice=ix;u.basisBps=ix>0?((mk-ix)/ix)*10000:0;u.nextFundingTime=parseInt(p.nextFundingTime)||0;}
      if(oR.status==='fulfilled'&&oR.value){const oi=parseFloat(oR.value.openInterest)||0;oiSnaps.current.push({oi,time:now});oiSnaps.current=oiSnaps.current.filter(s=>now-s.time<600000);const o5=oiSnaps.current.find(s=>now-s.time>=270000&&now-s.time<=330000);u.openInterest=oi;u.openInterestUSD=oi*(u.markPrice||0);u.oiChange5m=o5?((oi-o5.oi)/o5.oi)*100:0;}
      if(fR.status==='fulfilled'&&Array.isArray(fR.value)&&fR.value.length>=2)u.fundingRatePrev=parseFloat(fR.value[1]?.fundingRate)||0;
      if(gR.status==='fulfilled'&&Array.isArray(gR.value)&&gR.value[0])u.longShortRatio=parseFloat(gR.value[0].longShortRatio)||1;
      if(tR.status==='fulfilled'&&Array.isArray(tR.value)&&tR.value[0])u.topTraderLSPositions=parseFloat(tR.value[0].longShortRatio)||1;
      if(t24R.status==='fulfilled'&&t24R.value)u.binanceFuturesVol24h=parseFloat(t24R.value.quoteVolume)||0;
      if(dR.status==='fulfilled'&&dR.value?.bids&&dR.value?.asks){const mp=u.markPrice||0;if(mp>0){let mBW=0,mBP=0,tBL=0,mAW=0,mAP=0,tAL=0;dR.value.bids.forEach(([p,q])=>{const pr=parseFloat(p),qt=parseFloat(q),dist=((mp-pr)/mp)*100;if(dist<2&&dist>0){const usd=pr*qt;tBL+=usd;if(usd>mBW){mBW=usd;mBP=pr;}}});dR.value.asks.forEach(([p,q])=>{const pr=parseFloat(p),qt=parseFloat(q),dist=((pr-mp)/mp)*100;if(dist<2&&dist>0){const usd=pr*qt;tAL+=usd;if(usd>mAW){mAW=usd;mAP=pr;}}});u.liqLongWall=mAP;u.liqShortWall=mBP;u.liqLongUSD=tAL;u.liqShortUSD=tBL;}}
      setData(prev=>({...prev,...u}));}catch(e){setData(prev=>({...prev,status:'error'}));}};
    f();const iv=setInterval(f,8000);return()=>clearInterval(iv);
  },[]);
  return data;
};

// ═══════════════════════════════════════
// V78 TRADINGVIEW MULTI-TIMEFRAME CHART
// ═══════════════════════════════════════
const LiveChart = ({ resolution, currentPrice, targetMargin, showCandles, rugPullActive, showOverlays, bb, globalFlow, projections, prediction, liquidations }) => {
  const chartContainerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [crosshairData, setCrosshairData] = useState(null);
  const [klines, setKlines] = useState([]);
  const chartRefs = useRef({ chart: null, mainSeries: null, volSeries: null, strike: null, e9: null, e21: null, bbu: null, bbl: null, predSeries: null, liqMarkers: [] });

  useEffect(() => {
    if (window.LightweightCharts && window.LightweightCharts.createChart) { setIsLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lightweight-charts@4.2.1/dist/lightweight-charts.standalone.production.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Fetch Binance Klines
  useEffect(() => {
      const fetchKlines = async () => {
          try {
              const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${resolution}&limit=200`);
              const data = await res.json();
              const formatted = data.map(d => ({
                  time: d[0] / 1000,
                  o: parseFloat(d[1]),
                  h: parseFloat(d[2]),
                  l: parseFloat(d[3]),
                  c: parseFloat(d[4]),
                  v: parseFloat(d[5])
              }));
              setKlines(formatted);
          } catch(e){}
      };
      fetchKlines();
      const iv = setInterval(fetchKlines, 10000);
      return () => clearInterval(iv);
  }, [resolution]);

  useEffect(() => {
    if (!isLoaded || !chartContainerRef.current) return;
    try {
        const { createChart, ColorType, LineStyle, CrosshairMode } = window.LightweightCharts;
        
        const chart = createChart(chartContainerRef.current, {
          layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#E8E9E4' },
          grid: { vertLines: { color: 'rgba(232, 233, 228, 0.04)' }, horzLines: { color: 'rgba(232, 233, 228, 0.04)' } },
          crosshair: { mode: CrosshairMode.Normal },
          rightPriceScale: { borderColor: 'rgba(232, 233, 228, 0.1)' },
          timeScale: { borderColor: 'rgba(232, 233, 228, 0.1)', timeVisible: true },
          autoSize: true, 
        });

        const mainSeries = showCandles 
          ? chart.addCandlestickSeries({ upColor: '#34d399', downColor: '#fb7185', borderVisible: false, wickUpColor: '#34d399', wickDownColor: '#fb7185' })
          : chart.addLineSeries({ color: '#c084fc', lineWidth: 2 });
          
        const volSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', scaleMargins: { top: 0.85, bottom: 0 } });
        
        const e9 = chart.addLineSeries({ color: 'rgba(251, 191, 36, 0.8)', lineWidth: 1.5, crosshairMarkerVisible: false });
        const e21 = chart.addLineSeries({ color: 'rgba(168, 85, 247, 0.8)', lineWidth: 1.5, crosshairMarkerVisible: false });
        const bbu = chart.addLineSeries({ color: 'rgba(99, 102, 241, 0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, crosshairMarkerVisible: false });
        const bbl = chart.addLineSeries({ color: 'rgba(99, 102, 241, 0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, crosshairMarkerVisible: false });
        
        const predSeries = chart.addLineSeries({ color: 'rgba(161, 161, 170, 0.8)', lineWidth: 2, lineStyle: LineStyle.Dotted, crosshairMarkerVisible: false });

        chartRefs.current = { chart, mainSeries, volSeries, e9, e21, bbu, bbl, predSeries, strike: null, liqMarkers: [] };

        chart.subscribeCrosshairMove((param) => {
            if (!param.time || param.point.x < 0 || param.point.y < 0) {
                setCrosshairData(null); return;
            }
            const cData = param.seriesData.get(mainSeries);
            const vData = param.seriesData.get(volSeries);
            if (cData) {
                setCrosshairData({
                    x: param.point.x,
                    y: param.point.y,
                    open: cData.open !== undefined ? cData.open : cData.value,
                    high: cData.high !== undefined ? cData.high : cData.value,
                    low: cData.low !== undefined ? cData.low : cData.value,
                    close: cData.close !== undefined ? cData.close : cData.value,
                    vol: vData ? vData.value : 0,
                    time: param.time
                });
            }
        });

        return () => { chart.remove(); chartRefs.current.chart = null; };
    } catch (e) {}
  }, [isLoaded, showCandles]); 

  // Plot Klines & Overlays
  useEffect(() => {
    if (!chartRefs.current.chart || !chartRefs.current.mainSeries || !klines || klines.length === 0) return;
    
    try {
        const sortedData = [...klines].sort((a,b)=>a.time - b.time);
        const uniqueData = [];
        const seen = new Set();
        for (const d of sortedData) {
            if (!seen.has(d.time)) { seen.add(d.time); uniqueData.push(d); }
        }

        chartRefs.current.mainSeries.setData(uniqueData.map(d => ({ time: d.time, open: d.o, high: d.h, low: d.l, close: d.c, value: showCandles ? undefined : d.c })));
        chartRefs.current.volSeries.setData(uniqueData.map(d => ({ time: d.time, value: d.v || 0, color: d.c >= d.o ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 113, 133, 0.3)' })));

        if (showOverlays) {
            const closes = uniqueData.map(d => d.c);
            const e9Arr = calcEMA(closes, 9);
            const e21Arr = calcEMA(closes, 21);
            
            chartRefs.current.e9.setData(uniqueData.map((d, i) => ({ time: d.time, value: e9Arr[i] })).filter(d => d.value !== null));
            chartRefs.current.e21.setData(uniqueData.map((d, i) => ({ time: d.time, value: e21Arr[i] })).filter(d => d.value !== null));

            const bbUp = [], bbDn = [];
            for (let i = 0; i < closes.length; i++) {
                if (i < 19) continue;
                const slice = closes.slice(i - 19, i + 1);
                const m = slice.reduce((a, b) => a + b, 0) / 20;
                const sd = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - m, 2), 0) / 20);
                bbUp.push({ time: uniqueData[i].time, value: m + 2 * sd });
                bbDn.push({ time: uniqueData[i].time, value: m - 2 * sd });
            }
            chartRefs.current.bbu.setData(bbUp);
            chartRefs.current.bbl.setData(bbDn);
        } else {
            chartRefs.current.e9.setData([]); chartRefs.current.e21.setData([]);
            chartRefs.current.bbu.setData([]); chartRefs.current.bbl.setData([]);
        }
    } catch (e) {}
  }, [klines, showCandles, showOverlays]);

  // Sync Live Price to last candle
  useEffect(() => {
    if (!chartRefs.current.mainSeries || !klines || klines.length === 0 || !currentPrice) return;
    try {
        const last = klines[klines.length - 1]; 
        chartRefs.current.mainSeries.update({
            time: last.time,
            open: last.o,
            high: Math.max(last.h, currentPrice),
            low: Math.min(last.l, currentPrice),
            close: currentPrice,
            value: showCandles ? undefined : currentPrice
        });
    } catch (e) {}
  }, [currentPrice, klines, showCandles]);

  // Plot Liquidation Bubbles
  useEffect(() => {
      if (!chartRefs.current.mainSeries || !liquidations) return;
      try {
          const markers = [];
          liquidations.forEach(l => {
              markers.push({
                  time: Math.floor(l.time / 1000),
                  position: l.side === 'BUY' ? 'belowBar' : 'aboveBar',
                  color: l.side === 'BUY' ? '#34d399' : '#fb7185',
                  shape: l.side === 'BUY' ? 'arrowUp' : 'arrowDown',
                  text: 'LIQ'
              });
          });
          const uniqueMarkers = [];
          const seen = new Set();
          markers.sort((a,b)=>a.time - b.time).forEach(m => {
              if(!seen.has(m.time)) { seen.add(m.time); uniqueMarkers.push(m); }
          });
          chartRefs.current.mainSeries.setMarkers(uniqueMarkers);
      } catch(e) {}
  }, [liquidations]);

  // Sync Trend Prediction Line
  useEffect(() => {
      if (!chartRefs.current.predSeries || !projections || projections.length === 0 || !klines || klines.length === 0) return;
      try {
          const col = prediction === 'YES' ? '#34d399' : prediction === 'NO' ? '#fb7185' : '#a1a1aa';
          chartRefs.current.predSeries.applyOptions({ color: col });
          
          const lastHistoricalTime = klines[klines.length - 1].time; 
          const lastPrice = currentPrice || klines[klines.length - 1].c;
          
          const predData = [
              { time: lastHistoricalTime, value: lastPrice },
              ...projections.map(p => ({ time: p.timestamp, value: p.price }))
          ];
          
          const uniquePredData = [];
          const seen = new Set();
          for (const d of predData) {
              if (!seen.has(d.time) && !isNaN(d.time) && d.time >= lastHistoricalTime) {
                  seen.add(d.time);
                  uniquePredData.push(d);
              }
          }
          uniquePredData.sort((a,b) => a.time - b.time);
          chartRefs.current.predSeries.setData(uniquePredData);
      } catch (e) {}
  }, [projections, prediction, klines, currentPrice]);

  useEffect(() => {
    if (!chartRefs.current.mainSeries) return;
    const { LineStyle } = window.LightweightCharts || {};
    if (!LineStyle) return;
    
    if (chartRefs.current.strike) {
        chartRefs.current.mainSeries.removePriceLine(chartRefs.current.strike);
        chartRefs.current.strike = null;
    }
    if (targetMargin > 0) {
        try {
            chartRefs.current.strike = chartRefs.current.mainSeries.createPriceLine({
                price: targetMargin,
                color: '#818cf8',
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'STRIKE',
            });
        } catch(e) {}
    }
  }, [targetMargin, showCandles]);
  
  useEffect(() => {
    if (!chartRefs.current.chart) return;
    try {
        const { ColorType } = window.LightweightCharts;
        chartRefs.current.chart.applyOptions({
            layout: { 
                background: { 
                    type: ColorType.Solid, 
                    color: rugPullActive ? 'rgba(251, 113, 133, 0.05)' : 'transparent' 
                } 
            }
        });
    } catch(e) {}
  }, [rugPullActive]);

  return (
    <div className="w-full h-full relative" style={{ touchAction: 'none' }}>
        {!isLoaded && <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[#E8E9E4]/30 uppercase tracking-widest animate-pulse">Loading Institutional Chart Engine...</div>}
        {rugPullActive && <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"><span className="text-[#fb7185] font-bold text-2xl tracking-widest bg-black/40 px-4 py-2 rounded-xl backdrop-blur-sm border border-[#fb7185]/50">🚨 RUG PULL DETECTED</span></div>}
        
        {/* V77 On-Chart Legend */}
        {isLoaded && (
            <div className="absolute top-2 left-3 z-10 flex flex-col gap-0.5 pointer-events-none select-none">
                {currentPrice && (
                    <div className={`font-serif text-xl font-bold ${rugPullActive ? 'text-rose-500' : 'text-white'} drop-shadow-md tracking-tight`}>
                        ${currentPrice.toFixed(2)}
                    </div>
                )}
                {globalFlow && globalFlow.deltaUSD !== undefined && (
                    <div className={`text-[10px] font-bold uppercase tracking-widest ${globalFlow.deltaUSD > 0 ? 'text-emerald-400' : 'text-rose-400'} drop-shadow-md`}>
                        30s Vol Delta: {globalFlow.deltaUSD > 0 ? '+' : ''}{formatUSD(globalFlow.deltaUSD)}
                    </div>
                )}
                {prediction && prediction !== "SIT OUT" && (
                    <div className={`text-[10px] font-bold uppercase tracking-widest ${prediction === 'YES' ? 'text-emerald-400' : 'text-rose-400'} drop-shadow-md mt-1 flex items-center gap-1`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${prediction === 'YES' ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`}></div>
                        Target: {prediction}
                    </div>
                )}
            </div>
        )}

        {/* V77 Custom OHLCV Interactive Tooltip */}
        {crosshairData && (
            <div 
                className="absolute z-20 bg-[#181A19]/95 border border-[#E8E9E4]/15 rounded shadow-xl p-2 pointer-events-none transform -translate-x-1/2 -translate-y-[120%]"
                style={{ left: crosshairData.x, top: crosshairData.y }}
            >
                <div className="text-[#E8E9E4] text-[10px] font-mono leading-tight whitespace-nowrap">
                    <div><span className="opacity-50">O:</span> {crosshairData.open.toFixed(2)}</div>
                    <div><span className="opacity-50">H:</span> {crosshairData.high.toFixed(2)}</div>
                    <div><span className="opacity-50">L:</span> {crosshairData.low.toFixed(2)}</div>
                    <div><span className="opacity-50">C:</span> {crosshairData.close.toFixed(2)}</div>
                    <div className="mt-1 pt-1 border-t border-[#E8E9E4]/10 text-purple-300">
                        <span className="opacity-50">V:</span> {crosshairData.vol.toFixed(2)}
                    </div>
                </div>
            </div>
        )}

        <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />
    </div>
  );
};

// ═══════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Tara Terminal Crash:", error, errorInfo); this.setState({ errorInfo }); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#111312] text-rose-500 p-8 font-mono flex flex-col items-start justify-start overflow-auto">
          <h1 className="text-2xl font-bold mb-4">Tara Engine Crash Detected</h1>
          <pre className="bg-black p-4 rounded-md w-full border border-rose-500/30 text-xs mb-4 whitespace-pre-wrap">{this.state.error && this.state.error.toString()}</pre>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-4 px-4 py-2 bg-rose-500 text-white rounded font-bold">Clear Memory & Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════
function TaraApp() {
  const [isMounted, setIsMounted] = useState(false);
  const [showCandles, setShowCandles] = useState(true); 
  const [showOverlays, setShowOverlays] = useState(true);
  const [showWhaleAlerts, setShowWhaleAlerts] = useState(true);
  const [showRugPullAlerts, setShowRugPullAlerts] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [discordWebhook, setDiscordWebhook] = useState("");
  
  const [currentPrice, setCurrentPrice] = useState(null);
  const [tickDirection, setTickDirection] = useState(null);
  const currentPriceRef = useRef(null);
  const tickHistoryRef = useRef([]); 
  const priceMemoryRef = useRef([]); 
  const lastPriceSourceRef = useRef({ source: 'none', time: 0 });

  const [history, setHistory] = useState([]); 
  const [orderBook, setOrderBook] = useState({ localBuy: 0, localSell: 0, imbalance: 1 });
  const [liquidations, setLiquidations] = useState([]); 
  const [newsEvents, setNewsEvents] = useState([]);
  
  const [targetMargin, setTargetMargin] = useState(0); 
  const hasSetInitialMargin = useRef(false);
  const [betAmount, setBetAmount] = useState(0);
  const [maxPayout, setMaxPayout] = useState(0);
  const [currentOffer, setCurrentOffer] = useState(""); 

  const [windowType, setWindowType] = useState('15m'); 
  const [chartRes, setChartRes] = useState('1m'); 
  const [timeState, setTimeState] = useState({ currentEST: '', startWindowEST: '', nextWindowEST: '', minsRemaining: 0, secsRemaining: 0, currentHour: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const lockedPredictionRef = useRef("SIT OUT");
  const activeCallRef = useRef({ prediction: "SIT OUT", strike: 0 });
  const hasReversedRef = useRef(false); 
  const taraAdviceRef = useRef("SIT OUT");
  const activeAdviceRef = useRef("HOLD FIRM");
  const peakOfferRef = useRef(0);
  
  const [positionEntry, setPositionEntry] = useState(null);

  // Scorecard locked to 140-101
  const [scorecards, setScorecards] = useState({ '15m': { wins: 140, losses: 101 }, '5m': { wins: 10, losses: 7 } });
  
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedScore = localStorage.getItem('btcOracleScorecardV78');
      if (savedScore) {
          const parsed = JSON.parse(savedScore);
          if (parsed && typeof parsed['15m'] === 'object' && typeof parsed['15m'].wins === 'number') {
              setScorecards(parsed);
          }
      } else {
          setScorecards({ '15m': { wins: 140, losses: 101 }, '5m': { wins: 10, losses: 7 } });
      }
      const savedWebhook = localStorage.getItem('btcOracleWebhookV78');
      if (savedWebhook) setDiscordWebhook(savedWebhook);
    } catch (e) {
      setScorecards({ '15m': { wins: 140, losses: 101 }, '5m': { wins: 10, losses: 7 } });
    }
  }, []);

  const [manualAction, setManualAction] = useState(null);
  const [forceRender, setForceRender] = useState(0); 
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLog, setChatLog] = useState([{ role: 'tara', text: "Tara V78 Master Build online. Reality Gap Capping, Whale Logs, Voice Synthesis, and Kelly Sizing fully functional." }]);
  const [chatInput, setChatInput] = useState("");
  
  const lastWindowRef = useRef("");
  const [userPosition, setUserPosition] = useState(null); 
  const [showHelp, setShowHelp] = useState(false);
  
  // Audio Toggles
  const [soundEnabled, setSoundEnabled] = useState(false); 
  const [voiceEnabled, setVoiceEnabled] = useState(false); 
  const prevActionRef = useRef(null);

  // CORE HOOKS (Restored for Stability)
  const velocityRef = useVelocity(tickHistoryRef, currentPrice, targetMargin);
  const bloomberg = useBloomberg();
  const { tapeRef, globalFlow, ticksRef, whaleLog } = useGlobalTape();
  const marketSessions = useMemo(() => getMarketSessions(), [timeState.currentHour]);

  const [showWhaleLog, setShowWhaleLog] = useState(false);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try { 
        localStorage.setItem('btcOracleScorecardV78', JSON.stringify(scorecards)); 
        localStorage.setItem('btcOracleWebhookV78', String(discordWebhook));
      } 
      catch (e) {}
    }
  }, [scorecards, discordWebhook, isMounted]);

  // Tracking Peak Profit for PnL Predictive Cashout
  useEffect(() => {
      if (userPosition === null) {
          peakOfferRef.current = 0;
          activeAdviceRef.current = "HOLD FIRM";
      } else {
          const offer = parseFloat(currentOffer) || 0;
          if (offer > peakOfferRef.current) peakOfferRef.current = offer;
      }
  }, [currentOffer, userPosition]);

  // Record precise multi-minute trajectory memory
  useEffect(() => {
    if (!currentPrice) return;
    const memInterval = setInterval(() => {
        priceMemoryRef.current.push({ p: currentPrice, time: Date.now() });
        priceMemoryRef.current = priceMemoryRef.current.filter(t => Date.now() - t.time < 300000);
    }, 2000); 
    return () => clearInterval(memInterval);
  }, [currentPrice]);

  const getHistoricPrice = (msAgo) => {
      const target = Date.now() - msAgo;
      const mem = priceMemoryRef.current;
      if (!mem || mem.length === 0) return currentPrice || 0;
      let closest = mem[0];
      for (let i = mem.length - 1; i >= 0; i--) {
          if (mem[i].time <= target) { closest = mem[i]; break; }
      }
      return closest.p;
  };

  const broadcastToDiscord = async (title, color, fields) => {
    if (!discordWebhook || !discordWebhook.startsWith("http")) return;
    try {
      await fetch(discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: "Tara Terminal V78",
          avatar_url: "https://i.imgur.com/8nLFCVP.png", 
          embeds: [{
            title: String(title),
            color: Number(color), 
            fields: fields.map(f => ({ name: String(f.name), value: String(f.value), inline: Boolean(f.inline) })),
            timestamp: new Date().toISOString()
          }]
        })
      });
    } catch (e) {}
  };

  const playAlertSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine'; 
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch(e) {}
  };

  const handleWindowToggle = (type) => {
    if (type === windowType) return;
    setWindowType(String(type));
    lockedPredictionRef.current = "SIT OUT";
    activeCallRef.current = { prediction: "SIT OUT", strike: currentPrice };
    hasReversedRef.current = false; 
    taraAdviceRef.current = "SIT OUT";
    activeAdviceRef.current = "HOLD FIRM";
    setUserPosition(null);
    setPositionEntry(null);
    setManualAction(null);
    setCurrentOffer("");
    setBetAmount(0);
    setMaxPayout(0);
    lastWindowRef.current = ""; 
    setForceRender(prev => prev + 1);
  };

  const updateScore = (type, winOrLoss, amount) => {
    setScorecards(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [winOrLoss]: Math.max(0, (Number(prev[type]?.[winOrLoss]) || 0) + amount)
      }
    }));
  };

  // V78 30% Position Status Manager
  const positionStatus = useMemo(() => {
    if (!positionEntry || !currentPrice) return null;
    const { price: entry, side } = positionEntry;
    const pnlPct = side === 'YES' 
      ? ((currentPrice - entry) / entry) * 100
      : ((entry - currentPrice) / entry) * 100;
    const isStopHit = pnlPct <= -30; 
    const pnlDollar = betAmount > 0 ? betAmount * (pnlPct / 100) : 0;
    return { entry, side, pnlPct, pnlDollar, isStopHit };
  }, [positionEntry, currentPrice, betAmount]);

  useEffect(() => {
    if (positionStatus?.isStopHit && positionEntry) {
      setChatLog(prev => [...prev, { role: 'tara', text: `🚨 30% STOP LOSS HIT. Entry: $${positionEntry.price.toFixed(2)}, Current: $${currentPrice?.toFixed(2)}. PnL: ${positionStatus.pnlPct.toFixed(1)}%. Recommending immediate exit.` }]);
    }
  }, [positionStatus?.isStopHit]);

  // Window Rollover logic
  useEffect(() => {
    if (timeState.nextWindowEST && timeState.nextWindowEST !== lastWindowRef.current) {
      if (currentPrice !== null) {
        if (lastWindowRef.current !== "") {
          const prevCall = activeCallRef.current;
          let won = false;
          if (prevCall.prediction === "YES") {
            if (currentPrice > prevCall.strike) { updateScore(windowType, 'wins', 1); won = true; }
            else if (currentPrice < prevCall.strike) updateScore(windowType, 'losses', 1);
          } else if (prevCall.prediction === "NO") {
            if (currentPrice < prevCall.strike) { updateScore(windowType, 'wins', 1); won = true; }
            else if (currentPrice > prevCall.strike) updateScore(windowType, 'losses', 1);
          }

          if (prevCall.prediction !== "SIT OUT") {
             broadcastToDiscord(`Round Closed: ${windowType.toUpperCase()}`, won ? 3404125 : 16478549, [
                { name: "Result", value: won ? "WIN" : "LOSS", inline: true },
                { name: "Prediction", value: String(prevCall.prediction), inline: true },
                { name: "Closing Price", value: `$${currentPrice.toFixed(2)}`, inline: true }
             ]);
          }
        }
        
        setTargetMargin(currentPrice);
        lockedPredictionRef.current = "SIT OUT";
        activeCallRef.current = { prediction: "SIT OUT", strike: currentPrice };
        hasReversedRef.current = false; 
        taraAdviceRef.current = "SIT OUT";
        activeAdviceRef.current = "HOLD FIRM";
        setUserPosition(null); 
        setPositionEntry(null);
        lastWindowRef.current = timeState.nextWindowEST;
        setManualAction(null); 
        tickHistoryRef.current = []; 
        setCurrentOffer(""); 
        setBetAmount(0); 
        setMaxPayout(0); 
        hasSetInitialMargin.current = true;
      }
    }
  }, [timeState.nextWindowEST, currentPrice, windowType]);

  // Sub-Second REST Fallback
  useEffect(() => {
    let lastUiUpdate = 0;
    const fetchSpotPrice = async () => {
      try {
        const resTicker = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker');
        if (!resTicker.ok) return;
        const dataTicker = await resTicker.json();
        if (dataTicker.price) {
          const p = parseFloat(dataTicker.price);
          const now = Date.now();
          if (lastPriceSourceRef.current.source !== 'coinbase' || now - lastPriceSourceRef.current.time > 2000) {
             currentPriceRef.current = p; lastPriceSourceRef.current = { source: 'rest', time: now };
             if (now - lastUiUpdate > 300) {
               setCurrentPrice(prev => { if (prev !== null && p !== prev) setTickDirection(p > prev ? 'up' : 'down'); return p; });
               lastUiUpdate = now;
             }
          }
          tickHistoryRef.current.push({ p, s: parseFloat(dataTicker.size || 0.1), t: 'B', time: Date.now(), ex: 'CB' });
        }
      } catch(e) {}
    };
    fetchSpotPrice();
    const spotInterval = setInterval(fetchSpotPrice, 1500); 
    return () => clearInterval(spotInterval);
  }, []);

  // API Data Polling
  useEffect(() => {
    const fetchHeavyData = async () => {
      try {
        const gran = windowType === '15m' ? 900 : 300;
        try {
          const resCB = await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${gran}`);
          if (resCB.ok) {
            const dataCB = await resCB.json();
            if (Array.isArray(dataCB)) {
              setHistory(dataCB.slice(0, 60).map(c => ({ time: c[0], l: parseFloat(c[1]), h: parseFloat(c[2]), o: parseFloat(c[3]), c: parseFloat(c[4]), v: parseFloat(c[5]) })));
            }
          }
        } catch (e) {}

        try {
          const resOb = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/book?level=2');
          if (resOb.ok) {
            const dataOb = await resOb.json();
            if (dataOb?.bids && dataOb?.asks) {
              let localBuy = 0, localSell = 0;
              dataOb.bids.forEach(([p, s]) => { if (p <= targetMargin && p >= targetMargin - 150) localBuy += parseFloat(s); });
              dataOb.asks.forEach(([p, s]) => { if (p >= targetMargin && p <= targetMargin + 150) localSell += parseFloat(s); });
              setOrderBook({ localBuy, localSell, imbalance: localSell === 0 ? 1 : localBuy / localSell });
            }
          }
        } catch (err) {}
        setIsLoading(false);
      } catch (err) { setIsLoading(false); }
    };

    fetchHeavyData();
    const heavyInterval = setInterval(fetchHeavyData, 5000); 
    return () => clearInterval(heavyInterval);
  }, [targetMargin, windowType]); 

  useEffect(() => { 
    if (!hasSetInitialMargin.current && currentPrice) {
      setTargetMargin(currentPrice);
      hasSetInitialMargin.current = true;
    }
  }, [currentPrice]);

  const liveHistory = useMemo(() => {
    if (history.length === 0 || !currentPrice) return history;
    const updated = [...history];
    updated[0] = {
      ...updated[0],
      c: currentPrice,
      h: Math.max(updated[0].h || currentPrice, currentPrice),
      l: Math.min(updated[0].l || currentPrice, currentPrice)
    };
    return updated;
  }, [history, currentPrice]);

  useEffect(() => {
    let syntheticNews = [];
    if (orderBook.imbalance > 1.5) syntheticNews.push({ title: `Maker Alert: Limit BID wall placed near $${targetMargin.toFixed(0)}`, type: 'info' });
    if (orderBook.imbalance < 0.6) syntheticNews.push({ title: `Maker Alert: Limit SELL pressure defending $${targetMargin.toFixed(0)}`, type: 'info' });
    
    if (showWhaleAlerts && whaleLog.length > 0) {
        const lastWhale = whaleLog[0];
        syntheticNews.push({ title: `🐋 WHALE: Massive Market ${lastWhale.side} on ${lastWhale.src} Futures.`, type: 'whale' });
    }
    
    if (syntheticNews.length < 3) syntheticNews.push({ title: `Engine: Visual DOM & Voice Synthesis Module Active...`, type: 'info' });
    setNewsEvents(syntheticNews);
  }, [orderBook.imbalance, globalFlow, targetMargin, windowType, showWhaleAlerts, whaleLog]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const msNow = now.getTime();
      const intervalMs = (windowType === '15m' ? 15 : 5) * 60 * 1000;
      
      const nextWindowMs = Math.ceil((msNow + 500) / intervalMs) * intervalMs; 
      const nextWindow = new Date(nextWindowMs);
      const startWindow = new Date(nextWindowMs - intervalMs);
      
      const diffMs = nextWindow.getTime() - now.getTime();
      
      let currentEST, startWindowEST, nextWindowEST;
      try {
         currentEST = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
         startWindowEST = startWindow.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit' });
         nextWindowEST = nextWindow.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit' });
      } catch (e) {
         currentEST = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
         startWindowEST = startWindow.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
         nextWindowEST = nextWindow.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
      }
      
      setTimeState({ 
        currentEST: String(currentEST), 
        startWindowEST: String(startWindowEST), 
        nextWindowEST: String(nextWindowEST), 
        minsRemaining: Math.floor(diffMs / 60000), 
        secsRemaining: Math.floor((diffMs % 60000) / 1000), 
        currentHour: now.getHours() 
      });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [windowType]);

  // --- TARA V78: KELLY CRITERION & PHYSICS ---
  const analysis = useMemo(() => {
    try {
        if (!currentPrice || liveHistory.length < 30 || !targetMargin || !isMounted) return null;

        const is15m = windowType === '15m';
        const intervalSeconds = is15m ? 900 : 300;
        const clockSeconds = (timeState.minsRemaining * 60) + timeState.secsRemaining;
        const timeFraction = Math.max(0, Math.min(1, 1 - (clockSeconds / intervalSeconds)));
        
        const isEndgameLock = clockSeconds < 120; 
        const isCalibrating = (intervalSeconds - clockSeconds) < 25; 
        const isPostDecay = timeFraction > 0.6;

        const closes = liveHistory.map(x => x.c);
        const rsi = calculateRSI(closes, 14) || 50;
        const atr = calculateATR(liveHistory, 14) || 10;
        const atrBps = atr > 0 ? (atr / currentPrice) * 10000 : 15; 
        const vwap = calculateVWAP(liveHistory);
        const bb = calcBB([...closes].reverse(), 20);

        const realGapBps = targetMargin > 0 ? ((currentPrice - targetMargin) / targetMargin) * 10000 : 0;
        const vwapGapBps = vwap ? ((currentPrice - vwap) / vwap) * 10000 : 0;
        
        const v30s_bps = ((currentPrice - getHistoricPrice(30000)) / currentPrice) * 10000;
        const v1m_bps = ((currentPrice - getHistoricPrice(60000)) / currentPrice) * 10000;
        const v3m_bps = ((currentPrice - getHistoricPrice(180000)) / currentPrice) * 10000;

        let aggrFlow = Math.max(-1.0, Math.min(1.0, globalFlow.imbalance - 1));
        let mktImplied = Math.max(-1.0, Math.min(1.0, orderBook.imbalance - 1));

        let liqBuys = 0; let liqSells = 0;
        liquidations.forEach(l => {
          if (Date.now() - l.time < 60000) {
            if (l.side === 'BUY') liqBuys += l.value; 
            else liqSells += l.value; 
          }
        });

        let baseProb = 50;
        let regime = "RANGE/CHOP";
        let reasoning = [];
        
        const ticks = tickHistoryRef.current;
        const tickSlope = ticks.length >= 10 ? (currentPrice - ticks[0].p) : 0;
        let isRugPull = false;
        if (tickSlope < -5.0 && aggrFlow < -0.6) isRugPull = true;

        const timeDecay = Math.pow(timeFraction, is15m ? 1.8 : 1.3); 
        const decayMult = isPostDecay ? 1.5 : 1.0;
        
        const gapMag = Math.abs(realGapBps);
        let gapEffect = realGapBps * (is15m ? 0.6 : 0.8) * (0.15 + 0.85 * timeDecay) * decayMult;
        
        if (gapMag > 15) {
            gapEffect += Math.sign(realGapBps) * Math.pow(gapMag - 10, 1.4) * (is15m ? 0.4 : 0.6);
            reasoning.push(`GRAVITY: Extreme gap (${realGapBps.toFixed(0)}bps) pulling odds.`);
        }
        
        baseProb += gapEffect;

        if (rsi > 65 && realGapBps > 0) {
           baseProb -= 20; regime = "OVERBOUGHT (FADE)";
           reasoning.push(`REGIME: RSI is ${rsi.toFixed(1)}. Pumping but overextended. Fading the top.`);
        } else if (rsi < 35 && realGapBps < 0) {
           baseProb += 20; regime = "OVERSOLD (FADE)";
           reasoning.push(`REGIME: RSI is ${rsi.toFixed(1)}. Dumping but overextended. Fading the bottom.`);
        } else if (Math.abs(vwapGapBps) > 2 && tickSlope > 0.5) {
           regime = "STRONG UPTREND"; baseProb += (aggrFlow * 25) + 10;
        } else if (Math.abs(vwapGapBps) > 2 && tickSlope < -0.5) {
           regime = "STRONG DOWNTREND"; baseProb += (aggrFlow * 25) - 10;
        } else {
           regime = "RANGE/CHOP"; baseProb += (aggrFlow * 20) + (mktImplied * 10);
        }

        if (liqBuys > 10000) { baseProb += 15; reasoning.push(`LIQ: Shorts squeezed. Upward force applied.`); }
        if (liqSells > 10000) { baseProb -= 15; reasoning.push(`LIQ: Longs squeezed. Downward force applied.`); }

        if (isEndgameLock && userPosition === null) {
            reasoning.push(`ENDGAME: Physics overrule momentum. Physical gap locked in.`);
        }

        let posterior = Math.max(1, Math.min(99, baseProb)); 

        if (realGapBps < -35) { 
            posterior = Math.min(posterior, 20); 
            reasoning.push(`REALITY CAP: Deep underwater. UP odds strictly capped at 20%.`); 
        } else if (realGapBps < -15) { 
            posterior = Math.min(posterior, 40); 
        } else if (realGapBps > 35) { 
            posterior = Math.max(posterior, 80); 
            reasoning.push(`REALITY CAP: High profit. UP odds strictly floored at 80%.`); 
        } else if (realGapBps > 15) { 
            posterior = Math.max(posterior, 60); 
        }

        if (isPostDecay && !isEndgameLock) reasoning.push(`POST-DECAY: Prediction confidence ↑.`);

        let convictionScore = Math.abs(posterior - 50) * 2; 

        if (taraAdviceRef.current === "SIT OUT") {
            if (posterior >= 68) taraAdviceRef.current = "YES";
            else if (posterior <= 32) taraAdviceRef.current = "NO";
        } else if (taraAdviceRef.current === "YES") {
            if (posterior < 40) taraAdviceRef.current = "SIT OUT"; 
        } else if (taraAdviceRef.current === "NO") {
            if (posterior > 60) taraAdviceRef.current = "SIT OUT"; 
        }

        let activePrediction = userPosition !== null ? userPosition : taraAdviceRef.current;

        if (userPosition === null) {
            if (isCalibrating || isEndgameLock) activePrediction = "SIT OUT";
        }

        let tradeAction = "WAITING / SIT OUT"; 
        let tradeReason = "Awaiting structural confirmation to signal.";
        let actionColor = "text-zinc-400"; let actionBg = "bg-zinc-500/10 border-zinc-500/30";
        let hasAction = false, actionButtonLabel = "", actionTarget = "";

        const isYES = activePrediction === "YES";
        const currentOdds = activePrediction === "SIT OUT" ? 50 : (isYES ? posterior : (100 - posterior));
        const riskPct = 100 - currentOdds;
        const metricsStr = `[Chance: ${currentOdds.toFixed(0)}% | Risk: ${riskPct.toFixed(0)}%]`;
        
        let liveEstValue = isYES ? maxPayout * (posterior / 100) : (activePrediction === "NO" ? maxPayout * ((100 - posterior) / 100) : 0);
        const offerVal = parseFloat(currentOffer) || 0;
        const livePnL = offerVal > 0 ? (offerVal - betAmount) : (liveEstValue - betAmount);

        // KELLY CRITERION
        let kellyPct = 0;
        if (activePrediction !== "SIT OUT" && betAmount > 0 && maxPayout > betAmount) {
            const b = (maxPayout - betAmount) / betAmount; // Net odds
            const p = currentOdds / 100;
            const q = 1 - p;
            const k = ((p * b) - q) / b;
            kellyPct = Math.max(0, (k / 2) * 100); 
        }

        if (userPosition === null) {
            if (isRugPull && showRugPullAlerts) {
                tradeAction = "🚨 RUG PULL DETECTED 🚨"; tradeReason = `Massive liquidity collapse. Abort longs immediately.`;
                actionColor = "text-rose-500"; actionBg = "bg-rose-500/20 border-rose-500/50 animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.4)]";
                reasoning.push(`🚨 RUG PULL: AggrFlow & TickSlope indicate severe localized crash.`);
            }
            else if (isCalibrating) {
                tradeAction = "CALIBRATING TAPE"; tradeReason = "Analyzing initial tick flow. Please wait...";
                actionColor = "text-amber-400";
            }
            else if (isEndgameLock && activePrediction === "SIT OUT") {
                tradeAction = "WINDOW CLOSED"; tradeReason = "Late in round. Entering now is unsafe.";
                actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30";
            }
            else if (activePrediction !== "SIT OUT") {
                tradeAction = `ENTRY SIGNAL: ${activePrediction}`;
                tradeReason = `Quant composite supports entry. Execute now. ${metricsStr}`;
                actionColor = isYES ? "text-emerald-400" : "text-rose-400";
                actionBg = isYES ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(251,113,133,0.2)]";
                hasAction = true; actionButtonLabel = `CONFIRM ENTRY: '${activePrediction}'`; actionTarget = activePrediction;
            } else {
                tradeAction = "AWAITING CONVICTION"; tradeReason = "Odds below 68%. Waiting for cleaner setup.";
            }
        } 
        else {
            const peak = peakOfferRef.current;
            const drawdownFromPeak = peak > 0 ? ((peak - offerVal) / peak) : 0;
            const momentumAgainst = (isYES && tickSlope < 0) || (!isYES && tickSlope > 0);
            const isBleeding = currentOdds < 45;
            const isHardReversal = currentOdds < 30;

            let currentAdvice = activeAdviceRef.current;

            if (positionStatus?.isStopHit) {
                currentAdvice = "🚨 30% STOP HIT"; 
            } else if (isRugPull && showRugPullAlerts && isYES) {
                currentAdvice = "🚨 RUG PULL DETECTED 🚨";
            } else if (peak > (betAmount * 1.1) && drawdownFromPeak > 0.08) {
                currentAdvice = "TRAILING STOP HIT"; 
            } else if (offerVal > 0 && livePnL < -2 && momentumAgainst) {
                currentAdvice = "⚡ CUT LOSSES NOW"; 
            } else if (offerVal > betAmount && livePnL > betAmount * 0.15 && momentumAgainst) {
                currentAdvice = "⚡ SCALP PROFIT";
            } else if (offerVal > betAmount && momentumAgainst && currentOdds < 65) {
                currentAdvice = "⚡ SECURE PROFIT"; 
            } else if (isHardReversal && !hasReversedRef.current) {
                currentAdvice = "REVERSE POSITION";
            } else if (isBleeding) {
                currentAdvice = "CUT LOSSES";
            } else if (currentOdds >= 85 && offerVal === 0) {
                currentAdvice = "MAX PROFIT REACHED";
            } else {
                currentAdvice = "HOLD FIRM";
            }

            activeAdviceRef.current = String(currentAdvice);
            tradeAction = String(currentAdvice);

            if (tradeAction === "🚨 30% STOP HIT") {
                tradeReason = `Position breached -30% limit. Execute emergency exit. ${metricsStr}`;
                actionColor = "text-rose-500"; actionBg = "bg-rose-500/20 border-rose-500/50 animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.4)]";
                hasAction = true; actionButtonLabel = "EXIT (STOP LOSS)"; actionTarget = "SIT OUT";
            } else if (tradeAction === "🚨 RUG PULL DETECTED 🚨") {
                tradeReason = `Massive liquidity collapse. Abort longs immediately. ${metricsStr}`;
                actionColor = "text-rose-500"; actionBg = "bg-rose-500/20 border-rose-500/50 animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.4)]";
                hasAction = true; actionButtonLabel = "EMERGENCY CASHOUT"; actionTarget = "SIT OUT";
            } else if (tradeAction === "TRAILING STOP HIT") {
                tradeReason = `Price retreated 8% from local peak. Lock in remaining profit. ${metricsStr}`;
                actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30 animate-pulse";
                hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "CASH";
            } else if (tradeAction === "⚡ SCALP PROFIT") {
                tradeReason = `Decent profits achieved (+15%). Momentum stalling. Scalp it. ${metricsStr}`;
                actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30 animate-pulse";
                hasAction = true; actionButtonLabel = "SCALP CASHOUT"; actionTarget = "CASH";
            } else if (tradeAction === "⚡ SECURE PROFIT") {
                tradeReason = `Profit peaked at $${peak}. Momentum is flipping hard against you. Exit. ${metricsStr}`;
                actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30 animate-pulse";
                hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "CASH";
            } else if (tradeAction === "⚡ CUT LOSSES NOW" || tradeAction === "CUT LOSSES") {
                tradeReason = `Position bleeding past stop & acceleration is adverse. Exit immediately. ${metricsStr}`;
                actionColor = "text-rose-500"; actionBg = "bg-rose-500/10 border-rose-500/30";
                hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "SIT OUT";
            } else if (tradeAction === "REVERSE POSITION") {
                tradeReason = `Trend collapsed. Switch position. ${metricsStr}`;
                actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]";
                hasAction = true; actionButtonLabel = `REVERSE TO '${isYES ? 'NO' : 'YES'}'`; actionTarget = isYES ? "NO" : "YES";
            } else if (tradeAction === "MAX PROFIT REACHED") {
                tradeReason = `Odds > 85%. Stand by to lock in gains. ${metricsStr}`;
                actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
                hasAction = true; actionButtonLabel = "EXECUTE CASHOUT (PROFIT)"; actionTarget = "CASH";
            } else {
                tradeReason = `Holding position. Velocity supports trend. ${metricsStr}`;
                actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/20";
            }
        }

        let textColor = activePrediction === "YES" ? "text-emerald-400" : activePrediction === "NO" ? "text-rose-400" : "text-zinc-500";
        let predictionReason = "";
        if (activePrediction === "SIT OUT") predictionReason = "Waiting for structural divergence.";
        else if (realGapBps > 0 && activePrediction === "YES") predictionReason = "Firmly in profit. Holding steady.";
        else if (realGapBps < 0 && activePrediction === "NO") predictionReason = "Firmly in profit. Holding steady.";
        else predictionReason = "Position negative, holding firm through noise.";

        // Explicit Target Markers (T+5m and T+15m)
        let projections = [];
        let trendSlope = isNaN(v30s_bps) ? 0 : v30s_bps;
        if (activePrediction === "YES" && trendSlope <= 0) trendSlope = 5;
        if (activePrediction === "NO" && trendSlope >= 0) trendSlope = -5;
        
        const currentUnix = Math.floor(Date.now() / 1000);
        const p5 = currentPrice * (1 + (trendSlope / 10000) * 5);
        const p15 = currentPrice * (1 + (trendSlope / 10000) * 15);
        
        projections.push({ time: "T+5m", timestamp: currentUnix + 300, price: Number(p5) });
        projections.push({ time: "T+15m", timestamp: currentUnix + 900, price: Number(p15) });

        return { 
          confidence: String(activePrediction === "NO" ? (100 - posterior).toFixed(1) : posterior.toFixed(1)), 
          prediction: String(activePrediction), 
          predictionReason: String(predictionReason), 
          reasoning: reasoning.map(r => String(r)), 
          textColor: String(textColor), 
          rawProbAbove: Number(posterior),
          tradeAction: String(tradeAction), 
          tradeReason: String(tradeReason), 
          actionColor: String(actionColor), 
          actionBg: String(actionBg), 
          hasAction: Boolean(hasAction), 
          actionButtonLabel: String(actionButtonLabel), 
          actionTarget: String(actionTarget), 
          realGapBps: Number(realGapBps), 
          clockSeconds: Number(clockSeconds), 
          isSystemLocked: Boolean(isEndgameLock), 
          atrBps: Number(atrBps), 
          livePnL: Number(livePnL), 
          liveEstValue: Number(liveEstValue), 
          projections: projections,
          regime: String(regime), 
          aggrFlow: Number(aggrFlow), 
          bb: bb,
          kellyPct: Number(kellyPct),
          isPostDecay: Boolean(isPostDecay),
          isRugPull: Boolean(isRugPull)
        };
    } catch (err) {
        return { prediction: "SIT OUT", tradeAction: "CALCULATING...", rawProbAbove: 50, projections: [], reasoning: [], textColor: "text-zinc-500", actionColor: "text-zinc-500", actionBg: "bg-zinc-500/10" };
    }
  }, [currentPrice, liveHistory, targetMargin, timeState.minsRemaining, timeState.secsRemaining, timeState.currentHour, orderBook, forceRender, betAmount, maxPayout, currentOffer, globalFlow, liquidations, userPosition, windowType, isMounted, showRugPullAlerts, positionStatus, marketSessions]);

  // Audio Alerts & Voice Synthesis
  useEffect(() => {
    if (analysis?.hasAction && analysis.tradeAction !== prevActionRef.current) {
      if (soundEnabled && (analysis.tradeAction.includes("ENTRY SIGNAL") || analysis.tradeAction.includes("TAKE PROFIT") || analysis.tradeAction.includes("CUT LOSSES") || analysis.tradeAction.includes("TRAILING STOP") || analysis.tradeAction.includes("STOP HIT") || analysis.tradeAction.includes("SCALP"))) {
        playAlertSound();
      }
      if (voiceEnabled && window.speechSynthesis) {
        const msg = analysis.tradeAction.replace(/🚨|⚡|🔻/g, ''); 
        const utterance = new SpeechSynthesisUtterance("Tara Alert: " + msg);
        window.speechSynthesis.speak(utterance);
      }
    }
    prevActionRef.current = analysis?.tradeAction;
  }, [analysis?.tradeAction, soundEnabled, voiceEnabled]);

  const executeManualAction = (actionLabel, targetState) => {
    setManualAction(String(actionLabel));
    if (analysis) {
      broadcastToDiscord(`Action Executed: ${actionLabel}`, 3066993, [
         { name: "Spot Price", value: `$${currentPrice?.toFixed(2) || '---'}`, inline: true },
         { name: "Target Margin", value: `$${targetMargin?.toFixed(2) || '---'}`, inline: true },
         { name: "Live PnL", value: `$${analysis.livePnL.toFixed(2)}`, inline: false }
      ]);
    }
    if (targetState === "CASH" || targetState === "SIT OUT") {
        setUserPosition(null); 
        setPositionEntry(null);
    }
    if (analysis && (analysis.prediction === "YES" || analysis.prediction === "NO")) {
      const isWin = (analysis.prediction === "YES" && currentPrice > targetMargin) || (analysis.prediction === "NO" && currentPrice < targetMargin);
      if (isWin) updateScore(windowType, 'wins', 1);
      else updateScore(windowType, 'losses', 1);
    }
    if (targetState) {
      lockedPredictionRef.current = targetState === "CASH" ? "SIT OUT" : String(targetState);
      setForceRender(prev => prev + 1);
      setCurrentOffer(""); 
    }
  };

  const handleManualSync = (dir) => {
    lockedPredictionRef.current = String(dir);
    activeCallRef.current = { prediction: String(dir), strike: targetMargin };
    setUserPosition(String(dir));
    // Set Position Manager entry with 30% stop limit
    if(currentPrice){
      const stopPrice = dir === 'YES' ? currentPrice * 0.997 : currentPrice * 1.003; 
      setPositionEntry({price: currentPrice, side: dir, time: Date.now(), stopPrice});
    }
    setForceRender(prev => prev + 1);
    broadcastToDiscord(`Manual Sync: ${dir}`, 10181046, [
       { name: "Spot Price", value: `$${currentPrice?.toFixed(2) || '---'}`, inline: true },
       { name: "Target Margin", value: `$${targetMargin?.toFixed(2) || '---'}`, inline: true }
    ]);
  };

  const handleChatSubmit = (e) => {
    if (e.key === 'Enter' && chatInput.trim()) {
      const userText = chatInput.trim();
      const currentLog = [...chatLog, { role: 'user', text: userText }];
      setChatLog(currentLog);
      setChatInput("");
      setTimeout(() => {
        let reply = "";
        const ut = userText.toLowerCase();
        if (ut.includes("/broadcast")) {
            broadcastToDiscord(`Manual Status Broadcast`, 3447003, [
                { name: "Prediction", value: analysis?.prediction || 'SIT OUT', inline: true },
                { name: "Spot Price", value: `$${currentPrice?.toFixed(2)}`, inline: true },
                { name: "Regime", value: analysis?.regime || 'Unknown', inline: true }
            ]);
            reply = `Status successfully broadcasted to Discord.`;
        } else if (ut.includes("why") || ut.includes("explain")) {
          reply = `Currently, my posterior for YES is ${Number(analysis?.rawProbAbove || 0).toFixed(1)}%. We are in a ${String(analysis?.regime || 'CHOP')} regime.`;
        } else if (ut.includes("whale")) {
          reply = whaleLog.length>0 ? whaleLog.slice(0,10).map(w=>{const d=new Date(w.time);return`${d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})} ${w.src} ${w.side} $${(w.usd/1000).toFixed(0)}K @ $${w.price.toFixed(0)}`;}).join('\n') : "No whales yet.";
        } else if (ut.includes("position") || ut.includes("stop")) {
          reply = positionStatus ? `Position: ${positionStatus.side} @ $${positionStatus.entry.toFixed(2)}\nPnL: ${positionStatus.pnlPct>0?'+':''}${positionStatus.pnlPct.toFixed(2)}% \n${positionStatus.isStopHit?'🚨 STOP HIT — EXIT NOW':'Stop not hit.'}` : "No active position.";
        } else if (ut.includes("session")) {
          reply = `Active: ${marketSessions.sessions.map(s=>`${s.flag} ${s.name}`).join(' + ')}\nDominant: ${marketSessions.dominant}\nUTC: ${marketSessions.utcH}:00`;
        } else {
          reply = `P: ${Number(analysis?.rawProbAbove||0).toFixed(1)}%. ${analysis?.tradeAction}. Try: why, whale, position, session, broadcast.`;
        }
        setChatLog([...currentLog, { role: 'tara', text: reply }]);
      }, 500); 
    }
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-[#111312] flex items-center justify-center text-[#E8E9E4]/50 font-serif text-xl animate-pulse">Initializing Tara Terminal...</div>;
  }

  // Visual DOM calculation
  const totalDOM = (orderBook.localBuy + orderBook.localSell) || 1;
  const buyPct = (orderBook.localBuy / totalDOM) * 100;
  const sellPct = (orderBook.localSell / totalDOM) * 100;

  return (
    <div className="min-h-screen lg:h-screen bg-[#111312] text-[#E8E9E4] font-sans p-2 sm:p-3 flex flex-col selection:bg-[#E8E9E4]/20 overflow-y-auto">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col h-full gap-3 min-h-0">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-[#E8E9E4]/10 pb-2 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h1 className="text-lg md:text-xl font-serif tracking-tight text-white flex items-center gap-2">
              Tara <span className="hidden sm:flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> V78 Master
              </span>
              <span className="hidden md:flex items-center gap-1 text-[10px] ml-2">
                {marketSessions.sessions.map((s,i)=><span key={i} className={`${s.color} opacity-80`}>{s.flag}</span>)}
              </span>
            </h1>
            <div className="flex sm:hidden items-center gap-2">
              <button onClick={() => setShowWhaleLog(!showWhaleLog)} className="p-1.5 rounded-md bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 text-[10px]">🐋</button>
              <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-1.5 rounded-md border ${voiceEnabled ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'} transition-colors`}>
                {voiceEnabled ? <IC.Mic className="w-3.5 h-3.5" /> : <IC.MicOff className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setShowHelp(true)} className="p-1.5 rounded-md bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 hover:text-white transition-colors">
                <IC.Help className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex bg-[#111312] border border-[#E8E9E4]/20 rounded-lg p-1 shadow-inner w-full sm:w-auto justify-center">
            <button onClick={() => handleWindowToggle('5m')} className={`flex-1 sm:flex-none px-6 py-1 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${windowType === '5m' ? 'bg-indigo-500 text-white shadow-md' : 'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>5 Min</button>
            <button onClick={() => handleWindowToggle('15m')} className={`flex-1 sm:flex-none px-6 py-1 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${windowType === '15m' ? 'bg-emerald-500 text-white shadow-md' : 'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>15 Min</button>
          </div>
          <div className="hidden sm:flex text-right font-sans items-center gap-4">
            <div className="flex flex-col items-end pl-4">
              <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest mb-0.5">Current EST</div>
              <div className="text-sm font-serif text-[#E8E9E4]/90">{String(timeState.currentEST || '--:--:--')}</div>
            </div>
            <div className="flex items-center gap-2 border-l border-[#E8E9E4]/10 pl-4">
              <button onClick={() => setShowWhaleLog(!showWhaleLog)} className={`p-2 rounded-lg border ${showWhaleLog?'bg-purple-500/20 border-purple-500/40 text-purple-400':'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40'} hover:text-purple-400 transition-colors`} title="Global Whale Log">🐋</button>
              <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-2 rounded-lg border ${voiceEnabled ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'} transition-colors`} title="Toggle AI Voice Alerts">{voiceEnabled ? <IC.Mic className="w-4 h-4" /> : <IC.MicOff className="w-4 h-4" />}</button>
              <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 hover:text-indigo-400 transition-colors" title="Discord Webhook Settings"><IC.Link className="w-4 h-4" /></button>
              <button onClick={() => setShowHelp(true)} className="p-2 rounded-lg bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 hover:text-white transition-colors" title="Operations Manual"><IC.Help className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* STATS BAR & VISUAL DOM */}
        <div className="bg-[#181A19] p-2 sm:px-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col gap-2 shrink-0 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-70"></div>
           
           {/* Top Stats */}
           <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
               <div className="flex w-full lg:w-auto justify-between lg:justify-start items-center gap-4">
                 <div className="flex items-center gap-3 w-1/2 lg:w-auto pl-1 md:pl-2">
                   <div className="p-2 bg-[#111312] rounded-lg border border-[#E8E9E4]/5 shadow-inner"><IC.Zap className={`w-5 h-5 transition-colors duration-200 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-[#E8E9E4]/40'}`} /></div>
                   <div>
                     <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-0.5">Live Spot</div>
                     <div className={`text-lg sm:text-2xl font-serif tracking-tight flex items-center gap-1 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-white'}`}>${currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}</div>
                   </div>
                 </div>
                 <div className="flex lg:hidden flex-col items-center bg-[#111312] p-1.5 rounded-xl border border-[#E8E9E4]/5 shadow-inner w-1/2">
                   <div className="flex items-center justify-between w-full px-2">
                     <div className="flex flex-col items-center"><div className="text-[9px] text-emerald-400 mb-0.5">WINS</div><span className="text-lg font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins || 0)}</span></div>
                     <div className="h-6 w-px bg-[#E8E9E4]/10"></div>
                     <div className="flex flex-col items-center"><div className="text-[9px] text-rose-400 mb-0.5">LOSS</div><span className="text-lg font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses || 0)}</span></div>
                   </div>
                 </div>
               </div>
               <div className="w-px h-8 bg-[#E8E9E4]/10 hidden lg:block mx-2"></div>
               <div className="flex items-center gap-3 md:gap-6 w-full lg:w-auto bg-[#111312] p-2 rounded-xl border border-[#E8E9E4]/5 shadow-inner justify-between overflow-x-auto flex-1">
                 <div className="flex flex-col items-start pr-3 md:pr-6 border-r border-[#E8E9E4]/10 min-w-[120px]">
                   <div className="text-[9px] md:text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1">Strike</div>
                   <div className="flex items-center w-full"><IC.Crosshair className="w-3 h-3 md:w-4 md:h-4 text-indigo-400 mr-1 md:mr-2 opacity-80 hidden sm:block" /><input type="number" value={targetMargin === 0 ? '' : targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="bg-transparent border-none text-white font-serif text-base md:text-lg w-full focus:outline-none py-1 leading-normal" /></div>
                 </div>
                 <div className="flex flex-col items-start pr-3 md:pr-6 border-r border-[#E8E9E4]/10 min-w-[120px]">
                   <div className="text-[9px] md:text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1">Bet / Win</div>
                   <div className="flex items-center gap-1 text-white font-serif text-base w-full">$<input type="number" value={betAmount === 0 ? '' : betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-full text-center outline-none py-1 leading-normal" /><span className="text-[#E8E9E4]/40 mx-0.5">/</span>$<input type="number" value={maxPayout === 0 ? '' : maxPayout} onChange={(e) => setMaxPayout(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-full text-center outline-none py-1 leading-normal" /></div>
                 </div>
                 <div className="flex flex-col items-start pl-1 md:pl-2 min-w-[100px]">
                   <div className="text-[9px] md:text-[10px] text-emerald-400/80 uppercase tracking-widest font-medium mb-1">Live Offer</div>
                   <div className="flex items-center gap-1 text-emerald-400 font-serif text-base md:text-lg">$<input type="number" value={currentOffer} onChange={(e) => setCurrentOffer(e.target.value)} placeholder="0.00" className="bg-transparent border-b border-emerald-500/30 focus:border-emerald-400 w-full text-center outline-none placeholder-emerald-900 py-1 leading-normal" /></div>
                 </div>
               </div>
               <div className="w-px h-8 bg-[#E8E9E4]/10 hidden lg:block mx-2"></div>
               
               {/* Position Manager / Scorecard display */}
               <div className="hidden lg:flex flex-col items-start w-56">
                 {positionStatus ? (
                    <div className="w-full bg-[#111312] border border-amber-500/20 rounded-lg p-1.5 shadow-inner">
                      <div className="flex justify-between items-center w-full mb-0.5 px-1">
                        <span className="text-[9px] text-[#E8E9E4]/40 uppercase tracking-widest">POSITION</span>
                        <span className={`text-[9px] font-bold ${positionStatus.side==='YES'?'text-emerald-400':'text-rose-400'}`}>{positionStatus.side} @ ${positionStatus.entry.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between w-full px-1">
                        <span className={`text-lg font-serif font-bold ${positionStatus.pnlPct>0?'text-emerald-400':'text-rose-400'}`}>{positionStatus.pnlPct>0?'+':''}{positionStatus.pnlPct.toFixed(1)}%</span>
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${positionStatus.isStopHit?'text-rose-500 animate-pulse':'text-[#E8E9E4]/40'}`}>{positionStatus.isStopHit?'STOP HIT':'SAFE'}</span>
                      </div>
                    </div>
                 ) : (
                   <div className="w-full">
                     <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1 flex justify-between w-full"><span className="flex items-center gap-1.5"><IC.Terminal className="w-3.5 h-3.5"/> {String(windowType).toUpperCase()} SCORE</span></div>
                     <div className="flex items-center justify-between w-full px-2">
                       <div className="flex flex-col items-center">
                         <div className="flex items-center gap-1 text-[9px] text-emerald-400 mb-0.5"><button onClick={() => updateScore(windowType, 'wins', -1)}>-</button> W <button onClick={() => updateScore(windowType, 'wins', 1)}>+</button></div>
                         <span className="text-2xl font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins || 0)}</span>
                       </div>
                       <div className="h-8 w-px bg-[#E8E9E4]/10"></div>
                       <div className="flex flex-col items-center">
                         <div className="flex items-center gap-1 text-[9px] text-rose-400 mb-0.5"><button onClick={() => updateScore(windowType, 'losses', -1)}>-</button> L <button onClick={() => updateScore(windowType, 'losses', 1)}>+</button></div>
                         <span className="text-2xl font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses || 0)}</span>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
           </div>

           {/* Visual DOM */}
           <div className="w-full px-2 pt-1 border-t border-[#E8E9E4]/10 mt-1 hidden sm:block">
               <div className="flex justify-between items-center text-[8px] text-[#E8E9E4]/40 uppercase tracking-widest mb-1">
                   <span>Depth of Market (DOM)</span>
                   <span>{(orderBook.localBuy/totalDOM*100).toFixed(0)}% B / {(orderBook.localSell/totalDOM*100).toFixed(0)}% S</span>
               </div>
               <div className="w-full h-1.5 bg-[#111312] rounded-full overflow-hidden flex">
                   <div style={{ width: `${buyPct}%` }} className="h-full bg-emerald-500/80 transition-all duration-300"></div>
                   <div style={{ width: `${sellPct}%` }} className="h-full bg-rose-500/80 transition-all duration-300"></div>
               </div>
           </div>
        </div>

        {/* MIDDLE ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0 lg:h-[320px]">
          <div className="lg:col-span-4 bg-[#181A19] p-3 md:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col relative overflow-hidden h-full">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-30"></div>
             <div className="flex justify-between items-start mb-2">
               <div className="bg-[#111312] border border-[#E8E9E4]/10 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                 <IC.Clock className="w-3 h-3" /><span className="text-[#E8E9E4]/60 hidden sm:inline">{String(timeState.startWindowEST)}-{String(timeState.nextWindowEST)}</span>
                 <span className="text-[#E8E9E4]">{Number(timeState.minsRemaining)}m {Number(timeState.secsRemaining)}s</span>
                 {analysis?.isPostDecay && <span className="text-amber-400 ml-1">⚡</span>}
               </div>
               {analysis && analysis.tradeAction !== "SIT OUT" && analysis.prediction !== "ANALYZING" && (<button onClick={() => executeManualAction("MANUAL PULL OUT", "SIT OUT")} className="bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"><IC.Alert className="w-3 h-3" /> <span>Force Exit</span></button>)}
             </div>
             {isLoading || !analysis ? (<div className="text-lg font-serif text-[#E8E9E4]/30 animate-pulse mt-4 text-center w-full">Connecting...</div>) : (
               <div className="flex flex-col items-center w-full flex-1 justify-center">
                 <div className="flex flex-col items-center mb-4 mt-2"><span className="text-[9px] text-[#E8E9E4]/40 uppercase tracking-[0.2em] mb-1 font-bold">Prediction</span><h2 className={`text-[64px] sm:text-[72px] font-serif font-bold leading-none tracking-tight ${analysis.textColor} drop-shadow-lg transition-all flex items-center justify-center uppercase`}>{String(analysis.prediction)}</h2></div>
                 <div className={`w-full p-2.5 rounded-xl border-[1.5px] ${analysis.actionBg} transition-colors flex flex-col items-center text-center shadow-sm mt-auto`}>
                   <div className="flex items-center gap-1.5 mb-1"><IC.Bell className={`w-3.5 h-3.5 ${analysis.actionColor}`} /><span className="text-[9px] font-bold uppercase tracking-widest opacity-80 text-[#E8E9E4]">Advisor</span></div>
                   <div className={`text-sm sm:text-base font-serif font-bold mb-1 ${analysis.actionColor} uppercase`}>{String(analysis.tradeAction)}</div>
                   <p className="text-[9px] sm:text-[10px] opacity-80 text-[#E8E9E4] mb-2 leading-tight px-1">{String(analysis.tradeReason)}</p>
                   {analysis.hasAction && (<div className="w-full pt-2 border-t border-[#E8E9E4]/10">{manualAction === analysis.tradeAction ? (<div className="w-full bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5"><IC.Check className="w-3.5 h-3.5" /> Logged</div>) : (<button onClick={() => executeManualAction(analysis.tradeAction, analysis.actionTarget)} className={`w-full py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all hover:brightness-125 ${analysis.actionColor.includes('rose') ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : analysis.actionColor.includes('amber') ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'}`}>{String(analysis.actionButtonLabel)}</button>)}</div>)}
                 </div>
               </div>
             )}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3 h-full">
            <div className="flex gap-3 flex-1 min-h-0">
              <div className="flex-1 bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md flex flex-col justify-center">
                  <div className="text-[9px] sm:text-[10px] text-[#E8E9E4]/50 font-bold uppercase mb-1">POSTERIOR (UP)</div>
                  <div className="text-3xl sm:text-4xl xl:text-5xl font-serif text-indigo-300">{analysis ? `${Number(analysis.rawProbAbove || 0).toFixed(1)}%` : '--%'}</div>
                  {analysis?.kellyPct > 0 && <div className="text-[9px] text-indigo-400/80 mt-1">Kelly: {analysis.kellyPct.toFixed(1)}%</div>}
              </div>
              <div className="flex-1 bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md flex flex-col justify-center">
                  <div className="text-[9px] sm:text-[10px] text-[#E8E9E4]/50 font-bold uppercase mb-1">POSTERIOR (DN)</div>
                  <div className="text-3xl sm:text-4xl xl:text-5xl font-serif text-rose-300">{analysis ? `${(100 - Number(analysis.rawProbAbove || 0)).toFixed(1)}%` : '--%'}</div>
                  {analysis?.kellyPct > 0 && <div className="text-[9px] text-rose-400/80 mt-1">Kelly: {analysis.kellyPct.toFixed(1)}%</div>}
              </div>
            </div>
            {analysis && (<div className="bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md shrink-0"><h2 className="text-[9px] font-bold text-[#E8E9E4]/80 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><IC.TrendUp className="w-3.5 h-3.5 text-purple-400" /> T-Target Projections</h2><div className="grid grid-cols-2 gap-2">{analysis.projections.map((proj, idx) => (<div key={idx} className="bg-[#111312] rounded-lg p-1.5 text-center border border-[#E8E9E4]/5"><div className="text-[9px] text-[#E8E9E4]/40 font-bold uppercase mb-0.5">{String(proj.time)}</div><div className="text-[11px] font-serif text-purple-100">${Number(proj.price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>))}</div></div>)}
            {userPosition === null && (<div className="flex flex-col items-center gap-1.5 w-full shrink-0"><span className="text-[8px] uppercase tracking-widest text-[#E8E9E4]/40">Sync Position (Activates -30% Stop Guard):</span><div className="flex gap-2 w-full"><button onClick={() => handleManualSync("YES")} className="flex-1 py-1.5 border border-emerald-500/30 text-emerald-400 rounded-md text-[9px] uppercase font-bold tracking-widest hover:bg-emerald-500/10 transition-colors">I Entered YES</button><button onClick={() => handleManualSync("NO")} className="flex-1 py-1.5 border border-rose-500/30 text-rose-400 rounded-md text-[9px] uppercase font-bold tracking-widest hover:bg-rose-500/10 transition-colors">I Entered NO</button></div></div>)}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3 h-full">
             {analysis && (<div className="bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-0"><h2 className="text-[10px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-[#E8E9E4]/10 pb-1"><IC.Terminal className="w-3.5 h-3.5 text-amber-400" /> Engine Logs</h2><div className="space-y-1.5 font-mono flex-1 overflow-y-auto pr-1 custom-scrollbar">{(analysis.reasoning || []).map((reason, idx) => (<div key={idx} className={`bg-[#111312] p-2 rounded-md text-[8.5px] sm:text-[9px] ${reason.includes('RUG PULL') || reason.includes('CUT LOSSES') || reason.includes('CAP') || reason.includes('GRAVITY') ? 'text-rose-400 border border-rose-500/20' : reason.includes('PROFIT') || reason.includes('STOP HIT') ? 'text-emerald-400 border border-emerald-500/20' : 'text-[#E8E9E4]/70 border border-[#E8E9E4]/5'} flex items-start gap-1.5 uppercase`}><span className="text-emerald-500 mt-0.5">{'>'}</span><span className="leading-snug">{String(reason)}</span></div>))}</div></div>)}
             <div className="bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-0"><div className="flex justify-between items-center mb-2 border-b border-[#E8E9E4]/10 pb-1"><h2 className="text-[10px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest flex items-center gap-1.5"><IC.Globe className="w-3.5 h-3.5 text-blue-400" /> Live Wire</h2></div><div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">{newsEvents.length === 0 ? (<div className="text-[10px] text-[#E8E9E4]/40 italic">Generating market intel...</div>) : (newsEvents.map((news, i) => (<div key={i} className={`border-l-[2px] pl-2 py-0.5 ${news.type === 'rugpull' ? 'border-rose-500' : news.type === 'whale' ? 'border-purple-500' : 'border-indigo-500/40'}`}><span className={`text-[9px] sm:text-[10px] leading-tight ${news.type === 'rugpull' ? 'text-rose-400 font-bold' : news.type === 'whale' ? 'text-purple-300' : 'text-[#E8E9E4]/90'}`}>{String(news.title)}</span></div>)))}</div></div>
          </div>
        </div>

        {/* TRADINGVIEW CHART WIDGET */}
        <div className="w-full bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-lg flex flex-col flex-1 min-h-[300px] mt-2 relative z-10">
          <div className="flex justify-between items-center mb-2 border-b border-[#E8E9E4]/10 pb-2">
              <h2 className="text-[10px] font-bold text-[#E8E9E4]/80 uppercase tracking-[0.2em] flex items-center gap-2"><IC.Activity className="w-4 h-4 text-indigo-400" /> MULTI-TIMEFRAME CHART</h2>
              
              <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#111312] rounded-lg border border-[#E8E9E4]/5 overflow-hidden">
                      {['1m', '3m', '5m', '15m', '30m', '1h'].map(res => (
                          <button key={res} onClick={() => setChartRes(res)} className={`px-2 py-1 text-[9px] font-bold uppercase transition-colors ${chartRes === res ? 'bg-indigo-500/20 text-indigo-400' : 'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>
                              {res}
                          </button>
                      ))}
                  </div>

                  <div className="flex items-center gap-3 text-[9px] text-[#E8E9E4]/60 bg-[#111312] px-3 py-1 rounded-lg border border-[#E8E9E4]/5">
                    <label className="flex items-center gap-1 cursor-pointer hover:text-amber-400 transition-colors"><input type="checkbox" checked={showOverlays} onChange={(e) => setShowOverlays(e.target.checked)} className="accent-amber-500 w-3 h-3" /> EMA/BB</label>
                    <label className="flex items-center gap-1 cursor-pointer hover:text-purple-400 transition-colors"><input type="checkbox" checked={showCandles} onChange={(e) => setShowCandles(e.target.checked)} className="accent-purple-500 w-3 h-3" /> Candles</label>
                  </div>
              </div>
          </div>
          <div className="flex-1 w-full h-full relative rounded-md overflow-hidden bg-[#111312]">
            <LiveChart 
              resolution={chartRes}
              currentPrice={currentPrice} 
              targetMargin={targetMargin} 
              showCandles={showCandles} 
              rugPullActive={showRugPullAlerts && analysis?.isRugPull} 
              showOverlays={showOverlays} 
              bb={analysis?.bb}
              globalFlow={globalFlow}
              projections={analysis?.projections}
              prediction={analysis?.prediction}
              liquidations={liquidations}
            />
          </div>
        </div>
      </div>

      {/* WHALE LOG PANEL */}
      {showWhaleLog && (
        <div className="fixed top-16 right-4 z-50 w-80 bg-[#181A19] border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-[#111312] p-3 flex justify-between items-center border-b border-[#E8E9E4]/10">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">🐋 Whale Log</span>
            <button onClick={() => setShowWhaleLog(false)} className="opacity-50 hover:opacity-100"><IC.X className="w-4 h-4" /></button>
          </div>
          <div className="max-h-80 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {whaleLog.length === 0 ? (
              <div className="text-[10px] text-[#E8E9E4]/40 italic">Waiting for whale trades ({'>'}$200K)...</div>
            ) : (
              whaleLog.slice(0, 30).map((w, i) => {
                const d = new Date(w.time);
                return (
                  <div key={i} className={`flex items-center gap-2 text-[10px] p-2 rounded-md bg-[#111312] border ${w.side === 'BUY' ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                    <span className="text-[#E8E9E4]/40 font-mono shrink-0">{d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className={`font-bold ${w.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{w.side}</span>
                    <span className="text-[#E8E9E4]/80">${(w.usd / 1000).toFixed(0)}K</span>
                    <span className="text-[#E8E9E4]/40 text-[9px]">{w.src}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-md shadow-2xl p-6"><div className="flex justify-between items-center mb-4"><h2 className="text-lg font-serif text-white flex items-center gap-2"><IC.Link className="w-5 h-5 text-indigo-400" /> Discord Integration</h2><button onClick={() => setShowSettings(false)} className="text-[#E8E9E4]/50 hover:text-white"><IC.X className="w-5 h-5" /></button></div><p className="text-xs text-[#E8E9E4]/70 mb-4 leading-relaxed">Paste your Discord server's Webhook URL here. Tara will automatically broadcast entry signals, manual trade confirmations, and scorecard updates to your server.</p><input type="password" value={discordWebhook} onChange={(e) => setDiscordWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="w-full bg-[#111312] border border-[#E8E9E4]/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 text-white font-mono mb-6" /><button onClick={() => setShowSettings(false)} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-widest transition-colors">Save Configuration</button></div>
        </div>
      )}

      {/* CHAT WIDGET */}
      <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end transition-all ${isChatOpen ? 'w-[90vw] sm:w-80' : 'w-auto'}`}>
        {isChatOpen && (
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 shadow-2xl rounded-xl w-full mb-3 overflow-hidden flex flex-col h-[60vh] sm:h-96"><div className="bg-[#111312] p-3 flex justify-between items-center border-b border-[#E8E9E4]/10"><span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"><IC.Msg className="w-3.5 h-3.5 text-indigo-400" /> Chat w/ Tara</span><button onClick={() => setIsChatOpen(false)} className="opacity-50 hover:opacity-100"><IC.X className="w-4 h-4" /></button></div><div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111312]/50">{(chatLog || []).map((msg, i) => (<div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}><span className={`text-[10px] uppercase opacity-40 mb-1 ${msg.role === 'user' ? 'mr-1' : 'ml-1'}`}>{String(msg.role)}</span><div className={`text-xs p-2.5 rounded-lg max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-tr-none' : 'bg-[#2A2D2C] text-[#E8E9E4] border border-[#E8E9E4]/10 rounded-tl-none'} ${msg.isLoading ? 'animate-pulse' : ''}`}>{String(msg.text)}</div></div>))}</div><div className="p-3 bg-[#111312] border-t border-[#E8E9E4]/10"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatSubmit} placeholder={`Ask Tara about the ${windowType.toUpperCase()} window...`} className="w-full bg-[#181A19] border border-[#E8E9E4]/20 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-white" /></div></div>
        )}
        {!isChatOpen && (<button onClick={() => setIsChatOpen(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white p-3 rounded-full shadow-lg border border-indigo-400/50 flex items-center gap-2 transition-transform hover:scale-105"><IC.Msg className="w-5 h-5" /></button>)}
      </div>

      {/* OPERATIONS MANUAL */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl"><div className="sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center z-10"><h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2"><IC.Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" /> Tara Operations Manual (V78)</h2><button onClick={() => setShowHelp(false)} className="text-[#E8E9E4]/50 hover:text-white"><IC.X className="w-5 h-5" /></button></div>
            <div className="p-4 sm:p-6 space-y-6 text-xs sm:text-sm text-[#E8E9E4]/80">
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-xs">V78 Ultimate Features</h3><ul className="list-disc pl-4 space-y-2">
                <li><strong>Voice Synthesis:</strong> Toggle the Microphone icon in the header. Tara will literally speak her entry, scalp, and stop-loss calls out loud so you can look away from the screen.</li>
                <li><strong>Visual DOM & CVD:</strong> A live horizontal progress bar under the header shows the limit order depth, and the chart explicitly shows 30s Cumulative Volume Delta (CVD) in USD.</li>
                <li><strong>Liquidation Bubbles:</strong> When whales get liquidated (&gt;{'$10k'}), Red and Green arrows physically drop onto the chart exactly where it happened.</li>
                <li><strong>Kelly Criterion Risk:</strong> Tara now calculates the exact mathematical percentage of your bankroll you should risk based on the current Posterior odds.</li>
                <li><strong>Multi-Timeframe Engine:</strong> The chart now has 1m, 3m, 5m, 15m, 30m, and 1h resolution buttons. It fetches native Binance data for precise institutional technical analysis.</li>
              </ul></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-xs">Reality Capping & Gravity Well</h3><p className="leading-relaxed">If a trade is underwater by a massive margin, the engine physically caps the "UP" or "DOWN" probability at 20%, unconditionally shattering the hysteresis lock and forcing a correct exit. It will never output 99% on a losing trade again.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-xs">Position Manager (30% Stop)</h3><p className="leading-relaxed">When you sync a position (even if trading against Tara), she locks your entry price and calculates your live PnL%. If your position drops by 30%, she triggers a massive emergency exit alert to protect your capital.</p></section>
              <section><h3 className="text-indigo-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><IC.Globe className="w-4 h-4" /> Global Whale Log & Sessions</h3><p className="leading-relaxed">Click the 🐋 icon to track real-time orders over $200k from offshore exchanges. The header dynamically displays which market session (ASIA/EU/US) is currently driving volume.</p></section>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(232, 233, 228, 0.1); border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(232, 233, 228, 0.2); }`}} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TaraApp />
    </ErrorBoundary>
  );
}
