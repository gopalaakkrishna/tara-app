import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- ICONS ---
const IC={
Clock:()=><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
Crosshair:()=><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>,
Zap:({className})=><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
Terminal:()=><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
Alert:()=><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
Activity:({className})=><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
Bell:({className})=><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
Check:()=><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
TrendUp:()=><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
Globe:()=><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
Msg:()=><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
X:()=><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
Info:()=><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
Vol2:()=><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
VolX:()=><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>,
Help:()=><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ═══════════════════════════════════════
// INDICATORS
// ═══════════════════════════════════════
const calcEMA=(d,p)=>{if(!d||d.length<p)return[];const k=2/(p+1),r=new Array(d.length).fill(null);r[d.length-1]=d[d.length-1];for(let i=d.length-2;i>=0;i--)r[i]=d[i]*k+r[i+1]*(1-k);return r;};
const calcVWAP=(h)=>{if(!h||!h.length)return null;let t=0,v=0;h.forEach(c=>{t+=((c.h+c.l+c.c)/3)*c.v;v+=c.v;});return v===0?null:t/v;};
const calcRSI=(d,p=14)=>{if(!d||d.length<p+1)return 50;let ag=0,al=0;for(let i=1;i<=p;i++){const x=d[i-1]-d[i];if(x>0)ag+=x;else al-=x;}ag/=p;al/=p;for(let i=p+1;i<Math.min(d.length,p+30);i++){const x=d[i-1]-d[i];ag=(ag*(p-1)+Math.max(x,0))/p;al=(al*(p-1)+Math.max(-x,0))/p;}return al===0?100:100-(100/(1+(ag/al)));};
const calcATR=(h,p=14)=>{if(!h||h.length<p+1)return 0;let s=0;for(let i=0;i<p;i++){const H=h[i].h,L=h[i].l,pc=h[i+1]?.c||h[i].o;s+=Math.max(H-L,Math.abs(H-pc),Math.abs(L-pc));}return s/p;};
const calcMACD=(c)=>{if(!c||c.length<26)return{line:0,signal:0,hist:0};const e12=calcEMA(c,12),e26=calcEMA(c,26);if(!e12.length||!e26.length)return{line:0,signal:0,hist:0};const ml=e12.map((v,i)=>(v!==null&&e26[i]!==null)?v-e26[i]:0);const sl=calcEMA(ml,9);return{line:ml[0]||0,signal:sl[0]||0,hist:(ml[0]||0)-(sl[0]||0)};};
const calcBB=(c,p=20)=>{if(!c||c.length<p)return{upper:0,mid:0,lower:0,pctB:0.5,width:0};const s=c.slice(0,p),m=s.reduce((a,b)=>a+b,0)/p,sd=Math.sqrt(s.reduce((a,b)=>a+Math.pow(b-m,2),0)/p);const u=m+2*sd,l=m-2*sd;return{upper:u,mid:m,lower:l,pctB:(u-l)>0?(c[0]-l)/(u-l):0.5,width:m>0?((u-l)/m)*10000:0};};

// ═══════════════════════════════════════
// MARKET SESSION DETECTOR
// Determines which global market (Asia/EU/US) is active
// and which has dominant volume
// ═══════════════════════════════════════
const getMarketSessions = () => {
  const now = new Date();
  const utcH = now.getUTCHours();
  // Session windows (UTC)
  const asia = utcH >= 0 && utcH < 9;   // Tokyo 9am-6pm JST = 0-9 UTC
  const eu = utcH >= 7 && utcH < 16;     // London 8am-5pm GMT = 7-16 UTC (overlap w/ Asia 7-9)
  const us = utcH >= 13 && utcH < 22;    // NY 9am-5pm EST = 13-22 UTC (overlap w/ EU 13-16)
  const sessions = [];
  if (asia) sessions.push({ name: 'ASIA', flag: '🌏', color: 'text-amber-400' });
  if (eu) sessions.push({ name: 'EU', flag: '🌍', color: 'text-blue-400' });
  if (us) sessions.push({ name: 'US', flag: '🌎', color: 'text-emerald-400' });
  // Dominant = last in the list (most recent open)
  const dominant = sessions.length > 0 ? sessions[sessions.length - 1].name : 'OFF-HOURS';
  return { sessions, dominant, utcH };
};

// ═══════════════════════════════════════
// VELOCITY ENGINE
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
      const cpnl=((price-target)/target)*10000;
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

// ═══════════════════════════════════════
// GLOBAL TAPE (Coinbase+Binance+Bybit)
// Now includes whale log with timestamps
// ═══════════════════════════════════════
const useGlobalTape = () => {
  const tapeRef = useRef({ coinbase:{buys:0,sells:0},binanceFutures:{buys:0,sells:0},bybit:{buys:0,sells:0},globalBuys:0,globalSells:0,globalImbalance:1,cbFlow:0,bnFlow:0,byFlow:0,divergence:0,whaleAlerts:[],binancePrice:0,bybitPrice:0 });
  const ticksRef = useRef([]);
  const [whaleLog, setWhaleLog] = useState([]); // V70: Persistent whale log
  const [globalFlow, setGlobalFlow] = useState({ imbalance:1,divergence:0,whaleAlert:null,feeds:0 });

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
      setGlobalFlow({imbalance:gI,divergence:div,whaleAlert:rW||null,feeds:feedCount});
    },1000);

    return()=>{clearInterval(aggIv);if(wsBN?.readyState===1)wsBN.close();if(wsBY?.readyState===1)wsBY.close();};
  },[]);

  return {tapeRef,globalFlow,ticksRef,whaleLog};
};

