import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// ═══════════════════════════════════════
// ICONS
// ═══════════════════════════════════════
const _SVG_NS='http:'+'/'+'/www.w3.org/2000/svg';
const IC={
  Clock:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('circle',{cx:'12',cy:'12',r:'10'}),React.createElement('polyline',{points:'12 6 12 12 16 14'})),
  Crosshair:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('circle',{cx:'12',cy:'12',r:'10'}),React.createElement('line',{x1:'22',y1:'12',x2:'18',y2:'12'}),React.createElement('line',{x1:'6',y1:'12',x2:'2',y2:'12'}),React.createElement('line',{x1:'12',y1:'6',x2:'12',y2:'2'}),React.createElement('line',{x1:'12',y1:'22',x2:'12',y2:'18'})),
  Zap:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('polygon',{points:'13 2 3 14 12 14 11 22 21 10 12 10 13 2'})),
  Terminal:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('polyline',{points:'4 17 10 11 4 5'}),React.createElement('line',{x1:'12',y1:'19',x2:'20',y2:'19'})),
  Alert:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('path',{d:'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'}),React.createElement('line',{x1:'12',y1:'9',x2:'12',y2:'13'}),React.createElement('line',{x1:'12',y1:'17',x2:'12.01',y2:'17'})),
  Activity:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('polyline',{points:'22 12 18 12 15 21 9 3 6 12 2 12'})),
  Bell:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('path',{d:'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'}),React.createElement('path',{d:'M13.73 21a2 2 0 0 1-3.46 0'})),
  TrendUp:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('polyline',{points:'23 6 13.5 15.5 8.5 10.5 1 18'}),React.createElement('polyline',{points:'17 6 23 6 23 12'})),
  Globe:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('circle',{cx:'12',cy:'12',r:'10'}),React.createElement('line',{x1:'2',y1:'12',x2:'22',y2:'12'}),React.createElement('path',{d:'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'})),
  Msg:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('path',{d:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'})),
  X:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('line',{x1:'18',y1:'6',x2:'6',y2:'18'}),React.createElement('line',{x1:'6',y1:'6',x2:'18',y2:'18'})),
  Info:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('circle',{cx:'12',cy:'12',r:'10'}),React.createElement('line',{x1:'12',y1:'16',x2:'12',y2:'12'}),React.createElement('line',{x1:'12',y1:'8',x2:'12.01',y2:'8'})),
  Vol2:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('polygon',{points:'11 5 6 9 2 9 2 15 6 15 11 19 11 5'}),React.createElement('path',{d:'M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07'})),
  VolX:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('polygon',{points:'11 5 6 9 2 9 2 15 6 15 11 19 11 5'}),React.createElement('line',{x1:'23',y1:'9',x2:'17',y2:'15'}),React.createElement('line',{x1:'17',y1:'9',x2:'23',y2:'15'})),
  Help:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('circle',{cx:'12',cy:'12',r:'10'}),React.createElement('path',{d:'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'}),React.createElement('line',{x1:'12',y1:'17',x2:'12.01',y2:'17'})),
  Link:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('path',{d:'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'}),React.createElement('path',{d:'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'})),
  ChevronDown:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('polyline',{points:'6 9 12 15 18 9'})),
  BarChart:({className})=>React.createElement('svg',{xmlns:_SVG_NS,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round',className},React.createElement('line',{x1:'18',y1:'20',x2:'18',y2:'10'}),React.createElement('line',{x1:'12',y1:'20',x2:'12',y2:'4'}),React.createElement('line',{x1:'6',y1:'20',x2:'6',y2:'14'})),
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

// Default signal weights — trained on 268-trade dataset
// 163W-105L=60.8% · UP 65% · DOWN 55.6% · SS 68% · TD 87.5% · EU 69.7%
// DOWN in SHORT SQUEEZE: 50% — regime-gated suppression active
// V152: Added rangePosition — mean-reversion / range-exhaustion signal.
// Measures how far we've drifted from window-open price relative to ATR-scaled envelope.
// Contributes contrarian to the recent direction when |range| > 1.0 in late window.
// Default weight matches "regime" tier — moderate, gradient descent can grow it if predictive.
const DEFAULT_WEIGHTS={gap:52.69,momentum:49.99,structure:21.54,flow:58.00,technical:26.71,regime:43.13,rangePosition:35.00};

// Per-regime weight sets — each regime gets its own gradient descent
// Initialized from global defaults, diverge over time based on what works in each regime
// V143: Per-regime weight defaults pre-trained from 379 seed trades. Previously all four
//       regimes started from identical DEFAULT_WEIGHTS — gradient descent was supposed to
//       differentiate them over time but the attribution gate (>10%) + small learning rate
//       produced ~1-3pt deltas after hundreds of trades. Pre-baking the seed-trained values
//       gives users a differentiated starting point on first load. Subsequent live trades
//       continue to update via gradient descent on top.
const DEFAULT_REGIME_WEIGHTS={
  // V145/V152: Per-regime starting weights — flat across regimes. rangePosition added in V152.
  'SHORT SQUEEZE': {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13,rangePosition:35.00},
  'RANGE-CHOP':    {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13,rangePosition:35.00},
  'HIGH VOL CHOP': {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13,rangePosition:35.00},
  'TRENDING DOWN': {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13,rangePosition:35.00},
};
const REGIME_WEIGHT_KEYS={'SHORT SQUEEZE':'taraV110RW_SS_V110','RANGE-CHOP':'taraV110RW_RC_V110','HIGH VOL CHOP':'taraV110RW_HVC_V110','TRENDING DOWN':'taraV110RW_TD_V110'};
const loadRegimeWeights=()=>{
  const out={};
  Object.entries(REGIME_WEIGHT_KEYS).forEach(([rg,key])=>{
    try{const s=localStorage.getItem(key);if(s){const w=JSON.parse(s);if(w&&typeof w.gap==='number'){out[rg]=w;return;}}}catch(e){}
    out[rg]={...DEFAULT_REGIME_WEIGHTS[rg]};
  });
  return out;
};
const saveRegimeWeights=(rwObj)=>{
  Object.entries(REGIME_WEIGHT_KEYS).forEach(([rg,key])=>{
    if(rwObj[rg])try{localStorage.setItem(key,JSON.stringify(rwObj[rg]));}catch(e){}
  });
};
const WEIGHT_BOUNDS={gap:[5,65],momentum:[5,58],structure:[2,38],flow:[2,55],technical:[5,48],regime:[2,45],rangePosition:[5,55]}; // V152: rangePosition added — bounds let gradient descent grow or shrink it
const LEARNING_RATE=0.8; // how aggressively to update weights per trade

// Load weights from localStorage or use defaults
const loadWeights=()=>{try{const s=localStorage.getItem('taraWeightsV110');if(s){const w=JSON.parse(s);if(w&&typeof w.gap==='number')return w;}return{...DEFAULT_WEIGHTS};}catch(e){return{...DEFAULT_WEIGHTS};}};
const saveWeights=(w)=>{try{localStorage.setItem('taraWeightsV110',JSON.stringify(w));}catch(e){}};

// Load trade log
// removed
// removed
// Best hours: 4 (100%) and 5 (100%)
// V134: Baseline version marker — bump when SEED_TRADES is refreshed.
// Personal layer compares this on load and offers a sync prompt if the user's
// last-synced version is older than the current baked baseline.
const BASELINE_VERSION='2026.05.02-v3.1.5-tape-floor-tz-est';

// V2.1: Direction C design tokens — two-tone gold/copper palette + utility classes.
// Centralized so the visual language is consistent across all UI consumers.
//   Gold (#E5C870)   — premium, hero accents, V2.0 badge, major-release markers, "what changed" eyebrows
//   Copper (#C97D4A) — cautionary, friction, geo risk, quality issues, exhausted/contrarian signals
//   Emerald  — wins, UP locks, profit (unchanged)
//   Rose     — losses, DOWN locks, adverse (unchanged)
//   These coexist — copper sits between green and red as a "watch but don't alarm" tier.
const T2_GOLD='#E5C870';
const T2_COPPER='#C97D4A';
const T2_GOLD_GLOW='rgba(229,200,112,0.18)';
const T2_GOLD_BORDER='rgba(229,200,112,0.35)';
const T2_GOLD_DIM='rgba(229,200,112,0.45)';
const T2_COPPER_BG='rgba(201,125,74,0.08)';
const T2_COPPER_BORDER='rgba(201,125,74,0.30)';
// Tabular-nums monospace style — used for all prices, posteriors, statistics
// font-variant-numeric: tabular-nums keeps digits aligned column-wise (no wobble during ticks)
const T2_MONO_STYLE={fontVariantNumeric:'tabular-nums',letterSpacing:'-0.01em'};
// Corner stamp component — small gold serial mark in upper-right of panels
function T2Stamp({code}){return(<span style={{position:'absolute',top:'8px',right:'10px',fontSize:'8px',letterSpacing:'0.18em',color:T2_GOLD_DIM,fontWeight:500}}>{code}</span>);}
const BASELINE_RECORD={'15m':{wins:486,losses:302},'5m':{wins:33,losses:25}};

const SEED_TRADES=[
// V3.1.2: 56 trades. Latest trade (08:03) is the first lock fired with V2.9 weighted FGT —
// posterior 62, FGT 0.3 (continuous value confirms weighted voting active), UP win in
// SHORT SQUEEZE. Confirms the 2.9 architecture is operational.
//
// BASELINE_RECORD scorecard preserves the live cumulative number — independent of seed.
  {id:1777623321860,timestampISO:'2026-05-01T08:15:21.860Z',dir:'UP',outcomeDir:'UP',posterior:81.4,rawPosterior:81.4,regime:'SHORT SQUEEZE',clockAtLock:878,hour:4,session:'EU',windowType:'15m',signals:{gap:0.22,momentum:5.76,structure:9.0,flow:55.0,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77212.2,closingPrice:77420.0,strikeAtLock:77188.32,strikePrice:77188.32,gapAtEntry:3.1,closingGapBps:30.0,fgtAlignment:0.0,rangeBps:-0.3,qualityScore:56},
  {id:1777625065746,timestampISO:'2026-05-01T08:44:25.746Z',dir:'DOWN',outcomeDir:'DOWN',posterior:25.0,rawPosterior:25.0,regime:'RANGE-CHOP',clockAtLock:34,hour:4,session:'EU',windowType:'15m',signals:{gap:-14.97,momentum:-1.81,structure:0.0,flow:-14.65,technical:10.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77355.98,closingPrice:77351.35,strikeAtLock:77431.88,strikePrice:77431.88,gapAtEntry:-9.8,closingGapBps:-10.4,fgtAlignment:-3.0,rangeBps:0.0,qualityScore:13},
  {id:1777625149938,timestampISO:'2026-05-01T08:45:49.938Z',dir:'DOWN',outcomeDir:'UP',posterior:9.8,rawPosterior:9.8,regime:'RANGE-CHOP',clockAtLock:850,hour:4,session:'EU',windowType:'15m',signals:{gap:-0.04,momentum:0.0,structure:0.0,flow:-55.0,technical:10.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:77349.0,closingPrice:77358.39,strikeAtLock:77353.67,strikePrice:77353.67,gapAtEntry:-0.6,closingGapBps:0.6,fgtAlignment:-3.0,rangeBps:0.0,qualityScore:58},
  {id:1777626839895,timestampISO:'2026-05-01T09:13:59.895Z',dir:'UP',outcomeDir:'DOWN',posterior:61.5,rawPosterior:61.5,regime:'RANGE-CHOP',clockAtLock:60,hour:5,session:'EU',windowType:'15m',signals:{gap:-7.77,momentum:0.0,structure:-9.0,flow:55.0,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77318.65,closingPrice:77315.94,strikeAtLock:77360.41,strikePrice:77360.41,gapAtEntry:-5.4,closingGapBps:-5.7,fgtAlignment:-3.0,rangeBps:0.0,qualityScore:0},
  {id:1777627444347,timestampISO:'2026-05-01T09:24:04.347Z',dir:'DOWN',outcomeDir:'UP',posterior:60.8,rawPosterior:60.8,regime:'SHORT SQUEEZE',clockAtLock:355,hour:5,session:'EU',windowType:'15m',signals:{gap:-0.76,momentum:-0.54,structure:-12.0,flow:47.0,technical:2.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:77308.25,closingPrice:77332.42,strikeAtLock:77319.74,strikePrice:77319.74,gapAtEntry:-1.5,closingGapBps:1.6,fgtAlignment:-2.0,rangeBps:-0.02,qualityScore:26},
  {id:1777627826877,timestampISO:'2026-05-01T09:30:26.877Z',dir:'DOWN',outcomeDir:'DOWN',posterior:9.8,rawPosterior:9.8,regime:'TRENDING DOWN',clockAtLock:873,hour:5,session:'EU',windowType:'15m',signals:{gap:-0.41,momentum:-6.7,structure:-12.0,flow:-55.0,technical:2.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77291.99,closingPrice:77265.21,strikeAtLock:77336.66,strikePrice:77336.66,gapAtEntry:-5.8,closingGapBps:-9.2,fgtAlignment:0.0,rangeBps:-0.4,qualityScore:78},
  {id:1777628737068,timestampISO:'2026-05-01T09:45:37.068Z',dir:'DOWN',outcomeDir:'DOWN',posterior:9.8,rawPosterior:9.8,regime:'RANGE-CHOP',clockAtLock:863,hour:5,session:'EU',windowType:'15m',signals:{gap:-0.25,momentum:-2.29,structure:0.0,flow:-54.31,technical:2.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77242.69,closingPrice:77261.71,strikeAtLock:77269.11,strikePrice:77269.11,gapAtEntry:-3.4,closingGapBps:-1.0,fgtAlignment:-2.0,rangeBps:0.0,qualityScore:57},
  {id:1777629651971,timestampISO:'2026-05-01T10:00:51.971Z',dir:'DOWN',outcomeDir:'DOWN',posterior:34.5,rawPosterior:22.4,regime:'TRENDING DOWN',clockAtLock:848,hour:6,session:'EU',windowType:'15m',signals:{gap:-0.21,momentum:0.13,structure:0.0,flow:-42.38,technical:2.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77235.01,closingPrice:77151.72,strikeAtLock:77257.26,strikePrice:77257.26,gapAtEntry:-2.9,closingGapBps:-13.7,fgtAlignment:-1.0,rangeBps:-0.2,qualityScore:58},
  {id:1777630526828,timestampISO:'2026-05-01T10:15:26.828Z',dir:'UP',outcomeDir:'UP',posterior:80.5,rawPosterior:64.8,regime:'RANGE-CHOP',clockAtLock:873,hour:6,session:'EU',windowType:'15m',signals:{gap:0.05,momentum:-0.78,structure:0.0,flow:51.02,technical:-15.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77162.79,closingPrice:77333.58,strikeAtLock:77156.79,strikePrice:77156.79,gapAtEntry:0.8,closingGapBps:22.9,fgtAlignment:0.0,rangeBps:0.12,qualityScore:22},
  {id:1777631423940,timestampISO:'2026-05-01T10:30:23.940Z',dir:'DOWN',outcomeDir:'DOWN',posterior:47.5,rawPosterior:47.5,regime:'RANGE-CHOP',clockAtLock:876,hour:6,session:'EU',windowType:'15m',signals:{gap:-0.13,momentum:-4.17,structure:0.0,flow:-51.43,technical:2.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77323.49,closingPrice:77223.6,strikeAtLock:77337.29,strikePrice:77337.29,gapAtEntry:-1.8,closingGapBps:-14.7,fgtAlignment:0.0,rangeBps:-0.1,qualityScore:18},
  {id:1777632450103,timestampISO:'2026-05-01T10:47:30.103Z',dir:'DOWN',outcomeDir:'UP',posterior:22.7,rawPosterior:25.2,regime:'RANGE-CHOP',clockAtLock:750,hour:6,session:'EU',windowType:'15m',signals:{gap:-0.09,momentum:-1.75,structure:0.0,flow:-20.85,technical:2.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:77231.07,closingPrice:77277.85,strikeAtLock:77238.15,strikePrice:77238.15,gapAtEntry:-0.9,closingGapBps:5.1,fgtAlignment:-2.0,rangeBps:0.03,qualityScore:34},
  {id:1777633215405,timestampISO:'2026-05-01T11:00:15.405Z',dir:'UP',outcomeDir:'UP',posterior:81.4,rawPosterior:81.4,regime:'SHORT SQUEEZE',clockAtLock:884,hour:7,session:'EU',windowType:'15m',signals:{gap:0.18,momentum:7.87,structure:0.0,flow:55.0,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77291.99,closingPrice:77318.06,strikeAtLock:77271.46,strikePrice:77271.46,gapAtEntry:2.7,closingGapBps:6.0,fgtAlignment:0.0,rangeBps:0.15,qualityScore:56},
  {id:1777654050998,timestampISO:'2026-05-01T16:47:30.998Z',dir:'DOWN',outcomeDir:'DOWN',posterior:24.4,rawPosterior:38.4,regime:'HIGH VOL CHOP',clockAtLock:749,hour:12,session:'US',windowType:'15m',signals:{gap:-0.68,momentum:-3.97,structure:-15.0,flow:-6.8,technical:18.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78216.73,closingPrice:78202.92,strikeAtLock:78272.34,strikePrice:78272.34,gapAtEntry:-7.1,closingGapBps:-8.9,fgtAlignment:-1.0,rangeBps:-0.1,qualityScore:11},
  {id:1777654857038,timestampISO:'2026-05-01T17:00:57.038Z',dir:'UP',outcomeDir:'UP',posterior:80.4,rawPosterior:72.1,regime:'SHORT SQUEEZE',clockAtLock:843,hour:13,session:'US',windowType:'15m',signals:{gap:0.48,momentum:-1.23,structure:-10.0,flow:55.0,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78275.58,closingPrice:78330.61,strikeAtLock:78225.0,strikePrice:78225.0,gapAtEntry:6.5,closingGapBps:13.5,fgtAlignment:-1.0,rangeBps:0.21,qualityScore:35},
  {id:1777655727557,timestampISO:'2026-05-01T17:15:27.558Z',dir:'UP',outcomeDir:'DOWN',posterior:81.4,rawPosterior:80.8,regime:'SHORT SQUEEZE',clockAtLock:872,hour:13,session:'US',windowType:'15m',signals:{gap:0.04,momentum:11.51,structure:0.0,flow:39.86,technical:0.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78289.26,closingPrice:78249.99,strikeAtLock:78284.99,strikePrice:78284.99,gapAtEntry:0.5,closingGapBps:-4.5,fgtAlignment:0.0,rangeBps:-0.17,qualityScore:49},
  {id:1777656861754,timestampISO:'2026-05-01T17:34:21.754Z',dir:'UP',outcomeDir:'UP',posterior:88.3,rawPosterior:88.3,regime:'SHORT SQUEEZE',clockAtLock:638,hour:13,session:'US',windowType:'15m',signals:{gap:0.22,momentum:0.0,structure:0.0,flow:55.0,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78215.99,closingPrice:78443.01,strikeAtLock:78203.71,strikePrice:78203.71,gapAtEntry:1.6,closingGapBps:30.6,fgtAlignment:-1.0,rangeBps:-0.06,qualityScore:61},
  {id:1777658869636,timestampISO:'2026-05-01T18:07:49.636Z',dir:'UP',outcomeDir:'DOWN',posterior:47.0,rawPosterior:47.0,regime:'TRENDING DOWN',clockAtLock:430,hour:14,session:'US',windowType:'15m',signals:{gap:-1.45,momentum:-4.98,structure:10.0,flow:-49.96,technical:2.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78509.9,closingPrice:78521.55,strikeAtLock:78551.63,strikePrice:78551.63,gapAtEntry:-5.3,closingGapBps:-3.8,fgtAlignment:-3.0,rangeBps:0.0,qualityScore:33},
  {id:1777659474015,timestampISO:'2026-05-01T18:17:54.015Z',dir:'DOWN',outcomeDir:'UP',posterior:13.8,rawPosterior:14.5,regime:'RANGE-CHOP',clockAtLock:726,hour:14,session:'US',windowType:'15m',signals:{gap:-0.06,momentum:-3.03,structure:0.0,flow:-34.92,technical:0.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78528.02,closingPrice:78592.43,strikeAtLock:78532.23,strikePrice:78532.23,gapAtEntry:-0.5,closingGapBps:7.7,fgtAlignment:-2.0,rangeBps:0.0,qualityScore:45},
  {id:1777660258139,timestampISO:'2026-05-01T18:30:58.139Z',dir:'DOWN',outcomeDir:'DOWN',posterior:20.5,rawPosterior:21.6,regime:'RANGE-CHOP',clockAtLock:842,hour:14,session:'US',windowType:'15m',signals:{gap:-0.05,momentum:1.17,structure:0.0,flow:-24.6,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78545.87,closingPrice:78433.58,strikeAtLock:78550.9,strikePrice:78550.9,gapAtEntry:-0.6,closingGapBps:-14.9,fgtAlignment:-3.0,rangeBps:0.0,qualityScore:33},
  {id:1777661334368,timestampISO:'2026-05-01T18:48:54.368Z',dir:'UP',outcomeDir:'UP',posterior:48.4,rawPosterior:48.4,regime:'RANGE-CHOP',clockAtLock:666,hour:14,session:'US',windowType:'15m',signals:{gap:0.13,momentum:1.18,structure:0.0,flow:-26.79,technical:2.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78439.99,closingPrice:78435.04,strikeAtLock:78431.64,strikePrice:78431.64,gapAtEntry:1.1,closingGapBps:0.4,fgtAlignment:-3.0,rangeBps:0.01,qualityScore:12},
  {id:1777662190323,timestampISO:'2026-05-01T19:03:10.323Z',dir:'UP',outcomeDir:'UP',posterior:84.8,rawPosterior:84.8,regime:'SHORT SQUEEZE',clockAtLock:710,hour:15,session:'US',windowType:'15m',signals:{gap:0.78,momentum:10.28,structure:-10.0,flow:55.0,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78478.36,closingPrice:78513.16,strikeAtLock:78422.21,strikePrice:78422.21,gapAtEntry:7.2,closingGapBps:11.6,fgtAlignment:-1.0,rangeBps:0.1,qualityScore:56},
  {id:1777663030533,timestampISO:'2026-05-01T19:17:10.533Z',dir:'DOWN',outcomeDir:'DOWN',posterior:51.9,rawPosterior:51.9,regime:'TRENDING DOWN',clockAtLock:769,hour:15,session:'US',windowType:'15m',signals:{gap:-0.65,momentum:-5.91,structure:10.0,flow:-16.26,technical:10.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78446.22,closingPrice:78429.07,strikeAtLock:78502.3,strikePrice:78502.3,gapAtEntry:-7.1,closingGapBps:-9.3,fgtAlignment:-1.0,rangeBps:-0.19,qualityScore:33},
  {id:1777665881166,timestampISO:'2026-05-01T20:04:41.166Z',dir:'UP',outcomeDir:'DOWN',posterior:87.6,rawPosterior:87.5,regime:'SHORT SQUEEZE',clockAtLock:619,hour:16,session:'US',windowType:'15m',signals:{gap:-0.59,momentum:2.73,structure:0.0,flow:55.0,technical:0.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78380.28,closingPrice:78300.0,strikeAtLock:78411.55,strikePrice:78411.55,gapAtEntry:-4.0,closingGapBps:-14.2,fgtAlignment:-1.0,rangeBps:0.0,qualityScore:60},
  {id:1777666573330,timestampISO:'2026-05-01T20:16:13.330Z',dir:'DOWN',outcomeDir:'DOWN',posterior:19.8,rawPosterior:41.7,regime:'RANGE-CHOP',clockAtLock:827,hour:16,session:'US',windowType:'15m',signals:{gap:-0.24,momentum:-2.88,structure:0.0,flow:-4.55,technical:2.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78269.99,closingPrice:78141.44,strikeAtLock:78293.82,strikePrice:78293.82,gapAtEntry:-3.0,closingGapBps:-19.5,fgtAlignment:-1.0,rangeBps:0.0,qualityScore:13},
  {id:1777667585357,timestampISO:'2026-05-01T20:33:05.357Z',dir:'UP',outcomeDir:'DOWN',posterior:84.8,rawPosterior:84.8,regime:'SHORT SQUEEZE',clockAtLock:714,hour:16,session:'US',windowType:'15m',signals:{gap:0.04,momentum:1.96,structure:0.0,flow:55.0,technical:0.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78153.0,closingPrice:77978.3,strikeAtLock:78150.05,strikePrice:78150.05,gapAtEntry:0.4,closingGapBps:-22.0,fgtAlignment:1.0,rangeBps:0.0,qualityScore:56},
  {id:1777668358727,timestampISO:'2026-05-01T20:45:58.727Z',dir:'UP',outcomeDir:'DOWN',posterior:65.4,rawPosterior:65.4,regime:'SHORT SQUEEZE',clockAtLock:841,hour:16,session:'US',windowType:'15m',signals:{gap:0.33,momentum:1.95,structure:-9.0,flow:55.0,technical:-10.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78020.28,closingPrice:77872.97,strikeAtLock:77986.13,strikePrice:77986.13,gapAtEntry:4.4,closingGapBps:-14.5,fgtAlignment:1.0,rangeBps:0.23,qualityScore:21},
  {id:1777669394598,timestampISO:'2026-05-01T21:03:14.598Z',dir:'UP',outcomeDir:'UP',posterior:84.6,rawPosterior:83.6,regime:'SHORT SQUEEZE',clockAtLock:706,hour:17,session:'US',windowType:'15m',signals:{gap:1.05,momentum:8.9,structure:-12.0,flow:55.0,technical:-10.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77950.55,closingPrice:77959.2,strikeAtLock:77873.81,strikePrice:77873.81,gapAtEntry:9.9,closingGapBps:11.0,fgtAlignment:1.0,rangeBps:0.0,qualityScore:54},
  {id:1777670321365,timestampISO:'2026-05-01T21:18:41.365Z',dir:'UP',outcomeDir:'UP',posterior:83.7,rawPosterior:87.1,regime:'SHORT SQUEEZE',clockAtLock:679,hour:17,session:'US',windowType:'15m',signals:{gap:0.47,momentum:2.56,structure:0.0,flow:55.0,technical:-10.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:77975.0,closingPrice:78026.44,strikeAtLock:77944.16,strikePrice:77944.16,gapAtEntry:4.0,closingGapBps:10.6,fgtAlignment:1.0,rangeBps:0.05,qualityScore:59},
  {id:1777671150190,timestampISO:'2026-05-01T21:32:30.190Z',dir:'UP',outcomeDir:'UP',posterior:84.1,rawPosterior:84.1,regime:'SHORT SQUEEZE',clockAtLock:750,hour:17,session:'US',windowType:'15m',signals:{gap:1.25,momentum:9.35,structure:0.0,flow:55.0,technical:-25.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78108.33,closingPrice:78112.95,strikeAtLock:78006.44,strikePrice:78006.44,gapAtEntry:13.1,closingGapBps:13.7,fgtAlignment:1.0,rangeBps:0.29,qualityScore:55},
  {id:1777672208830,timestampISO:'2026-05-01T21:50:08.830Z',dir:'UP',outcomeDir:'UP',posterior:88.1,rawPosterior:88.3,regime:'SHORT SQUEEZE',clockAtLock:592,hour:17,session:'US',windowType:'15m',signals:{gap:1.51,momentum:4.99,structure:12.0,flow:55.0,technical:-15.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78171.78,closingPrice:78207.04,strikeAtLock:78098.34,strikePrice:78098.34,gapAtEntry:9.4,closingGapBps:13.9,fgtAlignment:0.0,rangeBps:0.15,qualityScore:61},
  {id:1777672896917,timestampISO:'2026-05-01T22:01:36.917Z',dir:'UP',outcomeDir:'UP',posterior:81.4,rawPosterior:81.4,regime:'SHORT SQUEEZE',clockAtLock:803,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.57,momentum:1.86,structure:15.0,flow:55.0,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78249.16,closingPrice:78330.1,strikeAtLock:78195.36,strikePrice:78195.36,gapAtEntry:6.9,closingGapBps:17.2,fgtAlignment:0.0,rangeBps:0.0,qualityScore:49},
  {id:1777675668449,timestampISO:'2026-05-01T22:47:48.449Z',dir:'DOWN',outcomeDir:'DOWN',posterior:16.7,rawPosterior:20.8,regime:'RANGE-CHOP',clockAtLock:732,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:-0.31,momentum:-1.2,structure:0.0,flow:-19.3,technical:-8.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78216.55,closingPrice:78146.63,strikeAtLock:78240.46,strikePrice:78240.46,gapAtEntry:-3.1,closingGapBps:-12.0,fgtAlignment:-1.0,rangeBps:0.0,qualityScore:35},
  {id:1777676615456,timestampISO:'2026-05-01T23:03:35.456Z',dir:'UP',outcomeDir:'DOWN',posterior:87.0,rawPosterior:87.0,regime:'SHORT SQUEEZE',clockAtLock:685,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.1,momentum:2.72,structure:0.0,flow:55.0,technical:-10.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78152.29,closingPrice:78121.18,strikeAtLock:78145.51,strikePrice:78145.51,gapAtEntry:0.9,closingGapBps:-3.1,fgtAlignment:-1.0,rangeBps:0.0,qualityScore:58},
  {id:1777678676827,timestampISO:'2026-05-01T23:37:56.827Z',dir:'UP',outcomeDir:'UP',posterior:87.5,rawPosterior:88.3,regime:'SHORT SQUEEZE',clockAtLock:423,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:1.57,momentum:5.0,structure:0.0,flow:55.0,technical:-10.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78095.22,closingPrice:78095.66,strikeAtLock:78051.28,strikePrice:78051.28,gapAtEntry:5.6,closingGapBps:5.7,fgtAlignment:-1.0,rangeBps:0.12,qualityScore:60},
  {id:1777679342049,timestampISO:'2026-05-01T23:49:02.049Z',dir:'UP',outcomeDir:'UP',posterior:87.5,rawPosterior:88.3,regime:'SHORT SQUEEZE',clockAtLock:658,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.77,momentum:4.4,structure:0.0,flow:55.0,technical:-10.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78167.36,closingPrice:78231.97,strikeAtLock:78120.6,strikePrice:78120.6,gapAtEntry:6.0,closingGapBps:14.3,fgtAlignment:-1.0,rangeBps:0.0,qualityScore:60},
  {id:1777680090860,timestampISO:'2026-05-02T00:01:30.860Z',dir:'UP',outcomeDir:'DOWN',posterior:81.2,rawPosterior:60.4,regime:'SHORT SQUEEZE',clockAtLock:809,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.35,momentum:7.51,structure:0.0,flow:21.58,technical:0.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78249.42,closingPrice:78200.16,strikeAtLock:78215.98,strikePrice:78215.98,gapAtEntry:4.3,closingGapBps:-2.0,fgtAlignment:-1.0,rangeBps:0.09,qualityScore:27},
  {id:1777681337840,timestampISO:'2026-05-02T00:22:17.840Z',dir:'UP',outcomeDir:'UP',posterior:88.3,rawPosterior:74.4,regime:'SHORT SQUEEZE',clockAtLock:462,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.79,momentum:3.01,structure:0.0,flow:55.0,technical:-10.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78228.31,closingPrice:78279.04,strikeAtLock:78203.41,strikePrice:78203.41,gapAtEntry:3.2,closingGapBps:9.7,fgtAlignment:-1.0,rangeBps:0.08,qualityScore:42},
  {id:1777681867794,timestampISO:'2026-05-02T00:31:07.794Z',dir:'UP',outcomeDir:'UP',posterior:81.4,rawPosterior:81.4,regime:'RANGE-CHOP',clockAtLock:832,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.23,momentum:-0.32,structure:0.0,flow:55.0,technical:8.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78305.53,closingPrice:78325.19,strikeAtLock:78281.9,strikePrice:78281.9,gapAtEntry:3.0,closingGapBps:5.5,fgtAlignment:-1.0,rangeBps:0.2,qualityScore:46},
  {id:1777682722823,timestampISO:'2026-05-02T00:45:22.823Z',dir:'UP',outcomeDir:'UP',posterior:80.3,rawPosterior:60.7,regime:'TRENDING UP',clockAtLock:877,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.4,momentum:14.23,structure:-10.0,flow:27.9,technical:3.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78361.66,closingPrice:78346.02,strikeAtLock:78317.17,strikePrice:78317.17,gapAtEntry:5.7,closingGapBps:3.7,fgtAlignment:0.0,rangeBps:0.39,qualityScore:22},
  {id:1777683905786,timestampISO:'2026-05-02T01:05:05.786Z',dir:'UP',outcomeDir:'UP',posterior:87.5,rawPosterior:87.5,regime:'SHORT SQUEEZE',clockAtLock:594,hour:21,session:'ASIA',windowType:'15m',signals:{gap:-0.32,momentum:-3.94,structure:0.0,flow:55.0,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78301.99,closingPrice:78349.0,strikeAtLock:78317.62,strikePrice:78317.62,gapAtEntry:-2.0,closingGapBps:4.0,fgtAlignment:0.0,rangeBps:-0.16,qualityScore:63},
  {id:1777684528587,timestampISO:'2026-05-02T01:15:28.587Z',dir:'UP',outcomeDir:'DOWN',posterior:81.4,rawPosterior:81.4,regime:'SHORT SQUEEZE',clockAtLock:871,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.12,momentum:0.03,structure:7.2,flow:55.0,technical:-5.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78370.04,closingPrice:78345.4,strikeAtLock:78356.61,strikePrice:78356.61,gapAtEntry:1.7,closingGapBps:-1.4,fgtAlignment:0.0,rangeBps:0.24,qualityScore:54},
  {id:1777685527740,timestampISO:'2026-05-02T01:32:07.740Z',dir:'UP',outcomeDir:'UP',posterior:84.5,rawPosterior:84.5,regime:'RANGE-CHOP',clockAtLock:772,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.24,momentum:3.73,structure:0.0,flow:55.0,technical:-5.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78365.0,closingPrice:78375.99,strikeAtLock:78343.9,strikePrice:78343.9,gapAtEntry:2.7,closingGapBps:4.1,fgtAlignment:1.0,rangeBps:0.11,qualityScore:51},
  {id:1777686506060,timestampISO:'2026-05-02T01:48:26.060Z',dir:'UP',outcomeDir:'UP',posterior:84.1,rawPosterior:87.4,regime:'RANGE-CHOP',clockAtLock:694,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.07,momentum:0.54,structure:0.0,flow:55.0,technical:-5.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78337.99,closingPrice:78339.79,strikeAtLock:78332.89,strikePrice:78332.89,gapAtEntry:0.7,closingGapBps:0.9,fgtAlignment:1.0,rangeBps:-0.17,qualityScore:56},
  {id:1777687585600,timestampISO:'2026-05-02T02:06:25.600Z',dir:'UP',outcomeDir:'DOWN',posterior:87.5,rawPosterior:87.4,regime:'SHORT SQUEEZE',clockAtLock:515,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.88,momentum:-0.22,structure:0.0,flow:55.0,technical:-5.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78348.23,closingPrice:78291.56,strikeAtLock:78314.97,strikePrice:78314.97,gapAtEntry:4.2,closingGapBps:-3.0,fgtAlignment:0.0,rangeBps:0.0,qualityScore:64},
  {id:1777690300228,timestampISO:'2026-05-02T02:51:40.228Z',dir:'UP',outcomeDir:'DOWN',posterior:88.0,rawPosterior:87.8,regime:'SHORT SQUEEZE',clockAtLock:500,hour:22,session:'ASIA',windowType:'15m',signals:{gap:1.01,momentum:2.16,structure:0.0,flow:55.0,technical:-5.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78413.98,closingPrice:78358.09,strikeAtLock:78377.62,strikePrice:78377.62,gapAtEntry:4.6,closingGapBps:-2.5,fgtAlignment:-1.0,rangeBps:0.0,qualityScore:64},
  {id:1777690851218,timestampISO:'2026-05-02T03:00:51.218Z',dir:'DOWN',outcomeDir:'DOWN',posterior:58.9,rawPosterior:58.9,regime:'RANGE-CHOP',clockAtLock:849,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.21,momentum:-3.39,structure:0.0,flow:31.03,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78380.59,closingPrice:78269.55,strikeAtLock:78358.79,strikePrice:78358.79,gapAtEntry:2.8,closingGapBps:-11.4,fgtAlignment:-1.0,rangeBps:0.21,qualityScore:16},
  {id:1777691790489,timestampISO:'2026-05-02T03:16:30.489Z',dir:'UP',outcomeDir:'UP',posterior:49.8,rawPosterior:49.8,regime:'TRENDING DOWN',clockAtLock:809,hour:23,session:'ASIA',windowType:'15m',signals:{gap:-0.3,momentum:-1.7,structure:0.0,flow:-42.99,technical:8.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78248.58,closingPrice:78382.85,strikeAtLock:78277.2,strikePrice:78277.2,gapAtEntry:-3.7,closingGapBps:13.5,fgtAlignment:1.0,rangeBps:-0.14,qualityScore:34},
  {id:1777692779590,timestampISO:'2026-05-02T03:32:59.590Z',dir:'UP',outcomeDir:'UP',posterior:60.0,rawPosterior:60.0,regime:'RANGE-CHOP',clockAtLock:720,hour:23,session:'ASIA',windowType:'15m',signals:{gap:-0.11,momentum:-0.01,structure:0.0,flow:-25.71,technical:8.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78380.95,closingPrice:78400.73,strikeAtLock:78389.01,strikePrice:78389.01,gapAtEntry:-1.0,closingGapBps:1.5,fgtAlignment:0.0,rangeBps:-0.01,qualityScore:16},
  {id:1777693519286,timestampISO:'2026-05-02T03:45:19.286Z',dir:'DOWN',outcomeDir:'UP',posterior:50.4,rawPosterior:50.4,regime:'RANGE-CHOP',clockAtLock:881,hour:23,session:'ASIA',windowType:'15m',signals:{gap:-0.13,momentum:-6.24,structure:0.0,flow:-37.83,technical:0.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78382.34,closingPrice:78438.76,strikeAtLock:78396.72,strikePrice:78396.72,gapAtEntry:-1.8,closingGapBps:5.4,fgtAlignment:0.0,rangeBps:-0.23,qualityScore:16},
  {id:1777694440054,timestampISO:'2026-05-02T04:00:40.054Z',dir:'DOWN',outcomeDir:'DOWN',posterior:41.7,rawPosterior:41.7,regime:'RANGE-CHOP',clockAtLock:860,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:1.64,structure:9.0,flow:-36.25,technical:10.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78434.73,closingPrice:78288.28,strikeAtLock:78434.29,strikePrice:78434.29,gapAtEntry:0.1,closingGapBps:-18.6,fgtAlignment:0.0,rangeBps:-0.04,qualityScore:16},
  {id:1777695358318,timestampISO:'2026-05-02T04:15:58.318Z',dir:'UP',outcomeDir:'DOWN',posterior:80.4,rawPosterior:80.6,regime:'SHORT SQUEEZE',clockAtLock:842,hour:0,session:'ASIA',windowType:'15m',signals:{gap:-0.15,momentum:-1.06,structure:0.0,flow:40.71,technical:0.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78268.17,closingPrice:78281.05,strikeAtLock:78283.39,strikePrice:78283.39,gapAtEntry:-1.9,closingGapBps:-0.3,fgtAlignment:1.0,rangeBps:-0.16,qualityScore:53},
  {id:1777696641171,timestampISO:'2026-05-02T04:37:21.171Z',dir:'DOWN',outcomeDir:'DOWN',posterior:47.0,rawPosterior:47.0,regime:'RANGE-CHOP',clockAtLock:459,hour:0,session:'ASIA',windowType:'15m',signals:{gap:-0.11,momentum:0.03,structure:-9.0,flow:-38.31,technical:0.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78275.59,closingPrice:78229.36,strikeAtLock:78278.98,strikePrice:78278.98,gapAtEntry:-0.4,closingGapBps:-6.3,fgtAlignment:1.0,rangeBps:-0.02,qualityScore:16},
  {id:1777698580777,timestampISO:'2026-05-02T05:09:40.778Z',dir:'UP',outcomeDir:'DOWN',posterior:54.5,rawPosterior:54.5,regime:'RANGE-CHOP',clockAtLock:319,hour:1,session:'ASIA',windowType:'15m',signals:{gap:1.3,momentum:3.57,structure:0.0,flow:17.83,technical:-2.0,regime:0.0,rangePosition:0.0},result:'LOSS',entryPrice:78192.88,closingPrice:78092.36,strikeAtLock:78174.98,strikePrice:78174.98,gapAtEntry:2.3,closingGapBps:-10.6,fgtAlignment:1.0,rangeBps:0.0,qualityScore:16},
  {id:1777699897035,timestampISO:'2026-05-02T05:31:37.035Z',dir:'UP',outcomeDir:'UP',posterior:81.4,rawPosterior:81.3,regime:'SHORT SQUEEZE',clockAtLock:803,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.56,momentum:10.03,structure:0.0,flow:55.0,technical:-10.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78143.99,closingPrice:78193.8,strikeAtLock:78090.86,strikePrice:78090.86,gapAtEntry:6.8,closingGapBps:13.2,fgtAlignment:1.0,rangeBps:0.25,qualityScore:54},
  {id:1777700842998,timestampISO:'2026-05-02T05:47:22.998Z',dir:'UP',outcomeDir:'UP',posterior:84.1,rawPosterior:84.8,regime:'SHORT SQUEEZE',clockAtLock:757,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.37,momentum:4.36,structure:9.0,flow:55.0,technical:-2.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78220.22,closingPrice:78211.79,strikeAtLock:78189.11,strikePrice:78189.11,gapAtEntry:4.0,closingGapBps:2.9,fgtAlignment:0.0,rangeBps:0.14,qualityScore:60},
  {id:1777709015809,timestampISO:'2026-05-02T08:03:35.809Z',dir:'UP',outcomeDir:'UP',posterior:62.2,rawPosterior:62.2,regime:'SHORT SQUEEZE',clockAtLock:684,hour:4,session:'EU',windowType:'15m',signals:{gap:-0.18,momentum:-0.79,structure:-5.4,flow:47.0,technical:-8.0,regime:0.0,rangePosition:0.0},result:'WIN',entryPrice:78200.55,closingPrice:78256.19,strikeAtLock:78212.66,strikePrice:78212.66,gapAtEntry:-1.5,closingGapBps:5.6,fgtAlignment:0.30000000000000004,rangeBps:-0.06,qualityScore:27},
];

const loadTradeLog=()=>{try{const s=localStorage.getItem('taraTradeLogV110');if(s){const p=JSON.parse(s);if(p&&p.length>0)return p;}return SEED_TRADES;}catch(e){return SEED_TRADES;}};
const saveTradeLog=(log)=>{try{localStorage.setItem('taraTradeLogV110',JSON.stringify(log.slice(-500)));}catch(e){}}; // keep last 500
// V134: Reset just the directional/learning state, keep trade history + scorecard
  // Use this when you want Tara to give UP/DOWN equal consideration without losing your wins/losses record
  const resetDirectionalBias=()=>{
    if(!confirm('Reset Tara\'s UP/DOWN bias? Trade log and W-L scorecard will be PRESERVED. Adaptive weights, regime weights, and calibration will reset to defaults so direction priors don\'t lean.'))return;
    try{
      // Reset adaptive signal weights to defaults
      localStorage.removeItem('taraWeightsV110');
      // Reset per-regime signal weights
      Object.keys(localStorage).filter(k=>k.startsWith('taraV110RW_')).forEach(k=>localStorage.removeItem(k));
      // Reset calibration buckets (so old UP-skewed calibration doesn't carry over)
      localStorage.removeItem('taraCalibrationV110');
      // KEEP: taraTradeLogV110 (history), taraV110Score (W-L), taraV110Mem (regime memory)
      window.location.reload();
    }catch(e){alert('Reset failed: '+e.message);}
  };

  // V145: Full fresh-start reset. Wipes everything — trade log, scorecard, weights, calibration.
  //       Tara starts from zero with the V144 calibration prior baked in. Useful when bumping
  //       to a new version with significant engine changes, when the user wants to retrain from
  //       scratch with their own data, or after recovering from corrupted localStorage.
  const resetFreshStart=()=>{
    if(!confirm('FRESH START: wipe all training data, weights, calibration, AND scorecard? Tara will start from V144 prior with no learning history. This is irreversible — only do this when you want to retrain from your own trades.'))return;
    try{
      localStorage.removeItem('taraTradeLogV110');     // trade history
      localStorage.removeItem('taraV110Score');        // W-L scorecard
      localStorage.removeItem('taraScoreV110');        // alt scorecard key
      localStorage.removeItem('taraWeightsV110');      // adaptive signal weights
      localStorage.removeItem('taraCalibrationV110');  // calibration buckets
      localStorage.removeItem('taraV110Mem');          // regime memory
      Object.keys(localStorage).filter(k=>k.startsWith('taraV110RW_')).forEach(k=>localStorage.removeItem(k));
      localStorage.setItem('taraBaselineVersion',BASELINE_VERSION); // mark as on-current-version
      window.location.reload();
    }catch(e){alert('Reset failed: '+e.message);}
  };
  
  const resetToLatestBaseline=()=>{try{
  // V111: Sync to baseline training data (matches across all devices)
  localStorage.setItem('taraTradeLogV110',JSON.stringify(SEED_TRADES));
  localStorage.setItem('taraScoreV110',JSON.stringify(BASELINE_RECORD));
  localStorage.removeItem('taraWeightsV110');
  localStorage.setItem('taraBaselineVersion',BASELINE_VERSION);
  Object.keys(localStorage).filter(k=>k.startsWith('taraV110RW_')).forEach(k=>localStorage.removeItem(k));
  return true;
}catch(e){return false;}};

// ── GRADIENT DESCENT WEIGHT UPDATE ──
// After each trade, credit/blame each signal proportionally to its contribution
const updateWeights=(weights,tradeLog,result)=>{
  // V134: Attribution-weighted gradient descent — only update signals that
  // meaningfully contributed to the call. Prevents noise updates on bystanders.
  const last=tradeLog[tradeLog.length-1];
  if(!last||!last.signals||!last.posterior)return weights;
  // V144: DATA QUALITY GATE — refuse to learn from trades with essentially empty signal data.
  //       The seed log had 90%+ trades with all-zero signal vectors (logging bug from older
  //       versions). Running gradient descent on these was teaching the engine random noise.
  //       Now: require at least 3 non-trivial signals before this trade contributes to learning.
  const nonZeroSignals=Object.values(last.signals).filter(v=>Math.abs(v)>0.5).length;
  if(nonZeroSignals<3)return weights;
  const won=result==='WIN';
  const sig=last.signals;
  const totalAbs=Object.values(sig).reduce((s,v)=>s+Math.abs(v),0)||1;
  const conviction=Math.abs(last.posterior-50)/50;
  const idx=tradeLog.length-1;
  const totalTrades=Math.max(1,tradeLog.length);
  const recencyMult=0.5+1.5*(idx/totalTrades);
  // V134: Use trade direction (UP/DOWN), not raw posterior sign — handles edge cases
  // where posterior is near 50 but trade direction is committed
  const tradeDirSign=last.dir==='UP'?1:last.dir==='DOWN'?-1:Math.sign(last.posterior-50);
  const newW={...weights};
  Object.keys(sig).forEach(k=>{
    if(!(k in newW))return;
    const contribution=Math.abs(sig[k])/totalAbs;
    // V134: ATTRIBUTION GATE — only update signals that contributed >10% of decision
    // Bystanders (like flow=0 when momentum drove the call) shouldn't get credit/blame
    if(contribution<0.10)return;
    const aligned=Math.sign(sig[k])===tradeDirSign&&sig[k]!==0;
    let delta=LEARNING_RATE*contribution*conviction*recencyMult;
    if(won&&aligned)newW[k]+=delta;          // signal helped, win → reward proportional
    else if(won&&!aligned)newW[k]-=delta*0.3; // signal opposed, win anyway → small demote
    else if(!won&&aligned)newW[k]-=delta;     // signal led us to loss → demote fully
    else if(!won&&!aligned)newW[k]+=delta*0.2;// signal opposed, still lost → small boost
    const[lo,hi]=WEIGHT_BOUNDS[k]||[2,55];
    newW[k]=Math.max(lo,Math.min(hi,newW[k]));
  });
  saveWeights(newW);
  return newW;
};
// Per-regime weight updater — same logic but targets the regime-specific set
const updateRegimeWeights=(regimeWeightsObj,trade,result)=>{
  if(!trade||!trade.signals||!trade.posterior)return regimeWeightsObj;
  // V144: data quality gate (mirror of updateWeights)
  const nonZeroSignals=Object.values(trade.signals).filter(v=>Math.abs(v)>0.5).length;
  if(nonZeroSignals<3)return regimeWeightsObj;
  const rg=trade.regime||'RANGE-CHOP';
  if(!regimeWeightsObj[rg])return regimeWeightsObj;
  const weights=regimeWeightsObj[rg];
  // V134: use trade direction for alignment
  const tradeDirSign=trade.dir==='UP'?1:trade.dir==='DOWN'?-1:Math.sign(trade.posterior-50);
  const won=result==='WIN';
  const sig=trade.signals;
  const totalAbs=Object.values(sig).reduce((s,v)=>s+Math.abs(v),0)||1;
  const conviction=Math.abs(trade.posterior-50)/50;
  const newW={...weights};
  Object.keys(sig).forEach(k=>{
    if(!(k in newW))return;
    const contribution=Math.abs(sig[k])/totalAbs;
    // V134: attribution gate
    if(contribution<0.10)return;
    const aligned=Math.sign(sig[k])===tradeDirSign&&sig[k]!==0;
    let delta=(LEARNING_RATE*2.5)*contribution*conviction;
    // V143: Per-regime LR multiplier raised 1.2 → 2.5. Previous setting produced
    //       ~1-3pt regime weight differentiation after hundreds of trades. With 2.5x,
    //       regimes meaningfully diverge after ~30-50 trades. Bounds (5-65) keep clamps intact.
    if(won&&aligned)newW[k]+=delta;
    else if(won&&!aligned)newW[k]-=delta*0.3;
    else if(!won&&aligned)newW[k]-=delta;
    else if(!won&&!aligned)newW[k]+=delta*0.2;
    const[lo,hi]=WEIGHT_BOUNDS[k]||[2,55];
    newW[k]=Math.max(lo,Math.min(hi,newW[k]));
  });
  const updated={...regimeWeightsObj,[rg]:newW};
  saveRegimeWeights(updated);
  return updated;
};

// ── CALIBRATION ENGINE ──
// Maps raw posterior buckets → actual historical win rates
// V144: Default calibration baked from seed trade outcomes — UP SIDE ONLY.
//
//   Why UP-only? The seed log contains DOWN trades that ALREADY survived a broken DOWN-gate
//   (V141 root-fix found that DOWN locks were structurally suppressed). So the DOWN trades
//   in the seed are a biased sample — they're the few DOWN locks that overcame the broken
//   gates, which were mostly desperate late-window calls. Using their WR to "calibrate"
//   normal DOWN posteriors would over-correct and prevent any DOWN locks from firing.
//
//   For UP side, the data is more representative: UP locks fired easily (no broken gate
//   suppressing them), so the seed reflects actual UP performance across the conviction range.
//
//   Result: UP posteriors get a calibration haircut (raw 95% → ~88% real). DOWN posteriors
//   stay raw until live post-V141 data accumulates and we can build unbiased DOWN calibration.
const DEFAULT_CALIBRATION={
  // UP side — seed-derived corrections
  90: 86.4,  // raw 90-99% UP → ~86% real WR (small over-confidence)
  80: 64.5,  // raw 80-89% UP → 65% real WR (significant over-confidence)
  70: 56.2,  // raw 70-79% UP → 56% real WR
  // Mid-range — defer to raw (no correction)
  60: null,
  50: null,
  40: null,
  // DOWN side — defer to raw, will populate from live trades only
  30: null,
  20: null,
  10: null,
  0:  null,
};

const buildCalibration=(tradeLog)=>{
  const buckets={};
  for(let b=0;b<=90;b+=10)buckets[b]={wins:0,total:0};
  tradeLog.filter(t=>t.result).forEach(t=>{
    // V144: Removed dead variable `upBias` (never read). Kept the bucket math.
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
    // V144: When live data is sparse (<10 trades for this bucket), fall back to seed-derived prior.
    //       Was hard-cutoff at 3 — meaning sparse buckets returned null and got no correction.
    if(total>=10){
      cal[k]=(wins/total)*100;
    } else if(total>=3){
      // Blend live + prior, weighted by sample size
      const liveRate=(wins/total)*100;
      const prior=DEFAULT_CALIBRATION[k];
      if(prior!=null){
        const w=total/10; // 0.3 for n=3, 1.0 for n=10+
        cal[k]=liveRate*w+prior*(1-w);
      } else {
        cal[k]=liveRate;
      }
    } else {
      // <3 live samples — use seed prior as-is
      cal[k]=DEFAULT_CALIBRATION[k];
    }
  });
  return cal;
};

// V134: Chart Pattern Recognition
// Detects simple actionable patterns in candle history.
// Returns {pattern: 'doubleTop'|'doubleBottom'|'wedgeUp'|'wedgeDn'|null, confidence: 0-1}
const detectChartPattern=(history)=>{
  if(!history||history.length<10)return{pattern:null,confidence:0};
  const recent=history.slice(0,15); // last 15 candles
  const highs=recent.map(c=>c.h||c.c||0);
  const lows=recent.map(c=>c.l||c.c||0);
  const closes=recent.map(c=>c.c||0);
  // Find peaks (local maxima) and troughs (local minima)
  const peaks=[],troughs=[];
  for(let i=1;i<recent.length-1;i++){
    if(highs[i]>highs[i-1]&&highs[i]>highs[i+1])peaks.push({i,p:highs[i]});
    if(lows[i]<lows[i-1]&&lows[i]<lows[i+1])troughs.push({i,p:lows[i]});
  }
  // Double Top: 2 peaks within 0.3% of each other, separated by 3+ candles
  if(peaks.length>=2){
    const[p1,p2]=peaks.slice(-2);
    const diff=Math.abs(p1.p-p2.p)/p2.p;
    if(diff<0.003&&Math.abs(p1.i-p2.i)>=3){
      return{pattern:'doubleTop',confidence:0.7,detail:`Resistance at $${p1.p.toFixed(0)}`};
    }
  }
  // Double Bottom: 2 troughs within 0.3% of each other
  if(troughs.length>=2){
    const[t1,t2]=troughs.slice(-2);
    const diff=Math.abs(t1.p-t2.p)/t2.p;
    if(diff<0.003&&Math.abs(t1.i-t2.i)>=3){
      return{pattern:'doubleBottom',confidence:0.7,detail:`Support at $${t1.p.toFixed(0)}`};
    }
  }
  // Wedge: highs decreasing AND lows increasing (compression)
  if(peaks.length>=2&&troughs.length>=2){
    const peakSlope=(peaks[peaks.length-1].p-peaks[0].p)/(peaks[peaks.length-1].i-peaks[0].i||1);
    const troughSlope=(troughs[troughs.length-1].p-troughs[0].p)/(troughs[troughs.length-1].i-troughs[0].i||1);
    // Descending highs, ascending lows = symmetrical triangle (breakout imminent)
    if(peakSlope<-2&&troughSlope>2){
      return{pattern:'compression',confidence:0.6,detail:'Symmetrical triangle — breakout imminent'};
    }
    // Ascending wedge (rising channel) = often bearish
    if(peakSlope>0&&troughSlope>0&&peakSlope<troughSlope){
      return{pattern:'wedgeUp',confidence:0.5,detail:'Rising wedge — bearish bias'};
    }
    // Descending wedge = often bullish
    if(peakSlope<0&&troughSlope<0&&peakSlope>troughSlope){
      return{pattern:'wedgeDn',confidence:0.5,detail:'Falling wedge — bullish bias'};
    }
  }
  return{pattern:null,confidence:0};
};

// V134: Brier Score — proper calibration metric for binary predictions
const computeBrierScore=(tradeLog)=>{
  const trades=tradeLog.filter(t=>t.result&&t.posterior!=null);
  if(trades.length<5)return{score:null,n:trades.length,note:'Need 5+ trades'};
  let sumSquaredErr=0;
  trades.forEach(t=>{
    const conf=t.dir==='UP'?t.posterior:(100-t.posterior);
    const probWin=conf/100;
    const actual=t.result==='WIN'?1:0;
    sumSquaredErr+=Math.pow(probWin-actual,2);
  });
  const score=sumSquaredErr/trades.length;
  let grade='No skill';
  if(score<0.10)grade='Excellent';
  else if(score<0.15)grade='Strong';
  else if(score<0.20)grade='Useful';
  else if(score<0.24)grade='Marginal';
  return{score,n:trades.length,grade};
};

// V134: REAL BACKTEST FRAMEWORK — replay all historical trades and evaluate
// what current logic WOULD have done. This is the missing piece for validating changes.
const runFullBacktest=(tradeLog,opts={})=>{
  const min=opts.minTrades||10;
  const trades=tradeLog.filter(t=>t.result&&t.posterior!=null&&t.signals);
  if(trades.length<min)return{ready:false,n:trades.length,note:`Need ${min}+ resolved trades`};
  // Evaluate Tara's actual call accuracy
  const totalWins=trades.filter(t=>t.result==='WIN').length;
  const wr=totalWins/trades.length;
  // Per-direction
  const ups=trades.filter(t=>t.dir==='UP');
  const dns=trades.filter(t=>t.dir==='DOWN');
  const upWR=ups.length>0?ups.filter(t=>t.result==='WIN').length/ups.length:0;
  const dnWR=dns.length>0?dns.filter(t=>t.result==='WIN').length/dns.length:0;
  // Per-regime
  const regimePerf={};
  trades.forEach(t=>{
    const r=t.regime||'UNKNOWN';
    if(!regimePerf[r])regimePerf[r]={n:0,wins:0};
    regimePerf[r].n++;
    if(t.result==='WIN')regimePerf[r].wins++;
  });
  // Per-session
  const sessionPerf={};
  trades.forEach(t=>{
    const s=t.session||'UNKNOWN';
    if(!sessionPerf[s])sessionPerf[s]={n:0,wins:0};
    sessionPerf[s].n++;
    if(t.result==='WIN')sessionPerf[s].wins++;
  });
  // Per-clockBucket (early/mid/late lock)
  const clockPerf={'early(<300s)':{n:0,wins:0},'mid(300-700)':{n:0,wins:0},'late(700-820)':{n:0,wins:0},'verylate(>820)':{n:0,wins:0}};
  trades.forEach(t=>{
    const c=parseInt(t.clockAtLock)||0;
    let b='early(<300s)';
    if(c>820)b='verylate(>820)';
    else if(c>700)b='late(700-820)';
    else if(c>300)b='mid(300-700)';
    if(clockPerf[b]){clockPerf[b].n++;if(t.result==='WIN')clockPerf[b].wins++;}
  });
  // Brier score
  let brierSum=0;
  trades.forEach(t=>{
    const conf=t.dir==='UP'?t.posterior:(100-t.posterior);
    const probWin=conf/100;
    const actual=t.result==='WIN'?1:0;
    brierSum+=Math.pow(probWin-actual,2);
  });
  const brier=brierSum/trades.length;
  // Streaks
  let curStreak=0,curStreakType='',maxWinStreak=0,maxLossStreak=0;
  trades.forEach(t=>{
    if(t.result===curStreakType){curStreak++;}
    else{curStreak=1;curStreakType=t.result;}
    if(t.result==='WIN')maxWinStreak=Math.max(maxWinStreak,curStreak);
    else maxLossStreak=Math.max(maxLossStreak,curStreak);
  });
  // Confidence buckets (for calibration heatmap)
  const confBuckets={};
  for(let b=50;b<=90;b+=5)confBuckets[b]={n:0,wins:0};
  trades.forEach(t=>{
    const conf=t.dir==='UP'?t.posterior:(100-t.posterior);
    const bucket=Math.min(90,Math.max(50,Math.floor(conf/5)*5));
    if(confBuckets[bucket]){confBuckets[bucket].n++;if(t.result==='WIN')confBuckets[bucket].wins++;}
  });
  // Direction × regime
  const dirRegime={};
  trades.forEach(t=>{
    const k=t.dir+':'+(t.regime||'?');
    if(!dirRegime[k])dirRegime[k]={n:0,wins:0};
    dirRegime[k].n++;
    if(t.result==='WIN')dirRegime[k].wins++;
  });
  // Filter scenarios — what WR would we get if we had only taken trades with these traits?
  const filterScenarios={
    'all':{n:trades.length,wins:totalWins,wr},
    'EU only':null,
    'WED-US prime':null,
    'TRENDING DOWN+UP':null,
    'Late-zone only':null,
    'Excl late-FOMO RC/SS':null,
    'High-conf (>=75)':null,
  };
  const eu=trades.filter(t=>t.session==='EU');
  if(eu.length>0)filterScenarios['EU only']={n:eu.length,wins:eu.filter(t=>t.result==='WIN').length,wr:eu.filter(t=>t.result==='WIN').length/eu.length};
  const wedUS=trades.filter(t=>t.session==='US'&&new Date(t.id).getUTCDay()===3);
  if(wedUS.length>0)filterScenarios['WED-US prime']={n:wedUS.length,wins:wedUS.filter(t=>t.result==='WIN').length,wr:wedUS.filter(t=>t.result==='WIN').length/wedUS.length};
  const td=trades.filter(t=>t.regime==='TRENDING DOWN');
  if(td.length>0)filterScenarios['TRENDING DOWN+UP']={n:td.length,wins:td.filter(t=>t.result==='WIN').length,wr:td.filter(t=>t.result==='WIN').length/td.length};
  const late=trades.filter(t=>parseInt(t.clockAtLock)>700);
  if(late.length>0)filterScenarios['Late-zone only']={n:late.length,wins:late.filter(t=>t.result==='WIN').length,wr:late.filter(t=>t.result==='WIN').length/late.length};
  // V134: Apply our late-FOMO rule retroactively
  const exFomo=trades.filter(t=>{
    const c=parseInt(t.clockAtLock)||0;
    const post=parseFloat(t.posterior)||50;
    const r=t.regime||'';
    const isChop=['RANGE-CHOP','SHORT SQUEEZE','HIGH VOL CHOP'].includes(r);
    const isLateFomoUp=t.dir==='UP'&&c>700&&isChop&&post>=80;
    const isLateFomoDn=t.dir==='DOWN'&&c>700&&isChop&&post<=20;
    return!(isLateFomoUp||isLateFomoDn);
  });
  if(exFomo.length>0)filterScenarios['Excl late-FOMO RC/SS']={n:exFomo.length,wins:exFomo.filter(t=>t.result==='WIN').length,wr:exFomo.filter(t=>t.result==='WIN').length/exFomo.length};
  const highConf=trades.filter(t=>{
    const conf=t.dir==='UP'?t.posterior:(100-t.posterior);
    return conf>=75;
  });
  if(highConf.length>0)filterScenarios['High-conf (>=75)']={n:highConf.length,wins:highConf.filter(t=>t.result==='WIN').length,wr:highConf.filter(t=>t.result==='WIN').length/highConf.length};
  return{
    ready:true,n:trades.length,wr,upWR,dnWR,
    regimePerf,sessionPerf,clockPerf,dirRegime,
    confBuckets,brier,maxWinStreak,maxLossStreak,
    filterScenarios
  };
};

// V134: Lightweight Backtest Audit
// Runs prediction calibration against historical trades.
// Returns: how often did Tara's confidence match her actual win rate?
const runBacktest=(tradeLog,minSamples=10)=>{
  if(!tradeLog)return{ready:false,n:0};
  // V2.6: exclude unresolved trades from analytics
  tradeLog=tradeLog.filter(t=>t.result==='WIN'||t.result==='LOSS');
  if(tradeLog.length<minSamples)return{ready:false,n:tradeLog.length};
  // Group by predicted confidence bucket and compute actual WR
  const buckets={
    '50-60':{n:0,wins:0,target:0.55,bias:0},
    '60-70':{n:0,wins:0,target:0.65,bias:0},
    '70-80':{n:0,wins:0,target:0.75,bias:0},
    '80-90':{n:0,wins:0,target:0.85,bias:0},
    '90+':  {n:0,wins:0,target:0.93,bias:0},
  };
  tradeLog.forEach(t=>{
    if(!t.result||!t.posterior)return;
    const conf=t.dir==='UP'?t.posterior:(100-t.posterior);
    let key='50-60';
    if(conf>=90)key='90+';
    else if(conf>=80)key='80-90';
    else if(conf>=70)key='70-80';
    else if(conf>=60)key='60-70';
    if(buckets[key]){buckets[key].n++;if(t.result==='WIN')buckets[key].wins++;}
  });
  let totalBias=0,totalN=0,worstBias=0,worstBucket='';
  Object.entries(buckets).forEach(([k,b])=>{
    if(b.n<3)return;
    const actual=b.wins/b.n;
    b.bias=actual-b.target;
    totalBias+=Math.abs(b.bias)*b.n;
    totalN+=b.n;
    if(Math.abs(b.bias)>Math.abs(worstBias)){worstBias=b.bias;worstBucket=k;}
  });
  return{
    ready:true,
    n:tradeLog.length,
    avgBias:totalN>0?(totalBias/totalN):0,
    worstBucket,worstBias,buckets,
    overallWR:tradeLog.length>0?(tradeLog.filter(t=>t.result==='WIN').length/tradeLog.length):0
  };
};

// V134: Adaptive Threshold per Session × Regime
// For each combo, find the WR. If it's high, lower threshold (Tara more confident here).
// If it's low, raise threshold (Tara needs more conviction here).
const buildSessionRegimeThresh=(tradeLog)=>{
  const buckets={};
  tradeLog.filter(t=>t.result&&t.session&&t.regime).forEach(t=>{
    const k=t.session+':'+t.regime;
    if(!buckets[k])buckets[k]={n:0,wins:0};
    buckets[k].n++;
    if(t.result==='WIN')buckets[k].wins++;
  });
  // Compute WR & threshold adjustment per bucket
  const adj={};
  Object.entries(buckets).forEach(([k,b])=>{
    if(b.n<10)return; // V139: was 5+, raised to 10+ to reduce small-sample noise
    const rate=b.wins/b.n;
    // WR > 70% → -3 threshold (easier to lock here, you're winning)
    // WR < 50% → +5 threshold (harder to lock, you're losing)
    if(rate>=0.70)adj[k]=-3;
    else if(rate>=0.65)adj[k]=-1;
    else if(rate<=0.50)adj[k]=+5;
    else if(rate<=0.55)adj[k]=+2;
    else adj[k]=0;
  });
  return adj;
};

// V134: Regime-Direction WR Memory — explicit warning when locking into known weak combos
const buildRegimeDirWR=(tradeLog)=>{
  const wr={};
  tradeLog.filter(t=>t.result&&t.dir&&t.regime).forEach(t=>{
    const k=t.regime+'-'+t.dir;
    if(!wr[k])wr[k]={n:0,wins:0};
    wr[k].n++;
    if(t.result==='WIN')wr[k].wins++;
  });
  Object.keys(wr).forEach(k=>{
    wr[k].rate=wr[k].n>0?wr[k].wins/wr[k].n:0.5;
  });
  return wr;
};

// V114: Self-calibration audit - measures how well-calibrated Tara's confidence is
const buildCalibrationAudit=(tradeLog)=>{
  const recent=tradeLog.filter(t=>t.result&&t.posterior!=null).slice(-100);
  if(recent.length<10)return{n:recent.length,note:'Need 10+ trades for audit'};
  const buckets={
    '50-60':{n:0,wins:0,target:0.55},
    '60-70':{n:0,wins:0,target:0.65},
    '70-80':{n:0,wins:0,target:0.75},
    '80-90':{n:0,wins:0,target:0.85},
    '90+':  {n:0,wins:0,target:0.93},
  };
  recent.forEach(t=>{
    const conf=t.dir==='UP'?t.posterior:(100-t.posterior);
    let key='50-60';
    if(conf>=90)key='90+';
    else if(conf>=80)key='80-90';
    else if(conf>=70)key='70-80';
    else if(conf>=60)key='60-70';
    if(buckets[key]){
      buckets[key].n++;
      if(t.result==='WIN')buckets[key].wins++;
    }
  });
  const issues=[];
  Object.entries(buckets).forEach(([k,b])=>{
    if(b.n<3)return;
    const actual=b.wins/b.n;
    const diff=actual-b.target;
    if(diff<-0.10)issues.push(`${k}% confidence is overconfident (${(actual*100).toFixed(0)}% actual vs ${(b.target*100).toFixed(0)}% expected)`);
    else if(diff>0.10)issues.push(`${k}% confidence is underconfident (${(actual*100).toFixed(0)}% actual vs ${(b.target*100).toFixed(0)}% expected)`);
  });
  return{n:recent.length,buckets,issues};
};

// Apply calibration correction to raw posterior
// V144: Calibration applies UP-side only (DOWN side has null calibration values until
//       live post-V141 data accumulates).
//   - UP side high-conf (raw 80+): trust calibration heavily (85/15) — over-confidence is real
//   - UP side mid-conf (raw 60-79): standard 70/30 blend
//   - DOWN side & near-50: no calibration data, return raw unchanged
const calibratePosterior=(raw,calibration)=>{
  if(!calibration)return raw;
  const bucket=Math.floor(raw/10)*10;
  const calVal=calibration[Math.max(0,Math.min(90,bucket))];
  if(calVal==null)return raw; // no data for this bucket
  const isHighConfUp=raw>=80;
  const calWeight=isHighConfUp?0.85:0.7;
  return calVal*calWeight+raw*(1-calWeight);
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
const getMarketSessions=()=>{
  const now=new Date();
  const utcH=now.getUTCHours();
  const dayUTC=now.getUTCDay(); // 0=Sun, 6=Sat
  const dayName=['SUN','MON','TUE','WED','THU','FRI','SAT'][dayUTC];
  const asia=utcH>=0&&utcH<9;
  const eu=utcH>=7&&utcH<16;
  const us=utcH>=13&&utcH<22;
  const sessions=[];
  if(asia)sessions.push({name:'ASIA',flag:'🌏',color:'text-amber-400'});
  if(eu)sessions.push({name:'EU',flag:'🌍',color:'text-blue-400'});
  if(us)sessions.push({name:'US',flag:'🌎',color:'text-emerald-400'});
  const dominant=sessions.length>0?sessions[sessions.length-1].name:'OFF-HOURS';
  // V114: Day×Session quality multipliers (range -10 to +5; subtracted from quality threshold or added)
  // Higher = better historically (lower bar to lock); Lower = worse (higher bar)
  // Based on training data + market structure: Sun thin liquidity, Mon Asia gappy, Wed US best, Fri close fakeouts
  // V139: Magnitudes halved (was -10..+5, now -5..+3). Per-bucket sample sizes are ~10-30 trades —
  //       too noisy for the previous swing range. Direction held, magnitude dampened.
  const dsKey=dayName+'-'+dominant;
  const dsMap={
    'SUN-ASIA':-4,'SUN-EU':-3,'SUN-US':-5,            // Sunday is the worst day across the board
    'MON-ASIA':-2,'MON-EU':1,'MON-US':-1,             // Mon Asia gappy from weekend; Mon EU OK
    'TUE-ASIA':1,'TUE-EU':2,'TUE-US':2,               // Tuesday consistently good
    'WED-ASIA':2,'WED-EU':2,'WED-US':3,               // Wednesday US is the cleanest signal day
    'THU-ASIA':1,'THU-EU':2,'THU-US':1,
    'FRI-ASIA':1,'FRI-EU':1,'FRI-US':-3,              // Fri US close = fake breakouts before close
    'SAT-ASIA':-3,'SAT-EU':-2,'SAT-US':-3,            // Saturday thin
  };


  const dsAdj=dsMap[dsKey]||0;
  // V139: rating thresholds adjusted to the halved scale
  const dsRating=dsAdj>=2?'A':dsAdj>=1?'B':dsAdj>=0?'C':dsAdj>=-2?'D':'F';
  return{sessions,dominant,utcH,dayUTC,dayName,dsAdj,dsRating,dsKey};
};

// ── V114: MACRO EVENT CALENDAR ─────────────────────────────────────────────
// Hardcoded recurring high-impact events. These are the ones that historically
// move BTC 1-3% in seconds. Times are UTC. Tara enters BLACKOUT (no new locks)
// 30 min before, OBSERVE-ONLY during, ENHANCED for 15 min after.
const MACRO_EVENTS=[
  // ── US CPI & PPI ── 8:30 AM EST = 13:30 UTC (winter), 12:30 UTC (summer DST)
  // Released 2nd Tuesday/Wednesday of month, ~10am ET. Use 13:30 UTC as proxy.
  {name:'CPI/PPI',dayOfMonth:[10,11,12,13,14,15],hourUTC:13,minUTC:30,impact:'EXTREME',preMin:30,postMin:15},
  // ── NFP ── First Friday of month, 8:30 AM EST = 13:30 UTC
  {name:'NFP',dayOfWeek:5,weekOfMonth:1,hourUTC:13,minUTC:30,impact:'EXTREME',preMin:30,postMin:15},
  // ── FOMC Rate Decision ── 8 times/year, 2:00 PM EST = 19:00 UTC, Wed
  // Treat 1st-3rd Wed as a window — actual FOMC Wed is highlighted
  {name:'FOMC',dayOfWeek:3,hourUTC:19,minUTC:0,impact:'EXTREME',preMin:45,postMin:30,monthsOnly:[1,3,5,6,7,9,11,12]},
  // ── PCE ── Last Friday of month, 8:30 AM EST = 13:30 UTC
  {name:'PCE',dayOfWeek:5,weekOfMonth:-1,hourUTC:13,minUTC:30,impact:'HIGH',preMin:30,postMin:15},
  // ── Powell speeches ── irregular but Wed 19:30 UTC during FOMC weeks
  // (covered by FOMC entry above)
  // ── Retail Sales ── Mid-month, 8:30 AM EST = 13:30 UTC
  {name:'RETAIL SALES',dayOfMonth:[14,15,16,17,18],hourUTC:13,minUTC:30,impact:'HIGH',preMin:20,postMin:10},
  // ── GDP ── Quarterly, late month, 8:30 AM EST = 13:30 UTC
  {name:'GDP',dayOfMonth:[25,26,27,28,29,30],hourUTC:13,minUTC:30,impact:'HIGH',preMin:20,postMin:10,monthsOnly:[1,4,7,10]},
  // ── Weekly: Initial Jobless Claims ── Every Thursday 8:30 AM EST = 13:30 UTC
  {name:'JOBLESS CLAIMS',dayOfWeek:4,hourUTC:13,minUTC:30,impact:'MEDIUM',preMin:10,postMin:5},
  // ── Daily: BTC futures settlement ── Friday 4 PM EST = 21:00 UTC
  {name:'BTC FUTURES SETTLE',dayOfWeek:5,hourUTC:21,minUTC:0,impact:'HIGH',preMin:15,postMin:10},
];

// Returns: {state:'CLEAR'|'BLACKOUT'|'OBSERVE'|'ENHANCED', event:{...}|null, minutesUntil:N|null}
const getMacroEventState=(now=new Date())=>{
  const dayUTC=now.getUTCDay();
  const dateUTC=now.getUTCDate();
  const monthUTC=now.getUTCMonth()+1; // 1-12
  const hUTC=now.getUTCHours();
  const mUTC=now.getUTCMinutes();
  const nowMins=hUTC*60+mUTC;
  // Calculate week of month
  const weekOfMonth=Math.ceil(dateUTC/7);
  // Calculate if this is the LAST week of month
  const lastDayOfMonth=new Date(now.getUTCFullYear(),now.getUTCMonth()+1,0).getUTCDate();
  const isLastWeek=(lastDayOfMonth-dateUTC)<7;
  for(const ev of MACRO_EVENTS){
    // Filter by day of week
    if(ev.dayOfWeek!=null&&ev.dayOfWeek!==dayUTC)continue;
    // Filter by week of month
    if(ev.weekOfMonth===1&&weekOfMonth!==1)continue;
    if(ev.weekOfMonth===-1&&!isLastWeek)continue;
    // Filter by day of month
    if(ev.dayOfMonth&&!ev.dayOfMonth.includes(dateUTC))continue;
    // Filter by months
    if(ev.monthsOnly&&!ev.monthsOnly.includes(monthUTC))continue;
    const evMins=ev.hourUTC*60+ev.minUTC;
    const diffMins=evMins-nowMins;
    if(diffMins>0&&diffMins<=ev.preMin)return{state:'BLACKOUT',event:ev,minutesUntil:diffMins};
    if(diffMins<=0&&Math.abs(diffMins)<=2)return{state:'OBSERVE',event:ev,minutesUntil:diffMins};
    if(diffMins<0&&Math.abs(diffMins)<=ev.postMin)return{state:'ENHANCED',event:ev,minutesUntil:diffMins};
  }
  return{state:'CLEAR',event:null,minutesUntil:null};
};

// ═══════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════
const useVelocity=(tickH,price,target)=>{const ref=useRef({v1s:0,v5s:0,v15s:0,v30s:0,accel:0,jerk:0,peakPnL:0,troughPnL:0,pnlSlope:0});const pnlH=useRef([]);useEffect(()=>{const iv=setInterval(()=>{if(!price||!target)return;const now=Date.now(),ticks=tickH.current||[];const ga=(ms)=>{const r=ticks.filter(t=>Math.abs((now-t.time)-ms)<2000);return r.length>0?r.reduce((a,b)=>a+b.p,0)/r.length:null;};const p1=ga(1000),p5=ga(5000),p15=ga(15000),p30=ga(30000);const v1s=p1?(price-p1):0,v5s=p5?(price-p5)/5:0,v15s=p15?(price-p15)/15:0,v30s=p30?(price-p30)/30:0;const cpnl=target>0?((price-target)/target)*10000:0;pnlH.current.push({pnl:cpnl,time:now});pnlH.current=pnlH.current.filter(p=>now-p.time<120000);const peakPnL=Math.max(...pnlH.current.map(p=>p.pnl),cpnl);const troughPnL=Math.min(...pnlH.current.map(p=>p.pnl),cpnl);const recent=pnlH.current.filter(p=>now-p.time<10000);const pnlSlope=recent.length>=3?recent[recent.length-1].pnl-recent[0].pnl:0;ref.current={v1s,v5s,v15s,v30s,accel:v5s-v15s,jerk:v1s-v5s,peakPnL,troughPnL,pnlSlope};},500);return()=>clearInterval(iv);},[price,target]);return ref;};

const useGlobalTape=()=>{
  const tapeRef=useRef({coinbase:{buys:0,sells:0},binanceFutures:{buys:0,sells:0},bybit:{buys:0,sells:0},globalBuys:0,globalSells:0,globalImbalance:1,cbFlow:0,bnFlow:0,byFlow:0,divergence:0,whaleAlerts:[],binancePrice:0,bybitPrice:0});
  const ticksRef=useRef([]);
  const streakRef=useRef({dir:null,count:0,startTime:Date.now(),totalUSD:0,trades:[]}); // consecutive whale prints
  const flowHistoryRef=useRef([]); // 5-min rolling net delta history for trend
  const[whaleLog,setWhaleLog]=useState([]);
  const[globalFlow,setGlobalFlow]=useState({imbalance:1,divergence:0,whaleAlert:null,feeds:0,deltaUSD:0});
  const[flowSignal,setFlowSignal]=useState({
    score:0,           // 0-100 actionable score
    label:'NEUTRAL',   // NOISE | EMERGING | STRONG | CONVICTION
    streakDir:null,    // 'BUY' | 'SELL' | null
    streakCount:0,     // consecutive whale prints same direction
    streakDuration:0,  // seconds
    streakUSD:0,       // total USD in streak
    oiContext:'',      // human-readable OI interpretation
    divergence:false,  // spot vs futures diverging
    netDelta30s:0,     // net buy-sell USD in last 30s
    netDelta90s:0,     // net buy-sell USD in last 90s
    trend:'flat',      // '↑ accelerating' | '↓ fading' | 'flat'
  });

  // V3.1: Sliding-window buy/sell tape at 5s / 15s / 30s / 60s.
  //       Each window: {buys, sells, total, buyPct, side}
  //       Lets the UI show buying-vs-selling pressure and whether it's accelerating
  //       (compare 60s → 30s → 15s → 5s pattern). Updates with the same 1s aggregation tick.
  const[tapeWindows,setTapeWindows]=useState({
    w5:{buys:0,sells:0,buyPct:50,side:null},
    w15:{buys:0,sells:0,buyPct:50,side:null},
    w30:{buys:0,sells:0,buyPct:50,side:null},
    w60:{buys:0,sells:0,buyPct:50,side:null},
  });

  useEffect(()=>{
    if(typeof window==='undefined')return;
    let wsBN=null,wsBY=null,feedCount=0;

    const processWhalePrint=(alert)=>{
      const sk=streakRef.current;
      const now=Date.now();
      const streakWindow=120000; // 2 min streak window
      if(sk.dir===alert.side&&(now-sk.startTime)<streakWindow){
        // Same direction — extend streak
        sk.count++;sk.totalUSD+=alert.usd;sk.trades.push(alert);
      } else {
        // Direction changed or streak expired — reset
        sk.dir=alert.side;sk.count=1;sk.startTime=now;sk.totalUSD=alert.usd;sk.trades=[alert];
      }
      streakRef.current=sk;
    };

    try{
      wsBN=new WebSocket('wss://fstream.binance.com/ws/btcusdt@aggTrade');
      wsBN.onopen=()=>{feedCount++;};
      wsBN.onmessage=(e)=>{
        try{
          const d=JSON.parse(e.data);
          const price=parseFloat(d.p),qty=parseFloat(d.q),usd=price*qty,isBuy=!d.m,now=Date.now();
          ticksRef.current.push({p:price,s:qty,usd,t:isBuy?'B':'S',src:'bn',time:now});
          tapeRef.current.binancePrice=price;
          if(usd>100000){
            const alert={src:'Binance',side:isBuy?'BUY':'SELL',size:qty,usd,price,time:now};
            tapeRef.current.whaleAlerts.push(alert);
            tapeRef.current.whaleAlerts=tapeRef.current.whaleAlerts.slice(-20);
            processWhalePrint(alert);
            setWhaleLog(prev=>[alert,...prev].slice(0,30));
          }
        }catch(er){}
      };
    }catch(e){}

    try{
      wsBY=new WebSocket('wss://stream.bybit.com/v5/public/linear');
      wsBY.onopen=()=>{feedCount++;wsBY.send(JSON.stringify({op:'subscribe',args:['publicTrade.BTCUSDT']}));};
      wsBY.onmessage=(e)=>{
        try{
          const msg=JSON.parse(e.data);
          if(msg.topic==='publicTrade.BTCUSDT'&&msg.data){
            msg.data.forEach(trade=>{
              const price=parseFloat(trade.p),qty=parseFloat(trade.v),usd=price*qty,isBuy=trade.S==='Buy',now=Date.now();
              ticksRef.current.push({p:price,s:qty,usd,t:isBuy?'B':'S',src:'by',time:now});
              tapeRef.current.bybitPrice=price;
              if(usd>100000){
                const alert={src:'Bybit',side:isBuy?'BUY':'SELL',size:qty,usd,price,time:now};
                tapeRef.current.whaleAlerts.push(alert);
                tapeRef.current.whaleAlerts=tapeRef.current.whaleAlerts.slice(-20);
                processWhalePrint(alert);
                setWhaleLog(prev=>[alert,...prev].slice(0,30));
              }
            });
          }
        }catch(er){}
      };
    }catch(e){}

    const aggIv=setInterval(()=>{
      const now=Date.now();
      ticksRef.current=ticksRef.current.filter(t=>now-t.time<90000); // keep 90s

      // Split into time windows
      let cbB=0,cbS=0,bnB=0,bnS=0,byB=0,byS=0;
      let net30=0,net90=0;
      ticksRef.current.forEach(t=>{
        const u=t.usd||(t.s*t.p);
        const sign=t.t==='B'?1:-1;
        if(now-t.time<30000)net30+=u*sign;
        if(now-t.time<90000)net90+=u*sign;
        if(t.src==='cb'){if(t.t==='B')cbB+=u;else cbS+=u;}
        else if(t.src==='bn'){if(t.t==='B')bnB+=u;else bnS+=u;}
        else if(t.src==='by'){if(t.t==='B')byB+=u;else byS+=u;}
      });
      const gB=cbB+bnB+byB,gS=cbS+bnS+byS;
      const gI=gS===0?(gB>0?2:1):gB/gS;
      const cbF=(cbB+cbS)>0?(cbB-cbS)/(cbB+cbS):0;
      const bnF=(bnB+bnS)>0?(bnB-bnS)/(bnB+bnS):0;
      const byF=(byB+byS)>0?(byB-byS)/(byB+byS):0;
      // Spot vs futures divergence: cbF opposite to (bnF+byF)/2
      const futuresFlow=(bnF+byF)/2;
      const div=(gB+gS)>50000&&Math.abs(cbF)>0.2&&Math.abs(futuresFlow)>0.2&&Math.sign(cbF)!==Math.sign(futuresFlow)?Math.sign(futuresFlow):-0;
      tapeRef.current={...tapeRef.current,coinbase:{buys:cbB,sells:cbS},binanceFutures:{buys:bnB,sells:bnS},bybit:{buys:byB,sells:byS},globalBuys:gB,globalSells:gS,globalImbalance:gI,cbFlow:cbF,bnFlow:bnF,byFlow:byF,divergence:div};
      const rW=tapeRef.current.whaleAlerts.find(w=>now-w.time<5000);
      setGlobalFlow({imbalance:gI,divergence:div,whaleAlert:rW||null,feeds:feedCount,deltaUSD:gB-gS});

      // V3.1: Sliding-window buy/sell pressure at 5s / 15s / 30s / 60s.
      //       Each window aggregates buy/sell USD across all venues (Coinbase + Binance + Bybit).
      //       Designed for the UI tape strip — lets users see acceleration/deceleration of flow.
      const _bucket=(seconds)=>{
        let b=0,s=0;
        const cutoff=now-seconds*1000;
        ticksRef.current.forEach(t=>{
          if(t.time<cutoff)return;
          const u=t.usd||(t.s*t.p);
          if(t.t==='B')b+=u;else s+=u;
        });
        const total=b+s;
        const buyPct=total>0?(b/total)*100:50;
        const side=total<1000?null:(buyPct>=55?'BUY':buyPct<=45?'SELL':null);
        return{buys:b,sells:s,buyPct,side};
      };
      setTapeWindows({
        w5:_bucket(5),
        w15:_bucket(15),
        w30:_bucket(30),
        w60:_bucket(60),
      });

      // ── FLOW SIGNAL COMPUTATION ─────────────────────────────────────────
      const sk=streakRef.current;
      const streakAge=(now-sk.startTime)/1000;
      const isStreakFresh=sk.count>=1&&streakAge<120;

      // Expire streak if no activity for 2 min
      if(streakAge>120){streakRef.current={dir:null,count:0,startTime:now,totalUSD:0,trades:[]};}

      // Net delta trend: compare 30s vs 90s (is flow accelerating or fading?)
      let trend='flat';
      if(Math.abs(net30)>10000&&Math.abs(net90)>10000){
        const rate30=net30/30,rate90=net90/90;
        if(Math.sign(rate30)===Math.sign(rate90)&&Math.abs(rate30)>Math.abs(rate90)*1.3)trend=`${net30>0?'↑':'↓'} accel`;
        else if(Math.sign(rate30)===Math.sign(rate90)&&Math.abs(rate30)<Math.abs(rate90)*0.7)trend=`${net30>0?'↑':'↓'} fading`;
        else trend=`${net30>0?'↑':'↓'} steady`;
      }

      // Score components (0-100)
      const imbalanceScore=Math.min(40,Math.abs(gI-1)*30); // flow pressure
      const streakScore=isStreakFresh?Math.min(40,(sk.count-1)*12):0; // streak conviction
      const accelScore=trend.includes('accel')?15:trend.includes('fading')?-10:0;
      const divPenalty=div!==0?-20:0; // divergence = basis trade = not directional
      const rawScore=Math.max(0,Math.min(100,imbalanceScore+streakScore+accelScore+divPenalty));

      const label=rawScore<25?'NOISE':rawScore<50?'EMERGING':rawScore<75?'STRONG':'CONVICTION';
      const isDivergence=div!==0;
      const streakDir=isStreakFresh?sk.dir:null;

      setFlowSignal({
        score:rawScore,label,streakDir,
        streakCount:isStreakFresh?sk.count:0,
        streakDuration:isStreakFresh?Math.round(streakAge):0,
        streakUSD:isStreakFresh?sk.totalUSD:0,
        divergence:isDivergence,
        netDelta30s:net30,netDelta90s:net90,trend,
        oiContext:'', // filled by component using bloomberg
      });
    },1000);

    return()=>{
      clearInterval(aggIv);
      if(wsBN?.readyState===1)wsBN.close();
      if(wsBY?.readyState===1)wsBY.close();
    };
  },[]);

  return{tapeRef,globalFlow,ticksRef,whaleLog,flowSignal,tapeWindows};
};

// V134: HPotter Future Grand Trend — multi-timeframe forecast
// Translated from PineScript v5 (Apr 2022 by HPotter)
// 
// Algorithm:
//   t[i] = 0.9 * t[i-length] + 0.1 * src[i] + (0.9*t[i-length] - 0.9*t[i-length*2])
//   fcast = t[current] + (t[current] - t[current-forecast])  (linear extrapolation)
//
// Returns: { forecastDir: 'UP'|'DOWN'|'NEUTRAL', forecastBps: signed bps, valid: bool }
// Returns valid=false if insufficient history
const computeFGT=(candles,length=70,forecast=100)=>{
  // Need at least length*2 + forecast bars for a meaningful computation
  // Plus current bar. Be lenient: scale length down if needed.
  if(!candles||candles.length<20)return{forecastDir:'NEUTRAL',forecastBps:0,valid:false,reason:'insufficient'};
  // Adapt parameters to available data
  // PineScript: oldest is highest index, newest is index 0 in our convention (Tara's liveHistory[0] is newest)
  // We'll work with reversed array: oldest first
  const bars=candles.slice().reverse(); // bars[0] = oldest, bars[N-1] = newest
  const n=bars.length;
  // Auto-scale length and forecast to available history
  const _length=Math.min(length,Math.floor(n/3));
  const _forecast=Math.min(forecast,Math.floor(n/2));
  if(_length<5||_forecast<5)return{forecastDir:'NEUTRAL',forecastBps:0,valid:false,reason:'too-short'};
  // Build t series
  const t=new Array(n);
  for(let i=0;i<n;i++){
    const src=bars[i].c;
    if(i<_length){
      t[i]=src; // initialize with src (PineScript nz fallback)
      continue;
    }
    const tLag=t[i-_length];
    // Compute change in (0.9 * t[i-length]) over `length` bars
    let changeTerm=0;
    if(i>=_length*2){
      const tLag2=t[i-_length*2];
      changeTerm=0.9*tLag-0.9*tLag2;
    }
    t[i]=0.9*tLag+0.1*src+changeTerm;
  }
  // Forecast = t[last] + (t[last] - t[last - forecast])
  const tLast=t[n-1];
  const tBack=t[Math.max(0,n-1-_forecast)];
  const fcast=tLast+(tLast-tBack); // linear extrapolation forward
  const currentPrice=bars[n-1].c;
  const forecastBps=((fcast-currentPrice)/currentPrice)*10000;
  let forecastDir='NEUTRAL';
  if(forecastBps>10)forecastDir='UP';
  else if(forecastBps<-10)forecastDir='DOWN';
  return{forecastDir,forecastBps:Math.round(forecastBps),fcast:Math.round(fcast),valid:true,length:_length,forecast:_forecast};
};

// V134: Aggregate finer-grained candles into a coarser timeframe
// e.g. aggregate 5m candles into 15m by combining 3 at a time
const aggregateCandles=(candles,factor)=>{
  if(!candles||factor<=1)return candles;
  // candles[0] = newest. Group from newest: every `factor` consecutive bars become one aggregated bar
  const out=[];
  for(let i=0;i+factor<=candles.length;i+=factor){
    const group=candles.slice(i,i+factor);
    const o=group[group.length-1].o; // first bar of period (oldest)
    const c=group[0].c; // last bar of period (newest)
    const h=Math.max(...group.map(b=>b.h));
    const l=Math.min(...group.map(b=>b.l));
    const v=group.reduce((s,b)=>s+(b.v||0),0);
    out.push({time:group[0].time,o,h,l,c,v});
  }
  return out;
};

// V134: Volume Profile — find where most trading happened recently
// VPOC (Volume Point of Control) acts as support/resistance.
// If we're locked UP and a strong VPOC sits between price and strike → it's resistance.
const computeVolumeProfile=(history)=>{
  if(!history||history.length<10)return{vpoc:0,vah:0,val:0,strength:0};
  const recent=history.slice(0,40); // last 40 candles
  // Bin price levels into $50 buckets
  const buckets={};
  recent.forEach(c=>{
    const lo=Math.floor((c.l||c.c)/50)*50;
    const hi=Math.floor((c.h||c.c)/50)*50;
    const v=c.v||0;
    // Distribute volume across the candle's price range
    const numBuckets=Math.max(1,Math.round((hi-lo)/50)+1);
    for(let p=lo;p<=hi;p+=50){
      buckets[p]=(buckets[p]||0)+(v/numBuckets);
    }
  });
  // Find max-volume bucket = VPOC
  const sorted=Object.entries(buckets).sort((a,b)=>b[1]-a[1]);
  if(sorted.length===0)return{vpoc:0,vah:0,val:0,strength:0};
  const vpoc=parseFloat(sorted[0][0])+25; // mid-bucket
  const totalVol=Object.values(buckets).reduce((s,v)=>s+v,0);
  const vpocVol=sorted[0][1];
  const strength=totalVol>0?vpocVol/totalVol:0;
  // Value Area: 70% of volume around VPOC
  let cumVol=vpocVol;
  let vah=vpoc,val=vpoc;
  const target=totalVol*0.70;
  while(cumVol<target&&(vah<sorted[0][0]+1000||val>sorted[0][0]-1000)){
    const upBucket=parseFloat(sorted[0][0])+(vah-vpoc+50);
    const dnBucket=parseFloat(sorted[0][0])-(vpoc-val+50);
    const upVol=buckets[upBucket]||0;
    const dnVol=buckets[dnBucket]||0;
    if(upVol>=dnVol){vah=upBucket+25;cumVol+=upVol;}
    else{val=dnBucket+25;cumVol+=dnVol;}
    if(cumVol>=target)break;
  }
  return{vpoc,vah,val,strength};
};

// V134: useDepthFlash — high-frequency order book polling at 2.5s
// Bloomberg's 8s interval misses fast wall changes during volatility.
// This hook only fetches the depth endpoint, which is the time-critical one.
// V134: Fetch candles at 1m, 3m, 5m, 15m for HPotter FGT analysis
// Returns { c1m: [...], c3m: [...], c5m: [...], c15m: [...] }
const useMultiTFCandles=()=>{
  const[tfCandles,setTfCandles]=useState({c1m:[],c3m:[],c5m:[],c15m:[]});
  useEffect(()=>{
    if(typeof window==='undefined')return;
    let mounted=true;
    const fetchInterval=async(label,gran)=>{
      try{
        // Coinbase first (more permissive CORS)
        const r=await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${gran}`,{cache:'no-store'});
        if(!r.ok)throw new Error('CB '+r.status);
        const d=await r.json();
        if(!Array.isArray(d))throw new Error('bad shape');
        return d.slice(0,300).map(c=>({time:c[0],l:parseFloat(c[1]),h:parseFloat(c[2]),o:parseFloat(c[3]),c:parseFloat(c[4]),v:parseFloat(c[5])}));
      }catch(e){
        // Fallback Binance
        try{
          const ivMap={60:'1m',180:'3m',300:'5m',900:'15m'};
          const iv=ivMap[gran]||'1m';
          const r2=await fetch(`https://api.binance.com/api/v3/uiKlines?symbol=BTCUSDT&interval=${iv}&limit=300`);
          const d2=await r2.json();
          if(!Array.isArray(d2))throw new Error('binance bad');
          return d2.map(d=>({time:d[0]/1000,o:parseFloat(d[1]),h:parseFloat(d[2]),l:parseFloat(d[3]),c:parseFloat(d[4]),v:parseFloat(d[5])})).reverse();
        }catch(e2){return[];}
      }
    };
    const fetchAll=async()=>{
      const[c1m,c3m,c5m,c15m]=await Promise.all([
        fetchInterval('1m',60),
        fetchInterval('3m',180),
        fetchInterval('5m',300),
        fetchInterval('15m',900),
      ]);
      if(mounted)setTfCandles({c1m,c3m,c5m,c15m});
    };
    fetchAll();
    const iv=setInterval(fetchAll,30000); // refresh every 30s
    return()=>{mounted=false;clearInterval(iv);};
  },[]);
  return tfCandles;
};

const useDepthFlash=()=>{
  const[depth,setDepth]=useState({obImbalanceLive:0,liqLongWallLive:0,liqShortWallLive:0,liqLongUSDLive:0,liqShortUSDLive:0,depthUpdateAge:0,depthLastUpdate:0});
  useEffect(()=>{
    if(typeof window==='undefined')return;
    let mp=0;
    const f=async()=>{
      try{
        // Get mark price quickly first
        const pR=await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
        const p=await pR.json();
        mp=parseFloat(p.markPrice)||mp;
        if(!mp)return;
        // Then depth
        const dR=await fetch('https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=50');
        const d=await dR.json();
        if(!d?.bids||!d?.asks)return;
        let mBW=0,mBP=0,tBL=0,mAW=0,mAP=0,tAL=0;
        d.bids.forEach(([p,q])=>{const pr=parseFloat(p),qt=parseFloat(q),dist=((mp-pr)/mp)*100;if(dist<2&&dist>0){const usd=pr*qt;tBL+=usd;if(usd>mBW){mBW=usd;mBP=pr;}}});
        d.asks.forEach(([p,q])=>{const pr=parseFloat(p),qt=parseFloat(q),dist=((pr-mp)/mp)*100;if(dist<2&&dist>0){const usd=pr*qt;tAL+=usd;if(usd>mAW){mAW=usd;mAP=pr;}}});
        const obImbal=tBL+tAL>0?(tBL-tAL)/(tBL+tAL):0; // -1=asks heavy, +1=bids heavy
        setDepth({obImbalanceLive:obImbal,liqLongWallLive:mAP,liqShortWallLive:mBP,liqLongUSDLive:tAL,liqShortUSDLive:tBL,depthUpdateAge:0,depthLastUpdate:Date.now()});
      }catch(e){/* silent fail */}
    };
    f();
    const iv=setInterval(f,2500); // 2.5s polling
    return()=>clearInterval(iv);
  },[]);
  return depth;
};

const useBloomberg=()=>{const[data,setData]=useState({fundingRate:0,fundingRatePrev:0,nextFundingTime:0,openInterest:0,openInterestUSD:0,oiChange5m:0,basisBps:0,markPrice:0,indexPrice:0,longShortRatio:1,topTraderLSPositions:1,binanceFuturesVol24h:0,liqLongWall:0,liqShortWall:0,liqLongUSD:0,liqShortUSD:0,longWallAgeMs:0,shortWallAgeMs:0,lastUpdate:0,status:'connecting'});const oiSnaps=useRef([]);const wallHistRef=useRef([]);useEffect(()=>{if(typeof window==='undefined')return;const f=async()=>{try{const R=await Promise.allSettled([fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=3').then(r=>r.json()),fetch('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1').then(r=>r.json()),fetch('https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=5m&limit=1').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT').then(r=>r.json()),fetch('https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=50').then(r=>r.json())]);const[pR,oR,fR,gR,tR,t24R,dR]=R;const now=Date.now();let u={lastUpdate:now,status:'live'};if(pR.status==='fulfilled'&&pR.value){const p=pR.value;const mk=parseFloat(p.markPrice)||0,ix=parseFloat(p.indexPrice)||0;u.fundingRate=parseFloat(p.lastFundingRate)||0;u.markPrice=mk;u.indexPrice=ix;u.basisBps=ix>0?((mk-ix)/ix)*10000:0;u.nextFundingTime=parseInt(p.nextFundingTime)||0;}if(oR.status==='fulfilled'&&oR.value){const oi=parseFloat(oR.value.openInterest)||0;oiSnaps.current.push({oi,time:now});oiSnaps.current=oiSnaps.current.filter(s=>now-s.time<600000);const o5=oiSnaps.current.find(s=>now-s.time>=270000&&now-s.time<=330000);u.openInterest=oi;u.openInterestUSD=oi*(u.markPrice||0);u.oiChange5m=o5?((oi-o5.oi)/o5.oi)*100:0;}if(fR.status==='fulfilled'&&Array.isArray(fR.value)&&fR.value.length>=2)u.fundingRatePrev=parseFloat(fR.value[1]?.fundingRate)||0;if(gR.status==='fulfilled'&&Array.isArray(gR.value)&&gR.value[0])u.longShortRatio=parseFloat(gR.value[0].longShortRatio)||1;if(tR.status==='fulfilled'&&Array.isArray(tR.value)&&tR.value[0])u.topTraderLSPositions=parseFloat(tR.value[0].longShortRatio)||1;if(t24R.status==='fulfilled'&&t24R.value)u.binanceFuturesVol24h=parseFloat(t24R.value.quoteVolume)||0;if(dR.status==='fulfilled'&&dR.value?.bids&&dR.value?.asks){const mp=u.markPrice||0;if(mp>0){let mBW=0,mBP=0,tBL=0,mAW=0,mAP=0,tAL=0;dR.value.bids.forEach(([p,q])=>{const pr=parseFloat(p),qt=parseFloat(q),dist=((mp-pr)/mp)*100;if(dist<2&&dist>0){const usd=pr*qt;tBL+=usd;if(usd>mBW){mBW=usd;mBP=pr;}}});dR.value.asks.forEach(([p,q])=>{const pr=parseFloat(p),qt=parseFloat(q),dist=((pr-mp)/mp)*100;if(dist<2&&dist>0){const usd=pr*qt;tAL+=usd;if(usd>mAW){mAW=usd;mAP=pr;}}});u.liqLongWall=mAP;u.liqShortWall=mBP;u.liqLongUSD=tAL;u.liqShortUSD=tBL;
const wH=wallHistRef.current;wH.push({t:now,longWall:mAP,shortWall:mBP});while(wH.length>0&&now-wH[0].t>60000)wH.shift();
let lwAge=0;if(mAP>0){let oldest=now;for(const s of wH){if(s.longWall>0&&Math.abs((s.longWall-mAP)/mAP*10000)<10)oldest=Math.min(oldest,s.t);}lwAge=now-oldest;}
let swAge=0;if(mBP>0){let oldest=now;for(const s of wH){if(s.shortWall>0&&Math.abs((s.shortWall-mBP)/mBP*10000)<10)oldest=Math.min(oldest,s.t);}swAge=now-oldest;}
u.longWallAgeMs=lwAge;u.shortWallAgeMs=swAge;}}setData(prev=>({...prev,...u}));}catch(e){setData(prev=>({...prev,status:'error'}));}};f();const iv=setInterval(f,8000);return()=>clearInterval(iv);},[]);return data;};

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
// TARA CHART — TRADINGVIEW IFRAME EMBED
// Iframe is fully sandboxed — no DOM manipulation, no React conflicts
// key={resolution} forces clean remount on interval change
// ═══════════════════════════════════════
const TV_INTERVAL_MAP={'1m':'1','3m':'3','5m':'5','15m':'15','30m':'30','1h':'60'};

const TradingViewChart=({resolution,onResolutionChange})=>{
  const interval=TV_INTERVAL_MAP[resolution]||'1';
  const src=[
    'https://www.tradingview.com/widgetembed/?frameElementId=tv_tara_101',
    `&symbol=COINBASE%3ABTCUSD`,
    `&interval=${interval}`,
    '&hidesidetoolbar=1',
    '&hidetoptoolbar=0',
    '&symboledit=0',
    '&saveimage=0',
    '&toolbarbg=111312',
    '&studies=%5B%22Volume%40tv-basicstudies%22%5D',
    '&theme=dark',
    '&style=1',
    '&timezone=America%2FNew_York',
    '&locale=en',
    '&withdateranges=1',
    '&allow_symbol_change=0',
  ].join('');

  return(
    <div style={{userSelect:'none',width:'100%'}}>
      {/* Resolution toolbar */}
      <div className="flex items-center justify-between px-3 pb-2 flex-wrap gap-2">
        <div className={'flex items-center gap-0.5 bg-[#111312] rounded-lg border border-[#E8E9E4]/5 overflow-hidden'}>
          {['1m','3m','5m','15m','30m','1h'].map(r=>(
            <button key={r}
              onClick={()=>onResolutionChange&&onResolutionChange(r)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${resolution===r?'bg-indigo-500/20 text-indigo-400':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/70'}`}>
              {r}
            </button>
          ))}
        </div>
        <span className={'text-xs text-[#E8E9E4]/25 hidden sm:inline font-mono'}>COINBASE:BTCUSD · TradingView</span>
      </div>

      {/* iframe — key={resolution} forces clean remount on interval change */}
      <iframe
        key={resolution}
        src={src}
        className="tv-chart-container"
        style={{
          width:'100%',
          height:'430px',
          border:'none',
          borderRadius:'8px',
          background:'#111312',
          display:'block',
        }}
        allowFullScreen
        title="Tara Live Chart — COINBASE:BTCUSD"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
};



// ═══════════════════════════════════════
// V99 ADVISOR STATE MACHINE
// ═══════════════════════════════════════
const computeAdvisor=(params)=>{
  const{userPosition,positionStatus,currentOdds,offerVal,betAmount,maxPayout,clockSeconds,windowType,tickSlope,isRugPull,showRugPullAlerts,hasReversedRef,peakOfferRef,posterior,targetMargin,currentPrice,minsRemaining,secsRemaining,accel,pnlSlope,atrBps,activePrediction,lockInfo,regime}=params;
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
    if(activePrediction?.includes('DELIBERATING')){
      const m=activePrediction.match(/\[(\d+)s left\]/);
      const secs=m?parseInt(m[1]):0;
      return{label:'🧠 DELIBERATING',reason:`Reading market structure. Decision in ~${secs}s (or sooner if signals align). [${timeLabel}]`,color:'indigo',animate:true,hasAction:false};
    }
    if(activePrediction?.includes('SITTING OUT'))return{label:'⛔ SITTING OUT',reason:`Signals are split, no clear edge this window. Better to skip than force a call. [${timeLabel}]`,color:'rose',animate:false,hasAction:false};
    if(activePrediction?.includes('ANALYZING')){
      const m=activePrediction.match(/\[(\d+)s\]/);
      const secs=m?parseInt(m[1]):0;
      return{label:'🔍 ANALYZING',reason:`Searching for directional signal. Bounded scan — commits within ${secs}s or sooner if FGT aligns. [${timeLabel}]`,color:'indigo',animate:true,hasAction:false};
    }
    if(activePrediction?.includes('UP (FORMING)'))return{label:'SIGNAL FORMING — UP',reason:`Bullish bias building (${posterior.toFixed(1)}%). Building confirmation samples — lock fires when sustained. [${timeLabel}]`,color:'amber',animate:false,hasAction:false};
    if(activePrediction?.includes('DOWN (FORMING)'))return{label:'SIGNAL FORMING — DOWN',reason:`Bearish bias building (${(100-posterior).toFixed(1)}%). Building confirmation samples — lock fires when sustained. [${timeLabel}]`,color:'amber',animate:false,hasAction:false};

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
  const winSide=isUP?posterior:(100-posterior); // Tara model confidence only
  // REAL truth: is price actually above/below strike right now?
  const gapForPosition=isUP?gapBps:-gapBps;
  const isActuallyWinning=gapForPosition>0;
  const isActuallyLosing=gapForPosition<-5;
  const gapMagnitude=Math.abs(gapForPosition);
  const gapStr=`Gap: ${gapForPosition>=0?'+':''}${gapForPosition.toFixed(1)} bps`;
  // Direction reliability: UP 66% (331 trades), DOWN 57% — gap narrowed with better DOWN gating
  const dirReliability=isUP?1.0:0.86;
  // Regime reliability from data: SS 67%, TD 86%, HVC 59%, RC 56%
  const _rg=regime||'RANGE-CHOP';
  const regimeReliability=_rg==='TRENDING DOWN'?1.28:_rg==='SHORT SQUEEZE'?1.0:_rg==='HIGH VOL CHOP'?0.88:0.84;
  // Comeback score: how likely is Tara's model to be right when adverse?
  // High score = hold, low score = cut
  const comebackScore=Math.max(0,
    (winSide*dirReliability*regimeReliability)   // base model confidence adjusted
    - (gapMagnitude*2.5)                          // penalise depth of adverse
    - (isLate?25:0)                               // time pressure penalty
    - (adverseAccel?15:0)                         // momentum worsening penalty
    + (momentumWith?10:0)                         // momentum recovering bonus
  );

  // ── 1. HARD STOPS — always fire first ────────────────────────────────────
  if(positionStatus?.isStopHit)return{label:'30% STOP HIT — EXIT NOW',reason:`Hard stop breached. Entry: $${(positionStatus.entry||0).toFixed(0)} → Now: $${cp.toFixed(0)}. PnL: ${pnlPct.toFixed(1)}%. [${timeLabel}]`,color:'rose',animate:true,hasAction:true,actionLabel:'EXECUTE EMERGENCY EXIT',actionTarget:'SIT OUT'};
  if(isRugPull&&showRugPullAlerts&&isUP)return{label:'RUG PULL — EMERGENCY EXIT',reason:`Catastrophic drop detected. Exit long immediately. [${timeLabel}]`,color:'rose',animate:true,hasAction:true,actionLabel:'EMERGENCY CASHOUT',actionTarget:'SIT OUT'};

  // ── 2. DEEP ADVERSE — always cut regardless of model confidence ───────────
  // Data: even 89% UP calls fail in adverse. Don't let model override reality.
  if(gapMagnitude>30&&isActuallyLosing)return{label:'CUT LOSSES — EXIT NOW',reason:`${gapMagnitude.toFixed(0)} bps adverse — too deep to recover. ${gapStr}. [${timeLabel}]`,color:'rose',animate:true,hasAction:true,actionLabel:'CUT NOW',actionTarget:'SIT OUT'};

  // ── 3. REAL PROFIT ON TABLE — offer above your bet ────────────────────────
  if(profitPct>40&&momentumAgainst)return{label:'TAKE MAX PROFIT',reason:`+${profitPct.toFixed(0)}% on offer. Momentum reversing — lock in now before it fades. ${gapStr}. [${timeLabel}]`,color:'emerald',animate:true,hasAction:true,actionLabel:'CASHOUT — MAX PROFIT',actionTarget:'CASH'};
  if(profitPct>20&&drawdownFromPeak>0.12)return{label:'TRAILING STOP HIT',reason:`Offer pulled back ${(drawdownFromPeak*100).toFixed(0)}% from its peak. Protect your gains now. [${timeLabel}]`,color:'emerald',animate:true,hasAction:true,actionLabel:'EXECUTE CASHOUT',actionTarget:'CASH'};
  if(profitPct>12&&momentumAgainst&&isLate)return{label:'SCALP PROFIT',reason:`+${profitPct.toFixed(0)}% with ${timeLabel} left. Momentum turning — good time to scalp. ${gapStr}.`,color:'emerald',animate:false,hasAction:true,actionLabel:'SCALP CASHOUT',actionTarget:'CASH'};
  if(profitPct>8&&isLate)return{label:'SECURE PROFIT',reason:`Profit on table (+${profitPct.toFixed(0)}%) and time running out. Consider locking in. ${gapStr}. [${timeLabel}]`,color:'emerald',animate:false,hasAction:true,actionLabel:'EXECUTE CASHOUT',actionTarget:'CASH'};
  if(offerAboveBet&&momentumAgainst&&winSide<60)return{label:'SECURE PROFIT',reason:`+${profitPct.toFixed(0)}% profit but odds slipping. Consider exit. ${gapStr}. [${timeLabel}]`,color:'emerald',animate:false,hasAction:true,actionLabel:'EXECUTE CASHOUT',actionTarget:'CASH'};

  // ── 4. ADVERSE POSITION — comeback score decides hold vs cut ─────────────
  // comebackScore > 55: Tara is highly confident, regime reliable, momentum helping
  // comebackScore 35-55: borderline — monitor
  // comebackScore < 35: cut losses
  if(isActuallyLosing){
    if(comebackScore<35||isVeryLate)return{label:'CUT LOSSES — EXIT NOW',reason:`${gapMagnitude.toFixed(0)} bps adverse. Comeback score: ${comebackScore.toFixed(0)}/100 — not worth holding. ${gapStr}. [${timeLabel}]`,color:'rose',animate:true,hasAction:true,actionLabel:'CUT LOSSES NOW',actionTarget:'SIT OUT'};
    if(isLate&&comebackScore<55)return{label:'CUT LOSSES',reason:`${gapMagnitude.toFixed(0)} bps adverse with ${timeLabel} left. Score: ${comebackScore.toFixed(0)}/100. Take the loss. ${gapStr}.`,color:'rose',animate:false,hasAction:true,actionLabel:'EXECUTE CASHOUT',actionTarget:'SIT OUT'};
    if(comebackScore>65&&momentumWith)return{label:'TARA HOLDS — RECOVERY LIKELY',reason:`${gapMagnitude.toFixed(0)} bps adverse BUT comeback score ${comebackScore.toFixed(0)}/100 — high confidence recovery. ${gapStr}. [${timeLabel}]`,color:'amber',animate:true,hasAction:true,actionLabel:'EXIT IF UNSURE',actionTarget:'SIT OUT'};
    if(comebackScore>50)return{label:'ADVERSE — TARA WATCHING',reason:`${gapMagnitude.toFixed(0)} bps adverse. Score: ${comebackScore.toFixed(0)}/100. Tara: ${winSide.toFixed(0)}% confident. Momentum${momentumWith?' turning':' flat'}. ${gapStr}. [${timeLabel}]`,color:'amber',animate:false,hasAction:true,actionLabel:'EXIT IF NEEDED',actionTarget:'SIT OUT'};
    return{label:'ADVERSE — EXIT IF NEEDED',reason:`${gapMagnitude.toFixed(0)} bps adverse. Score: ${comebackScore.toFixed(0)}/100. Momentum against. Consider exit. ${gapStr}. [${timeLabel}]`,color:'rose',animate:false,hasAction:true,actionLabel:'EXIT IF NEEDED',actionTarget:'SIT OUT'};
  }

  // ── 5. NEAR STRIKE (small adverse buffer zone) ─────────────────────────────
  if(!isActuallyWinning&&momentumWith)return{label:'RECOVERY IN PROGRESS',reason:`Price moving toward strike. Tara: ${winSide.toFixed(0)}%. Comeback score: ${comebackScore.toFixed(0)}/100. ${gapStr}. [${timeLabel}]`,color:'amber',animate:false,hasAction:true,actionLabel:'EXIT EARLY',actionTarget:'SIT OUT'};
  if(!isActuallyWinning)return{label:'AT STRIKE — WATCH CLOSELY',reason:`Price at strike (${gapStr}). No clear edge. Tara: ${winSide.toFixed(0)}%. [${timeLabel}]`,color:'amber',animate:false,hasAction:true,actionLabel:'EXIT IF NEEDED',actionTarget:'SIT OUT'};

  // ── 6. WINNING POSITION ────────────────────────────────────────────────────
  if(isActuallyWinning&&winSide>80&&!offerAboveBet)return{label:'MAX PROFIT ZONE',reason:`${gapForPosition.toFixed(0)} bps favorable. Tara: ${winSide.toFixed(0)}% confident. Wait for offer to appear. ${gapStr}. [${timeLabel}]`,color:'emerald',animate:false,hasAction:true,actionLabel:'CASHOUT IF OFFERED',actionTarget:'CASH'};
  if(isActuallyWinning&&momentumWith&&gapMagnitude>10)return{label:'HOLD STRONG',reason:`${gapForPosition.toFixed(0)} bps above/below strike. Momentum aligned. ${gapStr}. Tara: ${winSide.toFixed(0)}%. [${timeLabel}]`,color:'emerald',animate:false,hasAction:true,actionLabel:'CASHOUT NOW',actionTarget:'CASH'};
  if(isActuallyWinning&&momentumAgainst)return{label:'SECURE HOLD — WATCH MOMENTUM',reason:`Winning by ${gapForPosition.toFixed(0)} bps but momentum flipping. Consider locking in. ${gapStr}. [${timeLabel}]`,color:'amber',animate:false,hasAction:true,actionLabel:'CASHOUT NOW',actionTarget:'CASH'};
  if(isActuallyWinning&&isLate)return{label:'HOLD FIRM — ALMOST THERE',reason:`${gapForPosition.toFixed(0)} bps favorable with ${timeLabel} left. ${gapStr}. Tara: ${winSide.toFixed(0)}%. [${timeLabel}]`,color:'emerald',animate:false,hasAction:true,actionLabel:'CASHOUT NOW',actionTarget:'CASH'};
  if(isActuallyWinning)return{label:'HOLD FIRM',reason:`${gapStr}. Tara: ${winSide.toFixed(0)}% win rate. Position solid. [${timeLabel}]`,color:'emerald',animate:false,hasAction:true,actionLabel:'CASHOUT NOW',actionTarget:'CASH'};
  return{label:'HOLD FIRM',reason:`${gapStr}. Tara: ${winSide.toFixed(0)}% win rate. Watching for cleaner signal. [${timeLabel}]`,color:'emerald',animate:false,hasAction:true,actionLabel:'CASHOUT NOW',actionTarget:'CASH'};
};

// ═══════════════════════════════════════
// V99 PREDICTION ENGINE (Weighted Composite + Adaptive)
// ═══════════════════════════════════════
const computeV99Posterior=(params)=>{
  const{currentPrice,liveHistory,targetMargin,globalFlow,bloomberg,velocityRef,tickHistoryRef,priceMemoryRef,windowType,timeFraction,clockSeconds,is15m,regimeMemory,adaptiveWeights,calibration,windowOpenPrice,depthFlash,tfCandles}=params;
  // Use regime-specific weights when current regime is identifiable, else use global adaptive weights
  const _regime=params.currentRegime||'RANGE-CHOP';
  const _regimeW=(params.regimeWeights&&params.regimeWeights[_regime])||null;
  const W=_regimeW||adaptiveWeights||DEFAULT_WEIGHTS;
  const reasoning=[];let totalScore=0;
  const rawSignalScores={}; // for training log

  const closes=liveHistory.map(x=>x.c);
  const rsi=calcRSI(closes,14)||50;
  const atr=calcATR(liveHistory,14)||10;
  const atrBps=atr>0?(atr/currentPrice)*10000:15;
  // ── V113: VELOCITY REGIME CLASSIFIER ──────────────────────────────────────
  // Combines ATR + 1m drift + tick velocity to classify market speed.
  // Used downstream to scale thresholds, sample requirements, and momentum gates.
  // Categories: SLOW (sleepy), NORMAL (normal flow), FAST (active), EXTREME (news/spike)
  const _v1s=Math.abs(velocityRef?.current?.v1s||0);
  const _v5s=Math.abs(velocityRef?.current?.v5s||0);
  const _drift1mAbs=Math.abs(((liveHistory[0]?.c||currentPrice)-(liveHistory[1]?.c||currentPrice))/(currentPrice||1)*10000);
  // Score is composite: ATR (background vol) + tick velocity (real-time speed)
  const _velScore=(atrBps*0.6)+(_v1s*4)+(_v5s*1.5)+(_drift1mAbs*0.8);
  let velocityRegime='NORMAL';
  if(_velScore<12)velocityRegime='SLOW';
  else if(_velScore<28)velocityRegime='NORMAL';
  else if(_velScore<55)velocityRegime='FAST';
  else velocityRegime='EXTREME';
  // V134: VOLUME PROFILE / VPOC — support/resistance levels
  const _vpData=computeVolumeProfile(liveHistory);
  let vpocResistanceAdj=0;
  if(_vpData.vpoc>0&&_vpData.strength>0.08&&targetMargin>0&&currentPrice>0){
    const vpoc=_vpData.vpoc;
    const upBlocked=currentPrice<targetMargin&&vpoc>currentPrice&&vpoc<targetMargin&&Math.abs((vpoc-currentPrice)/currentPrice*10000)>5;
    const dnBlocked=currentPrice>targetMargin&&vpoc<currentPrice&&vpoc>targetMargin&&Math.abs((currentPrice-vpoc)/currentPrice*10000)>5;
    if(upBlocked){
      vpocResistanceAdj=-Math.min(8,_vpData.strength*30);
      reasoning.push(`[VPOC] Resistance @ $${vpoc.toFixed(0)} (strength ${(_vpData.strength*100).toFixed(0)}%) blocking UP`);
    } else if(dnBlocked){
      vpocResistanceAdj=+Math.min(8,_vpData.strength*30);
      reasoning.push(`[VPOC] Support @ $${vpoc.toFixed(0)} (strength ${(_vpData.strength*100).toFixed(0)}%) blocking DOWN`);
    }
    totalScore+=vpocResistanceAdj;
  }
  // ── V134: WINDOW-OPEN PRICE ANCHOR ──────────────────────────────────────
  // How far has price moved this window? Combined with time elapsed,
  // tells us if the move is exhausted (already +30bps with 2min left = no juice)
  let windowDriftBps=0;
  let windowExhaustionPenalty=0;
  if(windowOpenPrice&&windowOpenPrice>0&&currentPrice>0){
    windowDriftBps=((currentPrice-windowOpenPrice)/windowOpenPrice)*10000;
    const _absDrift=Math.abs(windowDriftBps);
    const _windowMaxSec=is15m?900:300;
    const _timeRatio=(clockSeconds||0)/_windowMaxSec;
    // Exhaustion check: if price has already moved >25bps AND we're >70% through window
    // → the move has happened, late lock chasing it has poor odds
    if(_absDrift>25&&_timeRatio>0.7){
      // Penalty scales with how extended + how late
      windowExhaustionPenalty=Math.min(15,(_absDrift-25)*0.4+(_timeRatio-0.7)*30);
      reasoning.push(`[WIN-EXH] Window drifted ${windowDriftBps.toFixed(0)}bps with ${((1-_timeRatio)*100).toFixed(0)}% time left — exhaustion penalty -${windowExhaustionPenalty.toFixed(0)}`);
    }
  }

  // ── V134: TRAJECTORY FORECAST ────────────────────────────────────────────
  // Project where price will be at window-end using kinematics: x(t) = x₀ + v·t + ½a·t²
  // Then convert to "implied posterior" — direction Tara expects price to land
  const _v5sNum=velocityRef?.current?.v5s||0;     // $/sec recent
  const _accelNum=velocityRef?.current?.accel||0; // $/sec² (v5s - v15s diff)
  const _secsLeft=Math.max(0,(is15m?900:300)-(clockSeconds||0));
  // V134: SMOOTH TRAJECTORY — blend 5s with 30s velocity to prevent tick-induced flip-flops
  // Old version used only v5s × √secs which caused 30+ point posterior swings on a single tick
  // Now we use a 70/30 blend favoring stable velocity; recent ticks still matter but don't dominate
  const _v15sNum=velocityRef?.current?.v15s||0;
  const _v30sNum=velocityRef?.current?.v30s||_v15sNum||0;
  // Blended velocity: 30% of recent + 40% of medium + 30% of stable
  const _vBlended=(_v5sNum*0.3)+(_v15sNum*0.4)+(_v30sNum*0.3);
  // Dampen far-out projections (uncertainty grows with time)
  const _decayedTime=Math.sqrt(_secsLeft); // effective projection time
  const _projectedDrift=(_vBlended*_decayedTime)+(_accelNum*_decayedTime*_decayedTime*0.3);
  const _projectedPrice=currentPrice+_projectedDrift;
  const _projectedGapBps=targetMargin>0?((_projectedPrice-targetMargin)/targetMargin)*10000:0;
  // If projection points strongly toward a direction relative to strike, boost confidence early
  let trajectoryAdj=0;
  let trajectoryDirHint='NEUTRAL'; // V134: directional read for contradiction detection
  // V134: Trajectory cap reduced ±12 → ±8 (was dominating posterior on swings)
  // Threshold raised 8bps → 12bps (require real projection, not noise)
  // V135: REVISED — cap raised back to ±12 (was being silently outvoted by regime bonus +43).
  //       Activation threshold dropped 12 → 10 bps so trajectory engages slightly sooner.
  //       Coefficient up 0.3 → 0.35 (gentler than the original 0.4 to preserve stability).
  if(targetMargin>0&&_secsLeft>60&&Math.abs(_projectedGapBps)>10){
    if(_projectedGapBps>0){
      trajectoryAdj=Math.min(12,_projectedGapBps*0.35);
      trajectoryDirHint='UP';
    } else {
      trajectoryAdj=Math.max(-12,_projectedGapBps*0.35);
      trajectoryDirHint='DOWN';
    }
    reasoning.push(`[TRAJ] Projected end @ $${_projectedPrice.toFixed(0)} (${_projectedGapBps>0?'+':''}${_projectedGapBps.toFixed(0)}bps to strike) → favors ${trajectoryDirHint}`);
  }
  // V134: HPotter Future Grand Trend on 1m/3m/5m/15m
  // V2.9: Weighted timeframe voting + increased FGT contribution to posterior.
  //   Was: each timeframe votes ±1, summed to -4..+4, bonus ±30/18/8 at 4/3/2 alignment
  //   Now: 5m primary (±1.5), 15m secondary (±1.2), 1m tertiary (±0.8), 3m last (±0.5)
  //        — weights sum to 4.0, preserving the existing >=4/>=3/>=2 threshold semantics
  //        Bonus magnitudes raised to ±42/26/14/6 at strong/medium/moderate/weak alignment
  //   Reasoning: 5m is the most relevant horizon for a 15-min window. 15m is high-quality
  //   directional signal but extends past window close. 1m is fast but noisy. 3m is somewhat
  //   redundant given 1m and 5m bracket it. The data audit on 53 trades showed FGT-3 alignment
  //   correlating with 70-100% WR — increasing FGT's posterior contribution leans into the
  //   most reliable predictor we have. Secondary signals (gap/momentum/structure/flow/etc) still
  //   contribute roughly ±50 in extreme cases, so they remain influential when FGT is mixed.
  let mtfAlignment=0; // -4.0 to +4.0 (continuous, weighted)
  let mtfBonus=0;
  let fgtResults={};
  if(tfCandles&&targetMargin>0&&_secsLeft>30){
    const tfList=[
      {label:'1m',data:tfCandles.c1m,length:30,forecast:30,weight:0.8},   // tertiary — fast but noisy
      {label:'3m',data:tfCandles.c3m,length:30,forecast:30,weight:0.5},   // last — redundant given 1m/5m bracket
      {label:'5m',data:tfCandles.c5m,length:40,forecast:40,weight:1.5},   // primary — most relevant for 15m window
      {label:'15m',data:tfCandles.c15m,length:50,forecast:30,weight:1.2}, // secondary — high-quality directional
    ];
    const tfSigns=[]; // weighted signed contributions
    const tfArrows=[];
    tfList.forEach(tf=>{
      const fgt=computeFGT(tf.data,tf.length,tf.forecast);
      fgtResults[tf.label]=fgt;
      if(!fgt.valid){tfSigns.push(0);tfArrows.push('?');return;}
      // Weighted vote: forecast direction × per-timeframe weight
      if(fgt.forecastDir==='UP'){tfSigns.push(tf.weight);tfArrows.push('↑');}
      else if(fgt.forecastDir==='DOWN'){tfSigns.push(-tf.weight);tfArrows.push('↓');}
      else{tfSigns.push(0);tfArrows.push('→');}
    });
    mtfAlignment=tfSigns.reduce((s,v)=>s+v,0);
    const absAlign=Math.abs(mtfAlignment);
    // V2.9: Bonus tiered by alignment strength on the continuous 0-4 scale.
    //   ≥3.5 → ±42 (strong/full alignment — was ±30 at exactly 4)
    //   ≥2.5 → ±26 (medium alignment — was ±18 at exactly 3)
    //   ≥1.5 → ±14 (moderate alignment — was ±8 at exactly 2)
    //   ≥0.7 → ±6  (weak alignment — was 0 at <2)
    //   The lower tier (≥0.7) catches cases where 5m alone (1.5) aligns and others are flat.
    if(absAlign>=3.5)mtfBonus=Math.sign(mtfAlignment)*42;
    else if(absAlign>=2.5)mtfBonus=Math.sign(mtfAlignment)*26;
    else if(absAlign>=1.5)mtfBonus=Math.sign(mtfAlignment)*14;
    else if(absAlign>=0.7)mtfBonus=Math.sign(mtfAlignment)*6;
    if(mtfBonus!==0){
      totalScore+=mtfBonus;
      const dirLabel=mtfBonus>0?'UP':'DOWN';
      reasoning.push(`[FGT] alignment ${mtfAlignment>=0?'+':''}${mtfAlignment.toFixed(1)}/4.0 ${dirLabel} (1m${tfArrows[0]} 3m${tfArrows[1]} 5m${tfArrows[2]} 15m${tfArrows[3]}) → ${mtfBonus>0?'+':''}${mtfBonus}`);
      // Detailed forecast values
      const detail=tfList.map((tf,i)=>{
        const f=fgtResults[tf.label];
        if(!f.valid)return `${tf.label}:?`;
        return `${tf.label}:${f.forecastBps>0?'+':''}${f.forecastBps}bps`;
      }).join(' ');
      reasoning.push(`[FGT-DETAIL] ${detail}`);
    } else if(absAlign<=1){
      reasoning.push(`[FGT] Mixed across timeframes (${tfArrows.join(' ')}) — no consensus`);
    } else {
      reasoning.push(`[FGT] Weak signal (${absAlign}/4 ${tfArrows.join(' ')})`);
    }
  } else {
    reasoning.push(`[FGT] Loading multi-timeframe data...`);
  }
  // V134: FORECAST-STICKY removed — replaced by HPotter FGT (more rigorous)
  // Also: pure trajectory without strike (for early-window calls when strike not set yet)
  if(targetMargin<=0&&Math.abs(_v5sNum)>0.3){
    // No strike yet — use raw velocity sign as directional hint
    const _trajHint=Math.min(8,Math.abs(_v5sNum)*5)*Math.sign(_v5sNum);
    trajectoryAdj+=_trajHint;
    reasoning.push(`[TRAJ-EARLY] Velocity ${_v5sNum.toFixed(2)}$/s — early ${_v5sNum>0?'UP':'DOWN'} hint`);
  }
  // Scaling factors used downstream — multipliers for thresholds, sample counts, etc
  const velocityScalars={
    SLOW:    {samples:1.4, threshTighten:6, momentumTol:0.3, lockHold:1.3, decayRate:0.85},
    NORMAL:  {samples:1.0, threshTighten:0, momentumTol:0.5, lockHold:1.0, decayRate:1.0},
    FAST:    {samples:0.7, threshTighten:-3,momentumTol:1.2, lockHold:0.8, decayRate:1.25},
    EXTREME: {samples:0.5, threshTighten:-6,momentumTol:2.5, lockHold:0.6, decayRate:1.6}
  };
  const _velAdj=velocityScalars[velocityRegime];
  reasoning.push(`[VEL] ${velocityRegime} regime (score: ${_velScore.toFixed(1)} | ATR: ${atrBps.toFixed(1)}bps)`);
  const vwap=calcVWAP(liveHistory);
  const bb=calcBB([...closes].reverse(),20);
  const realGapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
  // ── V134: STRIKE QUALITY SCORING ──────────────────────────────────────────
  // Detect when the strike was set during anomaly/spike vs normal price.
  // Compare strike to recent 5-min average. If far off, the strike is "dirty"
  // and gap-gravity should be downweighted.
  let strikeQuality=1.0; // 1.0 = clean, 0.5 = dirty
  if(targetMargin>0&&liveHistory.length>=5){
    // Average of recent 5 candle closes BEFORE current = baseline
    const baseline=liveHistory.slice(1,6).reduce((s,c)=>s+(c.c||0),0)/5;
    if(baseline>0){
      const strikeDeviationBps=Math.abs(((targetMargin-baseline)/baseline)*10000);
      // >40bps deviation = strike was set during a spike or whipsaw
      if(strikeDeviationBps>40){
        strikeQuality=Math.max(0.4,1.0-(strikeDeviationBps-40)/200);
        reasoning.push(`[STRIKE-Q] Dirty strike: ${strikeDeviationBps.toFixed(0)}bps off 5min baseline → gap weight ${(strikeQuality*100).toFixed(0)}%`);
      }
    }
  }
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
  // V134: Gap gravity rebalanced
  // Small gap (<15bps) + late time → boost (binary outcome near tipping point)
  // Large gap (>25bps) → don't dampen by time (a 35bps distance is real even early)
  const _proximityFactor=Math.abs(realGapBps)<15&&timeFraction>0.7?1.3:1.0;
  const _largeGapFloor=Math.abs(realGapBps)>25?Math.max(0.45,(0.15+0.85*timeDecay)):(0.15+0.85*timeDecay);
  let gapScore=realGapBps*(is15m?0.65:0.85)*_largeGapFloor*decayMult*_proximityFactor;
  const gapMag=Math.abs(realGapBps);
  if(gapMag>15)gapScore+=Math.sign(realGapBps)*Math.pow(gapMag-10,1.3)*(is15m?0.45:0.65);
  if(gapMag>50)gapScore*=0.7;
  // V152 WINDOW-POSITION TAPER: gap matters more as window progresses (terminal price = where you are);
  // momentum matters more early (when there's still time for direction to play out).
  //   timeFraction=0 (start): gap×0.7  momentum×1.0
  //   timeFraction=0.5 (mid):  gap×1.0  momentum×0.7
  //   timeFraction=1.0 (end):  gap×1.3  momentum×0.4
  const _gapTaper=0.7+(timeFraction||0)*0.6;       // 0.7 → 1.3 across window
  const _momentumTaper=1.0-(timeFraction||0)*0.6;  // 1.0 → 0.4 across window
  const gapClamped=Math.max(-W.gap,Math.min(W.gap,gapScore*_gapTaper))*strikeQuality; // V134/V152
  rawSignalScores.gap=gapClamped;
  totalScore+=gapClamped;
  if(gapMag>15)reasoning.push(`[GAP] ${realGapBps.toFixed(1)} bps — gravity ${realGapBps>0?'bullish':'bearish'} | W:${W.gap.toFixed(0)}${_gapTaper!==1.0?` ×${_gapTaper.toFixed(2)}`:''}`);

  // ── SIGNAL 2: MOMENTUM COMPOSITE ──
  // V134: Momentum reweighting late in window
  // Early: drift1m matters most (capture turns). Late: drift5m matters most (sustained direction).
  // After 60% time, micro-momentum (1m) gets damped by 50% — price can wiggle but the binary outcome is set.
  let momScore=0;
  const _momLateDamp=timeFraction>0.6?0.5:1.0; // dampen 1m drift when late in window
  if(is15m){momScore=drift5m*0.7+drift1m*0.3*_momLateDamp;}
  else{momScore=(v30s||0)*(10000/currentPrice)*1.5+drift1m*1.0*_momLateDamp+drift5m*0.5;}
  // V152 EXHAUSTION CHECK: when price has already moved >=1σ from window open AND we're 60%+
  // through the window, the alignment signal flips from amplifier to dampener. Continuation is
  // less likely than reversion in this state.
  let _momExhausted=false;
  if(windowOpenPrice>0&&atrBps>0&&(timeFraction||0)>=0.6){
    const _moveBps=((currentPrice-windowOpenPrice)/windowOpenPrice)*10000;
    const _elapsedMin=Math.max(0.5,(timeFraction||0)*(is15m?15:5));
    const _atrEnvelope=atrBps*Math.sqrt(_elapsedMin);
    const _rangeBps=_atrEnvelope>0?_moveBps/_atrEnvelope:0;
    // Same direction as momentum and at edge of range → exhausted
    if(Math.abs(_rangeBps)>=1.0&&Math.sign(_rangeBps)===Math.sign(momScore)){_momExhausted=true;}
  }
  if(momentumAlign.aligned&&momentumAlign.strong){
    momScore*=_momExhausted?0.6:1.5; // V152: inverted multiplier when exhausted
    if(_momExhausted)reasoning.push(`[MOM-EXH] aligned move overextended — dampener applied (×0.6)`);
  } else if(momentumAlign.aligned){
    momScore*=_momExhausted?0.7:1.2;
  }
  const momClamped=Math.max(-W.momentum,Math.min(W.momentum,momScore*0.8*_momentumTaper));
  rawSignalScores.momentum=momClamped;
  totalScore+=momClamped;
  reasoning.push(`[MOMENTUM] ${drift1m.toFixed(1)} bps/1m | ${drift5m.toFixed(1)} bps/5m${momentumAlign.aligned?' ✦ ALIGNED':''}${_momExhausted?' ⚠ EXHAUSTED':''} | W:${W.momentum.toFixed(0)}${_momentumTaper!==1.0?` ×${_momentumTaper.toFixed(2)}`:''}`);

  // ── SIGNAL 3: CANDLE STRUCTURE ──
  let structScore=0;
  if(consecutive.green>=3)structScore+=consecutive.green*3;
  if(consecutive.red>=3)structScore-=consecutive.red*3;
  if(volRatio>1.5&&consecutive.green>=2)structScore+=8;
  if(volRatio>1.5&&consecutive.red>=2)structScore-=8;
  // V114: Volume Profile signal — ghost markets vs conviction
  if(volRatio>2.0){
    // High conviction volume — boost signal in direction of price
    if(drift1m>3)structScore+=6;
    else if(drift1m<-3)structScore-=6;
    reasoning.push(`[VOL] High conviction vol (${volRatio.toFixed(1)}x) — signal boosted`);
  } else if(volRatio<0.5){
    // Ghost market — fade any signal (low follow-through expected)
    structScore*=0.6;
    reasoning.push(`[VOL] Ghost market (${volRatio.toFixed(1)}x) — signal damped`);
  }
  // Volume-Price divergence detection (price up but volume down = trap)
  if(drift1m>5&&volRatio<0.7){structScore-=10;reasoning.push(`[VOL-DIV] Price up but volume DOWN — possible UP trap`);}
  if(drift1m<-5&&volRatio<0.7){structScore+=10;reasoning.push(`[VOL-DIV] Price down but volume DOWN — possible DOWN trap`);}
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
  let regime='RANGE-CHOP';
  let regimeBonus=0;
  let upThreshold=68,downThreshold=32;
  const isHighVol=atrBps>35;
  // V135: Symmetric retail funding gates — was 0.005/0.015 (3× harder for LONG SQUEEZE).
  //       LONG SQUEEZE never fired in 377-trade seed because the bar was too high.
  const retailShorting=funding<0.005,retailLonging=funding>0.005;
  const whalesBuying=delta>500000,whalesSelling=delta<-500000;
  // V135: Mild whale flow for TRENDING UP/DOWN classification — full thresholds stayed for SQUEEZE
  const whalesBuyingMild=delta>200000,whalesSellingMild=delta<-200000;
  // V135: Loosened TRENDING UP/DOWN thresholds — was drift>5/<-5 + whalesBuying/Selling + atrBps<30.
  //       The ATR<30 gate excluded fast moves entirely (they got dumped into HIGH VOL CHOP),
  //       and the $500K whale threshold made TRENDING DOWN trigger only 6% of trades vs SHORT SQUEEZE 38%.
  const isCleanUp=drift1m>3&&whalesBuyingMild;
  const isCleanDn=drift1m<-3&&whalesSellingMild;
  // V114: Cross-Exchange Lead-Lag — Binance often leads Coinbase by 1-3s on big moves
  // If futures price diverges from spot by significant amount, signal direction
  const _binancePrice=globalFlow?.binancePrice||0;
  const _bybitPrice=globalFlow?.bybitPrice||0;
  if(_binancePrice>0&&currentPrice>0){
    const _bnDivBps=((_binancePrice-currentPrice)/currentPrice)*10000;
    if(Math.abs(_bnDivBps)>3){
      // Futures divergence — coinbase will follow
      const ledAdj=Math.sign(_bnDivBps)*Math.min(8,Math.abs(_bnDivBps)*0.7);
      totalScore+=ledAdj;
      reasoning.push(`[LEAD] Binance ${_bnDivBps>0?'+':''}${_bnDivBps.toFixed(1)}bps vs Coinbase`);
    }
  }
  // V114: Liquidation & Order Book data (declared before use)
  const liqLongWall=bloomberg?.liqLongWall||0;   // ASKS — short liqs above (UP magnet)
  const liqShortWall=bloomberg?.liqShortWall||0; // BIDS — long liqs below (DOWN magnet)
  const liqLongUSD=bloomberg?.liqLongUSD||0;
  const liqShortUSD=bloomberg?.liqShortUSD||0;
  // V114: Order Book Imbalance (depth-of-market pressure)
  if(liqLongUSD>0&&liqShortUSD>0){
    const obImbal=(liqShortUSD-liqLongUSD)/(liqShortUSD+liqLongUSD);
    if(Math.abs(obImbal)>0.25){
      const obAdj=obImbal*8;
      totalScore+=obAdj;
      reasoning.push(`[OB] Depth imbalance ${(obImbal*100).toFixed(0)}% ${obImbal>0?'BIDS heavier':'ASKS heavier'}`);
    }
  }
  // V134: LIVE ORDER BOOK FLASH — 2.5s polling vs bloomberg's 8s
  // Catches fast wall changes during volatility that 8s polling misses
  if(depthFlash&&depthFlash.depthLastUpdate>0){
    const ageMs=Date.now()-depthFlash.depthLastUpdate;
    if(ageMs<6000){ // only use if fresh
      const liveImbal=depthFlash.obImbalanceLive||0;
      if(Math.abs(liveImbal)>0.30){
        // Agreement with bloomberg's slower snapshot = high conviction
        const slowImbal=liqLongUSD>0&&liqShortUSD>0?(liqShortUSD-liqLongUSD)/(liqShortUSD+liqLongUSD):0;
        const agree=Math.sign(liveImbal)===Math.sign(slowImbal)&&Math.abs(slowImbal)>0.20;
        const liveBonus=agree?Math.sign(liveImbal)*4:Math.sign(liveImbal)*2; // doubles when both timeframes agree
        totalScore+=liveBonus;
        reasoning.push(`[OB-LIVE] ${(liveImbal*100).toFixed(0)}% ${liveImbal>0?'BIDS':'ASKS'} ${agree?'(both timeframes agree)':''}`);
      }
    }
  }
  // V114: Liquidation Cluster Awareness — price gets pulled toward large walls
  let liqAdj=0;
  // V134: Require wall persistence ≥15s (filters spoofed walls)
  const longWallStable=(bloomberg?.longWallAgeMs||0)>=15000;
  const shortWallStable=(bloomberg?.shortWallAgeMs||0)>=15000;
  if(liqLongWall>0&&liqLongUSD>500000&&longWallStable){
    const distBps=((liqLongWall-currentPrice)/currentPrice)*10000;
    if(distBps>0&&distBps<60){
      liqAdj+=Math.min(8,liqLongUSD/200000);
      reasoning.push(`[LIQ] Short liq cluster $${(liqLongUSD/1000).toFixed(0)}K @ +${distBps.toFixed(0)}bps (${((bloomberg.longWallAgeMs||0)/1000).toFixed(0)}s old) — UP pull`);
    }
  } else if(liqLongWall>0&&liqLongUSD>500000&&!longWallStable){
    reasoning.push(`[LIQ-SPOOF] Ignored fresh long wall (<15s) — likely spoof`);
  }
  if(liqShortWall>0&&liqShortUSD>500000&&shortWallStable){
    const distBps=((currentPrice-liqShortWall)/currentPrice)*10000;
    if(distBps>0&&distBps<60){
      liqAdj-=Math.min(8,liqShortUSD/200000);
      reasoning.push(`[LIQ] Long liq cluster $${(liqShortUSD/1000).toFixed(0)}K @ -${distBps.toFixed(0)}bps (${((bloomberg.shortWallAgeMs||0)/1000).toFixed(0)}s old) — DOWN pull`);
    }
  } else if(liqShortWall>0&&liqShortUSD>500000&&!shortWallStable){
    reasoning.push(`[LIQ-SPOOF] Ignored fresh short wall (<15s) — likely spoof`);
  }
  totalScore+=liqAdj;
  const fundingAccel=(funding-fundingPrev);
  // V114: Funding Extremes Contrarian Signal
  // Very crowded longs (funding >0.05%) often precede DOWN moves
  // Very crowded shorts (funding <-0.02%) often precede UP moves
  const fundingPct=funding*100;
  let fundingExtremeAdj=0;
  if(fundingPct>0.05){
    fundingExtremeAdj=-12; // shift posterior toward DOWN
    reasoning.push(`[FUND-EXT] Crowded longs (${fundingPct.toFixed(3)}%) — DOWN bias`);
  } else if(fundingPct<-0.02){
    fundingExtremeAdj=+12; // shift posterior toward UP
    reasoning.push(`[FUND-EXT] Crowded shorts (${fundingPct.toFixed(3)}%) — UP bias`);
  }
  totalScore+=fundingExtremeAdj;
  // V135: Price-action veto on SQUEEZE regimes.
  //       The bug: SHORT SQUEEZE was firing during obvious downtrends (funding+whales tripped it
  //       even though price was falling), giving UP a +43 regime bonus that locked bad UP trades.
  //       Require recent drift to not contradict the squeeze direction.
  // V142: SS/LS regime bias removed. The +43 / -43 score was double-counting the underlying
  //       whale-flow + funding signals that already feed into the score. SS/LS are descriptive
  //       labels for "retail short + whales buying" or vice versa — they don't add new information
  //       beyond the signals they're built from. Threshold tilts (UP easier in SS, DOWN easier in LS)
  //       are kept as those reflect tactical lock behavior, not score double-counting.
  if(retailShorting&&whalesBuying&&drift1m>-3){regime='SHORT SQUEEZE';upThreshold=68;downThreshold=20;}
  else if(retailLonging&&whalesSelling&&drift1m<3){regime='LONG SQUEEZE';upThreshold=80;downThreshold=36;}
  else if(retailShorting&&whalesBuying&&drift1m<=-3){
    // V135: SS conditions met but price contradicting — treat as CHOP, log the suppression
    reasoning.push(`[REGIME-VETO] SHORT SQUEEZE conditions but drift1m=${drift1m.toFixed(1)} → suppressed`);
  }
  else if(retailLonging&&whalesSelling&&drift1m>=3){
    reasoning.push(`[REGIME-VETO] LONG SQUEEZE conditions but drift1m=${drift1m.toFixed(1)} → suppressed`);
  }
  else if(isCleanUp){regime='TRENDING UP';upThreshold=64;downThreshold=20;}
  else if(isCleanDn){regime='TRENDING DOWN';upThreshold=80;downThreshold=20;}
  // V141 ROOT FIX: regime variable thresholds restored to symmetric form.
  //   TU: upT 64 (easier UP — favored), dnT 20 (harder DOWN — opposed)
  //   TD: upT 80 (harder UP — opposed), dnT 20 (easier DOWN — favored, MIRROR of TU's UP)
  //   Was TD upT75/dnT36 — the 36 was harder than the default 28 floor, in the regime that's
  //   supposed to favor DOWN. Backwards. Now TD's preferred direction (DOWN) gets the easier
  //   threshold mirroring TU's preferred direction (UP).
  //   Note: these regime-set values are dead variables in V140 — the LOCK_THRESHOLD_DN_EFFECTIVE
  //   ladder downstream ignores them. We're fixing both layers in V141.
  else if(isHighVol){regime='HIGH VOL CHOP';upThreshold=75;downThreshold=25;reasoning.push(`[REGIME] High vol — strict thresholds`);}
  // V113: Velocity-adaptive threshold adjustment
  // Slow markets: tighten thresholds (require more conviction — chop is dangerous)
  // Fast markets: loosen thresholds (real moves don't wait for indecision)
  upThreshold=Math.max(55,Math.min(85,upThreshold+_velAdj.threshTighten));
  downThreshold=Math.max(15,Math.min(45,downThreshold-_velAdj.threshTighten));
  if(velocityRegime!=='NORMAL')reasoning.push(`[VEL-ADJ] ${velocityRegime} → UP@${upThreshold} DN@${downThreshold}`);
  if(fundingAccel>0.0001)regimeBonus-=5;
  if(fundingAccel<-0.0001)regimeBonus+=5;
  const regimeClamped=Math.max(-W.regime,Math.min(W.regime,regimeBonus));
  rawSignalScores.regime=regimeClamped;
  totalScore+=regimeClamped;

  // ── V152 NEW SIGNAL: rangePosition — mean reversion / range exhaustion ──
  //
  //   Rationale: Tara's other six signals (gap, momentum, structure, flow, technical, regime)
  //   are all backward-looking — "what did price just do?" When recent move is up, all six tend
  //   to point UP, even if price is already at the top of the typical range. This produces
  //   the "she follows the line" behavior. We need a signal that explicitly fights overextended
  //   moves to balance the trend-followers.
  //
  //   Math:
  //     rangeBps = (currentPrice − windowOpenPrice) / atrEnvelope
  //     atrEnvelope = atrBps × √(elapsed_minutes)   — Brownian volatility scaling
  //   When |rangeBps| ≥ 1.0 AND windowProgress ≥ 0.4 (40%+ through window), we're at the edge
  //   of typical range and reversion is more likely than continuation.
  //
  //   Contribution: -W.rangePosition × tanh(rangeBps - 1.0)   (signed against direction of move)
  //   So if price moved +1.5σ from open in late window, rangePosition pushes DOWN.
  //   Modest magnitude — not designed to dominate, just balance trend-followers.
  let rangeBonus=0;
  let rangeBps=0;
  if(windowOpenPrice>0&&atrBps>0){
    const moveBps=((currentPrice-windowOpenPrice)/windowOpenPrice)*10000;
    // ATR envelope scaled by elapsed window minutes (sqrt — Brownian motion)
    const elapsedMin=Math.max(0.5,(timeFraction||0)*(is15m?15:5));
    const atrEnvelope=atrBps*Math.sqrt(elapsedMin);
    rangeBps=atrEnvelope>0?moveBps/atrEnvelope:0;
    // Only fire when we're past 40% of window AND rangeBps magnitude > 1.0
    if((timeFraction||0)>=0.4&&Math.abs(rangeBps)>=1.0){
      // tanh produces a smooth ±1 saturation past |rangeBps|=2
      const excess=Math.abs(rangeBps)-1.0;
      const saturation=Math.tanh(excess*0.7);
      // SIGN INVERSION: if price went UP (positive rangeBps), this signal pushes DOWN (negative)
      const rangeDir=rangeBps>0?-1:1;
      rangeBonus=W.rangePosition*saturation*rangeDir*0.6; // 0.6 dampener — modest by default
      reasoning.push(`[RANGE-EXH] price ${rangeBps.toFixed(1)}σ from open at ${((timeFraction||0)*100).toFixed(0)}% through window — contrarian ${rangeBonus.toFixed(0)}`);
    }
  }
  const rangeClamped=Math.max(-W.rangePosition,Math.min(W.rangePosition,rangeBonus));
  rawSignalScores.rangePosition=rangeClamped;
  totalScore+=rangeClamped;

  // Synaptic memory override
  const mem=regimeMemory?regimeMemory[regime]:null;
  if(mem&&(mem.wins+mem.losses)>=3){const wr=mem.wins/(mem.wins+mem.losses);if(wr<0.45){upThreshold+=6;downThreshold-=6;reasoning.push(`[MEMORY] Low WR (${(wr*100).toFixed(0)}%) in ${regime} — tightening`);}else if(wr>0.65){upThreshold-=4;downThreshold+=4;reasoning.push(`[MEMORY] High WR (${(wr*100).toFixed(0)}%) in ${regime} — loosening`);}}

  // V134: Chart pattern recognition
  const _pattern=detectChartPattern(liveHistory);
  let patternAdj=0;
  if(_pattern.pattern==='doubleTop'){patternAdj=-5;reasoning.push(`[PATTERN] ${_pattern.detail} — DOWN bias`);}
  else if(_pattern.pattern==='doubleBottom'){patternAdj=+5;reasoning.push(`[PATTERN] ${_pattern.detail} — UP bias`);}
  else if(_pattern.pattern==='wedgeUp'){patternAdj=-3;reasoning.push(`[PATTERN] ${_pattern.detail}`);}
  else if(_pattern.pattern==='wedgeDn'){patternAdj=+3;reasoning.push(`[PATTERN] ${_pattern.detail}`);}
  totalScore+=patternAdj;
  // V134: Apply forward-looking trajectory adjustment
  totalScore+=trajectoryAdj;
  // Convert to posterior
  const rawPosterior=50+totalScore*0.95;
  let posterior=Math.max(1,Math.min(99,rawPosterior));

  // Reality caps
  // V135: Tightened activation thresholds (-18→-12, +18→+12) so adverse price action
  //       starts pulling the posterior toward truth before gap is catastrophic.
  //       Added intermediate -25/+25 tier so the cap reaches into lock-firing range earlier.
  //       Outer threshold tightened -40→-35 / +40→+35.
  if(realGapBps<-35){posterior=Math.min(posterior,18);reasoning.push(`[CAP] Deep underwater — UP capped at 18%`);}
  else if(realGapBps<-25){posterior=Math.min(posterior,30);reasoning.push(`[CAP] Adverse gap — UP capped at 30%`);}
  else if(realGapBps<-12){posterior=Math.min(posterior,40);}
  else if(realGapBps>35){posterior=Math.max(posterior,82);reasoning.push(`[CAP] Deep ITM — UP floored at 82%`);}
  else if(realGapBps>25){posterior=Math.max(posterior,70);reasoning.push(`[CAP] Strong favorable — UP floored at 70%`);}
  else if(realGapBps>12){posterior=Math.max(posterior,60);}

  // Apply calibration if available (makes % accurate to actual historical win rate)
  const calibratedPosterior=calibration?calibratePosterior(posterior,calibration):posterior;
  const totalSignalWeight=Object.values(W).reduce((a,b)=>a+b,0)||1;

  // ── IMPROVEMENT 1: Direction prior calibration ───────────────────────────
  // V134: Hardcoded DOWN penalty REMOVED — was creating structural UP bias
  // V144: Calibration is now the ONLY direction-prior correction. Per-direction adjustments
  //       previously layered here have been removed in favor of bucket-based calibration.
  let dirCalibrated=calibratedPosterior;

  // ── IMPROVEMENT 5: Posterior time-decay for late window locks ─────────────
  // Data: losses lock avg 777s, wins avg 744s. Late locks structurally weaker.
  // Decay confidence toward 50 in the final stretch of the window.
  const windowAge=1-timeFraction; // 0=just opened, 1=almost closed
  const lateDecayFactor=windowAge>0.88?0.82:windowAge>0.78?0.91:1.0;
  if(lateDecayFactor<1.0){
    const beforeDecay=dirCalibrated;
    dirCalibrated=50+(dirCalibrated-50)*lateDecayFactor;
    reasoning.push(`[TIME] Late lock decay ×${lateDecayFactor}: ${beforeDecay.toFixed(1)}%→${dirCalibrated.toFixed(1)}%`);
  }
  // V144: CRITICAL CHANGE — locks now use the calibrated posterior, not raw.
  //       Previously: 'finalPosterior' (calibrated) was returned as 'posterior',
  //       BUT the comment said "lock guards still use raw" — and a separate cosmetic
  //       compression existed for display only. This created a confusion where calibration
  //       only affected what you SAW, not what Tara DID. Now: the same calibrated value
  //       drives both display and lock decisions. No more "honest display, biased decision."
  //       Removed the _calibratedDisplay backtest compression — it was adding a second
  //       layer of cosmetic correction on top of calibration.
  const finalPosterior=Math.max(1,Math.min(99,dirCalibrated));
  const displayPosterior=finalPosterior; // V144: same as final, no cosmetic divergence

  reasoning.push(`[ATR] Volatility: ${atrBps.toFixed(1)} bps | Regime: ${regime}${isPostDecay?' | POST-DECAY':''}`);
  if(calibration&&Object.values(calibration).some(v=>v!=null)){
    const calDelta=Math.abs(finalPosterior-rawPosterior);
    if(calDelta>=2){
      reasoning.push(`[CAL] Raw ${rawPosterior.toFixed(0)}% → calibrated ${finalPosterior.toFixed(0)}% (Δ${calDelta.toFixed(0)}pts) — ${rawPosterior>finalPosterior?'haircut for over-confidence':'corrected upward'}`);
    }
  }

  // Rug pull check
  const isRugPull=tickSlope<-5&&aggrFlow<-0.6;
  // V140: Symmetric upward spike — mirror of rug-pull. Releases DOWN locks faster than waiting
  //       for the gap to hit -30 bps. Same magnitude thresholds, opposite signs.
  const isMoonshot=tickSlope>5&&aggrFlow>0.6;

  return{posterior:finalPosterior,rawPosterior:posterior,displayPosterior,regime,upThreshold,downThreshold,reasoning,atrBps,rsi,bb,vwap,realGapBps,drift1m,drift5m,drift15m,accel,pnlSlope,tickSlope,aggrFlow,isRugPull,isMoonshot,isPostDecay,consecutive,volRatio,channel,momentumAlign,rawSignalScores,totalSignalWeight,velocityRegime,velocityScalars:_velAdj,projectedPrice:_projectedPrice,projectedGapBps:_projectedGapBps,trajectoryAdj,windowDriftBps,mtfAlignment,mtfBonus,fgtResults,windowExhaustionPenalty,
    // V152: range-position telemetry — exposed so trade log can audit "was Tara at the edge of typical range?"
    rangeBps,
  };
};

// ═══════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════
class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e){return{hasError:true,error:e};}
  componentDidCatch(e,i){console.error('Tara crash:',e,i);}
  render(){if(this.state.hasError)return<div className="min-h-screen bg-[#111312] text-rose-500 p-8 font-mono"><h1 className="text-2xl font-bold mb-4">Tara Engine Crash</h1><pre className={'bg-black p-4 rounded text-xs mb-4 whitespace-pre-wrap border border-rose-500/30'}>{this.state.error?.toString()}</pre><button onClick={()=>{try{localStorage.clear();}catch(e){}window.location.reload();}} className="px-4 py-2 bg-rose-500 text-white rounded font-bold">Reset & Reload</button></div>;return this.props.children;}
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════

// ── FlowPanel — extracted from TaraApp to avoid esbuild IIFE+JSX parse issues ──
function FlowPanel({showWhaleLog,setShowWhaleLog,flowSignal,tapeRef,whaleLog,bloomberg,currentPrice,timeState}){
  if(!showWhaleLog)return null;
  const fs=flowSignal;
  const scoreColor=fs.score>=75?'text-emerald-400':fs.score>=50?'text-amber-400':fs.score>=25?'text-[#E8E9E4]/60':'text-[#E8E9E4]/30';
  const barColor=fs.score>=75?'bg-emerald-500':fs.score>=50?'bg-amber-500':fs.score>=25?'bg-indigo-500':'bg-zinc-600';
  const isBuyFlow=fs.netDelta30s>0||fs.streakDir==='BUY';
  const isNote=fs.divergence;
  const hasStreak=fs.streakCount>=2;
  const isBuy=fs.streakDir==='BUY';
  const oi=bloomberg?.oiChange5m||0;
  const fr=bloomberg?.fundingRate||0;
  const frSign=fr>0?'Longs paying shorts':'Shorts paying longs';
  const frColor=fr>0?'text-emerald-400':'text-rose-400';
  const ls=bloomberg?.longShortRatio||1;
  const tape=tapeRef.current;
  const spotNet=tape.coinbase.buys-tape.coinbase.sells;
  const futNet=(tape.binanceFutures.buys-tape.binanceFutures.sells)+(tape.bybit.buys-tape.bybit.sells);
  const hasMeanDiv=Math.abs(tape.cbFlow)>0.15&&Math.abs((tape.bnFlow+tape.byFlow)*0.5)>0.15&&Math.sign(tape.cbFlow)!==Math.sign((tape.bnFlow+tape.byFlow)*0.5);
  const hasSpot=Math.abs(spotNet)>50000;
  const spotAligned=hasSpot&&Math.sign(spotNet)===Math.sign(futNet);
  let oiMsg='OI stable — no major position building.';
  let oiColor='text-[#E8E9E4]/40';
  if(Math.abs(oi)>0.15){
    if(oi>0&&isBuyFlow){oiMsg='OI rising + buy flow — New longs opening. Conviction. Likely to follow through.';oiColor='text-emerald-400';}
    else if(oi<0&&isBuyFlow){oiMsg='OI falling + buy flow — Shorts covering, not fresh longs. Rally may be temporary.';oiColor='text-amber-400';}
    else if(oi>0&&!isBuyFlow){oiMsg='OI rising + sell flow — New shorts opening. Conviction sell.';oiColor='text-rose-400';}
    else if(oi<0&&!isBuyFlow){oiMsg='OI falling + sell flow — Longs exiting. Bearish unwind.';oiColor='text-amber-400';}
  }
  return(
    <div className={'fixed top-11 right-0 z-50 w-80 sm:w-96 max-h-[82vh] overflow-hidden flex flex-col bg-[#0E100F] border border-l border-b border-[#E8E9E4]/15 rounded-bl-xl shadow-2xl'} style={{boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
      <div className={'p-3 bg-[#181A19] border-b border-[#E8E9E4]/10 flex justify-between items-center shrink-0'}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
          <span className={'text-xs font-bold uppercase tracking-widest text-[#E8E9E4]/70'}>Flow Intelligence</span>
          <span className={'text-[10px] text-[#E8E9E4]/25 font-mono'}>futures tape · $100K+</span>
        </div>
        <button onClick={()=>setShowWhaleLog(false)} className="opacity-70 hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#E8E9E4]/5"><span className={'text-[#E8E9E4]/90 text-base font-bold'}>✕</span></button>
      </div>
      <div className="overflow-y-auto flex-1 p-3 space-y-3">

        {/* Flow Score */}
        <div className={'p-3 rounded-xl bg-[#181A19] border border-[#E8E9E4]/10'}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className={`text-lg font-bold font-serif ${scoreColor}`}>{fs.score.toFixed(0)}<span className="text-xs font-sans ml-1 opacity-60">&#47;100</span></div>
              <div className={`text-xs font-bold uppercase tracking-widest ${scoreColor}`}>{fs.label}</div>
            </div>
            <div className="text-right">
              <div className={`text-xs font-bold ${isBuyFlow?'text-emerald-400':'text-rose-400'}`}>{fs.netDelta30s>0?'NET BUY':'NET SELL'} (30s)</div>
              <div className={`text-xs font-mono ${isBuyFlow?'text-emerald-300':'text-rose-300'}`}>{fs.netDelta30s>=0?'+':''}{(fs.netDelta30s*0.001).toFixed(0)}K</div>
            </div>
          </div>
          <div className={'h-1.5 bg-[#E8E9E4]/10 rounded-full overflow-hidden mb-2'}>
            <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{width:fs.score+'%'}}/>
          </div>
          {isNote&&<div className="text-[10px] text-amber-400 mt-1">Spot-futures diverging — likely basis trade, not directional</div>}
          {hasSpot&&<div className={`text-[10px] mt-1 font-bold ${spotAligned?'text-emerald-400':'text-amber-400'}`}>Spot {spotAligned?'ALIGNED':'OPPOSED'} · {spotAligned?'Higher reliability':'Lower reliability — possible hedging'}</div>}
          {!hasSpot&&<div className={'text-[10px] text-[#E8E9E4]/25 mt-1'}>Spot (Coinbase): no significant activity</div>}
          <div className={'text-[10px] text-[#E8E9E4]/30 mt-1'}>{fs.trend} · 90s delta: {fs.netDelta90s>=0?'+':''}{(fs.netDelta90s*0.001).toFixed(0)}K</div>
        </div>

        {/* Whale Streak */}
        <div className={`p-3 rounded-xl border ${hasStreak?(isBuy?'bg-emerald-500/5 border-emerald-500/30':'bg-rose-500/5 border-rose-500/30'):'bg-[#181A19] border-[#E8E9E4]/8'}`}>
          <div className={'text-[10px] uppercase tracking-widest text-[#E8E9E4]/40 mb-1.5 font-bold'}>Whale Streak</div>
          {hasStreak?(
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-base font-bold font-serif ${isBuy?'text-emerald-400':'text-rose-400'}`}>{fs.streakCount}x</span>
                <span className={`text-sm font-bold ${isBuy?'text-emerald-400':'text-rose-400'}`}>{fs.streakDir}</span>
                <span className={'text-xs text-[#E8E9E4]/40'}>in {fs.streakDuration}s</span>
              </div>
              <div className={'text-xs text-[#E8E9E4]/60'}>${(fs.streakUSD*0.001).toFixed(0)}K total · {isBuy?'Accumulation pressure':'Distribution pressure'}</div>
              {fs.streakCount>=4&&<div className={`text-[10px] mt-1 font-bold ${isBuy?'text-emerald-400':'text-rose-400'}`}>High conviction streak — watch for price follow-through</div>}
              {fs.streakCount>=2&&fs.streakCount<4&&<div className={'text-[10px] mt-1 text-[#E8E9E4]/40'}>Wait for more prints before treating as directional</div>}
            </div>
          ):(
            <div className={'text-xs text-[#E8E9E4]/30 italic'}>No streak — random prints, not directional</div>
          )}
        </div>

        {/* OI Context */}
        <div className={'p-3 rounded-xl bg-[#181A19] border border-[#E8E9E4]/8'}>
          <div className={'text-[10px] uppercase tracking-widest text-[#E8E9E4]/40 mb-1.5 font-bold'}>Open Interest Context</div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${oiColor}`}>OI {oi>=0?'+':''}{oi.toFixed(2)}% (5m)</span>
          </div>
          <div className={`text-xs ${oiColor} leading-relaxed`}>{oiMsg}</div>
          <div className={`text-[10px] mt-2 ${frColor}`}>Funding: {(fr*100).toFixed(4)}% · {frSign} · {fr>0.01?'Heavily long-biased':fr<-0.01?'Heavily short-biased':'Neutral'}</div>
        </div>

        {/* Spot-Futures Divergence */}
        {hasMeanDiv&&(
          <div className={'p-3 rounded-xl bg-amber-500/5 border border-amber-500/25'}>
            <div className="text-[10px] uppercase tracking-widest text-amber-400 mb-1.5 font-bold">Spot-Futures Divergence</div>
            <div className="text-xs text-amber-300 mb-1">Spot (Coinbase): <strong>{tape.cbFlow>0?'BUYING':'SELLING'}</strong> · Futures: <strong>{((tape.bnFlow+tape.byFlow)*0.5)>0?'BUYING':'SELLING'}</strong></div>
            <div className={'text-[10px] text-[#E8E9E4]/50 leading-relaxed'}>Opposite flows between spot and futures typically indicate basis traders — not directional conviction.</div>
          </div>
        )}

        {/* Long-Short Ratio */}
        {bloomberg?.longShortRatio&&(
          <div className={'p-3 rounded-xl bg-[#181A19] border border-[#E8E9E4]/8'}>
            <div className={'text-[10px] uppercase tracking-widest text-[#E8E9E4]/40 mb-2 font-bold'}>Market Positioning (Binance)</div>
            <div className="flex items-center gap-2 mb-1">
              <div className={'flex-1 h-2 bg-[#E8E9E4]/10 rounded-full overflow-hidden'}>
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:Math.min(100,(ls*100)/(ls+1))+'%'}}/>
              </div>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-emerald-400">Long {((ls*100)/(ls+1)).toFixed(0)}%</span>
              <span className="text-rose-400">Short {(100/(ls+1)).toFixed(0)}%</span>
            </div>
            {ls>1.5&&<div className="text-[10px] text-rose-400 mt-1">Crowd is heavily long — contrarian warning.</div>}
            {ls<0.7&&<div className="text-[10px] text-emerald-400 mt-1">Crowd is heavily short — short squeeze risk elevated.</div>}
          </div>
        )}

        {/* Raw Prints */}
        <details className="group">
          <summary className={'text-[10px] uppercase tracking-widest text-[#E8E9E4]/25 cursor-pointer hover:text-[#E8E9E4]/50 font-bold list-none flex items-center gap-1'}>
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            Raw prints ({whaleLog.length}) — futures $100K+, not directional on their own
          </summary>
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {whaleLog.length===0?<div className={'text-xs text-[#E8E9E4]/30 italic'}>No prints yet</div>:whaleLog.slice(0,20).map((w,i)=>{
              const d=new Date(w.time);
              return(<div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded bg-[#111312] border ${w.side==='BUY'?'border-emerald-500/15':'border-rose-500/15'}`}>
                <span className={'text-[#E8E9E4]/25 font-mono shrink-0'}>{d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
                <span className={`font-bold text-[10px] ${w.side==='BUY'?'text-emerald-500':'text-rose-500'}`}>{w.side}</span>
                <span className={'text-[#E8E9E4]/50'}>${(w.usd*0.001).toFixed(0)}K</span>
                <span className={'text-[#E8E9E4]/25 text-[10px] ml-auto'}>{w.src}</span>
              </div>);
            })}
          </div>
        </details>

      </div>
    </div>
  );
}

// Flow button component — extracted to avoid nested template literals in JSX (esbuild safe)
const FlowBtn=({flowSignal,active,onClick,cls})=>{
  const isStrong=flowSignal.score>=75;
  const isEmerging=flowSignal.score>=50&&flowSignal.score<75;
  const scoreStr=isStrong?(flowSignal.label+' '+Math.round(flowSignal.score)+'/100'):'Flow Intelligence';
  const colorCls=active
    ?'bg-purple-500/20 border-purple-500/40 text-purple-400'
    :isStrong
    ?'bg-rose-500/15 border-rose-500/40 text-rose-400 animate-pulse'
    :isEmerging
    ?'bg-amber-500/10 border-amber-500/30 text-amber-400'
    :'border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-purple-400';
  const baseCls=cls==='hidden sm:flex'
    ?'hidden sm:flex items-center gap-1 p-1.5 rounded-lg border text-xs transition-all '
    :'flex items-center gap-1 justify-center px-2 py-1.5 rounded-lg text-xs transition-all ';
  return(
    <button onClick={onClick} className={baseCls+colorCls} title={scoreStr}>
      FLOW
      {isStrong&&<span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse ml-0.5"/>}
      {!isStrong&&isEmerging&&<span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5"/>}
    </button>
  );
};


// QualityGateCard — extracted to avoid esbuild IIFE+template-literal slash bug
function QualityGateCard({qualityGate,regime,session}){
  if(!qualityGate)return null;
  const c=qualityGate.color;
  // V2.1: amber tier (mid quality 50-74) recolored to copper for two-tone palette consistency.
  // Emerald (high) and rose (low) preserved — those are success/failure direction, not friction.
  const bgStyle={
    emerald:{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.25)'},
    amber:{background:T2_COPPER_BG,border:'1px solid '+T2_COPPER_BORDER},
    rose:{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.20)'},
  }[c]||{};
  const txtStyle=c==='amber'?{color:T2_COPPER}:{};
  const txtCls=c==='emerald'?'text-emerald-400':c==='amber'?'':'text-rose-400';
  const barCls=c==='emerald'?'bg-emerald-500':c==='amber'?'':'bg-rose-500';
  const barStyle=c==='amber'?{background:T2_COPPER}:{};
  const msg=qualityGate.score>=75
    ?('High-confidence setup. '+(regime||'')+(session?' in '+session:'')+' historically reliable.')
    :qualityGate.score>=55
    ?'Moderate setup. Trade smaller or wait for stronger signal.'
    :('Low quality — '+(regime||'')+' in '+(session||'')+' has weak historical WR. Consider sitting out.');
  return(
    <div className="mb-2 p-2.5 rounded-lg" style={bgStyle}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest font-bold" style={{color:'rgba(232,233,228,0.3)'}}>Quality Gate</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${txtCls}`} style={txtStyle}>{qualityGate.label} — {qualityGate.score?.toFixed(0)}&#47;100</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{background:'rgba(232,233,228,0.1)'}}>
        <div className={`h-full rounded-full transition-all duration-700 ${barCls}`} style={{width:(qualityGate.score||0)+'%',...barStyle}}/>
      </div>
      <div className={`text-[10px] ${txtCls}`} style={{opacity:0.7,...txtStyle}}>{msg}</div>
    </div>
  );
}

// SyncButtons — extracted to avoid esbuild IIFE+shadow class slash bug
function SyncButtons({userPosition,handleManualSync}){
  const upActive=userPosition==='UP';
  const dnActive=userPosition==='DOWN';
  const upCls='flex-1 py-2 border rounded-lg text-xs uppercase font-bold tracking-wide transition-all '+(upActive?'bg-emerald-600 text-white border-emerald-400':'border-[#E8E9E4]/10');
  const dnCls='flex-1 py-2 border rounded-lg text-xs uppercase font-bold tracking-wide transition-all '+(dnActive?'bg-rose-600 text-white border-rose-400':'border-[#E8E9E4]/10');
  return(
    <div className="flex gap-2">
      <button onClick={()=>handleManualSync('UP')} className={upCls}
        style={upActive?{boxShadow:'0 0 15px rgba(16,185,129,0.3)'}:{}}>ENTERED UP</button>
      <button onClick={()=>handleManualSync('DOWN')} className={dnCls}>ENTERED DOWN</button>
    </div>
  );
}

// ── PredictionContent — extracted from TaraApp to fix esbuild JSX parsing ──
function PredictionContent(props){
  const {
    strikeConfirmed,strikeMode,targetMargin,
    isLoading,analysis,currentPrice,
    qualityGate,userPosition,timeState,streakData,
    handleManualSync,getMarketSessions,executeAction,
    broadcastSignalManual,discordWebhook,regimeDirWR,
    kalshiYesPrice,
    newsSentiment // V145: dual-source news scanner output (geoRisk, geoTopic, source)
  }=props;
  // V113: Track local broadcast state (so button shows "Sent ✓" after click)
  const[broadcasted,setBroadcasted]=React.useState({key:'',sent:false});
  React.useEffect(()=>{
    // Reset broadcast button when window changes or prediction changes meaningfully
    const wKey=timeState?.startWindow||timeState?.nextWindow||0;
    const dir=analysis?.prediction?.includes('UP')?'UP':analysis?.prediction?.includes('DOWN')?'DOWN':'';
    const lockType=analysis?.lockInfo?'LOCK':'SIG';
    const key=`${lockType}:${dir}:${wKey}`;
    if(broadcasted.key!==key){
      setBroadcasted({key,sent:false});
    }
  },[analysis?.lockInfo?.lockedAt,analysis?.prediction,timeState?.startWindow,timeState?.nextWindow]);

  // ── Mode 1: Strike entry pending ──
  if(!strikeConfirmed&&strikeMode==='manual'&&targetMargin>0){
    return(
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className={'text-xs uppercase tracking-widest text-indigo-400/70 font-bold animate-pulse'}>Enter strike price</div>
        <div className="text-2xl font-serif text-white">${targetMargin.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        <div className={'text-xs text-[#E8E9E4]/30'}>Press OK or Enter to confirm · Tara will scan after</div>
      </div>
    );
  }

  // ── Mode 2: Loading ──
  if(isLoading||!analysis){
    return(
      <div className={'flex-1 flex items-center justify-center text-[#E8E9E4]/30 font-serif animate-pulse'}>Connecting...</div>
    );
  }

  // ── Mode 3: Full prediction display ──
  // Build lock price status (extracted from IIFE)
  let lockPriceStatus=null;
  if(analysis.lockInfo&&currentPrice){
    const lp=analysis.lockInfo.lockPrice;
    const dir=analysis.lockInfo.dir;
    const winning=(dir==='DOWN'&&currentPrice<lp)||(dir==='UP'&&currentPrice>lp);
    const statusTxt=winning?'IN PROFIT':'ADVERSE';
    const statusCls=winning?'text-emerald-400':'text-rose-400';
    const arrow=winning?'▲':'▼';
    lockPriceStatus=(
      <div style={{fontSize:'12px',opacity:0.4,marginTop:'4px'}}>
        Locked at {lp.toFixed(0)} — Now {currentPrice.toFixed(0)}
        <span style={{marginLeft:'8px',fontWeight:'bold'}} className={statusCls}>
          {arrow} {statusTxt}
        </span>
      </div>
    );
  }

  // Build entry checklist items
  const checklistItems=[
    {ok:targetMargin>0,label:'Strike confirmed'},
    {ok:(analysis.lockInfo?.lockedPosterior>60||analysis.lockInfo?.lockedPosterior<40),label:`Posterior ${analysis.lockInfo?.lockedPosterior?.toFixed(0)||'—'}% — strong signal`},
    {ok:(timeState.minsRemaining>=2),label:`${timeState.minsRemaining}m ${timeState.secsRemaining}s remaining (≥2m needed)`},
    {ok:!streakData.warning,label:streakData.warning?`${streakData.streak}-loss streak — proceed with caution`:'No cold streak'},
  ];

  const showFormingProgress=!analysis.lockInfo&&(analysis.prediction.includes('FORMING')||analysis.prediction.includes('ANALYZING')||analysis.prediction==='SEARCHING...');
  const formingDir=analysis.prediction.includes('UP');
  const formingCount=formingDir?analysis.bullCount:analysis.bearCount;
  const formingPct=Math.min(100,(formingCount/analysis.consecutiveNeeded)*100);
  const formingBarCls='h-full rounded-full transition-all duration-500 '+(formingDir?'bg-emerald-500/60':'bg-rose-500/60');
  // V3.1.4: Two heading variants — the original "hero" size for short single-word states
  // (UP - LOCKED, DOWN, SEARCHING) and a tighter size for longer multi-word titles
  // (REJECTED, BLACKOUT, etc.) so they don't wrap into 3 lines on narrow viewports.
  const headingCls='prediction-heading text-3xl sm:text-4xl md:text-5xl font-serif font-bold leading-none tracking-tight '+(analysis.textColor||'')+' drop-shadow-lg';
  const headingClsCompact='prediction-heading text-2xl sm:text-3xl md:text-4xl font-serif font-bold leading-tight tracking-tight '+(analysis.textColor||'')+' drop-shadow-lg';

  return(
    <div className="flex flex-col flex-1 gap-3">
      <div className="flex flex-col items-center text-center pt-1">
        {/* V114: Macro event banner - shows when in BLACKOUT/OBSERVE/ENHANCED state */}
        {(()=>{
          if(typeof getMacroEventState!=='function')return null;
          const ms=getMacroEventState();
          if(ms.state==='CLEAR')return null;
          const cfg={
            BLACKOUT:{cls:'bg-rose-500/15 border-rose-500/40 text-rose-300',icon:'🔴',label:'BLACKOUT'},
            OBSERVE: {cls:'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse',icon:'⚠️',label:'OBSERVE ONLY'},
            ENHANCED:{cls:'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',icon:'⚡',label:'POST-EVENT'},
          }[ms.state];
          if(!cfg)return null;
          const detail=ms.minutesUntil>0?`in ${ms.minutesUntil}m`:`${Math.abs(ms.minutesUntil||0)}m ago`;
          return(<div className={'mb-2 px-2 py-1.5 rounded border text-[10px] font-bold uppercase tracking-wider w-full text-center '+cfg.cls}>
            {cfg.icon} {cfg.label} · {ms.event.name} {detail}
          </div>);
        })()}
        <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
          <span className={'text-xs text-[#E8E9E4]/40 uppercase tracking-[0.2em] font-bold'}>Prediction</span>
          {analysis.regime&&(
            <span className={'text-xs text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded'}>{analysis.regime}</span>
          )}
          {/* V134: Regime-Direction WR warning */}
          {analysis.lockInfo&&regimeDirWR&&(()=>{
            const k=analysis.regime+'-'+analysis.lockInfo.dir;
            const stat=regimeDirWR[k];
            if(!stat||stat.n<5)return null;
            const pct=Math.round(stat.rate*100);
            if(pct>=70)return(<span className={'text-xs uppercase tracking-wide px-2 py-1 rounded border font-bold text-emerald-300 bg-emerald-500/10 border-emerald-500/30'} title={`${stat.wins}W in ${stat.n} trades — strong historical edge`}>HIST {pct}%</span>);
            if(pct<=50)return(<span className={'text-xs uppercase tracking-wide px-2 py-1 rounded border font-bold text-rose-300 bg-rose-500/15 border-rose-500/40 animate-pulse'} title={`${stat.wins}W in ${stat.n} trades — weak historical combo, consider sitting out`}>⚠ HIST {pct}%</span>);
            return(<span className={'text-xs uppercase tracking-wide px-2 py-1 rounded border font-bold text-amber-300 bg-amber-500/10 border-amber-500/30'} title={`${stat.wins}W in ${stat.n} trades`}>HIST {pct}%</span>);
          })()}
          {/* V134: Trajectory direction hint */}
          {Math.abs(analysis.trajectoryAdj||0)>=5&&(
            (()=>{
              const adj=analysis.trajectoryAdj;
              const isUp=adj>0;
              return(<span className={'text-xs uppercase tracking-wide px-2 py-1 rounded border font-bold '+(isUp?'text-emerald-300 bg-emerald-500/10 border-emerald-500/30':'text-rose-300 bg-rose-500/10 border-rose-500/30')} title={`Forward trajectory bias: ${isUp?'UP':'DOWN'} ${Math.abs(adj).toFixed(1)} pts. Tara is reading where price is heading, not just where it is.`}>
                {isUp?'↗':'↘'} TRAJ {isUp?'+':''}{adj.toFixed(0)}
              </span>);
            })()
          )}
          {/* V138: Current trading session — shows flag, session name, day×session rating */}
          {analysis.session&&(
            (()=>{
              const sess=analysis.session;
              const rating=analysis.sessionDayRating||'C';
              const adj=analysis.sessionDayAdj||0;
              const cfg={
                'EU':       {flag:'🌍',cls:'text-blue-300 bg-blue-500/10 border-blue-500/30'},
                'ASIA':     {flag:'🌏',cls:'text-amber-300 bg-amber-500/10 border-amber-500/30'},
                'US':       {flag:'🌎',cls:'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'},
                'OFF-HOURS':{flag:'🌑',cls:'text-zinc-400 bg-zinc-500/10 border-zinc-500/30'},
              }[sess]||{flag:'🌐',cls:'text-zinc-400 bg-zinc-500/10 border-zinc-500/30'};
              // V138: poor day-session combos get warning color treatment
              const warnCls=(rating==='D'||rating==='F')?'text-rose-300 bg-rose-500/10 border-rose-500/40 animate-pulse':null;
              const goodCls=(rating==='A')?'text-emerald-300 bg-emerald-500/15 border-emerald-500/50':null;
              const cls=warnCls||goodCls||cfg.cls;
              const ratingDesc={A:'Strong historical performance',B:'Good historical performance',C:'Neutral — average timing',D:'Below average — be selective',F:'Poor historical performance — consider sitting out'}[rating]||'';
              const tooltip=`Active session: ${sess}\nToday × ${sess} rating: ${rating} (${adj>0?'+':''}${adj} quality adjustment)\n\n${ratingDesc}\nKey: ${analysis.sessionDayKey||''}`;
              return(<span className={'text-xs uppercase tracking-wide px-2 py-1 rounded border font-bold '+cls} title={tooltip}>
                {cfg.flag} {sess} · {rating}
              </span>);
            })()
          )}
          {/* V136: FGT IS THE PRIMARY SIGNAL — badge styling reflects this.
              4/4 → larger, pulsing, distinct. 3/4 → emphasized. 2/4 → standard. */}
          {analysis.mtfAlignment!==undefined&&Math.abs(analysis.mtfAlignment)>=2&&(
            (()=>{
              const mtf=analysis.mtfAlignment;
              const count=Math.abs(mtf);
              const isUp=mtf>0;
              const fgt=analysis.fgtResults||{};
              const arrows=['1m','3m','5m','15m'].map(tf=>{
                const f=fgt[tf];
                if(!f||!f.valid)return '?';
                if(f.forecastDir==='UP')return '↑';
                if(f.forecastDir==='DOWN')return '↓';
                return '→';
              }).join('');
              // V136: Tier styling — 4/4 is the headline, 3/4 emphasized, 2/4 standard
              const baseCls=isUp?'text-emerald-200':'text-rose-200';
              const fullCls=isUp
                ? 'bg-emerald-500/25 border-emerald-400/70 ring-2 ring-emerald-500/30 animate-pulse'
                : 'bg-rose-500/25 border-rose-400/70 ring-2 ring-rose-500/30 animate-pulse';
              const threeCls=isUp?'bg-emerald-500/15 border-emerald-500/50':'bg-rose-500/15 border-rose-500/50';
              const twoCls=isUp?'bg-emerald-500/8 border-emerald-500/30':'bg-rose-500/8 border-rose-500/30';
              const tierCls=count>=4?fullCls:count>=3?threeCls:twoCls;
              const sizeCls=count>=4?'text-sm px-3 py-1.5 font-extrabold':'text-xs px-2 py-1 font-bold';
              const cls=baseCls+' '+tierCls+' '+sizeCls;
              const tooltipDetails=['1m','3m','5m','15m'].map(tf=>{
                const f=fgt[tf];
                if(!f||!f.valid)return `${tf}: loading`;
                return `${tf}: ${f.forecastBps>0?'+':''}${f.forecastBps}bps → $${f.fcast}`;
              }).join('\n');
              const headline=count>=4?'★ FGT 4/4 PRIMARY':count>=3?'FGT 3/4':'FGT 2/4';
              return(<span className={'uppercase tracking-wide rounded border '+cls} title={`HPotter Future Grand Trend forecast across timeframes:\n${tooltipDetails}\n\n${count}/4 align ${isUp?'UP':'DOWN'}\n\nV136: FGT is the primary directional signal. 4/4 alignment fast-tracks the lock.`}>
                {headline} {arrows}
              </span>);
            })()
          )}
          {analysis.velocityRegime&&analysis.velocityRegime!=='NORMAL'&&(
            (()=>{
              const v=analysis.velocityRegime;
              const cfg={
                SLOW:    {label:'🐢 SLOW',    cls:'text-blue-300 bg-blue-500/10 border-blue-500/30'},
                FAST:    {label:'⚡ FAST',    cls:'text-amber-300 bg-amber-500/10 border-amber-500/30'},
                EXTREME: {label:'🔥 EXTREME', cls:'text-rose-300 bg-rose-500/15 border-rose-500/40 animate-pulse'},
              }[v];
              if(!cfg)return null;
              return(<span className={'text-xs uppercase tracking-wide px-2 py-1 rounded border font-bold '+cfg.cls} title={`Market velocity: ${v}. Tara is adapting thresholds, sample requirements, and momentum tolerance accordingly.`}>{cfg.label}</span>);
            })()
          )}
          {analysis.lockInfo&&(
            <span className={'text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-2 py-1'}>
              🔒 {Math.floor((Date.now()-analysis.lockInfo.lockedAt)/1000)}s @ {analysis.lockInfo.lockedPosterior.toFixed(0)}%{analysis.lockInfo.isLateLock?' ⚠️':''}
            </span>
          )}
          {!analysis.lockInfo&&analysis.isLateLockZone&&(
            <span className={'text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400'} title="Late in window — lock reliability reduced">LATE WINDOW</span>
          )}
          {analysis.isVeryLateLock&&!analysis.lockInfo&&(
            <span className={'text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-500/15 border border-zinc-500/30 text-zinc-400'}>NO CALL ZONE</span>
          )}
          {analysis.mtfAligned&&(
            <span className={'text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 animate-pulse'} title="Both 5m and 15m locked same direction — stronger conviction">DUAL LOCK</span>
          )}
          {analysis.mtfOpposed&&(
            <span className={'text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400'} title="5m and 15m are pointing in opposite directions — conflicting signal, trade carefully">CONFLICT</span>
          )}
        </div>
        {/* V143: Smart prediction text routing — split long status messages into a tight
                  title + subtitle so the giant heading doesn't wrap to 3 lines. Short messages
                  (UP - LOCKED, DOWN - LOCKED, UP (FORMING), SEARCHING...) render as the big heading.
            V3.1.4: REJECTED messages moved out of isShort — they're sentence-length and were
                  wrapping awkwardly across 3 lines at the hero size. Now split into title +
                  subtitle ("UP REJECTED" + "trajectory says DOWN") and use the compact heading
                  variant. */}
        {(()=>{
          const p=analysis.prediction||'';
          // Lock and FORMING and SEARCHING — short, render full as hero heading
          const isShort=p.includes('LOCKED')||p.includes('FORMING')||p==='SEARCHING...'||p==='NO CALL'||p==='CLOSED'||p.includes('WAITING FOR MOMENTUM')||p.includes('LOCK RELEASED');
          if(isShort){
            return <h2 className={headingCls}>{p}</h2>;
          }
          // Long-form status — split into uppercase title + subtitle
          let title='', subtitle='';
          if(p.includes('REJECTED')){
            // V3.1.4: "UP REJECTED — trajectory says DOWN" → title "UP REJECTED" / subtitle "Trajectory says DOWN"
            const dashIdx=p.indexOf('—');
            if(dashIdx>0){
              title=p.slice(0,dashIdx).trim();
              const rest=p.slice(dashIdx+1).trim();
              // Capitalize first letter of subtitle for readability
              subtitle=rest.charAt(0).toUpperCase()+rest.slice(1);
            } else {
              title=p;
              subtitle='';
            }
          } else if(p.includes('ANALYZING')){
            const m=p.match(/\[(\d+)s\]/);
            const lean=p.match(/leaning (UP|DOWN)/);
            title='ANALYZING';
            subtitle=m?`Searching for signal · ${m[1]}s${lean?' · leaning '+lean[1]:''}`:'Searching for signal';
          } else if(p.includes('SITTING OUT')){
            title='SITTING OUT';
            subtitle='Mixed signals · no edge this window';
          } else if(p.includes('MACRO BLACKOUT')){
            title='MACRO BLACKOUT';
            const m=p.match(/\((.+)\)/);
            subtitle=m?m[1]:'Awaiting macro event';
          } else if(p.includes('OBSERVING')){
            title='OBSERVING';
            subtitle=p.replace('OBSERVING ','');
          } else if(p.includes('BREAKING NEWS')){
            title='BREAKING NEWS';
            subtitle='Observing market reaction';
          } else if(p.includes('WEAK SETUP')){
            title='WEAK SETUP';
            subtitle=p.replace('WEAK SETUP — ','');
          } else if(p.includes('LOW QUALITY')){
            title='LOW QUALITY';
            subtitle='Sitting out';
          } else {
            // Fallback — render whatever it is, but cap text length
            title=p.length<=20?p:p.split('—')[0]?.trim()||p.slice(0,18);
            subtitle=p.includes('—')?p.split('—').slice(1).join('—').trim():'';
          }
          return(
            <div className="flex flex-col items-center text-center">
              <h2 className={headingClsCompact}>{title}</h2>
              {subtitle&&<div className={'mt-1.5 text-sm sm:text-base text-[#E8E9E4]/55 font-sans tracking-tight max-w-md leading-snug'}>{subtitle}</div>}
            </div>
          );
        })()}

        {/* V134: Plain-English summary line — always visible */}
        <div className="mt-2 px-3 py-2 rounded-lg bg-[#0E100F]/60 border border-[#E8E9E4]/8 max-w-md w-full">
          <div className={'text-[10px] uppercase tracking-widest text-[#E8E9E4]/40 font-bold mb-1'}>What Tara sees</div>
          <div className="text-xs sm:text-sm text-[#E8E9E4]/80 leading-snug">
            {buildPlainEnglish(analysis,qualityGate,analysis?.advisor)}
          </div>
        </div>

        {/* V134: STAND DOWN banner — overrides chart reads */}
        {(analysis.prediction.includes('BLACKOUT')||analysis.prediction.includes('OBSERVE')||analysis.prediction.includes('LOW QUALITY')||analysis.prediction.includes('SITTING OUT')||analysis.prediction.includes('BREAKING NEWS'))&&(
          <div className="mt-3 px-4 py-3 rounded-lg bg-rose-500/15 border-2 border-rose-500/50 text-center max-w-md mx-auto w-full">
            <div className="text-rose-300 text-xs uppercase tracking-widest font-bold mb-1">⛔ Stand Down</div>
            <div className="text-rose-200 text-sm font-bold leading-snug">
              Even if your chart looks good — Tara is sitting this one out.
            </div>
          </div>
        )}

        {/* V113: Manual Discord broadcast button - shows for UP/DOWN signals or locks (not SEARCHING) */}
        {discordWebhook&&broadcastSignalManual&&analysis&&analysis.prediction!=='Connecting...'&&(
          (()=>{
            const wKey=timeState?.startWindow||timeState?.nextWindow||0;
            const isStandDown=['BLACKOUT','OBSERVE','LOW QUALITY','SITTING OUT','BREAKING NEWS'].some(s=>analysis.prediction?.includes(s));
            const isSearching=analysis?.prediction?.includes('SEARCHING');
            const dir=analysis?.prediction?.includes('UP')?'UP':analysis?.prediction?.includes('DOWN')?'DOWN':isSearching?'SEARCH':isStandDown?'STAND_DOWN':'';
            const lockType=analysis?.lockInfo?'LOCK':isStandDown?'STAND':isSearching?'SRCH':'SIG';
            const key=`${lockType}:${dir}:${wKey}:${analysis.prediction}`;
            const isSent=broadcasted.sent&&broadcasted.key===key;
            const label=analysis.lockInfo?`Send ${dir} LOCK`:isStandDown?'Broadcast STAND DOWN':isSearching?'Send Searching update':`Send ${dir} signal`;
            return(
              <button
                onClick={()=>{
                  if(isSent)return;
                  broadcastSignalManual();
                  setBroadcasted({key,sent:true});
                }}
                disabled={isSent}
                className={'mt-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all '+(isSent?'border-emerald-500/30 bg-emerald-500/5 text-emerald-400/60 cursor-default':'border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 active:scale-95')}>
                {isSent?'✓ Sent to Discord':'📡 '+label}
              </button>
            );
          })()
        )}

        {showFormingProgress&&(
          <div className="mt-2 w-full px-4">
            <div className={'flex justify-between text-xs text-[#E8E9E4]/30 uppercase mb-1'}>
              <span>Confirming signal...</span>
              <span>{formingCount} of {analysis.consecutiveNeeded} samples</span>
            </div>
            <div className="w-full h-1 bg-[#111312] rounded-full overflow-hidden">
              <div className={formingBarCls} style={{width:formingPct+'%'}}/>
            </div>
          </div>
        )}

        {/* V142: Tara vs Kalshi side-by-side. The edge is in the disagreement. */}
        {(()=>{
          const taraUp=Number(analysis.rawProbAbove||0);
          const taraDn=100-taraUp;
          const taraDir=taraUp>=50?'UP':'DOWN';
          const taraConf=Math.max(taraUp,taraDn);
          // Kalshi YES price is in cents (e.g., 9.9 = 9.9¢ = 9.9% implied probability of UP)
          const kUp=kalshiYesPrice!=null?kalshiYesPrice:null;
          const kDn=kUp!=null?(100-kUp):null;
          const kDir=kUp==null?null:kUp>=50?'UP':'DOWN';
          // EDGE: how much more confident is Tara than Kalshi in Tara's direction?
          // If Tara says UP 75% and Kalshi prices UP at 50%, Tara sees a 25-pt edge on UP.
          // If they agree on direction, edge is the gap. If they disagree, edge is meaningful too — it's the divergence.
          const edge=kUp==null?null:(taraDir==='UP'?taraUp-kUp:taraDn-kDn);
          const isAgree=kDir!=null&&kDir===taraDir;
          // Edge color: strong disagreement Tara's way = green (her edge), agreement = neutral, opposite = warn
          const edgeAbs=edge!=null?Math.abs(edge):0;
          const edgeCls=edge==null?'text-[#E8E9E4]/40':
            edge>=20?'text-emerald-300 font-bold':
            edge>=10?'text-emerald-400':
            edge>=0?'text-[#E8E9E4]/60':
            edge>=-10?'text-amber-400':
            'text-rose-400 font-bold';
          const edgeLabel=edge==null?'—':edge>=0?`+${edge.toFixed(0)}pts`:`${edge.toFixed(0)}pts`;
          const edgeTooltip=edge==null?'Kalshi price not available':
            edge>=20?`Tara is ${edge.toFixed(0)}pts more confident than Kalshi in ${taraDir}. Strong edge.`:
            edge>=10?`Tara is ${edge.toFixed(0)}pts more confident than Kalshi in ${taraDir}. Moderate edge.`:
            edge>=0?`Tara and Kalshi roughly agree on ${taraDir}. No special edge.`:
            edge>=-10?`Tara and Kalshi disagree slightly. Caution.`:
            `Kalshi pricing strongly against Tara's ${taraDir} call. Reconsider entry.`;
          return(
            <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
              <div className="flex items-center gap-1.5" title="Tara's internal posterior probability">
                <span className="text-[9px] uppercase text-[#E8E9E4]/40 tracking-wider">TARA</span>
                <span className={taraDir==='UP'?'text-emerald-300':'text-rose-300'}>{taraDir} {taraConf.toFixed(0)}%</span>
              </div>
              {kUp!=null?(
                <>
                  <span className="text-[#E8E9E4]/20">vs</span>
                  <div className="flex items-center gap-1.5" title="Kalshi market-implied probability (live YES price)">
                    <span className="text-[9px] uppercase text-purple-400/70 tracking-wider">KLSH</span>
                    <span className={kDir==='UP'?'text-emerald-300/80':'text-rose-300/80'}>{kDir} {Math.max(kUp,kDn).toFixed(0)}%</span>
                  </div>
                  <div className={'flex items-center gap-1 px-1.5 py-0.5 rounded border '+(edge>=20?'border-emerald-500/40 bg-emerald-500/10':edge>=10?'border-emerald-500/30':edge>=0?'border-[#E8E9E4]/15':edge>=-10?'border-amber-500/30 bg-amber-500/5':'border-rose-500/40 bg-rose-500/10')} title={edgeTooltip}>
                    <span className="text-[9px] uppercase text-[#E8E9E4]/50 tracking-wider">EDGE</span>
                    <span className={edgeCls}>{edgeLabel}</span>
                    {!isAgree&&edge!=null&&<span className="text-[9px] text-amber-400/80">⚡</span>}
                  </div>
                </>
              ):(
                <>
                  <span className="text-[#E8E9E4]/20">vs</span>
                  <div className="flex items-center gap-1.5" title="Kalshi data not available — fetch may be loading or this strike isn't on Kalshi yet">
                    <span className="text-[9px] uppercase text-purple-400/40 tracking-wider">KLSH</span>
                    <span className="text-[#E8E9E4]/30 italic">loading…</span>
                  </div>
                </>
              )}
              {/* V145: Geopolitics / macro risk pill — surfaces when news scanner detects elevated risk */}
              {newsSentiment&&newsSentiment.geoRisk>=0.3&&(
                (()=>{
                  const r=newsSentiment.geoRisk;
                  const cls=r>=0.7?'border-rose-500/40 bg-rose-500/10 text-rose-300':r>=0.5?'border-amber-500/40 bg-amber-500/10 text-amber-300':'border-amber-500/25 bg-amber-500/5 text-amber-300/80';
                  const label=r>=0.7?'HIGH':r>=0.5?'ELEVATED':'WATCH';
                  const tooltip=`Macro/geo news risk: ${(r*100).toFixed(0)}%${newsSentiment.geoTopic?'\n\nTop story: '+newsSentiment.geoTopic:''}${newsSentiment.geoSource?'\n\nSource: '+(newsSentiment.geoSource==='gdelt'?'GDELT global news':'Crypto news feed'):''}\n\nQuality gate haircut: ${r>=0.5?'-'+Math.round(8*r)+'pts':'monitoring only, no penalty yet'}`;
                  return(
                    <div className={'flex items-center gap-1 px-1.5 py-0.5 rounded border '+cls} title={tooltip}>
                      <span className="text-[9px] uppercase tracking-wider opacity-70">GEO</span>
                      <span className="font-bold">{label}</span>
                    </div>
                  );
                })()
              )}
              {analysis.kellyPct>0&&(
                <span className={'text-amber-400/80'} title="Kelly Criterion: theoretical optimal bet size">Kelly: {analysis.kellyPct.toFixed(1)}%</span>
              )}
              {analysis.kellyPct>0&&qualityGate?.score>=60&&(
                (()=>{
                  const q=qualityGate.score;
                  const frac=q>=90?0.75:q>=80?0.66:q>=70?0.5:0.25;
                  const fracLabel=q>=90?'¾':q>=80?'⅔':q>=70?'½':'¼';
                  // V142: Edge-aware Kelly — if Tara has a real edge over Kalshi, use full recommended fraction.
                  //       If she's actually fighting Kalshi (negative edge), shrink the bet.
                  const edgeMult=edge==null?1:edge>=15?1:edge>=5?0.85:edge>=-5?0.6:edge>=-15?0.3:0.1;
                  const recPct=(analysis.kellyPct*frac*edgeMult).toFixed(1);
                  const tooltip=edge==null
                    ?`Quality ${q.toFixed(0)} → use ${fracLabel} Kelly`
                    :edge>=15?`Strong edge over Kalshi (+${edge.toFixed(0)}pts) → full ${fracLabel} Kelly`
                    :edge>=5?`Moderate edge (+${edge.toFixed(0)}pts) → 85% of ${fracLabel} Kelly`
                    :edge>=-5?`Roughly aligned with Kalshi → 60% of ${fracLabel} Kelly`
                    :edge>=-15?`Fighting Kalshi (${edge.toFixed(0)}pts) → 30% of ${fracLabel} Kelly`
                    :`Strongly fighting Kalshi (${edge.toFixed(0)}pts) → 10% of ${fracLabel} Kelly`;
                  return(<span className={'text-emerald-400/80'} title={tooltip}>Bet: {recPct}%</span>);
                })()
              )}
            </div>
          );
        })()}

        {lockPriceStatus}
      </div>

      {analysis.lockInfo&&(
        <QualityGateCard qualityGate={qualityGate} regime={analysis.regime} session={getMarketSessions().dominant}/>
      )}

      {!userPosition&&analysis.lockInfo&&(
        <div className={'mb-2 p-2.5 rounded-lg bg-[#111312] border border-[#E8E9E4]/8'}>
          <div className={'text-[10px] uppercase tracking-wide text-[#E8E9E4]/30 font-bold mb-1.5'}>Entry checklist</div>
          <div className="space-y-1">
            {checklistItems.map((item,i)=>{
              const iconCls=item.ok?'text-emerald-400':'text-amber-400';
              const labelCls=item.ok?'text-[#E8E9E4]/60':'text-amber-400/80';
              const icon=item.ok?'✓':'⚠';
              return(
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <span className={iconCls}>{icon}</span>
                  <span className={labelCls}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={'flex flex-col gap-1.5 border-t border-[#E8E9E4]/10 pt-3'}>
        <span className={'text-xs uppercase tracking-wide text-[#E8E9E4]/30 text-center'}>-30% Stop Guard Sync</span>
        <SyncButtons userPosition={userPosition} handleManualSync={handleManualSync}/>
      </div>

      {/* ── V111: TARA ADVISOR PANEL ── */}
      <TaraAdvisorPanel advisor={analysis?.advisor} executeAction={executeAction}/>
    </div>
  );
}

// ── V111: TaraAdvisorPanel — shows current advisor recommendation with clickable action ──
function TaraAdvisorPanel({advisor,executeAction}){
  if(!advisor||!advisor.label||advisor.label==='CONNECTING...')return null;
  const colorMap={
    emerald:'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    rose:   'border-rose-500/40 bg-rose-500/10 text-rose-400',
    amber:  'border-amber-500/40 bg-amber-500/10 text-amber-400',
    zinc:   'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
  };
  const cls=colorMap[advisor.color]||colorMap.zinc;
  const animate=advisor.animate?'animate-pulse':'';
  const canClick=advisor.hasAction&&advisor.actionLabel&&advisor.actionTarget&&executeAction;
  return(
    <div className={'mt-2 p-3 rounded-lg border '+cls+' '+animate}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <IC.Bell className="w-3.5 h-3.5"/>
        <span className={'text-[10px] uppercase tracking-widest font-bold opacity-70'}>Tara Advisor</span>
      </div>
      <div className="text-sm font-serif font-bold leading-tight mb-1">{advisor.label}</div>
      {advisor.reason&&(
        <div className={'text-[11px] leading-snug opacity-80'}>{advisor.reason}</div>
      )}
      {canClick?(
        <button
          onClick={()=>executeAction(advisor.actionTarget,advisor.actionLabel)}
          className={'mt-2 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded border border-current hover:bg-current/10 active:scale-95 transition-all cursor-pointer'}>
          → {advisor.actionLabel}
        </button>
      ):advisor.hasAction&&advisor.actionLabel?(
        <div className={'mt-2 text-[10px] uppercase tracking-wider font-bold opacity-70 px-2 py-1 rounded border border-current inline-block'}>
          → {advisor.actionLabel}
        </div>
      ):null}
    </div>
  );
}


// ══════════════════════════════════════════════════
// V111 — IMPROVED LAYOUT COMPONENTS
// ══════════════════════════════════════════════════

// ── V111: ProjectionsCard with clickable timeframe tabs ──
function ProjectionsCard({analysis,mobileTab}){
  const[activeTimeframe,setActiveTimeframe]=React.useState('5m');
  const projections=analysis?.projections||[];
  const proj=projections.find(p=>p.id===activeTimeframe)||projections[0];
  const currentPrice=analysis?.currentPrice||proj?.price||0;
  const isUp=proj?(proj.price>=currentPrice):false;
  const arrowCls=isUp?'text-emerald-400':'text-rose-400';
  const arrow=isUp?'▲':'▼';
  const targetPrice=proj?proj.price:0;
  const conf=proj?Number(proj.conf||0):0;
  const tabs=[{id:'5m',label:'5 MIN'},{id:'15m',label:'15 MIN'},{id:'1h',label:'1 HOUR'}];

  return(
    <div className={'bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col relative '+(mobileTab!=='projections'?'hidden md:flex':'')}>
      <T2Stamp code="PROJ · 042"/>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className={'text-xs uppercase tracking-[0.22em] font-bold'} style={{color:T2_GOLD}}>Projections</span>
        {/* Tab nav */}
        <div className="flex gap-1">
          {tabs.map(t=>{
            const active=activeTimeframe===t.id;
            const cls='px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wide transition-all '+(active?'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/70 border border-transparent');
            return(<button key={t.id} onClick={()=>setActiveTimeframe(t.id)} className={cls}>{t.label}</button>);
          })}
        </div>
      </div>
      {/* Timeline display - shows future timestamps + predicted prices */}
      {!proj||!proj.timeline||proj.timeline.length===0?(
        <div className={'flex-1 flex items-center justify-center text-[#E8E9E4]/30 text-xs italic'}>Computing forecasts...</div>
      ):(
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          {/* Header showing window context */}
          <div className={'text-[10px] uppercase tracking-widest text-[#E8E9E4]/40 font-bold text-center pb-1 border-b border-[#E8E9E4]/10'}>
            {tabs.find(t=>t.id===activeTimeframe)?.label} forecast · From ${currentPrice.toLocaleString(undefined,{maximumFractionDigits:0})}
            {/* V145.2: show which model is producing the projection */}
            {proj.fgtSrc&&<span className={'ml-2 text-[9px] '+(proj.fgtSrc.includes('HPotter')?'text-indigo-400/70':'text-[#E8E9E4]/30')}>· {proj.fgtSrc}</span>}
          </div>
          {/* Timeline list - all future timestamps */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {proj.timeline.map((point,i)=>{
              const pUp=point.price>=currentPrice;
              const pCls=pUp?'text-emerald-400':'text-rose-400';
              const pArrow=pUp?'▲':'▼';
              const deltaBps=currentPrice>0?((point.price-currentPrice)/currentPrice)*10000:0;
              // Confidence decays with time - each step further out is less certain
              const stepConf=Math.max(15,conf-(i*4));
              // Visual confidence bar
              const barWidth=Math.min(100,Math.max(15,stepConf));
              const barCls=pUp?'bg-emerald-500/40':'bg-rose-500/40';
              // V149: dim extrapolated rows (beyond model horizon)
              const extraDim=point.extrapolated?'opacity-40':'';
              return(
                <div key={i} className={'p-2 rounded-lg bg-[#111312] border border-[#E8E9E4]/8 '+extraDim} title={point.extrapolated?'Beyond model forecast horizon — speculative':''}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={'text-[11px] font-mono font-bold text-[#E8E9E4]/70 shrink-0'}>{point.timeStr}</span>
                      <span className={pCls+' text-xs shrink-0'}>{pArrow}</span>
                      <span className="text-sm font-mono font-bold text-white truncate">${Number(point.price).toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                      {point.extrapolated&&<span className={'text-[8px] uppercase tracking-wider text-amber-400/80 shrink-0'}>extrap</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={pCls+' text-[10px] font-bold'}>{deltaBps>=0?'+':''}{deltaBps.toFixed(0)}bps</span>
                      <span className={'text-[9px] text-[#E8E9E4]/40'}>{stepConf.toFixed(0)}%</span>
                    </div>
                  </div>
                  {/* Confidence bar */}
                  <div className="h-0.5 bg-[#0E100F] rounded-full overflow-hidden mt-1">
                    <div className={'h-full '+barCls} style={{width:barWidth+'%'}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Quick view of all 3 timeframes */}
      <div className="grid grid-cols-3 gap-2 mt-3 shrink-0 border-t border-[#E8E9E4]/10 pt-3">
        {projections.map(p=>{
          const pUp=p.price>=currentPrice;
          const pCls=pUp?'text-emerald-400':'text-rose-400';
          const pArrow=pUp?'▲':'▼';
          const isActive=p.id===activeTimeframe;
          return(
            <button key={p.id} onClick={()=>setActiveTimeframe(p.id)}
              className={'p-1.5 rounded-lg border text-left transition-all '+(isActive?'bg-[#111312] border-indigo-500/30':'border-transparent hover:bg-[#111312]/50')}>
              <div className={'text-[9px] uppercase tracking-wide text-[#E8E9E4]/40 font-bold'}>{p.time}</div>
              <div className="text-xs font-mono font-bold text-white">${Number(p.price||0).toFixed(0)}</div>
              <div className="flex items-center gap-1">
                <span className={pCls+' text-[10px]'}>{pArrow}</span>
                <span className={'text-[9px] text-[#E8E9E4]/40'}>{Number(p.conf||0).toFixed(0)}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── V2.7: StatsView — analytics dashboard ──
//   Three drill levels:
//     1. Top stats grid + cohort cards (regime, session, FGT, quality buckets)
//     2. Hourly heatmap with Today / 7-day / All-time toggle
//     3. Click an hour → drill to individual trades for that hour
//   Plus an insights surface that pulls 3-5 actionable findings from the data.
//
//   Filters out PENDING-VERIFY trades (they aren't truly resolved yet).
function StatsView({tradeLog,scorecards,onClose}){
  const[tab,setTab]=React.useState('today'); // 'today' | 'week' | 'all'
  const[selectedHour,setSelectedHour]=React.useState(null);

  // Filter to resolved trades only
  const allResolved=(tradeLog||[]).filter(t=>t.result==='WIN'||t.result==='LOSS');

  // Time-filter
  const now=Date.now();
  const dayMs=24*60*60*1000;
  const trades=React.useMemo(()=>{
    if(tab==='today'){
      const todayStart=new Date(); todayStart.setHours(0,0,0,0);
      return allResolved.filter(t=>(t.id||0)>=todayStart.getTime());
    } else if(tab==='week'){
      return allResolved.filter(t=>(t.id||0)>=now-7*dayMs);
    }
    return allResolved;
  },[tab,allResolved]);

  const wins=trades.filter(t=>t.result==='WIN').length;
  const losses=trades.length-wins;
  const wr=trades.length>0?(wins/trades.length*100):0;

  // ── Hourly breakdown ──
  const hourly=React.useMemo(()=>{
    const buckets=Array.from({length:24},(_,i)=>({hour:i,wins:0,losses:0,trades:[]}));
    for(const t of trades){
      const h=t.hour!=null?t.hour:new Date(t.id||0).getUTCHours();
      if(h<0||h>23)continue;
      buckets[h].trades.push(t);
      if(t.result==='WIN')buckets[h].wins++;else buckets[h].losses++;
    }
    return buckets.map(b=>({...b,n:b.wins+b.losses,wr:b.wins+b.losses>0?(b.wins/(b.wins+b.losses))*100:null}));
  },[trades]);

  // ── Cohort breakdowns ──
  const cohort=(keyFn)=>{
    const buckets=new Map();
    for(const t of trades){
      const k=keyFn(t); if(k==null)continue;
      if(!buckets.has(k))buckets.set(k,{wins:0,losses:0});
      const b=buckets.get(k); if(t.result==='WIN')b.wins++;else b.losses++;
    }
    return [...buckets.entries()].map(([k,v])=>({key:k,wins:v.wins,losses:v.losses,n:v.wins+v.losses,wr:v.wins+v.losses>0?(v.wins/(v.wins+v.losses))*100:0})).sort((a,b)=>b.n-a.n);
  };

  const byDir=cohort(t=>t.dir);
  const byRegime=cohort(t=>t.regime);
  const bySession=cohort(t=>t.session);
  const byQuality=cohort(t=>{
    const q=t.qualityScore||0;
    if(q>=70)return 'High (70+)';
    if(q>=50)return 'Medium (50-69)';
    return 'Low (<50)';
  });
  const byFGT=cohort(t=>{
    const f=Math.abs(t.fgtAlignment||0);
    if(f>=4)return 'FGT 4/4';
    if(f>=3)return 'FGT 3/4';
    if(f>=2)return 'FGT 2/4';
    return 'FGT ≤1';
  });
  const byClockBucket=cohort(t=>{
    const c=t.clockAtLock||0; // for 15m windows: 900 = window start, 0 = window close in some implementations
    // clockAtLock is "seconds remaining" in this codebase, so high=early, low=late
    if(c>=720)return 'Early (first 3min)';
    if(c>=540)return 'Mid-early (3-6min)';
    if(c>=360)return 'Mid (6-9min)';
    if(c>=180)return 'Mid-late (9-12min)';
    return 'Late (12-15min)';
  });

  // ── Insights — auto-derive from cohorts ──
  const insights=React.useMemo(()=>{
    const out=[];
    if(trades.length<5)return [{kind:'note',text:`Only ${trades.length} resolved trades in this window — insights need ≥5 to be meaningful.`}];
    // Best regime
    const bestRegime=[...byRegime].filter(r=>r.n>=3).sort((a,b)=>b.wr-a.wr)[0];
    if(bestRegime&&bestRegime.wr>=60){
      out.push({kind:'positive',text:`Strongest regime: ${bestRegime.key} at ${bestRegime.wr.toFixed(0)}% (${bestRegime.wins}W-${bestRegime.losses}L).`});
    }
    // Worst regime
    const worstRegime=[...byRegime].filter(r=>r.n>=3).sort((a,b)=>a.wr-b.wr)[0];
    if(worstRegime&&worstRegime.wr<50&&bestRegime&&worstRegime.key!==bestRegime.key){
      out.push({kind:'negative',text:`Weakest regime: ${worstRegime.key} at ${worstRegime.wr.toFixed(0)}% (${worstRegime.wins}W-${worstRegime.losses}L) — consider sitting out.`});
    }
    // Best hour
    const eligibleHours=hourly.filter(h=>h.n>=3);
    if(eligibleHours.length>0){
      const bestHour=[...eligibleHours].sort((a,b)=>b.wr-a.wr)[0];
      if(bestHour.wr>=70){
        out.push({kind:'positive',text:`Sharpest hour: ${String(bestHour.hour).padStart(2,'0')}:00 UTC at ${bestHour.wr.toFixed(0)}% (${bestHour.n} trades).`});
      }
    }
    // Quality gate effectiveness
    const highQ=byQuality.find(q=>q.key==='High (70+)');
    const lowQ=byQuality.find(q=>q.key==='Low (<50)');
    if(highQ&&lowQ&&highQ.n>=3&&lowQ.n>=3){
      const diff=highQ.wr-lowQ.wr;
      if(diff>=15){
        out.push({kind:'positive',text:`Quality gate is working: high-quality trades (${highQ.wr.toFixed(0)}%) outperform low-quality (${lowQ.wr.toFixed(0)}%) by ${diff.toFixed(0)} points.`});
      } else if(diff<5){
        out.push({kind:'note',text:`Quality gate doesn't seem to discriminate: high (${highQ.wr.toFixed(0)}%) vs low (${lowQ.wr.toFixed(0)}%) only ${Math.abs(diff).toFixed(0)} points apart.`});
      }
    }
    // FGT alignment
    const fgt4=byFGT.find(f=>f.key==='FGT 4/4');
    if(fgt4&&fgt4.n>=3&&fgt4.wr>=70){
      out.push({kind:'positive',text:`FGT 4/4 alignment is highly reliable: ${fgt4.wr.toFixed(0)}% (${fgt4.n} trades).`});
    }
    // UP vs DOWN bias
    const upStat=byDir.find(d=>d.key==='UP');
    const dnStat=byDir.find(d=>d.key==='DOWN');
    if(upStat&&dnStat&&upStat.n>=5&&dnStat.n>=5){
      const upRatio=upStat.n/(upStat.n+dnStat.n);
      if(upRatio>=0.7){
        out.push({kind:'note',text:`Direction bias: ${(upRatio*100).toFixed(0)}% of locks were UP. May be a real bias in current regime, or training drift.`});
      } else if(upRatio<=0.3){
        out.push({kind:'note',text:`Direction bias: ${(100-upRatio*100).toFixed(0)}% of locks were DOWN. May be a real bias in current regime, or training drift.`});
      }
    }
    // Lock timing
    const earlyLocks=byClockBucket.find(c=>c.key==='Early (first 3min)');
    const lateLocks=byClockBucket.find(c=>c.key==='Late (12-15min)');
    if(earlyLocks&&lateLocks&&earlyLocks.n>=3&&lateLocks.n>=3){
      const diff=earlyLocks.wr-lateLocks.wr;
      if(Math.abs(diff)>=15){
        const better=diff>0?'early':'late';
        out.push({kind:'positive',text:`Lock timing matters: ${better} locks win ${Math.abs(diff).toFixed(0)} points more than ${better==='early'?'late':'early'} locks.`});
      }
    }
    if(out.length===0)out.push({kind:'note',text:`No strong signal in current data. ${trades.length} trades may not be enough — let it accumulate.`});
    return out;
  },[trades,byRegime,hourly,byQuality,byFGT,byDir,byClockBucket]);

  // ── Heatmap cell color helper ──
  const cellColor=(wr,n)=>{
    if(wr==null||n===0)return {bg:'rgba(232,233,228,0.04)',border:'rgba(232,233,228,0.08)',color:'rgba(232,233,228,0.3)'};
    if(wr>=70)return {bg:'rgba(110,231,183,0.10)',border:'rgba(110,231,183,0.30)',color:'#6ee7b7'};
    if(wr>=55)return {bg:'rgba(110,231,183,0.06)',border:'rgba(110,231,183,0.18)',color:'rgba(110,231,183,0.85)'};
    if(wr>=45)return {bg:'rgba(232,233,228,0.04)',border:'rgba(232,233,228,0.10)',color:'rgba(232,233,228,0.6)'};
    if(wr>=30)return {bg:'rgba(201,125,74,0.10)',border:'rgba(201,125,74,0.30)',color:'#C97D4A'};
    return {bg:'rgba(248,113,113,0.10)',border:'rgba(248,113,113,0.30)',color:'#f87171'};
  };

  // ── Selected-hour drill view ──
  const drillTrades=selectedHour!=null?(hourly[selectedHour]?.trades||[]).slice().sort((a,b)=>b.id-a.id):null;

  return(
    <div className="fixed inset-0 z-50 bg-[#0E100F]/95 backdrop-blur-md overflow-y-auto" onClick={(e)=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="max-w-[1200px] mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-[0.18em]" style={{color:T2_GOLD}}>Performance</span>
              <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">Tara analytics</span>
            </div>
            <h2 className="font-serif text-3xl text-white tracking-tight">Stats <span style={{color:T2_GOLD}}>·</span> Insights</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#E8E9E4]/5 text-[#E8E9E4]/60 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg bg-[#181A19] w-fit border border-[#E8E9E4]/8">
          {['today','week','all'].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setSelectedHour(null);}} className={'px-4 py-1.5 text-xs uppercase font-bold tracking-wider rounded-md transition-colors '+(tab===t?'':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/70')} style={tab===t?{background:T2_GOLD_GLOW,color:T2_GOLD,border:'0.5px solid '+T2_GOLD_BORDER}:{}}>
              {t==='today'?'Today':t==='week'?'7 Days':'All Time'}
            </button>
          ))}
        </div>

        {/* Top stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
          <div className="bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3 sm:p-4 relative">
            <T2Stamp code="ALL · 001"/>
            <div className="text-[9px] uppercase tracking-[0.18em] text-[#E8E9E4]/40 font-bold mb-1.5">Trades</div>
            <div className="text-2xl sm:text-3xl font-bold text-white" style={T2_MONO_STYLE}>{trades.length}</div>
            <div className="text-[10px] text-[#E8E9E4]/35 mt-0.5">resolved</div>
          </div>
          <div className="bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3 sm:p-4 relative">
            <T2Stamp code="ACC · 002"/>
            <div className="text-[9px] uppercase tracking-[0.18em] text-[#E8E9E4]/40 font-bold mb-1.5">Accuracy</div>
            <div className={'text-2xl sm:text-3xl font-bold '+(wr>=60?'text-emerald-400':wr>=50?'text-white':'text-rose-400')} style={T2_MONO_STYLE}>{trades.length>0?wr.toFixed(0):'—'}%</div>
            <div className="text-[10px] text-[#E8E9E4]/35 mt-0.5">{wins}W · {losses}L</div>
          </div>
          <div className="bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3 sm:p-4 relative">
            <T2Stamp code="STR · 003"/>
            <div className="text-[9px] uppercase tracking-[0.18em] text-[#E8E9E4]/40 font-bold mb-1.5">Streak</div>
            <div className="text-2xl sm:text-3xl font-bold text-white" style={T2_MONO_STYLE}>{(()=>{
              if(trades.length===0)return '—';
              const sorted=[...trades].sort((a,b)=>b.id-a.id);
              const lastResult=sorted[0]?.result;let streak=0;
              for(const t of sorted){if(t.result===lastResult)streak++;else break;}
              return streak;
            })()}</div>
            <div className="text-[10px] mt-0.5" style={{color:trades.length>0&&[...trades].sort((a,b)=>b.id-a.id)[0]?.result==='WIN'?'#6ee7b7':'#f87171'}}>{trades.length>0?[...trades].sort((a,b)=>b.id-a.id)[0]?.result.toLowerCase():''}</div>
          </div>
          <div className="bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3 sm:p-4 relative">
            <T2Stamp code="LIFE · 004"/>
            <div className="text-[9px] uppercase tracking-[0.18em] text-[#E8E9E4]/40 font-bold mb-1.5">Lifetime</div>
            <div className="text-2xl sm:text-3xl font-bold text-white" style={T2_MONO_STYLE}>{((scorecards?.['15m']?.wins||0)/Math.max(1,(scorecards?.['15m']?.wins||0)+(scorecards?.['15m']?.losses||0))*100).toFixed(0)}%</div>
            <div className="text-[10px] text-[#E8E9E4]/35 mt-0.5">{scorecards?.['15m']?.wins||0}W · {scorecards?.['15m']?.losses||0}L</div>
          </div>
        </div>

        {/* Insights surface */}
        <div className="bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-4 sm:p-5 mb-5 relative">
          <T2Stamp code="INS · 005"/>
          <div className="text-xs uppercase tracking-[0.22em] font-bold mb-3" style={{color:T2_GOLD}}>Insights</div>
          <div className="space-y-2">
            {insights.map((i,idx)=>{
              const color=i.kind==='positive'?'#6ee7b7':i.kind==='negative'?T2_COPPER:'rgba(232,233,228,0.7)';
              const dot=i.kind==='positive'?'#6ee7b7':i.kind==='negative'?T2_COPPER:T2_GOLD;
              return(
                <div key={idx} className="flex items-start gap-3 p-2 rounded-md bg-[#0E100F]/40 border border-[#E8E9E4]/4">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{background:dot}}></span>
                  <span className="text-[12px] sm:text-[13px] leading-relaxed" style={{color}}>{i.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly heatmap */}
        <div className="bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-4 sm:p-5 mb-5 relative">
          <T2Stamp code="HOUR · 006"/>
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-xs uppercase tracking-[0.22em] font-bold" style={{color:T2_GOLD}}>Hourly Breakdown <span className="text-[10px] tracking-wider text-[#E8E9E4]/30 ml-1 font-normal normal-case">UTC · tap to drill</span></div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {hourly.map(h=>{
              const c=cellColor(h.wr,h.n);
              const sel=selectedHour===h.hour;
              return(
                <button key={h.hour} onClick={()=>{if(h.n>0)setSelectedHour(sel?null:h.hour);}} disabled={h.n===0} className={'p-2 sm:p-3 rounded-md text-center transition-all '+(h.n>0?'cursor-pointer hover:opacity-80':'cursor-default')} style={{background:sel?T2_GOLD_GLOW:c.bg,border:'0.5px solid '+(sel?T2_GOLD_BORDER:c.border),color:sel?T2_GOLD:c.color}}>
                  <div className="text-[9px] sm:text-[10px] font-medium opacity-70 mb-0.5">{String(h.hour).padStart(2,'0')}:00</div>
                  <div className="text-base sm:text-lg font-bold" style={T2_MONO_STYLE}>{h.wr!=null?h.wr.toFixed(0)+'%':'—'}</div>
                  <div className="text-[9px] opacity-50 mt-0.5">{h.n>0?h.wins+'/'+h.n:''}</div>
                </button>
              );
            })}
          </div>
          {/* Drill-down for selected hour */}
          {selectedHour!=null&&drillTrades&&drillTrades.length>0&&(
            <div className="mt-4 pt-4" style={{borderTop:'1px solid '+T2_GOLD_GLOW}}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold" style={{color:T2_GOLD}}>{String(selectedHour).padStart(2,'0')}:00 UTC</span>
                <span className="text-[11px] text-[#E8E9E4]/50">·</span>
                <span className="text-[11px] text-[#E8E9E4]/70">{hourly[selectedHour].wins}/{hourly[selectedHour].n} = {hourly[selectedHour].wr.toFixed(0)}%</span>
              </div>
              <div className="space-y-1">
                {drillTrades.slice(0,12).map((t,i)=>{
                  const ts=new Date(t.id).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
                  const isWin=t.result==='WIN';
                  const dirCol=t.dir==='UP'?'text-emerald-400':'text-rose-400';
                  const resCol=isWin?'text-emerald-400':'text-rose-400';
                  const fgtAbs=Math.abs(t.fgtAlignment||0);
                  return(
                    <div key={i} className="flex items-center gap-2 sm:gap-3 px-2 py-1.5 rounded text-[11px] hover:bg-[#0E100F]/40">
                      <span className="text-[#E8E9E4]/50 w-16 shrink-0" style={T2_MONO_STYLE}>{ts}</span>
                      <span className={'font-bold w-12 shrink-0 '+dirCol}>{t.dir}</span>
                      <span className="text-[#E8E9E4]/40 w-24 sm:w-28 truncate hidden sm:block">{t.regime}</span>
                      <span className="text-[#E8E9E4]/40 w-12 hidden sm:block" style={T2_MONO_STYLE}>{t.posterior?.toFixed(0)}%</span>
                      <span className="text-[#E8E9E4]/40 w-14 hidden md:block" style={T2_MONO_STYLE}>FGT {fgtAbs}/4</span>
                      <span className="text-[#E8E9E4]/40 w-12 hidden md:block" style={T2_MONO_STYLE}>Q{t.qualityScore?.toFixed(0)||'—'}</span>
                      <span className={'text-[#E8E9E4]/40 w-16 ml-auto sm:ml-0'} style={T2_MONO_STYLE}>{t.closingGapBps>=0?'+':''}{t.closingGapBps?.toFixed(1)}bps</span>
                      <span className={'font-bold w-12 shrink-0 text-right '+resCol}>{t.result}</span>
                    </div>
                  );
                })}
                {drillTrades.length>12&&<div className="text-[10px] text-[#E8E9E4]/30 px-2 py-1">+ {drillTrades.length-12} more not shown</div>}
              </div>
            </div>
          )}
        </div>

        {/* Cohort breakdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <CohortCard title="By Direction" stamp="DIR · 007" rows={byDir}/>
          <CohortCard title="By Regime" stamp="REG · 008" rows={byRegime}/>
          <CohortCard title="By Quality" stamp="QLT · 009" rows={byQuality}/>
          <CohortCard title="By FGT Alignment" stamp="FGT · 010" rows={byFGT}/>
          <CohortCard title="By Session" stamp="SES · 011" rows={bySession}/>
          <CohortCard title="By Lock Timing" stamp="TIM · 012" rows={byClockBucket}/>
        </div>

        {trades.length===0&&(
          <div className="text-center py-8 text-[#E8E9E4]/40 text-sm">No resolved trades in this time window.</div>
        )}
      </div>
    </div>
  );
}

// Cohort row card — used inside StatsView
function CohortCard({title,stamp,rows}){
  return(
    <div className="bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3 sm:p-4 relative">
      <T2Stamp code={stamp}/>
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3" style={{color:T2_GOLD}}>{title}</div>
      {rows.length===0&&<div className="text-[11px] text-[#E8E9E4]/30 italic">No data</div>}
      {rows.map(r=>{
        const wr=r.wr;
        const barColor=wr>=60?'#6ee7b7':wr>=50?'rgba(110,231,183,0.5)':wr>=40?T2_COPPER:'#f87171';
        return(
          <div key={r.key} className="flex items-center gap-2 mb-1.5 last:mb-0 text-[11px]">
            <span className="text-[#E8E9E4]/65 w-32 sm:w-40 shrink-0 truncate">{r.key}</span>
            <div className="flex-1 h-2 rounded-sm bg-black/30 relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#E8E9E4]/15"></div>
              <div className="absolute top-0 bottom-0 left-0 transition-all duration-500" style={{width:Math.max(2,wr)+'%',background:barColor}}></div>
            </div>
            <span className="w-9 text-right font-bold shrink-0" style={{color:barColor,...T2_MONO_STYLE}}>{wr.toFixed(0)}%</span>
            <span className="w-12 text-right text-[#E8E9E4]/30 shrink-0 hidden sm:inline" style={T2_MONO_STYLE}>{r.wins}/{r.n}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── V3.1: TapeStrip ──
//   Sliding-window buy/sell pressure across 5s, 15s, 30s, 60s windows.
//   Shows users whether buying or selling pressure is accelerating or fading,
//   not just the current state.
//
//   Reading the strip:
//     - Bar fills from buy-USD side toward sell-USD side, percentage shows dominant share
//     - Four windows below let you see the trajectory:
//       * 5s rising vs 60s = buying ACCELERATING (top-of-move signal)
//       * 5s falling vs 60s = buying FADING (potential reversal)
//       * All four similar = stable pressure
//
//   V3.1.5: Per-window volume floors. Below these thresholds the percentage is replaced
//   with "—" because the reading would be misleading (single $200K print can flip a $30K
//   window from 50% to 90%). Floors:
//     5s ≥ $50K, 15s ≥ $100K, 30s ≥ $200K, 60s ≥ $400K
//   When the headline 30s window is below floor, the whole strip shows "TAPE THIN" instead
//   of confident percentages. Trend indicator only computes when at least 3 windows clear
//   their floors — otherwise we'd be inferring acceleration from noise.
const TAPE_FLOORS={w5:50000,w15:100000,w30:200000,w60:400000};

function TapeStrip({tapeWindows}){
  if(!tapeWindows)return null;
  const w5=tapeWindows.w5||{},w15=tapeWindows.w15||{},w30=tapeWindows.w30||{},w60=tapeWindows.w60||{};
  // Use 30s as the headline bar
  const hl=w30;
  const hlBuys=hl.buys||0,hlSells=hl.sells||0;
  const hlTotal=hlBuys+hlSells;
  const hlBuyPct=hlTotal>0?(hlBuys/hlTotal)*100:50;
  const dominant=hlBuyPct>=50?'BUY':'SELL';
  const dominantPct=Math.max(hlBuyPct,100-hlBuyPct);
  const hlAboveFloor=hlTotal>=TAPE_FLOORS.w30;
  const fmtUSD=(n)=>{
    const v=Math.round(n);
    if(v>=1e6)return '$'+(v/1e6).toFixed(1)+'M';
    if(v>=1e3)return '$'+(v/1e3).toFixed(0)+'K';
    return '$'+v;
  };
  const buyColor='#6ee7b7';
  const sellColor='#f87171';
  // Trend indicator — only compute when the headline window AND at least 2 others
  // are above their floors. Otherwise we're inferring acceleration from noise.
  const _trend=(()=>{
    if(!hlAboveFloor)return null;
    const validWindows=[
      {pct:w60.buyPct,total:(w60.buys||0)+(w60.sells||0),floor:TAPE_FLOORS.w60},
      {pct:w30.buyPct,total:(w30.buys||0)+(w30.sells||0),floor:TAPE_FLOORS.w30},
      {pct:w15.buyPct,total:(w15.buys||0)+(w15.sells||0),floor:TAPE_FLOORS.w15},
      {pct:w5.buyPct,total:(w5.buys||0)+(w5.sells||0),floor:TAPE_FLOORS.w5},
    ].filter(w=>w.total>=w.floor&&w.pct!=null).map(w=>w.pct);
    if(validWindows.length<3)return null;
    const dir=validWindows[validWindows.length-1]-validWindows[0];
    if(Math.abs(dir)<8)return null;
    return dir>0?'rising':'falling';
  })();
  const trendLabel=_trend==='rising'?(dominant==='BUY'?'↑ accelerating buy':'↑ buy reversing'):
                  _trend==='falling'?(dominant==='BUY'?'↓ buy fading':'↓ accelerating sell'):
                  null;
  const renderWindow=(label,w,floor)=>{
    const pct=w.buyPct!=null?w.buyPct:50;
    const total=(w.buys||0)+(w.sells||0);
    const aboveFloor=total>=floor;
    const isBuy=pct>=50;
    const color=!aboveFloor?'rgba(232,233,228,0.30)':isBuy?buyColor:sellColor;
    const display=Math.max(pct,100-pct);
    return(
      <div className="flex flex-col items-center" key={label}>
        <div className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/35 font-medium mb-0.5">{label}</div>
        <div className="text-base sm:text-lg font-bold tabular-nums" style={{color,letterSpacing:'-0.01em'}}>{!aboveFloor?'—':display.toFixed(1)+'%'}</div>
      </div>
    );
  };
  return(
    <div className="bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3 sm:p-4 relative">
      <T2Stamp code="TAPE · 030"/>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#E8E9E4]/50 font-bold">Tape</span>
        {!hlAboveFloor?(
          <span className="text-[10px] font-medium tracking-wider text-[#E8E9E4]/40 uppercase">Tape thin · {fmtUSD(hlTotal)} / 30s</span>
        ):trendLabel&&(
          <span className="text-[10px] font-medium" style={{color:_trend==='rising'?(dominant==='BUY'?buyColor:sellColor):(dominant==='BUY'?sellColor:buyColor),letterSpacing:'0.04em'}}>{trendLabel}</span>
        )}
      </div>
      {/* Headline bar with USD endpoints + percentage in middle */}
      <div className="relative mb-1">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-bold tabular-nums" style={{color:hlAboveFloor&&hlBuyPct>=50?buyColor:'rgba(232,233,228,0.40)',letterSpacing:'-0.01em'}}>BUY {fmtUSD(hlBuys)}</span>
          <span className="font-bold tabular-nums" style={{color:hlAboveFloor?'rgba(232,233,228,0.95)':'rgba(232,233,228,0.30)',letterSpacing:'-0.01em'}}>{!hlAboveFloor?'—':dominantPct.toFixed(1)+'%'}</span>
          <span className="font-bold tabular-nums" style={{color:hlAboveFloor&&hlBuyPct<50?sellColor:'rgba(232,233,228,0.40)',letterSpacing:'-0.01em'}}>SELL {fmtUSD(hlSells)}</span>
        </div>
        <div className="relative h-1.5 rounded-sm bg-black/40 overflow-hidden">
          {hlAboveFloor?(
            <>
              <div className="absolute top-0 bottom-0 left-0 transition-all duration-500" style={{width:hlBuyPct.toFixed(1)+'%',background:buyColor,opacity:0.85}}></div>
              <div className="absolute top-0 bottom-0 right-0 transition-all duration-500" style={{width:(100-hlBuyPct).toFixed(1)+'%',background:sellColor,opacity:0.85}}></div>
            </>
          ):(
            <div className="absolute top-0 bottom-0 left-0 right-0" style={{background:'rgba(232,233,228,0.08)'}}></div>
          )}
        </div>
      </div>
      {/* Four-window strip */}
      <div className="grid grid-cols-4 gap-2 mt-2">
        {renderWindow('5s',w5,TAPE_FLOORS.w5)}
        {renderWindow('15s',w15,TAPE_FLOORS.w15)}
        {renderWindow('30s',w30,TAPE_FLOORS.w30)}
        {renderWindow('60s',w60,TAPE_FLOORS.w60)}
      </div>
    </div>
  );
}

// ── V111: NewsFeedCard - external events affecting BTC price ──
function NewsFeedCard(){
  const[news,setNews]=React.useState([]);
  const[loading,setLoading]=React.useState(true);
  const[err,setErr]=React.useState(null);
  // V134: also fetch macro event countdown — always shown even if news fails
  const[macroEvents,setMacroEvents]=React.useState([]);
  React.useEffect(()=>{
    const computeMacros=()=>{
      // Find next 3 upcoming macro events in next 8 hours
      const now=new Date();
      const upcoming=[];
      for(let h=0;h<8&&upcoming.length<3;h++){
        const t=new Date(now.getTime()+h*3600000);
        const ms=getMacroEventState(t);
        if(ms.state!=='CLEAR'&&ms.event){
          if(!upcoming.find(u=>u.name===ms.event.name)){
            upcoming.push({...ms.event,minutesUntil:Math.round((t.getTime()-now.getTime())/60000)});
          }
        }
      }
      // Also find any state RIGHT NOW
      const nowState=getMacroEventState(now);
      if(nowState.event&&!upcoming.find(u=>u.name===nowState.event.name)){
        upcoming.unshift({...nowState.event,minutesUntil:nowState.minutesUntil,state:nowState.state});
      }
      setMacroEvents(upcoming);
    };
    computeMacros();
    const macroIv=setInterval(computeMacros,60000);
    
    const fetchNews=async()=>{
      // V134: Try multiple sources with timeout and fallback
      const tryFetch=async(url,timeoutMs=5000)=>{
        const ctrl=new AbortController();
        const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
        try{
          const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});
          clearTimeout(timer);
          if(!r.ok)throw new Error(`HTTP ${r.status}`);
          return await r.json();
        }catch(e){clearTimeout(timer);throw e;}
      };
      // Source 1: CryptoCompare
      try{
        const d=await tryFetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC');
        if(d?.Data?.length>0){
          const items=d.Data.slice(0,15).map(n=>({
            title:n.title,
            source:n.source_info?.name||n.source||'News',
            url:n.url,
            time:n.published_on*1000,
            categories:(n.categories||'').split('|').filter(Boolean)
          }));
          setNews(items);
          setErr(null);
          setLoading(false);
          return;
        }
      }catch(e){/* fallback */}
      // Source 2: CoinGecko status updates (free, no key, returns BTC-related items)
      try{
        const d=await tryFetch('https://api.coingecko.com/api/v3/status_updates?category=general&per_page=15');
        if(d?.status_updates?.length>0){
          const items=d.status_updates.slice(0,15).map(n=>({
            title:n.description||n.user_title||'Update',
            source:n.user||'CoinGecko',
            url:n.project?.id?`https://www.coingecko.com/coins/${n.project.id}`:'#',
            time:new Date(n.created_at).getTime(),
            categories:[n.category||'general']
          }));
          setNews(items);
          setErr(null);
          setLoading(false);
          return;
        }
      }catch(e){/* fallback */}
      // Both failed
      setErr('All news sources unavailable');
      setLoading(false);
    };
    fetchNews();
    const iv=setInterval(fetchNews,30000); // V134: 30s polling
    return()=>{clearInterval(iv);clearInterval(macroIv);};
  },[]);

  const formatAge=(ts)=>{
    const s=Math.floor((Date.now()-ts)/1000);
    if(s<60)return s+'s ago';
    if(s<3600)return Math.floor(s/60)+'m ago';
    if(s<86400)return Math.floor(s/3600)+'h ago';
    return Math.floor(s/86400)+'d ago';
  };

  // Detect potentially impactful keywords for highlighting
  const isHot=(title)=>{
    const hot=['trump','biden','sec','regulation','crash','surge','etf','approve','hack','exploit','liquidat','squeeze','rally','dump','breaking'];
    const lower=title.toLowerCase();
    return hot.some(kw=>lower.includes(kw));
  };

  return(
    <div className="shrink-0">
      <div className={'flex items-center justify-between mb-2'}>
        <span className={'text-xs uppercase tracking-[0.2em] text-[#E8E9E4]/40 font-bold'}>News & Macro</span>
        <span className={'text-[9px] text-[#E8E9E4]/30 italic'}>{loading?'loading...':err?'macro only':'30s refresh'}</span>
      </div>
      {/* V134: Macro events countdown - always shown */}
      {macroEvents.length>0&&(
        <div className="mb-2 space-y-1">
          <div className={'text-[9px] uppercase tracking-wide text-amber-400/70 font-bold'}>Upcoming Macro</div>
          {macroEvents.map((e,i)=>{
            const isImminent=Math.abs(e.minutesUntil)<=15;
            const isNow=e.minutesUntil<=0&&Math.abs(e.minutesUntil)<=2;
            const cls=isNow?'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse':isImminent?'bg-amber-500/10 border-amber-500/30 text-amber-300':'bg-[#111312] border-[#E8E9E4]/8 text-[#E8E9E4]/60';
            const label=e.minutesUntil>0?`in ${e.minutesUntil}m`:`${Math.abs(e.minutesUntil)}m ago`;
            return(<div key={i} className={'p-1.5 rounded border text-[10px] flex justify-between '+cls}>
              <span className="font-bold">{e.name}</span>
              <span>{label} · {e.impact}</span>
            </div>);
          })}
        </div>
      )}
      <div className="max-h-32 overflow-y-auto space-y-1.5">
        {loading?(
          <div className={'text-[10px] text-[#E8E9E4]/30 italic'}>Loading market news...</div>
        ):err&&news.length===0?(
          <div className={'text-[10px] text-amber-400/60 italic p-1.5 rounded bg-amber-500/5 border border-amber-500/15'}>News fetch unavailable ({err}). Macro countdown above stays active.</div>
        ):news.length===0?(
          <div className={'text-[10px] text-[#E8E9E4]/30 italic'}>No news available</div>
        ):news.map((n,i)=>{
          const hot=isHot(n.title);
          const cls=hot?'p-1.5 rounded bg-amber-500/10 border border-amber-500/20':'p-1.5 rounded hover:bg-[#111312]/50 border border-transparent';
          return(
            <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className={'block '+cls}>
              <div className={'text-[10px] leading-tight '+(hot?'text-amber-300 font-semibold':'text-[#E8E9E4]/70')}>
                {hot&&'🔥 '}{n.title.slice(0,90)}{n.title.length>90?'...':''}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={'text-[9px] text-[#E8E9E4]/40 uppercase'}>{n.source}</span>
                <span className={'text-[9px] text-[#E8E9E4]/30'}>· {formatAge(n.time)}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── V111: RightPanel - Engine Log + Live Feeds + News (col 3) ──
function RightPanel({analysis,tapeRef,whaleLog,bloomberg,currentPrice,mobileTab}){
  const reasoning=analysis?.reasoning||[];
  const tape=tapeRef?.current||{};
  const cb=tape.coinbase||{buys:0,sells:0};
  const bf=tape.binanceFutures||{buys:0,sells:0};
  const by=tape.bybit||{buys:0,sells:0};
  const totalBuys=cb.buys+bf.buys+by.buys;
  const totalSells=cb.sells+bf.sells+by.sells;
  const total=totalBuys+totalSells;
  const buyPct=total>0?(totalBuys/total)*100:50;
  const oi=bloomberg?.oiChange5m||0;
  const fr=(bloomberg?.fundingRate||0)*100;
  const ls=bloomberg?.longShortRatio||1;

  return(
    <div className={'bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col gap-3 md:col-span-2 lg:col-span-1 relative '+(mobileTab!=='logs'?'hidden md:flex':'')}>
      <T2Stamp code="SCR · 008"/>
      {/* V146.1 Fix B: Score Breakdown — per-signal contribution to current posterior */}
      <div className="shrink-0">
        <div className={'text-xs uppercase tracking-[0.22em] font-bold mb-2'} style={{color:T2_GOLD}}>Score Breakdown</div>
        {(()=>{
          const sig=analysis?.rawSignalScores||{};
          const mtf=analysis?.mtfAlignment;
          const post=analysis?.rawProbAbove||50;
          const dir=post>=50?'UP':'DOWN';
          // Total directional pull from each signal
          const entries=[
            {k:'gap',label:'Gap',v:sig.gap||0},
            {k:'mom',label:'Momentum',v:sig.momentum||0},
            {k:'str',label:'Structure',v:sig.structure||0},
            {k:'flow',label:'Flow',v:sig.flow||0},
            {k:'tech',label:'Technical',v:sig.technical||0},
            {k:'reg',label:'Regime',v:sig.regime||0},
            {k:'rng',label:'Range Pos',v:sig.rangePosition||0},
          ];
          // FGT effective contribution: 4/4=±30, 3/4=±18, 2/4=±8 (V136 calibration)
          const fgtAbs=Math.abs(mtf||0);
          const fgtContribution=mtf!=null?(fgtAbs>=4?30:fgtAbs>=3?18:fgtAbs>=2?8:0)*Math.sign(mtf):0;
          const totalAll=entries.reduce((s,e)=>s+e.v,0)+fgtContribution;
          // Render rows
          const maxAbs=Math.max(8,...entries.map(e=>Math.abs(e.v)),Math.abs(fgtContribution));
          const colorFor=v=>v>0.5?'bg-emerald-400/70':v<-0.5?'bg-rose-400/70':'bg-[#E8E9E4]/15';
          return(
            <div className="space-y-1">
              {entries.map(e=>(
                <div key={e.k} className="flex items-center gap-2 text-[10px]">
                  <span className={'text-[#E8E9E4]/50 w-16 shrink-0'}>{e.label}</span>
                  <div className="flex-1 relative h-3 bg-[#111312] rounded-sm overflow-hidden">
                    {/* center line at 50% */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#E8E9E4]/20"></div>
                    {/* bar */}
                    <div className={'absolute top-0 bottom-0 '+colorFor(e.v)} style={{
                      left:e.v>=0?'50%':`calc(50% - ${(Math.abs(e.v)/maxAbs)*50}%)`,
                      width:`${(Math.abs(e.v)/maxAbs)*50}%`,
                    }}></div>
                  </div>
                  <span className={'font-mono text-[10px] w-10 shrink-0 text-right '+(e.v>0.5?'text-emerald-300':e.v<-0.5?'text-rose-300':'text-[#E8E9E4]/30')}>{e.v>=0?'+':''}{e.v.toFixed(0)}</span>
                </div>
              ))}
              {/* FGT row — primary signal, separated with gold-tinted divider (V2.1) */}
              <div className="flex items-center gap-2 text-[10px] pt-1.5 mt-0.5" style={{borderTop:'1px solid '+T2_GOLD_GLOW}}>
                <span className={'text-purple-300 w-16 shrink-0 font-bold'}>FGT {fgtAbs}/4</span>
                <div className="flex-1 relative h-3 bg-[#111312] rounded-sm overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#E8E9E4]/20"></div>
                  <div className={'absolute top-0 bottom-0 '+(fgtContribution>0?'bg-emerald-400':fgtContribution<0?'bg-rose-400':'bg-[#E8E9E4]/15')} style={{
                    left:fgtContribution>=0?'50%':`calc(50% - ${(Math.abs(fgtContribution)/maxAbs)*50}%)`,
                    width:`${(Math.abs(fgtContribution)/maxAbs)*50}%`,
                  }}></div>
                </div>
                <span style={T2_MONO_STYLE} className={'text-[10px] w-10 shrink-0 text-right font-bold '+(fgtContribution>0?'text-emerald-300':fgtContribution<0?'text-rose-300':'text-[#E8E9E4]/30')}>{fgtContribution>=0?'+':''}{fgtContribution.toFixed(0)}</span>
              </div>
              {/* Total row with gold accent divider above (V2.1 — major boundary) */}
              <div className="flex items-center gap-2 text-[10px] pt-1.5 mt-1" style={{borderTop:'1px solid '+T2_GOLD_BORDER}}>
                <span className="w-16 shrink-0 font-bold uppercase tracking-[0.18em] text-[8px]" style={{color:T2_GOLD}}>Total</span>
                <span style={T2_MONO_STYLE} className={'flex-1 text-[#E8E9E4]/40'}>→ posterior {post.toFixed(0)}% {dir}</span>
                <span style={T2_MONO_STYLE} className={'w-10 text-right font-bold '+(totalAll>0?'text-emerald-400':'text-rose-400')}>{totalAll>=0?'+':''}{totalAll.toFixed(0)}</span>
              </div>
            </div>
          );
        })()}
      </div>
      {/* Engine Log - flexible, fills available space */}
      <div className="flex-1 min-h-[120px] flex flex-col pt-3" style={{borderTop:'1px solid '+T2_GOLD_GLOW}}>
        <div className={'text-xs uppercase tracking-[0.22em] font-bold mb-2 shrink-0'} style={{color:T2_GOLD}}>Engine Log</div>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1 text-[10px] font-mono">
          {reasoning.length===0?(
            <div className={'text-[#E8E9E4]/30 italic'}>Waiting for signals...</div>
          ):reasoning.slice(0,20).map((r,i)=>{
            const tag=(r.match(/^\[(\w+)\]/)||[])[1]||'';
            const tagCls={GAP:'text-amber-400',MOMENTUM:'text-indigo-400',STRUCTURE:'text-purple-400',FLOW:'text-emerald-400',TECHNICAL:'text-cyan-400',REGIME:'text-rose-400',CAP:'text-orange-400',MEMORY:'text-pink-400',CAL:'text-blue-400',TIME:'text-yellow-400',ATR:'text-teal-400'}[tag]||'text-[#E8E9E4]/40';
            const text=r.replace(/^\[(\w+)\]\s*/,'');
            return(
              <div key={i} className="flex gap-1.5">
                {tag&&<span className={tagCls+' font-bold shrink-0'}>[{tag}]</span>}
                <span className={'text-[#E8E9E4]/60 break-all'}>{text}</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Live Feeds metrics */}
      <div className="shrink-0 pt-3" style={{borderTop:'1px solid '+T2_GOLD_GLOW}}>
        <div className={'text-xs uppercase tracking-[0.22em] font-bold mb-2'} style={{color:T2_GOLD}}>Live Feeds</div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className={'p-1.5 rounded bg-[#111312]'}>
            <div className={'text-[9px] uppercase text-[#E8E9E4]/40 font-bold'}>Buy Flow</div>
            <div className="text-emerald-400 text-xs font-bold">{buyPct.toFixed(0)}%</div>
          </div>
          <div className={'p-1.5 rounded bg-[#111312]'}>
            <div className={'text-[9px] uppercase text-[#E8E9E4]/40 font-bold'}>OI 5m</div>
            <div className={'text-xs font-bold '+(oi>=0?'text-emerald-400':'text-rose-400')}>{oi>=0?'+':''}{oi.toFixed(2)}%</div>
          </div>
          <div className={'p-1.5 rounded bg-[#111312]'}>
            <div className={'text-[9px] uppercase text-[#E8E9E4]/40 font-bold'}>Funding</div>
            <div className={'text-xs font-bold '+(fr>=0?'text-emerald-400':'text-rose-400')}>{fr>=0?'+':''}{fr.toFixed(4)}%</div>
          </div>
          <div className={'p-1.5 rounded bg-[#111312]'}>
            <div className={'text-[9px] uppercase text-[#E8E9E4]/40 font-bold'}>L/S</div>
            <div className={'text-xs font-bold '+(ls>=1?'text-emerald-400':'text-rose-400')}>{ls.toFixed(2)}</div>
          </div>
        </div>
        {/* Recent whales */}
        <div className={'text-[9px] uppercase tracking-wide text-[#E8E9E4]/40 font-bold mb-1'}>Recent Whales ($100K+)</div>
        <div className="max-h-28 overflow-y-auto space-y-0.5 text-[10px] font-mono">
          {whaleLog.length===0?(
            <div className={'text-[#E8E9E4]/30 italic'}>No prints yet</div>
          ):whaleLog.slice(0,8).map((w,i)=>{
            const sideCls=w.side==='BUY'?'text-emerald-400':'text-rose-400';
            const t=new Date(w.time);
            const ts=t.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
            return(
              <div key={i} className="flex justify-between gap-1.5">
                <span className={'text-[#E8E9E4]/40 shrink-0'}>{ts}</span>
                <span className={sideCls+' font-bold shrink-0'}>{w.side}</span>
                <span className="text-white shrink-0">${(w.usd/1000).toFixed(0)}K</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* News Feed */}
      <div className="pt-3" style={{borderTop:'1px solid '+T2_GOLD_GLOW}}>
        <NewsFeedCard/>
      </div>
    </div>
  );
}

// ── V111: ChartBottomCard - TradingView at bottom, full width ──
function ChartBottomCard({mobileTab,resolution,setResolution}){
  return(
    <div className={'bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col '+(mobileTab!=='chart'?'hidden md:flex':'')}>
      <div className="flex justify-between items-center mb-2 shrink-0">
        <span className={'text-xs uppercase tracking-[0.2em] text-[#E8E9E4]/40 font-bold'}>Live Chart</span>
        <div className="flex gap-1">
          {['1m','5m','15m','1h'].map(r=>{
            const active=resolution===r;
            const cls='px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide '+(active?'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/70 border border-transparent');
            return(<button key={r} onClick={()=>setResolution(r)} className={cls}>{r}</button>);
          })}
        </div>
      </div>
      <div className="flex-1 min-h-[280px] sm:min-h-[360px] lg:min-h-[440px]">
        <TradingViewChart resolution={resolution} onResolutionChange={setResolution}/>
      </div>
    </div>
  );
}

// ── V111: MobileTabBar - 4 tabs: signal/projections/logs/chart ──
function MobileTabBar({mobileTab,setMobileTab}){
  const tabs=[
    {id:'signal',label:'SIGNAL'},
    {id:'projections',label:'TARGETS'},
    {id:'logs',label:'LOGS'},
    {id:'chart',label:'CHART'},
  ];
  return(
    <div className="md:hidden flex gap-1 mb-2 shrink-0">
      {tabs.map(t=>{
        const active=mobileTab===t.id;
        const cls='flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all '+(active?'bg-indigo-500/15 text-indigo-300 border-indigo-500/40':'text-[#E8E9E4]/40 border-[#E8E9E4]/10');
        return(<button key={t.id} onClick={()=>setMobileTab(t.id)} className={cls}>{t.label}</button>);
      })}
    </div>
  );
}



// ── V145: useNewsSentiment — dual-source scanner with geopolitics + macro coverage
//
// Sources:
//   1. CryptoCompare (BTC/Trading/Regulation feed)   — same as V114, with expanded keyword sets
//   2. GDELT 2.0 DOC API                             — global news, geopolitics, macro events
//
// Why both? CryptoCompare indexes crypto-focused stories well but misses non-crypto events that
// move BTC indirectly (war, sanctions, banking crises, central bank surprises). GDELT covers
// 30,000+ outlets in 65 languages with built-in tone scoring — perfect for catching the
// "Iran strikes" or "FOMC surprise" headline 60-90s earlier than crypto-specific feeds do.
//
// Mode: LIGHT (per user choice).
//   - Sentiment score still influences quality gate by ±5 to ±8 points (existing V114 logic).
//   - When a geopolitical/macro shock is detected (extreme keywords + recency < 30 min),
//     a small confidence haircut is applied via the `geoRisk` flag — but no full lockout.
//     Trader can still take the lock; Tara just expresses lower confidence.
const useNewsSentiment=()=>{
  const[sentiment,setSentiment]=React.useState({
    score:0,bullish:0,bearish:0,extreme:0,
    topHeadline:null,hasBreaking:false,
    geoRisk:0,             // V145: 0-1 scale of geopolitical/macro risk (last 30 min)
    geoTopic:null,         // V145: headline of the highest-risk story
    geoSource:null,        // V145: 'crypto' or 'gdelt'
  });
  React.useEffect(()=>{
    // ── KEYWORD BANKS ───────────────────────────────────────────────────
    // Directional (BTC-specific) keywords — affect sentiment.score
    const bullishKW=['surge','rally','approve','approval','etf approve','breakout','soar','spike up','all-time high','ath','adoption','inflows','accumulate','buy pressure','squeeze short','liquidat short','halving','institutional','spot etf'];
    const bearishKW=['crash','dump','sell-off','plunge','reject','denied','hack','exploit','liquidat long','outflow','sec sue','sec charge','ban','fud','correction','contagion','insolvent','bankruptcy','rug pull'];
    // Macro/policy keywords — these lift "extreme" but rarely directional on their own
    const macroKW=['fomc','cpi','fed rate','powell','rate hike','rate cut','jobs report','nonfarm payroll','treasury','yield','inflation','recession','jpow','jerome powell','ecb','bank of japan','boj'];
    // V145: Geopolitical keywords — events that historically move risk-on/risk-off including BTC
    const geoKW=['iran','israel','russia','ukraine','china','taiwan','war','strike','missile','attack','invade','sanction','ceasefire','escalat','tariff','trade war','north korea','venezuela','opec','oil shock'];
    // V145: Banking/financial-system shock keywords — these especially move BTC (often inverse first, then bid)
    const bankingKW=['bank run','bank fail','svb','signature bank','first republic','credit suisse','contagion','liquidity crisis','margin call','flash crash'];
    // V145: Trump/political action — frequent BTC mover, recency-sensitive
    const politicalKW=['trump','biden','executive order','impeach','indictment','election','sec chair','gensler','atkins'];
    // Time-sensitive markers
    const breakingKW=['breaking','flash','urgent','just in','alert','live update'];

    let cancelled=false;

    // ── SOURCE 1: CryptoCompare (BTC-focused) ──────────────────────────
    const fetchCryptoCompare=async()=>{
      try{
        const r=await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,Trading,Regulation');
        const d=await r.json();
        if(!d?.Data)return [];
        return d.Data.slice(0,20).map(n=>({
          title:n.title||'',
          time:(n.published_on||0)*1000,
          source:'crypto',
        }));
      }catch(e){return [];}
    };

    // ── SOURCE 2: GDELT 2.0 (global news, geopolitics) ─────────────────
    // Query: BTC OR (geopolitics + macro topics that move risk-on/risk-off)
    // Last 60 minutes, max 25 records, ArtList mode, JSON output
    const fetchGDELT=async()=>{
      try{
        const q=encodeURIComponent('(bitcoin OR btc OR crypto OR (federal reserve) OR (rate cut) OR (rate hike) OR cpi OR fomc OR sanctions OR (war risk) OR iran OR israel OR taiwan OR (banking crisis) OR (oil shock) OR (executive order)) sourcelang:eng');
        const url=`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=25&format=json&timespan=60min&sort=datedesc`;
        const r=await fetch(url,{cache:'no-store'});
        if(!r.ok)return [];
        const d=await r.json();
        if(!d?.articles)return [];
        return d.articles.map(a=>({
          title:a.title||'',
          // GDELT seendate: YYYYMMDDHHMMSS
          time:(()=>{
            const sd=a.seendate||'';
            if(sd.length<14)return Date.now()-3600000;
            const yr=parseInt(sd.slice(0,4),10);
            const mo=parseInt(sd.slice(4,6),10)-1;
            const dy=parseInt(sd.slice(6,8),10);
            const hr=parseInt(sd.slice(8,10),10);
            const mn=parseInt(sd.slice(10,12),10);
            const sc=parseInt(sd.slice(12,14),10);
            return Date.UTC(yr,mo,dy,hr,mn,sc);
          })(),
          source:'gdelt',
          tone:typeof a.tone==='number'?a.tone:null, // GDELT tone is -10..+10 typically
        }));
      }catch(e){return [];}
    };

    // ── COMBINE + SCORE ─────────────────────────────────────────────────
    const fetchAll=async()=>{
      const[cc,gd]=await Promise.all([fetchCryptoCompare(),fetchGDELT()]);
      if(cancelled)return;
      const items=[...cc,...gd];
      if(items.length===0)return;

      // Recency-decayed keyword scoring across all sources
      let bull=0,bear=0,extreme=0,topHeadline=null,topScore=0;
      let geoRisk=0,geoTopic=null,geoSource=null,geoTopScore=0;
      let hasBreaking=false;

      items.forEach(n=>{
        const t=(n.title||'').toLowerCase();
        if(!t)return;
        const ageMin=(Date.now()-n.time)/60000;
        if(ageMin>360||ageMin<0)return; // ignore >6h or future-dated

        // Directional decay: 6h half-life-ish
        const decay=Math.max(0.3,1-(ageMin/360));
        // Geo/macro decay: tighter, last 30 min counts most
        const geoDecay=ageMin<=30?Math.max(0.5,1-(ageMin/60)):Math.max(0.1,0.5-(ageMin-30)/300);

        let itemScore=0;
        bullishKW.forEach(kw=>{if(t.includes(kw)){bull+=decay;itemScore+=decay;}});
        bearishKW.forEach(kw=>{if(t.includes(kw)){bear+=decay;itemScore-=decay;}});
        macroKW.forEach(kw=>{if(t.includes(kw))extreme+=decay*0.5;});
        // Track top directional headline for display
        if(Math.abs(itemScore)>topScore){topScore=Math.abs(itemScore);topHeadline=n.title;}

        // V145: Geo/macro/banking/political — accumulate into geoRisk score
        let geoItemScore=0;
        geoKW.forEach(kw=>{if(t.includes(kw))geoItemScore+=geoDecay;});
        bankingKW.forEach(kw=>{if(t.includes(kw))geoItemScore+=geoDecay*1.5;});
        politicalKW.forEach(kw=>{if(t.includes(kw))geoItemScore+=geoDecay*0.7;});
        // Breaking-tag multiplier
        const isBreaking=breakingKW.some(kw=>t.includes(kw))||ageMin<=10;
        if(isBreaking&&geoItemScore>0)geoItemScore*=1.5;
        if(isBreaking&&ageMin<=10)hasBreaking=true;

        if(geoItemScore>geoTopScore){
          geoTopScore=geoItemScore;
          geoTopic=n.title;
          geoSource=n.source;
          geoRisk=Math.min(1,geoItemScore/3); // clamp 0-1
        }
      });

      setSentiment({
        score:bull-bear,bullish:bull,bearish:bear,extreme,
        topHeadline,hasBreaking,
        geoRisk,geoTopic,geoSource,
      });
    };

    fetchAll();
    // V145: Slightly slower than V134's 30s — GDELT can be sluggish, 45s is safer.
    //       CryptoCompare side still updates frequently enough for breaking news.
    const iv=setInterval(fetchAll,45000);
    return()=>{cancelled=true;clearInterval(iv);};
  },[]);
  return sentiment;
};


// V134: Plain-English summary builder — converts structured analysis into a sentence
const buildPlainEnglish=(analysis,qualityGate,advisor)=>{
  if(!analysis)return 'Connecting to market data...';
  const dir=analysis.prediction||'';
  const regime=analysis.regime||'';
  const reasoning=analysis.reasoning||[];
  // V136: FGT IS THE PRIMARY SIGNAL. Lead with it when 3/4 or 4/4 aligned.
  const mtfAlign=analysis.mtfAlignment;
  const mtfAbs=Math.abs(mtfAlign||0);
  const mtfDirText=mtfAlign>0?'UP':'DOWN';
  // Pull out the most informative tags
  const findTag=(prefix)=>reasoning.find(r=>r.startsWith('['+prefix+']'));
  const pieces=[];
  // Direction phrasing
  if(dir.includes('LOCKED')){
    const d=dir.includes('UP')?'UP':'DOWN';
    // V136: When FGT 4/4 aligns with the lock, lead with that as the rationale
    if(mtfAbs>=4&&((d==='UP'&&mtfAlign>0)||(d==='DOWN'&&mtfAlign<0))){
      pieces.push(`FGT 4/4 → ${d} · locked at ${(analysis.rawProbAbove||50).toFixed(0)}% conf`);
    } else if(mtfAbs>=3&&((d==='UP'&&mtfAlign>0)||(d==='DOWN'&&mtfAlign<0))){
      pieces.push(`FGT 3/4 → ${d} · locked at ${(analysis.rawProbAbove||50).toFixed(0)}% conf`);
    } else {
      pieces.push(`Locked ${d} (${(analysis.rawProbAbove||50).toFixed(0)}% conf)`);
    }
  } else if(dir.includes('FORMING')){
    const d=dir.includes('UP')?'UP':'DOWN';
    if(mtfAbs>=4&&((d==='UP'&&mtfAlign>0)||(d==='DOWN'&&mtfAlign<0))){
      pieces.push(`FGT 4/4 → ${d} · waiting for confirmation`);
    } else if(mtfAbs>=3&&((d==='UP'&&mtfAlign>0)||(d==='DOWN'&&mtfAlign<0))){
      pieces.push(`FGT 3/4 → ${d} · forming`);
    } else {
      pieces.push(`Leaning ${d}`);
    }
  } else if(dir.includes('SEARCHING')){
    // V136: Even in SEARCHING, surface FGT alignment if present
    if(mtfAbs>=4)pieces.push(`FGT 4/4 → ${mtfDirText} · waiting for posterior to align`);
    else if(mtfAbs>=3)pieces.push(`FGT 3/4 → ${mtfDirText} · scanning`);
    else pieces.push('No clear edge yet');
  } else if(dir.includes('ANALYZING')){
    const m=dir.match(/\[(\d+)s\]/);
    const secs=m?parseInt(m[1]):0;
    if(mtfAbs>=4)return `FGT 4/4 → ${mtfDirText} · committing in ~${secs}s`;
    if(mtfAbs>=3)return `FGT 3/4 → ${mtfDirText} · finalizing in ~${secs}s`;
    return `🔍 Searching for signal — decision within ${secs}s (sooner if FGT aligns)`;
  } else if(dir.includes('SITTING OUT')){
    return '⛔ Sitting out — signals are split, no clear edge this window';
  } else if(dir.includes('REJECTED')){
    // V3.1.4: REJECTED gets its own clean line — title is already shown in the hero,
    // this just gives the regime + driver context underneath without "in RANGE-CHOP" awkwardness.
    const reasonAfterDash=dir.split('—').slice(1).join('—').trim();
    const cleanReason=reasonAfterDash?reasonAfterDash.charAt(0).toUpperCase()+reasonAfterDash.slice(1):'mixed signals';
    return `${regime||'Mixed signals'} · ${cleanReason}`;
  } else if(dir.includes('BLACKOUT')||dir.includes('OBSERVE')||dir.includes('LOW QUALITY')){
    return 'STAND DOWN — '+dir;
  }
  // Regime context — only push when there's already a leading piece. Avoids "in RANGE-CHOP"
  // showing up as a sentence opener for fall-through states.
  if(regime&&!dir.includes('SEARCHING')&&pieces.length>0)pieces.push(`in ${regime}`);
  else if(regime&&!dir.includes('SEARCHING'))pieces.push(regime);
  // Top driving reasons (max 2)
  const drivers=[];
  const flowTag=findTag('FLOW');
  if(flowTag){
    const m=flowTag.match(/Net (buy|sell) \$([0-9.]+)([KM])/);
    if(m)drivers.push(`${m[1]}ers absorbing ($${m[2]}${m[3]} net)`);
    else if(flowTag.includes('Imbalance:'))drivers.push('flow imbalance');
  }
  const trajTag=findTag('TRAJ');
  if(trajTag){
    const m=trajTag.match(/[+-]\d+/);
    if(m)drivers.push(`trajectory ${m[0]}bps to strike`);
  }
  const momTag=findTag('MOMENTUM');
  if(momTag&&momTag.includes('aligned'))drivers.push('15m momentum aligned');
  else if(momTag&&momTag.includes('divergent'))drivers.push('momentum divergent');
  const liqTag=findTag('LIQ');
  if(liqTag&&!liqTag.includes('SPOOF'))drivers.push('liquidation magnet pulling');
  const fundTag=findTag('FUND-EXT');
  if(fundTag)drivers.push(fundTag.includes('Crowded longs')?'crowded longs flipping':'crowded shorts flipping');
  const patternTag=findTag('PATTERN');
  if(patternTag){
    const m=patternTag.match(/\] (.+?) —/);
    if(m)drivers.push(m[1].toLowerCase());
  }
  if(drivers.length>0)pieces.push('— '+drivers.slice(0,2).join(', '));
  // Quality note
  const q=qualityGate?.score||0;
  if(q>=75)pieces.push('· A+ setup');
  else if(q>=65)pieces.push('· solid setup');
  else if(q<50)pieces.push('· marginal quality');
  // Advisor override
  if(advisor&&advisor.label&&!advisor.label.includes('CONNECTING')){
    if(advisor.color==='rose')return `⚠ ${advisor.label} — ${advisor.reason||''}`.slice(0,200);
  }
  return pieces.join(' ').replace(/\s+/g,' ').trim();
};


// V134: Session Start Status Check — shows on first load
function SessionStartCheck({open,onClose,windowType,scorecards,tradeLog,regime,velocityRegime,calibration,baselineDrift,resetToLatestBaseline,runSyncWithProgress,syncState,resetDirectionalBias,resetFreshStart}){
  if(!open)return null;
  const score=scorecards?.[windowType]||{wins:0,losses:0};
  const wr=score.wins+score.losses>0?(score.wins/(score.wins+score.losses))*100:0;
  // Last 10 trades W/L
  const last10=(tradeLog||[]).slice(-10).filter(t=>t.result);
  const last10W=last10.filter(t=>t.result==='WIN').length;
  const last10L=last10.length-last10W;
  // Streak detection
  let streak=0,streakType='';
  for(let i=last10.length-1;i>=0;i--){
    const r=last10[i].result;
    if(streak===0){streak=1;streakType=r;}
    else if(last10[i].result===streakType)streak++;
    else break;
  }
  const isHot=streakType==='WIN'&&streak>=3;
  const isCold=streakType==='LOSS'&&streak>=3;
  // V134 fix: calibration[k] is either a WR number or null (not a {wins,total} object)
  let calHealth='Computing...';
  let calIssue=null;
  if(calibration){
    const issues=[];
    let bucketsWithData=0;
    Object.entries(calibration).forEach(([k,wrPct])=>{
      if(wrPct==null)return; // null = insufficient data for this bucket
      bucketsWithData++;
      const actualWR=wrPct/100;
      const expectedWR=parseInt(k)/100+0.05; // mid-bucket expected WR
      const diff=actualWR-expectedWR;
      if(Math.abs(diff)>0.15)issues.push(`${k}% bucket: ${wrPct.toFixed(0)}% actual`);
    });
    if(bucketsWithData===0)calHealth='Insufficient data';
    else if(issues.length===0)calHealth='Well-calibrated';
    else{calHealth='Drift detected';calIssue=issues[0];}
  }
  // Macro events in next 60min
  const upcomingMacro=[];
  for(let m=0;m<60;m+=5){
    const t=new Date(Date.now()+m*60000);
    const ms=getMacroEventState(t);
    if(ms.event&&!upcomingMacro.find(u=>u.name===ms.event.name)){
      upcomingMacro.push({...ms.event,minutesUntil:m});
    }
  }
  return(
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#181A19] rounded-xl border border-[#E8E9E4]/10 p-5 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-serif text-white">📋 Session Start Check</h2>
          <button onClick={onClose} className="text-[#E8E9E4]/40 hover:text-white text-xl leading-none">×</button>
        </div>
        {/* V2.0: Session Start banner promoted for major release. Gold accent matches header
                  badge. baselineDrift state reads as a milestone announcement. */}
        <div className={baselineDrift?'mb-3 p-4 rounded-lg border-2':'mb-3 p-3 rounded-lg bg-indigo-500/10 border-2 border-indigo-500/40'} style={baselineDrift?{
          background:'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(212,175,55,0.03) 60%, rgba(0,0,0,0.2))',
          borderColor:'rgba(212,175,55,0.45)',
          boxShadow:'inset 0 0 24px rgba(212,175,55,0.06)',
        }:{}}>
          {baselineDrift?(
            <>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-[9px] uppercase font-bold tracking-[0.18em]" style={{color:'#E5C870'}}>Visual Refresh</span>
                <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.01</span>
              </div>
              <div className="font-serif text-2xl text-white mb-2 tracking-tight">Tara <span style={{color:'#E5C870'}}>3.1.5</span></div>
              <div className="text-xs text-[#E8E9E4]/75 mb-3 leading-relaxed">
                Direction C visual reset — two-tone gold/copper palette, hero-promoted prediction card, terminal-style status strip, panel corner stamps. Engine unchanged from 2.0. Choose how to start:
              </div>
            </>
          ):(
            <>
              <div className="text-[10px] uppercase text-indigo-300 font-bold mb-1">📦 Training Baseline</div>
              <div className="text-xs text-[#E8E9E4]/80 mb-3">Manage Tara's training data. Sync brings in the baseline trades + scorecard. Fresh start wipes everything for clean self-training.</div>
            </>
          )}
          <div className="grid grid-cols-1 gap-2">
            <button onClick={()=>{if(runSyncWithProgress)runSyncWithProgress();}} disabled={syncState&&syncState.active} className={baselineDrift?'w-full py-2.5 px-3 rounded text-xs uppercase tracking-wide font-bold disabled:opacity-50 text-left transition-colors':'w-full py-2 px-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded text-xs uppercase tracking-wide disabled:opacity-50 text-left'} style={baselineDrift?{
              background:'rgba(212,175,55,0.18)',
              border:'1px solid rgba(212,175,55,0.45)',
              color:'#E5C870',
            }:{}}>
              <div className="font-bold">{syncState&&syncState.active?'Syncing...':'⬇ Sync to Baseline'}</div>
              <div className={baselineDrift?'text-[10px] normal-case font-normal mt-0.5':'text-[10px] text-indigo-200/80 normal-case font-normal mt-0.5'} style={baselineDrift?{color:'rgba(229,200,112,0.7)'}:{}}>Load baked training data ({BASELINE_RECORD['15m'].wins}W-{BASELINE_RECORD['15m'].losses}L · {(100*BASELINE_RECORD['15m'].wins/(BASELINE_RECORD['15m'].wins+BASELINE_RECORD['15m'].losses)).toFixed(1)}% WR on 15m). Replaces your current trade log.</div>
            </button>
            {resetFreshStart&&(
              <button onClick={resetFreshStart} className="w-full py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 rounded text-xs uppercase tracking-wide text-left">
                <div className="font-bold">↻ Fresh Start</div>
                <div className="text-[10px] text-rose-300/70 normal-case font-normal mt-0.5">Wipe all training data, weights, and scorecard. Tara learns from your own trades only with V144 calibration prior baked in.</div>
              </button>
            )}
          </div>
        </div>
        {/* V134: Reset directional bias — keeps record, clears UP/DOWN learning lean */}
        {resetDirectionalBias&&(
          <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="text-[10px] uppercase text-amber-300 font-bold mb-1">⚖ Reset UP/DOWN Bias</div>
            <div className="text-xs text-[#E8E9E4]/80 mb-2">Tara may favor one direction from past learning. Reset weights so she gives UP and DOWN equal consideration. <strong className="text-white">Trade log + scorecard preserved.</strong></div>
            <button onClick={resetDirectionalBias} className="w-full py-1.5 bg-amber-500/80 hover:bg-amber-500 text-white font-bold rounded text-xs uppercase tracking-wide">Reset Bias (Keep Record)</button>
          </div>
        )}
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-[#111312] border border-[#E8E9E4]/8">
            <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-1">Window & Mode</div>
            <div className="text-white font-bold">{windowType.toUpperCase()} window</div>
          </div>
          <div className="p-3 rounded-lg bg-[#111312] border border-[#E8E9E4]/8">
            <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-1">Baseline Record</div>
            <div className="text-white font-bold">{score.wins}W - {score.losses}L · {wr.toFixed(1)}% WR</div>
          </div>
          <div className={'p-3 rounded-lg border '+(isCold?'bg-rose-500/10 border-rose-500/30':isHot?'bg-emerald-500/10 border-emerald-500/30':'bg-[#111312] border-[#E8E9E4]/8')}>
            <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-1">Recent Streak (Last 10)</div>
            <div className={'font-bold '+(isCold?'text-rose-300':isHot?'text-emerald-300':'text-white')}>
              {last10W}W - {last10L}L · Streak: {streak} {streakType}
              {isCold&&' ⚠ COLD STREAK — slow down'}
              {isHot&&' 🔥 HOT STREAK'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#111312] border border-[#E8E9E4]/8">
            <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-1">Current Regime</div>
            <div className="text-white font-bold">{regime||'Detecting...'} · Velocity: {velocityRegime||'NORMAL'}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#111312] border border-[#E8E9E4]/8">
            <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-1">Calibration Health</div>
            <div className={'font-bold '+(calHealth==='Well-calibrated'?'text-emerald-400':'text-amber-400')}>{calHealth}</div>
            {calIssue&&<div className="text-[10px] text-amber-300/80 mt-1">{calIssue}</div>}
          </div>
          <div className={'p-3 rounded-lg border '+(upcomingMacro.length>0?'bg-amber-500/10 border-amber-500/30':'bg-[#111312] border-[#E8E9E4]/8')}>
            <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-1">Macro Events (Next 60m)</div>
            {upcomingMacro.length===0?(
              <div className="text-emerald-400 font-bold">✓ Clear · No high-impact events</div>
            ):upcomingMacro.map((e,i)=>(
              <div key={i} className="text-amber-300 text-xs">⚠ <strong>{e.name}</strong> in {e.minutesUntil}m · {e.impact}</div>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-sm uppercase tracking-wide transition-colors">Start Trading</button>
      </div>
    </div>
  );
}


// V134: Compute weight changes for learning feedback
const computeWeightDiff=(oldW,newW)=>{
  const diffs=[];
  Object.keys(newW).forEach(k=>{
    const delta=(newW[k]-(oldW[k]||0));
    if(Math.abs(delta)>=0.05){
      diffs.push({key:k,delta:Math.round(delta*10)/10,old:Math.round((oldW[k]||0)*10)/10,new:Math.round(newW[k]*10)/10});
    }
  });
  return diffs;
};

function TaraApp(){
  const[isMounted,setIsMounted]=useState(false);
  const[showSessionStart,setShowSessionStart]=useState(true); // V134: Session-start status check on load
  const[showStats,setShowStats]=useState(false); // V2.7: full stats analytics modal
  const[syncState,setSyncState]=useState({active:false,stage:'',progress:0,complete:false,error:null}); // V134: sync progress overlay
  const[lastLearningUpdate,setLastLearningUpdate]=useState(null); // V122: visible learning feedback toast
  const[baselineDrift,setBaselineDrift]=useState(()=>{
    try{
      const v=localStorage.getItem('taraBaselineVersion');
      return v&&v!==BASELINE_VERSION;
    }catch(e){return false;}
  });
  const[showCandles,setShowCandles]=useState(true);
  const[showOverlays,setShowOverlays]=useState(true);
  const[showWhaleAlerts,setShowWhaleAlerts]=useState(true);
  const[showRugPullAlerts,setShowRugPullAlerts]=useState(true);
  const[showSettings,setShowSettings]=useState(false);
  const[discordWebhook,setDiscordWebhook]=useState('');
  const[discordUsername,setDiscordUsername]=useState('Tara Terminal V110');
  const[discordAvatar,setDiscordAvatar]=useState('');
  const[windowRecap,setWindowRecap]=useState(null); // {won,dir,closePrice,strike,gapBps,regime} — clears after 6s
  const[sessionPnL,setSessionPnL]=useState(0);      // dollar P&L this browser session
  const[lifetimePnL,setLifetimePnL]=useState(()=>{try{return parseFloat(localStorage.getItem('taraV110PnL')||'0');}catch(e){return 0;}})
  // MTF: track last known lock for each timeframe so we can detect confluence
  const mtfLocksRef=useRef({'5m':null,'15m':null}); // {dir,lockedAt,posterior};

  const[kalshiYesPrice,setKalshiYesPrice]=useState(null); // live YES price from active Kalshi market
  // V3.0: Kalshi-published strike for the active window. When available, this is the strike
  //       Tara will suggest at window open instead of using the live BTC price as the strike.
  //       This eliminates the strike-misalignment problem where Tara's strike differed by a
  //       few bps from Kalshi's strike (because they use CF Benchmarks, we use Coinbase).
  const[kalshiStrike,setKalshiStrike]=useState(null);
  // V3.0: Mirror to ref so the window-rollover handler can read the latest Kalshi strike
  //       at the exact moment a new window opens, without depending on render cycles.
  const kalshiStrikeRef=useRef(null);
  useEffect(()=>{kalshiStrikeRef.current=kalshiStrike;},[kalshiStrike]);
  // V3.0: The actual market ticker so we can re-find the same market at settlement time.
  const[kalshiActiveMarket,setKalshiActiveMarket]=useState(null);
  // streakData moved below tradeLog declaration
  const[useLocalTime,setUseLocalTime]=useState(true);
  // V138: Premium Mode removed entirely. The asymmetric blocks it carried (US session skip,
  //       weak RC skip, SS/HVC DOWN block, MTF Confluence cross-window veto) were over-filtering.
  //       Score math is now the only directional bias.
  // const[premiumMode,setPremiumMode]=useState(false);  // removed
  // useEffect(()=>{...},[premiumMode]);  // removed
  const newsSentiment=useNewsSentiment(); // V114
  // V138: Clean up stale Premium Mode localStorage entry from previous installs
  useEffect(()=>{try{localStorage.removeItem('taraPremiumMode');}catch(e){}},[]);
  const[mobileTab,setMobileTab]=useState('signal'); // signal | chart | logs
  const[resolution,setResolution]=useState('1m'); // chart timeframe: 1m | 5m | 15m | 1h
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
  const[strikeConfirmed,setStrikeConfirmed]=useState(true); // false while user is typing — gates analysis
  // Strike confirmation: when a new window starts, show pending price with OK button
  const[pendingStrike,setPendingStrike]=useState(null); // null | number — awaiting user OK
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
  const[scorecards,setScorecards]=useState({'15m':{wins:486,losses:302},'5m':{wins:33,losses:25}});
  const[regimeMemory,setRegimeMemory]=useState({
    'TRENDING UP':   {wins:0,losses:0},
    'TRENDING DOWN': {wins:14,losses:2},   // 87.5% WR (n=16) — extremely reliable
    'HIGH VOL CHOP': {wins:24,losses:21},  // 53% WR (n=45) — UP/DOWN both weak, require CONVICTION
    'SHORT SQUEEZE': {wins:66,losses:31},  // 68% WR (n=97) — primary regime, trust calls
    'LONG SQUEEZE':  {wins:0,losses:0},
    'RANGE-CHOP':    {wins:59,losses:51},  // 53.6% WR (n=110) — near coin flip, BE SELECTIVE
  });
  const lastRegimeRef=useRef('RANGE-CHOP');
  const windowSignalDirRef=useRef(null); // tracks first FORMING direction this window — lock must match
  // ── TARA SELF-TRAINING STATE ──
  const[adaptiveWeights,setAdaptiveWeights]=useState(()=>loadWeights());
  const[regimeWeights,setRegimeWeights]=useState(()=>loadRegimeWeights());
  const[tradeLog,setTradeLog]=useState(()=>loadTradeLog());
  // Streak analysis — computed from tradeLog (declared above)
  const streakData=useMemo(()=>{
    const recent=tradeLog.filter(t=>t.result).slice(-10);
    if(recent.length<3)return{streak:0,type:'neutral',last5WR:null,warning:false,strongWarn:false,upBias:0,dnBias:0};
    let streak=0;
    const lastResult=recent[recent.length-1].result;
    for(let i=recent.length-1;i>=0;i--){
      if(recent[i].result===lastResult)streak++;
      else break;
    }
    const last5=recent.slice(-5);
    const last5W=last5.filter(t=>t.result==='WIN').length;
    const last5WR=last5.length>=3?Math.round((last5W/last5.length)*100):null;
    const warning=lastResult==='LOSS'&&streak>=3;
    const strongWarn=lastResult==='LOSS'&&streak>=5;
    // V134: Per-direction bias correction
    // If recent UP calls have low WR and DOWN have high WR, tilt against UP
    const recent20=tradeLog.filter(t=>t.result).slice(-20);
    const recentUps=recent20.filter(t=>t.dir==='UP');
    const recentDns=recent20.filter(t=>t.dir==='DOWN');
    let upBias=0,dnBias=0;
    if(recentUps.length>=4){
      const upWR=recentUps.filter(t=>t.result==='WIN').length/recentUps.length;
      // upWR < 0.45 → -10 quality penalty for UP locks (recent UP cold)
      // upWR > 0.75 → +5 boost for UP (recent UP hot)
      if(upWR<0.40)upBias=-12;
      else if(upWR<0.50)upBias=-6;
      else if(upWR>0.75)upBias=+5;
    }
    if(recentDns.length>=4){
      const dnWR=recentDns.filter(t=>t.result==='WIN').length/recentDns.length;
      if(dnWR<0.40)dnBias=-12;
      else if(dnWR<0.50)dnBias=-6;
      else if(dnWR>0.75)dnBias=+5;
    }
    return{streak,type:lastResult==='WIN'?'hot':'cold',last5WR,warning,strongWarn,upBias,dnBias};
  },[tradeLog]);
  const tradeLogRef=useRef([]);
  tradeLogRef.current=tradeLog;
  const pendingTradeRef=useRef(null);
  // V2.6: Queue of trades waiting on Kalshi settlement confirmation due to marginal closing gap.
  //       Each entry: { tradeId, windowCloseTime (ms), attempts }
  const pendingResolutionRef=useRef([]);
  const[showAnalytics,setShowAnalytics]=useState(false);
  const[showGuide,setShowGuide]=useState(false);
  const[selectedTradeId,setSelectedTradeId]=useState(null); // for editable trade log
  const[discordEditingId,setDiscordEditingId]=useState(null); // for discord message edit
  const[discordEditText,setDiscordEditText]=useState('');
  const[discordStatusMsg,setDiscordStatusMsg]=useState('');
  const calibration=useMemo(()=>buildCalibration(tradeLog),[tradeLog]);
  const regimeDirWR=useMemo(()=>buildRegimeDirWR(tradeLog),[tradeLog]); // V134
  const sessionRegimeThresh=useMemo(()=>buildSessionRegimeThresh(tradeLog),[tradeLog]); // V134
  const signalAccuracy=useMemo(()=>buildSignalAccuracy(tradeLog),[tradeLog]);
  const sessionPerf=useMemo(()=>buildSessionPerf(tradeLog),[tradeLog]);
  const hourlyPerf=useMemo(()=>buildHourlyPerf(tradeLog),[tradeLog]);
  const[manualAction,setManualAction]=useState(null);
  const[forceRender,setForceRender]=useState(0);
  const[isChatOpen,setIsChatOpen]=useState(false);
  const[chatLog,setChatLog]=useState([{role:'tara',text:'Tara 3.1.5 online — FGT primary signal + 7 secondary signals + lock state machine + Kalshi strike snap + tape strip active.'}]);
  const[chatInput,setChatInput]=useState('');
  const lastWindowRef=useRef('');
  const[userPosition,setUserPosition]=useState(null);
  const[showHelp,setShowHelp]=useState(false);
  const[soundEnabled,setSoundEnabled]=useState(false);
  const audioCtxRef=useRef(null);
  const soundEnabledRef=useRef(false);
  soundEnabledRef.current=soundEnabled;

  const handleSoundToggle=()=>{
    const next=!soundEnabled;
    setSoundEnabled(next);
    if(next){
      try{
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(!audioCtxRef.current)audioCtxRef.current=new Ctx();
        if(audioCtxRef.current.state==='suspended')audioCtxRef.current.resume();
        // Confirmation beep
        const ctx=audioCtxRef.current;
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sine';o.frequency.value=880;
        g.gain.setValueAtTime(0.06,ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
        o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.15);
      }catch(e){}
    }
  };

  const playAlert=(type)=>{
    if(!soundEnabledRef.current)return;
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(!audioCtxRef.current)audioCtxRef.current=new Ctx();
      const ctx=audioCtxRef.current;
      const tone=(freq,vol,dur,wave)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type=wave||'sine';o.frequency.value=freq;
        g.gain.setValueAtTime(vol,ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
        o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur);
      };
      const playSequence=()=>{
        if(type==='lock-up'){tone(523,0.08,0.2);setTimeout(()=>tone(659,0.1,0.3),180);}
        else if(type==='lock-down'){tone(659,0.08,0.2);setTimeout(()=>tone(523,0.1,0.3),180);}
        else if(type==='entry'){tone(880,0.07,0.12,'square');setTimeout(()=>tone(880,0.07,0.12,'square'),120);setTimeout(()=>tone(880,0.07,0.12,'square'),240);}
        else if(type==='profit'){tone(523,0.07,0.15);setTimeout(()=>tone(659,0.07,0.15),100);setTimeout(()=>tone(784,0.09,0.3),200);}
        else if(type==='warning'){tone(220,0.1,0.15,'sawtooth');setTimeout(()=>tone(220,0.1,0.15,'sawtooth'),200);}
        else if(type==='emergency'){tone(180,0.12,0.12,'sawtooth');setTimeout(()=>tone(180,0.12,0.12,'sawtooth'),150);setTimeout(()=>tone(180,0.12,0.12,'sawtooth'),300);}
        else{tone(440,0.06,0.2);}
      };
      // V3.1.2 BUGFIX: Don't return early on suspended context. Browsers auto-suspend audio
      // contexts after tab inactivity — previously this silently dropped every alert that
      // happened to occur while suspended. Now we await resume() and then play.
      if(ctx.state==='suspended'){
        const r=ctx.resume();
        if(r&&typeof r.then==='function'){r.then(()=>{try{playSequence();}catch(e){}}).catch(()=>{});}
        else {playSequence();}
      } else {
        playSequence();
      }
    }catch(e){}
  };
  const[showWhaleLog,setShowWhaleLog]=useState(false);
  const velocityRef=useVelocity(tickHistoryRef,currentPrice,targetMargin);
  const bloomberg=useBloomberg();
  const depthFlash=useDepthFlash(); // V134: 2.5s order book polling
  const tfCandles=useMultiTFCandles(); // V134: HPotter FGT multi-timeframe data
  const{tapeRef,globalFlow,ticksRef,whaleLog,flowSignal,tapeWindows}=useGlobalTape();
  const marketSessions=useMemo(()=>getMarketSessions(),[timeState.currentHour]);
  const[klines,setKlines]=useState([]);

  useEffect(()=>{setIsMounted(true);
    // ── PWA: register service worker for installability + keep-alive ──
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').then(reg=>{
        // Request periodic background sync if supported
        if('periodicSync' in reg){
          reg.periodicSync.register('tara-keepalive',{minInterval:60*1000}).catch(()=>{});
        }
      }).catch(()=>{});
    }
    // V134: Baseline version check — detect if a newer baseline has shipped
    try{
      const lastSyncedVersion=localStorage.getItem('taraBaselineVersion');
      if(lastSyncedVersion&&lastSyncedVersion!==BASELINE_VERSION){
        console.info('[Tara] New baseline available:',BASELINE_VERSION,'(you have:',lastSyncedVersion,')');
        setBaselineDrift(true);
      } else if(!lastSyncedVersion){
        localStorage.setItem('taraBaselineVersion',BASELINE_VERSION);
      }
    }catch(e){}
    try{
      // V134: Try both legacy keys + handle baseline migration
      const sNew=localStorage.getItem('taraV110Score');
      const sOld=localStorage.getItem('taraScoreV110');
      let chosen=null;
      if(sNew){try{const p=JSON.parse(sNew);if(p?.['15m']?.wins!=null)chosen=p;}catch(e){}}
      if(!chosen&&sOld){try{const p=JSON.parse(sOld);if(p?.['15m']?.wins!=null)chosen=p;}catch(e){}}
      // If user's local score is BELOW baseline, prefer baseline (cross-device sync)
      const baseW=BASELINE_RECORD['15m']?.wins||0;
      const localW=chosen?.['15m']?.wins||0;
      if(!chosen||localW<baseW){
        chosen=BASELINE_RECORD;
        try{localStorage.setItem('taraV110Score',JSON.stringify(BASELINE_RECORD));}catch(e){}
      }
      if(chosen)setScorecards(chosen);const m=localStorage.getItem('taraV110Mem');if(m)setRegimeMemory(JSON.parse(m));const w=localStorage.getItem('taraV110Hook');if(w)setDiscordWebhook(w);const tz=localStorage.getItem('taraV110TZ');if(tz!=null)setUseLocalTime(tz==='true');
      // Username migration: always sync to current version, never keep stale Vxxx strings
      const du=localStorage.getItem('taraV110DU');
      const cleanDU=(du&&!new RegExp('V1[0-9][0-9]').test(du||''))?du:'Tara 3.1.5'; // no regex literal — esbuild safe
      setDiscordUsername(cleanDU);
      if(cleanDU!==du)localStorage.setItem('taraV110DU',cleanDU); // write back corrected value
      const da=localStorage.getItem('taraV110DA');if(da)setDiscordAvatar(da);}catch(e){};},[]);
  useEffect(()=>{if(!isMounted)return;try{localStorage.setItem('taraV110Score',JSON.stringify(scorecards));localStorage.setItem('taraV110Mem',JSON.stringify(regimeMemory));localStorage.setItem('taraV110Hook',discordWebhook);localStorage.setItem('taraV110TZ',String(useLocalTime));localStorage.setItem('taraV110DU',discordUsername);localStorage.setItem('taraV110DA',discordAvatar);}catch(e){};},[scorecards,regimeMemory,discordWebhook,useLocalTime,discordUsername,discordAvatar,isMounted]);

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

  // ── AUTO-STRIKE: Kalshi (15m) / Polymarket (5m) / Coinbase fallback ──
  const[strikeSource,setStrikeSource]=useState('auto');

  // ── AUTO-STRIKE: capture the live spot price at the exact window boundary ──
  // currentPriceRef always holds the freshest price from the Coinbase feed (updated every 1.5s)
  // At the moment a window rolls over, that price IS the opening price of the new window
  // No API calls, no CORS, no parsing — zero latency, always accurate
  const setWindowOpenStrike=(price)=>{
    if(isManualStrikeRef.current)return;
    // V3.0: Prefer Kalshi's published strike when available. Tara's local Coinbase feed and
    //       Kalshi's CF Benchmarks settlement index disagree by a few bps near strike — using
    //       Kalshi's strike directly eliminates the strike-misalignment problem at window open.
    //       Fall back to live price if Kalshi data is unavailable.
    // V3.1.4: Round strike to whole dollar. Kalshi BTC strikes are always whole-dollar amounts,
    //       and live spot's fractional cents (.21, .87) are visual noise that don't aid trading.
    const _kStrike=kalshiStrikeRef.current;
    const _kStrikeValid=_kStrike!=null&&_kStrike>1000&&_kStrike<10000000;
    const _raw=_kStrikeValid?_kStrike:(price||currentPriceRef.current);
    const p=_raw?Math.round(_raw):_raw;
    const _source=_kStrikeValid?'kalshi':'live';
    // Always reset strike to blank (0) at window start
    // Tara's suggestion shows as pendingStrike — user edits or taps OK
    setTargetMargin(0);
    setStrikeConfirmed(false);
    if(!p||p<=0){
      windowOpenPriceRef.current=0;
      setStrikeMode('manual');
      setStrikeSource('manual');
      hasSetInitialMargin.current=true;
      return;
    }
    // Show suggested price — user must tap OK or edit before analysis runs
    windowOpenPriceRef.current=p;
    setPendingStrike(p);
    setStrikeMode('manual'); // treat as manual until confirmed
    setStrikeSource(_source);
    hasSetInitialMargin.current=true;
  };

  // Alias so call-sites using the old name still work
  const fetchWindowOpenPrice=useCallback((wType)=>{
    setWindowOpenStrike(currentPriceRef.current);
  },[]);

  // Strike starts at 0 on page open (mid-window) — never auto-set from current price.
  // Only the window rollover sets the strike (at the exact moment a new window starts).
  // On first load, just mark as initialized so rollover can handle it.
  useEffect(()=>{
    if(!hasSetInitialMargin.current&&currentPrice){
      hasSetInitialMargin.current=true; // page loaded mid-window, leave strike at 0
    }
  },[currentPrice]);

  const liveHistory=useMemo(()=>{if(history.length===0||!currentPrice)return history;const u=[...history];u[0]={...u[0],c:currentPrice,h:Math.max(u[0].h||currentPrice,currentPrice),l:Math.min(u[0].l||currentPrice,currentPrice)};return u;},[history,currentPrice]);

  // Chart data: prefer klines, fallback to liveHistory
  const chartData=useMemo(()=>klines.length>0?klines:liveHistory,[klines,liveHistory]);

  // Time
  useEffect(()=>{const u=()=>{const now=new Date();const ms=now.getTime();const iMs=(windowType==='15m'?15:5)*60*1000;const nMs=Math.ceil((ms+500)/iMs)*iMs;const nW=new Date(nMs);const sW=new Date(nMs-iMs);const diff=nW.getTime()-now.getTime();const tz=useLocalTime?undefined:{timeZone:'America/New_York'};let ct,sw,nw;try{ct=now.toLocaleTimeString('en-US',{...tz,hour12:true,hour:'2-digit',minute:'2-digit',second:'2-digit'});sw=sW.toLocaleTimeString('en-US',{...tz,hour12:true,hour:'2-digit',minute:'2-digit'});nw=nW.toLocaleTimeString('en-US',{...tz,hour12:true,hour:'2-digit',minute:'2-digit'});}catch(e){ct=now.toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit',second:'2-digit'});sw=sW.toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit'});nw=nW.toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit'});}setTimeState({currentTime:String(ct),startWindow:String(sw),nextWindow:String(nw),minsRemaining:Math.floor(diff/60000),secsRemaining:Math.floor((diff%60000)/1000),currentHour:now.getHours()});};u();const t=setInterval(u,1000);return()=>clearInterval(t);},[windowType,useLocalTime]);

  // Position status
  const positionStatus=useMemo(()=>{if(!positionEntry||!currentPrice)return null;const{price:entry,side}=positionEntry;const pnlPct=side==='UP'?((currentPrice-entry)/entry)*100:((entry-currentPrice)/entry)*100;return{entry,side,pnlPct,isStopHit:pnlPct<=-30};},[positionEntry,currentPrice,betAmount]);

  const updateScore=(type,wl,amt)=>setScorecards(prev=>({...prev,[type]:{...prev[type],[wl]:Math.max(0,(Number(prev[type]?.[wl])||0)+amt)}}));

  const[discordLog,setDiscordLog]=useState([]); // {id, type, label, ts, messageId, webhookId, webhookToken}

  const broadcastToDiscord=async(type,data)=>{
    if(!discordWebhook||!discordWebhook.startsWith('http'))return;
    try{
      let embed={};

      if(type==='SIGNAL')embed={
        title:`TARA SIGNAL  ${data.dir}`,
        color:data.dir==='UP'?3404125:16478549,
        description:data.summary||`Signal forming. Awaiting lock confirmation.`,
        fields:[
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Strike',value:`$${data.strike.toFixed(2)}`,inline:true},
          {name:'Gap',value:`${data.gap.toFixed(1)} bps`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Confidence',value:`${(data.posterior||0).toFixed(1)}%`,inline:true},
          {name:'Quality',value:`${data.quality||0}/100`,inline:true},
          {name:'State',value:data.prediction||'—',inline:false},
        ],
        footer:{text:'Tara 3.1.5  |  signal'},
        timestamp:new Date().toISOString(),
      };

      else if(type==='STAND_DOWN')embed={
        title:`⛔ TARA — STAND DOWN`,
        color:14935562, // amber
        description:data.summary||'Tara is sitting this one out.',
        fields:[
          {name:'State',value:data.prediction||'—',inline:false},
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
        ],
        footer:{text:'Tara 3.1.5  |  stand-down'},
        timestamp:new Date().toISOString(),
      };

      else if(type==='SEARCH')embed={
        title:`TARA — SEARCHING`,
        color:6710886,
        description:data.summary||'No clear edge yet.',
        fields:[
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Confidence',value:`${(data.posterior||0).toFixed(1)}%`,inline:true},
        ],
        footer:{text:'Tara 3.1.5  |  search'},
        timestamp:new Date().toISOString(),
      };

      else if(type==='LOCK')embed={
        title:`TARA  ${data.dir}  LOCKED`,
        color:data.dir==='UP'?3404125:16478549,
        description:data.summary||`Lock confirmed. Enter ${data.dir}.`,
        fields:[
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Strike',value:`$${data.strike.toFixed(2)}`,inline:true},
          {name:'Gap',value:`${data.gap.toFixed(1)} bps`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Record',value:data.record||'—',inline:true},
          {name:'Quality',value:`${data.quality||0}/100`,inline:true},
        ],
        footer:{text:'Tara 3.1.5  |  lock'},
        timestamp:new Date().toISOString(),
      };

      else if(type==='CLOSE'){
        const gap=data.strike>0?((data.price-data.strike)/data.strike*10000):0;
        embed={
          title:`${data.won?'WIN':'LOSS'}  ${data.dir||'—'}  ${data.window||windowType}`,
          color:data.won?3404125:16478549,
          fields:[
            {name:'Call',value:`${data.dir==='UP'?'UP — above strike':'DOWN — below strike'}`,inline:true},
            {name:'Regime',value:data.regime||'—',inline:true},
            {name:'Strike',value:`$${(data.strike||0).toFixed(2)}`,inline:true},
            {name:'Close',value:`$${(data.price||0).toFixed(2)}`,inline:true},
            {name:'Gap',value:`${gap>=0?'+':''}${gap.toFixed(1)} bps  (${data.won?'correct side':'wrong side'})`,inline:true},
            {name:'Record',value:`${data.wins}W / ${data.losses}L  ${data.wins+data.losses>0?((data.wins/(data.wins+data.losses))*100).toFixed(1):'—'}%`,inline:false},
          ],
          footer:{text:'Tara 3.1.5  |  close'},
          timestamp:new Date().toISOString(),
        };
      }

      else if(type==='EXIT')embed={
        title:(()=>{
          // V112 fix: don't prepend CASHOUT/CUT if action already contains it (avoids "CUT CUT" or "CASHOUT CASHOUT")
          const action=String(data.action||'').toUpperCase();
          const prefix=data.result==='WIN'?'CASHOUT':'CUT';
          if(action.includes('CASHOUT')||action.includes('CUT')||action.includes('EXIT'))return data.action||prefix;
          return `${prefix}  ${data.action||''}`;
        })(),
        color:data.result==='WIN'?3404125:16478549,
        fields:[
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Strike',value:`$${data.strike.toFixed(2)}`,inline:true},
          {name:'Gap',value:`${data.gap.toFixed(1)} bps`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
        ],
        footer:{text:'Tara 3.1.5  |  exit'},
        timestamp:new Date().toISOString(),
      };

      // Whale pressure alert — clinical, accurate, no hype
      else if(type==='WHALE'){
        const isBuy=data.netFlow>0;
        const netAbs=Math.abs(data.netFlow);
        const exLines=Object.entries(data.exchanges||{})
          .map(([ex,v])=>`${ex}   ${v>0?'BUY':'SEL'}  $${(Math.abs(v)/1000).toFixed(0)}K  (${data.exchangeCounts?.[ex]||'?'} prints)`)
          .join('\n');
        const reliabilityNote=data.spotAligned
          ? 'Spot and futures aligned — elevated reliability.'
          : data.exchangeCount===1
          ? 'Single exchange — treat as unconfirmed.'
          : 'Futures only — possible hedging or basis trade.';
        embed={
          title:`TARA — WHALE PRESSURE: ${isBuy?'BUY':'SELL'}`,
          color:isBuy?3404125:16478549,
          description:[
            `$${(data.totalVol/1000).toFixed(0)}K  |  ${data.tradeCount||'?'} prints  |  ${data.exchangeCount||1} exchange${data.exchangeCount!==1?'s':''}`,
            `Net  ${isBuy?'+':'-'}$${(netAbs/1000).toFixed(0)}K`,
            ``,
            `\`\`\``,
            exLines||'—',
            `\`\`\``,
            `BTC  $${(data.price||0).toFixed(0)}  |  ${data.clock||'—'} remaining`,
            `${reliabilityNote}`,
          ].join('\n'),
          footer:{text:'Tara 3.1.5  |  futures tape  |  not financial advice'},
          timestamp:new Date().toISOString(),
        };
      }

      const res=await fetch(discordWebhook+'?wait=true',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:discordUsername||'Tara 3.1.5',avatar_url:discordAvatar||undefined,embeds:[embed]})});
      if(res.ok){
        const msg=await res.json();
        const parts=discordWebhook.replace('https://discord.com/api/webhooks/','').split('/');
        const entry={id:Date.now(),type,label:embed.title||type,ts:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}),messageId:msg.id,webhookId:parts[0],webhookToken:parts[1],embed};
        setDiscordLog(prev=>[entry,...prev].slice(0,50));
      }
    }catch(e){}
  };

  const editDiscordMessage=async(entry,noteText)=>{
    if(!entry.webhookId||!entry.webhookToken||!entry.messageId)return false;
    try{
      const url=`https://discord.com/api/webhooks/${entry.webhookId}/${entry.webhookToken}/messages/${entry.messageId}`;
      // Build updated embed — keep original structure, append edit note to description
      const originalEmbed=entry.embed||{title:entry.label,color:9807270};
      const updatedEmbed={
        ...originalEmbed,
        description:(originalEmbed.description?originalEmbed.description+'\n\n':'')+'Note: '+noteText,
        footer:{text:`Tara 3.1.5 · edited ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}`},
      };
      const res=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({embeds:[updatedEmbed]})});
      return res.ok;
    }catch(e){return false;}
  };

  const deleteDiscordMessage=async(entry)=>{
    if(!entry.webhookId||!entry.webhookToken||!entry.messageId)return false;
    try{
      const url=`https://discord.com/api/webhooks/${entry.webhookId}/${entry.webhookToken}/messages/${entry.messageId}`;
      const res=await fetch(url,{method:'DELETE'});
      if(res.ok)setDiscordLog(prev=>prev.filter(m=>m.id!==entry.id));
      return res.ok;
    }catch(e){return false;}
  };



  const recordPnL=(won,trade)=>{
    const bet=trade?.betAmt||0;
    const pay=trade?.maxPay||0;
    if(bet<=0)return; // no bet amount entered, skip
    const delta=won?(pay-bet):-bet; // WIN: profit = maxPayout-bet; LOSS: lose bet
    setSessionPnL(prev=>prev+delta);
    setLifetimePnL(prev=>{
      const next=prev+delta;
      try{localStorage.setItem('taraV110PnL',String(next));}catch(e){}
      return next;
    });
  };
  // ── KALSHI LIVE MARKET REFERENCE ── polls every 30s for YES price on active BTC market
  // V143: Fetches for both 5m and 15m markets. Previously 15m-only meant 5m windows had
  //       zero Kalshi reference, so the EDGE metric never appeared. Also resets the price to
  //       null on window change so a stale previous-strike price doesn't get displayed.
  // V3.0: Extracts Kalshi's published strike and the active market ticker.
  // V3.1.2: Strike extraction made strike-aware. Kalshi BTC markets are published as a
  //         SERIES of strikes per close_time (20+ markets for each window). Previous logic
  //         picked any market matching close_time, which often grabbed a far-OTM strike
  //         instead of the at-the-money one. Now we filter by close_time first, then within
  //         that close_time find the market whose strike is closest to current BTC price.
  useEffect(()=>{
    setKalshiYesPrice(null); // reset on window change so we don't show stale prior-strike price
    setKalshiStrike(null);
    setKalshiActiveMarket(null);
    const fetchKalshi=async()=>{
      try{
        const now=Date.now();
        const intervalMin=windowType==='5m'?5:15;
        const iMs=intervalMin*60*1000;
        const nextMs=Math.ceil((now+500)/iMs)*iMs;
        const r=await fetch(
          'https://api.elections.kalshi.com/trade-api/v2/markets?limit=200&ticker_name_prefix=KXBTC&status=open',
          {signal:AbortSignal.timeout(6000),headers:{'Accept':'application/json'}}
        );
        if(!r.ok)return;
        const d=await r.json();
        const markets=d.markets||d.data||[];
        // V3.1.2: Helper to extract strike from a market — try direct fields, then ticker, then title
        const _extractStrike=(m)=>{
          if(m.floor_strike!=null)return Number(m.floor_strike);
          if(m.cap_strike!=null)return Number(m.cap_strike);
          if(m.strike_price!=null)return Number(m.strike_price);
          if(m.strike!=null)return Number(m.strike);
          if(m.ticker){
            const m1=m.ticker.match(/T(\d+(?:\.\d+)?)/);
            if(m1)return Number(m1[1]);
            const m2=m.ticker.match(/-(\d{5,7}(?:\.\d+)?)$/);
            if(m2)return Number(m2[1]);
          }
          const titleText=(m.subtitle||m.title||m.yes_sub_title||'')+' ';
          const tm=titleText.match(/\$?([\d,]+(?:\.\d+)?)/);
          if(tm){const n=Number(tm[1].replace(/,/g,''));if(n>1000&&n<10000000)return n;}
          return null;
        };
        // V3.1.2: Filter to markets whose close_time matches our active window
        const tolMs=Math.floor(intervalMin*60*1000/2);
        const matchingClose=markets.filter(m=>{
          const closeMs=m.close_time?new Date(m.close_time).getTime():0;
          return closeMs && Math.abs(closeMs-nextMs)<tolMs;
        });
        if(matchingClose.length===0)return;
        // V3.1.2: Within those, find the market whose strike is closest to current spot.
        //         Critical fix: previous logic just picked the first match by close_time, which
        //         often grabbed a random OTM strike from the 20+ markets at that close time.
        const _curPrice=currentPriceRef.current||0;
        let best=null,bestStrikeDiff=Infinity,bestStrike=null;
        for(const m of matchingClose){
          const _s=_extractStrike(m);
          if(_s==null||_s<1000||_s>10000000)continue;
          if(_curPrice>0){
            const diff=Math.abs(_s-_curPrice);
            if(diff<bestStrikeDiff){bestStrikeDiff=diff;best=m;bestStrike=_s;}
          } else if(best===null){
            // No spot price yet — fall back to first valid market
            best=m; bestStrike=_s;
          }
        }
        if(!best){
          // No market with extractable strike — fall back to first matching-close market
          best=matchingClose[0];
          bestStrike=_extractStrike(best);
        }
        // YES price for the at-the-money market (most useful as reference)
        const yes=best.yes_ask??best.yes_bid??best.last_price??null;
        if(yes!=null)setKalshiYesPrice(Number(yes));
        if(bestStrike!=null&&bestStrike>1000&&bestStrike<10000000){
          setKalshiStrike(bestStrike);
        }
        if(best.ticker)setKalshiActiveMarket({ticker:best.ticker,closeTime:best.close_time,strike:bestStrike});
      }catch(e){}
    };
    fetchKalshi();
    const iv=setInterval(fetchKalshi,30000);
    return()=>clearInterval(iv);
  },[windowType,timeState.nextWindow]);

  // V2.6: Kalshi settlement resolver for marginal trades.
  //   Trades with |closingGapBps| < 10 are queued for verification because Tara's local price
  //   feed and Kalshi's CF Benchmarks settlement index can disagree near strike. This effect
  //   polls Kalshi's settled-markets endpoint, finds the just-closed market by close_time,
  //   and uses Kalshi's authoritative result.
  //   Falls back to local-feed result after 5 minutes of failed polling.
  useEffect(()=>{
    const resolverIv=setInterval(async()=>{
      if(!pendingResolutionRef.current||pendingResolutionRef.current.length===0)return;
      const now=Date.now();
      // Process each pending resolution
      for(const pending of [...pendingResolutionRef.current]){
        const ageSec=(now-pending.windowCloseTime)/1000;
        // Don't query Kalshi for at least 30s after window close — they need time to settle
        if(ageSec<30)continue;
        // After 5 minutes of failed polling, fall back to local-feed result
        if(ageSec>300){
          const trade=tradeLogRef.current.find(t=>t.id===pending.tradeId);
          if(trade&&trade.result==='PENDING-VERIFY'){
            const finalResult=trade.localResultGuess||'LOSS';
            const newLog=tradeLogRef.current.map(t=>t.id===pending.tradeId?{...t,result:finalResult,kalshiResolutionFailed:true}:t);
            saveTradeLog(newLog);setTradeLog(newLog);
            (()=>{const _newW=updateWeights(adaptiveWeights,newLog,finalResult);const _diffs=computeWeightDiff(adaptiveWeights,_newW);setAdaptiveWeights(_newW);if(_diffs.length>0)setLastLearningUpdate({result:finalResult,diffs:_diffs,at:Date.now()});})();
          }
          pendingResolutionRef.current=pendingResolutionRef.current.filter(p=>p.tradeId!==pending.tradeId);
          continue;
        }
        // Try to fetch settlement from Kalshi
        try{
          pending.attempts++;
          const r=await fetch(
            'https://api.elections.kalshi.com/trade-api/v2/markets?limit=200&ticker_name_prefix=KXBTC&status=settled',
            {signal:AbortSignal.timeout(8000),headers:{'Accept':'application/json'}}
          );
          if(!r.ok)continue;
          const d=await r.json();
          const markets=d.markets||d.data||[];
          // Match by close_time near our window close
          const target=pending.windowCloseTime;
          let best=null,bestDiff=Infinity;
          for(const m of markets){
            const closeMs=m.close_time?new Date(m.close_time).getTime():0;
            if(!closeMs)continue;
            const diff=Math.abs(closeMs-target);
            if(diff<bestDiff){bestDiff=diff;best=m;}
          }
          // Must be within 90 seconds and have a result
          if(best&&bestDiff<90000&&best.result){
            // Kalshi result: 'yes' = market resolved YES (price closed >= strike → UP wins)
            //                'no'  = market resolved NO (price closed < strike → DOWN wins)
            const kalshiOutcomeDir=best.result==='yes'?'UP':best.result==='no'?'DOWN':null;
            // V3.0: Extract Kalshi's settled price for the canonical closing price
            const _kalshiSettlement=(()=>{
              if(best.settlement_value!=null)return Number(best.settlement_value);
              if(best.final_value!=null)return Number(best.final_value);
              if(best.expiration_value!=null)return Number(best.expiration_value);
              if(best.settled_price!=null)return Number(best.settled_price);
              return null;
            })();
            if(kalshiOutcomeDir){
              const trade=tradeLogRef.current.find(t=>t.id===pending.tradeId);
              if(trade){
                const finalResult=trade.dir===kalshiOutcomeDir?'WIN':'LOSS';
                const newLog=tradeLogRef.current.map(t=>t.id===pending.tradeId?{
                  ...t,
                  result:finalResult,
                  outcomeDir:kalshiOutcomeDir,
                  kalshiResolved:true,
                  kalshiClosingPrice:_kalshiSettlement,  // V3.0: canonical Kalshi-settled close
                }:t);
                saveTradeLog(newLog);setTradeLog(newLog);
                (()=>{const _newW=updateWeights(adaptiveWeights,newLog,finalResult);const _diffs=computeWeightDiff(adaptiveWeights,_newW);setAdaptiveWeights(_newW);if(_diffs.length>0)setLastLearningUpdate({result:finalResult,diffs:_diffs,at:Date.now()});})();
                setRegimeWeights(prev=>updateRegimeWeights(prev,{...trade,result:finalResult},finalResult));
              }
              pendingResolutionRef.current=pendingResolutionRef.current.filter(p=>p.tradeId!==pending.tradeId);
            }
          }
        }catch(e){
          // Silent fail — try again next interval
        }
      }
    },20000); // every 20s
    return()=>clearInterval(resolverIv);
  },[adaptiveWeights]);
  // Window rollover
  useEffect(()=>{if(timeState.nextWindow&&timeState.nextWindow!==lastWindowRef.current){if(currentPrice!==null){if(lastWindowRef.current!==''){
          let won=false,active=false;
          // ── SCORING: only score the trade the user was actually IN ──
          // userPosition tracks what user entered (UP/DOWN), not Tara's prediction
          // manuallyClosedRef tracks if user already exited early
          if(manuallyClosedRef.current!==null){
            // User manually closed — result already scored when they exited
            won=manuallyClosedRef.current==='WIN';
            active=!!pendingTradeRef.current; // only broadcast if they had a trade
          } else if(userPosition==='UP'){
            // User was in UP — score based on price vs strike
            active=true;
            if(currentPrice>targetMargin){won=true;updateScore(windowType,'wins',1);}
            else updateScore(windowType,'losses',1);
          } else if(userPosition==='DOWN'){
            // User was in DOWN — score based on price vs strike
            active=true;
            if(currentPrice<targetMargin){won=true;updateScore(windowType,'wins',1);}
            else updateScore(windowType,'losses',1);
          }
          // If no position was entered, no scoring and no broadcast
          if(active){
            setRegimeMemory(prev=>{const u={...prev};const r=lastRegimeRef.current||'RANGE-CHOP';if(!u[r])u[r]={wins:0,losses:0};if(won)u[r].wins++;else u[r].losses++;return u;});
            // Broadcast result of the trade user was actually in
            if(manuallyClosedRef.current===null){
              recordPnL(won,pendingTradeRef.current);
              // Show post-window recap toast
              const gapBpsRecap=targetMargin>0?((currentPrice-targetMargin)/targetMargin*10000):0;
              setWindowRecap({won,dir:userPosition,closePrice:currentPrice,strike:targetMargin,gapBps:gapBpsRecap,regime:lastRegimeRef.current});
              setTimeout(()=>setWindowRecap(null),6000);
              const winsNow=(scorecards[windowType]?.wins||0)+(won?1:0);
              const lossesNow=(scorecards[windowType]?.losses||0)+(won?0:1);
              broadcastToDiscord('CLOSE',{window:windowType,won,dir:userPosition,regime:lastRegimeRef.current,price:currentPrice,strike:targetMargin,wins:winsNow,losses:lossesNow});
            }
            // Resolve training trade
            // V2.6: Marginal-close handling. When |closingGapBps| < 10 (Tara's local feed and Kalshi's
            //       settlement index can disagree near strike), defer to Kalshi's API instead of
            //       auto-recording. Otherwise record immediately.
            if(pendingTradeRef.current&&pendingTradeRef.current.result===null){
              const _closingGap=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
              const _isMarginal=Math.abs(_closingGap)<10;
              const baseResolved={...pendingTradeRef.current,closingPrice:currentPrice,strikePrice:targetMargin,
                /* V145 closing telemetry */ closingGapBps:_closingGap,
                kalshiAtClose:kalshiYesPrice!=null?Number(kalshiYesPrice):null,
                resolvedTimestampISO:new Date().toISOString()};
              if(_isMarginal){
                // Mark as pending-verify and queue for Kalshi resolution
                const pendingTrade={...baseResolved,result:'PENDING-VERIFY',localResultGuess:won?'WIN':'LOSS',marginalClose:true};
                const newLog=[...tradeLogRef.current,pendingTrade];
                saveTradeLog(newLog);setTradeLog(newLog);
                // Don't update weights / scorecard yet — wait for Kalshi confirmation
                pendingResolutionRef.current=[...(pendingResolutionRef.current||[]),{
                  tradeId:pendingTrade.id,
                  windowCloseTime:Date.now(),
                  attempts:0,
                }];
              } else {
                // Unambiguous close — record locally as before
                const result=won?'WIN':'LOSS';
                const resolvedTrade={...baseResolved,result};
                const newLog=[...tradeLogRef.current,resolvedTrade];
                saveTradeLog(newLog);setTradeLog(newLog);
                (()=>{const _newW=updateWeights(adaptiveWeights,newLog,result);const _diffs=computeWeightDiff(adaptiveWeights,_newW);setAdaptiveWeights(_newW);if(_diffs.length>0)setLastLearningUpdate({result,diffs:_diffs,at:Date.now()});})();
                setRegimeWeights(prev=>updateRegimeWeights(prev,resolvedTrade,result));
              }
              pendingTradeRef.current=null;
            }
          }
        }}
        // ── AUTO-STRIKE: propose live price at new window start ──
        isManualStrikeRef.current=false;
        hasSetInitialMargin.current=false;
        setWindowOpenStrike(currentPriceRef.current||currentPrice);
        // NOTE: do NOT setPendingStrike(null) here — setWindowOpenStrike just set it
        mtfLocksRef.current[windowType]=null; // clear this timeframe's lock on rollover
        taraAdviceRef.current='SEARCHING...';lockedCallRef.current=null;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};hasReversedRef.current=false;manuallyClosedRef.current=null;windowSignalDirRef.current=null;setUserPosition(null);setPositionEntry(null);lastWindowRef.current=timeState.nextWindow;setManualAction(null);tickHistoryRef.current=[];setCurrentOffer('');setBetAmount(0);setMaxPayout(0);peakOfferRef.current=0;hasSetInitialMargin.current=true;}},[timeState.nextWindow,currentPrice,windowType,targetMargin,adaptiveWeights,userPosition]);

  useEffect(()=>{if(userPosition===null){peakOfferRef.current=0;}else{const o=parseFloat(currentOffer)||0;if(o>peakOfferRef.current)peakOfferRef.current=o;}},[currentOffer,userPosition]);

  // News
  useEffect(()=>{let news=[];if(orderBook.imbalance>1.5)news.push({title:`BID wall detected near $${targetMargin.toFixed(0)} — maker support`,type:'info'});if(orderBook.imbalance<0.6)news.push({title:`ASK pressure at $${targetMargin.toFixed(0)} — sellers defending`,type:'info'});if(showWhaleAlerts&&whaleLog.length>0){const w=whaleLog[0];const age=Math.round((Date.now()-w.time)/1000);if(age<120)news.push({title:`WHALE PRESSURE: ${w.side}  $${(w.usd/1000).toFixed(0)}K  ${w.src}  ${age}s ago`,type:'whale'});}if(news.length<3)news.push({title:`Engine V110 active  ·  251 trades trained  ·  ${lastRegimeRef.current||'scanning'}`,type:'info'});setNewsEvents(news);},[orderBook.imbalance,globalFlow,targetMargin,windowType,showWhaleAlerts,whaleLog]);

  // ── MAIN ANALYSIS ──
  const analysis=useMemo(()=>{
    try{
      // Block analysis while user is still typing strike — wait for OK/Enter confirmation
      if(!strikeConfirmed&&strikeMode==='manual'&&targetMargin>0)return null;
      if(!currentPrice||liveHistory.length<30||!targetMargin||!isMounted||!velocityRef.current)return null;
      const is15m=windowType==='15m';
      const intervalSeconds=is15m?900:300;
      const clockSeconds=(timeState.minsRemaining*60)+timeState.secsRemaining;
      const timeFraction=Math.max(0,Math.min(1,1-(clockSeconds/intervalSeconds)));
      const isEndgameLock=is15m?(clockSeconds<90):(clockSeconds<45);
      const isCalibrating=(intervalSeconds-clockSeconds)<10;
      const isEarlyWindow=is15m?((intervalSeconds-clockSeconds)<300):((intervalSeconds-clockSeconds)<90);

      // V110 weighted posterior (adaptive)
      const eng=computeV99Posterior({currentPrice,liveHistory,targetMargin,globalFlow,bloomberg,velocityRef,tickHistoryRef,priceMemoryRef,windowType,timeFraction,clockSeconds,is15m,regimeMemory,adaptiveWeights,regimeWeights,currentRegime:lastRegimeRef.current||'RANGE-CHOP',calibration,windowOpenPrice:windowOpenPriceRef.current||0,depthFlash,tfCandles});
      const{posterior,regime,upThreshold,downThreshold,reasoning,atrBps,realGapBps,drift1m,drift5m,accel,pnlSlope,tickSlope,aggrFlow,isRugPull,isPostDecay,bb,velocityRegime,velocityScalars}=eng;
      lastRegimeRef.current=regime;

      // ══════════════════════════════════════════════════════
      // COMMITTED LOCK STATE MACHINE
      // Rules:
      //  1. Only lock after N consecutive aligned samples (no one-tick locks)
      //  2. Once locked, STAY locked for the window — never flip direction
      //  3. Only two unlock conditions: reality cap (gap > 50bps wrong) OR rugpull
      //  4. Endgame (last 90s/45s): freeze whatever state we're in
      // ══════════════════════════════════════════════════════
      // Session-aware thresholds based on historical WR:
      // EU 65%, ASIA 64%, US 59%, OFF-HOURS 55%
      const _sess=getMarketSessions().dominant;
      const _sessThreshAdj=_sess==='EU'?-3:_sess==='ASIA'?-1:_sess==='US'?3:5;
      // V134: Adaptive threshold per session×regime — tighter where Tara historically struggles
      const _srKey=(getMarketSessions().dominant||'')+':'+regime;
      const _srThreshAdj=sessionRegimeThresh?.[_srKey]||0;
      // V141: LOCK_THRESHOLD_UP defined further down as LOCK_THRESHOLD_UP_EFFECTIVE,
      //       computed alongside LOCK_THRESHOLD_DN_EFFECTIVE so both share the regime-aware logic.
      // V141 ROOT FIX: bullCount and bearCount now use the regime-aware effective thresholds
      //                (defined a few lines below). Previously bearCount used a separate
      //                hard-coded `(is15m?30:32) - sessAdj` that ignored regime and didn't include
      //                the session×regime adaptive adjustment. Result: even when the regime-specific
      //                effective threshold said "DOWN should fire at 36 in TD," the bear-counter
      //                was still using 30 to decide if recent ticks qualified. This was a silent
      //                bypass of the regime threshold logic.
      //                Defining bullCount/bearCount AFTER the effective thresholds.

      // ── IMPROVEMENT 2: Regime-gated consecutive requirement ──────────────
      // RANGE-CHOP is 56% WR (near coin flip) — needs one extra confirmation sample
      // TRENDING DOWN is 86% WR — can fire faster (2 samples)
      // ── IMPROVEMENT 3: Session multiplier on consecutive requirement ─────
      // US session 59% WR — needs one extra sample to reduce false locks
      const _regime=lastRegimeRef.current||'RANGE-CHOP';
      const _regimeConsecAdj=_regime==='RANGE-CHOP'?1:_regime==='HIGH VOL CHOP'?1:_regime==='TRENDING DOWN'?-1:0;
      const _sessConsecAdj=_sess==='US'?1:_sess==='OFF-HOURS'?1:0;
      // V113: Velocity-adaptive consecutive samples — slow markets need more confirmation, fast need less
      const _velSampleAdj=velocityScalars?.samples||1.0;
      // V134: Reduced base samples — Tara was waiting too long for confirmations
      // 15m: 3→2 samples (saves ~10s per call), 5m: 2→2 (no change, minimum)
      const _baseConsec=(is15m?2:2)+_regimeConsecAdj+_sessConsecAdj;
      // V134: Strong trajectory? Lock faster. Reduces sample requirement when direction is clear.
      const _trajStrength=Math.abs(eng.trajectoryAdj||0);
      const _trajShortcut=_trajStrength>=12?-2:_trajStrength>=8?-1:0;
      // V136: FGT alignment shortcut — FGT is now the primary signal, treat alignment
      //       the same way EXTREME velocity is treated. 4/4 = full fast-track (-2 samples),
      //       3/4 = partial (-1).
      const _fgtAlignAbs=Math.abs(eng.mtfAlignment||0);
      const _fgtShortcut=_fgtAlignAbs>=4?-2:_fgtAlignAbs>=3?-1:0;
      // V134: EXTREME velocity = lock at 1 sample regardless
      const _isExtreme=eng.velocityRegime==='EXTREME';
      // V136: FGT 4/4 alignment now also forces minimum-sample lock, matching EXTREME treatment
      const _isFgtFullAlign=_fgtAlignAbs>=4;
      // V134: PUSH-EARLIER — backtest shows sweet spot is 300-700s (73%+ WR) vs >820s (56.6% WR)
      // After 600s elapsed, drop sample requirement by 1 to grab setups before they degrade
      const _pastSweetSpot=clockSeconds>=600&&is15m;
      const _push=_pastSweetSpot?-1:0;
      // V135: SIGNAL CONSENSUS OVERRIDE — when 5+ of 6 raw signals strongly agree on a direction,
      //       drop the sample requirement by 1. The previous +12 quality bonus (line ~4048) was
      //       only helping the quality gate, not the sample-count gate. Both gates need the override.
      const _consensusUpStrong=Object.values(eng.rawSignalScores||{}).filter(s=>s>5).length>=5;
      const _consensusDnStrong=Object.values(eng.rawSignalScores||{}).filter(s=>s<-5).length>=5;
      const _consensusOverride=(_consensusUpStrong||_consensusDnStrong)?-1:0;
      // V146.1 LOOSEN 2: Strong-conviction shortcut. When calibrated posterior is already 10+ points
      //   beyond the regime threshold (e.g. UP threshold 62, posterior at 72+), the conviction is
      //   high enough that waiting a 2nd sample (~3 sec) is unnecessary. Joins the existing FGT 4/4
      //   and trajectory ±7 shortcuts. Doesn't loosen marginal locks — only fast-tracks obvious ones.
      const _strongConvictionUp=posterior>=72; // ≥10 above default 62 threshold
      const _strongConvictionDn=posterior<=22; // ≤10 below default 32 threshold
      const _convictionShortcut=(_strongConvictionUp||_strongConvictionDn)?-1:0;
      // V2.5: Sample-count floor raised 1 → 2 for non-extreme setups. The previous floor of 1
      //       meant that when multiple shortcuts piled on (FGT 3/4 + strong traj + signal consensus +
      //       high conviction = -4 against a baseline of 2), Tara could lock on a single tick.
      //       That produced "she answers instantly without taking a moment to understand the move."
      //       Now: at least 2 confirming samples required (~3-6s of confirmation) for ALL non-extreme
      //       setups. EXTREME velocity and FGT 4/4 keep the 1-sample fast track — those cases are
      //       genuinely obvious and don't need extra waiting.
      // V2.8: Extended fast-track. Was only EXTREME or FGT 4/4 → 1 sample. Now FGT 3/4 also fast-tracks.
      //       When 3 of 4 timeframes agree on direction, the primary signal is already strongly
      //       confirming — requiring 2 sample-ticks of agreement is redundant cautious-ness that
      //       made Tara miss valid setups. Marginal setups still need 2.
      const _isFgtStrongAlign=Math.abs(eng.mtfAlignment||0)>=3;
      const CONSECUTIVE_NEEDED=(_isExtreme||_isFgtFullAlign||_isFgtStrongAlign)?1:Math.max(2,Math.round(_baseConsec*_velSampleAdj)+_trajShortcut+_fgtShortcut+_push+_consensusOverride+_convictionShortcut);

      // ── IMPROVEMENT 4: Late lock penalty ─────────────────────────────────
      // Very late locks (>820s elapsed in 15m = last 80s) get suppressed
      // Data shows losses lock avg 777s vs wins 744s — very late = higher risk
      const elapsedSeconds=(is15m?900:300)-clockSeconds;
      const isVeryLateLock=is15m?(elapsedSeconds>800):(elapsedSeconds>250); // V112: tighter — losses cluster in last 100s
      // Late lock warning zone (700-820s elapsed) — show indicator, allow but note
      const isLateLockZone=is15m?(elapsedSeconds>700&&elapsedSeconds<=820):(elapsedSeconds>220&&elapsedSeconds<=260);

      // Add current posterior to history (capped at 12 samples)
      posteriorHistoryRef.current.push(posterior);
      if(posteriorHistoryRef.current.length>12)posteriorHistoryRef.current.shift();

      // Count consecutive bullish/bearish samples from recent history
      const recentHist=posteriorHistoryRef.current.slice(-6);
      // V114: Time-decay-weighted average — recent samples count more
      // weights: oldest sample 0.4× ... newest 1.6× (via decayRate from velocityScalars)
      const _decayRate=velocityScalars?.decayRate||1.0;
      let _avgWeighted=0,_wsum=0;
      recentHist.forEach((p,i)=>{
        const w=Math.pow(_decayRate,i); // i=0 is oldest, larger i = more weight
        _avgWeighted+=p*w;
        _wsum+=w;
      });
      const avgWeighted=_wsum>0?_avgWeighted/_wsum:50;
      // V134: POSTERIOR VOLATILITY CHECK — if posterior swung 20+ pts in last 30s, refuse lock
        // Catches the v5s-momentum-flip scenarios where trajectory whipsaws between UP and DOWN
        const _recentSpan=recentHist.length>=4?(Math.max(...recentHist.slice(-6))-Math.min(...recentHist.slice(-6))):0;
        const _posteriorVolatile=_recentSpan>=22;
        if(_posteriorVolatile&&clockSeconds>20){reasoning.push(`[STAB] Posterior volatile (${_recentSpan.toFixed(0)}pt range last 6 ticks) — locks suppressed`);}
      // bullCount/bearCount moved below — they need the effective thresholds, which depend on regime.

      // ── DOWN REGIME GATE ──────────────────────────────────────────────────
      // Data: DOWN in SHORT SQUEEZE = 50% WR (coin flip), DOWN in HVC = 48.4% WR (below coin flip)
      // Only trust DOWN in TRENDING DOWN (93%) and RANGE-CHOP (51%, still weak)
      // In SHORT SQUEEZE: DOWN requires 2× the normal consecutive samples AND stricter threshold
      // V138: SHORT SQUEEZE removed from _downGated. _upGated only includes HVC + RC,
      //       so this matches the UP side. The previous asymmetry made DOWN's lock threshold
      //       2 points tighter in SS (28 vs 30 / 26 vs 28).
      const _downGated=regime==='HIGH VOL CHOP'||regime==='RANGE-CHOP'; // V112: RC DOWN only 53% — gate it
      // V141: _downTDOnly variable removed — was unused after threshold rebuild.
      // V144 ROOT FIX: Threshold ladder rebuilt — UP side recalibrated for calibrated-posterior
      //                 space, DOWN side keeps V141 values since DOWN posterior calibration is null.
      //
      //   Mapping: raw → calibrated (UP side)
      //     raw 70 → cal 60  (was below 72, still below threshold mostly)
      //     raw 80 → cal 67  (used to clear most thresholds, now barely clears default 65)
      //     raw 90 → cal 87  (still strong)
      //
      //   New thresholds (in calibrated UP space, raw DOWN space):
      //     TRENDING DOWN  (favors DN)   UP ≥75 cal  DOWN ≤36 raw
      //     LONG SQUEEZE   (favors DN)   UP ≥75 cal  DOWN ≤36 raw
      //     RANGE-CHOP     (default)     UP ≥65 cal  DOWN ≤28 raw
      //     HIGH VOL CHOP  (default)     UP ≥65 cal  DOWN ≤28 raw
      //     TRENDING UP    (favors UP)   UP ≥60 cal  DOWN ≤20 raw
      //     SHORT SQUEEZE  (favors UP)   UP ≥60 cal  DOWN ≤20 raw
      //
      //   This maintains V143's firing balance (UP/DN ratio ~1.6x in seed) while making
      //   high-conf UP locks honest about their actual win probability.
      let _baseUpThr, _baseDnThr;
      if(regime==='TRENDING DOWN'||regime==='LONG SQUEEZE'){_baseUpThr=is15m?75:73; _baseDnThr=is15m?36:34;}
      else if(regime==='TRENDING UP'){_baseUpThr=is15m?60:58; _baseDnThr=is15m?20:22;}
      // V2.8: SHORT SQUEEZE UP threshold raised 60 → 64. Trade audit (53 trades) showed:
      //       - SS regime over-fires UP at 58% WR (24 trades, 14W)
      //       - 5 consecutive UP losses in 02:51-05:09 cluster, all FGT 0 or 1 (no consensus)
      //       - SS is supposed to be UP-favored but the favoritism was producing low-conviction firings
      //       The +4 makes UP slightly harder to fire in SS — should reduce noise locks while
      //       still allowing strong-conviction UP firings on real squeezes (posterior 70+).
      else if(regime==='SHORT SQUEEZE'){_baseUpThr=is15m?64:62; _baseDnThr=is15m?22:24;}
      // V2.8: RANGE-CHOP / HIGH VOL CHOP — symmetric thresholds. UP and DOWN now require equal conviction.
      //       Was UP 62 / DN 32 (12pt vs 18pt asymmetry favoring UP).
      //       Now UP 65 / DN 35 (both 15pt of conviction from neutral 50).
      //       Direct response to UP-bias pattern — UP fires too easily in unclear conditions.
      else {_baseUpThr=is15m?65:63; _baseDnThr=is15m?35:37;}
      const LOCK_THRESHOLD_DN_EFFECTIVE=_baseDnThr-_sessThreshAdj-_srThreshAdj;
      const LOCK_THRESHOLD_UP_EFFECTIVE=_baseUpThr+_sessThreshAdj+_srThreshAdj;
      // V141: Now we can compute bullCount/bearCount with the regime-aware effective thresholds.
      const bullCount=_posteriorVolatile?0:recentHist.filter(p=>p>=LOCK_THRESHOLD_UP_EFFECTIVE).length;
      const bearCount=_posteriorVolatile?0:recentHist.filter(p=>p<=LOCK_THRESHOLD_DN_EFFECTIVE).length;
      // Rebalanced: DOWN was too hesitant (+2), UP was firing too fast in weak regimes
      // DOWN now: +1 extra in gated regimes (not +2). UP: +1 in HVC/RC weak UP regimes.
      // V134: Gated regimes get +1 unless trajectory is strong (then no penalty)
      // V134: Match UP's sample requirement — was +1 in gated regimes, dropped that
      // (the gated regimes already get tighter threshold + signal-consensus bar)
      const CONSECUTIVE_NEEDED_DN=CONSECUTIVE_NEEDED;
      // UP gate: HIGH VOL CHOP and RANGE-CHOP UP calls need one extra sample too (55-59% WR)
      const _upGated=regime==='HIGH VOL CHOP'||regime==='RANGE-CHOP';
      // V134: UP gate skipped only when UP trajectory (positive trajectoryAdj) — was symmetric
      // Strong DOWN trajectory should NOT speed up UP locks
      // V135: Threshold lowered 8 → 7 to match new ±12 trajectory cap and gate consistency
      // V139: FGT 4/4 UP also bypasses the +1 sample penalty. Parallel to trajectory bypass.
      const _trajFavorsUp=eng.trajectoryAdj>=7;
      const _fgtFavorsUp=(eng.mtfAlignment||0)>=4;
      const CONSECUTIVE_NEEDED_UP=_upGated&&!_trajFavorsUp&&!_fgtFavorsUp
        ? Math.max(2,CONSECUTIVE_NEEDED+1)
        : CONSECUTIVE_NEEDED;
      // V134: ADD symmetric DOWN gate skip when DOWN trajectory is strong
      // (mirror of UP behavior — don't slow legitimate DOWN moves)
      // V135: Threshold lowered -8 → -7 for symmetry with UP side
      // V139: FGT 4/4 DOWN also enables the fast-track in choppy regimes.
      const _trajFavorsDn=eng.trajectoryAdj<=-7;
      const _fgtFavorsDn=(eng.mtfAlignment||0)<=-4;
      const _dnFastTrack=(_trajFavorsDn||_fgtFavorsDn)&&(regime==='RANGE-CHOP'||regime==='HIGH VOL CHOP');
      const CONSECUTIVE_NEEDED_DN_EFFECTIVE=_dnFastTrack
        ? Math.max(1,CONSECUTIVE_NEEDED-1) // give DOWN same shortcut UP gets
        : CONSECUTIVE_NEEDED_DN;

      // ── Phase 1: Pre-lock ──
      if(!lockedCallRef.current){
        const avgRecent=recentHist.reduce((a,b)=>a+b,0)/(recentHist.length||1);

        // Track first FORMING direction this window — commit to it, no flipping
        // V134: Whipsaw guard — track recent direction commitment, refuse small-move flips
        if(!windowSignalDirRef.current){
          if(avgRecent>=58)windowSignalDirRef.current='UP';
          else if(avgRecent<=42)windowSignalDirRef.current='DOWN';
        } else {
          // V134: Whipsaw guard with post-release relaxation
          // While locked → require decisive posterior (>=70 / <=30) to flip
          // After release (lock cleared) → allow flip at modest posterior (>=58 / <=42)
          //   because lock-release-then-opposite-direction is a valid recovery pattern
          const wantFlip=(windowSignalDirRef.current==='DOWN'&&avgRecent>=58)||(windowSignalDirRef.current==='UP'&&avgRecent<=42);
          const decisive=avgRecent>=70||avgRecent<=30;
          const moderate=avgRecent>=58||avgRecent<=42;
          const noActiveLock=!lockedCallRef.current;
          const allowedNow=decisive||(moderate&&noActiveLock);
          if(wantFlip&&!allowedNow){
            reasoning.push(`[WHIPSAW] Refusing flip from ${windowSignalDirRef.current} — posterior ${avgRecent.toFixed(0)} not decisive`);
          } else if(wantFlip&&allowedNow){
            reasoning.push(`[FLIP] Direction flip allowed at posterior ${avgRecent.toFixed(0)}${noActiveLock?' (post-release)':' (decisive)'}`);
            windowSignalDirRef.current=avgRecent>=50?'UP':'DOWN';
          }
        }
        const committedDir=windowSignalDirRef.current; // null until first FORMING signal

        // V140: DELIBERATION GATE REMOVED — was inverted (used `clockSeconds<X` where clockSeconds
        //       is time REMAINING, so it fired near the END of the window instead of the start, where
        //       the endgame freeze at clockSeconds<90 already blocks). Effectively dead code since V134
        //       — locks have been firing freely from second 1 (subject to all other gates) and we never
        //       missed the protection. Removing for clarity.
        // V134: Late lock allowed if trajectory is very strong (legitimate late breakouts)
        // V139: FGT 4/4 alignment also bypasses this. With FGT promoted to primary signal in V136,
        //       a 4/4 alignment in the late window is exactly the kind of high-conviction setup we want
        //       to lock — even if the kinematic trajectory is ambivalent.
        if(isVeryLateLock&&_trajStrength<10&&_fgtAlignAbs<4){
          taraAdviceRef.current=taraAdviceRef.current||'SEARCHING...';

        } else if(bullCount>=CONSECUTIVE_NEEDED_UP&&posterior>=LOCK_THRESHOLD_UP_EFFECTIVE&&!isEndgameLock&&!(eng.mtfAlignment!==undefined&&eng.mtfAlignment<=-3)){
          // V146.1 FIX A: Added `posterior>=LOCK_THRESHOLD_UP_EFFECTIVE` to mirror DOWN side's
          //   existing check. Previously UP could fire when historical samples cleared the
          //   threshold even if current posterior had since dropped back. DOWN required both
          //   simultaneously. This created a small UP-favoring asymmetry in wobbling markets.
          //   Now both directions require: samples-cleared AND current-posterior-still-confirming.
          // V134 extra logging: announce when MTF would've blocked
          if(eng.mtfAlignment!==undefined&&eng.mtfAlignment<=-2&&eng.mtfAlignment>-3)reasoning.push(`[MTF-WARN] UP lock proceeding but ${Math.abs(eng.mtfAlignment)}/5 timeframes against UP`);
          // ── Quality gate: suppress lock if score too low ──
          const _rm=regimeMemory[regime]||{wins:0,losses:0};
          const _rt=_rm.wins+_rm.losses;
          const _rWR=_rt>5?(_rm.wins/_rt)*100:60;
          const _sessQ={'EU':67,'ASIA':62,'US':57,'OFF-HOURS':55}[_sess]||57;
          const _dsAdj=getMarketSessions().dsAdj||0; // V114: day×session quality bonus/penalty
          const _streakAdj=streakData?.warning?(streakData.strongWarn?-15:-8):(streakData?.type==='hot'&&streakData?.streak>=4?+4:0); const _dirBiasUp=streakData?.upBias||0; if(_dirBiasUp!==0)reasoning.push(`[DIR-BIAS] UP recent WR adj: ${_dirBiasUp}`); // V134
          // V134: SURGICAL LATE-FOMO PENALTY — only when signals contradict
          const _isChoppyRegime=regime==='RANGE-CHOP'||regime==='SHORT SQUEEZE'||regime==='HIGH VOL CHOP';
          const _upSignalsAgreeing=Object.values(eng.rawSignalScores||{}).filter(s=>s>3).length;
          const _signalsUnanimous=_upSignalsAgreeing>=4;
          const _trajContradicts=eng.trajectoryAdj<0;
          const _lateFomoUp=isLateLockZone&&_isChoppyRegime&&posterior>=80&&(!_signalsUnanimous||_trajContradicts);
          const _veryLateFomoUp=isVeryLateLock&&_isChoppyRegime&&posterior>=78&&(!_signalsUnanimous||_trajContradicts);
          const _lateFomoPenalty=_veryLateFomoUp?-25:_lateFomoUp?-15:0;
          if(_lateFomoPenalty<0)reasoning.push(`[LATE-FOMO] Late UP in ${regime}, ${_upSignalsAgreeing}/6 signals agreeing — penalty ${_lateFomoPenalty}`);
          const _qScore=Math.min(40,Math.max(0,(Math.abs(posterior-50)-10)*1.6))+Math.min(30,(_rWR-50)*0.6)+Math.min(15,(_sessQ-50)*0.6)+_dsAdj+_streakAdj+_lateFomoPenalty+_dirBiasUp+(eng.windowDriftBps>25?-Math.min(12,eng.windowExhaustionPenalty||0):0)+(eng.realGapBps<-25?-Math.min(20,Math.abs(eng.realGapBps)*0.4):0)+(newsSentiment?(newsSentiment.score>2?+5:newsSentiment.score<-2?(-8):0):0)+(newsSentiment?.geoRisk>=0.5?-Math.round(8*newsSentiment.geoRisk):0)+(()=>{
            // V134: Sentiment-Trajectory interaction
            const tAdj=eng.trajectoryAdj||0;
            const sScore=newsSentiment?.score||0;
            // Both agree bullish: bonus
            if(tAdj>5&&sScore>2)return+5;
            // Strong disagreement (one says UP, other says DOWN)
            if(tAdj>5&&sScore<-2)return-8;
            if(tAdj<-5&&sScore>2)return-5;
            return 0;
          })(); // V114-V134: news sentiment + trajectory interaction for UP
          // V134: Signal consensus boost — when 5+ signals strongly agree, this IS A+
          const _consensusUp=Object.values(eng.rawSignalScores||{}).filter(s=>s>5).length;
          const _consensusBoost=_consensusUp>=5?+12:_consensusUp>=4?+5:0;
          if(_consensusBoost>0)reasoning.push(`[CONSENSUS] ${_consensusUp}/6 UP signals strongly agree — quality boost +${_consensusBoost}`);
          // V136: FGT QUALITY BOOST — primary signal contributes directly to quality gate.
          //       4/4 UP = +18 quality, 3/4 UP = +10, 2/4 UP = +4. Mirrors signal consensus boost.
          //       The score-side boost (mtfBonus) raises posterior, this raises quality so the
          //       same trade clears the choppy-regime quality≥62 gate.
          const _fgtUpQuality=(eng.mtfAlignment||0)>=4?18:(eng.mtfAlignment||0)>=3?10:(eng.mtfAlignment||0)>=2?4:0;
          if(_fgtUpQuality>0)reasoning.push(`[FGT-Q] FGT ${eng.mtfAlignment.toFixed(1)}/4 UP — quality boost +${_fgtUpQuality}`);
          // V145: Geopolitical / macro risk haircut. When dual-source news scanner picks up
          //       elevated geo/macro keywords with breaking-news recency, apply small quality penalty.
          //       Light mode — no full lockout.
          if(newsSentiment?.geoRisk>=0.5){
            const _geoCut=Math.round(8*newsSentiment.geoRisk);
            const _topic=(newsSentiment.geoTopic||'').slice(0,80);
            reasoning.push(`[GEO-RISK] News scanner flagged ${(newsSentiment.geoRisk*100).toFixed(0)}% risk — quality −${_geoCut}${_topic?' · '+_topic:''}`);
          }
          const _quality=Math.max(0,Math.min(100,_qScore+5+_consensusBoost+_fgtUpQuality));
          // V114: Macro event check — BLACKOUT and OBSERVE = no new locks
          const _macroUP=getMacroEventState();
          if(_macroUP.state==='BLACKOUT'){
            taraAdviceRef.current=`MACRO BLACKOUT (${_macroUP.event.name} in ${_macroUP.minutesUntil}m)`;
          } else if(_macroUP.state==='OBSERVE'){
            taraAdviceRef.current=`OBSERVING ${_macroUP.event.name}`;
          } else if(newsSentiment?.hasBreaking){
            taraAdviceRef.current='BREAKING NEWS — OBSERVE';
          } else if(_quality<45){
            taraAdviceRef.current='LOW QUALITY — SITTING OUT';
          } else if((eng.trajectoryAdj||0)<=-7&&(eng.mtfAlignment||0)<4){
            // V3.1.3: V2.8 FGT support gate REMOVED. Data audit on 56 trades showed it would have
            //   blocked 29 UP trades winning at 62% — ABOVE the overall 64% WR. The original 5-loss
            //   cluster (02:51-05:09) was a temporal artifact, not a structural failure mode.
            //   Gating against it was overcorrection that suppressed a winning category of trades.
            //   Other V2.8 changes (symmetric thresholds, SHORT SQUEEZE UP raised to 64,
            //   fast-track extended to FGT 3/4) remain in place — those addressed real measured
            //   asymmetries.
            // V135: Boundary fix — was `< -8`, missed trajectoryAdj exactly -8 (rare but possible).
            //       Threshold tightened -8 → -7 to match the symmetric DOWN side and respect the new ±12 cap.
            // V139: FGT 4/4 UP overrides this rejection. When all four timeframes scream UP,
            //       a backward-looking trajectory shouldn't be allowed to block the lock.
            taraAdviceRef.current='UP REJECTED — trajectory says DOWN';
            reasoning.push(`[GATE] UP blocked: trajectory ${eng.trajectoryAdj.toFixed(0)} contradicts UP call`);
          } else if(_isChoppyRegime&&_quality<50){
            // V134: choppy regime quality floor
            // V139: 62 → 55
            // V146.1 LOOSEN 3: 55 → 50. With FGT now contributing +18 to quality (V136), strong-FGT
            //       setups already clear ~73 quality on their own. Lowering to 50 mainly affects
            //       non-FGT marginal setups in choppy regimes — modest expansion.
            taraAdviceRef.current='WEAK SETUP — '+regime+' needs stronger signal';
            reasoning.push(`[GATE] UP blocked: quality ${_quality.toFixed(0)} < 50 in ${regime}`);
          } else {
          // ── Direction flip guard: if FORMING DOWN already fired, don't lock UP ──
          // V138: Premium Mode and the MTF Confluence gate it carried have been removed.
          //       Premium added asymmetric blocks (US session skip, weak RC skip, SS/HVC DOWN block,
          //       MTF cross-window veto). With FGT as the primary signal these were over-filtering.
          const dirAllowed=!committedDir||committedDir==='UP';
          if(!dirAllowed){
            taraAdviceRef.current='SEARCHING...';
          } else {
            // V113+V134: Momentum confirmation with velocity-adaptive tolerance
            // If trajectory strongly favors UP (trajectoryAdj > 5), be more permissive
            const recent=(velocityRef?.current?.v5s||0);
            const _momTol=velocityScalars?.momentumTol||0.5;
            const _trajFavorsUp=(eng.trajectoryAdj||0)>5;
            const _effectiveMomTol=_trajFavorsUp?_momTol*2.5:_momTol; // wider tolerance when trajectory agrees
            const momentumOK=recent>=-_effectiveMomTol;
            if(!momentumOK){
              taraAdviceRef.current='UP - WAITING FOR MOMENTUM';
            } else {
              lockedCallRef.current={dir:'UP',lockedAt:Date.now(),lockedPosterior:posterior,lockedRegime:regime,lockPrice:currentPrice,isLateLock:isLateLockZone,lockedSignals:eng.rawSignalScores?{...eng.rawSignalScores}:null}; // V134: snapshot signals at lock
              taraAdviceRef.current='UP - LOCKED';
              biasCountRef.current={UP:0,DOWN:0};
            }
          }
          } // close quality gate else

        // V137: SS/HVC DOWN block is now FGT-aware. Was unconditional unless rug-pull or 25+ bps adverse.
        //       Now: also overrideable by FGT 3/4+ DOWN alignment. With V136 FGT-as-primary and V135 SS
        //       price-action veto, the V112 assumption that "DOWN-in-SS is a coinflip" no longer holds —
        //       FGT alignment is strong enough evidence to overcome regime hesitancy.
        } else if((bearCount>=CONSECUTIVE_NEEDED_DN_EFFECTIVE||(isRugPull&&posterior<=45))&&posterior<=LOCK_THRESHOLD_DN_EFFECTIVE&&!isEndgameLock&&!(eng.mtfAlignment!==undefined&&eng.mtfAlignment>=3)){
          // V134: BACKTEST FINDING — DOWN locks in HVC/SS are coin flips (50% WR over 40 trades)
          // Refuse unless rug-pull active or significant gap below strike (>25bps)
          if(eng.mtfAlignment!==undefined&&eng.mtfAlignment>=2&&eng.mtfAlignment<3)reasoning.push(`[MTF-WARN] DOWN lock proceeding but ${eng.mtfAlignment}/5 timeframes against DOWN`);
          // ── Quality gate for DOWN ──
          const _rm2=regimeMemory[regime]||{wins:0,losses:0};
          const _rt2=_rm2.wins+_rm2.losses;
          const _rWR2=_rt2>5?(_rm2.wins/_rt2)*100:60;
          const _sessQ2={'EU':67,'ASIA':62,'US':57,'OFF-HOURS':55}[_sess]||57;
          const _dsAdj2=getMarketSessions().dsAdj||0;
          const _streakAdj2=streakData?.warning?(streakData.strongWarn?-15:-8):(streakData?.type==='hot'&&streakData?.streak>=4?+4:0); const _dirBiasDn=streakData?.dnBias||0; if(_dirBiasDn!==0)reasoning.push(`[DIR-BIAS] DOWN recent WR adj: ${_dirBiasDn}`);
          // V134: Surgical DOWN late-FOMO — V134: TRENDING DOWN bypasses entirely (87% WR setup)
          const _isChoppyRegime2=(regime==='RANGE-CHOP'||regime==='SHORT SQUEEZE'||regime==='HIGH VOL CHOP')&&regime!=='TRENDING DOWN';
          const _dnSignalsAgreeing=Object.values(eng.rawSignalScores||{}).filter(s=>s<-3).length;
          const _signalsUnanimous2=_dnSignalsAgreeing>=4;
          const _trajContradicts2=eng.trajectoryAdj>0;
          const _lateFomoDn=isLateLockZone&&_isChoppyRegime2&&posterior<=20&&(!_signalsUnanimous2||_trajContradicts2);
          const _veryLateFomoDn=isVeryLateLock&&_isChoppyRegime2&&posterior<=22&&(!_signalsUnanimous2||_trajContradicts2);
          const _lateFomoPenalty2=_veryLateFomoDn?-25:_lateFomoDn?-15:0;
          if(_lateFomoPenalty2<0)reasoning.push(`[LATE-FOMO] Late DOWN in ${regime}, ${_dnSignalsAgreeing}/6 signals agreeing — penalty ${_lateFomoPenalty2}`);
          const _qScore2=Math.min(40,Math.max(0,(Math.abs(posterior-50)-10)*1.6))+Math.min(30,(_rWR2-50)*0.6)+Math.min(15,(_sessQ2-50)*0.6)+_dsAdj2+_streakAdj2+_lateFomoPenalty2+_dirBiasDn+(eng.windowDriftBps<-25?-Math.min(12,eng.windowExhaustionPenalty||0):0)+(eng.realGapBps>25?-Math.min(20,Math.abs(eng.realGapBps)*0.4):0)+(newsSentiment?(newsSentiment.score<-2?+5:newsSentiment.score>2?(-8):0):0)+(newsSentiment?.geoRisk>=0.5?-Math.round(8*newsSentiment.geoRisk):0)+(()=>{
            const tAdj=eng.trajectoryAdj||0;
            const sScore=newsSentiment?.score||0;
            // Both agree bearish: bonus
            if(tAdj<-5&&sScore<-2)return+5;
            if(tAdj<-5&&sScore>2)return-8;
            if(tAdj>5&&sScore<-2)return-5;
            return 0;
          })(); // V114-V134: news sentiment + trajectory interaction for DOWN (inverted)
          const _consensusDn=Object.values(eng.rawSignalScores||{}).filter(s=>s<-5).length;
          const _consensusBoost2=_consensusDn>=5?+12:_consensusDn>=4?+5:0;
          if(_consensusBoost2>0)reasoning.push(`[CONSENSUS] ${_consensusDn}/6 DOWN signals strongly agree — quality boost +${_consensusBoost2}`);
          // V136: FGT QUALITY BOOST mirroring UP side
          const _fgtDnQuality=(eng.mtfAlignment||0)<=-4?18:(eng.mtfAlignment||0)<=-3?10:(eng.mtfAlignment||0)<=-2?4:0;
          if(_fgtDnQuality>0)reasoning.push(`[FGT-Q] FGT ${eng.mtfAlignment.toFixed(1)}/4 DOWN — quality boost +${_fgtDnQuality}`);
          // V145: Geopolitical / macro risk haircut (mirror of UP-side).
          if(newsSentiment?.geoRisk>=0.5){
            const _geoCut2=Math.round(8*newsSentiment.geoRisk);
            const _topic2=(newsSentiment.geoTopic||'').slice(0,80);
            reasoning.push(`[GEO-RISK] News scanner flagged ${(newsSentiment.geoRisk*100).toFixed(0)}% risk — quality −${_geoCut2}${_topic2?' · '+_topic2:''}`);
          }
          const _quality2=Math.max(0,Math.min(100,_qScore2+5+_consensusBoost2+_fgtDnQuality));
          const _macroDN=getMacroEventState();
          if(_macroDN.state==='BLACKOUT'){
            taraAdviceRef.current=`MACRO BLACKOUT (${_macroDN.event.name} in ${_macroDN.minutesUntil}m)`;
          } else if(_macroDN.state==='OBSERVE'){
            taraAdviceRef.current=`OBSERVING ${_macroDN.event.name}`;
          } else if(newsSentiment?.hasBreaking){
            taraAdviceRef.current='BREAKING NEWS — OBSERVE';
          } else if(_quality2<45){
            taraAdviceRef.current='LOW QUALITY — SITTING OUT';
          } else if((eng.trajectoryAdj||0)>=7&&(eng.mtfAlignment||0)>-4){
            // V3.1.3: V2.8 DOWN-side FGT support gate REMOVED, mirroring UP-side removal.
            //   Audit showed 3 DOWN-gated trades all won (100% WR). Same conclusion as UP side —
            //   the gate was overcorrection.
            // V135: Boundary fix mirroring UP side — was `> 8`, tightened to `>= 7`.
            // V139: FGT 4/4 DOWN overrides this rejection (mtfAlignment <= -4).
            taraAdviceRef.current='DOWN REJECTED — trajectory says UP';
            reasoning.push(`[GATE] DOWN blocked: trajectory ${eng.trajectoryAdj.toFixed(0)} contradicts DOWN`);
          } else if(_isChoppyRegime2&&_quality2<50){
            // V134/V139/V146.1: choppy quality floor 62 → 55 → 50 (mirror of UP side).
            taraAdviceRef.current='WEAK SETUP — '+regime+' needs stronger signal';
            reasoning.push(`[GATE] DOWN blocked: quality ${_quality2.toFixed(0)} < 50 in ${regime}`);
          } else {
          // ── Direction flip guard: if FORMING UP already fired, don't lock DOWN ──
          // V138: Removed the SS/HVC DOWN-block that required rug-pull / 25+bps adverse / FGT-3of4
          //       (V112 → V137 evolution). Was the last asymmetric block; UP had no equivalent.
          //       Score math (regime bonus, FGT contribution, signal alignment) is now the only
          //       directional filter. Premium Mode + MTF Confluence gate also removed.
          const dirAllowed=!committedDir||committedDir==='DOWN';
          if(!dirAllowed){
            taraAdviceRef.current='SEARCHING...';
          } else {
            // V113+V134: Trajectory-aware momentum confirmation
            const recent=(velocityRef?.current?.v5s||0);
            const _momTol=velocityScalars?.momentumTol||0.5;
            const _trajFavorsDn=(eng.trajectoryAdj||0)<-5;
            const _effectiveMomTol=_trajFavorsDn?_momTol*2.5:_momTol;
            const momentumOK=recent<=_effectiveMomTol;
            if(!momentumOK){
              taraAdviceRef.current='DOWN - WAITING FOR MOMENTUM';
            } else {
              lockedCallRef.current={dir:'DOWN',lockedAt:Date.now(),lockedPosterior:posterior,lockedRegime:regime,lockPrice:currentPrice,isLateLock:isLateLockZone,lockedSignals:eng.rawSignalScores?{...eng.rawSignalScores}:null,rugPullLock:isRugPull};
              if(isRugPull&&bearCount<CONSECUTIVE_NEEDED_DN)reasoning.push(`[RUG-FIRE] Rug pull detected — DOWN locked early at posterior ${posterior.toFixed(0)}`); // V134: snapshot signals at lock
              taraAdviceRef.current='DOWN - LOCKED';
              biasCountRef.current={UP:0,DOWN:0};
            }
          }
          } // close quality gate else

        } else {
          // V140: SMART DELIBERATION REMOVED — same inverted-variable issue as the lock-side gate.
          //       Was using `clockSeconds<_delibMin` which fires near end of window (clockSeconds = remaining).
          //       Removed to clean up the misleading "DELIBERATING — Xs left" display.
          // V134: SIT-OUT requires multiple confirmations of "no edge"
          // Not just weak signals — also weak FGT alignment AND no significant gap to strike
          const _upConsensus=Object.values(eng.rawSignalScores||{}).filter(s=>s>3).length;
          const _dnConsensus=Object.values(eng.rawSignalScores||{}).filter(s=>s<-3).length;
          const _signalsWeak=_upConsensus<3&&_dnConsensus<3;
          const _midPosterior=avgRecent>=44&&avgRecent<=56; // V134: tightened from 42-58 to 44-56
          const _pastDeliberation=timeFraction>0.35;
          // V134: FGT must also be ambiguous (≤2 timeframes aligned)
          const _fgtAmbiguous=Math.abs(eng.mtfAlignment||0)<=2;
          // V134: Gap must be small (price near strike, no clear directional pressure)
          const _gapSmall=Math.abs(eng.realGapBps||0)<20;
          const _shouldSitOut=_pastDeliberation&&_midPosterior&&_signalsWeak&&_fgtAmbiguous&&_gapSmall;
          // V134: Sticky sit-out releases on ANY clear signal
          // Old version only released on extreme posterior (>=68/<=32) — too strict
          // New: any of 3 conditions exit sit-out: posterior break, FGT clear, big gap
          // V136: FGT is primary — 2/4 alignment is enough to break out of sit-out (was 3/4).
          //       Even a moderate FGT signal should reset Tara from a sticky sit-out state and
          //       let her re-evaluate in the FGT-aligned direction.
          const _fgtClear=Math.abs(eng.mtfAlignment||0)>=2;
          const _gapBig=Math.abs(eng.realGapBps||0)>=25;
          const _posteriorBreak=avgRecent>=60||avgRecent<=40;
          const _exitSitOut=_fgtClear||_gapBig||_posteriorBreak;
          if(taraAdviceRef.current?.includes('SITTING OUT')&&!_exitSitOut){
            taraAdviceRef.current='SITTING OUT — Mixed signals, no edge';
          } else if(taraAdviceRef.current?.includes('SITTING OUT')&&_exitSitOut){
            // Exiting sit-out — log why and let the rest of the logic re-evaluate
            const reason=_fgtClear?`FGT now ${eng.mtfAlignment>0?'UP':'DOWN'} ${Math.abs(eng.mtfAlignment)}/4`:
                         _gapBig?`gap widened to ${eng.realGapBps.toFixed(0)}bps`:
                         `posterior moved to ${avgRecent.toFixed(0)}`;
            reasoning.push(`[SIT-OUT-EXIT] Releasing sit-out: ${reason}`);
            // Don't set state here — fall through to FORMING/SEARCHING below
          } else if(isVeryLateLock){
            taraAdviceRef.current='NO CALL';
          } else if(_shouldSitOut){
            taraAdviceRef.current='SITTING OUT — Mixed signals, no edge';
            reasoning.push(`[SIT-OUT] Mid-window posterior ${avgRecent.toFixed(0)}, consensus UP:${_upConsensus} DN:${_dnConsensus} — no edge`);
          } else {
            // V141: ANALYZING state with bounded search window.
            // For the first ~5-60s of a window (5m = 5-30s, 15m = 5-60s), explicitly show
            // ANALYZING instead of FORMING/SEARCHING. This signals to the trader that Tara is
            // actively scanning for direction. After the search window expires, fall through
            // to the regular FORMING/SEARCHING state machine.
            const _elapsedSec=Math.max(0,(is15m?900:300)-clockSeconds);
            const _searchMin=is15m?5:5;
            const _searchMax=is15m?60:30;
            // FGT alignment shortens the search — we already know the direction
            const _fgtAlignAbs2=Math.abs(eng.mtfAlignment||0);
            const _searchEnd=_fgtAlignAbs2>=4?_searchMin:_fgtAlignAbs2>=3?(_searchMin+10):_searchMax;
            const _inSearch=_elapsedSec<_searchEnd&&!eng.isRugPull&&eng.velocityRegime!=='EXTREME';
            if(_inSearch){
              const _secsRem=Math.max(1,_searchEnd-_elapsedSec);
              const _hint=avgRecent>=55?' · leaning UP':avgRecent<=45?' · leaning DOWN':'';
              taraAdviceRef.current=`ANALYZING — searching for signal [${_secsRem}s]${_hint}`;
            } else if(avgRecent>=58&&!isEndgameLock){
              taraAdviceRef.current=`UP (FORMING)${isLateLockZone?' LATE':''}`;
            } else if(avgRecent<=42&&!isEndgameLock){
              taraAdviceRef.current=`DOWN (FORMING)${isLateLockZone?' LATE':''}`;
            } else {
              taraAdviceRef.current='SEARCHING...';
            }
          }
        }
      }

      // ── Phase 2: Post-lock — check only EXTREME unlock conditions ──
      if(lockedCallRef.current){
        const lock=lockedCallRef.current;
        const gapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
        // V134: Posterior decay tracking
        const lockedPost=lock.lockedPosterior||50;
        const postDelta=lock.dir==='UP'?(lockedPost-posterior):(posterior-lockedPost);
        // V151: Posterior decay release with severity-tiered post-lock-stability handling.
        //
        //   Two thresholds:
        //     - SEVERE (postDelta >= 25): bypasses the 30s post-lock-stability window entirely.
        //       A 25+ pt collapse in <30s isn't noise — it's the underlying score moving against
        //       the lock fast. Holding through this is how Tara stayed in the V150 bad-lock case
        //       (locked at 87%, dropped to 57% within seconds, was stuck waiting for the 30s
        //       stability window to expire while gap turned adverse).
        //     - SOFT (postDelta >= 15): still requires 30s stability — small drops near lock time
        //       can be momentum-tick noise that recovers. Keeps prior V134/V135 behavior here.
        const _sinceLockMs=Date.now()-(lock.lockedAt||Date.now());
        const _postLockStable=_sinceLockMs>30000;
        const _severeCollapse=postDelta>=25;
        const decayCollapse=_severeCollapse||(postDelta>=15&&_postLockStable);
        // V135: Deep-adverse threshold lowered 55 → 30 bps. 55 bps on $75K BTC is a $400 move —
        //       by the time you're that far wrong, the round is already lost. 30 bps is enough
        //       adverse to recognize a broken call while still being above tick noise.
        const deepWrong=(lock.dir==='UP'&&gapBps<-30)||(lock.dir==='DOWN'&&gapBps>30);
        const catastrophicRugpull=(isRugPull&&showRugPullAlerts&&lock.dir==='UP')||(isRugPull&&lock.dir==='UP'&&posterior<10);
        // V140: Mirror — catastrophic upward spike releases DOWN locks immediately.
        //       Faster than waiting for deepWrong (gap > 30 bps adverse). Symmetric to rug-pull.
        const catastrophicSpike=(eng.isMoonshot&&lock.dir==='DOWN')||(eng.isMoonshot&&lock.dir==='DOWN'&&posterior>90);
        // V134: SIGNAL REGIME CHANGE DETECTION
        // If 3+ signals flip from agreeing to opposing the lock direction → release
        // Sharper than waiting for 20pt posterior collapse
        let signalRegimeChange=false;
        let flippedSignals=[];
        if(lock.lockedSignals&&eng.rawSignalScores&&_postLockStable){
          const lockSign=lock.dir==='UP'?1:-1;
          let flipCount=0;
          ['gap','momentum','structure','flow','technical','regime'].forEach(k=>{
            const at=lock.lockedSignals[k]||0;
            const now=eng.rawSignalScores[k]||0;
            // Was it agreeing with lock direction at lock time? Now opposing?
            const wasWith=Math.sign(at)===lockSign&&Math.abs(at)>3;
            const nowAgainst=Math.sign(now)===-lockSign&&Math.abs(now)>3;
            if(wasWith&&nowAgainst){flipCount++;flippedSignals.push(k);}
          });
          // 3+ signals flipped = real regime change, release the lock
          if(flipCount>=3)signalRegimeChange=true;
        }
        // V135: Trajectory flip threshold tightened -8/+8 → -7/+7 to match the entry gate.
        const trajFlipAgainst=(lock.dir==='UP'&&(eng.trajectoryAdj||0)<=-7&&_postLockStable)||
                              (lock.dir==='DOWN'&&(eng.trajectoryAdj||0)>=7&&_postLockStable);
        // V134: Lock release on FGT alignment flip (3+ timeframes now opposing)
        // V136: FGT is now the primary signal. Lock release fires earlier — was 3/4 against,
        //       now 2/4+ against (since FGT 4/4 was driving the lock decision in the first place,
        //       2/4+ flipping AWAY is meaningful and we want to release fast). Still gated by
        //       _postLockStable to avoid releasing on tick-noise immediately after lock.
        const fgtFlipAgainst=_postLockStable&&(
          (lock.dir==='UP'&&(eng.mtfAlignment||0)<=-2)||
          (lock.dir==='DOWN'&&(eng.mtfAlignment||0)>=2)
        );
        // V135: REGIME-CHANGE RE-VALIDATION — if the regime that justified the lock no longer holds
        //       AND trajectory is now leaning against the lock direction, release.
        //       Catches: locked UP in SHORT SQUEEZE, regime drifts to RANGE-CHOP, trajectory turns DOWN.
        const _bullishRegimes=['SHORT SQUEEZE','TRENDING UP'];
        const _bearishRegimes=['TRENDING DOWN'];
        const _lockedInBullishRg=_bullishRegimes.includes(lock.lockedRegime||'');
        const _lockedInBearishRg=_bearishRegimes.includes(lock.lockedRegime||'');
        const _nowInBullishRg=_bullishRegimes.includes(regime);
        const _nowInBearishRg=_bearishRegimes.includes(regime);
        const _trajLeansDn=(eng.trajectoryAdj||0)<=-5;
        const _trajLeansUp=(eng.trajectoryAdj||0)>=5;
        const regimeRevalidation=_postLockStable&&(
          (lock.dir==='UP'&&_lockedInBullishRg&&!_nowInBullishRg&&_trajLeansDn)||
          (lock.dir==='DOWN'&&_lockedInBearishRg&&!_nowInBearishRg&&_trajLeansUp)
        );
        if(deepWrong||catastrophicRugpull||catastrophicSpike||decayCollapse||signalRegimeChange||trajFlipAgainst||fgtFlipAgainst||regimeRevalidation){
          lockedCallRef.current=null;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};
          // V134: reset window-direction commitment so flip to opposite direction is allowed
          windowSignalDirRef.current=null;
          taraAdviceRef.current='LOCK RELEASED';
          if(catastrophicRugpull)reasoning.push(`[LOCK] Released — catastrophic rug pull (UP lock)`);
          else if(catastrophicSpike)reasoning.push(`[LOCK] Released — catastrophic upward spike (DOWN lock)`);
          else if(signalRegimeChange)reasoning.push(`[LOCK] Released — signal regime flipped (${flippedSignals.join(',')} now against ${lock.dir})`);
          else if(decayCollapse)reasoning.push(`[LOCK] Released — posterior decayed ${postDelta.toFixed(0)} pts since lock${_severeCollapse&&!_postLockStable?' (severe — bypassed stability window)':''}`);
          else if(trajFlipAgainst)reasoning.push(`[LOCK] Released — trajectory flipped against ${lock.dir} (${eng.trajectoryAdj.toFixed(0)})`);
          else if(fgtFlipAgainst)reasoning.push(`[LOCK] Released — FGT now ${eng.mtfAlignment>0?'UP':'DOWN'} ${Math.abs(eng.mtfAlignment)}/4 against ${lock.dir}`);
          else if(regimeRevalidation)reasoning.push(`[LOCK] Released — ${lock.lockedRegime} regime gone, trajectory ${(eng.trajectoryAdj||0).toFixed(0)} now leans ${lock.dir==='UP'?'DOWN':'UP'}`);
          else if(deepWrong)reasoning.push(`[LOCK] Released — adverse gap ${gapBps.toFixed(0)} bps past threshold`);
          else reasoning.push(`[LOCK] Released — extreme adverse gap (${gapBps.toFixed(0)} bps)`);
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
      // V137: When user is in a position, surface Tara's internal lock state so they can see
      //       if she's released or is screaming exit. Was: forced display to UP/DOWN-LOCKED
      //       regardless of internal state, which masked release events from the trader.
      let activePrediction;
      if(userPosition!==null){
        const _internal=taraAdviceRef.current||'';
        if(_internal==='LOCK RELEASED'){
          activePrediction=userPosition==='UP'?'UP - LOCK RELEASED':'DOWN - LOCK RELEASED';
        } else {
          activePrediction=userPosition==='UP'?'UP - LOCKED':'DOWN - LOCKED';
        }
      } else {
        activePrediction=taraAdviceRef.current;
      }
      let textColor='text-zinc-500';
      if(activePrediction.includes('UP - LOCKED'))textColor='text-emerald-400';
      else if(activePrediction.includes('DOWN - LOCKED'))textColor='text-rose-400';
      else if(activePrediction.includes('ANALYZING'))textColor='text-indigo-400'; // V141: bounded search state
      else if(activePrediction.includes('SITTING OUT'))textColor='text-amber-400';
      else if(activePrediction.includes('UP (FORMING)'))textColor='text-emerald-600';
      else if(activePrediction.includes('DOWN (FORMING)'))textColor='text-rose-600';
      else if(activePrediction==='LOCK RELEASED')textColor='text-amber-400';
      // V138: PREMIUM: textColor branch removed — Premium Mode no longer exists

      const isUP=activePrediction.includes('UP'),isDN=activePrediction.includes('DOWN');
      const currentOdds=(!isUP&&!isDN)?50:(isUP?posterior:(100-posterior));
      const offerVal=parseFloat(currentOffer)||0;
      const liveEstValue=isUP?maxPayout*(posterior/100):(isDN?maxPayout*((100-posterior)/100):0);
      const livePnL=offerVal>0?(offerVal-betAmount):(liveEstValue-betAmount);
      let kellyPct=0;
      if((isUP||isDN)&&betAmount>0&&maxPayout>betAmount){const b=(maxPayout-betAmount)/betAmount;const p=currentOdds/100;const k=((p*b)-(1-p))/b;kellyPct=Math.max(0,(k/2)*100);}

      // V110 Smart Advisor — lock-state-aware
      const _advisorResult=computeAdvisor({userPosition,positionStatus,currentOdds,offerVal,betAmount,maxPayout,clockSeconds,windowType,tickSlope,isRugPull,showRugPullAlerts,hasReversedRef,peakOfferRef,posterior,targetMargin,currentPrice,minsRemaining:timeState.minsRemaining,secsRemaining:timeState.secsRemaining,accel,pnlSlope,atrBps,activePrediction,regime,lockInfo:lockedCallRef.current?{dir:lockedCallRef.current.dir,lockedAt:lockedCallRef.current.lockedAt,lockedPosterior:lockedCallRef.current.lockedPosterior,lockPrice:lockedCallRef.current.lockPrice,lockRegime:lockedCallRef.current.lockedRegime}:null});

      // V145.2: HPotter-based projections for 5m / 15m / 1h panels
      //
      //   The previous projection model used a flat linear extrapolation:
      //     price = currentPrice * (1 + drift1m_bps_per_min * minutes_ahead)
      //   That ignores Tara's actual primary signal (FGT) and produces straight-line forecasts
      //   that disconnect from the engine's posterior call.
      //
      //   New model: blend HPotter Future Grand Trend with linear drift, weighted by
      //   FGT validity and proximity to the FGT's forecast horizon.
      //
      //   Mapping:
      //     5min panel  → 1m FGT (forecast horizon ~30 min)
      //     15min panel → 1m FGT extended (~30 min) + 3m FGT bias
      //     1hour panel → 3m FGT (forecast horizon ~90 min)
      //
      //   For each timestep t minutes ahead:
      //     - Compute FGT-implied price by linear interpolation from now → FGT horizon
      //     - Compute linear-drift price (legacy fallback)
      //     - Blend: weight=0.7 FGT when FGT valid + within horizon, else 0
      // V149: Projection rebuild — three sanity layers added to fix the "BTC moons by morning" bug.
      //
      //   1. VOLATILITY CAP: Cap projected move magnitude at 1.5× recent ATR per hour. ATR-based
      //      ceiling stops the linear-drift hockey-stick from running away. If projection wants to
      //      go +977bps over 7 hours but ATR says BTC's typical 1h range is ±50bps, we cap.
      //
      //   2. CONFIDENCE PATH-FADE: Multiply projected move by (confidence/100)^1.5. When confidence
      //      drops to 60%, the visible move shrinks to ~46% of raw HPotter target. This makes the
      //      bar visualization match Tara's actual certainty — no more big bars on low-confidence rows.
      //
      //   3. PANEL HORIZON LIMITS: 1-hour panel previously projected 8 hours forward. 3m HPotter
      //      forecast horizon is only 90 min. Now: 5m panel keeps 8 steps (fits within 1m HPotter's
      //      30 min horizon), 15m panel cap at 6 steps (90 min, within 3m HPotter), 1-hour panel
      //      cap at 3 steps (3 hours, with explicit "extrapolated" warning past horizon).
      const getHP=(msAgo)=>{const t=Date.now()-msAgo;const m=priceMemoryRef.current;if(!m||m.length===0)return currentPrice;let c=m[0];for(let i=m.length-1;i>=0;i--){if(m[i].time<=t){c=m[i];break;}}return c.p;};
      let trendBps=isNaN(drift1m)?0:drift1m;
      if(isUP&&trendBps<=0)trendBps=2;if(isDN&&trendBps>=0)trendBps=-2;

      // ATR-based 1-hour volatility envelope. Typical BTC 1h move is ~ATR × √60 (Brownian scaling).
      // V149: we use this to cap how far projections can drift from current price.
      const _atrNow=eng.atrBps||15; // fallback 15bps
      const oneHourEnvelopeBps=_atrNow*Math.sqrt(60); // ≈ 116bps typical 1h range when ATR=15
      // Absolute cap multiplier — projection can't exceed 1.5× the typical 1h envelope per hour.
      const VOL_CAP_MULT=1.5;

      // Pull HPotter forecasts for the projection horizons
      const fgt1m=eng.fgtResults?.['1m'];   // forecast ~30 min ahead
      const fgt3m=eng.fgtResults?.['3m'];   // forecast ~90 min ahead
      const fgt5m=eng.fgtResults?.['5m'];   // forecast ~200 min ahead — used for 1h panel as backup
      const fgt1mHorizonMin=30;
      const fgt3mHorizonMin=90;
      const fgt5mHorizonMin=200;

      // Returns a price for `minAhead` minutes from now, blending HPotter + linear drift,
      // capped by ATR-volatility envelope and faded by confidence.
      const projectPrice=(minAhead,primaryFgt,primaryHorizon,fallbackFgt,fallbackHorizon,confidence)=>{
        // Linear-drift baseline
        const linearPriceRaw=currentPrice*(1+(trendBps/10000)*minAhead);
        // Decide which FGT to use
        let fgt=null,horizon=null;
        if(primaryFgt&&primaryFgt.valid&&minAhead<=primaryHorizon*1.1){
          fgt=primaryFgt;horizon=primaryHorizon;
        } else if(fallbackFgt&&fallbackFgt.valid){
          fgt=fallbackFgt;horizon=fallbackHorizon;
        }
        let projectedPrice;
        if(!fgt||!fgt.valid){
          projectedPrice=linearPriceRaw;
        } else {
          const t=Math.min(1,minAhead/horizon);
          const fgtPrice=currentPrice+(fgt.fcast-currentPrice)*t;
          const fgtWeight=minAhead<=horizon?0.7:Math.max(0.3,0.7-((minAhead-horizon)/horizon)*0.4);
          projectedPrice=fgtPrice*fgtWeight+linearPriceRaw*(1-fgtWeight);
        }
        // V149 LAYER 1 — VOLATILITY CAP
        // Compute proposed move in bps
        const proposedMoveBps=((projectedPrice-currentPrice)/currentPrice)*10000;
        // Cap by typical 1h envelope, scaled by minutes-ahead. Sub-linear growth (sqrt) to reflect
        // that volatility doesn't accumulate linearly.
        const maxAbsMoveBps=VOL_CAP_MULT*oneHourEnvelopeBps*Math.sqrt(minAhead/60);
        const clampedMoveBps=Math.max(-maxAbsMoveBps,Math.min(maxAbsMoveBps,proposedMoveBps));
        // V149 LAYER 2 — CONFIDENCE PATH-FADE
        // Pull projected move toward zero based on Tara's confidence.
        // 90% conf → 0.85× weight, 70% conf → 0.59×, 60% conf → 0.46×, 50% conf → 0.35×.
        const confFactor=Math.pow(Math.max(0.3,(confidence||50)/100),1.5);
        const finalMoveBps=clampedMoveBps*confFactor;
        return currentPrice*(1+finalMoveBps/10000);
      };

      // Per-panel FGT routing + horizon limits
      const genTimeline=(min,steps,primaryFgt,primaryHorizon,fallbackFgt,fallbackHorizon,baseConf)=>{
        const out=[],iMs=min*60*1000,now=Date.now();
        let nT=Math.ceil(now/iMs)*iMs;
        if(nT-now<iMs*0.1)nT+=iMs;
        const tz=useLocalTime?undefined:{timeZone:'America/New_York'};
        for(let i=0;i<steps;i++){
          const sT=nT+(i*iMs);
          const minAhead=(sT-now)/60000;
          // Per-row confidence decays with distance from now
          const rowConf=Math.max(30,baseConf-i*4); // -4% per step
          const p=projectPrice(minAhead,primaryFgt,primaryHorizon,fallbackFgt,fallbackHorizon,rowConf);
          const d=new Date(sT);
          let ts=`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
          try{ts=d.toLocaleTimeString('en-US',{...tz,hour12:true,hour:'numeric',minute:'2-digit'});}catch(e){}
          // V149 LAYER 3: Mark rows beyond model horizon as 'extrapolated'
          const extrapolated=minAhead>primaryHorizon&&(!fallbackFgt||!fallbackFgt.valid||minAhead>fallbackHorizon);
          out.push({timeStr:ts,timestamp:Math.floor(sT/1000),price:p,extrapolated});
        }
        return out;
      };
      // V149: 5-MIN — 8 steps × 5min = 40 min total (well within 1m HPotter horizon)
      // V149: 15-MIN — 6 steps × 15min = 90 min total (matches 3m HPotter horizon — was 8 steps = 120 min)
      // V149: 1-HOUR — 3 steps × 60min = 180 min total (within 3m HPotter horizon — was 8 steps = 480 min!)
      const t5=genTimeline(5,8,fgt1m,fgt1mHorizonMin,fgt3m,fgt3mHorizonMin,Math.min(95,posterior+5));
      const t15=genTimeline(15,6,fgt1m,fgt1mHorizonMin,fgt3m,fgt3mHorizonMin,posterior);
      const t60=genTimeline(60,3,fgt3m,fgt3mHorizonMin,fgt5m,fgt5mHorizonMin,Math.max(40,posterior-15));
      const projections=[
        {id:'5m',time:'5 MIN',price:t5[0]?.price||currentPrice,conf:Math.min(95,posterior+5),timeline:t5,fgtSrc:fgt1m?.valid?'1m HPotter':'linear'},
        {id:'15m',time:'15 MIN',price:t15[0]?.price||currentPrice,conf:posterior,timeline:t15,fgtSrc:fgt1m?.valid?'1m HPotter→3m':'linear'},
        {id:'1h',time:'1 HOUR',price:t60[0]?.price||currentPrice,conf:Math.max(40,posterior-15),timeline:t60,fgtSrc:fgt3m?.valid?'3m HPotter':'linear'},
      ];

      // Multi-timeframe confluence: check if the OTHER timeframe has a recent lock in same direction
      const _otherTF=windowType==='15m'?'5m':'15m';
      const _otherLock=mtfLocksRef.current[_otherTF];
      const _thisLock=lockedCallRef.current;
      const mtfAligned=_thisLock&&_otherLock&&_otherLock.dir===_thisLock.dir&&(Date.now()-_otherLock.lockedAt)<20*60*1000;
      const mtfOpposed=_thisLock&&_otherLock&&_otherLock.dir!==_thisLock.dir&&(Date.now()-_otherLock.lockedAt)<20*60*1000;
      // V138: expose session info for UI badge
      const _sessInfo=getMarketSessions();
      return{confidence:String(isDN?(100-posterior).toFixed(1):posterior.toFixed(1)),prediction:String(activePrediction),textColor:String(textColor),rawProbAbove:Number(posterior),regime:String(regime),session:String(_sessInfo.dominant),sessionDayRating:String(_sessInfo.dsRating),sessionDayKey:String(_sessInfo.dsKey),sessionDayAdj:Number(_sessInfo.dsAdj),velocityRegime:String(velocityRegime||'NORMAL'),trajectoryAdj:Number(eng.trajectoryAdj||0),projectedPrice:Number(eng.projectedPrice||0),projectedGapBps:Number(eng.projectedGapBps||0),reasoning,atrBps:Number(atrBps),realGapBps:Number(realGapBps),clockSeconds:Number(clockSeconds),isSystemLocked:Boolean(isEndgameLock),isPostDecay:Boolean(isPostDecay),isRugPull:Boolean(isRugPull),bb,livePnL:Number(livePnL),liveEstValue:Number(liveEstValue),kellyPct:Number(kellyPct),projections,advisor:_advisorResult,currentOdds:Number(currentOdds),aggrFlow:Number(aggrFlow),isEarlyWindow:Boolean(isEarlyWindow),consecutive:eng.consecutive,volRatio:Number(eng.volRatio),mtfAligned:Boolean(mtfAligned),mtfOpposed:Boolean(mtfOpposed),isLateLockZone:Boolean(isLateLockZone),isVeryLateLock:Boolean(isVeryLateLock),consecutiveNeeded:Number(CONSECUTIVE_NEEDED),
        // V148.1: surface rawSignalScores and mtfAlignment to consumers (V147 Score Breakdown
        //         panel was reading these but they weren't in the return — every bar showed 0).
        rawSignalScores:eng.rawSignalScores||{},
        mtfAlignment:eng.mtfAlignment,
        fgtResults:eng.fgtResults||{},
        rangeBps:Number(eng.rangeBps||0), // V152
        lockInfo:lockedCallRef.current?{dir:lockedCallRef.current.dir,lockedAt:lockedCallRef.current.lockedAt,lockedPosterior:lockedCallRef.current.lockedPosterior,lockPrice:lockedCallRef.current.lockPrice,lockRegime:lockedCallRef.current.lockedRegime}:null,
        bullCount:Number(bullCount),bearCount:Number(bearCount)};
    }catch(err){return{prediction:'ERROR',rawProbAbove:50,projections:[],reasoning:[err.stack||String(err)],textColor:'text-rose-500',advisor:{label:'MATH CRASH',reason:String(err),color:'rose',animate:false,hasAction:false},regime:'ERROR'};}
  },[currentPrice,liveHistory,targetMargin,timeState.minsRemaining,timeState.secsRemaining,timeState.currentHour,orderBook,forceRender,betAmount,maxPayout,currentOffer,globalFlow,userPosition,windowType,isMounted,showRugPullAlerts,positionStatus,velocityRef,bloomberg,useLocalTime,regimeMemory,regimeWeights,strikeConfirmed]);

  // ── QUALITY GATE — plain function call, no useMemo to avoid any TDZ risk ──
  const _computeQuality=(ana,regMem)=>{
    if(!ana)return{score:0,label:'LOW',color:'rose'};
    try{
      const rg=ana.regime||'RANGE-CHOP';
      const rm=regMem[rg]||{wins:0,losses:0};
      const rt=rm.wins+rm.losses;
      const rWR=rt>5?(rm.wins/rt)*100:60;
      const sWR={'EU':67,'ASIA':62,'US':57,'OFF-HOURS':55}[getMarketSessions().dominant]||57;
      const pt=ana.rawProbAbove||50;
      const ps=Math.min(40,Math.max(0,(Math.abs(pt-50)-15)*1.6));
      const cp=ana.isVeryLateLock?-20:ana.isLateLockZone?-8:0;
      const raw=ps+Math.min(30,(rWR-50)*0.6)+Math.min(15,(sWR-50)*0.6)+(ana.lockInfo?.dir==='UP'?4:0)+cp;
      const score=Math.max(0,Math.min(100,raw+5));
      return{score,label:score>=75?'HIGH':score>=55?'MODERATE':'LOW',color:score>=75?'emerald':score>=55?'amber':'rose'};
    }catch(e){return{score:0,label:'LOW',color:'rose'};}
  };
  const qualityGate=_computeQuality(analysis,regimeMemory);

  // ── LOCK BROADCAST EFFECT — Two-stage: SIGNAL fires when FORMING, LOCK fires on commit ──
  const lastBroadcastLockRef=useRef(null);
  const lastSignalBroadcastRef=useRef(null); // track forming signal broadcasts
  useEffect(()=>{
    if(!analysis?.lockInfo)return;
    const lock=analysis.lockInfo;
    if(lastBroadcastLockRef.current===lock.lockedAt)return;
    lastBroadcastLockRef.current=lock.lockedAt;
    // Record this lock for multi-timeframe confluence tracking
    mtfLocksRef.current[windowType]={dir:lock.dir,lockedAt:lock.lockedAt,posterior:lock.lockedPosterior};
    // ── STAGE 2: LOCK confirmed — broadcast the actionable call ──
    const wins=scorecards[windowType]?.wins||0,losses=scorecards[windowType]?.losses||0;
    const record=`${wins}W-${losses}L-${windowType}`;
    // V113: SUPPRESSED auto-broadcast for LOCK — user must click "Send to Discord"
    // Sound alert still plays so user knows the lock fired
    playAlert(lock.dir==='UP'?'lock-up':'lock-down');
  },[analysis?.lockInfo?.lockedAt]);

  // V134: Audio alerts for trajectory milestones, breaking news, MTF confluence
  const prevTrajRef=useRef(0);
  const prevBreakingRef=useRef(false);
  const prevMtfRef=useRef(false);
  useEffect(()=>{
    if(!soundEnabled)return;
    // Trajectory crossed +12 or -12 threshold
    const traj=analysis?.trajectoryAdj||0;
    const prev=prevTrajRef.current;
    if(Math.abs(traj)>=12&&Math.abs(prev)<12){
      playAlert('entry'); // strong directional move detected
    }
    prevTrajRef.current=traj;
  },[analysis?.trajectoryAdj]);
  useEffect(()=>{
    if(!soundEnabled)return;
    if(newsSentiment?.hasBreaking&&!prevBreakingRef.current){
      playAlert('warning'); // breaking news detected
    }
    prevBreakingRef.current=newsSentiment?.hasBreaking||false;
  },[newsSentiment?.hasBreaking]);
  useEffect(()=>{
    if(!soundEnabled)return;
    // MTF confluence: 5m and 15m both locked same direction recently
    const otherTF=windowType==='5m'?'15m':'5m';
    const otherLock=mtfLocksRef.current[otherTF];
    const myLock=analysis?.lockInfo;
    const fresh=otherLock&&(Date.now()-otherLock.lockedAt)<20*60*1000;
    const aligned=fresh&&myLock&&otherLock.dir===myLock.dir;
    if(aligned&&!prevMtfRef.current){
      playAlert('profit'); // MTF agreement - high conviction
    }
    prevMtfRef.current=aligned||false;
  },[analysis?.lockInfo?.lockedAt,windowType]);

  // ── STAGE 1: SIGNAL broadcast when FORMING is first detected ──
  const lastFormingBroadcastRef=useRef(null);
  useEffect(()=>{
    if(!analysis?.prediction)return;
    const isForming=analysis.prediction.includes('FORMING');
    if(!isForming)return;
    const dir=analysis.prediction.includes('UP')?'UP':'DOWN';
    // One SIGNAL broadcast per direction per window — use window start time as key
    const formingKey=`${timeState.startWindow||timeState.nextWindow}`; // 1 broadcast per window total
    if(lastFormingBroadcastRef.current===formingKey)return;
    // V113: SUPPRESSED auto-broadcast for SIGNAL/FORMING — user must click "Send to Discord"
    // Just mark as broadcasted to prevent repeats; actual broadcast is manual
    lastFormingBroadcastRef.current=formingKey;
  },[analysis?.prediction]);

  // ── WHALE AUTO-BROADCAST ─────────────────────────────────────────────────
  // Only fires when: streak ≥4 AND net delta >$500K AND 5-min cooldown passed
  // Also checks spot/futures alignment for accuracy flag
  const lastWhaleBroadcastRef=useRef({time:0,dir:null});
  // ── V134: FLOW INTELLIGENCE — STRICTLY EVENT-TRIGGERED ──────────────
  // Opens ONLY on concerning events. Auto-collapses after 30s unless activity continues.
  // Triggers: whale-print STRONG cross, streak ≥5, $750K delta, velocity regime jump,
  // per-exchange divergence spike, sudden order book wall flip.
  const prevStreakRef=useRef(0);
  const prevScoreRef=useRef(0);
  const prevVelRegimeRef=useRef('NORMAL');
  const prevDeltaSignRef=useRef(0);
  const autoOpenedRef=useRef(false);
  const autoCloseTimerRef=useRef(null);
  const lastAutoOpenTimeRef=useRef(0);
  const lastActivityAtRef=useRef(0); // V134: track when last meaningful activity happened
  useEffect(()=>{
    const fs=flowSignal;
    const now=Date.now();
    // V148.1: Cooldown raised 30s → 60s. Was opening too frequently.
    const sinceLastOpen=now-lastAutoOpenTimeRef.current;
    if(sinceLastOpen<60000)return;
    const prevStreak=prevStreakRef.current;
    const curDelta=fs.netDelta90s||0;
    const curDeltaSign=curDelta>=0?1:-1;
    // ── V148.1: Auto-open ONLY on concerning whale activity ──
    //   Removed triggers (too noisy, fire on non-whale events):
    //     - justHitStrong (flow score 80+) — opens on any strong tape, not specifically whale
    //     - deltaFlip — flutters constantly in choppy markets
    //     - velRegimeJump — velocity has nothing to do with whales
    //     - exchangeDiverge — 5bps Binance/Bybit gap is normal microstructure
    //   Remaining triggers — genuine whale events:
    const massiveWhale=Math.abs(curDelta)>=1000000;        // V148.1: $750K → $1M (was firing too often)
    const sustainedWhaleStreak=fs.streakCount>=7&&prevStreak<7;  // V148.1: 5 → 7 (need sustained pressure)
    // Update prev refs (track all so future logic can still reference)
    prevScoreRef.current=fs.score;
    prevStreakRef.current=fs.streakCount;
    prevDeltaSignRef.current=curDeltaSign;
    prevVelRegimeRef.current=analysis?.velocityRegime||'NORMAL';
    const triggered=massiveWhale||sustainedWhaleStreak;
    if(triggered){
      setShowWhaleLog(true);
      autoOpenedRef.current=true;
      lastAutoOpenTimeRef.current=now;
      lastActivityAtRef.current=now;
      // V134: 30 second view window unless new activity — extends timer if more triggers
      if(autoCloseTimerRef.current)clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current=setTimeout(()=>{
        if(autoOpenedRef.current){
          // Check if there was activity in the last 5 seconds — if so, extend
          const sinceActivity=Date.now()-lastActivityAtRef.current;
          if(sinceActivity<5000){
            // Extend by another 10s
            autoCloseTimerRef.current=setTimeout(()=>{
              if(autoOpenedRef.current){setShowWhaleLog(false);autoOpenedRef.current=false;}
            },10000);
          } else {
            setShowWhaleLog(false);
            autoOpenedRef.current=false;
          }
        }
      },30000);
    }
    return()=>{if(autoCloseTimerRef.current)clearTimeout(autoCloseTimerRef.current);};
  },[flowSignal.score,flowSignal.streakCount,flowSignal.netDelta90s,flowSignal.bnDivBps,analysis?.velocityRegime]);

  // V2.2.2: Manual-open auto-close. When user manually clicks FLOW to open the panel,
  //         start a 90s idle timer. Resets on real whale activity (score or streak rising).
  //         Without this, the panel stayed open indefinitely after any manual click — visible
  //         and obstructive long after the user had moved on.
  // V2.3 / V3.1.2: Manual-open auto-close. When user manually clicks FLOW to open the panel,
  //         start a 90s idle timer. Resets on real whale activity (score or streak rising).
  //         V3.1.2 BUGFIX: Previous version re-ran the effect on every flowSignal change,
  //         which meant the timer was being cleared and reset on every scoring tick (constant
  //         activity in live markets). Now the effect only depends on showWhaleLog itself,
  //         and reads flowSignal through a ref inside the timer callback.
  const manualCloseTimerRef=useRef(null);
  const lastFlowSignalActivityRef=useRef({score:0,streak:0});
  const flowSignalRef=useRef(flowSignal);
  useEffect(()=>{flowSignalRef.current=flowSignal;},[flowSignal]);
  useEffect(()=>{
    if(!showWhaleLog){
      // Panel closed — clear the idle timer
      if(manualCloseTimerRef.current){clearTimeout(manualCloseTimerRef.current);manualCloseTimerRef.current=null;}
      return;
    }
    // Only set the manual auto-close when this open was NOT triggered by autoOpen
    if(autoOpenedRef.current)return;
    // Initialize activity baseline from current flowSignal at open
    const fs0=flowSignalRef.current||{};
    lastFlowSignalActivityRef.current={score:fs0.score||0,streak:fs0.streakCount||0};
    if(manualCloseTimerRef.current)clearTimeout(manualCloseTimerRef.current);
    const _scheduleClose=(delayMs)=>{
      manualCloseTimerRef.current=setTimeout(()=>{
        const cur={score:flowSignalRef.current?.score||0,streak:flowSignalRef.current?.streakCount||0};
        const last=lastFlowSignalActivityRef.current;
        const meaningfulActivity=Math.abs(cur.score-last.score)>=15||cur.streak-last.streak>=3;
        if(meaningfulActivity){
          // Real activity — extend by another 60s
          lastFlowSignalActivityRef.current=cur;
          _scheduleClose(60000);
        } else {
          setShowWhaleLog(false);
        }
      },delayMs);
    };
    _scheduleClose(90000);
    return()=>{if(manualCloseTimerRef.current)clearTimeout(manualCloseTimerRef.current);};
  },[showWhaleLog,setShowWhaleLog]);

  useEffect(()=>{
    if(!showWhaleAlerts||!discordWebhook)return;
    const fs=flowSignal;
    // Strict thresholds to prevent spam and noise
    if(fs.streakCount<4)return;              // need 4+ consecutive prints
    if(Math.abs(fs.netDelta90s)<500000)return; // need $500K+ net delta
    const now=Date.now();
    const cooldown=5*60*1000; // 5 minutes between whale broadcasts
    if(now-lastWhaleBroadcastRef.current.time<cooldown)return;
    if(lastWhaleBroadcastRef.current.dir===fs.streakDir&&now-lastWhaleBroadcastRef.current.time<cooldown*2)return;
    lastWhaleBroadcastRef.current={time:now,dir:fs.streakDir};

    // Spot alignment check: is Coinbase spot flowing same way as futures?
    const tape=tapeRef.current;
    const spotNet=tape.coinbase.buys-tape.coinbase.sells;
    const futuresNet=(tape.binanceFutures.buys-tape.binanceFutures.sells)+(tape.bybit.buys-tape.bybit.sells);
    const spotAligned=spotNet!==0&&Math.sign(spotNet)===Math.sign(futuresNet);

    // Exchange breakdown (only exchanges with >$100K activity)
    const exchanges={};
    const exchangeCounts={};
    const bnNet=tape.binanceFutures.buys-tape.binanceFutures.sells;
    const byNet=tape.bybit.buys-tape.bybit.sells;
    const cbNet=tape.coinbase.buys-tape.coinbase.sells;
    if(Math.abs(bnNet)>100000){exchanges['Binance']=bnNet;exchangeCounts['Binance']=Math.max(1,Math.round(Math.abs(bnNet)/200000));}
    if(Math.abs(byNet)>100000){exchanges['Bybit']=byNet;exchangeCounts['Bybit']=Math.max(1,Math.round(Math.abs(byNet)/200000));}
    if(Math.abs(cbNet)>100000){exchanges['Coinbase']=cbNet;exchangeCounts['Coinbase']=Math.max(1,Math.round(Math.abs(cbNet)/200000));}
    const exCount=Object.keys(exchanges).length||1;

    const recentPrints=whaleLog.slice(0,fs.streakCount);
    const totalBuy=recentPrints.filter(w=>w.side==='BUY').reduce((a,w)=>a+w.usd,0);
    const totalSell=recentPrints.filter(w=>w.side==='SELL').reduce((a,w)=>a+w.usd,0);
    const biggest=Math.max(...recentPrints.map(w=>w.usd),0);

    broadcastToDiscord('WHALE',{
      netFlow:fs.netDelta90s,
      totalVol:fs.streakUSD,
      tradeCount:fs.streakCount,
      exchangeCount:exCount,
      exchanges,exchangeCounts,
      totalBuy,totalSell,biggest,
      spotAligned,
      price:currentPrice,
      clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`
    });
  },[flowSignal.streakCount,flowSignal.streakDir]);

  // ── ADVISOR SOUND ALERTS — fires when advisor label changes to something critical ──
  const lastAdvisorLabelRef=useRef('');
  useEffect(()=>{
    const label=analysis?.advisor?.label||'';
    if(!label||label===lastAdvisorLabelRef.current)return;
    lastAdvisorLabelRef.current=label;
    if(label.includes('ENTRY SIGNAL'))                playAlert('entry');
    else if(label.includes('TAKE MAX PROFIT')||label.includes('TRAILING STOP')||label.includes('SCALP PROFIT')||label.includes('SECURE PROFIT')||label.includes('MAX PROFIT ZONE'))
                                                       playAlert('profit');
    else if(label.includes('CUT LOSSES'))              playAlert('warning');
    else if(label.includes('STOP HIT')||label.includes('RUG PULL')||label.includes('EXIT NOW'))
                                                       playAlert('emergency');
  },[analysis?.advisor?.label]);

  const handleManualSync=(dir)=>{
    // If switching sides mid-trade: broadcast LOSS for exited trade FIRST, then open new
    if(userPosition!==null&&userPosition!==dir){
      hasReversedRef.current=true;
      if(pendingTradeRef.current&&pendingTradeRef.current.result===null){
        // Score and log the exited trade as LOSS immediately
        const exitLog={...pendingTradeRef.current,result:'LOSS',closingPrice:currentPrice,strikePrice:targetMargin,reversed:true,
          closingGapBps:targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0,
          kalshiAtClose:kalshiYesPrice!=null?Number(kalshiYesPrice):null,
          resolvedTimestampISO:new Date().toISOString()};
        const newLog1=[...tradeLogRef.current,exitLog];
        saveTradeLog(newLog1);setTradeLog(newLog1);
        (()=>{const _newW=updateWeights(adaptiveWeights,newLog1,'LOSS');const _diffs=computeWeightDiff(adaptiveWeights,_newW);setAdaptiveWeights(_newW);if(_diffs.length>0)setLastLearningUpdate({result:'LOSS',diffs:_diffs,at:Date.now()});})();
        setRegimeWeights(prev=>updateRegimeWeights(prev,exitLog,'LOSS'));
        updateScore(windowType,'losses',1);
        // Broadcast the LOSS for the trade being exited — before the new entry
        const gapBpsExit=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
        broadcastToDiscord('EXIT',{
          result:'LOSS',
          action:`REVERSED — exiting ${userPosition}`,
          price:currentPrice,
          strike:targetMargin,
          gap:gapBpsExit,
          clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`,
          regime:lastRegimeRef.current,
          dir:userPosition,
        });
        pendingTradeRef.current=null;
      }
    }
    if(userPosition===dir){taraAdviceRef.current='SEARCHING...';setUserPosition(null);setPositionEntry(null);setForceRender(p=>p+1);return;}
    taraAdviceRef.current=String(dir);setUserPosition(String(dir));
    if(currentPrice){
      setPositionEntry({price:currentPrice,side:dir,time:Date.now()});
      const gapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
      // V145: Expanded trade telemetry. Previously only stored {id, dir, posterior, regime,
      //       clockAtLock, hour, session, windowType, signals, result, betAmt, maxPay}.
      //       Missing: entry price (you can't analyze gap behavior without it), strike at lock
      //       (only resolution-time strike was kept), Kalshi context (so we can verify edge),
      //       FGT alignment (the primary signal!), raw vs calibrated posterior split.
      const eng=lockedCallRef.current;
      pendingTradeRef.current={
        id:Date.now(),dir,
        posterior:eng?.lockedPosterior||analysis?.rawProbAbove||50, // calibrated posterior at lock
        rawPosterior:analysis?.rawPosterior||analysis?.rawProbAbove||50, // V145: pre-calibration posterior
        regime:lastRegimeRef.current,
        clockAtLock:timeState.minsRemaining*60+timeState.secsRemaining,
        hour:new Date().getHours(),session:getMarketSessions().dominant,windowType,
        signals:analysis?.rawSignalScores||{},result:null,
        betAmt:betAmount||0,maxPay:maxPayout||0,
        // V145 NEW FIELDS
        entryPrice:currentPrice||0,                              // BTC price when we entered
        strikeAtLock:targetMargin||0,                            // strike at the moment of lock
        gapAtEntry:gapBps,                                       // bps gap to strike at entry
        kalshiAtLock:kalshiYesPrice!=null?Number(kalshiYesPrice):null, // Kalshi YES price (UP %) at lock
        fgtAlignment:analysis?.mtfAlignment||0,                  // -4 to +4 multi-timeframe FGT
        rangeBps:analysis?.rangeBps||0,                          // V152: range position at lock (σ from window open)
        geoRisk:newsSentiment?.geoRisk||0,                       // V145: geo/macro risk at lock (0-1)
        geoTopic:newsSentiment?.geoTopic||null,                  // V145: top headline driving the risk
        windowOpenPrice:windowOpenPriceRef.current||0,           // BTC at window start
        qualityScore:qualityGate?.score||null,                   // Tara's quality gate score
        timestampISO:new Date().toISOString(),                   // wall-clock for date analysis
      };
      // Broadcast the new entry after the reversal loss
      broadcastToDiscord('LOCK',{dir,price:currentPrice,strike:targetMargin,gap:gapBps,clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`,regime:lastRegimeRef.current,posterior:analysis?.rawProbAbove||0});
    }
    setForceRender(p=>p+1);
  };

  const executeAction=(target,advisorLabel)=>{
    if(target==='UP'||target==='DOWN'){handleManualSync(target);return;}
    if(target==='CASH'||target==='SIT OUT'){
      const hasActiveLock=taraAdviceRef.current.includes('LOCKED');
      const gapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
      const result=target==='CASH'?'WIN':'LOSS';
      if(hasActiveLock&&manuallyClosedRef.current===null){
        manuallyClosedRef.current=result;
        if(result==='WIN')updateScore(windowType,'wins',1);
        else updateScore(windowType,'losses',1);
        if(pendingTradeRef.current&&pendingTradeRef.current.result===null){
          const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin,earlyExit:true,
            closingGapBps:targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0,
            kalshiAtClose:kalshiYesPrice!=null?Number(kalshiYesPrice):null,
            resolvedTimestampISO:new Date().toISOString()};
          const newLog=[...tradeLogRef.current,resolvedTrade];
          saveTradeLog(newLog);setTradeLog(newLog);
          (()=>{const _newW=updateWeights(adaptiveWeights,newLog,result);const _diffs=computeWeightDiff(adaptiveWeights,_newW);setAdaptiveWeights(_newW);if(_diffs.length>0)setLastLearningUpdate({result,diffs:_diffs,at:Date.now()});})();
          setRegimeWeights(prev=>updateRegimeWeights(prev,resolvedTrade,result));
          recordPnL(result==='WIN',resolvedTrade);
          pendingTradeRef.current=null;
        }
        // Broadcast exit/switch action since user explicitly confirmed it
        broadcastToDiscord('EXIT',{result,action:advisorLabel||target,price:currentPrice,strike:targetMargin,gap:gapBps,clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`,regime:lastRegimeRef.current});
      }
      setUserPosition(null);setPositionEntry(null);setCurrentOffer('');
      taraAdviceRef.current='CLOSED';
      setForceRender(p=>p+1);
    }
  };

  // V113: Manual Discord broadcast — user clicks OK button to send a signal/lock
  const lastManualBroadcastRef=useRef({key:'',type:''});
  // V134: Animated sync flow — shows progress overlay with staged updates
  const runSyncWithProgress=async()=>{
    const stages=[
      {pct:10,label:'Clearing local cache...',delay:200},
      {pct:25,label:`Loading baseline trades (${SEED_TRADES.length})...`,delay:400},
      {pct:45,label:`Restoring scorecard (${BASELINE_RECORD['15m'].wins}W-${BASELINE_RECORD['15m'].losses}L)...`,delay:300},
      {pct:65,label:'Resetting adaptive weights...',delay:300},
      {pct:80,label:'Updating regime memory...',delay:300},
      {pct:95,label:'Stamping baseline version...',delay:200},
    ];
    setSyncState({active:true,stage:stages[0].label,progress:5,complete:false,error:null});
    try{
      for(const s of stages){
        await new Promise(r=>setTimeout(r,s.delay));
        setSyncState({active:true,stage:s.label,progress:s.pct,complete:false,error:null});
      }
      const ok=resetToLatestBaseline();
      if(!ok)throw new Error('localStorage write failed');
      setSyncState({active:true,stage:'✓ Sync complete!',progress:100,complete:true,error:null});
      await new Promise(r=>setTimeout(r,1500));
      window.location.reload();
    }catch(e){
      setSyncState({active:true,stage:'',progress:0,complete:false,error:e.message||'Sync failed'});
    }
  };

  const broadcastSignalManual=()=>{
    if(!analysis)return;
    const lock=analysis.lockInfo;
    const isSearching=analysis.prediction?.includes('SEARCHING');
    const isStandDown=['BLACKOUT','OBSERVE','LOW QUALITY','SITTING OUT','BREAKING NEWS'].some(s=>analysis.prediction?.includes(s));
    // V134: Allow broadcasting any state with directional info OR stand-down state
    let dir=analysis.prediction?.includes('UP')?'UP':analysis.prediction?.includes('DOWN')?'DOWN':null;
    if(isSearching)dir='SEARCH';
    if(isStandDown)dir='STAND_DOWN';
    if(!dir)return;
    const winsW=scorecards[windowType]?.wins||0,lossesW=scorecards[windowType]?.losses||0;
    const record=`${winsW}W-${lossesW}L-${windowType}`;
    const gapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin*10000):0;
    const clock=`${timeState.minsRemaining}m ${timeState.secsRemaining}s`;
    const wKey=timeState.startWindow||timeState.nextWindow||0;
    const type=lock?'LOCK':isStandDown?'STAND_DOWN':isSearching?'SEARCH':'SIGNAL';
    const key=`${type}:${dir}:${wKey}:${analysis.prediction}`;
    if(lastManualBroadcastRef.current.key===key)return;
    lastManualBroadcastRef.current={key,type};
    // V134: include plain-English summary
    const plainEnglish=buildPlainEnglish(analysis,qualityGate,analysis?.advisor);
    broadcastToDiscord(type,{
      dir,price:currentPrice,strike:targetMargin,gap:gapBps,clock,
      regime:lastRegimeRef.current,posterior:analysis?.rawProbAbove||0,record,
      summary:plainEnglish,
      prediction:analysis.prediction,
      quality:Math.round(qualityGate?.score||0)
    });
  };

  const handleChatSubmit=(e)=>{if(e.key!=='Enter'||!chatInput.trim())return;const ut=chatInput.trim();const log=[...chatLog,{role:'user',text:ut}];setChatLog(log);setChatInput('');setTimeout(()=>{let r='';const u=ut.toLowerCase();if(u.includes('/broadcast')){const g=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;const dir=analysis?.prediction.includes('UP')?'UP':analysis?.prediction.includes('DOWN')?'DOWN':'SIT OUT';broadcastToDiscord('SIGNAL',{dir,price:currentPrice,strike:targetMargin,gap:g,clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`});r='Signal broadcasted to Discord.';}else if(u.includes('why')||u.includes('explain'))r=`Posterior UP: ${Number(analysis?.rawProbAbove||0).toFixed(1)}%. Regime: ${analysis?.regime}. Signal composite output. Ask 'whale' or 'position'.`;else if(u.includes('whale'))r=whaleLog.length>0?whaleLog.slice(0,8).map(w=>{const d=new Date(w.time);return`${d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})} ${w.src} ${w.side} $${(w.usd/1000).toFixed(0)}K @ $${w.price.toFixed(0)}`;}).join('\n'):'No whale trades yet.';else if(u.includes('position'))r=positionStatus?`${positionStatus.side} @ $${positionStatus.entry.toFixed(2)} | PnL: ${positionStatus.pnlPct>0?'+':''}${positionStatus.pnlPct.toFixed(1)}% | ${positionStatus.isStopHit?'STOP HIT':'Safe'}`:'No active position.';else if(u.includes('session'))r=`Active: ${marketSessions.sessions.map(s=>`${s.flag} ${s.name}`).join(' + ')} | Dominant: ${marketSessions.dominant}`;else r=`P(UP): ${Number(analysis?.rawProbAbove||0).toFixed(1)}%. Advisor: ${analysis?.advisor?.label||'—'}. Try: why | whale | position | session | /broadcast`;setChatLog([...log,{role:'tara',text:r}]);},400);};

  const handleWindowToggle=(t)=>{if(t===windowType)return;setWindowType(String(t));setPendingStrike(null);taraAdviceRef.current='SEARCHING...';lockedCallRef.current=null;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};hasReversedRef.current=false;manuallyClosedRef.current=null;windowSignalDirRef.current=null;isManualStrikeRef.current=false;hasSetInitialMargin.current=false;fetchWindowOpenPrice(t);setUserPosition(null);setPositionEntry(null);setManualAction(null);setCurrentOffer('');setBetAmount(0);setMaxPayout(0);lastWindowRef.current='';peakOfferRef.current=0;setForceRender(p=>p+1);};

  if(!isMounted)return<div className={'min-h-screen bg-[#111312] flex items-center justify-center text-[#E8E9E4]/50 font-serif text-xl animate-pulse'}>Initializing Tara 3.1.5...</div>;

  const totalDOM=(orderBook.localBuy+orderBook.localSell)||1;
  const buyPct=(orderBook.localBuy/totalDOM)*100;
  const sellPct=(orderBook.localSell/totalDOM)*100;
  const advisor=analysis?.advisor||{label:'CONNECTING...',reason:'Fetching market data...',color:'zinc',animate:false,hasAction:false};
  const advisorColorMap={emerald:'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',rose:'text-rose-400 border-rose-500/40 bg-rose-500/10',amber:'text-amber-400 border-amber-500/40 bg-amber-500/10',zinc:'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'};
  const advisorStyle=advisorColorMap[advisor.color]||advisorColorMap.zinc;

  return(
    <div className={'min-h-screen bg-[#111312] text-[#E8E9E4] font-sans flex flex-col selection:bg-[#E8E9E4]/20'} style={{fontSize:"16px",lineHeight:"1.5",overflowX:"hidden",maxWidth:"100vw"}}>
      
      {/* V134: Session-start status check */}
      <SessionStartCheck open={showSessionStart} onClose={()=>setShowSessionStart(false)} windowType={windowType} scorecards={scorecards} tradeLog={tradeLog} regime={analysis?.regime} velocityRegime={analysis?.velocityRegime} calibration={calibration} baselineDrift={baselineDrift} resetToLatestBaseline={resetToLatestBaseline} runSyncWithProgress={runSyncWithProgress} syncState={syncState} resetDirectionalBias={resetDirectionalBias} resetFreshStart={resetFreshStart}/>
      {showStats&&<StatsView tradeLog={tradeLog} scorecards={scorecards} onClose={()=>setShowStats(false)}/>}

      {/* V134: Sync progress overlay */}
      {syncState&&syncState.active&&(
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#181A19] rounded-xl border border-indigo-500/30 p-6 max-w-md w-full shadow-2xl">
            <div className="text-xs uppercase tracking-widest text-indigo-300 font-bold mb-3">
              {syncState.complete?'✓ Sync Complete':syncState.error?'⚠ Sync Failed':'🔄 Syncing Tara'}
            </div>
            <div className={'text-sm font-bold mb-4 leading-snug '+(syncState.error?'text-rose-300':syncState.complete?'text-emerald-300':'text-white')}>
              {syncState.error?syncState.error:syncState.stage}
            </div>
            {!syncState.error&&(
              <div className="w-full bg-[#0E100F] rounded-full h-2 overflow-hidden">
                <div className={'h-full transition-all duration-300 '+(syncState.complete?'bg-emerald-500':'bg-indigo-500')} style={{width:syncState.progress+'%'}}/>
              </div>
            )}
            <div className="text-[10px] text-[#E8E9E4]/40 mt-3 text-center">
              {syncState.complete?'Reloading in a moment...':syncState.error?'Try again from Settings':syncState.progress+'% complete'}
            </div>
          </div>
        </div>
      )}

      {/* V134: SYNC PROGRESS OVERLAY ── shows during baseline sync */}
      {syncState.active&&(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={'bg-[#181A19] border rounded-xl shadow-2xl max-w-sm w-full p-6 '+(syncState.error?'border-rose-500/50':syncState.complete?'border-emerald-500/50':'border-indigo-500/40')}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{syncState.error?'⚠️':syncState.complete?'✓':'⟳'}</span>
              <div>
                <div className={'text-xs uppercase tracking-widest font-bold '+(syncState.error?'text-rose-400':syncState.complete?'text-emerald-400':'text-indigo-400')}>
                  {syncState.error?'Sync Failed':syncState.complete?'Sync Complete':'Syncing Baseline'}
                </div>
                <div className="text-[10px] text-[#E8E9E4]/40 mt-0.5">{BASELINE_VERSION}</div>
              </div>
            </div>

            {/* Stage label */}
            <div className="text-sm text-[#E8E9E4]/85 mb-3 min-h-[20px]">
              {syncState.error||syncState.stage||'Preparing...'}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-[#0E100F] rounded-full overflow-hidden mb-2">
              <div
                className={'h-full transition-all duration-300 '+(syncState.error?'bg-rose-500':syncState.complete?'bg-emerald-500':'bg-indigo-500')}
                style={{width:`${syncState.progress}%`}}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#E8E9E4]/40 font-mono">
              <span>{syncState.error?'Error':syncState.complete?'Done':'Working'}</span>
              <span>{syncState.progress}%</span>
            </div>

            {syncState.complete&&(
              <div className="mt-4 text-[11px] text-emerald-400/80 text-center">
                Reloading in a moment...
              </div>
            )}
            {syncState.error&&(
              <button onClick={()=>setSyncState({active:false,stage:'',progress:0,complete:false,error:null})} className="mt-4 w-full py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-lg text-xs font-bold uppercase tracking-wide text-rose-300">
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* V134: Learning toast removed — was crashing on minified prod build, will revisit */}
      {/* ── STICKY HEADER ── */}
      <header className={'sticky top-0 z-40 bg-[#111312]/95 backdrop-blur-md border-b border-[#E8E9E4]/10 px-2 sm:px-4 py-2 shrink-0'}>
        <div className="max-w-[1600px] mx-auto flex items-center gap-1 sm:gap-2">
          
          {/* Logo — text only on mobile, 2.0 badge on sm+ */}
          {/* V2.0: redesigned badge — gold accent, deliberate weight. Matches the studio's
                   restrained-luxury aesthetic. The pulse dot stays — it's the live-state indicator. */}
          <div className="flex items-center gap-1.5 shrink-0">
            <h1 className="text-base sm:text-lg font-serif tracking-tight text-white">Tara</h1>
            <span className={'hidden sm:flex items-center gap-1.5 text-[10px] font-sans font-bold tracking-wider px-2 py-0.5 rounded-md border'} style={{
              background:'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
              borderColor:'rgba(212,175,55,0.35)',
              color:'#E5C870',
              boxShadow:'inset 0 0 12px rgba(212,175,55,0.08)',
            }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#E5C870'}}></span>
              3.1.5
            </span>
          </div>

          {/* Live Price — shrinks gracefully, never truncates on sm+ */}
          <div className={`flex items-center gap-0.5 font-serif font-bold shrink-0 ${tickDirection==='up'?'text-emerald-400':tickDirection==='down'?'text-rose-400':'text-white'}`}>
            <IC.Zap className={`w-3 h-3 shrink-0 ${tickDirection==='up'?'text-emerald-400':tickDirection==='down'?'text-rose-400':'text-[#E8E9E4]/40'}`}/>
            {/* Mobile: no decimals to save space. sm+: full price */}
            <span className="text-sm sm:hidden">${currentPrice?Math.round(currentPrice).toLocaleString():'---'}</span>
            <span className="hidden sm:inline text-xl">${currentPrice?currentPrice.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'---'}</span>
          </div>

          {/* Market sessions — md+ only */}
          <div className="hidden md:flex items-center gap-1 text-xs shrink-0">{marketSessions.sessions.map((s,i)=><span key={i} className={`${s.color} opacity-80`}>{s.flag}</span>)}</div>

          {/* Spacer */}
          <div className="flex-1"/>

          {/* Window toggle */}
          <div className={'flex bg-[#181A19] border border-[#E8E9E4]/20 rounded-lg p-0.5 shrink-0'}>
            <button onClick={()=>handleWindowToggle('5m')} className={`px-2.5 sm:px-5 py-1 text-xs uppercase font-bold tracking-wide rounded-md transition-all ${windowType==='5m'?'bg-indigo-500 text-white shadow-md':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>5m</button>
            <button onClick={()=>handleWindowToggle('15m')} className={`px-2.5 sm:px-5 py-1 text-xs uppercase font-bold tracking-wide rounded-md transition-all ${windowType==='15m'?'bg-emerald-500 text-white shadow-md':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>15m</button>
          </div>

          {/* Right controls — on mobile show only 3 most critical: sound, ?, whale */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden xl:flex flex-col items-end cursor-pointer mr-1" onClick={()=>setUseLocalTime(!useLocalTime)}>
              <span className={'text-xs text-[#E8E9E4]/40 uppercase'}>{useLocalTime?'LOCAL':'EST'}</span>
              <span className={'text-sm font-mono text-[#E8E9E4]/80'}>{timeState.currentTime||'--:--:--'}</span>
            </div>
            {/* Always visible */}
            <button onClick={handleSoundToggle} className={`p-1.5 rounded-lg border transition-colors ${soundEnabled?'bg-indigo-500/20 border-indigo-500/40 text-indigo-400':'border-[#E8E9E4]/10 text-[#E8E9E4]/40'}`}>{soundEnabled?<IC.Vol2 className="w-3.5 h-3.5"/>:<IC.VolX className="w-3.5 h-3.5"/>}</button>
            <button onClick={()=>setShowSessionStart(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-bold'} title="Session Status Check">📋</button>
            {/* V2.7: Stats button — gold accent matches the analytics view */}
            <button onClick={()=>setShowStats(true)} className={'p-1.5 rounded-lg transition-colors text-xs font-bold'} style={{
              background:T2_GOLD_GLOW,
              color:T2_GOLD,
              border:'0.5px solid '+T2_GOLD_BORDER,
            }} title="Performance Stats & Insights">📊</button>
            <button onClick={()=>setShowGuide(true)} className={'p-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors'} title="How Tara Works">?</button>
            {/* V138: Premium Mode toggle removed — see help modal V138 section */}
            {/* Hidden on mobile — accessible via mobile tab nav or sm+ */}
            <FlowBtn flowSignal={flowSignal} active={showWhaleLog} onClick={()=>setShowWhaleLog(!showWhaleLog)} cls="hidden sm:flex"/>
            <button onClick={()=>setShowSettings(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-indigo-400 transition-colors'}><IC.Link className="w-3.5 h-3.5"/></button>
            <button onClick={()=>setShowAnalytics(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-indigo-400 transition-colors'} title="Analytics"><IC.BarChart className="w-3.5 h-3.5"/></button>
            <button onClick={()=>setShowHelp(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-white transition-colors'}><IC.Help className="w-3.5 h-3.5"/></button>
          </div>
        </div>
      </header>

      {/* V2.1: Top stat strip — sticky 3-stat indicator. Always visible: Posterior · Quality · FGT.
              Provides a constant pulse-check without scanning multiple panels. */}
      <div className="sticky top-[44px] sm:top-[52px] z-30 bg-[#0E100F]/95 backdrop-blur-md border-b border-[#E8E9E4]/8 px-2 sm:px-4 py-1.5 shrink-0">
        <div className="max-w-[1600px] mx-auto flex items-center gap-3 sm:gap-5 text-[10px] sm:text-[11px]">
          {(()=>{
            const post=Number(analysis?.confidence)||50;
            const dirLabel=analysis?.prediction?.includes('UP')?'UP':analysis?.prediction?.includes('DOWN')?'DOWN':'';
            const postCls=dirLabel==='UP'?'text-emerald-300':dirLabel==='DOWN'?'text-rose-300':'text-[#E8E9E4]/60';
            const qScore=qualityGate?.score;
            const qCls=qScore==null?'text-[#E8E9E4]/30':qScore>=70?'text-emerald-300':qScore>=50?'text-white':'text-amber-300';
            const fgt=Math.abs(analysis?.mtfAlignment||0);
            const fgtSign=analysis?.mtfAlignment>0?'UP':analysis?.mtfAlignment<0?'DN':'';
            const fgtCls=fgt>=4?(analysis.mtfAlignment>0?'text-emerald-300':'text-rose-300'):fgt>=2?'text-white':'text-[#E8E9E4]/40';
            const geoRisk=newsSentiment?.geoRisk||0;
            return(
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="uppercase font-bold tracking-[0.10em] text-[#E8E9E4]/40 text-[8px] sm:text-[9px]">Post</span>
                  <span style={T2_MONO_STYLE} className={'font-medium '+postCls}>{post.toFixed(0)}%</span>
                  {dirLabel&&<span className={'text-[8px] sm:text-[9px] '+postCls}>{dirLabel}</span>}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="uppercase font-bold tracking-[0.10em] text-[#E8E9E4]/40 text-[8px] sm:text-[9px]">Quality</span>
                  <span style={T2_MONO_STYLE} className={'font-medium '+qCls}>{qScore!=null?qScore.toFixed(0):'—'}<span className="opacity-40 hidden sm:inline">/100</span></span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="uppercase font-bold tracking-[0.10em] text-[#E8E9E4]/40 text-[8px] sm:text-[9px]">FGT</span>
                  <span style={T2_MONO_STYLE} className={'font-medium '+fgtCls}>{fgt}/4{fgtSign&&<span className="opacity-50 ml-0.5">{fgtSign}</span>}</span>
                </div>
                {geoRisk>=0.3&&(
                  <div className="hidden sm:flex items-center gap-1 ml-auto" style={{color:T2_COPPER}}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{background:T2_COPPER}}></span>
                    <span className="font-bold uppercase tracking-wider text-[9px]">Geo {geoRisk>=0.7?'high':geoRisk>=0.5?'elevated':'watch'}</span>
                  </div>
                )}
                {/* V2.6: Pending Kalshi resolution badge */}
                {tradeLog.filter(t=>t.result==='PENDING-VERIFY').length>0&&(
                  <div className="flex items-center gap-1" style={{color:T2_GOLD}}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{background:T2_GOLD}}></span>
                    <span className="font-bold uppercase tracking-wider text-[9px]">Pending Kalshi · {tradeLog.filter(t=>t.result==='PENDING-VERIFY').length}</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 flex flex-col gap-3 min-h-0">
        
        {/* STATS BAR */}
        <div className={'bg-[#181A19] rounded-xl border border-[#E8E9E4]/10 shadow-md relative overflow-hidden shrink-0'}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-70"></div>
          <div className="p-2 sm:p-3 grid grid-cols-2 lg:grid-cols-none lg:flex lg:flex-row lg:items-center gap-2 sm:gap-3 overflow-x-auto">
            
            {/* Strike — auto or manual */}
            <div className="flex flex-col min-w-0 w-full lg:min-w-[130px] lg:w-auto col-span-1">
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className={'text-xs text-[#E8E9E4]/40 uppercase tracking-wide'}>Strike</div>
                <span
                  onClick={()=>{isManualStrikeRef.current=false;hasSetInitialMargin.current=false;setWindowOpenStrike(currentPriceRef.current||currentPrice);}}
                  title={strikeSource==='kalshi'?'Strike from Kalshi · click to re-capture':strikeMode==='auto'?'Live spot price at window open · click to re-capture':'Manual override · click to restore live'}
                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer select-none font-bold transition-colors ${strikeSource==='kalshi'?'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30':strikeMode==='auto'?'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30':'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-emerald-500/15 hover:text-emerald-400'}`}
                >{strikeSource==='kalshi'?'KLSH':strikeMode==='auto'?'LIVE':'MANUAL'}</span>
              </div>
              <div className="flex items-center gap-1">
                <IC.Crosshair className="w-4 h-4 text-indigo-400 hidden sm:block"/>
                <input type="number"
                  value={targetMargin===0?'':targetMargin}
                  onChange={e=>{const v=Number(e.target.value);setTargetMargin(v);isManualStrikeRef.current=true;setStrikeMode('manual');setPendingStrike(null);setStrikeConfirmed(false);}}
                  onKeyDown={e=>{if(e.key==='Enter'&&targetMargin>0){isManualStrikeRef.current=true;setStrikeMode('manual');setPendingStrike(null);setStrikeConfirmed(true);e.target.blur();}}}
                  onBlur={()=>{/* do not auto-confirm on blur — user must press OK or Enter */}}
                  className={'bg-transparent text-white font-serif text-base sm:text-lg w-full focus:outline-none border-b border-[#E8E9E4]/10 focus:border-indigo-400'}
                  placeholder="Auto-set"
                />
                {targetMargin>0&&strikeMode==='manual'&&(
                  <button
                    onClick={()=>{isManualStrikeRef.current=true;setStrikeMode('manual');setPendingStrike(null);setStrikeConfirmed(true);}}
                    className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500 hover:bg-indigo-400 text-white transition-colors">OK ✓</button>
                )}
              </div>
            </div>
            <div className={'w-px h-8 bg-[#E8E9E4]/10 hidden lg:block'}></div>

            {/* Bet/Win */}
            <div className="flex flex-col min-w-0 w-full lg:min-w-[140px] lg:w-auto">
              <div className={'text-xs text-[#E8E9E4]/40 uppercase tracking-wide mb-1'}>Bet  Max Win</div>
              <div className="flex items-center gap-1 text-sm sm:text-base font-serif">
                $<input type="number" value={betAmount===0?'':betAmount} onChange={e=>setBetAmount(Number(e.target.value))} className={'bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-16 text-center outline-none text-white'}/>
                <span className={'text-[#E8E9E4]/30'}>&#47;</span>
                $<input type="number" value={maxPayout===0?'':maxPayout} onChange={e=>setMaxPayout(Number(e.target.value))} className={'bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-16 text-center outline-none text-white'}/>
              </div>
            </div>
            <div className={'w-px h-8 bg-[#E8E9E4]/10 hidden lg:block'}></div>

            {/* Live Offer */}
            <div className="flex flex-col min-w-0">
              <div className={'text-xs text-emerald-400/80 uppercase tracking-wide mb-1'}>Live Offer</div>
              <div className="flex items-center gap-1 text-emerald-400 text-sm sm:text-base font-serif">
                $<input type="number" value={currentOffer} onChange={e=>setCurrentOffer(e.target.value)} placeholder="0.00" className={'bg-transparent border-b border-emerald-500/30 focus:border-emerald-400 w-20 text-center outline-none placeholder-emerald-900'}/>
              </div>
              {kalshiYesPrice!==null&&windowType==='15m'&&(
                <div className="flex items-center gap-1 mt-0.5" title="Live Kalshi YES price for current 15m market">
                  <span className={'text-[9px] text-purple-400/70 uppercase font-bold'}>KLSH</span>
                  <span className="text-[10px] text-purple-300 font-mono">${kalshiYesPrice.toFixed(2)}</span>
                  {currentOffer&&Math.abs(parseFloat(currentOffer)-kalshiYesPrice)>2&&(
                    <span className="text-[9px] text-amber-400" title="Divergence vs Kalshi">⚡</span>
                  )}
                </div>
              )}
            </div>
            <div className={'w-px h-8 bg-[#E8E9E4]/10 hidden lg:block lg:ml-auto'}></div>

            {/* Position / Score */}
            <div className="col-span-2 lg:col-span-none lg:ml-auto flex flex-col">
              {positionStatus?(
                <div className={'bg-[#111312] border border-amber-500/20 rounded-lg p-1.5'}>
                  <div className="flex justify-between text-xs mb-1"><span className={'text-[#E8E9E4]/40 uppercase'}>POSITION</span><span className={positionStatus.side==='UP'?'text-emerald-400 font-bold':'text-rose-400 font-bold'}>{positionStatus.side} @ ${(positionStatus.entry||0).toFixed(0)}</span></div>
                  <div className="flex justify-between items-center">
                    <span className={`text-lg font-serif font-bold ${positionStatus.pnlPct>0?'text-emerald-400':'text-rose-400'}`}>{positionStatus.pnlPct>0?'+':''}{positionStatus.pnlPct.toFixed(1)}%</span>
                    <span className={`text-xs font-bold uppercase ${positionStatus.isStopHit?'text-rose-500 animate-pulse':'text-[#E8E9E4]/30'}`}>{positionStatus.isStopHit?'STOP HIT':'SAFE'}</span>
                  </div>
                </div>
              ):(
                <div>
                  <div className={'text-xs text-[#E8E9E4]/40 uppercase tracking-wide mb-1 flex items-center gap-1'}><IC.Terminal className="w-4 h-4"/> {windowType.toUpperCase()} SCORE</div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center"><div className="flex items-center gap-1 text-xs text-emerald-400"><button onClick={()=>updateScore(windowType,'wins',-1)} className={'hover:bg-emerald-500/20 rounded px-0.5'}>-</button>W<button onClick={()=>updateScore(windowType,'wins',1)} className={'hover:bg-emerald-500/20 rounded px-0.5'}>+</button></div><span className="text-2xl sm:text-3xl font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins||0)}</span></div>
                    <div className={'h-6 w-px bg-[#E8E9E4]/10'}></div>
                    <div className="flex flex-col items-center"><div className="flex items-center gap-1 text-xs text-rose-400"><button onClick={()=>updateScore(windowType,'losses',-1)} className={'hover:bg-rose-500/20 rounded px-0.5'}>-</button>L<button onClick={()=>updateScore(windowType,'losses',1)} className={'hover:bg-rose-500/20 rounded px-0.5'}>+</button></div><span className="text-2xl sm:text-3xl font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses||0)}</span></div>
                    <div className={'text-xs text-[#E8E9E4]/30'}>{(Number(scorecards[windowType]?.wins||0)/(Math.max(1,Number(scorecards[windowType]?.wins||0)+Number(scorecards[windowType]?.losses||0)))*100).toFixed(0)}%</div>
                  </div>
                  {/* Session + Lifetime P&L */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {sessionPnL!==0&&(
                      <div className="flex items-center gap-1">
                        <span className={'text-[9px] text-[#E8E9E4]/30 uppercase'}>Session</span>
                        <span className={`text-[11px] font-mono font-bold ${sessionPnL>0?'text-emerald-400':'text-rose-400'}`}>{sessionPnL>0?'+':''}{sessionPnL>=0?'$'+sessionPnL.toFixed(2):'-$'+Math.abs(sessionPnL).toFixed(2)}</span>
                      </div>
                    )}
                    {lifetimePnL!==0&&(
                      <div className="flex items-center gap-1">
                        <span className={'text-[9px] text-[#E8E9E4]/30 uppercase'}>All-time</span>
                        <span className={`text-[11px] font-mono font-bold ${lifetimePnL>0?'text-emerald-300':'text-rose-300'}`}>{lifetimePnL>0?'+':''}{lifetimePnL>=0?'$'+lifetimePnL.toFixed(2):'-$'+Math.abs(lifetimePnL).toFixed(2)}</span>
                        <button onClick={()=>{if(confirm('Reset lifetime P&L to zero?')){setLifetimePnL(0);try{localStorage.removeItem('taraV110PnL');}catch(e){}}}} className={'text-[8px] text-[#E8E9E4]/20 hover:text-rose-400 ml-0.5'} title="Reset lifetime P&L">✕</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DOM bar */}
          <div className="px-3 pb-2 hidden sm:block">
            <div className={'flex justify-between text-xs text-[#E8E9E4]/30 uppercase tracking-wide mb-1'}><span>Depth of Market</span><span>{buyPct.toFixed(0)}% BID / {sellPct.toFixed(0)}% ASK</span></div>
            <div className="w-full h-1 bg-[#111312] rounded-full overflow-hidden flex">
              <div style={{width:`${buyPct}%`}} className={'h-full bg-emerald-500/70 transition-all duration-300'}></div>
              <div style={{width:`${sellPct}%`}} className={'h-full bg-rose-500/70 transition-all duration-300'}></div>
            </div>
          </div>
        </div>

        {/* V3.1: Tape strip — sliding-window buy/sell pressure */}
        <TapeStrip tapeWindows={tapeWindows}/>

        {/* MOBILE TAB NAV */}
        <div className={'flex lg:hidden bg-[#181A19] border border-[#E8E9E4]/10 rounded-xl p-1 gap-1 shrink-0'}>
          {[{id:'signal',label:'Signal',icon:<IC.Zap className="w-4 h-4"/>},{id:'chart',label:'Chart',icon:<IC.Activity className="w-4 h-4"/>},{id:'logs',label:'Analytics',icon:<IC.BarChart className="w-4 h-4"/>}].map(tab=>(
            <button key={tab.id} onClick={()=>setMobileTab(tab.id)} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${mobileTab===tab.id?'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/70'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
          {/* Mobile-only quick access row for hidden header buttons */}
          <FlowBtn flowSignal={flowSignal} active={showWhaleLog} onClick={()=>setShowWhaleLog(!showWhaleLog)} cls="flex"/>
          <button onClick={()=>setShowSettings(true)} className={'flex items-center justify-center px-2 py-1.5 rounded-lg text-xs text-[#E8E9E4]/30 hover:text-indigo-400 transition-all'} title="Discord"><IC.Link className="w-3.5 h-3.5"/></button>
        </div>

        {/* ── PENDING STRIKE CONFIRMATION BANNER — always visible ── */}
        {pendingStrike&&(
          <div className={'bg-indigo-500/10 border-2 border-indigo-500/50 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 animate-pulse-once'}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <IC.Crosshair className="w-5 h-5 text-indigo-400 shrink-0"/>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-indigo-400 mb-0.5">New window — confirm strike price</div>
                <div className="text-2xl sm:text-3xl font-serif font-bold text-white">${pendingStrike.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                <div className={'text-xs text-[#E8E9E4]/40 mt-0.5'}>Live price captured at window open · tap OK to confirm or Edit to change</div>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={()=>{setTargetMargin(pendingStrike);setStrikeMode('auto');setPendingStrike(null);}}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-bold uppercase tracking-wide transition-colors">
                ✓ OK — Use This
              </button>
              <button
                onClick={()=>{setPendingStrike(null);setStrikeMode('manual');isManualStrikeRef.current=true;}}
                className={'flex-1 sm:flex-none px-4 py-2.5 border border-[#E8E9E4]/20 text-[#E8E9E4]/50 hover:text-white hover:border-[#E8E9E4]/40 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors'}>
                Edit
              </button>
            </div>
          </div>
        )}

        {/* ── WINDOW RECAP TOAST ── */}
        {windowRecap&&(
          <div className={`shrink-0 rounded-xl border-2 px-4 py-3 flex items-center gap-3 animate-pulse-once transition-all ${windowRecap.won?'bg-emerald-500/10 border-emerald-500/40':'bg-rose-500/10 border-rose-500/40'}`}>
            <span className="text-2xl">{windowRecap.won?'W':'L'}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-serif font-bold ${windowRecap.won?'text-emerald-400':'text-rose-400'}`}>
                {windowRecap.won?'WIN':'LOSS'} · {windowRecap.dir} · {windowRecap.regime}
              </div>
              <div className={'text-xs text-[#E8E9E4]/50 mt-0.5'}>
                Strike <span className="text-white">${(windowRecap.strike||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                {' → '}Close <span className="text-white">${(windowRecap.closePrice||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                {' · '}<span className={windowRecap.gapBps>=0?'text-emerald-400':'text-rose-400'}>{windowRecap.gapBps>=0?'+':''}{windowRecap.gapBps.toFixed(1)} bps</span>
              </div>
            </div>
            <button onClick={()=>setWindowRecap(null)} className={'text-[#E8E9E4]/30 hover:text-white text-lg leading-none'}>×</button>
          </div>
        )}

        {/* ── V111: MOBILE TAB NAV ── */}
        <MobileTabBar mobileTab={mobileTab} setMobileTab={setMobileTab}/>

        {/* V2.1: Grid changed from equal 3-col to 1.25fr/1fr/1fr at lg+ — prediction card promoted as hero.
                  V2.2.1: tightened from 1.5fr → 1.25fr (1.5 was overshooting visually). auto-rows-fr restored
                  so supporting columns match hero height — the empty-space fix is now done at the
                  card-content level (sections inside cards distribute), not at the grid level. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr] gap-3 shrink-0 auto-rows-fr">
          
          {/* ── PREDICTION CARD ── */}
          <div className={`bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col relative ${mobileTab!=='signal'?'hidden md:flex':''}`}>
            <div className="absolute top-0 left-0 w-full h-px rounded-t-xl" style={{background:'linear-gradient(to right, transparent, '+T2_GOLD_BORDER+' 30%, '+T2_GOLD_BORDER+' 70%, transparent)'}}></div>
            <T2Stamp code="PRED · 015"/>
            <div className="flex justify-between items-center mb-3 shrink-0">
              <div onClick={()=>setUseLocalTime(!useLocalTime)} className={'flex items-center gap-1.5 bg-[#111312] border border-[#E8E9E4]/10 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer hover:border-indigo-500/30 transition-colors'}>
                <IC.Clock className="w-4 h-4"/>
                <span className={'text-[#E8E9E4]/60 hidden sm:inline'}>{timeState.startWindow}–{timeState.nextWindow} {useLocalTime?'LOCAL':'EST'}</span>
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
                    const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin,forceExit:true,
                      closingGapBps:targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0,
                      kalshiAtClose:kalshiYesPrice!=null?Number(kalshiYesPrice):null,
                      resolvedTimestampISO:new Date().toISOString()};
                    const newLog=[...tradeLogRef.current,resolvedTrade];saveTradeLog(newLog);setTradeLog(newLog);
                    const newW=updateWeights(adaptiveWeights,newLog,result);const _diffs=computeWeightDiff(adaptiveWeights,newW);setAdaptiveWeights(newW);if(_diffs.length>0)setLastLearningUpdate({result,diffs:_diffs,at:Date.now()});setRegimeWeights(prev=>updateRegimeWeights(prev,resolvedTrade,result));pendingTradeRef.current=null;
                  }
                }
                setUserPosition(null);setPositionEntry(null);taraAdviceRef.current='CLOSED';setForceRender(p=>p+1);
              }} className={'px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-colors'} style={{
                background:T2_COPPER_BG,
                color:T2_COPPER,
                border:'1px solid '+T2_COPPER_BORDER,
              }}>
                <IC.Alert className="w-4 h-4"/>Force Exit
              </button>
            </div>

            <PredictionContent strikeConfirmed={strikeConfirmed} strikeMode={strikeMode} targetMargin={targetMargin} isLoading={isLoading} analysis={analysis} currentPrice={currentPrice} qualityGate={qualityGate} userPosition={userPosition} timeState={timeState} streakData={streakData} handleManualSync={handleManualSync} getMarketSessions={getMarketSessions} executeAction={executeAction} broadcastSignalManual={broadcastSignalManual} discordWebhook={discordWebhook} regimeDirWR={regimeDirWR} kalshiYesPrice={kalshiYesPrice} newsSentiment={newsSentiment}/>
          </div>

          {/* ── V111: PROJECTIONS CARD (col 2 - 5m/15m/1h tabs) ── */}
          <ProjectionsCard analysis={analysis} mobileTab={mobileTab}/>

          {/* ── V111: RIGHT PANEL - Engine Log + Live Feeds + News (col 3) ── */}
          <RightPanel analysis={analysis} tapeRef={tapeRef} whaleLog={whaleLog} bloomberg={bloomberg} currentPrice={currentPrice} mobileTab={mobileTab}/>
        </div>

        {/* ── V111: TRADINGVIEW CHART (full-width bottom row) ── */}
        <ChartBottomCard mobileTab={mobileTab} resolution={resolution} setResolution={setResolution}/>

      {/* ── FLOW INTELLIGENCE PANEL ── */}
      <FlowPanel showWhaleLog={showWhaleLog} setShowWhaleLog={setShowWhaleLog} flowSignal={flowSignal} tapeRef={tapeRef} whaleLog={whaleLog} bloomberg={bloomberg} currentPrice={currentPrice} timeState={timeState}/>

      {/* Settings */}
      {showSettings&&(
        <div className={'fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4'}>
          <div className={'bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto'} style={{scrollbarWidth:'thin'}}>
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2"><IC.Link className="w-5 h-5 text-indigo-400"/>Discord Integration</h2>
                <button onClick={()=>{setShowSettings(false);setDiscordEditingId(null);setDiscordEditText('');setDiscordStatusMsg('');}} className={'text-[#E8E9E4]/50 hover:text-white'}><IC.X className="w-5 h-5"/></button>
              </div>

              <p className={'text-xs text-[#E8E9E4]/60 mb-3 leading-relaxed'}>Tara broadcasts lock signals, round closures, and entries to your Discord channel.</p>
              <input type="password" value={discordWebhook} onChange={e=>setDiscordWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className={'w-full bg-[#111312] border border-[#E8E9E4]/20 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-indigo-400 text-white font-mono mb-3'}/>

              {/* Bot name + avatar */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className={'text-[10px] text-[#E8E9E4]/40 uppercase tracking-wide mb-1 block'}>Bot Display Name</label>
                  <input type="text" value={discordUsername} onChange={e=>setDiscordUsername(e.target.value)} placeholder="Tara Terminal V110" className={'w-full bg-[#111312] border border-[#E8E9E4]/20 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-white'}/>
                </div>
                <div>
                  <label className={'text-[10px] text-[#E8E9E4]/40 uppercase tracking-wide mb-1 block'}>Avatar Image URL</label>
                  <input type="url" value={discordAvatar} onChange={e=>setDiscordAvatar(e.target.value)} placeholder="https://i.imgur.com/..." className={'w-full bg-[#111312] border border-[#E8E9E4]/20 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-white'}/>
                </div>
              </div>
              {discordAvatar&&(
                <div className={'flex items-center gap-2 mb-3 p-2 bg-[#111312] rounded-lg border border-[#E8E9E4]/8'}>
                  <img src={discordAvatar} alt="Bot avatar preview" className={'w-8 h-8 rounded-full object-cover border border-[#E8E9E4]/20'} onError={e=>e.target.style.display='none'}/>
                  <div>
                    <div className="text-xs font-bold text-white">{discordUsername||'Tara Terminal V110'}</div>
                    <div className={'text-[10px] text-[#E8E9E4]/40'}>Preview of how bot appears in Discord</div>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mb-5">
                <button onClick={()=>setShowSettings(false)} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wide transition-colors">Save</button>
                <button onClick={async()=>{
                  await broadcastToDiscord('SIGNAL',{dir:'UP',price:currentPrice||75000,strike:targetMargin||75000,gap:0,clock:'TEST'});
                  setDiscordStatusMsg('Test sent ✓');
                  setTimeout(()=>setDiscordStatusMsg(''),3000);
                }} className={'px-4 py-2 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-indigo-500/10 transition-colors'}>Test</button>
              </div>

              {/* V111: Sync to baseline training data */}
              <div className={'mb-3 p-3 rounded-lg bg-[#111312] border border-[#E8E9E4]/10'}>
                <div className={'text-[11px] text-[#E8E9E4]/70 mb-2 leading-relaxed'}>
                  <strong className={'text-emerald-400'}>Sync to Latest Training</strong> · Refreshes Tara to the latest baked baseline (429W-268L · 31W-25L 5m · 379 baked trades · V138). Use when switching devices.
                </div>
                <button onClick={()=>{
                  if(window.confirm('Reset Tara to the latest baseline training data? Adaptive weights and trade history reset.')){
                    runSyncWithProgress();
                  }
                }} disabled={syncState.active} className={'w-full px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed'}>
                  {syncState.active?'Syncing...':'Sync to Latest Baseline'}
                </button>
              </div>

              {discordStatusMsg&&<div className={'mb-3 text-xs text-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2'}>{discordStatusMsg}</div>}

              <div className={'border-t border-[#E8E9E4]/10 pt-4'}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={'text-xs font-bold uppercase tracking-wide text-[#E8E9E4]/60'}>Sent Messages ({discordLog.length})</h3>
                  <p className={'text-[10px] text-[#E8E9E4]/30'}>Edit or delete within 15 min</p>
                </div>

                {discordLog.length===0?(
                  <div className={'text-xs text-[#E8E9E4]/30 italic text-center py-6'}>No messages sent yet this session</div>
                ):(
                  <div className="space-y-2">
                    {discordLog.map(entry=>(
                      <div key={entry.id} className={'bg-[#111312] rounded-lg border border-[#E8E9E4]/8 overflow-hidden'}>
                        <div className="flex items-center gap-2 p-2.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.type==='LOCK'?'bg-indigo-400':entry.type==='CLOSE'?'bg-emerald-400':'bg-amber-400'}`}/>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-white truncate">{entry.label}</div>
                            <div className={'text-[10px] text-[#E8E9E4]/30'}>{entry.ts}{entry.edited&&' · edited'}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={()=>{setDiscordEditingId(discordEditingId===entry.id?null:entry.id);setDiscordEditText(entry.label);}}
                              className={'px-2 py-1 text-[10px] font-bold rounded border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/15 transition-colors'}>Edit</button>
                            <button onClick={async()=>{
                              const ok=await deleteDiscordMessage(entry);
                              setDiscordStatusMsg(ok?'Deleted ✓':'Failed — may be >15 min old');
                              setTimeout(()=>setDiscordStatusMsg(''),3000);
                            }} className={'px-2 py-1 text-[10px] font-bold rounded border border-rose-500/30 text-rose-400 hover:bg-rose-500/15 transition-colors'}>Del</button>
                          </div>
                        </div>
                        {discordEditingId===entry.id&&(
                          <div className={'border-t border-[#E8E9E4]/8 p-2.5'}>
                            <textarea value={discordEditText} onChange={e=>setDiscordEditText(e.target.value)} rows={2}
                              className={'w-full bg-[#181A19] border border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 resize-none mb-2'}
                              placeholder="Add a note to this message (e.g. 'Closed early, took profits at $75,200')"/>
                            <div className="flex gap-2">
                              <button onClick={async()=>{
                                const ok=await editDiscordMessage(entry,discordEditText);
                                setDiscordStatusMsg(ok?'Note added ✓':'Edit failed — may be >15 min old or webhook mismatch');
                                if(ok){setDiscordLog(prev=>prev.map(m=>m.id===entry.id?{...m,label:m.label,edited:true}:m));setDiscordEditingId(null);setDiscordEditText('');}
                                setTimeout(()=>setDiscordStatusMsg(''),3000);
                              }} className={'flex-1 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 transition-colors'}>Add Note</button>
                              <button onClick={()=>{setDiscordEditingId(null);setDiscordEditText('');}}
                                className={'px-3 py-1.5 rounded-lg text-xs font-bold border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-white transition-colors'}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className={'text-[10px] text-[#E8E9E4]/20 mt-3 text-center leading-relaxed'}>Log resets on page refresh. Discord allows edits or deletes within 15 minutes of sending.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end transition-all ${isChatOpen?'w-[90vw] sm:w-80':'w-auto'}`}>
        {isChatOpen&&(
          <div className={'bg-[#181A19] border border-[#E8E9E4]/20 shadow-2xl rounded-xl w-full mb-3 overflow-hidden flex flex-col h-[55vh] sm:h-96'}>
            <div className={'bg-[#111312] p-2.5 flex justify-between items-center border-b border-[#E8E9E4]/10'}><span className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><IC.Msg className="w-3.5 h-3.5 text-indigo-400"/>Chat with Tara 3.1.5</span><button onClick={()=>setIsChatOpen(false)} className="opacity-50 hover:opacity-100"><IC.X className="w-4 h-4"/></button></div>
            <div className={'flex-1 overflow-y-auto p-3 space-y-3 bg-[#111312]/50'} style={{scrollbarWidth:'thin'}}>
              {chatLog.map((msg,i)=>(
                <div key={i} className={`flex flex-col ${msg.role==='user'?'items-end':'items-start'}`}>
                  <span className={`text-xs uppercase opacity-30 mb-1 ${msg.role==='user'?'mr-1':'ml-1'}`}>{msg.role}</span>
                  <div className={`text-xs p-2 rounded-lg max-w-[88%] leading-relaxed whitespace-pre-wrap ${msg.role==='user'?'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-tr-none':'bg-[#2A2D2C] text-[#E8E9E4] border border-[#E8E9E4]/10 rounded-tl-none'}`}>{msg.text}</div>
                </div>
              ))}
            </div>
            <div className={'p-2.5 bg-[#111312] border-t border-[#E8E9E4]/10'}><input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={handleChatSubmit} placeholder={`Ask about ${windowType} window...`} className={'w-full bg-[#181A19] border border-[#E8E9E4]/20 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-white'}/></div>
          </div>
        )}
        {!isChatOpen&&<button onClick={()=>setIsChatOpen(true)} className={'bg-indigo-500 hover:bg-indigo-400 text-white p-3 rounded-full shadow-lg border border-indigo-400/50 transition-transform hover:scale-105'}><IC.Msg className="w-5 h-5"/></button>}
      </div>

      {/* Help */}
      {/* ── ANALYTICS / TRAINING DASHBOARD ── */}
      {showAnalytics&&(
        <div className={'fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4'}>
          <div className={'bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-3xl max-h-[95vh] mx-2 sm:mx-0 overflow-y-auto shadow-2xl'} style={{scrollbarWidth:'thin'}}>
            <div className={'sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center z-10'}>
              <div>
                <h2 className="text-base font-serif text-white flex items-center gap-2"><IC.BarChart className="w-5 h-5 text-indigo-400"/>Tara Training Engine</h2>
                <p className={'text-xs text-[#E8E9E4]/40 mt-0.5'}>{tradeLog.length} trades logged · Weights auto-updating every window</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>{
                  // V152: Expanded export — adds V145 telemetry + V152 rangePosition.
                  // outcomeDir column = direction implied by close vs strike (does NOT use t.dir).
                  // dir = the direction Tara LOCKED, distinct from the outcome.
                  const headers='id,timestampISO,dir,outcomeDir,result,posterior,rawPosterior,regime,clockAtLock,hour,session,windowType,'+
                                'gap,momentum,structure,flow,technical,regime_s,rangePosition,'+
                                'entryPrice,closingPrice,strikeAtLock,strikePrice,gapAtEntry,closingGapBps,'+
                                'kalshiAtLock,kalshiAtClose,fgtAlignment,rangeBps,qualityScore,'+
                                'geoRisk,geoTopic,reversed,earlyExit,forceExit';
                  const csv=[headers].concat(
                    tradeLog.map(t=>{
                      // V152: Compute outcomeDir from close vs strike (independent of t.dir).
                      // This is the actual outcome direction, separate from Tara's call.
                      let outcomeDir='';
                      if(t.closingPrice!=null&&t.strikePrice!=null){
                        outcomeDir=t.closingPrice>=t.strikePrice?'UP':'DOWN';
                      }
                      const safe=(v)=>v==null?'':String(v).replace(/[",\n]/g,' ');
                      const num=(v,d=2)=>v==null||isNaN(v)?'':Number(v).toFixed(d);
                      return [
                        t.id,safe(t.timestampISO),t.dir||'',outcomeDir,t.result||'PENDING',
                        num(t.posterior,1),num(t.rawPosterior,1),safe(t.regime),
                        t.clockAtLock||0,t.hour||0,safe(t.session),safe(t.windowType),
                        num(t.signals?.gap),num(t.signals?.momentum),num(t.signals?.structure),
                        num(t.signals?.flow),num(t.signals?.technical),num(t.signals?.regime),num(t.signals?.rangePosition),
                        num(t.entryPrice,2),num(t.closingPrice,2),num(t.strikeAtLock,2),num(t.strikePrice,2),
                        num(t.gapAtEntry,1),num(t.closingGapBps,1),
                        num(t.kalshiAtLock,1),num(t.kalshiAtClose,1),
                        t.fgtAlignment||0,num(t.rangeBps,2),num(t.qualityScore,0),
                        num(t.geoRisk,2),safe(t.geoTopic||'').slice(0,80),
                        t.reversed?1:0,t.earlyExit?1:0,t.forceExit?1:0,
                      ].join(',');
                    })
                  ).join('\n');
                  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='tara_training_data.csv';a.click();
                }} className={'px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-colors'}>Export CSV</button>
                <button onClick={()=>{if(confirm('Reset all training data and weights? Cannot undo.')){setAdaptiveWeights({...DEFAULT_WEIGHTS});setTradeLog([]);saveWeights({...DEFAULT_WEIGHTS});saveTradeLog([]);pendingTradeRef.current=null;}}} className={'px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-colors'}>Reset</button>
                <button onClick={()=>{setShowAnalytics(false);setSelectedTradeId(null);}} className={'text-[#E8E9E4]/50 hover:text-white'}><IC.X className="w-5 h-5"/></button>
              </div>
            </div>
            <div className="p-4 space-y-5">

              {/* V134: BACKTEST PANEL — replay all historical trades through current logic */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-400 mb-3">🔬 Backtest — Historical Performance Audit</h3>
                {(()=>{
                  const bt=runFullBacktest(tradeLog);
                  if(!bt.ready)return(<div className="text-xs text-[#E8E9E4]/50 p-3 bg-[#111312] rounded-lg">{bt.note}</div>);
                  const fmt=p=>(p*100).toFixed(1)+'%';
                  return(<div className="space-y-3">
                    {/* Top metrics row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5">
                        <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold">Overall WR</div>
                        <div className={'text-lg font-mono font-bold '+(bt.wr>=0.65?'text-emerald-400':bt.wr>=0.55?'text-amber-400':'text-rose-400')}>{fmt(bt.wr)}</div>
                        <div className="text-[10px] text-[#E8E9E4]/30">{bt.n} trades</div>
                      </div>
                      <div className="bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5">
                        <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold">Brier Score</div>
                        <div className={'text-lg font-mono font-bold '+(bt.brier<0.15?'text-emerald-400':bt.brier<0.20?'text-amber-400':'text-rose-400')}>{bt.brier.toFixed(3)}</div>
                        <div className="text-[10px] text-[#E8E9E4]/30">{bt.brier<0.10?'Excellent':bt.brier<0.15?'Strong':bt.brier<0.20?'Useful':bt.brier<0.24?'Marginal':'No skill'}</div>
                      </div>
                      <div className="bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5">
                        <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold">UP / DOWN</div>
                        <div className="text-sm font-mono">
                          <span className="text-emerald-400">{fmt(bt.upWR)}</span>
                          <span className="text-[#E8E9E4]/30 mx-1">/</span>
                          <span className="text-rose-400">{fmt(bt.dnWR)}</span>
                        </div>
                        <div className="text-[10px] text-[#E8E9E4]/30">direction split</div>
                      </div>
                      <div className="bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5">
                        <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold">Streaks</div>
                        <div className="text-sm font-mono">
                          <span className="text-emerald-400">{bt.maxWinStreak}W</span>
                          <span className="text-[#E8E9E4]/30 mx-1">/</span>
                          <span className="text-rose-400">{bt.maxLossStreak}L</span>
                        </div>
                        <div className="text-[10px] text-[#E8E9E4]/30">max consecutive</div>
                      </div>
                    </div>
                    {/* Filter scenarios — what WR if we'd applied different filters? */}
                    <div className="bg-[#111312] rounded-lg p-3 border border-[#E8E9E4]/5">
                      <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-2">Selectivity Scenarios — "What if I'd only taken these?"</div>
                      <div className="space-y-1.5">
                        {Object.entries(bt.filterScenarios).filter(([k,v])=>v).map(([name,s])=>{
                          const diff=s.wr-bt.wr;
                          const lift=diff*100;
                          return(<div key={name} className="flex items-center justify-between text-xs">
                            <span className="text-[#E8E9E4]/70">{name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[#E8E9E4]/40 text-[10px] font-mono">{s.n}t</span>
                              <span className={'font-mono font-bold '+(s.wr>=0.70?'text-emerald-400':s.wr>=0.60?'text-amber-400':'text-rose-400')}>{fmt(s.wr)}</span>
                              <span className={'font-mono text-[10px] w-12 text-right '+(lift>=2?'text-emerald-400':lift<=-2?'text-rose-400':'text-[#E8E9E4]/30')}>{lift>=0?'+':''}{lift.toFixed(1)}</span>
                            </div>
                          </div>);
                        })}
                      </div>
                    </div>
                    {/* Per-regime breakdown */}
                    <div className="bg-[#111312] rounded-lg p-3 border border-[#E8E9E4]/5">
                      <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-2">Per-Regime Performance</div>
                      <div className="space-y-1.5">
                        {Object.entries(bt.regimePerf).sort((a,b)=>b[1].n-a[1].n).map(([name,s])=>{
                          const wr=s.wins/s.n;
                          return(<div key={name} className="flex items-center justify-between text-xs">
                            <span className="text-[#E8E9E4]/70">{name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[#E8E9E4]/40 text-[10px] font-mono">{s.n}t</span>
                              <span className={'font-mono font-bold '+(wr>=0.65?'text-emerald-400':wr>=0.55?'text-amber-400':'text-rose-400')}>{fmt(wr)}</span>
                            </div>
                          </div>);
                        })}
                      </div>
                    </div>
                    {/* Lock timing */}
                    <div className="bg-[#111312] rounded-lg p-3 border border-[#E8E9E4]/5">
                      <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-2">Performance by Lock Timing</div>
                      <div className="space-y-1.5">
                        {Object.entries(bt.clockPerf).map(([name,s])=>{
                          if(s.n===0)return null;
                          const wr=s.wins/s.n;
                          return(<div key={name} className="flex items-center justify-between text-xs">
                            <span className="text-[#E8E9E4]/70">{name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[#E8E9E4]/40 text-[10px] font-mono">{s.n}t</span>
                              <span className={'font-mono font-bold '+(wr>=0.65?'text-emerald-400':wr>=0.55?'text-amber-400':'text-rose-400')}>{fmt(wr)}</span>
                            </div>
                          </div>);
                        })}
                      </div>
                    </div>
                    {/* Confidence calibration */}
                    <div className="bg-[#111312] rounded-lg p-3 border border-[#E8E9E4]/5">
                      <div className="text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-2">Calibration: Predicted vs Actual</div>
                      <div className="space-y-1">
                        {Object.entries(bt.confBuckets).filter(([_,s])=>s.n>0).map(([conf,s])=>{
                          const wr=s.wins/s.n;
                          const expected=parseInt(conf)/100+0.025;
                          const drift=wr-expected;
                          return(<div key={conf} className="flex items-center justify-between text-xs">
                            <span className="text-[#E8E9E4]/70">{conf}-{parseInt(conf)+5}%</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[#E8E9E4]/40 text-[10px] font-mono">{s.n}t</span>
                              <span className="font-mono">{fmt(wr)}</span>
                              <span className={'font-mono text-[10px] w-12 text-right '+(Math.abs(drift)<0.05?'text-emerald-400':Math.abs(drift)<0.10?'text-amber-400':'text-rose-400')}>{drift>=0?'+':''}{(drift*100).toFixed(1)}</span>
                            </div>
                          </div>);
                        })}
                      </div>
                    </div>
                  </div>);
                })()}
              </section>

              {/* Adaptive Weights */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-400 mb-3">Adaptive Signal Weights · <span className={'text-[#E8E9E4]/40 normal-case font-normal'}>{lastRegimeRef.current||'Global'} active</span></h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(adaptiveWeights).map(([key,val])=>{
                    const def=DEFAULT_WEIGHTS[key]||20;const pct=(val/55)*100;
                    const acc=signalAccuracy[key];const wrPct=acc?.total>=3?((acc.right/acc.total)*100).toFixed(0):null;
                    const delta=val-def;
                    return(<div key={key} className={'bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5'}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={'text-xs font-bold uppercase text-[#E8E9E4]/70'}>{key}</span>
                        <div className="flex items-center gap-1.5">
                          {wrPct&&<span className={'text-xs text-indigo-400/80'}>{wrPct}% acc</span>}
                          <span className={`text-xs font-mono font-bold ${delta>0?'text-emerald-400':delta<0?'text-rose-400':'text-[#E8E9E4]/50'}`}>{val.toFixed(1)}</span>
                          <span className={`text-xs ${delta>0?'text-emerald-400':delta<0?'text-rose-400':'text-[#E8E9E4]/30'}`}>{delta>0?'+':''}{delta.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#181A19] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${delta>2?'bg-emerald-500':delta<-2?'bg-rose-500':'bg-indigo-500'}`} style={{width:`${Math.min(100,pct)}%`}}/>
                      </div>
                      <div className={'flex justify-between mt-0.5 text-xs text-[#E8E9E4]/20'}>
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
                  <div className={'text-xs text-[#E8E9E4]/40 italic text-center py-4 bg-[#111312] rounded-lg border border-[#E8E9E4]/5'}>Need 10+ resolved trades to calibrate. Currently: {tradeLog.filter(t=>t.result).length}</div>
                ):(
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                    {[0,10,20,30,40,50,60,70,80,90].map(b=>{
                      const calVal=calibration[b];const isNull=calVal==null;
                      const diff=isNull?0:calVal-b;
                      return(<div key={b} className={'bg-[#111312] rounded-lg p-1.5 border border-[#E8E9E4]/5 text-center'}>
                        <div className={'text-xs text-[#E8E9E4]/30 mb-1'}>{b}-{b+10}%</div>
                        <div className={`text-xs font-bold font-mono ${isNull?'text-[#E8E9E4]/20':Math.abs(diff)<5?'text-emerald-400':Math.abs(diff)<15?'text-amber-400':'text-rose-400'}`}>
                          {isNull?'—':`${calVal.toFixed(0)}%`}
                        </div>
                        {!isNull&&<div className={`text-xs ${diff>0?'text-emerald-400':diff<0?'text-rose-400':'text-[#E8E9E4]/30'}`}>{diff>0?'+':''}{diff.toFixed(0)}</div>}
                      </div>);
                    })}
                  </div>
                )}
                <p className={'text-xs text-[#E8E9E4]/30 mt-2'}>Green = well-calibrated. Red = raw posterior is over- or under-estimating actual win rate. Tara applies calibration automatically after 3+ samples per bucket.</p>
              </section>

              {/* Session Performance */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-400 mb-3">Performance by Session</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(sessionPerf).map(([sess,data])=>{
                    const total=data.wins+data.losses;const wr=total>0?((data.wins/total)*100):0;
                    return(<div key={sess} className={'bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5 text-center'}>
                      <div className={'text-xs font-bold text-[#E8E9E4]/70 mb-1'}>{sess}</div>
                      <div className={`text-lg font-serif font-bold ${wr>=60?'text-emerald-400':wr>=45?'text-amber-400':'text-rose-400'}`}>{total>0?`${wr.toFixed(0)}%`:'—'}</div>
                      <div className={'text-xs text-[#E8E9E4]/30'}>{data.wins}W  {data.losses}L</div>
                    </div>);
                  })}
                </div>
              </section>

              {/* Hourly Heatmap */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-purple-400 mb-3">Performance by Hour (local)</h3>
                {Object.keys(hourlyPerf).length<3?<div className={'text-xs text-[#E8E9E4]/40 italic text-center py-4 bg-[#111312] rounded-lg border border-[#E8E9E4]/5'}>Need more trades to build hourly map.</div>:(
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                  {Array.from({length:24},(_,h)=>{
                    const d=hourlyPerf[h];const total=d?(d.wins+d.losses):0;const wr=total>0?((d.wins/total)*100):null;
                    return(<div key={h} className="rounded p-1 text-center" style={{background:wr==null?'rgba(232,233,228,0.03)':wr>=65?'rgba(52,211,153,0.2)':wr>=45?'rgba(251,191,36,0.15)':'rgba(251,113,133,0.2)'}}>
                      <div className={'text-xs text-[#E8E9E4]/30'}>{h}h</div>
                      <div className={`text-xs font-bold ${wr==null?'text-[#E8E9E4]/20':wr>=65?'text-emerald-400':wr>=45?'text-amber-400':'text-rose-400'}`}>{wr!=null?`${wr.toFixed(0)}%`:'·'}</div>
                    </div>);
                  })}
                </div>)}
              </section>

              {/* Recent Trade Log — Editable */}
              <section>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className={'text-xs font-bold uppercase tracking-wide text-[#E8E9E4]/60'}>Trade Log ({tradeLog.length} total)</h3>
                  <p className={'text-[10px] text-[#E8E9E4]/30'}>Tap a trade to edit · Fix any wrong WIN or LOSS</p>
                </div>

                {/* Edit panel — shows when a trade is selected */}
                {selectedTradeId&&(()=>{
                  const selected=tradeLog.find(t=>t.id===selectedTradeId);
                  if(!selected)return null;
                  const correctTrade=(id,newResult)=>{
                    const oldTrade=tradeLog.find(t=>t.id===id);
                    const newLog=tradeLog.map(t=>t.id!==id?t:{...t,result:newResult,manuallyEdited:true});
                    saveTradeLog(newLog);setTradeLog(newLog);
                    if(oldTrade?.result&&oldTrade.result!==newResult){
                      const wType=oldTrade.windowType||windowType;
                      if(oldTrade.result==='WIN'){updateScore(wType,'wins',-1);updateScore(wType,'losses',1);}
                      else{updateScore(wType,'losses',-1);updateScore(wType,'wins',1);}
                    }
                    (()=>{const _newW=updateWeights(adaptiveWeights,newLog,newResult);const _diffs=computeWeightDiff(adaptiveWeights,_newW);setAdaptiveWeights(_newW);if(_diffs.length>0)setLastLearningUpdate({result:newResult,diffs:_diffs,at:Date.now()});})();
                    setSelectedTradeId(null);
                  };
                  const deleteTrade=(id)=>{
                    const oldTrade=tradeLog.find(t=>t.id===id);
                    const newLog=tradeLog.filter(t=>t.id!==id);
                    saveTradeLog(newLog);setTradeLog(newLog);
                    if(oldTrade?.result){const wType=oldTrade.windowType||windowType;updateScore(wType,oldTrade.result==='WIN'?'wins':'losses',-1);}
                    setSelectedTradeId(null);
                  };
                  return(
                    <div className={'mb-3 p-3 rounded-xl border-2 border-indigo-500/40 bg-[#111312]'}>
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm ${selected.dir==='UP'?'text-emerald-400':'text-rose-400'}`}>{selected.dir}</span>
                          <span className={'text-xs text-[#E8E9E4]/50'}>{new Date(selected.id).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}</span>
                          <span className={'text-xs text-[#E8E9E4]/40 hidden sm:inline'}>{selected.posterior?.toFixed(0)}% · {selected.regime}</span>
                          {selected.manuallyEdited&&<span className={'text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded'}>edited</span>}
                        </div>
                        <button onClick={()=>setSelectedTradeId(null)} className={'text-[#E8E9E4]/40 hover:text-white p-1 ml-auto'}><IC.X className="w-4 h-4"/></button>
                      </div>
                      <div className={'text-xs text-[#E8E9E4]/50 mb-3'}>
                        Logged as: <span className={`font-bold ${selected.result==='WIN'?'text-emerald-400':selected.result==='LOSS'?'text-rose-400':'text-[#E8E9E4]/30'}`}>{selected.result||'PENDING'}</span>
                        {selected.earlyExit&&' · early exit'}{selected.forceExit&&' · force exit'}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>correctTrade(selected.id,'WIN')}
                          className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${selected.result==='WIN'?'bg-emerald-500/30 border-emerald-400 text-emerald-300':'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/15'}`}>
                          ✓ Mark WIN
                        </button>
                        <button onClick={()=>correctTrade(selected.id,'LOSS')}
                          className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${selected.result==='LOSS'?'bg-rose-500/30 border-rose-400 text-rose-300':'border-rose-500/30 text-rose-500 hover:bg-rose-500/15'}`}>
                          ✗ Mark LOSS
                        </button>
                        <button onClick={()=>deleteTrade(selected.id)}
                          className={'px-3 py-2.5 rounded-lg text-xs font-bold border border-zinc-500/30 text-zinc-500 hover:bg-zinc-500/15 hover:text-zinc-300 transition-all'}>
                          Delete
                        </button>
                      </div>
                      <p className={'text-[10px] text-[#E8E9E4]/30 mt-2 text-center'}>Updates scorecard and retrains signal weights</p>
                    </div>
                  );
                })()}

                {/* Trade rows */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1" style={{scrollbarWidth:'thin'}}>
                  {tradeLog.length===0?(
                    <div className={'text-xs text-[#E8E9E4]/30 italic text-center py-6'}>No trades yet — trades log automatically when Tara locks and the window closes.</div>
                  ):tradeLog.slice(-30).reverse().map((t,i)=>{
                    const d=new Date(t.id);
                    const isSel=selectedTradeId===t.id;
                    return(
                      <button key={t.id||i} onClick={()=>setSelectedTradeId(isSel?null:t.id)}
                        className={`w-full flex items-center gap-2 text-xs p-2.5 rounded-lg border transition-all text-left ${
                          isSel?'border-indigo-500/60 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                          :t.result==='WIN'?'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
                          :t.result==='LOSS'?'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40'
                          :'border-[#E8E9E4]/5 hover:border-[#E8E9E4]/15'}`}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSel?'bg-indigo-400':t.result==='WIN'?'bg-emerald-500':t.result==='LOSS'?'bg-rose-500':'bg-[#E8E9E4]/20'}`}/>
                        <span className={'text-[#E8E9E4]/40 font-mono shrink-0 text-[10px] hidden sm:inline'}>{d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} </span>
                        <span className={'text-[#E8E9E4]/40 font-mono shrink-0 text-[10px]'}>{d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}</span>
                        <span className={`font-bold shrink-0 ${t.dir==='UP'?'text-emerald-400':'text-rose-400'}`}>{t.dir}</span>
                        <span className={'text-[#E8E9E4]/40 text-[10px] shrink-0'}>{t.posterior?.toFixed(0)}%</span>
                        <span className={'text-[#E8E9E4]/25 text-[10px] truncate hidden md:block'}>{t.regime}</span>
                        <span className={'text-[#E8E9E4]/25 text-[10px] ml-auto shrink-0'}>{t.session}</span>
                        <span className={`font-bold shrink-0 min-w-[36px] text-right ${t.result==='WIN'?'text-emerald-400':t.result==='LOSS'?'text-rose-400':'text-[#E8E9E4]/25'}`}>{t.result||'—'}</span>
                        {t.manuallyEdited&&<span className={'text-amber-400/60 shrink-0 text-[10px]'}>✎</span>}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ── HOURLY HEATMAP ── */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-400 mb-3">Hourly Win Rate Heatmap (24h UTC) — {windowType.toUpperCase()}</h3>
                {/* Window tab selector */}
                <div className="flex gap-1 mb-3">
                  {['15m','5m'].map(wt=>(
                    <button key={wt} onClick={()=>{}} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${windowType===wt?'bg-indigo-500/20 border-indigo-500/40 text-indigo-400':'border-[#E8E9E4]/10 text-[#E8E9E4]/30'}`}>{wt}</button>
                  ))}
                  <span className={'text-[9px] text-[#E8E9E4]/25 ml-2 self-center'}>Showing trades from your active window</span>
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-12 gap-1">
                  {Array.from({length:24},(_,h)=>{
                    const trades=tradeLog.filter(t=>t.result&&t.hour===h&&(!t.windowType||t.windowType===windowType));
                    const wins=trades.filter(t=>t.result==='WIN').length;
                    const wr=trades.length>=2?(wins/trades.length)*100:null;
                    const intensity=wr===null?0:wr>=75?4:wr>=60?3:wr>=50?2:wr>=40?1:0;
                    const colors=['bg-[#E8E9E4]/5','bg-rose-500/30','bg-amber-500/30','bg-emerald-500/30','bg-emerald-500/60'];
                    const labels=['No data','<50%','50–60%','60–75%','≥75%'];
                    return(
                      <div key={h} className={`${colors[intensity]} rounded p-1.5 text-center cursor-default`} title={`Hour ${h}:00 UTC · ${trades.length} trades${wr!==null?' · '+wr.toFixed(0)+'% WR':' — need ≥2 trades'}`}>
                        <div className={'text-[9px] text-[#E8E9E4]/40 font-mono'}>{String(h).padStart(2,'0')}</div>
                        {wr!==null?(
                          <div className={`text-[10px] font-bold ${wr>=60?'text-emerald-300':wr>=50?'text-amber-300':'text-rose-300'}`}>{wr.toFixed(0)}%</div>
                        ):(
                          <div className={'text-[10px] text-[#E8E9E4]/20'}>—</div>
                        )}
                        {trades.length>0&&<div className={'text-[8px] text-[#E8E9E4]/25'}>{trades.length}t</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {[['bg-rose-500/30','<50%'],['bg-amber-500/30','50–60%'],['bg-emerald-500/30','60–75%'],['bg-emerald-500/60','≥75%'],['bg-[#E8E9E4]/5','No data']].map(([c,l])=>(
                    <div key={l} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded ${c}`}></div>
                      <span className={'text-[9px] text-[#E8E9E4]/40'}>{l}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── PER-REGIME WEIGHTS ── */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-400 mb-3">Per-Regime Signal Weights</h3>
                <div className="space-y-3">
                  {Object.entries(regimeWeights).map(([rg,w])=>{
                    const rgTrades=tradeLog.filter(t=>t.result&&t.regime===rg);
                    const rgWins=rgTrades.filter(t=>t.result==='WIN').length;
                    const isActive=lastRegimeRef.current===rg;
                    return(
                      <div key={rg} className={`p-2.5 rounded-lg border ${isActive?'border-indigo-500/40 bg-indigo-500/5':'border-[#E8E9E4]/8 bg-[#111312]'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-xs font-bold uppercase ${isActive?'text-indigo-400':'text-[#E8E9E4]/50'}`}>{rg}{isActive&&' ◀ active'}</span>
                          <span className={'text-[10px] text-[#E8E9E4]/30'}>{rgTrades.length} trades · {rgTrades.length>0?(rgWins/rgTrades.length*100).toFixed(0)+'% WR':'no data'}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                          {Object.entries(w).map(([k,v])=>(
                            <div key={k} className="text-center">
                              <div className={'text-[9px] text-[#E8E9E4]/30 uppercase'}>{k.slice(0,3)}</div>
                              <div className={'text-[11px] font-mono font-bold text-[#E8E9E4]/70'}>{v.toFixed(1)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* V145: ── PERFORMANCE BY HOUR & DAY-OF-WEEK ── */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-400 mb-3">Performance Patterns</h3>
                {(()=>{
                  const completed=tradeLog.filter(t=>t.result);
                  if(completed.length===0)return<div className={'text-xs text-[#E8E9E4]/30 italic'}>No completed trades yet.</div>;

                  // Aggregate by hour of day (0-23)
                  const byHour={};
                  // Aggregate by day-of-week (Mon-Sun)
                  const byDOW={};
                  // Aggregate by session
                  const bySession={};

                  completed.forEach(t=>{
                    // Use timestampISO if present (V145+), else fall back to id (timestamp)
                    let d;
                    if(t.timestampISO){d=new Date(t.timestampISO);}
                    else{d=new Date(t.id/1);}
                    const isValid=!isNaN(d.getTime())&&d.getFullYear()>2020;
                    const h=isValid?d.getHours():(t.hour||0);
                    const dow=isValid?d.getDay():null; // 0=Sun, 1=Mon ...
                    if(!byHour[h])byHour[h]={W:0,L:0};
                    byHour[h][t.result==='WIN'?'W':'L']++;
                    if(dow!=null){
                      if(!byDOW[dow])byDOW[dow]={W:0,L:0};
                      byDOW[dow][t.result==='WIN'?'W':'L']++;
                    }
                    const sess=t.session||'—';
                    if(!bySession[sess])bySession[sess]={W:0,L:0};
                    bySession[sess][t.result==='WIN'?'W':'L']++;
                  });

                  const dowLabels=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                  const formatHour=h=>{const h12=h%12||12;return `${h12}${h<12?'a':'p'}`;};
                  const cellCls=(wr,n)=>n<2?'bg-[#111312] text-[#E8E9E4]/25':wr>=65?'bg-emerald-500/15 text-emerald-300':wr>=55?'bg-amber-500/10 text-amber-300':wr>=45?'bg-[#111312] text-[#E8E9E4]/50':'bg-rose-500/10 text-rose-300';

                  return(
                    <div className="space-y-4">
                      {/* By session (most actionable) */}
                      <div>
                        <div className={'text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-2'}>By Session</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {['EU','ASIA','US','OFF-HOURS'].map(s=>{
                            const v=bySession[s]||{W:0,L:0};
                            const n=v.W+v.L;
                            const wr=n>0?(100*v.W/n):0;
                            return(
                              <div key={s} className={`p-2 rounded border border-[#E8E9E4]/8 ${cellCls(wr,n)}`}>
                                <div className="text-[10px] uppercase font-bold opacity-70">{s}</div>
                                <div className="text-base font-mono font-bold mt-0.5">{n>0?wr.toFixed(0)+'%':'—'}</div>
                                <div className="text-[9px] opacity-60">{v.W}W-{v.L}L · {n} trades</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* By day of week */}
                      <div>
                        <div className={'text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-2'}>By Day of Week</div>
                        <div className="grid grid-cols-7 gap-1">
                          {dowLabels.map((lbl,idx)=>{
                            const v=byDOW[idx]||{W:0,L:0};
                            const n=v.W+v.L;
                            const wr=n>0?(100*v.W/n):0;
                            return(
                              <div key={lbl} className={`p-1.5 rounded text-center border border-[#E8E9E4]/8 ${cellCls(wr,n)}`}>
                                <div className="text-[9px] uppercase opacity-70">{lbl}</div>
                                <div className="text-xs font-mono font-bold mt-0.5">{n>0?wr.toFixed(0)+'%':'—'}</div>
                                <div className="text-[8px] opacity-60">{n>0?`${v.W}-${v.L}`:'—'}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* By hour of day */}
                      <div>
                        <div className={'text-[10px] uppercase text-[#E8E9E4]/40 font-bold mb-2'}>By Hour of Day (local)</div>
                        <div className="grid grid-cols-12 gap-1">
                          {Array.from({length:24}).map((_,h)=>{
                            const v=byHour[h]||{W:0,L:0};
                            const n=v.W+v.L;
                            const wr=n>0?(100*v.W/n):0;
                            return(
                              <div key={h} className={`p-1 rounded text-center border border-[#E8E9E4]/8 ${cellCls(wr,n)}`} title={n>0?`${formatHour(h)}: ${v.W}W-${v.L}L (${wr.toFixed(0)}%)`:`${formatHour(h)}: no data`}>
                                <div className="text-[8px] opacity-70">{formatHour(h)}</div>
                                <div className="text-[10px] font-mono font-bold">{n>0?wr.toFixed(0):'—'}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className={'text-[9px] text-[#E8E9E4]/30 mt-1 italic'}>Cells with &lt; 2 trades shown as dashes. Hover for detail.</div>
                      </div>

                      {/* Color legend */}
                      <div className="flex items-center gap-3 text-[9px] text-[#E8E9E4]/40 pt-1 border-t border-[#E8E9E4]/8">
                        <span className="font-bold uppercase">Legend</span>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500/15"></div><span>≥65% WR</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-500/10"></div><span>55-64%</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#111312] border border-[#E8E9E4]/15"></div><span>45-54%</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-rose-500/10"></div><span>&lt; 45%</span></div>
                      </div>
                    </div>
                  );
                })()}
              </section>

              {/* ── TRADE LOG — Day by Day ── */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-400 mb-3">Trade Log — by Day</h3>
                {(()=>{
                  // Group trades by calendar date
                  const byDay={};
                  [...tradeLog].filter(t=>t.result).reverse().forEach(t=>{
                    const d=new Date(t.id/1);
                    const isValidDate=!isNaN(d.getTime())&&d.getFullYear()>2020;
                    const key=isValidDate?d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}):'Unknown date';
                    if(!byDay[key])byDay[key]=[];
                    byDay[key].push(t);
                  });
                  const days=Object.entries(byDay).slice(0,14); // show last 14 days
                  if(days.length===0)return<div className={'text-xs text-[#E8E9E4]/30 italic'}>No completed trades yet.</div>;
                  return days.map(([day,trades])=>{
                    const wins=trades.filter(t=>t.result==='WIN').length;
                    const wr=Math.round(wins/trades.length*100);
                    return(
                      <div key={day} className="mb-3">
                        {/* Day header */}
                        <div className={'flex items-center justify-between mb-1.5 pb-1 border-b border-[#E8E9E4]/8'}>
                          <span className={'text-[10px] font-bold uppercase tracking-wide text-[#E8E9E4]/50'}>{day}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-emerald-400 font-mono">{wins}W</span>
                            <span className="text-[9px] text-rose-400 font-mono">{trades.length-wins}L</span>
                            <span className={`text-[9px] font-bold ${wr>=65?'text-emerald-400':wr>=50?'text-amber-400':'text-rose-400'}`}>{wr}%</span>
                          </div>
                        </div>
                        {/* Trades for that day */}
                        <div className="space-y-1">
                          {trades.map((t,i)=>{
                            const d=new Date(t.id/1);
                            const timeStr=isNaN(d.getTime())?'—':d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
                            // V145: if expanded telemetry present, show entry → close and Kalshi edge
                            const hasV145=t.entryPrice!=null&&t.entryPrice>0&&t.closingPrice!=null;
                            const moveBps=hasV145&&t.entryPrice>0?Math.round(((t.closingPrice-t.entryPrice)/t.entryPrice)*10000):null;
                            const kalshiEdge=t.kalshiAtLock!=null&&t.posterior!=null?(t.dir==='UP'?(t.posterior-t.kalshiAtLock):((100-t.posterior)-(100-t.kalshiAtLock))):null;
                            return(
                              <div key={i} className={`px-2 py-1 rounded border ${t.result==='WIN'?'bg-emerald-500/5 border-emerald-500/15':'bg-rose-500/5 border-rose-500/15'}`}>
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className={'font-mono text-[#E8E9E4]/30 shrink-0 w-14'}>{timeStr}</span>
                                  <span className={`font-bold w-8 shrink-0 ${t.dir==='UP'?'text-emerald-400':'text-rose-400'}`}>{t.dir}</span>
                                  <span className={'text-[#E8E9E4]/40 shrink-0'}>{t.windowType||'15m'}</span>
                                  <span className={'text-[#E8E9E4]/30 flex-1 truncate'}>{t.regime||'—'}</span>
                                  <span className={'text-[#E8E9E4]/25 shrink-0'}>{t.session||'—'}</span>
                                  <span className={`font-bold shrink-0 ${t.result==='WIN'?'text-emerald-400':'text-rose-400'}`}>{t.result}</span>
                                </div>
                                {hasV145&&(
                                  <div className="flex items-center gap-2 text-[9px] mt-1 pt-1 border-t border-[#E8E9E4]/6 text-[#E8E9E4]/40">
                                    <span className="font-mono">@${Math.round(t.entryPrice).toLocaleString()}</span>
                                    <span>→</span>
                                    <span className="font-mono">${Math.round(t.closingPrice).toLocaleString()}</span>
                                    {moveBps!=null&&<span className={`font-mono ${moveBps>=0?'text-emerald-400/60':'text-rose-400/60'}`}>{moveBps>=0?'+':''}{moveBps}bps</span>}
                                    {t.posterior!=null&&<span className="ml-auto">Tara {t.posterior.toFixed(0)}%</span>}
                                    {kalshiEdge!=null&&<span className={`${kalshiEdge>=15?'text-emerald-400':kalshiEdge>=0?'text-[#E8E9E4]/40':'text-amber-400'}`}>edge {kalshiEdge>=0?'+':''}{kalshiEdge.toFixed(0)}</span>}
                                    {t.fgtAlignment!=null&&Math.abs(t.fgtAlignment)>=2&&<span className="text-purple-400/60">FGT {Math.abs(t.fgtAlignment)}/4 {t.fgtAlignment>0?'↑':'↓'}</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </section>

              {/* Training Tips */}
              <section className={'bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3'}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-400 mb-2">How to Train Tara Faster</h3>
                <div className={'text-xs text-[#E8E9E4]/60 space-y-1 leading-relaxed'}>
                  <p>• <strong className="text-indigo-300">Every window auto-updates weights.</strong> The more she trades, the more accurate her signal weights become.</p>
                  <p>• <strong className="text-indigo-300">Export CSV</strong> and run external regression (Python sklearn) on 500+ trades to get optimal weights, then paste them back.</p>
                  <p>• <strong className="text-indigo-300">Best regime to focus on:</strong> Look at session performance — if US session is 70%+ WR, run exclusively during US hours.</p>
                  <p>• <strong className="text-indigo-300">Calibration corrects overconfidence</strong> — if Tara says 80% but only wins 60% of those, calibration fixes the displayed number after 3+ samples.</p>
                  <p>• <strong className="text-indigo-300">Accuracy improves with volume:</strong> need 100+ trades in the log for weights to converge and calibration to become reliable.</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ── HOW TARA WORKS GUIDE ── */}
      {showGuide&&(
        <div className={'fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4'}>
          <div className={'bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-2xl max-h-[95vh] mx-2 sm:mx-0 overflow-y-auto shadow-2xl'} style={{scrollbarWidth:'thin'}}>
            <div className={'sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center z-10'}>
              <div>
                <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2">
                  <span className="text-indigo-400 text-xl font-bold">?</span> How Tara 3.1.5 Works
                </h2>
                <p className={'text-xs text-[#E8E9E4]/40 mt-0.5'}>Complete guide — predictions, learning, advisor, and best practices</p>
              </div>
              <button onClick={()=>setShowGuide(false)} className={'text-[#E8E9E4]/50 hover:text-white p-1'}><IC.X className="w-5 h-5"/></button>
            </div>
            <div className={'p-4 sm:p-6 space-y-6 text-sm text-[#E8E9E4]/80'}>

              {/* V134: BEST PRACTICES */}
              <section className={'bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4'}>
                <h3 className={'text-emerald-400 font-bold uppercase tracking-wide mb-3 text-xs'}>🏆 Best Way to Use Tara</h3>
                <div className="space-y-2.5 text-xs leading-relaxed text-[#E8E9E4]/70">
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold shrink-0 w-5">1.</span><p><strong className="text-white">Use the Stats view (📊 button) to find your edges.</strong> Click hourly cells to drill into individual trades. Look at the "Insights" section — auto-generated findings tell you which regimes, hours, and FGT alignments are actually working for you.</p></div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold shrink-0 w-5">2.</span><p><strong className="text-white">Watch the macro banner.</strong> Red BLACKOUT before CPI/NFP/FOMC means SIT OUT. Trading through scheduled news is a high-loss category. The 30min before any major release is the worst time to enter.</p></div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold shrink-0 w-5">3.</span><p><strong className="text-white">Trust FGT alignment.</strong> When 5m + 15m agree (the two highest-weight timeframes), Tara has her strongest forecast. FGT 3/4+ alignment in the data audit correlated with 70-100% WR depending on regime. The badge in the prediction card pulses on full alignment — watch for it.</p></div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold shrink-0 w-5">4.</span><p><strong className="text-white">Trust the trajectory badge.</strong> When you see ↗ TRAJ +X or ↘ TRAJ -X, Tara is reading where price is heading, not just where it is. Strong trajectory locks (≥12) are her highest-conviction calls.</p></div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold shrink-0 w-5">5.</span><p><strong className="text-white">Respect the velocity badge.</strong> 🔥 EXTREME means a news/CPI move is happening — wait for the dust to settle. ⚡ FAST is great for trajectory locks. 🐢 SLOW often means choppy noise — be more selective.</p></div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold shrink-0 w-5">6.</span><p><strong className="text-white">Read the tape strip.</strong> Buy% trajectory across 5s/15s/30s/60s windows tells you if pressure is accelerating or fading. Confirms or challenges Tara's call. When Tara says UP and tape is "↑ accelerating buy" — high conviction. When Tara says UP and tape is "↓ buy fading" — caution.</p></div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold shrink-0 w-5">7.</span><p><strong className="text-white">Bet sizing follows the Bet: X% indicator.</strong> When Tara shows Q70-80, she recommends ½ Kelly. Q90+ recommends ¾ Kelly. Never bet beyond her suggestion — that's where blowups happen.</p></div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold shrink-0 w-5">8.</span><p><strong className="text-white">After 3 losses, slow down.</strong> Tara auto-tightens (-8 quality) on cold streaks to prevent revenge trading. Trust the signal — it's there to protect you.</p></div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold shrink-0 w-5">9.</span><p><strong className="text-white">Send to Discord only when you're entering.</strong> Tara doesn't auto-broadcast. Click the 📡 button only when you actually take the trade.</p></div>
                  <div className="flex gap-3"><span className="text-emerald-400 font-bold shrink-0 w-5">10.</span><p><strong className="text-white">Sync after major updates.</strong> Settings → Sync to Latest Baseline pulls the freshest training data (currently 485-302) so you start with Tara's best weights.</p></div>
                </div>
              </section>

              {/* PREDICTIONS */}
              <section>
                <h3 className={'text-indigo-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-indigo-500/20 pb-1'}>📊 Prediction States — What Each One Means</h3>
                <div className="space-y-3">
                  <div className={'bg-[#111312] rounded-lg p-3 border border-[#E8E9E4]/5'}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-zinc-400 font-bold text-xs">SCANNING...</span><span className={'text-[10px] text-[#E8E9E4]/30 uppercase'}>Do nothing</span></div>
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}>Tara's composite score is between 42–58% — a coin flip zone. No structural edge exists right now. Do not enter. Most tools show a number at all times to look busy — Tara shows nothing when there's genuinely nothing to show.</p>
                  </div>
                  <div className={'bg-[#111312] rounded-lg p-3 border border-amber-500/15'}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-amber-400 font-bold text-xs">UP (FORMING) or DOWN (FORMING)</span><span className={'text-[10px] text-[#E8E9E4]/30 uppercase'}>Get ready</span></div>
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}>Posterior has crossed 58%+ or below 42% — there's a lean — but not enough consecutive readings yet to commit. The forming progress bar shows how close she is to locking. You can enter here for more time in the trade, but it's higher risk than waiting for the lock.</p>
                  </div>
                  <div className={'bg-[#111312] rounded-lg p-3 border border-emerald-500/20'}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-emerald-400 font-bold text-xs">UP — LOCKED 🔒</span><span className={'text-[10px] text-[#E8E9E4]/30 uppercase'}>Entry signal — act now</span></div>
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}>2 consecutive readings (15m) or 1 consecutive (5m) all above the regime-specific threshold (60-75 depending on regime). Tara has committed for the window. She will NOT change this prediction without a 25+ point posterior collapse or severe trajectory flip. The lock state machine is designed to commit and stay committed. This is the <strong className="text-white">primary state to enter on.</strong></p>
                  </div>
                  <div className={'bg-[#111312] rounded-lg p-3 border border-rose-500/20'}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-rose-400 font-bold text-xs">DOWN — LOCKED 🔒</span><span className={'text-[10px] text-[#E8E9E4]/30 uppercase'}>Entry signal — act now</span></div>
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}>Same as UP — LOCKED but bearish. Posterior consistently below the regime-specific DOWN threshold (20-36 depending on regime — V2.8 made these symmetric with UP-side thresholds in choppy regimes). If you missed the entry window and it's late, the advisor will say WINDOW CLOSING — don't chase it.</p>
                  </div>
                  <div className={'bg-[#111312] rounded-lg p-3 border border-zinc-500/15'}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-zinc-400 font-bold text-xs">NO CALL — WINDOW CLOSED — LOCK RELEASED</span><span className="text-[10px] text-rose-400 uppercase">Sit out</span></div>
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}><strong className="text-white">NO CALL:</strong> Never reached threshold before endgame. Skip this round.<br/><strong className="text-white">WINDOW CLOSED:</strong> Last 90s (15m) or 45s (5m) with no lock. Too late to enter safely.<br/><strong className="text-white">LOCK RELEASED:</strong> Posterior collapsed 25+ points or trajectory/FGT flipped against direction. Tara released — respect it immediately.</p>
                  </div>
                </div>
              </section>

              {/* STRIKE PRICE */}
              <section>
                <h3 className={'text-emerald-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-emerald-500/20 pb-1'}>🎯 Strike Price — Auto vs Manual</h3>
                <div className={'bg-[#111312] rounded-lg p-3 border border-[#E8E9E4]/5 space-y-2 text-xs leading-relaxed text-[#E8E9E4]/60'}>
                  <p>The strike is automatically set to the <strong className="text-white">opening price of each window candle</strong> — fetched directly from Coinbase at the start of every 5m or 15m period. This matches what the binary options platform uses as the strike.</p>
                  <p>The <strong className="text-emerald-400">AUTO</strong> badge means Tara is tracking window opens automatically. Click it to reset to auto after a manual override.</p>
                  <p>Type any price in the Strike input to switch to <strong className="text-amber-400">MANUAL</strong> mode — useful if your platform uses a slightly different strike. Manual mode resets to auto at each new window.</p>
                </div>
              </section>

              {/* SIGNALS */}
              <section>
                <h3 className={'text-purple-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-purple-500/20 pb-1'}>⚙️ How Tara Builds Her Prediction</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    {name:'Gap Gravity (W:35)',desc:'Distance + direction from strike, amplified by time decay. The further in profit with less time remaining, the stronger this signal.'},
                    {name:'Momentum (W:30)',desc:'1m, 5m, 15m drift readings. When all three align in the same direction, the signal gets 1.5× multiplied.'},
                    {name:'Candle Structure (W:15)',desc:'Counts consecutive same-direction candles. 3+ green with volume surge = strong bullish confirmation.'},
                    {name:'Flow Imbalance (W:20)',desc:'Real-time buy/sell delta from Binance Futures + Bybit WebSockets. Whale buying pressure directly boosts UP posterior.'},
                    {name:'Technical (W:25)',desc:'RSI divergence, VWAP position, Bollinger Band squeeze, price channel. Prevents chasing overbought tops.'},
                    {name:'Funding & Regime (W:15)',desc:'Detects SHORT SQUEEZE (retail short + whales buying), LONG SQUEEZE, TRENDING, CHOP. Adjusts thresholds per regime.'},
                  ].map((s,i)=>(
                    <div key={i} className={'bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5'}>
                      <div className="text-indigo-300 font-bold mb-1">{s.name}</div>
                      <div className={'text-[#E8E9E4]/50 leading-relaxed'}>{s.desc}</div>
                    </div>
                  ))}
                </div>
                <p className={'text-xs text-[#E8E9E4]/40 mt-2 leading-relaxed'}>Weights are not fixed — they adapt automatically after every trade using gradient descent. Signals that contributed to correct predictions grow; signals that contributed to losses shrink.</p>
              </section>

              {/* LEARNING */}
              <section>
                <h3 className={'text-amber-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-amber-500/20 pb-1'}>🧠 How Tara Learns After Every Trade</h3>
                <div className={'space-y-2 text-xs leading-relaxed text-[#E8E9E4]/60'}>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">1.</span><p><strong className="text-white">Lock logging:</strong> When a lock fires, all 6 raw signal scores + posterior + regime + time + session are saved to a trade log.</p></div>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">2.</span><p><strong className="text-white">Result resolution:</strong> At window close (or manual cashout or cut), WIN or LOSS is attached to the trade record.</p></div>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">3.</span><p><strong className="text-white">Gradient descent:</strong> Signals that contributed correctly get their weight increased. Signals that were misleading get reduced. Learning rate: 0.8.</p></div>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">4.</span><p><strong className="text-white">Calibration:</strong> After 3+ trades per posterior bucket, she corrects overconfidence. If she said 80% but only won 60% of those, the displayed confidence adjusts to reflect reality.</p></div>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">5.</span><p><strong className="text-white">Session & hourly tracking:</strong> Tracks win rates by ASIA, EU, US session and by hour. Check the Training panel (📊 button) to find your best windows.</p></div>
                  <div className="flex gap-3"><span className="text-indigo-400 font-bold shrink-0">6.</span><p><strong className="text-white">Convergence:</strong> Weights stabilize meaningfully after ~80–100 trades. Export the CSV from Training panel and run Python logistic regression to get mathematically optimal weights.</p></div>
                </div>
              </section>

              {/* ADVISOR */}
              <section>
                <h3 className={'text-rose-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-rose-500/20 pb-1'}>🔔 Advisor Calls — In-Trade Management</h3>
                <div className="space-y-1.5 text-xs">
                  {[
                    {label:'30% STOP HIT',color:'text-rose-500',desc:'Hard floor. Position down 30% from entry. Exit immediately — no argument.'},
                    {label:'RUG PULL DETECTED',color:'text-rose-500',desc:'Tick slope + flow both collapsing while long. Flash crash in progress. Exit.'},
                    {label:'EXIT NOW — ODDS COLLAPSED',color:'text-rose-400',desc:'Win rate below 20% while in trade. Exit immediately and wait for Tara next lock signal.'},
                    {label:'TAKE MAX PROFIT',color:'text-emerald-400',desc:'Offer 40%+ above bet AND momentum reversing. Lock in exceptional returns before they vanish.'},
                    {label:'TRAILING STOP HIT',color:'text-emerald-400',desc:'Offer pulled back 12% from its peak. Momentum turned — exit before more slips.'},
                    {label:'SCALP PROFIT',color:'text-emerald-400',desc:'12%+ profit, window under 15% remaining, momentum fading. Take it — time kills you here.'},
                    {label:'CUT LOSSES — NOW',color:'text-rose-400',desc:'Win rate <38% + adverse acceleration. Getting worse faster. Exit preserves capital.'},
                    {label:'HOLD STRONG',color:'text-emerald-400',desc:'Winning + momentum aligned. Do nothing. This is the hardest discipline in trading.'},
                    {label:'RECOVERY IN PROGRESS',color:'text-amber-400',desc:'Losing but momentum just flipped toward you. Give it room — don\'t panic exit at the worst moment.'},
                  ].map((a,i)=>(
                    <div key={i} className={'flex gap-3 bg-[#111312] rounded-lg p-2 border border-[#E8E9E4]/5'}>
                      <span className={`${a.color} font-bold shrink-0 min-w-[140px] text-[10px] uppercase`}>{a.label}</span>
                      <span className={'text-[#E8E9E4]/50 text-[11px] leading-snug'}>{a.desc}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* BEST PRACTICES */}
              <section>
                <h3 className={'text-white font-bold uppercase tracking-wide mb-3 text-xs border-b border-[#E8E9E4]/10 pb-1'}>✅ Best Practices for Maximum Edge</h3>
                <div className={'space-y-2 text-xs leading-relaxed text-[#E8E9E4]/60'}>
                  <p>🔒 <strong className="text-white">Only enter on LOCKED signals.</strong> Skip FORMING, skip SCANNING. The win rate difference between LOCKED and FORMING entries is significant.</p>
                  <p>⏰ <strong className="text-white">Enter immediately when the advisor fires ENTRY SIGNAL.</strong> The lock has been held for N consecutive samples — extra waiting only reduces your time in the trade.</p>
                  <p>📊 <strong className="text-white">Check the Training panel regularly.</strong> If ASIA session shows 40% WR but US shows 72%, only trade during US hours. This alone can dramatically improve your score.</p>
                  <p>💰 <strong className="text-white">Use Kelly criterion.</strong> The % shown under the posteriors is the mathematically optimal fraction of bankroll to risk. If Kelly says 8%, don't bet 40%.</p>
                  <p>✂️ <strong className="text-white">Never fight CUT LOSSES — NOW.</strong> It requires 3 simultaneous bearish signals. When all three fire together, the trade is structurally broken.</p>
                  <p>💎 <strong className="text-white">Always hit SCALP PROFIT near end of window.</strong> This is the most chronically ignored signal and chronically correct. Time decay in the final 90 seconds is ruthless.</p>
                  <p>📈 <strong className="text-white">Sync your position with the Entered UP or DOWN buttons.</strong> This activates the 30% stop guard and gives Tara accurate P&L context for advisor calls.</p>
                  <p>🏦 <strong className="text-white">HIGH VOL CHOP regime = avoid.</strong> Tara raises thresholds in choppy markets but even a LOCKED signal in CHOP has lower reliability. Session timing matters most here.</p>
                </div>
              </section>

              {/* STRIKE + DISCORD */}
              <section>
                <h3 className={'text-indigo-400 font-bold uppercase tracking-wide mb-3 text-xs border-b border-indigo-500/20 pb-1'}>🔗 Discord Integration</h3>
                <div className={'bg-[#111312] rounded-lg p-3 border border-[#E8E9E4]/5 text-xs leading-relaxed text-[#E8E9E4]/60'}>
                  <p>Paste your Discord webhook URL in Settings (🔗 button). Tara will auto-broadcast:</p>
                  <ul className="mt-2 space-y-1 list-disc pl-4">
                    <li>Lock commits (with posterior, regime, gap, clock remaining)</li>
                    <li>Round closures (WIN or LOSS, closing price, regime recorded)</li>
                    <li>Manual broadcast command in chat sends a live signal embed</li>
                  </ul>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {showHelp&&(
        <div className={'fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4'}>
          <div className={'bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl'} style={{scrollbarWidth:'thin'}}>
            <div className={'sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center'}>
              <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2"><IC.Info className="w-5 h-5 text-indigo-400"/>Tara 3.1.5 — What's New</h2>
              <button onClick={()=>setShowHelp(false)} className={'text-[#E8E9E4]/50 hover:text-white'}><IC.X className="w-5 h-5"/></button>
            </div>
            <div className={'p-4 sm:p-6 space-y-5 text-xs sm:text-sm text-[#E8E9E4]/80'}>
              {/* V3.1: Tape strip — windowed buy/sell pressure visualization */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>UI · Flow Visibility</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>3.1</span> — Tape strip</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Sliding-window buy/sell pressure visualization. Aggregates trade flow from Coinbase, Binance Futures, and Bybit websockets into 5s/15s/30s/60s buckets so you can see whether buying pressure is accelerating or fading — not just where it is right now.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Headline bar.</strong> Buy USD vs sell USD in the dominant 30s window with the percentage in the middle. Emerald when buying dominates, rose when selling does.</li>
                  <li><strong>Four-window strip.</strong> 5s, 15s, 30s, 60s percentages side by side. Reading the trajectory across windows tells you if pressure is building or easing — 5s rising vs 60s = accelerating, 5s falling vs 60s = fading.</li>
                  <li><strong>Trend label.</strong> "↑ accelerating buy" / "↓ buy fading" / "↑ accelerating sell" — automated read of the multi-window pattern.</li>
                  <li><strong>Honest caveat.</strong> Tape data is only from 3 venues — covers ~60-70% of global BTC volume. Doesn't see hidden liquidity (OTC, iceberg orders) or spoofing. Use as confirming/challenging signal alongside Tara's call, not as a standalone prediction.</li>
                  <li><strong>Not yet wired into the engine.</strong> Tape pressure is informational only — Tara's posterior calculations are unchanged from 3.0. We'd want to validate correlation with outcomes across 50-100 trades before integrating into the prediction logic.</li>
                </ul>
              </section>

              {/* V3.0: Kalshi strike snap */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Settlement Alignment</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>3.0</span> — Kalshi strike snap</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Tara's strike now matches Kalshi's strike exactly. The "Tara says UP wins by +0.9bps but Kalshi paid out DOWN" disagreement should disappear at the open and close moments where it matters.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Strike at window open.</strong> Reads Kalshi's published strike from the active market metadata (defensive multi-field parsing handles different Kalshi market naming conventions). Uses that as the strike suggestion instead of computing it from the live Coinbase price. Falls back to live price if Kalshi data is unavailable.</li>
                  <li><strong>Closing price at settlement.</strong> When V2.6's marginal-close resolver kicks in, also captures Kalshi's authoritative settled price (settlement_value, final_value, etc.) and stores it in the trade log as <code>kalshiClosingPrice</code>.</li>
                  <li><strong>What this is and isn't.</strong> Tara still uses Coinbase/Binance for live tick monitoring during the window — predictions are unchanged. We snap to Kalshi only at the two moments where misalignment costs you money: strike capture and settlement.</li>
                  <li><strong>Why we didn't pull live CF Benchmarks.</strong> Real-time CF Benchmarks (the index Kalshi uses for settlement) is a paid commercial product. Free workarounds aren't reliable. Snapping at open and close gets us 95% of the alignment benefit without the engineering cost.</li>
                </ul>
              </section>

              {/* V2.9: FGT weighted voting */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Engine · Primary Signal</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>2.9</span> — FGT weighted voting</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">FGT's four timeframes no longer vote equally — 5m and 15m carry more weight than 1m and 3m. FGT's overall contribution to posterior also increased, since the data audit showed FGT 3/4+ alignment correlating with 70-100% WR.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Per-timeframe weights.</strong> 5m ±1.5 (primary, most relevant horizon for a 15m window), 15m ±1.2 (high-quality directional), 1m ±0.8 (fast but noisy), 3m ±0.5 (somewhat redundant given 1m/5m bracket it). Sum is still 4.0 so existing alignment-bucket thresholds remain valid.</li>
                  <li><strong>Bonus magnitudes raised.</strong> Full alignment (≥3.5) now contributes ±42 to posterior (was ±30). Strong (≥2.5) → ±26 (was ±18). Moderate (≥1.5) → ±14 (was ±8). New tier: weak (≥0.7) → ±6 — catches setups where 5m alone is calling a direction.</li>
                  <li><strong>Why this matters.</strong> Your concern was that Tara was "chasing the side in favor" — letting backward-looking signals (gap, momentum, flow) push posterior even when FGT was silent. Bumping FGT's weight makes Tara more of a forecaster and less of a trend-follower.</li>
                  <li><strong>Watch this.</strong> Posteriors can now climb higher (90+ on full FGT alignment with secondary signals). The V144 calibration table doesn't have data at those high posteriors yet, so treat any 90%+ confidence with appropriate skepticism until calibration buckets fill in.</li>
                </ul>
              </section>

              {/* V2.8: UP-bias targeted fixes */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Engine · Bias Correction</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>2.8</span> — UP-bias targeted fixes</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Trade audit on 53 trades revealed Tara was firing UP locks at 66% rate vs DOWN at 34%, with 5 consecutive UP losses at posterior 80%+ all having FGT alignment 0 or 1. Three targeted fixes shipped.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Symmetric thresholds in chop.</strong> RANGE-CHOP / HIGH VOL CHOP now require equal conviction either direction — UP 65 / DN 35 (both 15 points from neutral 50). Was UP 62 / DN 32 (12pt vs 18pt asymmetry favoring UP).</li>
                  <li><strong>SHORT SQUEEZE UP threshold raised 60 → 64.</strong> SS was Tara's biggest bias source — 24 UP calls at 58% WR. Still UP-favored regime, no longer triggers on weak setups.</li>
                  <li><strong>FGT support gate.</strong> In any choppy regime, if posterior claims ≥75 conviction but FGT alignment is &lt;|2|, Tara doesn't lock. Mirrored on DOWN side at posterior ≤25. Directly stops the "high posterior, FGT silent" failure pattern that caused the 5-in-a-row UP loss cluster.</li>
                  <li><strong>Fast-track extended to FGT 3/4.</strong> Was only EXTREME or FGT 4/4 → 1 sample to fire. Now FGT 3/4 also fast-tracks — when 3 of 4 timeframes agree, sample confirmation is redundant. Addresses "Tara waits too long when there's edge."</li>
                  <li><strong>Net effect.</strong> Fewer weak UP locks, faster firing on genuinely strong signals. Trade volume may drop slightly; WR should improve.</li>
                </ul>
              </section>

              {/* V2.7: Stats analytics view */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>UI · Analytics</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>2.7</span> — Stats analytics view</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">New 📊 button in the header opens a fullscreen analytics modal. Three drill levels (top stats → hourly heatmap → individual trades) plus auto-generated insights from your actual data.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Top stats grid.</strong> Trades count, accuracy with W/L breakdown, current streak, lifetime scorecard. Today / 7 Days / All Time toggle filters everything below.</li>
                  <li><strong>Hourly heatmap.</strong> 24 hour cells, green/copper/rose colored by WR, with trade count below. Click any hour to drill — expands inline showing every trade from that hour with timestamp, regime, posterior, FGT, quality, gap, and result.</li>
                  <li><strong>Insights surface.</strong> Auto-generated bullets from cohort analysis. "Strongest regime: TRENDING UP at 68%" / "Direction bias: 73% UP — may be drift" / "Quality gate is working: high (72%) outperforms low (51%) by 21 points." Honest about insufficient data: "Only N trades — insights need ≥5 to be meaningful."</li>
                  <li><strong>Six cohort cards.</strong> By Direction, Regime, Quality bucket, FGT Alignment, Session, Lock Timing. Each row visualizes WR with trade count.</li>
                  <li><strong>What it deliberately doesn't do.</strong> No fake "Advisor vs Final Call" dual scores, no inflated 75% headlines. Tara has one prediction system; we don't fabricate metrics.</li>
                </ul>
              </section>

              {/* V2.6: Marginal-close Kalshi resolver */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Settlement</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>2.6</span> — Marginal-close Kalshi resolver</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Marginal trades (closing gap &lt;10bps) where Tara's local price feed and Kalshi's settlement could disagree no longer auto-record. They defer to Kalshi's API for the authoritative outcome.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Auto-defer for marginal closes.</strong> When |closingGapBps| &lt; 10, trade is marked PENDING-VERIFY instead of recorded as WIN/LOSS. A separate effect polls Kalshi every 20s for the settled market.</li>
                  <li><strong>Kalshi API as source of truth.</strong> When Kalshi returns the settled market with its result field ('yes' = UP wins, 'no' = DOWN wins), Tara updates the trade with Kalshi's authoritative outcome and runs gradient descent.</li>
                  <li><strong>Fallback after 5 minutes.</strong> If Kalshi can't be reached, falls back to Tara's local-feed result and flags <code>kalshiResolutionFailed: true</code> for visibility.</li>
                  <li><strong>UI badge.</strong> Top stat strip shows a gold pulsing pill "Pending Kalshi · N" whenever trades are awaiting resolution. Disappears once Kalshi confirms.</li>
                  <li><strong>Analytics protected.</strong> WR and calibration math exclude PENDING-VERIFY trades so the scorecard doesn't get polluted by unresolved trades.</li>
                </ul>
              </section>

              {/* V2.5: Sample floor */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Engine · Lock Timing</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.01</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>2.5</span> — Sample floor</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Tara was firing locks too quickly when multiple shortcuts piled on. The CONSECUTIVE_NEEDED floor was raised from 1 to 2 for non-extreme setups so she takes a moment to verify the signal before committing.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Sample floor 1 → 2.</strong> Single-character change, real impact. High-conviction setups (FGT 3/4 + strong trajectory + signal consensus) used to lock on a single tick. Now require 2 confirming ticks (~3-6 seconds of confirmation).</li>
                  <li><strong>Fast-track preserved for genuinely extreme cases.</strong> EXTREME velocity OR FGT 4/4 still gets the 1-sample fast-track. The "obvious" cases stay fast.</li>
                  <li><strong>Marginal setups unchanged.</strong> Already at 2-3 samples by default. No effect on those.</li>
                  <li><strong>Post-lock stability unchanged.</strong> 30s window where Tara doesn't flip-flop unless posterior collapses 25+ points. Once committed, she stays committed.</li>
                </ul>
              </section>

              {/* V2.1: Visual refresh — Direction C palette and layout changes */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Visual Refresh</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.01</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>2.1</span></h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Direction C visual reset. Engine architecture from 2.0 unchanged — this is purely a coat of paint, but a deliberate one. Gold and copper now coexist as a two-tone palette for premium versus cautionary states.</p>
              </section>
              <section className="mb-4"><h3 className="font-bold uppercase tracking-wide mb-2 text-xs" style={{color:T2_GOLD}}>What Changed in 2.1</h3>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                <li><strong>Two-tone gold/copper palette.</strong> Mid-tier quality gate (formerly amber) is now copper. Geo risk, range exhaustion, and other "watch but not alarmed" states use copper. Gold reserved for premium markers (badge, hero accents, major-section eyebrows). Wins/losses stay green/red.</li>
                <li><strong>Hero promotion of the prediction card.</strong> At desktop widths the prediction column is now ~50% wider than supporting columns (1.5fr · 1fr · 1fr). The dominant question on screen — "what is Tara saying right now" — gets the visual real estate it deserves.</li>
                <li><strong>Top stat strip.</strong> Sticky 3-stat indicator below the header: Posterior · Quality · FGT alignment. Plus a Geo pill when risk is elevated. Visible at all times so you can pulse-check Tara without scanning multiple panels. Compresses to single-letter labels on narrow viewports.</li>
                <li><strong>Bottom status strip.</strong> Terminal-style context bar: Regime · Session · Velocity · Macro · Geo · Scorecard. Frees the cards from displaying context that doesn't change minute-to-minute. Wraps gracefully on mobile.</li>
                <li><strong>Corner stamps on major panels.</strong> Each major panel — Prediction (PRED · 015), Score Breakdown (SCR · 008), Engine Log, Projections (PROJ · 042) — gets a small gold serial mark in the upper-right. Reads as deliberate, instrument-grade.</li>
                <li><strong>Refined typography.</strong> Tabular-nums applied to all prices, posteriors, and statistics so digits don't wobble during ticks. Major panel headers shifted to gold tracking-[0.22em]. Score Breakdown FGT row and Total row separated with gold-tinted dividers.</li>
                <li><strong>Responsive design preserved.</strong> Mobile keeps the existing 4-tab pattern. Tablet collapses to 2-column with hero spanning. Desktop wide gets the full Direction C composition.</li>
              </ul>
              <p className="mt-2 text-[#E8E9E4]/40 text-[11px] italic">No engine changes. If 2.1 feels wrong, downgrade to 2.0 by reverting the visual files only — the engine logic is identical.</p>
              </section>
              {/* V2.0: Major release — gold marker distinguishes from incremental V147/V145/V144 entries */}
              <section className="mb-2 pb-3 border-b border-[#E8E9E4]/10">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:'#E5C870'}}>Major Release</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.01</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:'#E5C870'}}>2.0</span></h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">A new architecture for the secondary signals — directly addresses the "Tara follows the line" pattern by adding a signal that explicitly fights overextended moves, plus window-position-aware weighting that shifts emphasis from momentum (early window) to gap (late window).</p>
              </section>
              <section><h3 className="font-bold uppercase tracking-wide mb-2 text-xs" style={{color:'#E5C870'}}>What Changed</h3>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                <li><strong>Architectural change to how secondary signals score.</strong> Previous behavior: gap, momentum, structure, flow, technical, and regime all answered "what direction did price recently move?" — when recent move was up, all six pointed UP, even at the top of the typical range. This produced the "Tara follows the line" pattern. V152 adds a 7th signal — <strong>rangePosition</strong> — that fights overextended moves.</li>
                <li><strong>rangePosition signal.</strong> Computes price displacement from window-open in ATR-σ units. When |range| ≥ 1.0 AND we're 40%+ through the window, contributes contrarian to the direction of move. Default weight 35, gradient descent can grow or shrink. Visible in Score Breakdown panel as "Range Pos" row, and in engine log as <code>[RANGE-EXH]</code>.</li>
                <li><strong>Momentum exhaustion.</strong> The 1.5× alignment bonus on momentum (when 1m/5m/15m all agree) inverts to 0.6× when range is overextended in late window. Strong continuation signal becomes a contrarian dampener.</li>
                <li><strong>Window-position taper.</strong> Gap weight tapers UP through the window (×0.7 → ×1.3) — terminal price = where you ARE matters more late. Momentum weight tapers DOWN (×1.0 → ×0.4) — momentum mattered most early when there was still time for direction to play out.</li>
                <li><strong>FGT/HPotter remains primary.</strong> Multi-timeframe FGT alignment still contributes ±30 / ±18 / ±8 and still drives lock decisions. Trajectory forecast unchanged. The architectural changes affect only the six (now seven) secondary signals.</li>
                <li><strong>CSV export expanded.</strong> Now exports V145 telemetry (entry/close prices, gaps, Kalshi at lock and close, FGT alignment, geo risk) plus V152 rangeBps and rangePosition signal. New <code>outcomeDir</code> column shows actual outcome direction (close vs strike), separate from <code>dir</code> which records what Tara LOCKED. Disambiguates the dir/posterior anomalies seen in older logs.</li>
                <li><strong>Clean training restart.</strong> SEED_TRADES is now empty. The 29-trade seed had all-zero signal data (pre-V148.1 logging bug), so gradient descent couldn't learn from it anyway. Fresh start with V144 calibration prior baked in. Live trades from V152 onward will be the first dataset Tara has ever had with real signal-direction-outcome triples. Scorecard 448W-278L preserved as historical reference.</li>
              </ul>
              <p className="mt-2 text-amber-300/70 text-[11px]"><strong>Expect noise for the first 20-30 trades.</strong> The new signal needs to find its weight via gradient descent. Some calls you would have won will become losses (when continuation actually continues) — that's the cost of fighting trend. Long-run goal: calls match what you visually read in the chart instead of just following the line.</p>
              </section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">⚖ V147 — symmetry fix + measured loosening</h3>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                <li><strong>Fix A — symmetric firing condition.</strong> UP previously fired when historical samples cleared the threshold, even if current posterior had since dropped back. DOWN required both samples cleared AND current posterior still below threshold. UP now requires both, mirroring DOWN. Small UP-favoring asymmetry in wobbling markets removed.</li>
                <li><strong>Fix B — Score Breakdown panel.</strong> New diagnostic above the Engine Log showing each signal's contribution to the current posterior (gap, momentum, structure, flow, technical, regime, FGT). Bars extend left or right from a center 50 line. Total contribution maps directly to posterior. Lets you see at a glance which signal is driving Tara's call this tick — useful for diagnosing UP/DOWN balance over time.</li>
                <li><strong>Loosen 1 — default thresholds.</strong> RANGE-CHOP / HIGH VOL CHOP regime: UP threshold 65 → 62, DOWN 28 → 32. Trend regimes (TD/LS/TU/SS) unchanged. Effect: ~10-15% more locks in default-regime windows on mid-conviction setups.</li>
                <li><strong>Loosen 2 — strong-conviction shortcut.</strong> When calibrated posterior is 10+ points beyond threshold (UP ≥72 or DN ≤22), drops sample requirement to 1. Joins existing FGT 4/4 and trajectory ±7 shortcuts. Locks fire ~3 seconds faster on obvious setups. Marginal locks unchanged.</li>
                <li><strong>Loosen 3 — choppy quality floor.</strong> 55 → 50 in RC / SS / HVC. With FGT 4/4 contributing +18 quality (V136), strong-FGT setups already clear 73 quality on their own — this loosening mainly helps non-FGT marginal setups.</li>
              </ul>
              </section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">📦 V145 — telemetry, version flow, performance patterns</h3>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                <li><strong>Projections panel now uses HPotter (FGT).</strong> 5min / 15min / 1hour forecasts previously used a flat linear extrapolation of the 1-minute drift — straight lines disconnected from the engine's primary signal. Now the 5min and 15min panels source from the 1m HPotter forecast (30-min horizon), and the 1hour panel sources from the 3m HPotter (90-min horizon). Each panel shows which model is producing the forecast in the subtitle (e.g., "1m HPotter" or "3m HPotter→5m"). Falls back to linear when FGT data hasn't loaded yet.</li>
                <li><strong>Geopolitics + macro news scanner.</strong> Tara now monitors GDELT (30,000+ outlets, 65 languages, real-time) alongside CryptoCompare. Detects war, sanctions, banking shocks, central bank surprises, political actions — events that move BTC indirectly but aren't picked up by crypto-only feeds. Light penalty mode: small confidence haircut (-4 to -8 quality points) when risk is elevated, but no full lockout. A new <strong>GEO</strong> pill appears next to the EDGE display when risk is detected, with the top story in tooltip.</li>
                <li><strong>Updated baseline scorecard:</strong> 431W-268L on 15m and 33W-25L on 5m. Older baseline numbers were carryovers; this is the current truth.</li>
                <li><strong>Expanded trade telemetry.</strong> Each trade now logs: entry price, strike at lock, BTC price at window open, gap at entry, Kalshi YES price at lock and at close, FGT alignment at lock, raw vs calibrated posterior, quality gate score, and ISO timestamp. Closing telemetry adds closing gap and Kalshi at close. After a session you can audit exactly what Tara saw, what the market saw, and where the price ended up.</li>
                <li><strong>Trade log rows now show the V145 telemetry inline</strong> — entry → close prices, bps move, Tara confidence, Kalshi edge, and FGT alignment for each row when data is present.</li>
                <li><strong>Version-update flow in Session Start Check.</strong> When you load a new version, the modal shows two prominent options: "Sync to Baseline" (use the latest baked training data) or "Fresh Start" (wipe everything and retrain from your own trades with the V144 calibration prior). The reset bias option still exists below.</li>
                <li><strong>Fresh Start button</strong> is also accessible from the version-bump banner. It clears trade log, scorecard, weights, calibration, regime memory, and per-regime weights — full clean slate.</li>
                <li><strong>Performance Patterns section</strong> in the Training panel: heatmaps for performance by session (EU/ASIA/US/OFF-HOURS), by day of week (Sun-Sat), and by hour of day (24-hour grid). Color-coded so you can spot your strongest windows at a glance. Cells with fewer than 2 trades show as dashes to avoid noise.</li>
              </ul>
              </section>
              <section><h3 className="text-rose-400 font-bold uppercase tracking-wide mb-2 text-xs">🎯 ROOT CAUSE FIX — calibration as truth (V144)</h3><p className="leading-relaxed">Deep analysis of the seed log revealed Tara's posteriors were systematically over-confident, especially after the V141 root-fix exposed how broken the gating layer had been.</p>
              <p className="leading-relaxed mt-2"><strong>What was wrong:</strong> Only 7-11% of seed trades had real signal data captured (older versions had a logging bug). Calibration was being used for cosmetic display only — actual lock decisions used uncorrected raw posteriors. So Tara would say "92% UP" but real WR was 65% (27-pt drift). Worse, the gradient descent was training on incomplete data, slowly miscalibrating the model in unpredictable directions.</p>
              <ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>Default UP-side calibration baked from seed.</strong> Pre-computed prior table corrects UP over-confidence from day 1: raw 95% UP → ~88% calibrated, raw 85% UP → ~70% calibrated.</li><li><strong>DOWN side intentionally NOT pre-calibrated.</strong> Critical correction caught during simulation: the seed's DOWN trades suffered survivorship bias from the broken gates that V141 fixed. Using their WR to calibrate would over-correct and prevent any DOWN locks. Live post-V141 data will populate DOWN calibration organically.</li><li><strong>Locks now use CALIBRATED posterior, not raw.</strong> The biggest functional change. Calibration was previously "honest display, biased decision." Now it's both. What you see is what Tara does.</li><li><strong>UP lock thresholds rebuilt for calibrated space.</strong> Old thresholds assumed raw values. New thresholds (UP≥65 default) account for compressed UP posteriors. DOWN thresholds unchanged from V141 (≤28 default) since DOWN side stays raw.</li><li><strong>Adaptive calibration weighting.</strong> High-confidence UP buckets (raw 80+) trust calibration 85/15. Mid-range UP (raw 60-79) stays at 70/30.</li><li><strong>Data quality gate on gradient descent.</strong> Trades with fewer than 3 non-zero signals no longer update weights. Stops the model from learning from incomplete data going forward.</li><li><strong>Live calibration smoothly blends with seed prior.</strong> 10+ live trades for a bucket overrides prior. 3-9 live trades blend with prior weighted by sample size. Less than 3 uses prior as-is.</li></ul>
              <p className="leading-relaxed mt-2"><strong>What to expect:</strong> UP posteriors will look LOWER than before — a 95% UP now displays around 87-88%. That number is honest about real WR. Lock thresholds recalibrated so firing rate stays similar to V143 (UP/DOWN ratio ~1.6x). DOWN locks fire at the same rate as V141 since DOWN calibration is deferred. Over the next 30-50 live trades, DOWN-side calibration will start populating and improve from there. The Kalshi EDGE column should also become more meaningful since UP confidence now matches reality.</p>
              </section>
              <section><h3 className="text-purple-400 font-bold uppercase tracking-wide mb-2 text-xs">🔧 Fixes from screenshot review (V143)</h3><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>Per-regime weights now pre-trained from seed.</strong> Settings → "Per-regime signal weights" was showing identical values across all four regimes because gradient descent was too gentle (LR×1.2, attribution gate ≥10%) to differentiate them in 379 trades. Now: defaults pre-computed by replaying gradient descent over the seed, so SS / RC / HVC / TD start with distinct values. Live LR multiplier raised 1.2 → 2.5 so future trades differentiate them faster.</li><li><strong>Kalshi reference now works on 5m windows.</strong> Was 15m-only — meaning EDGE metric only appeared on 15m. Now fetches the closest-matching 5m or 15m market. Stale prior-window prices also clear on window change so you don't see last strike's Kalshi price mid-trade.</li><li><strong>Kalshi row always visible.</strong> Even when Kalshi data is loading or unavailable, the KLSH placeholder now shows ("loading…") so you know the feature exists. Previously the row vanished completely when Kalshi data wasn't loaded yet.</li><li><strong>Prediction text consistency.</strong> Long-form status messages (ANALYZING, SITTING OUT, MACRO BLACKOUT, OBSERVING, BREAKING NEWS, WEAK SETUP) now render as a clean uppercase title (same size as LOCKED / FORMING) with a subtitle below. Eliminates the 3-line wrap on SITTING OUT. ANALYZING countdown moves to subtitle. Same visual height for every prediction state.</li></ul></section>
              <section><h3 className="text-purple-400 font-bold uppercase tracking-wide mb-2 text-xs">📊 Edge over Kalshi (V142)</h3><p className="leading-relaxed">The new approach: stop trying to make Tara agree with Kalshi. The edge is in the disagreement. Tara's posterior is a forecasting model; Kalshi's price is the current market. They should differ — that's where you make money. When they agree, there's no edge to exploit.</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>SS/LS regime bonus removed.</strong> SHORT SQUEEZE no longer adds +43 to score; LONG SQUEEZE no longer adds -43. These were double-counting the underlying whale-flow + funding signals. The threshold tilts (UP easier in SS, DOWN easier in LS) are kept since those reflect tactical lock behavior, not score.</li><li><strong>New side-by-side display.</strong> Underneath the prediction, you now see <code>TARA UP 75%  vs  KLSH UP 50%  EDGE +25pts ⚡</code>. Direction + confidence for both, plus an explicit edge metric showing how much more confident Tara is than the market.</li><li><strong>Edge color coding:</strong> +20 or more = strong (bold green), +10-20 = moderate (green), 0-10 = weak (neutral), negative = caution (amber/rose). The ⚡ icon flags any disagreement on direction.</li><li><strong>Edge-aware Kelly bet sizing.</strong> The "Bet: X%" recommendation now scales by edge. Strong edge (+15pts) → full quality-scaled Kelly. Fighting Kalshi (-15pts) → 10% of recommended. Genuinely puts money behind the disagreement, scales it down when you're guessing against the market.</li><li><strong>The trading thesis:</strong> when EDGE is +20 or more, that's a high-conviction trade where Tara is seeing something Kalshi hasn't priced in yet. When EDGE is negative, the market disagrees with Tara — those should be your smallest positions or skips, even if Tara's quality gate says A+.</li></ul></section>
              <section><h3 className="text-rose-400 font-bold uppercase tracking-wide mb-2 text-xs">🎯 ROOT FIX — threshold inversion (V141)</h3><p className="leading-relaxed">A long-standing bug present since V99: TRENDING DOWN's DOWN-lock threshold was 32 — HARDER than the default 28-30 — meaning the regime that's supposed to favor DOWN had the toughest DOWN threshold of all regimes. Mirror image bug for TRENDING UP's UP threshold. Plus the regime classifier's <code>downThreshold</code> variable was being silently discarded by the downstream effective-threshold ladder. This is why DOWN locks felt nearly impossible in obvious downtrends.</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>Threshold ladder rebuilt for symmetry.</strong> TD now: UP fires ≥80, DOWN fires ≤36. TU: UP ≥68, DOWN ≤20. SS: UP ≥68, DOWN ≤20. LS: UP ≥80, DOWN ≤36. RC/HVC default: UP ≥72, DOWN ≤28. Each regime's preferred direction gets the easier threshold; opposed direction harder.</li><li><strong>bullCount/bearCount now use the regime-aware effective threshold.</strong> Previously bearCount used a hard-coded `(is15m?30:32) - sessAdj` that ignored regime. So even when the regime-specific threshold said "DOWN should fire at 36," the counter still used 30 to decide which recent ticks qualified. Silent bypass.</li><li><strong>Stale dead variables removed.</strong> The regime classifier's <code>downThreshold</code> / <code>upThreshold</code> values were set but never read by the lock gate — fully replaced by the new symmetric ladder.</li></ul></section>
              <section><h3 className="text-indigo-400 font-bold uppercase tracking-wide mb-2 text-xs">🔍 ANALYZING state added (V141)</h3><p className="leading-relaxed">Previously when posterior straddled the threshold without committing, Tara showed FORMING or SEARCHING indefinitely. Now there's an explicit bounded-search state.</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>5-60s search window at window open</strong> (15m: max 60s, 5m: max 30s). Shows "ANALYZING — searching for signal [Xs]" with a clear countdown.</li><li><strong>FGT shortcuts the search.</strong> 4/4 alignment ends search at the 5s minimum. 3/4 ends at 15s.</li><li><strong>Subtle direction hint included.</strong> If posterior is mildly leaning UP/DOWN during search, badge shows "leaning UP" or "leaning DOWN" — gives you a feel for where Tara's probably going.</li><li><strong>Bypassed by EXTREME velocity and rug-pull.</strong> No search delay during catastrophic events.</li><li><strong>After search expires</strong> the state machine falls through to FORMING/SITTING OUT/SEARCHING based on what the data actually shows.</li></ul></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">🧹 Cleanups + symmetry (V140)</h3><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>Deliberation gate removed.</strong> Was using <code>clockSeconds&lt;X</code> where clockSeconds is time REMAINING — fired near end of window instead of start. Effectively dead code since V134 (the endgame freeze at &lt;90s already covered the same zone). Locks have always been firing freely from second 1 subject to other gates. Cleaning up the misleading "DELIBERATING — Xs left" display along with it.</li><li><strong>Posterior-strength deadband 15 → 10.</strong> Quality contribution from posterior was zero in the 35-65 range. Now starts contributing at posterior ≥60 / ≤40, giving moderate-posterior FGT 4/4 setups more quality headroom.</li><li><strong>Catastrophic spike detector added for DOWN locks.</strong> Mirror of catastrophic rug-pull. UP locks already had a fast-trigger release on rug-pulls; DOWN locks now have the equivalent on sudden upward shocks (<code>tickSlope &gt; 5 + aggrFlow &gt; 0.6</code>). Symmetric protection.</li></ul></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">🔍 Block audit — over-restrictive gates removed (V139)</h3><p className="leading-relaxed">A complete sweep of every gate, block, veto, and quality penalty in the engine. Removed redundant penalties, FGT-gated rejections so the primary signal can override, and dampened day-of-week noise.</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>Choppy quality floor 62 → 55.</strong> FGT 4/4 contributes +18 to quality already; the old 62 floor was over-blocking marginal-quality + strong-FGT setups in choppy regimes.</li><li><strong>Trajectory rejection FGT-aware.</strong> Was a hard block at ±7. Now overridden when FGT 4/4 agrees with the proposed direction. Backward-looking trajectory shouldn't block locks when all four timeframes scream the same direction.</li><li><strong>Very-late-lock NO CALL gate FGT-aware.</strong> After 800s elapsed in a 15m window, locks were blocked unless trajectory ≥10. Now FGT 4/4 also bypasses — exactly the high-conviction late setup we want to take.</li><li><strong>Removed redundant late-window quality penalties.</strong> The <code>isLateLockZone ? -8</code> and <code>isVeryLateLock ? -20</code> penalties stacked with the more-precise late-FOMO penalty. Three penalties on the same condition. Kept late-FOMO, dropped the others.</li><li><strong>Day×Session magnitudes halved.</strong> Was -10..+5 (e.g. SUN-US: -10), now -5..+3. Per-bucket sample sizes are too small for the previous swing range. Direction held, magnitude dampened.</li><li><strong>Adaptive session×regime threshold requires 10+ samples.</strong> Was 5+. Reduces noise from buckets with few trades.</li><li><strong>Choppy-regime extra-sample requirement FGT-aware.</strong> The +1 sample penalty in HVC/RC was bypassed when trajectory ≥7. Now FGT 4/4 alignment also bypasses it on both sides.</li></ul></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">⚖ Full directional symmetry (V138)</h3><p className="leading-relaxed">V137 made the SS/HVC DOWN block FGT-aware but it was still asymmetric — UP had no equivalent gate. V138 removes the DOWN block entirely. Score math (regime bonus, FGT contribution, signal alignment) is now the only directional filter.</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>SS/HVC DOWN block fully removed.</strong> DOWN now locks on the same terms UP does — quality gate, posterior threshold, FGT veto if 3/4+ UP, consecutive samples, momentum confirmation.</li><li><strong>SHORT SQUEEZE removed from <code>_downGated</code>.</strong> DOWN's lock threshold in SS now matches UP's threshold there. Was 28 vs UP's 30 — small but a real asymmetry.</li><li><strong>Premium Mode removed entirely.</strong> The toggle button, US session skip, weak RC skip, MTF Confluence cross-window veto, quality floor 65, all gone. The asymmetric DOWN block lived in here too.</li><li><strong>What stays:</strong> all symmetric gates — macro blackouts, quality floor (45 normal / 62 choppy), trajectory rejection (±7), FGT veto (3/4+ against), deliberation, consecutive samples, endgame freeze, momentum confirmation, direction-flip whipsaw guard, lock release conditions, stop-guard sync, sit-out logic. These all apply equally to UP and DOWN.</li><li><strong>Result:</strong> the only structural directional bias left is the natural regime score bonus (+43 in TU/SS, -43 in TD). FGT contribution (±30 for 4/4) is strong enough to fight that on its own when timeframes align.</li></ul></section>
              <section><h3 className="text-rose-400 font-bold uppercase tracking-wide mb-2 text-xs">🚨 Asymmetric DOWN block partially fixed (V137)</h3><p className="leading-relaxed">A V112-era hard-coded gate was preventing DOWN locks in SHORT SQUEEZE and HIGH VOL CHOP regimes — with no equivalent block on UP. This created the "Tara never locks DOWN, just hesitates and then locks UP" pattern.</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>Non-Premium gate:</strong> DOWN-in-SS/HVC was blocked unless rug-pull or 25+ bps already adverse. Now also overrideable by FGT 3/4+ DOWN alignment.</li><li><strong>Premium Mode gate:</strong> Was unconditionally "DOWN BLOCKED IN [regime]". Now also overrideable by FGT 3/4+ DOWN. Display message updated to clarify what's blocking.</li><li><strong>Why this matters:</strong> The original block assumed DOWN-in-SS was a coinflip (50% WR). That data was from before V135 (SS price-action veto narrowed false-SS classifications) and V136 (FGT became the primary signal). FGT 3/4+ DOWN is stronger evidence than the regime label, so it should override.</li><li><strong>UI: Lock release now visible when in position.</strong> Previously the prediction stayed at "UP - LOCKED" even after Tara internally released the lock. Now shows "UP - LOCK RELEASED" so you can see when she's pulled out, even if you confirmed entry.</li></ul></section>
              <section><h3 className="text-purple-400 font-bold uppercase tracking-wide mb-2 text-xs">★ FGT IS NOW THE PRIMARY SIGNAL (V136)</h3><p className="leading-relaxed">Based on observed 70-80% accuracy on 4/4 multi-timeframe alignment, FGT (HPotter Future Grand Trend) has been promoted from a small contributing signal to the dominant directional voice in the engine. Calibration math: at 75% empirical accuracy, FGT 4/4 alignment alone justifies posterior ~78%. The previous +12 score contribution capped FGT at posterior ~61% — basically engine baseline.</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>Score weight bump:</strong> 4/4 alignment ±12 → ±30, 3/4 ±6 → ±18, 2/4 0 → ±8. FGT 4/4 alone now pushes posterior to ~78% in its direction (was ~61%).</li><li><strong>4/4 fast-track:</strong> FGT 4/4 + posterior leaning the same direction now bypasses the deliberation gate AND drops sample requirement to 1. Locks fire immediately when the engine catches up to FGT.</li><li><strong>3/4 quick-track:</strong> FGT 3/4 alignment drops sample requirement by 1 (parallel to existing trajectory shortcut).</li><li><strong>Quality gate FGT contribution:</strong> 4/4 = +18 quality, 3/4 = +10, 2/4 = +4. Stacks with the existing 6-signal consensus boost.</li><li><strong>Plain-English summary led by FGT:</strong> When 4/4 or 3/4 aligns, the "What Tara sees" line opens with "FGT 4/4 → DIRECTION" instead of regime-and-flow language. The badge in the prediction card also enlarges and pulses on 4/4 alignment.</li><li><strong>Earlier release on FGT flip:</strong> Lock release threshold tightened from 3/4 against to 2/4 against. If FGT was driving the lock and 2 timeframes flip away, Tara releases.</li><li><strong>Faster sit-out exit:</strong> FGT 2/4 alignment is now enough to break Tara out of a sticky sit-out (was 3/4).</li></ul></section>
              <section><h3 className="text-amber-400 font-bold uppercase tracking-wide mb-2 text-xs">⚠ V136 watch list</h3><ul className="list-disc pl-4 space-y-1 mt-2"><li>Locks will fire <strong>noticeably faster</strong> when FGT 4/4 aligns. This is the intended behavior — you should see less DELIBERATING time before commits.</li><li>FGT alignment depends on multi-timeframe candle data. Early in a session or after a refresh, fewer than 4 timeframes may be valid (shows as "?" arrows). Until all 4 load, the bonus is limited.</li><li>Early lock releases on FGT 2/4 flip may cut some recoveries. If you see a lot of <code>[LOCK] Released — FGT now</code> entries that look premature, we can dial the release threshold back to 3/4.</li><li>The trajectory and reality-cap layers from V135 are still active and can override FGT when current price is dramatically against the forecast. FGT is primary but reality wins on extreme deviations.</li></ul></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">⚖ Direction Symmetry Fixes (V135)</h3><p className="leading-relaxed">A pass to remove structural asymmetries that made UP locks too easy and DOWN locks nearly impossible:</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>SHORT SQUEEZE price-action veto:</strong> SS no longer classifies if drift1m ≤ -3 (was firing during downtrends and giving UP a +43 regime bonus). Same veto on LONG SQUEEZE for drift1m ≥ 3. Look for <code>[REGIME-VETO]</code> in the engine log.</li><li><strong>Symmetric retail funding gates:</strong> retailLonging threshold dropped 0.015 → 0.005 to match retailShorting. LONG SQUEEZE was unreachable in the entire 377-trade seed because the bar was 3× too high.</li><li><strong>Looser TRENDING UP/DOWN classification:</strong> drift threshold ±5 → ±3, whale-flow threshold $500K → $200K (separate variable from squeeze gate), removed the ATR{'<'}30 requirement that excluded fast moves entirely.</li><li><strong>Trajectory cap raised ±8 → ±12:</strong> trajectory was being silently outvoted by regime bonus (+43). Now it can actually push back against a wrong classification. Activation threshold also dropped 12 → 10 bps.</li><li><strong>Reality caps tighten earlier:</strong> activation moved from ±18 to ±12 bps, with new ±25 intermediate tier. Adverse gaps now pull the posterior into lock-firing range before being catastrophic.</li><li><strong>Trajectory rejection gate:</strong> boundary fixed (was {'<'} -8, missed exactly -8) and threshold tightened to ±7 to match the new trajectory cap. Symmetric for UP and DOWN sides.</li><li><strong>Signal consensus override:</strong> when 5+ of 6 raw signals strongly agree, sample requirement drops by 1 in addition to the existing +12 quality bonus. Previously only the quality gate got the boost.</li></ul></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">🔓 Lock Release Fixes (V135)</h3><p className="leading-relaxed">The previous logic disabled most soft releases in the last 3 minutes of the window — exactly when broken locks hurt most. Now releases stay enabled all the way through:</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>Time gate inverted:</strong> was "more than 3 min remaining" (released early, held late). Now it's "30 sec elapsed since lock" — releases stay on through endgame.</li><li><strong>Decay collapse trigger:</strong> 20 → 15 point posterior drop now releases a lock (was too late at 20).</li><li><strong>Deep-adverse threshold:</strong> 55 → 30 bps. 55 bps on $75K BTC is a $400 move — by then the round is decided. 30 bps catches broken locks while still well above noise.</li><li><strong>Regime-change re-validation:</strong> if the regime that justified the lock no longer holds AND trajectory has turned against the lock direction, release. Catches the "locked UP in SHORT SQUEEZE → drifted to RANGE-CHOP → trajectory flipped DOWN" trap.</li></ul></section>
              <section><h3 className="text-amber-400 font-bold uppercase tracking-wide mb-2 text-xs">⚠ Behavioral changes to watch</h3><p className="leading-relaxed">These fixes increase Tara's willingness to commit to DOWN and to release wrong locks. Expect:</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>More DOWN locks</strong> overall, especially in RANGE-CHOP and HIGH VOL CHOP where they were nearly impossible before</li><li><strong>Fewer wrong-direction UP locks</strong> in choppy regimes that were misclassified as SHORT SQUEEZE</li><li><strong>Earlier exits on broken locks</strong> in the last 3 minutes — some of these will be releases that would have recovered, some will be capital saved. Watch the [LOCK] Released entries in the engine log.</li><li><strong>LONG SQUEEZE may actually fire now</strong> — it was effectively dead code before. Treat early instances cautiously, no historical WR data exists for it.</li></ul></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">⚙️ Prediction Engine Overhaul (V134)</h3><p className="leading-relaxed"><strong>7 new layers</strong> that target the actual losing patterns observed in your trade history:</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>Real backtest framework:</strong> Settings → Analytics now shows historical performance audit. WR by regime, session, lock-timing, confidence bucket. Selectivity scenarios ("what if I'd only taken EU sessions") show retroactive WR lift.</li><li><strong>Brier score calibration:</strong> Real probability accuracy metric. Lower = better calibrated. &lt;0.15 strong, &lt;0.20 useful.</li><li><strong>Attribution-weighted learning:</strong> Only signals that contributed &gt;10% to the call get credit/blame. Bystander signals no longer get noise updates that compound to drift.</li><li><strong>Signal regime change release:</strong> If 3+ underlying signals flip against the locked direction mid-window, Tara releases the lock. Sharper than waiting for 20pt posterior collapse. Look for [LOCK] Released — signal regime flipped.</li><li><strong>Window-open exhaustion penalty:</strong> If price has already moved &gt;25bps with &lt;30% of window left, Tara penalizes locks that chase the move. "The move has happened, late entry chasing has poor odds." Look for [WIN-EXH].</li><li><strong>Live order book flash (2.5s):</strong> A faster polling channel runs alongside the 8s bloomberg snapshot. When both timeframes agree on imbalance direction, the signal doubles. Look for [OB-LIVE].</li><li><strong>Volume Profile / VPOC:</strong> Detects support/resistance levels from where most volume traded. If a strong VPOC sits between price and strike, locks chasing past it get penalized. Look for [VPOC].</li><li><strong>Cross-device baseline fix:</strong> Scorecard loader now handles both legacy storage keys + auto-migrates if your local record is below the shipped baseline. New devices auto-sync to the latest baseline (currently 421-264 from 373 trades).</li></ul></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">🎯 Tier 1-3 Intelligence Stack (V134)</h3><p className="leading-relaxed"><strong>4 new prediction layers</strong> for cleaner inputs and smarter decisions:</p><ul className="list-disc pl-4 space-y-1 mt-2"><li><strong>Strike Quality Scoring:</strong> Detects when strike was set during a spike vs normal price. Dirty strikes (&gt;40bps off baseline) get gap-gravity downweighted up to 60%.</li><li><strong>Wall Persistence Filter:</strong> Liquidation walls must hold &ge;15s before counting. Spoofed walls (placed and pulled) are now ignored. Look for [LIQ-SPOOF] in engine log.</li><li><strong>Regime-Direction WR Memory:</strong> The <strong>HIST</strong> badge shows your historical WR for this exact regime+direction combo. Red+pulse = consider sitting out.</li><li><strong>Adaptive Threshold per Session × Regime:</strong> Tara now adjusts lock thresholds based on your historical performance per bucket. WR &gt;70% in this combo = -3 threshold (easier locks). WR &lt;50% = +5 threshold (much harder).</li><li><strong>Live News (30s polling):</strong> News refreshes every 30s instead of 90s. Detection of "breaking", "flash", "urgent" tags triggers BREAKING NEWS — OBSERVE blackout.</li><li><strong>Sentiment-Trajectory Interaction:</strong> When news AND trajectory agree on direction, +5 quality. When they disagree strongly, -8 quality.</li><li><strong>Chart Pattern Recognition:</strong> Detects double tops, double bottoms, ascending/descending wedges, symmetrical compression. Adjusts posterior ±5.</li><li><strong>Audio Alerts:</strong> New sounds for trajectory crossing ±12, breaking news, MTF confluence locks.</li></ul></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">⚡ Faster Prediction Judgement (V117)</h3><p className="leading-relaxed">Tara was waiting too long to confirm calls. Reduced base sample requirement from 3→2 for 15m windows (~10s faster locks). Strong trajectory bias now skips gated regime penalties entirely. Non-Premium quality floor lowered 50→45 so Tara takes more setups when she's not in selective mode.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">🎯 Trajectory Forecast Engine (V134)</h3><p className="leading-relaxed">Tara now <strong>projects forward</strong> using kinematics (x = x₀ + vt + ½at²) instead of just reacting to current state. The <strong>↗ TRAJ +X</strong> badge shows directional bias. Strong trajectory (≥12) lets Tara lock with 2 fewer samples — early calls at good odds. Engine log shows projected end-of-window price and bps to strike.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">🔥 Volatility Regime Adaptation (V113)</h3><p className="leading-relaxed">Tara classifies market speed every tick: <strong>🐢 SLOW / NORMAL / ⚡ FAST / 🔥 EXTREME</strong>. In slow markets she requires more confirmation; in fast markets she locks faster with looser momentum tolerance. The badge shows next to the regime chip when not NORMAL.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">📅 Macro Event Calendar (V114)</h3><p className="leading-relaxed">Hardcoded calendar of CPI, NFP, FOMC, PCE, Jobless Claims, Retail Sales, GDP, BTC settlement. Tara enters <strong>BLACKOUT</strong> 30min before, <strong>OBSERVE</strong> during, <strong>ENHANCED</strong> 15min after. Banner appears at top of prediction card with countdown.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">★ Premium Mode + Day×Session</h3><p className="leading-relaxed">Premium toggle in header (★ icon) for selective trading: quality ≥65 + MTF agreement + skip US session + skip weak RC + DOWN blocked in SS/HVC. Day×Session quality multipliers baked in: <strong>WED-US +5</strong> (best), <strong>SUN-US -10</strong> (worst). EU is your strongest session at 70% WR.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">🐋 Tier 2-4 Intelligence Layers</h3><ul className="list-disc pl-4 space-y-1"><li><strong>Volume profile:</strong> high vol + price = boost; ghost markets = damp; price-vol divergence = trap detection</li><li><strong>Funding extremes:</strong> &gt;0.05% crowded longs = DOWN bias; &lt;-0.02% crowded shorts = UP bias</li><li><strong>Liquidation magnet:</strong> $500K+ walls within 60bps pull price (boost confidence locking toward them)</li><li><strong>Order book imbalance:</strong> bid/ask asymmetry &gt;25% adds ±8 to score</li><li><strong>Cross-exchange lead-lag:</strong> Binance futures vs Coinbase — &gt;3bps divergence signals direction</li><li><strong>News sentiment:</strong> CryptoCompare keywords (Trump, SEC, ETF, hack, surge) shift quality</li><li><strong>Streak adjustments:</strong> 3+ losses = -8 to -15 quality (cooldown); 4+ wins = +4 (hot boost)</li><li><strong>Kelly bet sizing:</strong> Q60-70 → ¼ Kelly, Q70-80 → ½, Q80-90 → ⅔, Q90+ → ¾</li></ul></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">📊 Updated Training Data</h3><p className="leading-relaxed">283 baked trades · <strong>358W-257L (15m)</strong> · 31W-25L (5m). UP 64.3% · DOWN 56.6%. Best regime: TRENDING DOWN 83% (18 trades). EU best session 70%. Click <strong>Sync to Latest Baseline</strong> in Settings to refresh on any device.</p></section>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Tara V101 Global Reset & Responsive Base ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html {
          font-size: 16px;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
          overflow-x: hidden;
        }
        body {
          overflow-x: hidden;
          min-height: 100dvh;
          -webkit-font-smoothing: antialiased;
        }
        /* Remove number input spinners */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        /* Scrollbars */
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(232,233,228,0.12); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(232,233,228,0.22); }
        /* Mobile tap highlight */
        * { -webkit-tap-highlight-color: transparent; }
        /* Safe area insets for notched phones */
        .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }

        /* ── Fluid prediction heading ── */
        .prediction-heading { font-size: clamp(1.8rem, 8vw, 3.5rem) !important; line-height: 1 !important; }

        /* ── Breakpoint-specific font tuning ── */
        @media (max-width: 360px) {
          html { font-size: 13px; }
        }
        @media (min-width: 361px) and (max-width: 480px) {
          html { font-size: 14px; }
        }
        @media (min-width: 481px) and (max-width: 768px) {
          html { font-size: 15px; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          html { font-size: 15.5px; }
        }
        @media (min-width: 1025px) {
          html { font-size: 16px; }
        }
        @media (min-width: 1400px) {
          html { font-size: 17px; }
        }

        /* ── Prevent any element causing horizontal scroll ── */
        main, header, section, div {
          max-width: 100%;
        }

        /* ── TradingView iframe responsive ── */
        iframe {
          max-width: 100%;
        }

        /* ── Chart height adapts to screen ── */
        @media (max-width: 480px) {
          .tv-chart-container { height: 300px !important; }
        }
        @media (min-width: 481px) and (max-width: 768px) {
          .tv-chart-container { height: 360px !important; }
        }
        @media (min-width: 769px) {
          .tv-chart-container { height: 430px !important; }
        }

        /* ── Analytics grid adapts ── */
        @media (max-width: 480px) {
          .signal-weights-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .calibration-grid { grid-template-columns: repeat(5, 1fr) !important; }
          .session-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      {/* V2.1: Bottom status strip — terminal-style context bar. Frees the cards from
              displaying context that doesn't change minute-to-minute. Wraps gracefully on mobile. */}
      <div className="bg-[#0A0B0A] border-t border-[#E8E9E4]/8 px-3 sm:px-4 py-1.5 mt-2 -mx-2 sm:-mx-3 lg:-mx-4 -mb-2 sm:-mb-3 shrink-0">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] sm:text-[9px] tracking-[0.04em]">
          {(()=>{
            const regimeLabel=analysis?.regime||'—';
            const sessionLabel=analysis?.session||'—';
            const velLabel=analysis?.velocityRegime||'NORMAL';
            const macroState=getMacroEventState?.()||{state:'CLEAR'};
            const macroCls=macroState.state==='BLACKOUT'?'text-rose-300':macroState.state==='OBSERVE'?'text-amber-300':'text-emerald-300';
            const geoRisk=newsSentiment?.geoRisk||0;
            const geoLabel=geoRisk>=0.7?'HIGH':geoRisk>=0.5?'ELEVATED':geoRisk>=0.3?'WATCH':'CLEAR';
            const geoColor=geoRisk>=0.5?T2_COPPER:geoRisk>=0.3?'rgba(201,125,74,0.6)':'rgba(110,231,183,0.7)';
            const wins=scorecards[windowType]?.wins||0;
            const losses=scorecards[windowType]?.losses||0;
            const total=wins+losses;
            const wr=total>0?(wins/total*100).toFixed(1):'—';
            return(
              <>
                <span className="text-[#E8E9E4]/35 uppercase">Regime</span>
                <span className="text-[#E8E9E4]/70">{regimeLabel}</span>
                <span className="text-[#E8E9E4]/15">·</span>
                <span className="text-[#E8E9E4]/35 uppercase">Session</span>
                <span className="text-[#E8E9E4]/70">{sessionLabel}</span>
                <span className="text-[#E8E9E4]/15">·</span>
                <span className="text-[#E8E9E4]/35 uppercase">Vel</span>
                <span className="text-[#E8E9E4]/70">{velLabel}</span>
                <span className="text-[#E8E9E4]/15 hidden sm:inline">·</span>
                <span className="text-[#E8E9E4]/35 uppercase hidden sm:inline">Macro</span>
                <span className={'hidden sm:inline '+macroCls}>{macroState.state||'CLEAR'}</span>
                <span className="text-[#E8E9E4]/15 hidden sm:inline">·</span>
                <span className="text-[#E8E9E4]/35 uppercase hidden sm:inline">Geo</span>
                <span className="hidden sm:inline" style={{color:geoColor}}>{geoLabel}{geoRisk>=0.3?` ${(geoRisk*100).toFixed(0)}%`:''}</span>
                <span className="ml-auto text-[#E8E9E4]/45" style={T2_MONO_STYLE}>{windowType.toUpperCase()} · {wins}W-{losses}L · {wr}%</span>
              </>
            );
          })()}
        </div>
      </div>

    </main>
    </div>
  );
}

export default function App(){return<ErrorBoundary><TaraApp/></ErrorBoundary>;}