// ═══════════════════════════════════════
// BLOOMBERG DATA
// ═══════════════════════════════════════
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
// V70 ENHANCED INTERACTIVE CHART
// EMA overlays, BB bands, OHLCV tooltip,
// animated price line, volume profile
// ═══════════════════════════════════════
const LiveChart = ({ data, currentPrice, targetMargin, showCandles, rugPullActive, showOverlays, bb, ema9, ema21 }) => {
  const canvasRef=useRef(null),containerRef=useRef(null);
  const [hoverPos,setHoverPos]=useState(null),[zoom,setZoom]=useState(1),[pan,setPan]=useState(0),[dims,setDims]=useState({width:0,height:0});
  const isDrag=useRef(false),lastMX=useRef(0),lastTX=useRef(null),initPinch=useRef(null),maxPanR=useRef(0),spR=useRef(10);
  const animFrame=useRef(0);

  useEffect(()=>{const c=containerRef.current;if(!c)return;const ro=new ResizeObserver(e=>{for(let en of e)setDims({width:en.contentRect.width,height:en.contentRect.height});});ro.observe(c);return()=>ro.disconnect();},[]);
  useEffect(()=>{const cv=canvasRef.current;if(!cv)return;const h=(e)=>{e.preventDefault();if(Math.abs(e.deltaX)>Math.abs(e.deltaY))setPan(p=>Math.max(0,Math.min(maxPanR.current,p-e.deltaX/spR.current)));else setZoom(p=>Math.max(1,Math.min(20,p-e.deltaY*0.005)));};cv.addEventListener('wheel',h,{passive:false});return()=>cv.removeEventListener('wheel',h);},[]);

  useEffect(()=>{
    const cv=canvasRef.current;if(!cv||!data||!data.length||!dims.width)return;
    const ctx=cv.getContext('2d');const dpr=window.devicePixelRatio||1;cv.width=dims.width*dpr;cv.height=dims.height*dpr;ctx.scale(dpr,dpr);
    const W=dims.width,H=dims.height,RM=65,BM=25,cW=W-RM,cH=H-BM,vH=cH*0.22,pH=cH-vH;
    ctx.clearRect(0,0,W,H);

    const vd=[...data].reverse().filter(d=>d.h!==undefined);
    const vc=Math.max(15,Math.floor(vd.length/zoom));const mp=Math.max(0,vd.length-vc);maxPanR.current=mp;
    const cp=Math.max(0,Math.min(pan,mp));const si=Math.max(0,vd.length-vc-Math.floor(cp)),ei=Math.max(0,vd.length-Math.floor(cp));
    const view=vd.slice(si,ei);if(!view.length)return;

    let minP=Math.min(...view.map(d=>d.l)),maxP=Math.max(...view.map(d=>d.h)),maxV=Math.max(...view.map(d=>d.v||0.1));
    if(targetMargin>0){minP=Math.min(minP,targetMargin-50);maxP=Math.max(maxP,targetMargin+50);}
    const pad=(maxP-minP)*0.1||10,sY=pH/(maxP-minP+pad*2),yO=maxP+pad,vS=vH/(maxV*1.1);
    const sp=cW/view.length;spR.current=sp;const cw=Math.max(1,sp*0.6);

    // Grid
    ctx.strokeStyle='rgba(232,233,228,0.04)';ctx.fillStyle='rgba(232,233,228,0.35)';ctx.font='10px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';ctx.lineWidth=1;
    for(let i=0;i<=5;i++){const y=(pH/5)*i,p=maxP+pad-(y/sY);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cW,y);ctx.stroke();if(i<5)ctx.fillText('$'+p.toFixed(0),cW+4,y);}
    ctx.textAlign='center';ctx.textBaseline='top';
    for(let i=1;i<5;i++){const x=(cW/5)*i;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,cH);ctx.stroke();const di=Math.floor(x/sp);if(view[di]?.time){const t=view[di].time,d=new Date(t>1e11?t:t*1000);ctx.fillText(d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'}),x,cH+5);}}

    // BB BANDS overlay (V70: rendered as shaded area)
    if(showOverlays&&bb&&bb.upper>0){
      const closes=[...data].reverse().map(d=>d.c);
      // Draw BB for each visible candle
      ctx.beginPath();
      let started=false;
      view.forEach((c,i)=>{
        const idx=si+i;const slice=closes.slice(idx,idx+20);if(slice.length<20)return;
        const m=slice.reduce((a,b)=>a+b,0)/20;const sd=Math.sqrt(slice.reduce((a,b)=>a+Math.pow(b-m,2),0)/20);
        const x=i*sp+sp/2,yU=(yO-(m+2*sd))*sY;
        if(!started){ctx.moveTo(x,yU);started=true;}else ctx.lineTo(x,yU);
      });
      // Go back for lower band
      for(let i=view.length-1;i>=0;i--){
        const idx=si+i;const slice=closes.slice(idx,idx+20);if(slice.length<20)continue;
        const m=slice.reduce((a,b)=>a+b,0)/20;const sd=Math.sqrt(slice.reduce((a,b)=>a+Math.pow(b-m,2),0)/20);
        const x=i*sp+sp/2,yL=(yO-(m-2*sd))*sY;
        ctx.lineTo(x,yL);
      }
      ctx.closePath();ctx.fillStyle='rgba(99,102,241,0.06)';ctx.fill();
      ctx.strokeStyle='rgba(99,102,241,0.2)';ctx.lineWidth=1;ctx.stroke();
    }

    // EMA overlays (V70)
    if(showOverlays){
      const closes=[...data].reverse().map(d=>d.c);
      const drawEMA=(period,color)=>{
        const ema=calcEMA(closes,period);if(!ema.length)return;
        ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=1.2;
        let started=false;
        view.forEach((c,i)=>{
          const idx=si+i;if(ema[idx]===null)return;
          const x=i*sp+sp/2,y=(yO-ema[idx])*sY;
          if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);
        });
        ctx.stroke();
      };
      drawEMA(9,'rgba(251,191,36,0.6)');  // Gold EMA9
      drawEMA(21,'rgba(168,85,247,0.6)'); // Purple EMA21
    }

    // Strike line
    if(targetMargin>0){const tY=(yO-targetMargin)*sY;if(tY>0&&tY<pH){ctx.strokeStyle='rgba(99,102,241,0.5)';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(0,tY);ctx.lineTo(cW,tY);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(99,102,241,0.2)';ctx.fillRect(cW,tY-10,RM,20);ctx.fillStyle='#818cf8';ctx.textAlign='left';ctx.font='bold 10px sans-serif';ctx.fillText(targetMargin.toFixed(2),cW+5,tY);}}

    // Volume bars with gradient
    view.forEach((c,i)=>{const x=i*sp+sp/2,bull=c.c>=c.o;const barH=(c.v||0)*vS;
      const g=ctx.createLinearGradient(x,cH-barH,x,cH);
      g.addColorStop(0,bull?'rgba(52,211,153,0.3)':'rgba(251,113,133,0.3)');
      g.addColorStop(1,bull?'rgba(52,211,153,0.05)':'rgba(251,113,133,0.05)');
      ctx.fillStyle=g;ctx.fillRect(x-cw/2,cH-barH,cw,barH);
    });

    // Candles or line
    if(showCandles){view.forEach((c,i)=>{const x=i*sp+sp/2,bull=c.c>=c.o,col=bull?'#34d399':'#fb7185';ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,(yO-c.h)*sY);ctx.lineTo(x,(yO-c.l)*sY);ctx.stroke();ctx.fillStyle=col;ctx.fillRect(x-cw/2,(yO-Math.max(c.o,c.c))*sY,cw,Math.max(2,Math.abs(c.c-c.o)*sY));});}
    else{ctx.beginPath();view.forEach((c,i)=>{const x=i*sp+sp/2,y=(yO-c.c)*sY;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.strokeStyle='#c084fc';ctx.lineWidth=2;ctx.stroke();ctx.lineTo(cW,pH);ctx.lineTo(0,pH);ctx.closePath();const g=ctx.createLinearGradient(0,0,0,pH);g.addColorStop(0,'rgba(192,132,252,0.15)');g.addColorStop(1,'rgba(192,132,252,0)');ctx.fillStyle=g;ctx.fill();}

    // Current price (animated glow)
    if(currentPrice){const cY=(yO-currentPrice)*sY;if(cY>0&&cY<pH){
      const col=rugPullActive?'#fb7185':'#34d399';
      // Glow effect
      ctx.shadowColor=col;ctx.shadowBlur=8;
      ctx.strokeStyle=col;ctx.lineWidth=rugPullActive?2.5:1.5;ctx.setLineDash([6,3]);ctx.beginPath();ctx.moveTo(0,cY);ctx.lineTo(cW,cY);ctx.stroke();ctx.setLineDash([]);
      ctx.shadowBlur=0;
      // Price label with rounded bg
      ctx.fillStyle=col;
      const labelW=RM,labelH=22,labelX=cW,labelY=cY-labelH/2;
      ctx.beginPath();ctx.roundRect(labelX,labelY,labelW,labelH,4);ctx.fill();
      ctx.fillStyle='#111312';ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='bold 11px sans-serif';
      ctx.fillText('$'+currentPrice.toFixed(2),cW+4,cY);
    }}

    if(rugPullActive){ctx.fillStyle='rgba(251,113,133,0.08)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fb7185';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText("🚨 RUG PULL",W/2,H/2);}

    // HOVER: Rich OHLCV tooltip (V70)
    if(hoverPos&&hoverPos.x<cW&&hoverPos.y<cH){
      ctx.strokeStyle='rgba(232,233,228,0.15)';ctx.lineWidth=1;ctx.setLineDash([2,2]);
      ctx.beginPath();ctx.moveTo(hoverPos.x,0);ctx.lineTo(hoverPos.x,cH);ctx.stroke();
      if(hoverPos.y<pH){ctx.beginPath();ctx.moveTo(0,hoverPos.y);ctx.lineTo(cW,hoverPos.y);ctx.stroke();}
      ctx.setLineDash([]);

      const di=Math.floor(hoverPos.x/sp);
      if(view[di]){
        const c=view[di];
        // OHLCV tooltip box
        const bull=c.c>=c.o;
        const tooltipW=170,tooltipH=80;
        let tx=hoverPos.x+15,ty=hoverPos.y-40;
        if(tx+tooltipW>cW)tx=hoverPos.x-tooltipW-15;
        if(ty<0)ty=5;if(ty+tooltipH>cH)ty=cH-tooltipH-5;

        ctx.fillStyle='rgba(24,26,25,0.95)';ctx.strokeStyle='rgba(232,233,228,0.15)';ctx.lineWidth=1;
        ctx.beginPath();ctx.roundRect(tx,ty,tooltipW,tooltipH,6);ctx.fill();ctx.stroke();

        ctx.font='bold 10px sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
        ctx.fillStyle=bull?'#34d399':'#fb7185';
        if(c.time){const d=new Date(c.time>1e11?c.time:c.time*1000);ctx.fillText(d.toLocaleString('en-US',{hour12:false,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}),tx+8,ty+8);}

        ctx.font='10px sans-serif';ctx.fillStyle='#E8E9E4';
        const chg=((c.c-c.o)/c.o*100).toFixed(2);
        ctx.fillText(`O: $${c.o.toFixed(2)}   H: $${c.h.toFixed(2)}`,tx+8,ty+24);
        ctx.fillText(`L: $${c.l.toFixed(2)}   C: $${c.c.toFixed(2)}`,tx+8,ty+38);
        ctx.fillStyle=bull?'#34d399':'#fb7185';
        ctx.fillText(`${bull?'+':''}${chg}%   Vol: ${c.v?.toFixed(2)||'—'}`,tx+8,ty+54);

        // Dot on price line
        if(!showCandles){
          const dotX=di*sp+sp/2,dotY=(yO-c.c)*sY;
          ctx.beginPath();ctx.arc(dotX,dotY,5,0,2*Math.PI);
          ctx.fillStyle='#c084fc';ctx.shadowBlur=12;ctx.shadowColor='#c084fc';ctx.fill();ctx.shadowBlur=0;
        }
      }

      // Price label on Y axis
      if(hoverPos.y<pH){const hp=yO-(hoverPos.y/sY);ctx.fillStyle='#2A2D2C';ctx.fillRect(cW,hoverPos.y-10,RM,20);ctx.fillStyle='#E8E9E4';ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='10px sans-serif';ctx.fillText(hp.toFixed(2),cW+5,hoverPos.y);}
    }
  },[data,currentPrice,zoom,pan,hoverPos,showCandles,targetMargin,rugPullActive,dims,showOverlays,bb]);

  const hMD=(e)=>{isDrag.current=true;lastMX.current=e.clientX;};
  const hMM=(e)=>{const r=containerRef.current.getBoundingClientRect();setHoverPos({x:e.clientX-r.left,y:e.clientY-r.top});if(isDrag.current){setPan(p=>Math.max(0,Math.min(maxPanR.current,p+(e.clientX-lastMX.current)/spR.current)));lastMX.current=e.clientX;}};
  const hMU=()=>{isDrag.current=false;};const hML=()=>{setHoverPos(null);isDrag.current=false;};
  const hTS=(e)=>{if(e.touches.length===1){isDrag.current=true;lastTX.current=e.touches[0].clientX;const r=containerRef.current.getBoundingClientRect();setHoverPos({x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top});}else if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;initPinch.current=Math.sqrt(dx*dx+dy*dy);setHoverPos(null);}};
  const hTM=(e)=>{if(e.touches.length===1&&isDrag.current){const dx=e.touches[0].clientX-lastTX.current;setPan(p=>Math.max(0,Math.min(maxPanR.current,p+dx/spR.current)));lastTX.current=e.touches[0].clientX;const r=containerRef.current.getBoundingClientRect();setHoverPos({x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top});}else if(e.touches.length===2&&initPinch.current){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY,dist=Math.sqrt(dx*dx+dy*dy);setZoom(p=>Math.max(1,Math.min(20,p+(dist-initPinch.current)*0.05)));initPinch.current=dist;}};
  const hTE=()=>{isDrag.current=false;initPinch.current=null;setHoverPos(null);};

  return(<div ref={containerRef} className="w-full h-full relative cursor-crosshair" style={{touchAction:'none'}}><canvas ref={canvasRef} className="absolute inset-0 w-full h-full" onMouseDown={hMD} onMouseMove={hMM} onMouseUp={hMU} onMouseLeave={hML} onTouchStart={hTS} onTouchMove={hTM} onTouchEnd={hTE} onTouchCancel={hTE}/></div>);
};

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function App() {
  const [isMounted,setIsMounted]=useState(false);
  const [showCandles,setShowCandles]=useState(true);
  const [showOverlays,setShowOverlays]=useState(true); // V70: EMA+BB toggle
  const [showWhaleAlerts,setShowWhaleAlerts]=useState(true);
  const [showRugPullAlerts,setShowRugPullAlerts]=useState(true);
  const [currentPrice,setCurrentPrice]=useState(null);
  const [tickDirection,setTickDirection]=useState(null);
  const currentPriceRef=useRef(null);
  const tickHistoryRef=useRef([]);
  const lastPriceSourceRef=useRef({source:'none',time:0});
  const [history,setHistory]=useState([]);
  const [orderBook,setOrderBook]=useState({localBuy:0,localSell:0,imbalance:1});
  const [liquidations,setLiquidations]=useState([]);
  const [newsEvents,setNewsEvents]=useState([]);
  const [targetMargin,setTargetMargin]=useState(0);
  const [betAmount,setBetAmount]=useState(0);
  const [maxPayout,setMaxPayout]=useState(0);
  const [currentOffer,setCurrentOffer]=useState("");
  const [windowType,setWindowType]=useState('15m');
  const [timeState,setTimeState]=useState({currentEST:'',startWindowEST:'',nextWindowEST:'',minsRemaining:0,secsRemaining:0,currentHour:0});
  const [isLoading,setIsLoading]=useState(true);
  const lockedPredictionRef=useRef("SIT OUT");
  const activeCallRef=useRef({prediction:"SIT OUT",strike:0});
  const hasReversedRef=useRef(false);
  const lastAdvisedRef=useRef("SIT OUT");
  const [scorecards,setScorecards]=useState({'15m':{wins:132,losses:100},'5m':{wins:10,losses:7}});
  useEffect(()=>{setIsMounted(true);try{const s=localStorage.getItem('btcOracleV70');if(s)setScorecards(JSON.parse(s));}catch(e){}},[]);
  const [manualAction,setManualAction]=useState(null);
  const [forceRender,setForceRender]=useState(0);
  const [isChatOpen,setIsChatOpen]=useState(false);
  const [chatLog,setChatLog]=useState([{role:'tara',text:"Tara V70. 3-exchange tape. Bloomberg feeds. Position manager with 30% stop. Whale log. Market sessions. Enhanced chart with EMA/BB overlays."}]);
  const [chatInput,setChatInput]=useState("");
  const lastWindowRef=useRef("");
  const [userPosition,setUserPosition]=useState(null);
  const [showHelp,setShowHelp]=useState(false);
  const [soundEnabled,setSoundEnabled]=useState(false);
  const prevActionRef=useRef(null);

  // V70: Position Manager State
  const [positionEntry, setPositionEntry] = useState(null); // { price, side, time, stopPrice }
  const [showWhaleLog, setShowWhaleLog] = useState(false);

  // HOOKS
  const velocityRef=useVelocity(tickHistoryRef,currentPrice,targetMargin);
  const bloomberg=useBloomberg();
  const {tapeRef,globalFlow,ticksRef,whaleLog}=useGlobalTape();
  const marketSessions=useMemo(()=>getMarketSessions(),[timeState.currentEST]);

  useEffect(()=>{if(isMounted&&typeof window!=='undefined'){try{localStorage.setItem('btcOracleV70',JSON.stringify(scorecards));}catch(e){}}},[scorecards,isMounted]);
  const liveHistory=useMemo(()=>{if(!history.length||!currentPrice)return history;const u=[...history];u[0]={...u[0],c:currentPrice,h:Math.max(u[0].h||currentPrice,currentPrice),l:Math.min(u[0].l||currentPrice,currentPrice)};return u;},[history,currentPrice]);
  const playAlertSound=()=>{if(!soundEnabled||typeof window==='undefined')return;try{const ac=new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator();const g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(587.33,ac.currentTime);g.gain.setValueAtTime(0.1,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.5);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+0.5);}catch(e){}};
  const handleWindowToggle=(t)=>{if(t===windowType)return;setWindowType(t);lockedPredictionRef.current="SIT OUT";activeCallRef.current={prediction:"SIT OUT",strike:currentPrice};hasReversedRef.current=false;lastAdvisedRef.current="SIT OUT";setUserPosition(null);setManualAction(null);setCurrentOffer("");setBetAmount(0);setMaxPayout(0);lastWindowRef.current="";setPositionEntry(null);setForceRender(p=>p+1);};
  const updateScore=(t,wl,a)=>setScorecards(p=>({...p,[t]:{...p[t],[wl]:Math.max(0,(p[t]?.[wl]||0)+a)}}));

  // V70: Position Manager — calculates stop loss and PnL
  const positionStatus = useMemo(() => {
    if (!positionEntry || !currentPrice) return null;
    const { price: entry, side, stopPrice } = positionEntry;
    const pnlPct = side === 'YES' 
      ? ((currentPrice - entry) / entry) * 100
      : ((entry - currentPrice) / entry) * 100;
    const isStopHit = pnlPct <= -30;
    const pnlDollar = betAmount > 0 ? betAmount * (pnlPct / 100) : 0;
    return { entry, side, pnlPct, pnlDollar, stopPrice, isStopHit };
  }, [positionEntry, currentPrice, betAmount]);

  // Check for 30% stop hit
  useEffect(() => {
    if (positionStatus?.isStopHit && positionEntry) {
      // Trigger stop loss alert
      setChatLog(prev => [...prev, { role: 'tara', text: `🚨 30% STOP LOSS HIT. Entry: $${positionEntry.price.toFixed(2)}, Current: $${currentPrice?.toFixed(2)}. PnL: ${positionStatus.pnlPct.toFixed(1)}%. Recommending immediate exit.` }]);
    }
  }, [positionStatus?.isStopHit]);

  // Window Rollover
  useEffect(()=>{if(timeState.nextWindowEST&&timeState.nextWindowEST!==lastWindowRef.current){if(currentPrice!==null){if(lastWindowRef.current!==""){const pc=activeCallRef.current;if(pc.prediction==="YES"){if(currentPrice>pc.strike)updateScore(windowType,'wins',1);else if(currentPrice<pc.strike)updateScore(windowType,'losses',1);}else if(pc.prediction==="NO"){if(currentPrice<pc.strike)updateScore(windowType,'wins',1);else if(currentPrice>pc.strike)updateScore(windowType,'losses',1);}}setTargetMargin(currentPrice);lockedPredictionRef.current="SIT OUT";activeCallRef.current={prediction:"SIT OUT",strike:currentPrice};hasReversedRef.current=false;lastAdvisedRef.current="SIT OUT";setUserPosition(null);lastWindowRef.current=timeState.nextWindowEST;setManualAction(null);tickHistoryRef.current=[];setCurrentOffer("");setBetAmount(0);setMaxPayout(0);setPositionEntry(null);}}},[timeState.nextWindowEST,currentPrice,windowType]);

  // Coinbase WS
  useEffect(()=>{if(typeof window==='undefined')return;let isC=false;try{isC=window.self!==window.top;}catch(e){isC=true;}let wsCB=null,wsBL=null,lastVU=0;
    const upd=(np,src)=>{currentPriceRef.current=np;const now=Date.now();lastPriceSourceRef.current={source:src,time:now};if(now-lastVU>300){setCurrentPrice(p=>{if(p!==null&&np!==p)setTickDirection(np>p?'up':'down');return np;});lastVU=now;}};
    const init=()=>{if(isC)return;
      try{wsCB=new WebSocket('wss://ws-feed.exchange.coinbase.com');wsCB.onopen=()=>wsCB.send(JSON.stringify({type:'subscribe',product_ids:['BTC-USD'],channels:['ticker']}));wsCB.onmessage=(e)=>{try{const d=JSON.parse(e.data);if(d.type==='ticker'&&d.price){const p=parseFloat(d.price),s=parseFloat(d.last_size)||0;upd(p,'coinbase');const now=Date.now();const tick={p,s,t:d.side==='sell'?'B':'S',time:now};tickHistoryRef.current.push(tick);tickHistoryRef.current=tickHistoryRef.current.filter(t=>now-t.time<60000);if(ticksRef.current)ticksRef.current.push({...tick,usd:p*s,src:'cb'});}}catch(er){}};}catch(e){}
      try{wsBL=new WebSocket('wss://fstream.binance.com/ws/btcusdt@forceOrder');wsBL.onmessage=(e)=>{try{const d=JSON.parse(e.data);if(d.e==='forceOrder'){const uv=parseFloat(d.o.q)*parseFloat(d.o.p);if(uv>10000)setLiquidations(p=>[...p,{side:d.o.S,value:uv,time:Date.now()}].filter(l=>Date.now()-l.time<60000));}}catch(er){}};}catch(e){}};
    init();return()=>{if(wsCB?.readyState===1){wsCB.send(JSON.stringify({type:'unsubscribe',product_ids:['BTC-USD'],channels:['ticker']}));wsCB.close();}if(wsBL?.readyState===1)wsBL.close();};},[]);

  // REST Fallback
  useEffect(()=>{let lu=0;const f=async()=>{try{const r=await fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker');if(!r.ok)return;const d=await r.json();if(d.price){const p=parseFloat(d.price),now=Date.now();if(lastPriceSourceRef.current.source!=='coinbase'||now-lastPriceSourceRef.current.time>2000){currentPriceRef.current=p;lastPriceSourceRef.current={source:'rest',time:now};if(now-lu>300){setCurrentPrice(pr=>{if(pr!==null&&p!==pr)setTickDirection(p>pr?'up':'down');return p;});lu=now;}}tickHistoryRef.current.push({p,s:parseFloat(d.size||0.1),t:'B',time:Date.now()});tickHistoryRef.current=tickHistoryRef.current.filter(t=>Date.now()-t.time<60000);}}catch(e){}};f();const i=setInterval(f,1500);return()=>clearInterval(i);},[]);

  // Heavy Polling
  useEffect(()=>{const f=async()=>{try{const g=windowType==='15m'?900:300;try{const r=await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${g}`);if(r.ok){const d=await r.json();if(Array.isArray(d)){const fm=d.slice(0,60).map(c=>({time:c[0],l:parseFloat(c[1]),h:parseFloat(c[2]),o:parseFloat(c[3]),c:parseFloat(c[4]),v:parseFloat(c[5])}));if(fm.length>0)setHistory(fm);}}}catch(e){}try{const r=await fetch('https://api.exchange.coinbase.com/products/BTC-USD/book?level=2');if(r.ok){const d=await r.json();if(d?.bids&&d?.asks){let lb=0,ls=0;d.bids.forEach(([p,s])=>{if(p<=targetMargin&&p>=targetMargin-150)lb+=parseFloat(s);});d.asks.forEach(([p,s])=>{if(p>=targetMargin&&p<=targetMargin+150)ls+=parseFloat(s);});setOrderBook({localBuy:lb,localSell:ls,imbalance:ls===0?1:lb/ls});}}}catch(e){}setIsLoading(false);}catch(e){setIsLoading(false);}};f();const i=setInterval(f,5000);return()=>clearInterval(i);},[targetMargin,windowType]);

  useEffect(()=>{if(targetMargin===0&&currentPrice)setTargetMargin(currentPrice);},[currentPrice,targetMargin]);

  // News Wire
  useEffect(()=>{let news=[];
    if(Math.abs(globalFlow.divergence)>0.3)news.push({title:`⚠️ DIVERGENCE: Spot vs Derivatives ${globalFlow.divergence>0?'accumulation':'retail trap'}`,type:'whale'});
    if(globalFlow.whaleAlert)news.push({title:`🐋 $${(globalFlow.whaleAlert.usd/1000).toFixed(0)}K ${globalFlow.whaleAlert.side} on ${globalFlow.whaleAlert.src}`,type:'whale'});
    if(showWhaleAlerts){if(globalFlow.imbalance>2.0)news.push({title:`Global tape: BUY dominant (${globalFlow.feeds+1} feeds)`,type:'whale'});if(globalFlow.imbalance<0.5)news.push({title:`Global tape: SELL dominant`,type:'whale'});}
    if(bloomberg.status==='live'){
      if(Math.abs(bloomberg.fundingRate)>0.0005)news.push({title:`💰 Fund: ${(bloomberg.fundingRate*100).toFixed(4)}% ${bloomberg.fundingRate>0?'(longs pay)':'(shorts pay)'}`,type:'info'});
      if(Math.abs(bloomberg.oiChange5m)>0.5)news.push({title:`📊 OI ${bloomberg.oiChange5m>0?'↑':'↓'}${Math.abs(bloomberg.oiChange5m).toFixed(2)}%`,type:'info'});
      if(bloomberg.topTraderLSPositions>1.5||bloomberg.topTraderLSPositions<0.7)news.push({title:`🏦 Whales: ${bloomberg.topTraderLSPositions>1.5?'LONG':'SHORT'} (${bloomberg.topTraderLSPositions.toFixed(2)})`,type:'whale'});
      if(bloomberg.liqShortUSD>0&&bloomberg.liqLongUSD>0){const mg=bloomberg.liqShortUSD>bloomberg.liqLongUSD?'UP':'DOWN';news.push({title:`🎯 Liq magnet: ${mg} — S$${(bloomberg.liqShortUSD/1e6).toFixed(1)}M / L$${(bloomberg.liqLongUSD/1e6).toFixed(1)}M`,type:'info'});}
    }
    // V70: Position status in wire
    if(positionStatus){const ps=positionStatus;news.unshift({title:`📍 Position: ${ps.side} @ $${ps.entry.toFixed(0)} | PnL: ${ps.pnlPct>0?'+':''}${ps.pnlPct.toFixed(1)}% ${ps.isStopHit?'🚨 STOP HIT':''}`,type:ps.pnlPct>0?'whale':ps.isStopHit?'rugpull':'info'});}
    if(news.length<2)news.push({title:`Analyzing (${windowType.toUpperCase()})...`,type:'info'});
    setNewsEvents(news);
  },[orderBook.imbalance,globalFlow,targetMargin,windowType,showWhaleAlerts,bloomberg,positionStatus]);

  // Time Engine
  useEffect(()=>{const u=()=>{const now=new Date(),ms=now.getTime(),int=(windowType==='15m'?15:5)*60*1000;const nwMs=Math.ceil((ms+500)/int)*int,nw=new Date(nwMs),sw=new Date(nwMs-int),diff=nw.getTime()-now.getTime();let ce,se,ne;try{ce=now.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour12:true,hour:'2-digit',minute:'2-digit',second:'2-digit'});se=sw.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour12:true,hour:'2-digit',minute:'2-digit'});ne=nw.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour12:true,hour:'2-digit',minute:'2-digit'});}catch(e){ce=now.toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit',second:'2-digit'});se=sw.toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit'});ne=nw.toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit'});}setTimeState({currentEST:ce,startWindowEST:se,nextWindowEST:ne,minsRemaining:Math.floor(diff/60000),secsRemaining:Math.floor((diff%60000)/1000),currentHour:now.getHours()});};u();const t=setInterval(u,1000);return()=>clearInterval(t);},[windowType]);

  // PREDICTION ENGINE (V70: post-time-decay emphasis)
  const analysis = useMemo(() => {
    if(!currentPrice||liveHistory.length<20||!targetMargin||!isMounted) return null;
    const is15m=windowType==='15m',intSec=is15m?900:300;
    const clockSec=(timeState.minsRemaining*60)+timeState.secsRemaining;
    const timeFrac=Math.max(0,Math.min(1,1-(clockSec/intSec)));
    const isEndgame=clockSec<(is15m?90:45);
    // V70: Post time-decay zone (last 40% of window) — predictions are more accurate here
    const isPostDecay=timeFrac>0.6;

    const closes=liveHistory.map(x=>x.c);
    const rsi=calcRSI(closes,14),atr=calcATR(liveHistory,14)||10,atrBps=atr>0?(atr/currentPrice)*10000:15;
    const vwap=calcVWAP(liveHistory),macd=calcMACD(closes),bb=calcBB(closes,20);
    const realGapBps=((currentPrice-targetMargin)/targetMargin)*10000;
    const vel=velocityRef.current;
    const {v1s,v5s,v15s,v30s,accel,jerk,peakPnL,pnlSlope}=vel;
    const gImb=globalFlow.imbalance;
    let aggrFlow=Math.max(-1,Math.min(1,(gImb-1)));
    let mktImplied=Math.max(-1,Math.min(1,(orderBook.imbalance-1)));
    const tapDiv=globalFlow.divergence;
    let liqB=0,liqS=0;liquidations.forEach(l=>{if(Date.now()-l.time<60000){if(l.side==='BUY')liqB+=l.value;else liqS+=l.value;}});
    let bullC=0,bearC=0;liveHistory.slice(0,5).forEach(c=>{if(c.c>c.o)bullC++;else bearC++;});
    const candleBias=(bullC-bearC)/5;
    let reasoning=[];

    // Bloomberg signals
    let fundSig=0,oiSig=0,basisSig=0,whaleSig=0,liqMapSig=0;
    if(bloomberg.status==='live'){
      const fr=bloomberg.fundingRate;
      if(fr>0.0008){fundSig=-0.8;reasoning.push(`FUND: ${(fr*100).toFixed(4)}% — Dump risk.`);}
      else if(fr>0.0003){fundSig=-0.4;}
      else if(fr<-0.0005){fundSig=0.7;reasoning.push(`FUND: ${(fr*100).toFixed(4)}% — Squeeze potential.`);}
      else if(fr<-0.0001){fundSig=0.3;}
      const oiChg=bloomberg.oiChange5m;
      if(oiChg>0.3&&realGapBps>0){oiSig=0.6;reasoning.push(`OI: ↑${oiChg.toFixed(2)}%+price up=Strong bull.`);}
      else if(oiChg>0.3&&realGapBps<=0){oiSig=-0.6;reasoning.push(`OI: ↑${oiChg.toFixed(2)}%+price dn=Strong bear.`);}
      else if(oiChg<-0.3){oiSig=realGapBps>0?-0.3:0.3;}
      if(bloomberg.basisBps>8){basisSig=0.5;reasoning.push(`BASIS: +${bloomberg.basisBps.toFixed(1)}bps premium.`);}
      else if(bloomberg.basisBps<-5){basisSig=-0.5;}
      const tt=bloomberg.topTraderLSPositions;
      if(tt>2.0){whaleSig=0.8;reasoning.push(`WHALES: L/S ${tt.toFixed(2)} — HEAVY long.`);}
      else if(tt>1.3)whaleSig=0.4;
      else if(tt<0.5){whaleSig=-0.8;reasoning.push(`WHALES: L/S ${tt.toFixed(2)} — HEAVY short.`);}
      else if(tt<0.8)whaleSig=-0.4;
      if(bloomberg.liqShortUSD>0&&bloomberg.liqLongUSD>0){const r=bloomberg.liqShortUSD/bloomberg.liqLongUSD;if(r>1.5){liqMapSig=0.5;reasoning.push(`LIQ-MAP: Magnet UP.`);}else if(r<0.67){liqMapSig=-0.5;reasoning.push(`LIQ-MAP: Magnet DOWN.`);}}
      const gls=bloomberg.longShortRatio;
      if(gls>2.0&&tt<1.0){reasoning.push(`⚠️ CROWD: Retail LONG, whales SHORT.`);fundSig-=0.3;}
      else if(gls<0.5&&tt>1.5){reasoning.push(`⚠️ CROWD: Retail SHORT, whales LONG.`);fundSig+=0.3;}
    }

    // Regime
    const rugConf=[v1s<-2,v5s<-0.8,aggrFlow<-0.5,macd.hist<-3,bb.pctB<0.05].filter(Boolean).length;
    const isRugPull=rugConf>=3;
    const allUp=v1s>0&&v5s>0&&v15s>0,allDn=v1s<0&&v5s<0&&v15s<0;
    const velAl=allUp||allDn,velDir=allUp?1:allDn?-1:0;
    const isAcc=(velDir>0&&accel>0)||(velDir<0&&accel<0);
    let regime="CHOP";
    if(isRugPull)regime="CRASH";
    else if(rsi>72&&bb.pctB>0.95)regime="OVERBOUGHT";
    else if(rsi<28&&bb.pctB<0.05)regime="OVERSOLD";
    else if(velAl&&isAcc&&macd.hist*velDir>0)regime=velDir>0?"STRONG UP":"STRONG DOWN";
    else if(velAl)regime=velDir>0?"FADING UP":"FADING DOWN";
    else if(bb.width<atrBps*0.7)regime="SQUEEZE";
    reasoning.push(`REGIME: ${regime}. Sessions: ${marketSessions.sessions.map(s=>s.name).join('+')}`);

    // Probability
    let prob=50;
    // V70: Post-decay emphasis — gap weight increases significantly after 60% of window
    const decayMult=isPostDecay?1.8:1.0;
    const timeDecay=Math.pow(timeFrac,is15m?1.8:1.3);
    prob+=realGapBps*(is15m?0.6:0.8)*(0.15+0.85*timeDecay)*decayMult;

    if(is15m){prob+=v30s*8+v15s*5+v5s*3;if(velAl)prob+=velDir*12;if(isAcc)prob+=velDir*8;}
    else{prob+=v5s*12+v1s*8+v15s*3;if(velAl)prob+=velDir*15;if(isAcc)prob+=velDir*10;}
    if(Math.abs(jerk)>1.0)prob+=jerk*(is15m?3:5);
    if(rsi>70)prob-=(rsi-70)*(is15m?1.5:1.0);else if(rsi<30)prob+=(30-rsi)*(is15m?1.5:1.0);
    prob+=macd.hist*(is15m?0.4:0.8);prob+=aggrFlow*(is15m?12:18);prob+=mktImplied*(is15m?6:4);
    prob+=candleBias*(is15m?5:8);
    if(bb.pctB>0.92)prob-=(bb.pctB-0.92)*100;else if(bb.pctB<0.08)prob+=(0.08-bb.pctB)*100;
    if(liqB>10000)prob+=10;if(liqS>10000)prob-=10;
    if(Math.abs(tapDiv)>0.3)prob+=tapDiv*(is15m?10:15);
    if(bloomberg.status==='live'){prob+=fundSig*(is15m?12:8);prob+=oiSig*(is15m?10:6);prob+=basisSig*(is15m?8:5);prob+=whaleSig*(is15m?15:12);prob+=liqMapSig*(is15m?8:6);}
    if(isEndgame){prob=50+(realGapBps*(is15m?5:8));reasoning.push(`ENDGAME: ${clockSec}s. Gap locked.`);}
    if(isPostDecay&&!isEndgame)reasoning.push(`POST-DECAY: Prediction confidence ↑. Gap weight 1.8x.`);

    let prediction=userPosition||lockedPredictionRef.current;
    let activePrediction=prediction;
    if(activePrediction==="YES")prob+=6;else if(activePrediction==="NO")prob-=6;
    let posterior=Math.max(1,Math.min(99,prob));
    const entryT=is15m?62:60;
    if(activePrediction==="SIT OUT"&&!isEndgame){
      if(posterior>=entryT&&velAl&&velDir>0)activePrediction="YES";
      else if(posterior<=(100-entryT)&&velAl&&velDir<0)activePrediction="NO";
      else if(posterior>=68)activePrediction="YES";
      else if(posterior<=32)activePrediction="NO";
    }else if(activePrediction!=="SIT OUT"){
      if(activePrediction==="YES"&&posterior<33)activePrediction="SIT OUT";
      if(activePrediction==="NO"&&posterior>67)activePrediction="SIT OUT";
    }
    if(isEndgame&&Math.abs(realGapBps)>atrBps*0.4)activePrediction=realGapBps>0?"YES":"NO";

    reasoning.push(`VEL: ${v1s.toFixed(2)}/${v5s.toFixed(2)}/${v15s.toFixed(2)} Accel=${accel.toFixed(2)}`);
    reasoning.push(`TAPE: G${gImb.toFixed(2)} CB${tapeRef.current.cbFlow.toFixed(2)} BN${tapeRef.current.bnFlow.toFixed(2)} BY${tapeRef.current.byFlow.toFixed(2)}`);

    // Trade advisor
    let tradeAction="WAITING",tradeReason=`Need ${entryT}%. Now ${posterior.toFixed(0)}%.`,actionColor="text-zinc-400",actionBg="bg-zinc-500/10 border-zinc-500/30";
    let hasAction=false,actionButtonLabel="",actionTarget="";
    const dynStop=atrBps*(0.50+((1-timeFrac)*0.50));
    let liveEstValue=activePrediction==="YES"?maxPayout*(posterior/100):activePrediction==="NO"?maxPayout*((100-posterior)/100):0;
    const livePnL=liveEstValue-betAmount;const offerVal=parseFloat(currentOffer)||0;
    const riskPct=activePrediction==="YES"?(100-posterior):posterior;
    const chancePct=activePrediction==="YES"?posterior:(100-posterior);
    const ms=`[${chancePct.toFixed(0)}%/${riskPct.toFixed(0)}%]`;
    const pnlDD=vel.peakPnL-realGapBps;const isPnLD=pnlSlope<-0.3&&pnlDD>2;

    // V70: 30% stop loss check
    if(positionStatus?.isStopHit){
      tradeAction="🚨 30% STOP HIT";tradeReason=`Position down ${positionStatus.pnlPct.toFixed(1)}%. EXIT NOW.`;
      actionColor="text-rose-500";actionBg="bg-rose-500/20 border-rose-500/50 animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.4)]";
      hasAction=true;actionButtonLabel="EXIT (STOP LOSS)";actionTarget="SIT OUT";
    }
    else if(isRugPull&&showRugPullAlerts){tradeAction="🚨 RUG PULL";tradeReason=`${rugConf}/5. EXIT ALL. ${ms}`;actionColor="text-rose-500";actionBg="bg-rose-500/20 border-rose-500/50 animate-pulse";hasAction=true;actionButtonLabel="EMERGENCY EXIT";actionTarget="SIT OUT";}
    else if(activePrediction==="SIT OUT"){
      if(isEndgame){tradeAction="WINDOW CLOSED";tradeReason="Too late.";actionColor="text-amber-400";actionBg="bg-amber-500/10 border-amber-500/30";}
      else if(regime==="SQUEEZE"){tradeAction="SQUEEZE";tradeReason="Breakout imminent.";actionColor="text-amber-400";actionBg="bg-amber-500/10 border-amber-500/30";}
      else{tradeAction="AWAITING";tradeReason=`${posterior.toFixed(0)}% < ${entryT}% threshold.`;}
    }else{
      const isY=activePrediction==="YES";const isBleed=isY?(realGapBps<-dynStop):(realGapBps>dynStop);
      const isRevRec=isY?(posterior<33):(posterior>67);const curOdds=isY?posterior:(100-posterior);
      const inProfit=betAmount>0&&livePnL>0;const momAgainst=(isY&&v5s<-0.3&&accel<0)||(!isY&&v5s>0.3&&accel>0);

      if(prediction==="SIT OUT"){tradeAction=`ENTRY: ${activePrediction}`;tradeReason=`${regime}. ${ms}`;actionColor=isY?"text-emerald-400":"text-rose-400";actionBg=isY?"bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]":"bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(251,113,133,0.2)]";hasAction=true;actionButtonLabel=`CONFIRM ${activePrediction}`;actionTarget=activePrediction;}
      else if(inProfit&&isPnLD&&momAgainst){tradeAction="⚡ TAKE PROFIT";tradeReason=`Peak +${vel.peakPnL.toFixed(0)}bps → +${realGapBps.toFixed(0)}bps. ${ms}`;actionColor="text-emerald-300";actionBg="bg-emerald-500/15 border-emerald-500/40 animate-pulse";hasAction=true;actionButtonLabel="CASHOUT";actionTarget="CASH";}
      else if(offerVal>0&&offerVal-liveEstValue>(maxPayout*0.04)){tradeAction="ARB";tradeReason=`Overpay $${(offerVal-liveEstValue).toFixed(2)}. ${ms}`;actionColor="text-emerald-300";actionBg="bg-emerald-500/10 border-emerald-500/30 animate-pulse";hasAction=true;actionButtonLabel="CASHOUT";actionTarget="CASH";}
      else if(isBleed&&momAgainst){tradeAction="🔻 CUT NOW";tradeReason=`Past stop+vel against. ${ms}`;actionColor="text-rose-500";actionBg="bg-rose-500/15 border-rose-500/40";hasAction=true;actionButtonLabel="CASHOUT";actionTarget="SIT OUT";}
      else if(isRevRec&&!hasReversedRef.current){tradeAction="REVERSE";tradeReason=`Flip. ${ms}`;actionColor="text-amber-400";actionBg="bg-amber-500/10 border-amber-500/30";hasAction=true;actionButtonLabel=`→ ${isY?'NO':'YES'}`;actionTarget=isY?"NO":"YES";}
      else if(isBleed){tradeAction="CUT";tradeReason=`ATR ${dynStop.toFixed(0)}bps. ${ms}`;actionColor="text-rose-500";actionBg="bg-rose-500/10 border-rose-500/30";hasAction=true;actionButtonLabel="EXIT";actionTarget="SIT OUT";}
      else if(curOdds>=82){tradeAction="LOCK PROFIT";tradeReason=`${curOdds.toFixed(0)}%. ${ms}`;actionColor="text-emerald-300";actionBg="bg-emerald-500/10 border-emerald-500/30";hasAction=true;actionButtonLabel="CASHOUT";actionTarget="CASH";}
      else{const h=curOdds>65?"💪":curOdds>55?"👌":"⚠️";tradeAction=`${h} HOLD ${curOdds.toFixed(0)}%`;tradeReason=`Vel ${v5s>0?'↑':'↓'}${Math.abs(v5s).toFixed(1)}/s. ${regime}. ${ms}`;actionColor=curOdds>60?"text-emerald-400":"text-amber-400";actionBg=curOdds>60?"bg-emerald-500/10 border-emerald-500/20":"bg-amber-500/10 border-amber-500/20";}
    }

    const textColor=activePrediction==="YES"?"text-emerald-400":activePrediction==="NO"?"text-rose-400":"text-zinc-500";
    let simulatedPrice=currentPrice;let projections=[];
    for(let i=1;i<=4;i++){const decay=Math.pow(0.82,i);simulatedPrice+=(v15s*3+(mktImplied*0.5)+(macd.hist*0.1)+(whaleSig*2)+(liqMapSig*1.5))*decay*(is15m?1.5:0.8);projections.push({time:`${((timeState.currentHour+i)%24).toString().padStart(2,'0')}:00`,price:simulatedPrice});}

    return{prediction:activePrediction,reasoning,textColor,rawProbAbove:posterior,tradeAction,tradeReason,actionColor,actionBg,hasAction,actionButtonLabel,actionTarget,realGapBps,clockSeconds:clockSec,isSystemLocked:isEndgame,atrBps,livePnL,liveEstValue,projections,regime,aggrFlow,isRugPull,vel,rsi,macd,bb,chancePct,riskPct,pnlSlope,isPostDecay,positionStatus};
  },[currentPrice,liveHistory,targetMargin,timeState.minsRemaining,timeState.secsRemaining,timeState.currentHour,orderBook,forceRender,betAmount,maxPayout,currentOffer,globalFlow,liquidations,userPosition,windowType,isMounted,showRugPullAlerts,velocityRef,bloomberg,positionStatus,marketSessions]);

  useEffect(()=>{if(analysis?.hasAction&&analysis.tradeAction!==prevActionRef.current){if(analysis.tradeAction.includes("ENTRY")||analysis.tradeAction.includes("PROFIT")||analysis.tradeAction.includes("CUT")||analysis.tradeAction.includes("STOP"))playAlertSound();}prevActionRef.current=analysis?.tradeAction;},[analysis?.tradeAction,soundEnabled]);

  const executeManualAction=(al,ts)=>{
    setManualAction(al);
    if(ts==="CASH"||ts==="SIT OUT"){setUserPosition(null);setPositionEntry(null);}
    if(analysis&&(analysis.prediction==="YES"||analysis.prediction==="NO")){const w=(analysis.prediction==="YES"&&currentPrice>targetMargin)||(analysis.prediction==="NO"&&currentPrice<targetMargin);if(w)updateScore(windowType,'wins',1);else updateScore(windowType,'losses',1);}
    if(ts){lockedPredictionRef.current=ts==="CASH"?"SIT OUT":ts;lastAdvisedRef.current="SIT OUT";if(ts!=="CASH"&&ts!=="SIT OUT")hasReversedRef.current=true;setForceRender(p=>p+1);setCurrentOffer("");}
  };

  const handleManualSync=(d)=>{
    lockedPredictionRef.current=d;activeCallRef.current={prediction:d,strike:targetMargin};setUserPosition(d);
    // V70: Set position entry with 30% stop
    if(currentPrice){
      const stopPrice=d==='YES'?currentPrice*0.997:currentPrice*1.003; // ~30% on contract value
      setPositionEntry({price:currentPrice,side:d,time:Date.now(),stopPrice});
    }
    setForceRender(p=>p+1);
  };

  const handleChatSubmit=(e)=>{if(e.key==='Enter'&&chatInput.trim()){const ut=chatInput.trim().toLowerCase();const cl=[...chatLog,{role:'user',text:chatInput.trim()}];setChatLog(cl);setChatInput("");setTimeout(()=>{let r="";const a=analysis,v=velocityRef.current,b=bloomberg;
    if(ut.includes("why")||ut.includes("explain"))r=a?`P: ${Number(a.rawProbAbove||0).toFixed(1)}%. ${a.regime}. Vel: ${v.v5s.toFixed(2)}/s. Fund: ${(b.fundingRate*100).toFixed(4)}%. OI Δ: ${b.oiChange5m.toFixed(2)}%. Whales: ${b.topTraderLSPositions.toFixed(2)}. Sessions: ${marketSessions.sessions.map(s=>s.name).join('+')}.`:"...";
    else if(ut.includes("bloomberg")||ut.includes("fund"))r=b.status==='live'?`Fund: ${(b.fundingRate*100).toFixed(4)}%\nOI: ${b.openInterest.toFixed(2)} BTC ($${(b.openInterestUSD/1e9).toFixed(2)}B) Δ${b.oiChange5m.toFixed(2)}%\nBasis: ${b.basisBps.toFixed(1)}bps\nWhale L/S: ${b.topTraderLSPositions.toFixed(2)}\nLiq: S$${(b.liqShortUSD/1e6).toFixed(1)}M / L$${(b.liqLongUSD/1e6).toFixed(1)}M`:"Connecting...";
    else if(ut.includes("tape")||ut.includes("global"))r=`Tape (${globalFlow.feeds+1} feeds):\nCB: ${tapeRef.current.cbFlow.toFixed(2)}\nBN: ${tapeRef.current.bnFlow.toFixed(2)}\nBY: ${tapeRef.current.byFlow.toFixed(2)}\nDiv: ${globalFlow.divergence.toFixed(2)}`;
    else if(ut.includes("whale"))r=whaleLog.length>0?whaleLog.slice(0,10).map(w=>{const d=new Date(w.time);return`${d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})} ${w.src} ${w.side} $${(w.usd/1000).toFixed(0)}K @ $${w.price.toFixed(0)}`;}).join('\n'):"No whales yet.";
    else if(ut.includes("position")||ut.includes("stop"))r=positionStatus?`Position: ${positionStatus.side} @ $${positionStatus.entry.toFixed(2)}\nPnL: ${positionStatus.pnlPct>0?'+':''}${positionStatus.pnlPct.toFixed(2)}% ($${positionStatus.pnlDollar.toFixed(2)})\nStop: -30% = $${positionStatus.stopPrice.toFixed(2)}\n${positionStatus.isStopHit?'🚨 STOP HIT — EXIT NOW':'Stop not hit.'}`:"No active position.";
    else if(ut.includes("session"))r=`Active: ${marketSessions.sessions.map(s=>`${s.flag} ${s.name}`).join(' + ')}\nDominant: ${marketSessions.dominant}\nUTC: ${marketSessions.utcH}:00`;
    else if(ut.includes("score"))r=`${windowType.toUpperCase()}: ${Number(scorecards[windowType]?.wins||0)}W/${Number(scorecards[windowType]?.losses||0)}L`;
    else r=`P: ${Number(a?.rawProbAbove||0).toFixed(1)}%. ${a?.regime}. ${a?.tradeAction}. Try: why, bloomberg, tape, whale, position, session, score.`;
    setChatLog([...cl,{role:'tara',text:r}]);},400);}};

  useEffect(()=>{setManualAction(null);},[analysis?.tradeAction]);
  useEffect(()=>{if(analysis&&["YES","NO","SIT OUT"].includes(analysis.prediction))activeCallRef.current={prediction:analysis.prediction,strike:targetMargin};},[analysis?.prediction,targetMargin]);

  if(!isMounted) return <div className="min-h-screen bg-[#111312] flex items-center justify-center text-[#E8E9E4]/50 font-serif text-xl animate-pulse">Initializing Tara V70...</div>;

  return (
    <div className="min-h-screen lg:h-screen bg-[#111312] text-[#E8E9E4] font-sans p-2 sm:p-3 flex flex-col selection:bg-[#E8E9E4]/20 overflow-y-auto">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col h-full gap-2 min-h-0">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-[#E8E9E4]/10 pb-2 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h1 className="text-lg md:text-xl font-serif tracking-tight text-white flex items-center gap-2">Tara
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>V70</span>
              {bloomberg.status==='live'&&<span className="hidden sm:flex items-center gap-1 text-[10px] font-sans bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-full border border-indigo-500/20"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>BB</span>}
              {globalFlow.feeds>0&&<span className="hidden sm:flex items-center gap-1 text-[10px] font-sans bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/20">{globalFlow.feeds+1}x</span>}
              {/* Market Sessions */}
              <span className="hidden md:flex items-center gap-1 text-[10px]">
                {marketSessions.sessions.map((s,i)=><span key={i} className={`${s.color} opacity-80`}>{s.flag}</span>)}
              </span>
            </h1>
            <div className="flex sm:hidden items-center gap-2">
              <button onClick={()=>setShowWhaleLog(!showWhaleLog)} className="p-1.5 rounded-md bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 text-[10px]">🐋</button>
              <button onClick={()=>setSoundEnabled(!soundEnabled)} className={`p-1.5 rounded-md border ${soundEnabled?'bg-indigo-500/20 border-indigo-500/40 text-indigo-400':'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40'}`}>{soundEnabled?<IC.Vol2/>:<IC.VolX/>}</button>
              <button onClick={()=>setShowHelp(true)} className="p-1.5 rounded-md bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60"><IC.Help/></button>
            </div>
          </div>
          <div className="flex bg-[#111312] border border-[#E8E9E4]/20 rounded-lg p-1 shadow-inner w-full sm:w-auto justify-center">
            <button onClick={()=>handleWindowToggle('5m')} className={`flex-1 sm:flex-none px-6 py-1 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${windowType==='5m'?'bg-indigo-500 text-white shadow-md':'text-[#E8E9E4]/40'}`}>5 Min</button>
            <button onClick={()=>handleWindowToggle('15m')} className={`flex-1 sm:flex-none px-6 py-1 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${windowType==='15m'?'bg-emerald-500 text-white shadow-md':'text-[#E8E9E4]/40'}`}>15 Min</button>
          </div>
          <div className="hidden sm:flex text-right font-sans items-center gap-4">
            <div className="flex flex-col items-end pl-4"><div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest mb-0.5">EST</div><div className="text-sm font-serif text-[#E8E9E4]/90">{String(timeState.currentEST||'--:--:--')}</div></div>
            <div className="flex items-center gap-2 border-l border-[#E8E9E4]/10 pl-4">
              <button onClick={()=>setShowWhaleLog(!showWhaleLog)} className={`p-2 rounded-lg border ${showWhaleLog?'bg-purple-500/20 border-purple-500/40 text-purple-400':'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40'}`} title="Whale Log">🐋</button>
              <button onClick={()=>setSoundEnabled(!soundEnabled)} className={`p-2 rounded-lg border ${soundEnabled?'bg-indigo-500/20 border-indigo-500/40 text-indigo-400':'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40'}`}>{soundEnabled?<IC.Vol2/>:<IC.VolX/>}</button>
              <button onClick={()=>setShowHelp(true)} className="p-2 rounded-lg bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 hover:text-white"><IC.Help/></button>
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="bg-[#181A19] p-2 sm:px-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-70"></div>
          <div className="flex w-full lg:w-auto justify-between lg:justify-start items-center gap-4">
            <div className="flex items-center gap-3 w-1/2 lg:w-auto pl-1 md:pl-2"><div className="p-2 bg-[#111312] rounded-lg border border-[#E8E9E4]/5 shadow-inner"><IC.Zap className={`w-5 h-5 ${tickDirection==='up'?'text-emerald-400':tickDirection==='down'?'text-rose-400':'text-[#E8E9E4]/40'}`}/></div><div><div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-0.5">Live Spot</div><div className={`text-lg sm:text-2xl font-serif tracking-tight ${tickDirection==='up'?'text-emerald-400':tickDirection==='down'?'text-rose-400':'text-white'}`}>${currentPrice?currentPrice.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'---'}</div></div></div>
            <div className="flex lg:hidden flex-col items-center bg-[#111312] p-1.5 rounded-xl border border-[#E8E9E4]/5 shadow-inner w-1/2"><div className="flex items-center justify-between w-full px-2"><div className="flex flex-col items-center"><div className="text-[9px] text-emerald-400 mb-0.5">W</div><span className="text-lg font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins||0)}</span></div><div className="h-6 w-px bg-[#E8E9E4]/10"></div><div className="flex flex-col items-center"><div className="text-[9px] text-rose-400 mb-0.5">L</div><span className="text-lg font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses||0)}</span></div></div></div>
          </div>
          <div className="w-px h-8 bg-[#E8E9E4]/10 hidden lg:block mx-2"></div>
          <div className="flex items-center gap-3 md:gap-6 w-full lg:w-auto bg-[#111312] p-2 rounded-xl border border-[#E8E9E4]/5 shadow-inner justify-between overflow-x-auto flex-1">
            <div className="flex flex-col items-start pr-3 md:pr-6 border-r border-[#E8E9E4]/10 min-w-[120px]"><div className="text-[9px] md:text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1">Strike</div><input type="number" value={targetMargin===0?'':targetMargin} onChange={(e)=>setTargetMargin(Number(e.target.value))} className="bg-transparent border-none text-white font-serif text-base md:text-lg w-full focus:outline-none py-1"/></div>
            <div className="flex flex-col items-start pr-3 md:pr-6 border-r border-[#E8E9E4]/10 min-w-[120px]"><div className="text-[9px] md:text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1">Bet / Win</div><div className="flex items-center gap-1 text-white font-serif text-base w-full">$<input type="number" value={betAmount===0?'':betAmount} onChange={(e)=>setBetAmount(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-full text-center outline-none py-1"/><span className="text-[#E8E9E4]/40 mx-0.5">/</span>$<input type="number" value={maxPayout===0?'':maxPayout} onChange={(e)=>setMaxPayout(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-full text-center outline-none py-1"/></div></div>
            <div className="flex flex-col items-start pl-1 md:pl-2 min-w-[100px]"><div className="text-[9px] md:text-[10px] text-emerald-400/80 uppercase tracking-widest font-medium mb-1">Offer</div><div className="flex items-center gap-1 text-emerald-400 font-serif text-base md:text-lg">$<input type="number" value={currentOffer} onChange={(e)=>setCurrentOffer(e.target.value)} placeholder="0" className="bg-transparent border-b border-emerald-500/30 focus:border-emerald-400 w-full text-center outline-none placeholder-emerald-900 py-1"/></div></div>
          </div>
          <div className="w-px h-8 bg-[#E8E9E4]/10 hidden lg:block mx-2"></div>
          {/* V70: Position Status + Scorecard */}
          <div className="hidden lg:flex flex-col items-start w-52">
            {positionStatus ? (
              <div className="w-full">
                <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1">Position</div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-center">
                    <div className="text-[9px] text-[#E8E9E4]/50">{positionStatus.side} @ ${positionStatus.entry.toFixed(0)}</div>
                    <span className={`text-xl font-serif font-bold ${positionStatus.pnlPct>0?'text-emerald-400':'text-rose-400'}`}>{positionStatus.pnlPct>0?'+':''}{positionStatus.pnlPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-8 w-px bg-[#E8E9E4]/10"></div>
                  <div className="flex flex-col items-center">
                    <div className="text-[9px] text-rose-400/60">Stop -30%</div>
                    <span className={`text-sm font-mono ${positionStatus.isStopHit?'text-rose-500 animate-pulse':'text-[#E8E9E4]/40'}`}>{positionStatus.isStopHit?'HIT':'Active'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1"><IC.Terminal/> {windowType.toUpperCase()} SCORE</div>
                <div className="flex items-center justify-between w-full px-2">
                  <div className="flex flex-col items-center"><div className="flex items-center gap-1 text-[9px] text-emerald-400 mb-0.5"><button onClick={()=>updateScore(windowType,'wins',-1)}>-</button> W <button onClick={()=>updateScore(windowType,'wins',1)}>+</button></div><span className="text-2xl font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins||0)}</span></div>
                  <div className="h-8 w-px bg-[#E8E9E4]/10"></div>
                  <div className="flex flex-col items-center"><div className="flex items-center gap-1 text-[9px] text-rose-400 mb-0.5"><button onClick={()=>updateScore(windowType,'losses',-1)}>-</button> L <button onClick={()=>updateScore(windowType,'losses',1)}>+</button></div><span className="text-2xl font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses||0)}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE ROW — responsive: auto-height on mobile, fixed on lg+, all columns equal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 shrink-0" style={{minHeight:0}}>
          {/* Prediction — fixed height on desktop to prevent overflow */}
          <div className="lg:col-span-4 lg:h-[240px] bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-30"></div>
            <div className="flex justify-between items-center mb-2 shrink-0">
              <div className="bg-[#111312] border border-[#E8E9E4]/10 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                <IC.Clock/><span className="text-[#E8E9E4]/60 hidden sm:inline">{String(timeState.startWindowEST)}-{String(timeState.nextWindowEST)}</span>
                <span className="text-[#E8E9E4]">{Number(timeState.minsRemaining)}m {Number(timeState.secsRemaining)}s</span>
                {analysis?.isPostDecay&&<span className="text-amber-400 ml-1">⚡</span>}
              </div>
              {analysis&&analysis.prediction!=="SIT OUT"&&<button onClick={()=>executeManualAction("EXIT","SIT OUT")} className="bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-2 py-1 rounded-md text-[9px] font-bold uppercase flex items-center gap-1"><IC.Alert/> Exit</button>}
            </div>
            {isLoading||!analysis?<div className="text-lg font-serif text-[#E8E9E4]/30 animate-pulse mt-4 text-center w-full">Connecting...</div>:(
              <div className="flex flex-col items-center w-full flex-1 justify-center min-h-0 overflow-hidden">
                <div className="flex flex-col items-center mb-1 shrink-0"><span className="text-[9px] text-[#E8E9E4]/40 uppercase tracking-[0.2em] font-bold">Prediction</span><h2 className={`text-[40px] sm:text-[48px] lg:text-[44px] xl:text-[52px] font-serif font-bold leading-none tracking-tight ${analysis.textColor} drop-shadow-lg uppercase`}>{String(analysis.prediction)}</h2></div>
                <div className={`w-full p-2 rounded-xl border-[1.5px] ${analysis.actionBg} flex flex-col items-center text-center shadow-sm shrink-0`}>
                  <div className="flex items-center gap-1.5 mb-0.5"><IC.Bell className={`w-3 h-3 ${analysis.actionColor}`}/><span className="text-[8px] font-bold uppercase tracking-widest opacity-80">Advisor</span></div>
                  <div className={`text-xs sm:text-sm font-serif font-bold mb-0.5 ${analysis.actionColor} uppercase leading-tight`}>{String(analysis.tradeAction)}</div>
                  <p className="text-[8px] sm:text-[9px] opacity-80 text-[#E8E9E4] leading-tight px-1 line-clamp-2">{String(analysis.tradeReason)}</p>
                  {analysis.hasAction&&<div className="w-full pt-1.5 mt-1.5 border-t border-[#E8E9E4]/10">{manualAction===analysis.tradeAction?<div className="w-full bg-emerald-500/20 text-emerald-400 py-1.5 rounded-lg text-[8px] font-bold uppercase flex items-center justify-center gap-1"><IC.Check/> Done</div>:<button onClick={()=>executeManualAction(analysis.tradeAction,analysis.actionTarget)} className={`w-full py-1.5 rounded-lg text-[8px] font-bold uppercase border hover:brightness-125 ${analysis.actionColor.includes('rose')?'bg-rose-500/20 text-rose-400 border-rose-500/40':analysis.actionColor.includes('amber')?'bg-amber-500/20 text-amber-400 border-amber-500/40':'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'}`}>{String(analysis.actionButtonLabel)}</button>}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Middle: Posteriors + Forecast + Sync — constrained to match */}
          <div className="lg:col-span-4 lg:h-[240px] flex flex-col gap-2 overflow-hidden">
            <div className="flex gap-2 shrink-0">
              <div className="flex-1 bg-[#181A19] p-2 sm:p-3 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md flex flex-col justify-center"><div className="text-[8px] sm:text-[9px] text-[#E8E9E4]/50 font-bold uppercase mb-0.5">UP</div><div className="text-2xl sm:text-3xl lg:text-3xl xl:text-4xl font-serif text-indigo-300">{analysis?`${Number(analysis.rawProbAbove||0).toFixed(1)}%`:'--%'}</div></div>
              <div className="flex-1 bg-[#181A19] p-2 sm:p-3 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md flex flex-col justify-center"><div className="text-[8px] sm:text-[9px] text-[#E8E9E4]/50 font-bold uppercase mb-0.5">DN</div><div className="text-2xl sm:text-3xl lg:text-3xl xl:text-4xl font-serif text-rose-300">{analysis?`${(100-Number(analysis.rawProbAbove||0)).toFixed(1)}%`:'--%'}</div></div>
            </div>
            {analysis&&<div className="bg-[#181A19] p-2 sm:p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md shrink-0"><h2 className="text-[8px] sm:text-[9px] font-bold text-[#E8E9E4]/80 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5"><IC.TrendUp/> Forecast</h2><div className="grid grid-cols-4 gap-1.5">{analysis.projections.map((p,i)=><div key={i} className="bg-[#111312] rounded-lg p-1 sm:p-1.5 text-center border border-[#E8E9E4]/5"><div className="text-[8px] text-[#E8E9E4]/40 font-bold uppercase">{String(p.time)}</div><div className="text-[10px] sm:text-[11px] font-serif text-purple-100">${Number(p.price||0).toLocaleString(undefined,{maximumFractionDigits:0})}</div></div>)}</div></div>}
            {userPosition===null&&<div className="flex flex-col items-center gap-1 w-full shrink-0"><span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-[#E8E9E4]/40">Sync position (30% stop):</span><div className="flex gap-2 w-full"><button onClick={()=>handleManualSync("YES")} className="flex-1 py-1 border border-emerald-500/30 text-emerald-400 rounded-md text-[8px] sm:text-[9px] uppercase font-bold hover:bg-emerald-500/10">YES</button><button onClick={()=>handleManualSync("NO")} className="flex-1 py-1 border border-rose-500/30 text-rose-400 rounded-md text-[8px] sm:text-[9px] uppercase font-bold hover:bg-rose-500/10">NO</button></div></div>}
          </div>

          {/* Right: Logs + Wire — both scroll independently */}
          <div className="lg:col-span-4 lg:h-[240px] flex flex-col gap-2 overflow-hidden">
            {analysis&&<div className="bg-[#181A19] p-2 sm:p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-0 overflow-hidden"><h2 className="text-[8px] sm:text-[9px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 border-b border-[#E8E9E4]/10 pb-1 shrink-0"><IC.Terminal className="w-3.5 h-3.5 text-amber-400"/> Engine</h2><div className="space-y-1 font-mono flex-1 overflow-y-auto pr-1 custom-scrollbar">{(analysis.reasoning||[]).map((r,i)=><div key={i} className={`bg-[#111312] p-1.5 rounded text-[7.5px] sm:text-[8.5px] ${r.includes('RUG')||r.includes('CRASH')||r.includes('STOP')?'text-rose-400 border border-rose-500/20':r.includes('FUND')||r.includes('OI')||r.includes('BASIS')||r.includes('WHALE')||r.includes('CROWD')||r.includes('LIQ-MAP')?'text-indigo-300 border border-indigo-500/20':r.includes('TAPE')||r.includes('DIV')?'text-purple-300 border border-purple-500/20':r.includes('POST-DECAY')?'text-amber-300 border border-amber-500/20':'text-[#E8E9E4]/70 border border-[#E8E9E4]/5'} flex items-start gap-1 uppercase`}><span className="text-emerald-500 mt-0.5 shrink-0">{'>'}</span><span className="leading-snug">{String(r)}</span></div>)}</div></div>}
            <div className="bg-[#181A19] p-2 sm:p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-0 overflow-hidden"><div className="flex justify-between items-center mb-1.5 border-b border-[#E8E9E4]/10 pb-1 shrink-0"><h2 className="text-[8px] sm:text-[9px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest flex items-center gap-1.5"><IC.Globe/> Wire</h2>{bloomberg.status==='live'&&<span className="text-[7px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">LIVE</span>}</div><div className="space-y-1 overflow-y-auto custom-scrollbar pr-1 flex-1">{newsEvents.map((n,i)=><div key={i} className={`border-l-[2px] pl-2 py-0.5 ${n.type==='rugpull'?'border-rose-500':n.type==='whale'?'border-purple-500':'border-indigo-500/40'}`}><span className={`text-[8px] sm:text-[9px] leading-tight ${n.type==='rugpull'?'text-rose-400 font-bold':n.type==='whale'?'text-purple-300':'text-[#E8E9E4]/90'}`}>{String(n.title)}</span></div>)}</div></div>
          </div>
        </div>

        {/* CHART — takes all remaining space */}
        <div className="w-full bg-[#181A19] p-2 sm:p-3 rounded-xl border border-[#E8E9E4]/10 shadow-lg flex flex-col flex-1 min-h-[180px] relative z-10">
          <div className="flex justify-between items-center mb-2 border-b border-[#E8E9E4]/10 pb-2"><h2 className="text-[10px] font-bold text-[#E8E9E4]/80 uppercase tracking-[0.2em] flex items-center gap-2"><IC.Activity className="w-4 h-4 text-indigo-400"/> CHART</h2>
          <div className="flex items-center gap-3 text-[9px] text-[#E8E9E4]/60 bg-[#111312] px-3 py-1 rounded-lg border border-[#E8E9E4]/5">
            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showOverlays} onChange={(e)=>setShowOverlays(e.target.checked)} className="accent-amber-500 w-3 h-3"/> EMA/BB</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showCandles} onChange={(e)=>setShowCandles(e.target.checked)} className="accent-purple-500 w-3 h-3"/> Candles</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showRugPullAlerts} onChange={(e)=>setShowRugPullAlerts(e.target.checked)} className="accent-rose-500 w-3 h-3"/> Rug</label>
            <span className="pl-2 border-l border-[#E8E9E4]/10 opacity-50">{liveHistory.length}</span>
          </div></div>
          <div className="flex-1 w-full h-full relative rounded-md overflow-hidden bg-[#111312]" style={{backgroundImage:'linear-gradient(rgba(232,233,228,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(232,233,228,0.02) 1px, transparent 1px)',backgroundSize:'40px 40px'}}>
            {liveHistory.length>0?<LiveChart data={liveHistory} currentPrice={currentPrice} targetMargin={targetMargin} showCandles={showCandles} showOverlays={showOverlays} rugPullActive={showRugPullAlerts&&analysis?.isRugPull} bb={analysis?.bb} ema9={null} ema21={null}/>:<div className="absolute inset-0 flex items-center justify-center text-[11px] text-[#E8E9E4]/30 uppercase tracking-widest animate-pulse">Aggregating...</div>}
          </div>
        </div>
      </div>

      {/* WHALE LOG PANEL */}
      {showWhaleLog&&<div className="fixed top-16 right-4 z-50 w-80 bg-[#181A19] border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-[#111312] p-3 flex justify-between items-center border-b border-[#E8E9E4]/10"><span className="text-xs font-bold uppercase tracking-widest text-purple-400">🐋 Whale Log</span><button onClick={()=>setShowWhaleLog(false)} className="opacity-50 hover:opacity-100"><IC.X/></button></div>
        <div className="max-h-80 overflow-y-auto p-3 space-y-2 custom-scrollbar">{whaleLog.length===0?<div className="text-[10px] text-[#E8E9E4]/40 italic">Waiting for whale trades (&gt;$200K)...</div>:whaleLog.slice(0,30).map((w,i)=>{const d=new Date(w.time);return <div key={i} className={`flex items-center gap-2 text-[10px] p-2 rounded-md bg-[#111312] border ${w.side==='BUY'?'border-emerald-500/20':'border-rose-500/20'}`}>
          <span className="text-[#E8E9E4]/40 font-mono shrink-0">{d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
          <span className={`font-bold ${w.side==='BUY'?'text-emerald-400':'text-rose-400'}`}>{w.side}</span>
          <span className="text-[#E8E9E4]/80">${(w.usd/1000).toFixed(0)}K</span>
          <span className="text-[#E8E9E4]/40 text-[9px]">{w.src}</span>
          <span className="text-[#E8E9E4]/30 ml-auto">${w.price.toFixed(0)}</span>
        </div>})}</div>
      </div>}

      {/* CHAT */}
      <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end transition-all ${isChatOpen?'w-[90vw] sm:w-80':'w-auto'}`}>
        {isChatOpen&&<div className="bg-[#181A19] border border-[#E8E9E4]/20 shadow-2xl rounded-xl w-full mb-3 overflow-hidden flex flex-col h-[60vh] sm:h-96">
          <div className="bg-[#111312] p-3 flex justify-between items-center border-b border-[#E8E9E4]/10"><span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"><IC.Msg className="w-3.5 h-3.5 text-indigo-400"/> Tara</span><button onClick={()=>setIsChatOpen(false)} className="opacity-50 hover:opacity-100"><IC.X/></button></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111312]/50">{(chatLog||[]).map((m,i)=><div key={i} className={`flex flex-col ${m.role==='user'?'items-end':'items-start'}`}><span className="text-[10px] uppercase opacity-40 mb-1">{String(m.role)}</span><div className={`text-xs p-2.5 rounded-lg max-w-[85%] leading-relaxed ${m.role==='user'?'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-tr-none':'bg-[#2A2D2C] text-[#E8E9E4] border border-[#E8E9E4]/10 rounded-tl-none'}`} style={{whiteSpace:'pre-wrap'}}>{String(m.text)}</div></div>)}</div>
          <div className="p-3 bg-[#111312] border-t border-[#E8E9E4]/10"><input type="text" value={chatInput} onChange={(e)=>setChatInput(e.target.value)} onKeyDown={handleChatSubmit} placeholder="why, bloomberg, tape, whale, position, session..." className="w-full bg-[#181A19] border border-[#E8E9E4]/20 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-white"/></div>
        </div>}
        {!isChatOpen&&<button onClick={()=>setIsChatOpen(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white p-3 rounded-full shadow-lg border border-indigo-400/50 transition-transform hover:scale-105"><IC.Msg className="w-5 h-5"/></button>}
      </div>

      {/* HELP */}
      {showHelp&&<div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl">
        <div className="sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center z-10"><h2 className="text-base font-serif text-white flex items-center gap-2"><IC.Info className="w-5 h-5 text-indigo-400"/> V70 Manual</h2><button onClick={()=>setShowHelp(false)} className="text-[#E8E9E4]/50 hover:text-white"><IC.X/></button></div>
        <div className="p-4 sm:p-6 space-y-6 text-xs sm:text-sm text-[#E8E9E4]/80">
          <section><h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-xs">Position Manager (30% Stop)</h3><p className="leading-relaxed">When you sync a position (YES/NO), Tara locks your entry price and sets a -30% stop loss advisory. The position PnL shows live in the stats bar, and if the -30% threshold is hit, Tara triggers an emergency exit alert. Works whether you trade with or against Tara's prediction.</p></section>
          <section><h3 className="text-purple-400 font-bold uppercase tracking-widest mb-2 text-xs">Whale Log</h3><p className="leading-relaxed">Click the 🐋 button in the header. Every trade >$200K on Binance Futures or Bybit is logged with timestamp, exchange, side, size, and price. Scroll through the last 50 whale trades.</p></section>
          <section><h3 className="text-blue-400 font-bold uppercase tracking-widest mb-2 text-xs">Market Sessions</h3><p className="leading-relaxed">Header shows active sessions: 🌏 Asia (0-9 UTC), 🌍 EU (7-16 UTC), 🌎 US (13-22 UTC). Chat "session" for details. Volume behavior changes dramatically by session.</p></section>
          <section><h3 className="text-amber-400 font-bold uppercase tracking-widest mb-2 text-xs">Post-Decay Emphasis</h3><p className="leading-relaxed">After 60% of the window elapses, Tara enters "post-decay" mode (⚡ indicator on timer). The physical gap weight increases 1.8x because you noticed predictions are more accurate in this zone. The gap becomes the dominant signal.</p></section>
          <section><h3 className="text-indigo-400 font-bold uppercase tracking-widest mb-2 text-xs">Enhanced Chart</h3><p className="leading-relaxed">Toggle EMA/BB overlay to see EMA9 (gold) + EMA21 (purple) + Bollinger Bands (shaded). Hover for rich OHLCV tooltips with change %. Current price line now has glow effect.</p></section>
          <section><h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-xs">Chat Commands</h3><p className="leading-relaxed"><strong>why</strong> — Full breakdown. <strong>bloomberg</strong> — Derivatives data. <strong>tape</strong> — Per-exchange flow. <strong>whale</strong> — Last 10 whale trades. <strong>position</strong> — Entry/PnL/stop status. <strong>session</strong> — Active markets. <strong>score</strong> — Record.</p></section>
        </div>
      </div></div>}

      <style dangerouslySetInnerHTML={{__html:`.custom-scrollbar::-webkit-scrollbar{width:4px;}.custom-scrollbar::-webkit-scrollbar-track{background:transparent;}.custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(232,233,228,0.1);border-radius:4px;}`}}/>
    </div>
  );
}
