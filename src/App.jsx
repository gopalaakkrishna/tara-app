import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// ═══════════════════════════════════════
// ICONS
// ═══════════════════════════════════════
const _NS='http:'+'/'+'/www.w3.org/2000/svg';
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
const DEFAULT_WEIGHTS={gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13};

// Per-regime weight sets — each regime gets its own gradient descent
// Initialized from global defaults, diverge over time based on what works in each regime
const DEFAULT_REGIME_WEIGHTS={
  'SHORT SQUEEZE': {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13},
  'RANGE-CHOP':    {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13},
  'HIGH VOL CHOP': {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13},
  'TRENDING DOWN': {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13},
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
const WEIGHT_BOUNDS={gap:[5,65],momentum:[5,58],structure:[2,38],flow:[2,55],technical:[5,48],regime:[2,45]}; // expanded — flow/gap were hitting ceilings // bounds expanded so flow/regime can keep growing
const LEARNING_RATE=0.8; // how aggressively to update weights per trade

// Load weights from localStorage or use defaults
const loadWeights=()=>{try{const s=localStorage.getItem('taraWeightsV110');if(s){const w=JSON.parse(s);if(w&&typeof w.gap==='number')return w;}return{...DEFAULT_WEIGHTS};}catch(e){return{...DEFAULT_WEIGHTS};}};
const saveWeights=(w)=>{try{localStorage.setItem('taraWeightsV110',JSON.stringify(w));}catch(e){}};

// Load trade log
// removed
// removed
// Best hours: 4 (100%) and 5 (100%)
const SEED_TRADES=[
  // 268 trades (15m) · 163W-105L=60.8% · SS 68% · TD 87.5% · DOWN gate active · V110
  {id:1776403212237,dir:'UP',posterior:71.0,regime:'RANGE-CHOP',clockAtLock:587,hour:1,session:'ASIA',windowType:'15m',signals:{gap:1.83,momentum:0.0,structure:0.0,flow:20.23,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776403812231,dir:'UP',posterior:82.0,regime:'RANGE-CHOP',clockAtLock:887,hour:1,session:'ASIA',windowType:'15m',signals:{gap:35.2,momentum:-5.39,structure:0.0,flow:-17.15,technical:-8.0,regime:0.0},result:'LOSS'},
  {id:1776407423234,dir:'DOWN',posterior:27.6,regime:'RANGE-CHOP',clockAtLock:876,hour:2,session:'ASIA',windowType:'15m',signals:{gap:-0.28,momentum:-2.75,structure:0.0,flow:-20.59,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776408300285,dir:'UP',posterior:94.1,regime:'SHORT SQUEEZE',clockAtLock:899,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.59,momentum:-0.95,structure:9.0,flow:12.46,technical:10.0,regime:15.33},result:'WIN'},
  {id:1776409504121,dir:'UP',posterior:99.0,regime:'RANGE-CHOP',clockAtLock:595,hour:3,session:'EU',windowType:'15m',signals:{gap:35.03,momentum:6.76,structure:15.0,flow:9.29,technical:3.0,regime:0.0},result:'WIN'},
  {id:1776410109313,dir:'UP',posterior:73.1,regime:'RANGE-CHOP',clockAtLock:890,hour:3,session:'EU',windowType:'15m',signals:{gap:1.27,momentum:-3.68,structure:15.0,flow:8.73,technical:3.0,regime:0.0},result:'LOSS'},
  {id:1776410445361,dir:'UP',posterior:82.9,regime:'SHORT SQUEEZE',clockAtLock:554,hour:3,session:'EU',windowType:'15m',signals:{gap:-0.42,momentum:3.89,structure:0.0,flow:20.65,technical:-5.0,regime:15.56},result:'LOSS'},
  {id:1776411059805,dir:'UP',posterior:79.9,regime:'SHORT SQUEEZE',clockAtLock:840,hour:3,session:'EU',windowType:'15m',signals:{gap:-0.44,momentum:1.15,structure:0.0,flow:20.41,technical:-5.0,regime:15.38},result:'WIN'},
  {id:1776411899818,dir:'UP',posterior:94.8,regime:'SHORT SQUEEZE',clockAtLock:900,hour:3,session:'EU',windowType:'15m',signals:{gap:0.46,momentum:7.52,structure:0.0,flow:20.64,technical:3.0,regime:15.55},result:'WIN'},
  {id:1776412799704,dir:'UP',posterior:97.7,regime:'SHORT SQUEEZE',clockAtLock:900,hour:3,session:'EU',windowType:'15m',signals:{gap:0.44,momentum:4.45,structure:0.0,flow:20.95,technical:3.0,regime:15.79},result:'WIN'},
  {id:1776413746445,dir:'UP',posterior:84.4,regime:'SHORT SQUEEZE',clockAtLock:853,hour:4,session:'EU',windowType:'15m',signals:{gap:-0.47,momentum:-3.82,structure:0.0,flow:6.47,technical:18.0,regime:16.06},result:'WIN'},
  {id:1776414639749,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:861,hour:4,session:'EU',windowType:'15m',signals:{gap:35.42,momentum:9.58,structure:0.0,flow:21.39,technical:-5.0,regime:16.26},result:'WIN'},
  {id:1776415548790,dir:'UP',posterior:97.4,regime:'SHORT SQUEEZE',clockAtLock:852,hour:4,session:'EU',windowType:'15m',signals:{gap:0.32,momentum:10.36,structure:0.0,flow:21.58,technical:-5.0,regime:16.4},result:'WIN'},
  {id:1776416404562,dir:'UP',posterior:99.4,regime:'SHORT SQUEEZE',clockAtLock:895,hour:5,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:1.86,structure:15.26,flow:21.89,technical:-5.0,regime:16.63},result:'WIN'},
  {id:1776417299867,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:900,hour:5,session:'EU',windowType:'15m',signals:{gap:1.41,momentum:17.19,structure:15.46,flow:22.17,technical:-5.0,regime:16.85},result:'WIN'},
  {id:1776418271648,dir:'DOWN',posterior:2.2,regime:'TRENDING DOWN',clockAtLock:828,hour:5,session:'EU',windowType:'15m',signals:{gap:-35.76,momentum:-18.66,structure:0.0,flow:-13.84,technical:18.0,regime:0.0},result:'WIN'},
  {id:1776419102505,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:900,hour:5,session:'EU',windowType:'15m',signals:{gap:0.5,momentum:12.0,structure:0.0,flow:22.0,technical:-5.0,regime:16.83},result:'WIN'},
  {id:1776422196542,dir:'DOWN',posterior:6.3,regime:'HIGH VOL CHOP',clockAtLock:503,hour:6,session:'EU',windowType:'15m',signals:{gap:-9.56,momentum:-14.85,structure:0.0,flow:-21.62,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776422749470,dir:'DOWN',posterior:16.6,regime:'HIGH VOL CHOP',clockAtLock:850,hour:6,session:'EU',windowType:'15m',signals:{gap:0.03,momentum:-0.3,structure:-12.0,flow:-14.9,technical:-8.0,regime:0.0},result:'LOSS'},
  {id:1776423249474,dir:'UP',posterior:98.3,regime:'SHORT SQUEEZE',clockAtLock:350,hour:6,session:'EU',windowType:'15m',signals:{gap:6.88,momentum:8.61,structure:0.0,flow:22.37,technical:-8.0,regime:16.83},result:'WIN'},
  {id:1776424302369,dir:'DOWN',posterior:28.6,regime:'HIGH VOL CHOP',clockAtLock:198,hour:7,session:'EU',windowType:'15m',signals:{gap:7.89,momentum:0.0,structure:0.0,flow:-22.42,technical:-8.0,regime:0.0},result:'LOSS'},
  {id:1776424641815,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:758,hour:7,session:'EU',windowType:'15m',signals:{gap:0.76,momentum:5.36,structure:9.0,flow:22.45,technical:0.0,regime:17.04},result:'WIN'},
  {id:1776425400123,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:900,hour:7,session:'EU',windowType:'15m',signals:{gap:11.16,momentum:0.7,structure:9.0,flow:22.77,technical:10.0,regime:17.29},result:'WIN'},
  {id:1776425672532,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:627,hour:7,session:'EU',windowType:'15m',signals:{gap:27.17,momentum:7.84,structure:12.0,flow:23.03,technical:-8.0,regime:17.48},result:'LOSS'},
  {id:1776426464619,dir:'DOWN',posterior:28.7,regime:'HIGH VOL CHOP',clockAtLock:735,hour:7,session:'EU',windowType:'15m',signals:{gap:0.35,momentum:-2.98,structure:0.0,flow:-21.78,technical:2.0,regime:0.0},result:'LOSS'},
  {id:1776427224628,dir:'UP',posterior:91.7,regime:'SHORT SQUEEZE',clockAtLock:875,hour:8,session:'EU',windowType:'15m',signals:{gap:0.51,momentum:10.14,structure:0.0,flow:22.56,technical:-8.0,regime:17.33},result:'WIN'},
  {id:1776441416802,dir:'UP',posterior:94.7,regime:'SHORT SQUEEZE',clockAtLock:183,hour:11,session:'US',windowType:'15m',signals:{gap:36.27,momentum:-0.04,structure:0.0,flow:22.82,technical:-13.0,regime:17.53},result:'WIN'},
  {id:1776441622489,dir:'UP',posterior:70.6,regime:'SHORT SQUEEZE',clockAtLock:877,hour:12,session:'US',windowType:'15m',signals:{gap:-0.07,momentum:-1.48,structure:0.0,flow:20.12,technical:-5.0,regime:17.67},result:'WIN'},
  {id:1776442523500,dir:'DOWN',posterior:8.7,regime:'HIGH VOL CHOP',clockAtLock:876,hour:12,session:'US',windowType:'15m',signals:{gap:-0.34,momentum:-11.62,structure:8.0,flow:-20.23,technical:2.0,regime:0.0},result:'LOSS'},
  {id:1776443633466,dir:'DOWN',posterior:6.9,regime:'HIGH VOL CHOP',clockAtLock:666,hour:12,session:'US',windowType:'15m',signals:{gap:-2.0,momentum:-15.62,structure:0.0,flow:-12.66,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776444322713,dir:'DOWN',posterior:7.2,regime:'HIGH VOL CHOP',clockAtLock:877,hour:12,session:'US',windowType:'15m',signals:{gap:-0.42,momentum:-6.01,structure:0.0,flow:-15.95,technical:-5.0,regime:0.0},result:'WIN'},
  {id:1776445542459,dir:'DOWN',posterior:7.4,regime:'HIGH VOL CHOP',clockAtLock:558,hour:13,session:'US',windowType:'15m',signals:{gap:-0.46,momentum:-5.09,structure:-9.0,flow:-13.96,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776446147946,dir:'UP',posterior:75.8,regime:'SHORT SQUEEZE',clockAtLock:852,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:-3.43,structure:-9.0,flow:23.82,technical:0.0,regime:17.8},result:'LOSS'},
  {id:1776447019014,dir:'UP',posterior:92.7,regime:'SHORT SQUEEZE',clockAtLock:881,hour:13,session:'US',windowType:'15m',signals:{gap:0.99,momentum:13.15,structure:-12.0,flow:23.64,technical:0.0,regime:17.67},result:'WIN'},
  {id:1776448674472,dir:'DOWN',posterior:6.4,regime:'HIGH VOL CHOP',clockAtLock:126,hour:13,session:'US',windowType:'15m',signals:{gap:1.86,momentum:-15.39,structure:0.0,flow:-18.82,technical:2.0,regime:0.0},result:'LOSS'},
  {id:1776448864028,dir:'DOWN',posterior:8.9,regime:'HIGH VOL CHOP',clockAtLock:836,hour:14,session:'US',windowType:'15m',signals:{gap:-0.61,momentum:-9.88,structure:0.0,flow:-12.94,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776452033072,dir:'DOWN',posterior:16.0,regime:'HIGH VOL CHOP',clockAtLock:367,hour:14,session:'US',windowType:'15m',signals:{gap:-26.13,momentum:-9.65,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776452812288,dir:'DOWN',posterior:7.9,regime:'HIGH VOL CHOP',clockAtLock:487,hour:15,session:'US',windowType:'15m',signals:{gap:-3.13,momentum:-18.94,structure:0.0,flow:0.0,technical:-3.0,regime:0.0},result:'LOSS'},
  {id:1776460757203,dir:'DOWN',posterior:8.8,regime:'RANGE-CHOP',clockAtLock:642,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:-21.82,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776461919967,dir:'DOWN',posterior:7.1,regime:'RANGE-CHOP',clockAtLock:380,hour:17,session:'US',windowType:'15m',signals:{gap:-4.14,momentum:-2.21,structure:0.0,flow:-23.2,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776463239452,dir:'DOWN',posterior:6.4,regime:'RANGE-CHOP',clockAtLock:860,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:-0.57,momentum:-8.75,structure:0.0,flow:-22.84,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776464102445,dir:'DOWN',posterior:7.7,regime:'TRENDING DOWN',clockAtLock:897,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:-0.6,momentum:-12.76,structure:0.0,flow:-14.41,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776468632061,dir:'UP',posterior:94.0,regime:'SHORT SQUEEZE',clockAtLock:868,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776469543660,dir:'DOWN',posterior:8.3,regime:'RANGE-CHOP',clockAtLock:857,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776470307745,dir:'UP',posterior:91.5,regime:'SHORT SQUEEZE',clockAtLock:93,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776470411063,dir:'DOWN',posterior:16.3,regime:'TRENDING DOWN',clockAtLock:889,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776471435490,dir:'UP',posterior:90.1,regime:'SHORT SQUEEZE',clockAtLock:765,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776473754856,dir:'DOWN',posterior:7.2,regime:'SHORT SQUEEZE',clockAtLock:245,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776474078453,dir:'DOWN',posterior:6.1,regime:'RANGE-CHOP',clockAtLock:822,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776474925320,dir:'UP',posterior:92.3,regime:'SHORT SQUEEZE',clockAtLock:875,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776475830221,dir:'DOWN',posterior:8.0,regime:'RANGE-CHOP',clockAtLock:870,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776476723095,dir:'DOWN',posterior:8.9,regime:'TRENDING DOWN',clockAtLock:877,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776477614063,dir:'DOWN',posterior:8.8,regime:'RANGE-CHOP',clockAtLock:886,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776478663077,dir:'UP',posterior:86.5,regime:'RANGE-CHOP',clockAtLock:737,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776479465721,dir:'DOWN',posterior:8.0,regime:'TRENDING DOWN',clockAtLock:835,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776480331504,dir:'DOWN',posterior:8.2,regime:'RANGE-CHOP',clockAtLock:869,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776481238592,dir:'UP',posterior:87.4,regime:'RANGE-CHOP',clockAtLock:862,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776482921288,dir:'DOWN',posterior:7.8,regime:'RANGE-CHOP',clockAtLock:79,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776483034127,dir:'DOWN',posterior:7.8,regime:'RANGE-CHOP',clockAtLock:866,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776483928752,dir:'DOWN',posterior:6.8,regime:'RANGE-CHOP',clockAtLock:872,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776484836942,dir:'DOWN',posterior:6.2,regime:'RANGE-CHOP',clockAtLock:863,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776485800712,dir:'DOWN',posterior:9.0,regime:'RANGE-CHOP',clockAtLock:800,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776487006113,dir:'UP',posterior:88.0,regime:'RANGE-CHOP',clockAtLock:494,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776488505617,dir:'UP',posterior:87.0,regime:'RANGE-CHOP',clockAtLock:794,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776491546638,dir:'DOWN',posterior:8.0,regime:'RANGE-CHOP',clockAtLock:453,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776492046109,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:854,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776492939519,dir:'DOWN',posterior:7.5,regime:'RANGE-CHOP',clockAtLock:860,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776493868609,dir:'DOWN',posterior:8.6,regime:'RANGE-CHOP',clockAtLock:831,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776494723187,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:877,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776496514313,dir:'DOWN',posterior:7.0,regime:'RANGE-CHOP',clockAtLock:886,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776497424081,dir:'DOWN',posterior:7.3,regime:'RANGE-CHOP',clockAtLock:876,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776498380672,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:819,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776499643408,dir:'UP',posterior:48.8,regime:'RANGE-CHOP',clockAtLock:456,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776499679323,dir:'DOWN',posterior:7.2,regime:'RANGE-CHOP',clockAtLock:420,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776500162466,dir:'DOWN',posterior:6.3,regime:'TRENDING DOWN',clockAtLock:837,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776501024034,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:876,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776501925556,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:874,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776502873527,dir:'DOWN',posterior:8.9,regime:'TRENDING DOWN',clockAtLock:826,hour:5,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776527703240,dir:'UP',posterior:87.3,regime:'SHORT SQUEEZE',clockAtLock:297,hour:11,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776528066026,dir:'DOWN',posterior:6.4,regime:'TRENDING DOWN',clockAtLock:834,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776529693677,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:106,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776529846994,dir:'UP',posterior:70.9,regime:'RANGE-CHOP',clockAtLock:853,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776530945797,dir:'DOWN',posterior:7.6,regime:'RANGE-CHOP',clockAtLock:654,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776531631012,dir:'DOWN',posterior:7.8,regime:'TRENDING DOWN',clockAtLock:869,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776532525158,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:875,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776533419341,dir:'DOWN',posterior:6.7,regime:'RANGE-CHOP',clockAtLock:880,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776534333979,dir:'DOWN',posterior:8.3,regime:'RANGE-CHOP',clockAtLock:866,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776535306569,dir:'DOWN',posterior:8.9,regime:'TRENDING DOWN',clockAtLock:793,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776536579778,dir:'DOWN',posterior:8.9,regime:'RANGE-CHOP',clockAtLock:420,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776539467826,dir:'UP',posterior:71.4,regime:'RANGE-CHOP',clockAtLock:232,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776539734398,dir:'UP',posterior:71.9,regime:'RANGE-CHOP',clockAtLock:865,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776541546226,dir:'DOWN',posterior:7.9,regime:'RANGE-CHOP',clockAtLock:854,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776542431078,dir:'UP',posterior:72.4,regime:'SHORT SQUEEZE',clockAtLock:869,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776542538165,dir:'DOWN',posterior:8.6,regime:'RANGE-CHOP',clockAtLock:762,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776543439980,dir:'DOWN',posterior:7.7,regime:'RANGE-CHOP',clockAtLock:760,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776543528194,dir:'UP',posterior:7.7,regime:'SHORT SQUEEZE',clockAtLock:672,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776544214709,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:885,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776579801306,dir:'DOWN',posterior:8.4,regime:'SHORT SQUEEZE',clockAtLock:399,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776580464051,dir:'UP',posterior:73.7,regime:'SHORT SQUEEZE',clockAtLock:636,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776581152679,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:847,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776582037665,dir:'UP',posterior:72.7,regime:'SHORT SQUEEZE',clockAtLock:862,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776583130083,dir:'DOWN',posterior:6.2,regime:'RANGE-CHOP',clockAtLock:670,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776583975044,dir:'DOWN',posterior:8.0,regime:'RANGE-CHOP',clockAtLock:725,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776584788013,dir:'UP',posterior:72.8,regime:'RANGE-CHOP',clockAtLock:812,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776629486095,dir:'DOWN',posterior:70.7,regime:'RANGE-CHOP',clockAtLock:214,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776629798992,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:801,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776630619898,dir:'DOWN',posterior:6.9,regime:'RANGE-CHOP',clockAtLock:880,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776631532649,dir:'UP',posterior:73.1,regime:'RANGE-CHOP',clockAtLock:867,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776632491747,dir:'UP',posterior:73.1,regime:'SHORT SQUEEZE',clockAtLock:808,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776633334163,dir:'DOWN',posterior:6.5,regime:'RANGE-CHOP',clockAtLock:866,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776655252536,dir:'UP',posterior:86.8,regime:'SHORT SQUEEZE',clockAtLock:547,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776656007171,dir:'UP',posterior:76.2,regime:'RANGE-CHOP',clockAtLock:692,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776656724672,dir:'UP',posterior:76.7,regime:'SHORT SQUEEZE',clockAtLock:875,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776657938757,dir:'DOWN',posterior:6.0,regime:'TRENDING DOWN',clockAtLock:561,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776658546067,dir:'DOWN',posterior:6.6,regime:'RANGE-CHOP',clockAtLock:854,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776659446065,dir:'DOWN',posterior:7.5,regime:'RANGE-CHOP',clockAtLock:854,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776665958684,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:642,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776666728537,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:771,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776667552798,dir:'DOWN',posterior:7.9,regime:'RANGE-CHOP',clockAtLock:847,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776668460542,dir:'UP',posterior:67.7,regime:'RANGE-CHOP',clockAtLock:840,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776669369715,dir:'DOWN',posterior:7.7,regime:'RANGE-CHOP',clockAtLock:831,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776670284972,dir:'DOWN',posterior:31.4,regime:'RANGE-CHOP',clockAtLock:815,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776671211750,dir:'DOWN',posterior:7.3,regime:'SHORT SQUEEZE',clockAtLock:789,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776672080674,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:819,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776672935569,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:864,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776673905975,dir:'UP',posterior:68.5,regime:'SHORT SQUEEZE',clockAtLock:794,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776706916492,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:630,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776707129284,dir:'DOWN',posterior:8.4,regime:'HIGH VOL CHOP',clockAtLock:855,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776709831679,dir:'DOWN',posterior:6.2,regime:'HIGH VOL CHOP',clockAtLock:869,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776710716457,dir:'UP',posterior:78.5,regime:'SHORT SQUEEZE',clockAtLock:884,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776711654828,dir:'UP',posterior:77.3,regime:'SHORT SQUEEZE',clockAtLock:845,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776712530621,dir:'DOWN',posterior:6.4,regime:'HIGH VOL CHOP',clockAtLock:870,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776713442075,dir:'DOWN',posterior:8.9,regime:'HIGH VOL CHOP',clockAtLock:858,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776714346358,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:854,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776715264080,dir:'DOWN',posterior:6.0,regime:'RANGE-CHOP',clockAtLock:836,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776716132991,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:867,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776717021935,dir:'DOWN',posterior:6.4,regime:'RANGE-CHOP',clockAtLock:878,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776717915688,dir:'DOWN',posterior:6.9,regime:'RANGE-CHOP',clockAtLock:885,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776718824483,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:875,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776719923236,dir:'UP',posterior:7.9,regime:'TRENDING DOWN',clockAtLock:677,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776720664046,dir:'DOWN',posterior:6.9,regime:'TRENDING DOWN',clockAtLock:836,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776721672456,dir:'DOWN',posterior:8.5,regime:'RANGE-CHOP',clockAtLock:728,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776739718264,dir:'DOWN',posterior:8.3,regime:'RANGE-CHOP',clockAtLock:682,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776740422182,dir:'DOWN',posterior:7.2,regime:'RANGE-CHOP',clockAtLock:878,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776741357491,dir:'DOWN',posterior:7.2,regime:'RANGE-CHOP',clockAtLock:843,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776742403016,dir:'DOWN',posterior:6.8,regime:'RANGE-CHOP',clockAtLock:697,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776743119467,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:881,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776744034938,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:865,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776744937240,dir:'DOWN',posterior:6.2,regime:'RANGE-CHOP',clockAtLock:863,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776745823975,dir:'DOWN',posterior:7.7,regime:'RANGE-CHOP',clockAtLock:876,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776746727488,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:873,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776747631426,dir:'UP',posterior:74.3,regime:'SHORT SQUEEZE',clockAtLock:869,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776748555699,dir:'DOWN',posterior:6.1,regime:'RANGE-CHOP',clockAtLock:845,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776748636631,dir:'DOWN',posterior:6.7,regime:'RANGE-CHOP',clockAtLock:763,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776749424129,dir:'DOWN',posterior:8.8,regime:'RANGE-CHOP',clockAtLock:876,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776750330449,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:869,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776751307104,dir:'DOWN',posterior:7.7,regime:'RANGE-CHOP',clockAtLock:793,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776752168512,dir:'UP',posterior:72.4,regime:'RANGE-CHOP',clockAtLock:832,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776753042111,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:858,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776754165301,dir:'UP',posterior:73.4,regime:'SHORT SQUEEZE',clockAtLock:635,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776754830274,dir:'DOWN',posterior:6.0,regime:'TRENDING DOWN',clockAtLock:870,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776755728173,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:872,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776756633505,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:867,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776757547585,dir:'DOWN',posterior:8.6,regime:'RANGE-CHOP',clockAtLock:853,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776758428829,dir:'UP',posterior:75.5,regime:'SHORT SQUEEZE',clockAtLock:872,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776759333181,dir:'DOWN',posterior:31.8,regime:'RANGE-CHOP',clockAtLock:867,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776760246540,dir:'DOWN',posterior:30.6,regime:'RANGE-CHOP',clockAtLock:854,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776761211456,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:788,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776762019804,dir:'UP',posterior:75.1,regime:'RANGE-CHOP',clockAtLock:880,hour:5,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776762930253,dir:'UP',posterior:75.2,regime:'SHORT SQUEEZE',clockAtLock:869,hour:5,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776763857323,dir:'DOWN',posterior:8.7,regime:'SHORT SQUEEZE',clockAtLock:842,hour:5,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776793971910,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:428,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776794437610,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:863,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776795330051,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:870,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776796215730,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:884,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776797162666,dir:'DOWN',posterior:7.6,regime:'SHORT SQUEEZE',clockAtLock:837,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776798024282,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:876,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776798947885,dir:'UP',posterior:88.5,regime:'HIGH VOL CHOP',clockAtLock:852,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776799826365,dir:'DOWN',posterior:8.7,regime:'HIGH VOL CHOP',clockAtLock:874,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776800735953,dir:'UP',posterior:87.1,regime:'SHORT SQUEEZE',clockAtLock:864,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776801620045,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:880,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776803656794,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:643,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776805775678,dir:'DOWN',posterior:8.6,regime:'HIGH VOL CHOP',clockAtLock:324,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776808310202,dir:'DOWN',posterior:8.0,regime:'HIGH VOL CHOP',clockAtLock:490,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776809053540,dir:'DOWN',posterior:7.5,regime:'HIGH VOL CHOP',clockAtLock:646,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776809738802,dir:'DOWN',posterior:8.5,regime:'HIGH VOL CHOP',clockAtLock:861,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776810629265,dir:'UP',posterior:89.1,regime:'HIGH VOL CHOP',clockAtLock:870,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776811544897,dir:'DOWN',posterior:6.4,regime:'HIGH VOL CHOP',clockAtLock:855,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776812421573,dir:'DOWN',posterior:8.0,regime:'HIGH VOL CHOP',clockAtLock:878,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776812669613,dir:'UP',posterior:89.0,regime:'SHORT SQUEEZE',clockAtLock:630,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776817255207,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:545,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776818015399,dir:'UP',posterior:51.7,regime:'RANGE-CHOP',clockAtLock:685,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776819717365,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:782,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776820540264,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:859,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776821442251,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:857,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776822321971,dir:'DOWN',posterior:8.0,regime:'RANGE-CHOP',clockAtLock:878,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776823241483,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:858,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776830055338,dir:'UP',posterior:88.1,regime:'RANGE-CHOP',clockAtLock:344,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776830482304,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:818,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776831345036,dir:'DOWN',posterior:6.2,regime:'RANGE-CHOP',clockAtLock:855,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776832239920,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:860,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776833117685,dir:'DOWN',posterior:9.0,regime:'HIGH VOL CHOP',clockAtLock:883,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776834230092,dir:'DOWN',posterior:6.0,regime:'RANGE-CHOP',clockAtLock:670,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776835568287,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:232,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776835845995,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:854,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776836722893,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:878,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776837624794,dir:'DOWN',posterior:8.8,regime:'HIGH VOL CHOP',clockAtLock:876,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776838527897,dir:'DOWN',posterior:8.1,regime:'SHORT SQUEEZE',clockAtLock:873,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776839461939,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:838,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776841020326,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:180,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776841233662,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:867,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776844834897,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:854,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776845214521,dir:'UP',posterior:72.1,regime:'RANGE-CHOP',clockAtLock:871,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776846638505,dir:'DOWN',posterior:7.4,regime:'RANGE-CHOP',clockAtLock:863,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776872563359,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:372,hour:11,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776873655731,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:874,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776874591342,dir:'DOWN',posterior:8.3,regime:'HIGH VOL CHOP',clockAtLock:869,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776875488238,dir:'DOWN',posterior:8.5,regime:'HIGH VOL CHOP',clockAtLock:878,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776876331166,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:852,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776877322803,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:875,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776878288075,dir:'DOWN',posterior:8.4,regime:'HIGH VOL CHOP',clockAtLock:864,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776879155613,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:869,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776880022710,dir:'DOWN',posterior:7.9,regime:'HIGH VOL CHOP',clockAtLock:882,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776881481982,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:857,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776881746892,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:871,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776882636853,dir:'DOWN',posterior:8.0,regime:'RANGE-CHOP',clockAtLock:867,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776883539183,dir:'DOWN',posterior:7.8,regime:'RANGE-CHOP',clockAtLock:875,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776884441480,dir:'DOWN',posterior:8.2,regime:'RANGE-CHOP',clockAtLock:878,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776885344433,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:862,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776886273615,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:874,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776887333863,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:856,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776888111515,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:870,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776902442088,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:857,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776903490478,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:866,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776904252931,dir:'UP',posterior:73.4,regime:'RANGE-CHOP',clockAtLock:872,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776905206060,dir:'DOWN',posterior:7.8,regime:'RANGE-CHOP',clockAtLock:868,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776912209685,dir:'DOWN',posterior:8.5,regime:'HIGH VOL CHOP',clockAtLock:396,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776912349727,dir:'DOWN',posterior:8.3,regime:'HIGH VOL CHOP',clockAtLock:856,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776913383966,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:869,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776914151082,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:852,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776915023460,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:870,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776915916328,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:862,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776916830499,dir:'DOWN',posterior:7.6,regime:'RANGE-CHOP',clockAtLock:871,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776917725101,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:858,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776918625268,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:866,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776919528719,dir:'DOWN',posterior:7.4,regime:'RANGE-CHOP',clockAtLock:876,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776920420182,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:865,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776921319507,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:872,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776921593724,dir:'DOWN',posterior:8.1,regime:'RANGE-CHOP',clockAtLock:863,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776922224406,dir:'DOWN',posterior:6.8,regime:'TRENDING DOWN',clockAtLock:858,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776923124184,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:867,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776942852526,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:854,hour:7,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776942917328,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:868,hour:7,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776943842274,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:871,hour:7,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776944749802,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:862,hour:7,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776945689540,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:875,hour:8,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776946529627,dir:'DOWN',posterior:7.4,regime:'TRENDING DOWN',clockAtLock:858,hour:8,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776947452773,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:869,hour:8,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776947491814,dir:'UP',posterior:72.4,regime:'RANGE-CHOP',clockAtLock:843,hour:8,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776948329656,dir:'DOWN',posterior:8.1,regime:'RANGE-CHOP',clockAtLock:867,hour:8,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776949241159,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:872,hour:9,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776950438032,dir:'UP',posterior:75.3,regime:'RANGE-CHOP',clockAtLock:856,hour:9,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776951097787,dir:'UP',posterior:73.1,regime:'RANGE-CHOP',clockAtLock:863,hour:9,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776952003637,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:874,hour:9,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776952837830,dir:'UP',posterior:74.2,regime:'RANGE-CHOP',clockAtLock:869,hour:10,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776954032101,dir:'UP',posterior:76.1,regime:'RANGE-CHOP',clockAtLock:851,hour:10,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776969042798,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:866,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776969929050,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:873,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
];

const loadTradeLog=()=>{try{const s=localStorage.getItem('taraTradeLogV110');if(s){const p=JSON.parse(s);if(p&&p.length>0)return p;}return SEED_TRADES;}catch(e){return SEED_TRADES;}};
const saveTradeLog=(log)=>{try{localStorage.setItem('taraTradeLogV110',JSON.stringify(log.slice(-500)));}catch(e){}}; // keep last 500

// ── GRADIENT DESCENT WEIGHT UPDATE ──
// After each trade, credit/blame each signal proportionally to its contribution
const updateWeights=(weights,tradeLog,result)=>{
  // Recency-biased gradient descent: recent trades have 2x weight vs old ones
  // This makes Tara adapt faster to current market conditions
  const last=tradeLog[tradeLog.length-1];
  if(!last||!last.signals||!last.posterior)return weights;
  const won=result==='WIN';
  const sig=last.signals;
  const totalAbs=Object.values(sig).reduce((s,v)=>s+Math.abs(v),0)||1;
  const conviction=Math.abs(last.posterior-50)/50;
  // Recency multiplier: newest trade = 2.0x, older trades decay toward 0.5x
  const idx=tradeLog.length-1;
  const totalTrades=Math.max(1,tradeLog.length);
  const recencyMult=0.5+1.5*(idx/totalTrades); // 0.5 → 2.0 as trade gets newer
  const newW={...weights};
  Object.keys(sig).forEach(k=>{
    if(!(k in newW))return;
    const contribution=Math.abs(sig[k])/totalAbs;
    const aligned=Math.sign(sig[k])===Math.sign(last.posterior-50);
    let delta=LEARNING_RATE*contribution*conviction*recencyMult;
    if(won&&aligned)newW[k]+=delta;
    else if(won&&!aligned)newW[k]-=delta*0.3;
    else if(!won&&aligned)newW[k]-=delta;
    else if(!won&&!aligned)newW[k]+=delta*0.2;
    const[lo,hi]=WEIGHT_BOUNDS[k]||[2,55];
    newW[k]=Math.max(lo,Math.min(hi,newW[k]));
  });
  saveWeights(newW);
  return newW;
};
// Per-regime weight updater — same logic but targets the regime-specific set
const updateRegimeWeights=(regimeWeightsObj,trade,result)=>{
  if(!trade||!trade.signals||!trade.posterior)return regimeWeightsObj;
  const rg=trade.regime||'RANGE-CHOP';
  if(!regimeWeightsObj[rg])return regimeWeightsObj;
  const weights=regimeWeightsObj[rg];
  const won=result==='WIN';
  const sig=trade.signals;
  const totalAbs=Object.values(sig).reduce((s,v)=>s+Math.abs(v),0)||1;
  const conviction=Math.abs(trade.posterior-50)/50;
  const newW={...weights};
  Object.keys(sig).forEach(k=>{
    if(!(k in newW))return;
    const contribution=Math.abs(sig[k])/totalAbs;
    const aligned=Math.sign(sig[k])===Math.sign(trade.posterior-50);
    let delta=(LEARNING_RATE*1.2)*contribution*conviction; // slightly higher LR for regime-specific
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

  return{tapeRef,globalFlow,ticksRef,whaleLog,flowSignal};
};

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
    '&timezone=Etc%2FUTC',
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
  const{currentPrice,liveHistory,targetMargin,globalFlow,bloomberg,velocityRef,tickHistoryRef,priceMemoryRef,windowType,timeFraction,clockSeconds,is15m,regimeMemory,adaptiveWeights,calibration}=params;
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
  let regime='RANGE-CHOP';
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

  // ── IMPROVEMENT 1: Direction prior calibration ───────────────────────────
  // 211-trade data: UP 69% WR vs DOWN 55% WR — DOWN is structurally less reliable
  // Pull DOWN posteriors 15% closer to 50 to match actual empirical reliability
  let dirCalibrated=calibratedPosterior;
  if(calibratedPosterior<50){
    dirCalibrated=50-(50-calibratedPosterior)*0.85;
    reasoning.push(`[DIR] DOWN prior adj: ${calibratedPosterior.toFixed(1)}%→${dirCalibrated.toFixed(1)}% (DOWN WR=55% correction)`);
  }

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
  const finalPosterior=Math.max(1,Math.min(99,dirCalibrated));

  reasoning.push(`[ATR] Volatility: ${atrBps.toFixed(1)} bps | Regime: ${regime}${isPostDecay?' | POST-DECAY':''}`);
  if(calibration&&Object.values(calibration).some(v=>v!=null))reasoning.push(`[CAL] Pipeline: raw ${posterior.toFixed(1)}% → cal ${calibratedPosterior.toFixed(1)}% → dir+time ${finalPosterior.toFixed(1)}%`);

  // Rug pull check
  const isRugPull=tickSlope<-5&&aggrFlow<-0.6;

  return{posterior:finalPosterior,rawPosterior:posterior,regime,upThreshold,downThreshold,reasoning,atrBps,rsi,bb,vwap,realGapBps,drift1m,drift5m,drift15m,accel,pnlSlope,tickSlope,aggrFlow,isRugPull,isPostDecay,consecutive,volRatio,channel,momentumAlign,rawSignalScores,totalSignalWeight};
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
        <button onClick={()=>setShowWhaleLog(false)} className="opacity-40 hover:opacity-100 transition-opacity"><span className={'text-[#E8E9E4]/60 text-sm font-bold'}>✕</span></button>
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
  const bgStyle={
    emerald:{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.25)'},
    amber:{background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.20)'},
    rose:{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.20)'},
  }[c]||{};
  const txtCls=c==='emerald'?'text-emerald-400':c==='amber'?'text-amber-400':'text-rose-400';
  const barCls=c==='emerald'?'bg-emerald-500':c==='amber'?'bg-amber-500':'bg-rose-500';
  const msg=qualityGate.score>=75
    ?('High-confidence setup. '+(regime||'')+(session?' in '+session:'')+' historically reliable.')
    :qualityGate.score>=55
    ?'Moderate setup. Trade smaller or wait for stronger signal.'
    :('Low quality — '+(regime||'')+' in '+(session||'')+' has weak historical WR. Consider sitting out.');
  return(
    <div className="mb-2 p-2.5 rounded-lg" style={bgStyle}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest font-bold" style={{color:'rgba(232,233,228,0.3)'}}>Quality Gate</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${txtCls}`}>{qualityGate.label} — {qualityGate.score?.toFixed(0)}&#47;100</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{background:'rgba(232,233,228,0.1)'}}>
        <div className={`h-full rounded-full transition-all duration-700 ${barCls}`} style={{width:(qualityGate.score||0)+'%'}}/>
      </div>
      <div className={`text-[10px] ${txtCls}`} style={{opacity:0.7}}>{msg}</div>
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
    handleManualSync,getMarketSessions
  }=props;

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

  const showFormingProgress=!analysis.lockInfo&&(analysis.prediction.includes('FORMING')||analysis.prediction==='SEARCHING...');
  const formingDir=analysis.prediction.includes('UP');
  const formingCount=formingDir?analysis.bullCount:analysis.bearCount;
  const formingPct=Math.min(100,(formingCount/analysis.consecutiveNeeded)*100);
  const formingBarCls='h-full rounded-full transition-all duration-500 '+(formingDir?'bg-emerald-500/60':'bg-rose-500/60');
  const headingCls='prediction-heading text-3xl sm:text-4xl md:text-5xl font-serif font-bold leading-none tracking-tight '+(analysis.textColor||'')+' drop-shadow-lg';

  return(
    <div className="flex flex-col flex-1 gap-3">
      <div className="flex flex-col items-center text-center pt-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
          <span className={'text-xs text-[#E8E9E4]/40 uppercase tracking-[0.2em] font-bold'}>Prediction</span>
          {analysis.regime&&(
            <span className={'text-xs text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded'}>{analysis.regime}</span>
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
        <h2 className={headingCls}>{analysis.prediction}</h2>

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

        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="text-indigo-300">UP: {Number(analysis.rawProbAbove||0).toFixed(1)}%</span>
          <span className={'text-[#E8E9E4]/20'}>|</span>
          <span className="text-rose-300">DN: {(100-Number(analysis.rawProbAbove||0)).toFixed(1)}%</span>
          {analysis.kellyPct>0&&(
            <span className={'text-amber-400/80'}>Kelly: {analysis.kellyPct.toFixed(1)}%</span>
          )}
        </div>

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
    </div>
  );
}


function TaraApp(){
  const[isMounted,setIsMounted]=useState(false);
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
  // streakData moved below tradeLog declaration
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
  const[scorecards,setScorecards]=useState({'15m':{wins:347,losses:230},'5m':{wins:31,losses:25}});
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
    if(recent.length<3)return{streak:0,type:'neutral',last5WR:null,warning:false,strongWarn:false};
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
    return{streak,type:lastResult==='WIN'?'hot':'cold',last5WR,warning,strongWarn};
  },[tradeLog]);
  const tradeLogRef=useRef([]);
  tradeLogRef.current=tradeLog;
  const pendingTradeRef=useRef(null);
  const[showAnalytics,setShowAnalytics]=useState(false);
  const[showGuide,setShowGuide]=useState(false);
  const[selectedTradeId,setSelectedTradeId]=useState(null); // for editable trade log
  const[discordEditingId,setDiscordEditingId]=useState(null); // for discord message edit
  const[discordEditText,setDiscordEditText]=useState('');
  const[discordStatusMsg,setDiscordStatusMsg]=useState('');
  const calibration=useMemo(()=>buildCalibration(tradeLog),[tradeLog]);
  const signalAccuracy=useMemo(()=>buildSignalAccuracy(tradeLog),[tradeLog]);
  const sessionPerf=useMemo(()=>buildSessionPerf(tradeLog),[tradeLog]);
  const hourlyPerf=useMemo(()=>buildHourlyPerf(tradeLog),[tradeLog]);
  const[manualAction,setManualAction]=useState(null);
  const[forceRender,setForceRender]=useState(0);
  const[isChatOpen,setIsChatOpen]=useState(false);
  const[chatLog,setChatLog]=useState([{role:'tara',text:'Tara V110 online — Canvas Chart + Weighted Signal Engine + Smart Advisor active.'}]);
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
      if(ctx.state==='suspended'){ctx.resume();return;}
      const tone=(freq,vol,dur,wave)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type=wave||'sine';o.frequency.value=freq;
        g.gain.setValueAtTime(vol,ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
        o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur);
      };
      if(type==='lock-up'){tone(523,0.08,0.2);setTimeout(()=>tone(659,0.1,0.3),180);}
      else if(type==='lock-down'){tone(659,0.08,0.2);setTimeout(()=>tone(523,0.1,0.3),180);}
      else if(type==='entry'){tone(880,0.07,0.12,'square');setTimeout(()=>tone(880,0.07,0.12,'square'),120);setTimeout(()=>tone(880,0.07,0.12,'square'),240);}
      else if(type==='profit'){tone(523,0.07,0.15);setTimeout(()=>tone(659,0.07,0.15),100);setTimeout(()=>tone(784,0.09,0.3),200);}
      else if(type==='warning'){tone(220,0.1,0.15,'sawtooth');setTimeout(()=>tone(220,0.1,0.15,'sawtooth'),200);}
      else if(type==='emergency'){tone(180,0.12,0.12,'sawtooth');setTimeout(()=>tone(180,0.12,0.12,'sawtooth'),150);setTimeout(()=>tone(180,0.12,0.12,'sawtooth'),300);}
      else{tone(440,0.06,0.2);}
    }catch(e){}
  };
  const[showWhaleLog,setShowWhaleLog]=useState(false);
  const velocityRef=useVelocity(tickHistoryRef,currentPrice,targetMargin);
  const bloomberg=useBloomberg();
  const{tapeRef,globalFlow,ticksRef,whaleLog,flowSignal}=useGlobalTape();
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
    try{const s=localStorage.getItem('taraV110Score');if(s){const p=JSON.parse(s);if(p?.['15m']?.wins!=null)setScorecards(p);}const m=localStorage.getItem('taraV110Mem');if(m)setRegimeMemory(JSON.parse(m));const w=localStorage.getItem('taraV110Hook');if(w)setDiscordWebhook(w);const tz=localStorage.getItem('taraV110TZ');if(tz!=null)setUseLocalTime(tz==='true');
      // Username migration: always sync to current version, never keep stale Vxxx strings
      const du=localStorage.getItem('taraV110DU');
      const cleanDU=(du&&!new RegExp('V1[0-9][0-9]').test(du||''))?du:'Tara V110'; // no regex literal — esbuild safe
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
    const p=price||currentPriceRef.current;
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
    setStrikeSource('live');
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
        description:`Signal forming. Awaiting lock confirmation.`,
        fields:[
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Strike',value:`$${data.strike.toFixed(2)}`,inline:true},
          {name:'Gap',value:`${data.gap.toFixed(1)} bps`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Confidence',value:`${(data.posterior||0).toFixed(1)}%`,inline:true},
        ],
        footer:{text:'Tara V110  |  signal'},
        timestamp:new Date().toISOString(),
      };

      else if(type==='LOCK')embed={
        title:`TARA  ${data.dir}  LOCKED`,
        color:data.dir==='UP'?3404125:16478549,
        description:`Lock confirmed. Enter ${data.dir}.`,
        fields:[
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Strike',value:`$${data.strike.toFixed(2)}`,inline:true},
          {name:'Gap',value:`${data.gap.toFixed(1)} bps`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Record',value:data.record||'—',inline:true},
        ],
        footer:{text:'Tara V110  |  lock'},
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
          footer:{text:'Tara V110  |  close'},
          timestamp:new Date().toISOString(),
        };
      }

      else if(type==='EXIT')embed={
        title:`${data.result==='WIN'?'CASHOUT':'CUT'}  ${data.action}`,
        color:data.result==='WIN'?3404125:16478549,
        fields:[
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Strike',value:`$${data.strike.toFixed(2)}`,inline:true},
          {name:'Gap',value:`${data.gap.toFixed(1)} bps`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
        ],
        footer:{text:'Tara V110  |  exit'},
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
          footer:{text:'Tara V110  |  futures tape  |  not financial advice'},
          timestamp:new Date().toISOString(),
        };
      }

      const res=await fetch(discordWebhook+'?wait=true',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:discordUsername||'Tara V110',avatar_url:discordAvatar||undefined,embeds:[embed]})});
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
        footer:{text:`Tara V110 · edited ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}`},
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
  useEffect(()=>{
    const fetchKalshi=async()=>{
      if(windowType!=='15m')return; // Kalshi 15m markets only
      try{
        const now=Date.now();
        const iMs=15*60*1000;
        const nextMs=Math.ceil((now+500)/iMs)*iMs;
        const r=await fetch(
          'https://api.elections.kalshi.com/trade-api/v2/markets?limit=200&ticker_name_prefix=KXBTC&status=open',
          {signal:AbortSignal.timeout(6000),headers:{'Accept':'application/json'}}
        );
        if(!r.ok)return;
        const d=await r.json();
        const markets=d.markets||d.data||[];
        let best=null,bestDiff=Infinity;
        for(const m of markets){
          const closeMs=m.close_time?new Date(m.close_time).getTime():0;
          if(!closeMs)continue;
          const diff=Math.abs(closeMs-nextMs);
          if(diff<bestDiff){bestDiff=diff;best=m;}
        }
        if(best&&bestDiff<10*60*1000){
          // yes_ask or last_price — prefer yes_ask as live market price
          const yes=best.yes_ask??best.yes_bid??best.last_price??null;
          if(yes!=null)setKalshiYesPrice(Number(yes));
        }
      }catch(e){}
    };
    fetchKalshi();
    const iv=setInterval(fetchKalshi,30000);
    return()=>clearInterval(iv);
  },[windowType]);
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
            if(pendingTradeRef.current&&pendingTradeRef.current.result===null){
              const result=won?'WIN':'LOSS';
              const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin};
              const newLog=[...tradeLogRef.current,resolvedTrade];
              saveTradeLog(newLog);setTradeLog(newLog);
              setAdaptiveWeights(updateWeights(adaptiveWeights,newLog,result));
              setRegimeWeights(prev=>updateRegimeWeights(prev,resolvedTrade,result));
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
      const eng=computeV99Posterior({currentPrice,liveHistory,targetMargin,globalFlow,bloomberg,velocityRef,tickHistoryRef,priceMemoryRef,windowType,timeFraction,clockSeconds,is15m,regimeMemory,adaptiveWeights,regimeWeights,currentRegime:lastRegimeRef.current||'RANGE-CHOP',calibration});
      const{posterior,regime,upThreshold,downThreshold,reasoning,atrBps,realGapBps,drift1m,drift5m,accel,pnlSlope,tickSlope,aggrFlow,isRugPull,isPostDecay,bb}=eng;
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
      const LOCK_THRESHOLD_UP=(is15m?70:68)+_sessThreshAdj;
      const LOCK_THRESHOLD_DN=(is15m?30:32)-_sessThreshAdj;

      // ── IMPROVEMENT 2: Regime-gated consecutive requirement ──────────────
      // RANGE-CHOP is 56% WR (near coin flip) — needs one extra confirmation sample
      // TRENDING DOWN is 86% WR — can fire faster (2 samples)
      // ── IMPROVEMENT 3: Session multiplier on consecutive requirement ─────
      // US session 59% WR — needs one extra sample to reduce false locks
      const _regime=lastRegimeRef.current||'RANGE-CHOP';
      const _regimeConsecAdj=_regime==='RANGE-CHOP'?1:_regime==='HIGH VOL CHOP'?1:_regime==='TRENDING DOWN'?-1:0;
      const _sessConsecAdj=_sess==='US'?1:_sess==='OFF-HOURS'?1:0;
      const CONSECUTIVE_NEEDED=Math.max(1,(is15m?3:2)+_regimeConsecAdj+_sessConsecAdj);

      // ── IMPROVEMENT 4: Late lock penalty ─────────────────────────────────
      // Very late locks (>820s elapsed in 15m = last 80s) get suppressed
      // Data shows losses lock avg 777s vs wins 744s — very late = higher risk
      const elapsedSeconds=(is15m?900:300)-clockSeconds;
      const isVeryLateLock=is15m?(elapsedSeconds>820):(elapsedSeconds>260);
      // Late lock warning zone (700-820s elapsed) — show indicator, allow but note
      const isLateLockZone=is15m?(elapsedSeconds>700&&elapsedSeconds<=820):(elapsedSeconds>220&&elapsedSeconds<=260);

      // Add current posterior to history (capped at 12 samples)
      posteriorHistoryRef.current.push(posterior);
      if(posteriorHistoryRef.current.length>12)posteriorHistoryRef.current.shift();

      // Count consecutive bullish/bearish samples from recent history
      const recentHist=posteriorHistoryRef.current.slice(-6);
      const bullCount=recentHist.filter(p=>p>=LOCK_THRESHOLD_UP).length;
      const bearCount=recentHist.filter(p=>p<=LOCK_THRESHOLD_DN).length;

      // ── DOWN REGIME GATE ──────────────────────────────────────────────────
      // Data: DOWN in SHORT SQUEEZE = 50% WR (coin flip), DOWN in HVC = 48.4% WR (below coin flip)
      // Only trust DOWN in TRENDING DOWN (93%) and RANGE-CHOP (51%, still weak)
      // In SHORT SQUEEZE: DOWN requires 2× the normal consecutive samples AND stricter threshold
      const _downGated=regime==='SHORT SQUEEZE'||regime==='HIGH VOL CHOP';
      const _downTDOnly=regime==='TRENDING DOWN'; // most reliable DOWN regime
      const LOCK_THRESHOLD_DN_EFFECTIVE=_downGated?(is15m?22:20):_downTDOnly?(is15m?28:26):(is15m?30:32)-_sessThreshAdj;
      // Rebalanced: DOWN was too hesitant (+2), UP was firing too fast in weak regimes
      // DOWN now: +1 extra in gated regimes (not +2). UP: +1 in HVC/RC weak UP regimes.
      const CONSECUTIVE_NEEDED_DN=_downGated
        ? Math.max(2,CONSECUTIVE_NEEDED+1) // 1 extra for gated regimes — was +2, too slow
        : CONSECUTIVE_NEEDED;
      // UP gate: HIGH VOL CHOP and RANGE-CHOP UP calls need one extra sample too (55-59% WR)
      const _upGated=regime==='HIGH VOL CHOP'||regime==='RANGE-CHOP';
      const CONSECUTIVE_NEEDED_UP=_upGated
        ? Math.max(2,CONSECUTIVE_NEEDED+1) // extra confirmation in weak UP regimes
        : CONSECUTIVE_NEEDED;

      // ── Phase 1: Pre-lock ──
      if(!lockedCallRef.current){
        const avgRecent=recentHist.reduce((a,b)=>a+b,0)/(recentHist.length||1);

        // Track first FORMING direction this window — commit to it, no flipping
        if(!windowSignalDirRef.current){
          if(avgRecent>=58)windowSignalDirRef.current='UP';
          else if(avgRecent<=42)windowSignalDirRef.current='DOWN';
        }
        const committedDir=windowSignalDirRef.current; // null until first FORMING signal

        if(isVeryLateLock){
          taraAdviceRef.current=taraAdviceRef.current||'SEARCHING...';

        } else if(bullCount>=CONSECUTIVE_NEEDED_UP&&!isEndgameLock){
          // ── Quality gate: suppress lock if score too low ──
          const _rm=regimeMemory[regime]||{wins:0,losses:0};
          const _rt=_rm.wins+_rm.losses;
          const _rWR=_rt>5?(_rm.wins/_rt)*100:60;
          const _sessQ={'EU':67,'ASIA':62,'US':57,'OFF-HOURS':55}[_sess]||57;
          const _qScore=Math.min(40,Math.max(0,(Math.abs(posterior-50)-15)*1.6))+Math.min(30,(_rWR-50)*0.6)+Math.min(15,(_sessQ-50)*0.6)+(isLateLockZone?-8:0)+(isVeryLateLock?-20:0);
          const _quality=Math.max(0,Math.min(100,_qScore+5));
          if(_quality<40){
            // Quality too low — Tara sits out rather than making a weak call
            taraAdviceRef.current='LOW QUALITY — SITTING OUT';
          } else {
          // ── Direction flip guard: if FORMING DOWN already fired, don't lock UP ──
          const dirAllowed=!committedDir||committedDir==='UP';
          if(!dirAllowed){
            taraAdviceRef.current='SEARCHING...';
          } else {
            lockedCallRef.current={dir:'UP',lockedAt:Date.now(),lockedPosterior:posterior,lockedRegime:regime,lockPrice:currentPrice,isLateLock:isLateLockZone};
            taraAdviceRef.current='UP - LOCKED';
            biasCountRef.current={UP:0,DOWN:0};
          }
          } // close quality gate else

        } else if(bearCount>=CONSECUTIVE_NEEDED_DN&&posterior<=LOCK_THRESHOLD_DN_EFFECTIVE&&!isEndgameLock){
          // ── Quality gate for DOWN ──
          const _rm2=regimeMemory[regime]||{wins:0,losses:0};
          const _rt2=_rm2.wins+_rm2.losses;
          const _rWR2=_rt2>5?(_rm2.wins/_rt2)*100:60;
          const _sessQ2={'EU':67,'ASIA':62,'US':57,'OFF-HOURS':55}[_sess]||57;
          const _qScore2=Math.min(40,Math.max(0,(Math.abs(posterior-50)-15)*1.6))+Math.min(30,(_rWR2-50)*0.6)+Math.min(15,(_sessQ2-50)*0.6)+(isLateLockZone?-8:0)+(isVeryLateLock?-20:0);
          const _quality2=Math.max(0,Math.min(100,_qScore2+5));
          if(_quality2<40){
            taraAdviceRef.current='LOW QUALITY — SITTING OUT';
          } else {
          // ── Direction flip guard: if FORMING UP already fired, don't lock DOWN ──
          const dirAllowed=!committedDir||committedDir==='DOWN';
          if(!dirAllowed){
            taraAdviceRef.current='SEARCHING...';
          } else {
            lockedCallRef.current={dir:'DOWN',lockedAt:Date.now(),lockedPosterior:posterior,lockedRegime:regime,lockPrice:currentPrice,isLateLock:isLateLockZone};
            taraAdviceRef.current='DOWN - LOCKED';
            biasCountRef.current={UP:0,DOWN:0};
          }
          } // close quality gate else

        } else {
          if(isVeryLateLock)taraAdviceRef.current='NO CALL';
          else if(avgRecent>=58&&!isEndgameLock)taraAdviceRef.current=`UP (FORMING)${isLateLockZone?' LATE':''}`;
          else if(avgRecent<=42&&!isEndgameLock)taraAdviceRef.current=`DOWN (FORMING)${isLateLockZone?' LATE':''}`;
          else taraAdviceRef.current='SEARCHING...';
        }
      }

      // ── Phase 2: Post-lock — check only EXTREME unlock conditions ──
      if(lockedCallRef.current){
        const lock=lockedCallRef.current;
        const gapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
        // Unlock only if price has MASSIVELY moved against the locked direction
        const deepWrong=(lock.dir==='UP'&&gapBps<-55)||(lock.dir==='DOWN'&&gapBps>55);
        // Rug pull while locked UP = immediate release (don't show both simultaneously)
        const catastrophicRugpull=(isRugPull&&showRugPullAlerts&&lock.dir==='UP')||(isRugPull&&lock.dir==='UP'&&posterior<10);
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

      // V110 Smart Advisor — lock-state-aware
      const _advisorResult=computeAdvisor({userPosition,positionStatus,currentOdds,offerVal,betAmount,maxPayout,clockSeconds,windowType,tickSlope,isRugPull,showRugPullAlerts,hasReversedRef,peakOfferRef,posterior,targetMargin,currentPrice,minsRemaining:timeState.minsRemaining,secsRemaining:timeState.secsRemaining,accel,pnlSlope,atrBps,activePrediction,regime,lockInfo:lockedCallRef.current?{dir:lockedCallRef.current.dir,lockedAt:lockedCallRef.current.lockedAt,lockedPosterior:lockedCallRef.current.lockedPosterior,lockPrice:lockedCallRef.current.lockPrice,lockRegime:lockedCallRef.current.lockedRegime}:null});

      // Projections
      const getHP=(msAgo)=>{const t=Date.now()-msAgo;const m=priceMemoryRef.current;if(!m||m.length===0)return currentPrice;let c=m[0];for(let i=m.length-1;i>=0;i--){if(m[i].time<=t){c=m[i];break;}}return c.p;};
      let trendBps=isNaN(drift1m)?0:drift1m;
      if(isUP&&trendBps<=0)trendBps=2;if(isDN&&trendBps>=0)trendBps=-2;
      const genTimeline=(min,steps)=>{const out=[],iMs=min*60*1000,now=Date.now();let nT=Math.ceil(now/iMs)*iMs;if(nT-now<iMs*0.1)nT+=iMs;const tz=useLocalTime?undefined:{timeZone:'America/New_York'};for(let i=0;i<steps;i++){const sT=nT+(i*iMs);const diff=(sT-now)/60000;const p=currentPrice*(1+(trendBps/10000)*diff);const d=new Date(sT);let ts=`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;try{ts=d.toLocaleTimeString('en-US',{...tz,hour12:true,hour:'numeric',minute:'2-digit'});}catch(e){}out.push({timeStr:ts,timestamp:Math.floor(sT/1000),price:p});}return out;};
      const t5=genTimeline(5,8),t15=genTimeline(15,8),t60=genTimeline(60,8);
      const projections=[{id:'5m',time:'5 MIN',price:t5[0]?.price||currentPrice,conf:Math.min(95,posterior+5),timeline:t5},{id:'15m',time:'15 MIN',price:t15[0]?.price||currentPrice,conf:posterior,timeline:t15},{id:'1h',time:'1 HOUR',price:t60[0]?.price||currentPrice,conf:Math.max(10,posterior-15),timeline:t60}];

      // Multi-timeframe confluence: check if the OTHER timeframe has a recent lock in same direction
      const _otherTF=windowType==='15m'?'5m':'15m';
      const _otherLock=mtfLocksRef.current[_otherTF];
      const _thisLock=lockedCallRef.current;
      const mtfAligned=_thisLock&&_otherLock&&_otherLock.dir===_thisLock.dir&&(Date.now()-_otherLock.lockedAt)<20*60*1000;
      const mtfOpposed=_thisLock&&_otherLock&&_otherLock.dir!==_thisLock.dir&&(Date.now()-_otherLock.lockedAt)<20*60*1000;
      return{confidence:String(isDN?(100-posterior).toFixed(1):posterior.toFixed(1)),prediction:String(activePrediction),textColor:String(textColor),rawProbAbove:Number(posterior),regime:String(regime),reasoning,atrBps:Number(atrBps),realGapBps:Number(realGapBps),clockSeconds:Number(clockSeconds),isSystemLocked:Boolean(isEndgameLock),isPostDecay:Boolean(isPostDecay),isRugPull:Boolean(isRugPull),bb,livePnL:Number(livePnL),liveEstValue:Number(liveEstValue),kellyPct:Number(kellyPct),projections,advisor:_advisorResult,currentOdds:Number(currentOdds),aggrFlow:Number(aggrFlow),isEarlyWindow:Boolean(isEarlyWindow),consecutive:eng.consecutive,volRatio:Number(eng.volRatio),mtfAligned:Boolean(mtfAligned),mtfOpposed:Boolean(mtfOpposed),isLateLockZone:Boolean(isLateLockZone),isVeryLateLock:Boolean(isVeryLateLock),consecutiveNeeded:Number(CONSECUTIVE_NEEDED),
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
    broadcastToDiscord('LOCK',{
      dir:lock.dir,price:currentPrice,strike:targetMargin,
      gap:targetMargin>0?((currentPrice-targetMargin)/targetMargin*10000):0,
      clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`,
      regime:lastRegimeRef.current,posterior:analysis?.rawProbAbove||0,record
    });
    playAlert(lock.dir==='UP'?'lock-up':'lock-down');
  },[analysis?.lockInfo?.lockedAt]);

  // ── STAGE 1: SIGNAL broadcast when FORMING is first detected ──
  const lastFormingBroadcastRef=useRef(null);
  useEffect(()=>{
    if(!analysis?.prediction)return;
    const isForming=analysis.prediction.includes('FORMING');
    if(!isForming)return;
    const dir=analysis.prediction.includes('UP')?'UP':'DOWN';
    // One SIGNAL broadcast per direction per window — use window start time as key
    const formingKey=`${dir}-${timeState.startWindow||timeState.nextWindow}`;
    if(lastFormingBroadcastRef.current===formingKey)return;
    lastFormingBroadcastRef.current=formingKey;
    broadcastToDiscord('SIGNAL',{
      dir,price:currentPrice,strike:targetMargin,
      gap:targetMargin>0?((currentPrice-targetMargin)/targetMargin*10000):0,
      clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`,
      regime:lastRegimeRef.current,posterior:analysis?.rawProbAbove||0
    });
  },[analysis?.prediction]);

  // ── WHALE AUTO-BROADCAST ─────────────────────────────────────────────────
  // Only fires when: streak ≥4 AND net delta >$500K AND 5-min cooldown passed
  // Also checks spot/futures alignment for accuracy flag
  const lastWhaleBroadcastRef=useRef({time:0,dir:null});
  // ── FLOW INTELLIGENCE AUTO-OPEN ─────────────────────────────────────────
  // Auto-opens when whale streak ≥3 and user is in trade — so they don't miss it
  const prevStreakRef=useRef(0);
  useEffect(()=>{
    const fs=flowSignal;
    // Auto-open when: score hits STRONG (≥75) OR streak ≥4 — regardless of trade state
    // Closes automatically only if user dismisses it; stays open if still strong
    const prevScore=prevStreakRef.current;
    const justHitStrong=fs.score>=75&&prevScore<75;
    const streakJustHit=fs.streakCount>=4&&(prevStreakRef.current||0)<4;
    prevStreakRef.current=fs.score;
    if(justHitStrong||streakJustHit){
      setShowWhaleLog(true);
    }
    // Auto-close when flow returns to NOISE and user hasn't manually interacted
    if(fs.score<25&&fs.streakCount<2){
      // Don't force-close — let user dismiss manually. Just dim the button.
    }
  },[flowSignal.score,flowSignal.streakCount]);

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
        const exitLog={...pendingTradeRef.current,result:'LOSS',closingPrice:currentPrice,strikePrice:targetMargin,reversed:true};
        const newLog1=[...tradeLogRef.current,exitLog];
        saveTradeLog(newLog1);setTradeLog(newLog1);
        setAdaptiveWeights(updateWeights(adaptiveWeights,newLog1,'LOSS'));
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
      // Create trade log entry when user confirms entry
      const eng=lockedCallRef.current;
      pendingTradeRef.current={
        id:Date.now(),dir,
        posterior:eng?.lockedPosterior||analysis?.rawProbAbove||50,
        regime:lastRegimeRef.current,
        clockAtLock:timeState.minsRemaining*60+timeState.secsRemaining,
        hour:new Date().getHours(),session:getMarketSessions().dominant,windowType,
        signals:analysis?.rawSignalScores||{},result:null,
        betAmt:betAmount||0,maxPay:maxPayout||0  // captured at entry for P&L calc
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
          const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin,earlyExit:true};
          const newLog=[...tradeLogRef.current,resolvedTrade];
          saveTradeLog(newLog);setTradeLog(newLog);
          setAdaptiveWeights(updateWeights(adaptiveWeights,newLog,result));
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

  const handleChatSubmit=(e)=>{if(e.key!=='Enter'||!chatInput.trim())return;const ut=chatInput.trim();const log=[...chatLog,{role:'user',text:ut}];setChatLog(log);setChatInput('');setTimeout(()=>{let r='';const u=ut.toLowerCase();if(u.includes('/broadcast')){const g=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;const dir=analysis?.prediction.includes('UP')?'UP':analysis?.prediction.includes('DOWN')?'DOWN':'SIT OUT';broadcastToDiscord('SIGNAL',{dir,price:currentPrice,strike:targetMargin,gap:g,clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`});r='Signal broadcasted to Discord.';}else if(u.includes('why')||u.includes('explain'))r=`Posterior UP: ${Number(analysis?.rawProbAbove||0).toFixed(1)}%. Regime: ${analysis?.regime}. Signal composite output. Ask 'whale' or 'position'.`;else if(u.includes('whale'))r=whaleLog.length>0?whaleLog.slice(0,8).map(w=>{const d=new Date(w.time);return`${d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})} ${w.src} ${w.side} $${(w.usd/1000).toFixed(0)}K @ $${w.price.toFixed(0)}`;}).join('\n'):'No whale trades yet.';else if(u.includes('position'))r=positionStatus?`${positionStatus.side} @ $${positionStatus.entry.toFixed(2)} | PnL: ${positionStatus.pnlPct>0?'+':''}${positionStatus.pnlPct.toFixed(1)}% | ${positionStatus.isStopHit?'STOP HIT':'Safe'}`:'No active position.';else if(u.includes('session'))r=`Active: ${marketSessions.sessions.map(s=>`${s.flag} ${s.name}`).join(' + ')} | Dominant: ${marketSessions.dominant}`;else r=`P(UP): ${Number(analysis?.rawProbAbove||0).toFixed(1)}%. Advisor: ${analysis?.advisor?.label||'—'}. Try: why | whale | position | session | /broadcast`;setChatLog([...log,{role:'tara',text:r}]);},400);};

  const handleWindowToggle=(t)=>{if(t===windowType)return;setWindowType(String(t));setPendingStrike(null);taraAdviceRef.current='SEARCHING...';lockedCallRef.current=null;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};hasReversedRef.current=false;manuallyClosedRef.current=null;windowSignalDirRef.current=null;isManualStrikeRef.current=false;hasSetInitialMargin.current=false;fetchWindowOpenPrice(t);setUserPosition(null);setPositionEntry(null);setManualAction(null);setCurrentOffer('');setBetAmount(0);setMaxPayout(0);lastWindowRef.current='';peakOfferRef.current=0;setForceRender(p=>p+1);};

  if(!isMounted)return<div className={'min-h-screen bg-[#111312] flex items-center justify-center text-[#E8E9E4]/50 font-serif text-xl animate-pulse'}>Initializing Tara V110...</div>;

  const totalDOM=(orderBook.localBuy+orderBook.localSell)||1;
  const buyPct=(orderBook.localBuy/totalDOM)*100;
  const sellPct=(orderBook.localSell/totalDOM)*100;
  const advisor=analysis?.advisor||{label:'CONNECTING...',reason:'Fetching market data...',color:'zinc',animate:false,hasAction:false};
  const advisorColorMap={emerald:'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',rose:'text-rose-400 border-rose-500/40 bg-rose-500/10',amber:'text-amber-400 border-amber-500/40 bg-amber-500/10',zinc:'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'};
  const advisorStyle=advisorColorMap[advisor.color]||advisorColorMap.zinc;

  return(
    <div className={'min-h-screen bg-[#111312] text-[#E8E9E4] font-sans flex flex-col selection:bg-[#E8E9E4]/20'} style={{fontSize:"16px",lineHeight:"1.5",overflowX:"hidden",maxWidth:"100vw"}}>
      
      {/* ── STICKY HEADER ── */}
      <header className={'sticky top-0 z-40 bg-[#111312]/95 backdrop-blur-md border-b border-[#E8E9E4]/10 px-2 sm:px-4 py-2 shrink-0'}>
        <div className="max-w-[1600px] mx-auto flex items-center gap-1 sm:gap-2">
          
          {/* Logo — text only on mobile, badge on sm+ */}
          <div className="flex items-center gap-1 shrink-0">
            <h1 className="text-base sm:text-lg font-serif tracking-tight text-white">Tara</h1>
            <span className={'hidden sm:flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20'}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> V110
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
            <button onClick={()=>setShowGuide(true)} className={'p-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors'} title="How Tara Works">?</button>
            {/* Hidden on mobile — accessible via mobile tab nav or sm+ */}
            <FlowBtn flowSignal={flowSignal} active={showWhaleLog} onClick={()=>setShowWhaleLog(!showWhaleLog)} cls="hidden sm:flex"/>
            <button onClick={()=>setShowSettings(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-indigo-400 transition-colors'}><IC.Link className="w-3.5 h-3.5"/></button>
            <button onClick={()=>setShowAnalytics(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-indigo-400 transition-colors'} title="Analytics"><IC.BarChart className="w-3.5 h-3.5"/></button>
            <button onClick={()=>setShowHelp(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-white transition-colors'}><IC.Help className="w-3.5 h-3.5"/></button>
          </div>
        </div>
      </header>

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
                  title={strikeMode==='auto'?'Live spot price at window open · click to re-capture':'Manual override · click to restore live'}
                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer select-none font-bold transition-colors ${strikeMode==='auto'?'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30':'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-emerald-500/15 hover:text-emerald-400'}`}
                >{strikeMode==='auto'?'LIVE':'MANUAL'}</span>
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

        {/* ── MIDDLE ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0">
          
          {/* ── PREDICTION CARD ── */}
          <div className={`bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col relative ${mobileTab!=='signal'?'hidden lg:flex':''}`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-30 rounded-t-xl"></div>
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
                    const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin,forceExit:true};
                    const newLog=[...tradeLogRef.current,resolvedTrade];saveTradeLog(newLog);setTradeLog(newLog);
                    const newW=updateWeights(adaptiveWeights,newLog,result);setAdaptiveWeights(newW);setRegimeWeights(prev=>updateRegimeWeights(prev,resolvedTrade,result));pendingTradeRef.current=null;
                  }
                }
                setUserPosition(null);setPositionEntry(null);taraAdviceRef.current='CLOSED';setForceRender(p=>p+1);
              }} className={'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-colors'}>
                <IC.Alert className="w-4 h-4"/>Force Exit
              </button>
            </div>

            <PredictionContent strikeConfirmed={strikeConfirmed} strikeMode={strikeMode} targetMargin={targetMargin} isLoading={isLoading} analysis={analysis} currentPrice={currentPrice} qualityGate={qualityGate} userPosition={userPosition} timeState={timeState} streakData={streakData} handleManualSync={handleManualSync} getMarketSessions={getMarketSessions}/>
          </div>
      </div>

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
            <div className={'bg-[#111312] p-2.5 flex justify-between items-center border-b border-[#E8E9E4]/10'}><span className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><IC.Msg className="w-3.5 h-3.5 text-indigo-400"/>Chat with Tara V110</span><button onClick={()=>setIsChatOpen(false)} className="opacity-50 hover:opacity-100"><IC.X className="w-4 h-4"/></button></div>
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
                  const csv=['id,dir,posterior,regime,clockAtLock,hour,session,windowType,gap,momentum,structure,flow,technical,regime_s,result'].concat(
                    tradeLog.map(t=>`${t.id},${t.dir},${t.posterior?.toFixed(1)},${t.regime},${t.clockAtLock},${t.hour},${t.session},${t.windowType},${t.signals?.gap?.toFixed(2)||0},${t.signals?.momentum?.toFixed(2)||0},${t.signals?.structure?.toFixed(2)||0},${t.signals?.flow?.toFixed(2)||0},${t.signals?.technical?.toFixed(2)||0},${t.signals?.regime?.toFixed(2)||0},${t.result||'PENDING'}`)
                  ).join('\n');
                  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='tara_training_data.csv';a.click();
                }} className={'px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-colors'}>Export CSV</button>
                <button onClick={()=>{if(confirm('Reset all training data and weights? Cannot undo.')){setAdaptiveWeights({...DEFAULT_WEIGHTS});setTradeLog([]);saveWeights({...DEFAULT_WEIGHTS});saveTradeLog([]);pendingTradeRef.current=null;}}} className={'px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-colors'}>Reset</button>
                <button onClick={()=>{setShowAnalytics(false);setSelectedTradeId(null);}} className={'text-[#E8E9E4]/50 hover:text-white'}><IC.X className="w-5 h-5"/></button>
              </div>
            </div>
            <div className="p-4 space-y-5">

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
                    setAdaptiveWeights(updateWeights(adaptiveWeights,newLog,newResult));
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
                            return(
                              <div key={i} className={`flex items-center gap-2 text-[10px] px-2 py-1 rounded border ${t.result==='WIN'?'bg-emerald-500/5 border-emerald-500/15':'bg-rose-500/5 border-rose-500/15'}`}>
                                <span className={'font-mono text-[#E8E9E4]/30 shrink-0 w-14'}>{timeStr}</span>
                                <span className={`font-bold w-8 shrink-0 ${t.dir==='UP'?'text-emerald-400':'text-rose-400'}`}>{t.dir}</span>
                                <span className={'text-[#E8E9E4]/40 shrink-0'}>{t.windowType||'15m'}</span>
                                <span className={'text-[#E8E9E4]/30 flex-1 truncate'}>{t.regime||'—'}</span>
                                <span className={'text-[#E8E9E4]/25 shrink-0'}>{t.session||'—'}</span>
                                <span className={`font-bold shrink-0 ${t.result==='WIN'?'text-emerald-400':'text-rose-400'}`}>{t.result}</span>
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
                  <span className="text-indigo-400 text-xl font-bold">?</span> How Tara V110 Works
                </h2>
                <p className={'text-xs text-[#E8E9E4]/40 mt-0.5'}>Complete guide — predictions, learning, advisor, and best practices</p>
              </div>
              <button onClick={()=>setShowGuide(false)} className={'text-[#E8E9E4]/50 hover:text-white p-1'}><IC.X className="w-5 h-5"/></button>
            </div>
            <div className={'p-4 sm:p-6 space-y-6 text-sm text-[#E8E9E4]/80'}>

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
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}>3 consecutive readings (15m) or 2 consecutive (5m) all above 68% threshold. Tara has committed for the window. She will NOT change this prediction — the posterior can drop to 55% and she stays locked UP. The only releases are a 55+ bps adverse gap or catastrophic rug pull. This is the <strong className="text-white">only state to enter on.</strong></p>
                  </div>
                  <div className={'bg-[#111312] rounded-lg p-3 border border-rose-500/20'}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-rose-400 font-bold text-xs">DOWN — LOCKED 🔒</span><span className={'text-[10px] text-[#E8E9E4]/30 uppercase'}>Entry signal — act now</span></div>
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}>Same as UP — LOCKED but bearish. Posterior consistently below 32% for N consecutive samples. If you missed the entry window and it's late, the advisor will say WINDOW CLOSING — don't chase it.</p>
                  </div>
                  <div className={'bg-[#111312] rounded-lg p-3 border border-zinc-500/15'}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-zinc-400 font-bold text-xs">NO CALL — WINDOW CLOSED — LOCK RELEASED</span><span className="text-[10px] text-rose-400 uppercase">Sit out</span></div>
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}><strong className="text-white">NO CALL:</strong> Never reached threshold before endgame. Skip this round.<br/><strong className="text-white">WINDOW CLOSED:</strong> Last 90s (15m) or 45s (5m) with no lock. Too late to enter safely.<br/><strong className="text-white">LOCK RELEASED:</strong> Price moved 55+ bps wrong direction, Tara released. Respect it immediately.</p>
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
              <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2"><IC.Info className="w-5 h-5 text-indigo-400"/>Tara V110 — What's New</h2>
              <button onClick={()=>setShowHelp(false)} className={'text-[#E8E9E4]/50 hover:text-white'}><IC.X className="w-5 h-5"/></button>
            </div>
            <div className={'p-4 sm:p-6 space-y-5 text-xs sm:text-sm text-[#E8E9E4]/80'}>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">V110 Prediction Engine</h3><p className="leading-relaxed">Predictions now use a <strong>6-signal weighted composite</strong> instead of simple addition: (1) Gap Gravity, (2) Momentum Composite with alignment detection, (3) Candle Structure — consecutive candles + volume confirmation, (4) Flow Imbalance, (5) Technical Composite — RSI divergence, VWAP, Bollinger Bands, price channel, (6) Funding Momentum. Signals are weighted by reliability, preventing single-factor dominance.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">Smart Advisor (In-Trade)</h3><p className="leading-relaxed">The advisor now runs a <strong>10-state priority machine</strong> with time-remaining awareness. Every message shows how many minutes are left and specific price context. It distinguishes between "cut now" (late window, losing) and "hold" (time to recover). Profit recommendations include specific exit triggers relative to peak offer.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">Canvas Chart (No CDN)</h3><p className="leading-relaxed">Chart is built entirely in canvas — no external library needed. Always renders. Dual API fallback: Coinbase first, Binance if blocked. Supports full EMA/BB overlays, strike line, live price sync, crosshair hover, and volume bars. Resize-aware.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">New Signals</h3><ul className="list-disc pl-4 space-y-1"><li><strong>Candle Structure:</strong> 3+ consecutive candles in same direction = momentum confirmation. Volume surge compounds the signal.</li><li><strong>Price Channel:</strong> Near top of 20-candle range with upward drift = resistance signal, and vice versa.</li><li><strong>RSI Divergence:</strong> Price moving up but RSI flat = hidden weakness. Price down but RSI flat = hidden strength.</li><li><strong>Funding Momentum:</strong> Direction of funding rate change, not just the level.</li></ul></section>
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
    </main>
    </div>
  );
}

export default function App(){return<ErrorBoundary><TaraApp/></ErrorBoundary>;}import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// ═══════════════════════════════════════
// ICONS
// ═══════════════════════════════════════
const _NS='http:'+'/'+'/www.w3.org/2000/svg';
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
const DEFAULT_WEIGHTS={gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13};

// Per-regime weight sets — each regime gets its own gradient descent
// Initialized from global defaults, diverge over time based on what works in each regime
const DEFAULT_REGIME_WEIGHTS={
  'SHORT SQUEEZE': {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13},
  'RANGE-CHOP':    {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13},
  'HIGH VOL CHOP': {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13},
  'TRENDING DOWN': {gap:52.69,momentum:49.99,structure:21.54,flow:55.00,technical:26.71,regime:41.13},
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
const WEIGHT_BOUNDS={gap:[5,65],momentum:[5,58],structure:[2,38],flow:[2,55],technical:[5,48],regime:[2,45]}; // expanded — flow/gap were hitting ceilings // bounds expanded so flow/regime can keep growing
const LEARNING_RATE=0.8; // how aggressively to update weights per trade

// Load weights from localStorage or use defaults
const loadWeights=()=>{try{const s=localStorage.getItem('taraWeightsV110');if(s){const w=JSON.parse(s);if(w&&typeof w.gap==='number')return w;}return{...DEFAULT_WEIGHTS};}catch(e){return{...DEFAULT_WEIGHTS};}};
const saveWeights=(w)=>{try{localStorage.setItem('taraWeightsV110',JSON.stringify(w));}catch(e){}};

// Load trade log
// removed
// removed
// Best hours: 4 (100%) and 5 (100%)
const SEED_TRADES=[
  // 268 trades (15m) · 163W-105L=60.8% · SS 68% · TD 87.5% · DOWN gate active · V110
  {id:1776403212237,dir:'UP',posterior:71.0,regime:'RANGE-CHOP',clockAtLock:587,hour:1,session:'ASIA',windowType:'15m',signals:{gap:1.83,momentum:0.0,structure:0.0,flow:20.23,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776403812231,dir:'UP',posterior:82.0,regime:'RANGE-CHOP',clockAtLock:887,hour:1,session:'ASIA',windowType:'15m',signals:{gap:35.2,momentum:-5.39,structure:0.0,flow:-17.15,technical:-8.0,regime:0.0},result:'LOSS'},
  {id:1776407423234,dir:'DOWN',posterior:27.6,regime:'RANGE-CHOP',clockAtLock:876,hour:2,session:'ASIA',windowType:'15m',signals:{gap:-0.28,momentum:-2.75,structure:0.0,flow:-20.59,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776408300285,dir:'UP',posterior:94.1,regime:'SHORT SQUEEZE',clockAtLock:899,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.59,momentum:-0.95,structure:9.0,flow:12.46,technical:10.0,regime:15.33},result:'WIN'},
  {id:1776409504121,dir:'UP',posterior:99.0,regime:'RANGE-CHOP',clockAtLock:595,hour:3,session:'EU',windowType:'15m',signals:{gap:35.03,momentum:6.76,structure:15.0,flow:9.29,technical:3.0,regime:0.0},result:'WIN'},
  {id:1776410109313,dir:'UP',posterior:73.1,regime:'RANGE-CHOP',clockAtLock:890,hour:3,session:'EU',windowType:'15m',signals:{gap:1.27,momentum:-3.68,structure:15.0,flow:8.73,technical:3.0,regime:0.0},result:'LOSS'},
  {id:1776410445361,dir:'UP',posterior:82.9,regime:'SHORT SQUEEZE',clockAtLock:554,hour:3,session:'EU',windowType:'15m',signals:{gap:-0.42,momentum:3.89,structure:0.0,flow:20.65,technical:-5.0,regime:15.56},result:'LOSS'},
  {id:1776411059805,dir:'UP',posterior:79.9,regime:'SHORT SQUEEZE',clockAtLock:840,hour:3,session:'EU',windowType:'15m',signals:{gap:-0.44,momentum:1.15,structure:0.0,flow:20.41,technical:-5.0,regime:15.38},result:'WIN'},
  {id:1776411899818,dir:'UP',posterior:94.8,regime:'SHORT SQUEEZE',clockAtLock:900,hour:3,session:'EU',windowType:'15m',signals:{gap:0.46,momentum:7.52,structure:0.0,flow:20.64,technical:3.0,regime:15.55},result:'WIN'},
  {id:1776412799704,dir:'UP',posterior:97.7,regime:'SHORT SQUEEZE',clockAtLock:900,hour:3,session:'EU',windowType:'15m',signals:{gap:0.44,momentum:4.45,structure:0.0,flow:20.95,technical:3.0,regime:15.79},result:'WIN'},
  {id:1776413746445,dir:'UP',posterior:84.4,regime:'SHORT SQUEEZE',clockAtLock:853,hour:4,session:'EU',windowType:'15m',signals:{gap:-0.47,momentum:-3.82,structure:0.0,flow:6.47,technical:18.0,regime:16.06},result:'WIN'},
  {id:1776414639749,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:861,hour:4,session:'EU',windowType:'15m',signals:{gap:35.42,momentum:9.58,structure:0.0,flow:21.39,technical:-5.0,regime:16.26},result:'WIN'},
  {id:1776415548790,dir:'UP',posterior:97.4,regime:'SHORT SQUEEZE',clockAtLock:852,hour:4,session:'EU',windowType:'15m',signals:{gap:0.32,momentum:10.36,structure:0.0,flow:21.58,technical:-5.0,regime:16.4},result:'WIN'},
  {id:1776416404562,dir:'UP',posterior:99.4,regime:'SHORT SQUEEZE',clockAtLock:895,hour:5,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:1.86,structure:15.26,flow:21.89,technical:-5.0,regime:16.63},result:'WIN'},
  {id:1776417299867,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:900,hour:5,session:'EU',windowType:'15m',signals:{gap:1.41,momentum:17.19,structure:15.46,flow:22.17,technical:-5.0,regime:16.85},result:'WIN'},
  {id:1776418271648,dir:'DOWN',posterior:2.2,regime:'TRENDING DOWN',clockAtLock:828,hour:5,session:'EU',windowType:'15m',signals:{gap:-35.76,momentum:-18.66,structure:0.0,flow:-13.84,technical:18.0,regime:0.0},result:'WIN'},
  {id:1776419102505,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:900,hour:5,session:'EU',windowType:'15m',signals:{gap:0.5,momentum:12.0,structure:0.0,flow:22.0,technical:-5.0,regime:16.83},result:'WIN'},
  {id:1776422196542,dir:'DOWN',posterior:6.3,regime:'HIGH VOL CHOP',clockAtLock:503,hour:6,session:'EU',windowType:'15m',signals:{gap:-9.56,momentum:-14.85,structure:0.0,flow:-21.62,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776422749470,dir:'DOWN',posterior:16.6,regime:'HIGH VOL CHOP',clockAtLock:850,hour:6,session:'EU',windowType:'15m',signals:{gap:0.03,momentum:-0.3,structure:-12.0,flow:-14.9,technical:-8.0,regime:0.0},result:'LOSS'},
  {id:1776423249474,dir:'UP',posterior:98.3,regime:'SHORT SQUEEZE',clockAtLock:350,hour:6,session:'EU',windowType:'15m',signals:{gap:6.88,momentum:8.61,structure:0.0,flow:22.37,technical:-8.0,regime:16.83},result:'WIN'},
  {id:1776424302369,dir:'DOWN',posterior:28.6,regime:'HIGH VOL CHOP',clockAtLock:198,hour:7,session:'EU',windowType:'15m',signals:{gap:7.89,momentum:0.0,structure:0.0,flow:-22.42,technical:-8.0,regime:0.0},result:'LOSS'},
  {id:1776424641815,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:758,hour:7,session:'EU',windowType:'15m',signals:{gap:0.76,momentum:5.36,structure:9.0,flow:22.45,technical:0.0,regime:17.04},result:'WIN'},
  {id:1776425400123,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:900,hour:7,session:'EU',windowType:'15m',signals:{gap:11.16,momentum:0.7,structure:9.0,flow:22.77,technical:10.0,regime:17.29},result:'WIN'},
  {id:1776425672532,dir:'UP',posterior:99.7,regime:'SHORT SQUEEZE',clockAtLock:627,hour:7,session:'EU',windowType:'15m',signals:{gap:27.17,momentum:7.84,structure:12.0,flow:23.03,technical:-8.0,regime:17.48},result:'LOSS'},
  {id:1776426464619,dir:'DOWN',posterior:28.7,regime:'HIGH VOL CHOP',clockAtLock:735,hour:7,session:'EU',windowType:'15m',signals:{gap:0.35,momentum:-2.98,structure:0.0,flow:-21.78,technical:2.0,regime:0.0},result:'LOSS'},
  {id:1776427224628,dir:'UP',posterior:91.7,regime:'SHORT SQUEEZE',clockAtLock:875,hour:8,session:'EU',windowType:'15m',signals:{gap:0.51,momentum:10.14,structure:0.0,flow:22.56,technical:-8.0,regime:17.33},result:'WIN'},
  {id:1776441416802,dir:'UP',posterior:94.7,regime:'SHORT SQUEEZE',clockAtLock:183,hour:11,session:'US',windowType:'15m',signals:{gap:36.27,momentum:-0.04,structure:0.0,flow:22.82,technical:-13.0,regime:17.53},result:'WIN'},
  {id:1776441622489,dir:'UP',posterior:70.6,regime:'SHORT SQUEEZE',clockAtLock:877,hour:12,session:'US',windowType:'15m',signals:{gap:-0.07,momentum:-1.48,structure:0.0,flow:20.12,technical:-5.0,regime:17.67},result:'WIN'},
  {id:1776442523500,dir:'DOWN',posterior:8.7,regime:'HIGH VOL CHOP',clockAtLock:876,hour:12,session:'US',windowType:'15m',signals:{gap:-0.34,momentum:-11.62,structure:8.0,flow:-20.23,technical:2.0,regime:0.0},result:'LOSS'},
  {id:1776443633466,dir:'DOWN',posterior:6.9,regime:'HIGH VOL CHOP',clockAtLock:666,hour:12,session:'US',windowType:'15m',signals:{gap:-2.0,momentum:-15.62,structure:0.0,flow:-12.66,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776444322713,dir:'DOWN',posterior:7.2,regime:'HIGH VOL CHOP',clockAtLock:877,hour:12,session:'US',windowType:'15m',signals:{gap:-0.42,momentum:-6.01,structure:0.0,flow:-15.95,technical:-5.0,regime:0.0},result:'WIN'},
  {id:1776445542459,dir:'DOWN',posterior:7.4,regime:'HIGH VOL CHOP',clockAtLock:558,hour:13,session:'US',windowType:'15m',signals:{gap:-0.46,momentum:-5.09,structure:-9.0,flow:-13.96,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776446147946,dir:'UP',posterior:75.8,regime:'SHORT SQUEEZE',clockAtLock:852,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:-3.43,structure:-9.0,flow:23.82,technical:0.0,regime:17.8},result:'LOSS'},
  {id:1776447019014,dir:'UP',posterior:92.7,regime:'SHORT SQUEEZE',clockAtLock:881,hour:13,session:'US',windowType:'15m',signals:{gap:0.99,momentum:13.15,structure:-12.0,flow:23.64,technical:0.0,regime:17.67},result:'WIN'},
  {id:1776448674472,dir:'DOWN',posterior:6.4,regime:'HIGH VOL CHOP',clockAtLock:126,hour:13,session:'US',windowType:'15m',signals:{gap:1.86,momentum:-15.39,structure:0.0,flow:-18.82,technical:2.0,regime:0.0},result:'LOSS'},
  {id:1776448864028,dir:'DOWN',posterior:8.9,regime:'HIGH VOL CHOP',clockAtLock:836,hour:14,session:'US',windowType:'15m',signals:{gap:-0.61,momentum:-9.88,structure:0.0,flow:-12.94,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776452033072,dir:'DOWN',posterior:16.0,regime:'HIGH VOL CHOP',clockAtLock:367,hour:14,session:'US',windowType:'15m',signals:{gap:-26.13,momentum:-9.65,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776452812288,dir:'DOWN',posterior:7.9,regime:'HIGH VOL CHOP',clockAtLock:487,hour:15,session:'US',windowType:'15m',signals:{gap:-3.13,momentum:-18.94,structure:0.0,flow:0.0,technical:-3.0,regime:0.0},result:'LOSS'},
  {id:1776460757203,dir:'DOWN',posterior:8.8,regime:'RANGE-CHOP',clockAtLock:642,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:-21.82,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776461919967,dir:'DOWN',posterior:7.1,regime:'RANGE-CHOP',clockAtLock:380,hour:17,session:'US',windowType:'15m',signals:{gap:-4.14,momentum:-2.21,structure:0.0,flow:-23.2,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776463239452,dir:'DOWN',posterior:6.4,regime:'RANGE-CHOP',clockAtLock:860,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:-0.57,momentum:-8.75,structure:0.0,flow:-22.84,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776464102445,dir:'DOWN',posterior:7.7,regime:'TRENDING DOWN',clockAtLock:897,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:-0.6,momentum:-12.76,structure:0.0,flow:-14.41,technical:2.0,regime:0.0},result:'WIN'},
  {id:1776468632061,dir:'UP',posterior:94.0,regime:'SHORT SQUEEZE',clockAtLock:868,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776469543660,dir:'DOWN',posterior:8.3,regime:'RANGE-CHOP',clockAtLock:857,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776470307745,dir:'UP',posterior:91.5,regime:'SHORT SQUEEZE',clockAtLock:93,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776470411063,dir:'DOWN',posterior:16.3,regime:'TRENDING DOWN',clockAtLock:889,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776471435490,dir:'UP',posterior:90.1,regime:'SHORT SQUEEZE',clockAtLock:765,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776473754856,dir:'DOWN',posterior:7.2,regime:'SHORT SQUEEZE',clockAtLock:245,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776474078453,dir:'DOWN',posterior:6.1,regime:'RANGE-CHOP',clockAtLock:822,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776474925320,dir:'UP',posterior:92.3,regime:'SHORT SQUEEZE',clockAtLock:875,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776475830221,dir:'DOWN',posterior:8.0,regime:'RANGE-CHOP',clockAtLock:870,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776476723095,dir:'DOWN',posterior:8.9,regime:'TRENDING DOWN',clockAtLock:877,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776477614063,dir:'DOWN',posterior:8.8,regime:'RANGE-CHOP',clockAtLock:886,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776478663077,dir:'UP',posterior:86.5,regime:'RANGE-CHOP',clockAtLock:737,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776479465721,dir:'DOWN',posterior:8.0,regime:'TRENDING DOWN',clockAtLock:835,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776480331504,dir:'DOWN',posterior:8.2,regime:'RANGE-CHOP',clockAtLock:869,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776481238592,dir:'UP',posterior:87.4,regime:'RANGE-CHOP',clockAtLock:862,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776482921288,dir:'DOWN',posterior:7.8,regime:'RANGE-CHOP',clockAtLock:79,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776483034127,dir:'DOWN',posterior:7.8,regime:'RANGE-CHOP',clockAtLock:866,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776483928752,dir:'DOWN',posterior:6.8,regime:'RANGE-CHOP',clockAtLock:872,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776484836942,dir:'DOWN',posterior:6.2,regime:'RANGE-CHOP',clockAtLock:863,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776485800712,dir:'DOWN',posterior:9.0,regime:'RANGE-CHOP',clockAtLock:800,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776487006113,dir:'UP',posterior:88.0,regime:'RANGE-CHOP',clockAtLock:494,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776488505617,dir:'UP',posterior:87.0,regime:'RANGE-CHOP',clockAtLock:794,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776491546638,dir:'DOWN',posterior:8.0,regime:'RANGE-CHOP',clockAtLock:453,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776492046109,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:854,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776492939519,dir:'DOWN',posterior:7.5,regime:'RANGE-CHOP',clockAtLock:860,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776493868609,dir:'DOWN',posterior:8.6,regime:'RANGE-CHOP',clockAtLock:831,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776494723187,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:877,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776496514313,dir:'DOWN',posterior:7.0,regime:'RANGE-CHOP',clockAtLock:886,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776497424081,dir:'DOWN',posterior:7.3,regime:'RANGE-CHOP',clockAtLock:876,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776498380672,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:819,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776499643408,dir:'UP',posterior:48.8,regime:'RANGE-CHOP',clockAtLock:456,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776499679323,dir:'DOWN',posterior:7.2,regime:'RANGE-CHOP',clockAtLock:420,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776500162466,dir:'DOWN',posterior:6.3,regime:'TRENDING DOWN',clockAtLock:837,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776501024034,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:876,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776501925556,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:874,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776502873527,dir:'DOWN',posterior:8.9,regime:'TRENDING DOWN',clockAtLock:826,hour:5,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776527703240,dir:'UP',posterior:87.3,regime:'SHORT SQUEEZE',clockAtLock:297,hour:11,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776528066026,dir:'DOWN',posterior:6.4,regime:'TRENDING DOWN',clockAtLock:834,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776529693677,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:106,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776529846994,dir:'UP',posterior:70.9,regime:'RANGE-CHOP',clockAtLock:853,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776530945797,dir:'DOWN',posterior:7.6,regime:'RANGE-CHOP',clockAtLock:654,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776531631012,dir:'DOWN',posterior:7.8,regime:'TRENDING DOWN',clockAtLock:869,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776532525158,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:875,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776533419341,dir:'DOWN',posterior:6.7,regime:'RANGE-CHOP',clockAtLock:880,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776534333979,dir:'DOWN',posterior:8.3,regime:'RANGE-CHOP',clockAtLock:866,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776535306569,dir:'DOWN',posterior:8.9,regime:'TRENDING DOWN',clockAtLock:793,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776536579778,dir:'DOWN',posterior:8.9,regime:'RANGE-CHOP',clockAtLock:420,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776539467826,dir:'UP',posterior:71.4,regime:'RANGE-CHOP',clockAtLock:232,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776539734398,dir:'UP',posterior:71.9,regime:'RANGE-CHOP',clockAtLock:865,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776541546226,dir:'DOWN',posterior:7.9,regime:'RANGE-CHOP',clockAtLock:854,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776542431078,dir:'UP',posterior:72.4,regime:'SHORT SQUEEZE',clockAtLock:869,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776542538165,dir:'DOWN',posterior:8.6,regime:'RANGE-CHOP',clockAtLock:762,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776543439980,dir:'DOWN',posterior:7.7,regime:'RANGE-CHOP',clockAtLock:760,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776543528194,dir:'UP',posterior:7.7,regime:'SHORT SQUEEZE',clockAtLock:672,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776544214709,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:885,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776579801306,dir:'DOWN',posterior:8.4,regime:'SHORT SQUEEZE',clockAtLock:399,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776580464051,dir:'UP',posterior:73.7,regime:'SHORT SQUEEZE',clockAtLock:636,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776581152679,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:847,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776582037665,dir:'UP',posterior:72.7,regime:'SHORT SQUEEZE',clockAtLock:862,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776583130083,dir:'DOWN',posterior:6.2,regime:'RANGE-CHOP',clockAtLock:670,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776583975044,dir:'DOWN',posterior:8.0,regime:'RANGE-CHOP',clockAtLock:725,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776584788013,dir:'UP',posterior:72.8,regime:'RANGE-CHOP',clockAtLock:812,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776629486095,dir:'DOWN',posterior:70.7,regime:'RANGE-CHOP',clockAtLock:214,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776629798992,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:801,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776630619898,dir:'DOWN',posterior:6.9,regime:'RANGE-CHOP',clockAtLock:880,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776631532649,dir:'UP',posterior:73.1,regime:'RANGE-CHOP',clockAtLock:867,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776632491747,dir:'UP',posterior:73.1,regime:'SHORT SQUEEZE',clockAtLock:808,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776633334163,dir:'DOWN',posterior:6.5,regime:'RANGE-CHOP',clockAtLock:866,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776655252536,dir:'UP',posterior:86.8,regime:'SHORT SQUEEZE',clockAtLock:547,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776656007171,dir:'UP',posterior:76.2,regime:'RANGE-CHOP',clockAtLock:692,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776656724672,dir:'UP',posterior:76.7,regime:'SHORT SQUEEZE',clockAtLock:875,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776657938757,dir:'DOWN',posterior:6.0,regime:'TRENDING DOWN',clockAtLock:561,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776658546067,dir:'DOWN',posterior:6.6,regime:'RANGE-CHOP',clockAtLock:854,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776659446065,dir:'DOWN',posterior:7.5,regime:'RANGE-CHOP',clockAtLock:854,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776665958684,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:642,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776666728537,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:771,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776667552798,dir:'DOWN',posterior:7.9,regime:'RANGE-CHOP',clockAtLock:847,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776668460542,dir:'UP',posterior:67.7,regime:'RANGE-CHOP',clockAtLock:840,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776669369715,dir:'DOWN',posterior:7.7,regime:'RANGE-CHOP',clockAtLock:831,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776670284972,dir:'DOWN',posterior:31.4,regime:'RANGE-CHOP',clockAtLock:815,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776671211750,dir:'DOWN',posterior:7.3,regime:'SHORT SQUEEZE',clockAtLock:789,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776672080674,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:819,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776672935569,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:864,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776673905975,dir:'UP',posterior:68.5,regime:'SHORT SQUEEZE',clockAtLock:794,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776706916492,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:630,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776707129284,dir:'DOWN',posterior:8.4,regime:'HIGH VOL CHOP',clockAtLock:855,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776709831679,dir:'DOWN',posterior:6.2,regime:'HIGH VOL CHOP',clockAtLock:869,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776710716457,dir:'UP',posterior:78.5,regime:'SHORT SQUEEZE',clockAtLock:884,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776711654828,dir:'UP',posterior:77.3,regime:'SHORT SQUEEZE',clockAtLock:845,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776712530621,dir:'DOWN',posterior:6.4,regime:'HIGH VOL CHOP',clockAtLock:870,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776713442075,dir:'DOWN',posterior:8.9,regime:'HIGH VOL CHOP',clockAtLock:858,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776714346358,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:854,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776715264080,dir:'DOWN',posterior:6.0,regime:'RANGE-CHOP',clockAtLock:836,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776716132991,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:867,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776717021935,dir:'DOWN',posterior:6.4,regime:'RANGE-CHOP',clockAtLock:878,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776717915688,dir:'DOWN',posterior:6.9,regime:'RANGE-CHOP',clockAtLock:885,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776718824483,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:875,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776719923236,dir:'UP',posterior:7.9,regime:'TRENDING DOWN',clockAtLock:677,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776720664046,dir:'DOWN',posterior:6.9,regime:'TRENDING DOWN',clockAtLock:836,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776721672456,dir:'DOWN',posterior:8.5,regime:'RANGE-CHOP',clockAtLock:728,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776739718264,dir:'DOWN',posterior:8.3,regime:'RANGE-CHOP',clockAtLock:682,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776740422182,dir:'DOWN',posterior:7.2,regime:'RANGE-CHOP',clockAtLock:878,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776741357491,dir:'DOWN',posterior:7.2,regime:'RANGE-CHOP',clockAtLock:843,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776742403016,dir:'DOWN',posterior:6.8,regime:'RANGE-CHOP',clockAtLock:697,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776743119467,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:881,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776744034938,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:865,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776744937240,dir:'DOWN',posterior:6.2,regime:'RANGE-CHOP',clockAtLock:863,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776745823975,dir:'DOWN',posterior:7.7,regime:'RANGE-CHOP',clockAtLock:876,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776746727488,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:873,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776747631426,dir:'UP',posterior:74.3,regime:'SHORT SQUEEZE',clockAtLock:869,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776748555699,dir:'DOWN',posterior:6.1,regime:'RANGE-CHOP',clockAtLock:845,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776748636631,dir:'DOWN',posterior:6.7,regime:'RANGE-CHOP',clockAtLock:763,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776749424129,dir:'DOWN',posterior:8.8,regime:'RANGE-CHOP',clockAtLock:876,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776750330449,dir:'DOWN',posterior:8.4,regime:'RANGE-CHOP',clockAtLock:869,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776751307104,dir:'DOWN',posterior:7.7,regime:'RANGE-CHOP',clockAtLock:793,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776752168512,dir:'UP',posterior:72.4,regime:'RANGE-CHOP',clockAtLock:832,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776753042111,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:858,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776754165301,dir:'UP',posterior:73.4,regime:'SHORT SQUEEZE',clockAtLock:635,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776754830274,dir:'DOWN',posterior:6.0,regime:'TRENDING DOWN',clockAtLock:870,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776755728173,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:872,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776756633505,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:867,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776757547585,dir:'DOWN',posterior:8.6,regime:'RANGE-CHOP',clockAtLock:853,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776758428829,dir:'UP',posterior:75.5,regime:'SHORT SQUEEZE',clockAtLock:872,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776759333181,dir:'DOWN',posterior:31.8,regime:'RANGE-CHOP',clockAtLock:867,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776760246540,dir:'DOWN',posterior:30.6,regime:'RANGE-CHOP',clockAtLock:854,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776761211456,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:788,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776762019804,dir:'UP',posterior:75.1,regime:'RANGE-CHOP',clockAtLock:880,hour:5,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776762930253,dir:'UP',posterior:75.2,regime:'SHORT SQUEEZE',clockAtLock:869,hour:5,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776763857323,dir:'DOWN',posterior:8.7,regime:'SHORT SQUEEZE',clockAtLock:842,hour:5,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776793971910,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:428,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776794437610,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:863,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776795330051,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:870,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776796215730,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:884,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776797162666,dir:'DOWN',posterior:7.6,regime:'SHORT SQUEEZE',clockAtLock:837,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776798024282,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:876,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776798947885,dir:'UP',posterior:88.5,regime:'HIGH VOL CHOP',clockAtLock:852,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776799826365,dir:'DOWN',posterior:8.7,regime:'HIGH VOL CHOP',clockAtLock:874,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776800735953,dir:'UP',posterior:87.1,regime:'SHORT SQUEEZE',clockAtLock:864,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776801620045,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:880,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776803656794,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:643,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776805775678,dir:'DOWN',posterior:8.6,regime:'HIGH VOL CHOP',clockAtLock:324,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776808310202,dir:'DOWN',posterior:8.0,regime:'HIGH VOL CHOP',clockAtLock:490,hour:17,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776809053540,dir:'DOWN',posterior:7.5,regime:'HIGH VOL CHOP',clockAtLock:646,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776809738802,dir:'DOWN',posterior:8.5,regime:'HIGH VOL CHOP',clockAtLock:861,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776810629265,dir:'UP',posterior:89.1,regime:'HIGH VOL CHOP',clockAtLock:870,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776811544897,dir:'DOWN',posterior:6.4,regime:'HIGH VOL CHOP',clockAtLock:855,hour:18,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776812421573,dir:'DOWN',posterior:8.0,regime:'HIGH VOL CHOP',clockAtLock:878,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776812669613,dir:'UP',posterior:89.0,regime:'SHORT SQUEEZE',clockAtLock:630,hour:19,session:'OFF-HOURS',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776817255207,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:545,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776818015399,dir:'UP',posterior:51.7,regime:'RANGE-CHOP',clockAtLock:685,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776819717365,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:782,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776820540264,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:859,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776821442251,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:857,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776822321971,dir:'DOWN',posterior:8.0,regime:'RANGE-CHOP',clockAtLock:878,hour:21,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776823241483,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:858,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776830055338,dir:'UP',posterior:88.1,regime:'RANGE-CHOP',clockAtLock:344,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776830482304,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:818,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776831345036,dir:'DOWN',posterior:6.2,regime:'RANGE-CHOP',clockAtLock:855,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776832239920,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:860,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776833117685,dir:'DOWN',posterior:9.0,regime:'HIGH VOL CHOP',clockAtLock:883,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776834230092,dir:'DOWN',posterior:6.0,regime:'RANGE-CHOP',clockAtLock:670,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776835568287,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:232,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776835845995,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:854,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776836722893,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:878,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776837624794,dir:'DOWN',posterior:8.8,regime:'HIGH VOL CHOP',clockAtLock:876,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776838527897,dir:'DOWN',posterior:8.1,regime:'SHORT SQUEEZE',clockAtLock:873,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776839461939,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:838,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776841020326,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:180,hour:2,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776841233662,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:867,hour:3,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776844834897,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:854,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776845214521,dir:'UP',posterior:72.1,regime:'RANGE-CHOP',clockAtLock:871,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776846638505,dir:'DOWN',posterior:7.4,regime:'RANGE-CHOP',clockAtLock:863,hour:4,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776872563359,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:372,hour:11,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776873655731,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:874,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776874591342,dir:'DOWN',posterior:8.3,regime:'HIGH VOL CHOP',clockAtLock:869,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776875488238,dir:'DOWN',posterior:8.5,regime:'HIGH VOL CHOP',clockAtLock:878,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776876331166,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:852,hour:12,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776877322803,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:875,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776878288075,dir:'DOWN',posterior:8.4,regime:'HIGH VOL CHOP',clockAtLock:864,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776879155613,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:869,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776880022710,dir:'DOWN',posterior:7.9,regime:'HIGH VOL CHOP',clockAtLock:882,hour:13,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776881481982,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:857,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776881746892,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:871,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776882636853,dir:'DOWN',posterior:8.0,regime:'RANGE-CHOP',clockAtLock:867,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776883539183,dir:'DOWN',posterior:7.8,regime:'RANGE-CHOP',clockAtLock:875,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776884441480,dir:'DOWN',posterior:8.2,regime:'RANGE-CHOP',clockAtLock:878,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776885344433,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:862,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776886273615,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:874,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776887333863,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:856,hour:15,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776888111515,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:870,hour:16,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776902442088,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:857,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776903490478,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:866,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776904252931,dir:'UP',posterior:73.4,regime:'RANGE-CHOP',clockAtLock:872,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776905206060,dir:'DOWN',posterior:7.8,regime:'RANGE-CHOP',clockAtLock:868,hour:20,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776912209685,dir:'DOWN',posterior:8.5,regime:'HIGH VOL CHOP',clockAtLock:396,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776912349727,dir:'DOWN',posterior:8.3,regime:'HIGH VOL CHOP',clockAtLock:856,hour:22,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776913383966,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:869,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776914151082,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:852,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776915023460,dir:'UP',posterior:89.2,regime:'HIGH VOL CHOP',clockAtLock:870,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776915916328,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:862,hour:23,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776916830499,dir:'DOWN',posterior:7.6,regime:'RANGE-CHOP',clockAtLock:871,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776917725101,dir:'UP',posterior:89.2,regime:'RANGE-CHOP',clockAtLock:858,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776918625268,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:866,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776919528719,dir:'DOWN',posterior:7.4,regime:'RANGE-CHOP',clockAtLock:876,hour:0,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776920420182,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:865,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776921319507,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:872,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776921593724,dir:'DOWN',posterior:8.1,regime:'RANGE-CHOP',clockAtLock:863,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776922224406,dir:'DOWN',posterior:6.8,regime:'TRENDING DOWN',clockAtLock:858,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776923124184,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:867,hour:1,session:'ASIA',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776942852526,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:854,hour:7,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776942917328,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:868,hour:7,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776943842274,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:871,hour:7,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776944749802,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:862,hour:7,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776945689540,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:875,hour:8,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776946529627,dir:'DOWN',posterior:7.4,regime:'TRENDING DOWN',clockAtLock:858,hour:8,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776947452773,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:869,hour:8,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776947491814,dir:'UP',posterior:72.4,regime:'RANGE-CHOP',clockAtLock:843,hour:8,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776948329656,dir:'DOWN',posterior:8.1,regime:'RANGE-CHOP',clockAtLock:867,hour:8,session:'EU',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776949241159,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:872,hour:9,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776950438032,dir:'UP',posterior:75.3,regime:'RANGE-CHOP',clockAtLock:856,hour:9,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776951097787,dir:'UP',posterior:73.1,regime:'RANGE-CHOP',clockAtLock:863,hour:9,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776952003637,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:874,hour:9,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776952837830,dir:'UP',posterior:74.2,regime:'RANGE-CHOP',clockAtLock:869,hour:10,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
  {id:1776954032101,dir:'UP',posterior:76.1,regime:'RANGE-CHOP',clockAtLock:851,hour:10,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776969042798,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:866,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'WIN'},
  {id:1776969929050,dir:'UP',posterior:89.2,regime:'SHORT SQUEEZE',clockAtLock:873,hour:14,session:'US',windowType:'15m',signals:{gap:0.0,momentum:0.0,structure:0.0,flow:0.0,technical:0.0,regime:0.0},result:'LOSS'},
];

const loadTradeLog=()=>{try{const s=localStorage.getItem('taraTradeLogV110');if(s){const p=JSON.parse(s);if(p&&p.length>0)return p;}return SEED_TRADES;}catch(e){return SEED_TRADES;}};
const saveTradeLog=(log)=>{try{localStorage.setItem('taraTradeLogV110',JSON.stringify(log.slice(-500)));}catch(e){}}; // keep last 500

// ── GRADIENT DESCENT WEIGHT UPDATE ──
// After each trade, credit/blame each signal proportionally to its contribution
const updateWeights=(weights,tradeLog,result)=>{
  // Recency-biased gradient descent: recent trades have 2x weight vs old ones
  // This makes Tara adapt faster to current market conditions
  const last=tradeLog[tradeLog.length-1];
  if(!last||!last.signals||!last.posterior)return weights;
  const won=result==='WIN';
  const sig=last.signals;
  const totalAbs=Object.values(sig).reduce((s,v)=>s+Math.abs(v),0)||1;
  const conviction=Math.abs(last.posterior-50)/50;
  // Recency multiplier: newest trade = 2.0x, older trades decay toward 0.5x
  const idx=tradeLog.length-1;
  const totalTrades=Math.max(1,tradeLog.length);
  const recencyMult=0.5+1.5*(idx/totalTrades); // 0.5 → 2.0 as trade gets newer
  const newW={...weights};
  Object.keys(sig).forEach(k=>{
    if(!(k in newW))return;
    const contribution=Math.abs(sig[k])/totalAbs;
    const aligned=Math.sign(sig[k])===Math.sign(last.posterior-50);
    let delta=LEARNING_RATE*contribution*conviction*recencyMult;
    if(won&&aligned)newW[k]+=delta;
    else if(won&&!aligned)newW[k]-=delta*0.3;
    else if(!won&&aligned)newW[k]-=delta;
    else if(!won&&!aligned)newW[k]+=delta*0.2;
    const[lo,hi]=WEIGHT_BOUNDS[k]||[2,55];
    newW[k]=Math.max(lo,Math.min(hi,newW[k]));
  });
  saveWeights(newW);
  return newW;
};
// Per-regime weight updater — same logic but targets the regime-specific set
const updateRegimeWeights=(regimeWeightsObj,trade,result)=>{
  if(!trade||!trade.signals||!trade.posterior)return regimeWeightsObj;
  const rg=trade.regime||'RANGE-CHOP';
  if(!regimeWeightsObj[rg])return regimeWeightsObj;
  const weights=regimeWeightsObj[rg];
  const won=result==='WIN';
  const sig=trade.signals;
  const totalAbs=Object.values(sig).reduce((s,v)=>s+Math.abs(v),0)||1;
  const conviction=Math.abs(trade.posterior-50)/50;
  const newW={...weights};
  Object.keys(sig).forEach(k=>{
    if(!(k in newW))return;
    const contribution=Math.abs(sig[k])/totalAbs;
    const aligned=Math.sign(sig[k])===Math.sign(trade.posterior-50);
    let delta=(LEARNING_RATE*1.2)*contribution*conviction; // slightly higher LR for regime-specific
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

  return{tapeRef,globalFlow,ticksRef,whaleLog,flowSignal};
};

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
    '&timezone=Etc%2FUTC',
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
  const{currentPrice,liveHistory,targetMargin,globalFlow,bloomberg,velocityRef,tickHistoryRef,priceMemoryRef,windowType,timeFraction,clockSeconds,is15m,regimeMemory,adaptiveWeights,calibration}=params;
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
  let regime='RANGE-CHOP';
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

  // ── IMPROVEMENT 1: Direction prior calibration ───────────────────────────
  // 211-trade data: UP 69% WR vs DOWN 55% WR — DOWN is structurally less reliable
  // Pull DOWN posteriors 15% closer to 50 to match actual empirical reliability
  let dirCalibrated=calibratedPosterior;
  if(calibratedPosterior<50){
    dirCalibrated=50-(50-calibratedPosterior)*0.85;
    reasoning.push(`[DIR] DOWN prior adj: ${calibratedPosterior.toFixed(1)}%→${dirCalibrated.toFixed(1)}% (DOWN WR=55% correction)`);
  }

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
  const finalPosterior=Math.max(1,Math.min(99,dirCalibrated));

  reasoning.push(`[ATR] Volatility: ${atrBps.toFixed(1)} bps | Regime: ${regime}${isPostDecay?' | POST-DECAY':''}`);
  if(calibration&&Object.values(calibration).some(v=>v!=null))reasoning.push(`[CAL] Pipeline: raw ${posterior.toFixed(1)}% → cal ${calibratedPosterior.toFixed(1)}% → dir+time ${finalPosterior.toFixed(1)}%`);

  // Rug pull check
  const isRugPull=tickSlope<-5&&aggrFlow<-0.6;

  return{posterior:finalPosterior,rawPosterior:posterior,regime,upThreshold,downThreshold,reasoning,atrBps,rsi,bb,vwap,realGapBps,drift1m,drift5m,drift15m,accel,pnlSlope,tickSlope,aggrFlow,isRugPull,isPostDecay,consecutive,volRatio,channel,momentumAlign,rawSignalScores,totalSignalWeight};
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
        <button onClick={()=>setShowWhaleLog(false)} className="opacity-40 hover:opacity-100 transition-opacity"><span className={'text-[#E8E9E4]/60 text-sm font-bold'}>✕</span></button>
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
  const bgStyle={
    emerald:{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.25)'},
    amber:{background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.20)'},
    rose:{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.20)'},
  }[c]||{};
  const txtCls=c==='emerald'?'text-emerald-400':c==='amber'?'text-amber-400':'text-rose-400';
  const barCls=c==='emerald'?'bg-emerald-500':c==='amber'?'bg-amber-500':'bg-rose-500';
  const msg=qualityGate.score>=75
    ?('High-confidence setup. '+(regime||'')+(session?' in '+session:'')+' historically reliable.')
    :qualityGate.score>=55
    ?'Moderate setup. Trade smaller or wait for stronger signal.'
    :('Low quality — '+(regime||'')+' in '+(session||'')+' has weak historical WR. Consider sitting out.');
  return(
    <div className="mb-2 p-2.5 rounded-lg" style={bgStyle}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest font-bold" style={{color:'rgba(232,233,228,0.3)'}}>Quality Gate</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${txtCls}`}>{qualityGate.label} — {qualityGate.score?.toFixed(0)}&#47;100</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{background:'rgba(232,233,228,0.1)'}}>
        <div className={`h-full rounded-full transition-all duration-700 ${barCls}`} style={{width:(qualityGate.score||0)+'%'}}/>
      </div>
      <div className={`text-[10px] ${txtCls}`} style={{opacity:0.7}}>{msg}</div>
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
    handleManualSync,getMarketSessions
  }=props;

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

  const showFormingProgress=!analysis.lockInfo&&(analysis.prediction.includes('FORMING')||analysis.prediction==='SEARCHING...');
  const formingDir=analysis.prediction.includes('UP');
  const formingCount=formingDir?analysis.bullCount:analysis.bearCount;
  const formingPct=Math.min(100,(formingCount/analysis.consecutiveNeeded)*100);
  const formingBarCls='h-full rounded-full transition-all duration-500 '+(formingDir?'bg-emerald-500/60':'bg-rose-500/60');
  const headingCls='prediction-heading text-3xl sm:text-4xl md:text-5xl font-serif font-bold leading-none tracking-tight '+(analysis.textColor||'')+' drop-shadow-lg';

  return(
    <div className="flex flex-col flex-1 gap-3">
      <div className="flex flex-col items-center text-center pt-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
          <span className={'text-xs text-[#E8E9E4]/40 uppercase tracking-[0.2em] font-bold'}>Prediction</span>
          {analysis.regime&&(
            <span className={'text-xs text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded'}>{analysis.regime}</span>
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
        <h2 className={headingCls}>{analysis.prediction}</h2>

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

        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="text-indigo-300">UP: {Number(analysis.rawProbAbove||0).toFixed(1)}%</span>
          <span className={'text-[#E8E9E4]/20'}>|</span>
          <span className="text-rose-300">DN: {(100-Number(analysis.rawProbAbove||0)).toFixed(1)}%</span>
          {analysis.kellyPct>0&&(
            <span className={'text-amber-400/80'}>Kelly: {analysis.kellyPct.toFixed(1)}%</span>
          )}
        </div>

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
    </div>
  );
}


function TaraApp(){
  const[isMounted,setIsMounted]=useState(false);
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
  // streakData moved below tradeLog declaration
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
  const[scorecards,setScorecards]=useState({'15m':{wins:347,losses:230},'5m':{wins:31,losses:25}});
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
    if(recent.length<3)return{streak:0,type:'neutral',last5WR:null,warning:false,strongWarn:false};
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
    return{streak,type:lastResult==='WIN'?'hot':'cold',last5WR,warning,strongWarn};
  },[tradeLog]);
  const tradeLogRef=useRef([]);
  tradeLogRef.current=tradeLog;
  const pendingTradeRef=useRef(null);
  const[showAnalytics,setShowAnalytics]=useState(false);
  const[showGuide,setShowGuide]=useState(false);
  const[selectedTradeId,setSelectedTradeId]=useState(null); // for editable trade log
  const[discordEditingId,setDiscordEditingId]=useState(null); // for discord message edit
  const[discordEditText,setDiscordEditText]=useState('');
  const[discordStatusMsg,setDiscordStatusMsg]=useState('');
  const calibration=useMemo(()=>buildCalibration(tradeLog),[tradeLog]);
  const signalAccuracy=useMemo(()=>buildSignalAccuracy(tradeLog),[tradeLog]);
  const sessionPerf=useMemo(()=>buildSessionPerf(tradeLog),[tradeLog]);
  const hourlyPerf=useMemo(()=>buildHourlyPerf(tradeLog),[tradeLog]);
  const[manualAction,setManualAction]=useState(null);
  const[forceRender,setForceRender]=useState(0);
  const[isChatOpen,setIsChatOpen]=useState(false);
  const[chatLog,setChatLog]=useState([{role:'tara',text:'Tara V110 online — Canvas Chart + Weighted Signal Engine + Smart Advisor active.'}]);
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
      if(ctx.state==='suspended'){ctx.resume();return;}
      const tone=(freq,vol,dur,wave)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type=wave||'sine';o.frequency.value=freq;
        g.gain.setValueAtTime(vol,ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
        o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur);
      };
      if(type==='lock-up'){tone(523,0.08,0.2);setTimeout(()=>tone(659,0.1,0.3),180);}
      else if(type==='lock-down'){tone(659,0.08,0.2);setTimeout(()=>tone(523,0.1,0.3),180);}
      else if(type==='entry'){tone(880,0.07,0.12,'square');setTimeout(()=>tone(880,0.07,0.12,'square'),120);setTimeout(()=>tone(880,0.07,0.12,'square'),240);}
      else if(type==='profit'){tone(523,0.07,0.15);setTimeout(()=>tone(659,0.07,0.15),100);setTimeout(()=>tone(784,0.09,0.3),200);}
      else if(type==='warning'){tone(220,0.1,0.15,'sawtooth');setTimeout(()=>tone(220,0.1,0.15,'sawtooth'),200);}
      else if(type==='emergency'){tone(180,0.12,0.12,'sawtooth');setTimeout(()=>tone(180,0.12,0.12,'sawtooth'),150);setTimeout(()=>tone(180,0.12,0.12,'sawtooth'),300);}
      else{tone(440,0.06,0.2);}
    }catch(e){}
  };
  const[showWhaleLog,setShowWhaleLog]=useState(false);
  const velocityRef=useVelocity(tickHistoryRef,currentPrice,targetMargin);
  const bloomberg=useBloomberg();
  const{tapeRef,globalFlow,ticksRef,whaleLog,flowSignal}=useGlobalTape();
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
    try{const s=localStorage.getItem('taraV110Score');if(s){const p=JSON.parse(s);if(p?.['15m']?.wins!=null)setScorecards(p);}const m=localStorage.getItem('taraV110Mem');if(m)setRegimeMemory(JSON.parse(m));const w=localStorage.getItem('taraV110Hook');if(w)setDiscordWebhook(w);const tz=localStorage.getItem('taraV110TZ');if(tz!=null)setUseLocalTime(tz==='true');
      // Username migration: always sync to current version, never keep stale Vxxx strings
      const du=localStorage.getItem('taraV110DU');
      const cleanDU=(du&&!new RegExp('V1[0-9][0-9]').test(du||''))?du:'Tara V110'; // no regex literal — esbuild safe
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
    const p=price||currentPriceRef.current;
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
    setStrikeSource('live');
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
        description:`Signal forming. Awaiting lock confirmation.`,
        fields:[
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Strike',value:`$${data.strike.toFixed(2)}`,inline:true},
          {name:'Gap',value:`${data.gap.toFixed(1)} bps`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Confidence',value:`${(data.posterior||0).toFixed(1)}%`,inline:true},
        ],
        footer:{text:'Tara V110  |  signal'},
        timestamp:new Date().toISOString(),
      };

      else if(type==='LOCK')embed={
        title:`TARA  ${data.dir}  LOCKED`,
        color:data.dir==='UP'?3404125:16478549,
        description:`Lock confirmed. Enter ${data.dir}.`,
        fields:[
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Strike',value:`$${data.strike.toFixed(2)}`,inline:true},
          {name:'Gap',value:`${data.gap.toFixed(1)} bps`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Record',value:data.record||'—',inline:true},
        ],
        footer:{text:'Tara V110  |  lock'},
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
          footer:{text:'Tara V110  |  close'},
          timestamp:new Date().toISOString(),
        };
      }

      else if(type==='EXIT')embed={
        title:`${data.result==='WIN'?'CASHOUT':'CUT'}  ${data.action}`,
        color:data.result==='WIN'?3404125:16478549,
        fields:[
          {name:'Price',value:`$${data.price.toFixed(2)}`,inline:true},
          {name:'Strike',value:`$${data.strike.toFixed(2)}`,inline:true},
          {name:'Gap',value:`${data.gap.toFixed(1)} bps`,inline:true},
          {name:'Clock',value:data.clock,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
        ],
        footer:{text:'Tara V110  |  exit'},
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
          footer:{text:'Tara V110  |  futures tape  |  not financial advice'},
          timestamp:new Date().toISOString(),
        };
      }

      const res=await fetch(discordWebhook+'?wait=true',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:discordUsername||'Tara V110',avatar_url:discordAvatar||undefined,embeds:[embed]})});
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
        footer:{text:`Tara V110 · edited ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}`},
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
  useEffect(()=>{
    const fetchKalshi=async()=>{
      if(windowType!=='15m')return; // Kalshi 15m markets only
      try{
        const now=Date.now();
        const iMs=15*60*1000;
        const nextMs=Math.ceil((now+500)/iMs)*iMs;
        const r=await fetch(
          'https://api.elections.kalshi.com/trade-api/v2/markets?limit=200&ticker_name_prefix=KXBTC&status=open',
          {signal:AbortSignal.timeout(6000),headers:{'Accept':'application/json'}}
        );
        if(!r.ok)return;
        const d=await r.json();
        const markets=d.markets||d.data||[];
        let best=null,bestDiff=Infinity;
        for(const m of markets){
          const closeMs=m.close_time?new Date(m.close_time).getTime():0;
          if(!closeMs)continue;
          const diff=Math.abs(closeMs-nextMs);
          if(diff<bestDiff){bestDiff=diff;best=m;}
        }
        if(best&&bestDiff<10*60*1000){
          // yes_ask or last_price — prefer yes_ask as live market price
          const yes=best.yes_ask??best.yes_bid??best.last_price??null;
          if(yes!=null)setKalshiYesPrice(Number(yes));
        }
      }catch(e){}
    };
    fetchKalshi();
    const iv=setInterval(fetchKalshi,30000);
    return()=>clearInterval(iv);
  },[windowType]);
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
            if(pendingTradeRef.current&&pendingTradeRef.current.result===null){
              const result=won?'WIN':'LOSS';
              const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin};
              const newLog=[...tradeLogRef.current,resolvedTrade];
              saveTradeLog(newLog);setTradeLog(newLog);
              setAdaptiveWeights(updateWeights(adaptiveWeights,newLog,result));
              setRegimeWeights(prev=>updateRegimeWeights(prev,resolvedTrade,result));
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
      const eng=computeV99Posterior({currentPrice,liveHistory,targetMargin,globalFlow,bloomberg,velocityRef,tickHistoryRef,priceMemoryRef,windowType,timeFraction,clockSeconds,is15m,regimeMemory,adaptiveWeights,regimeWeights,currentRegime:lastRegimeRef.current||'RANGE-CHOP',calibration});
      const{posterior,regime,upThreshold,downThreshold,reasoning,atrBps,realGapBps,drift1m,drift5m,accel,pnlSlope,tickSlope,aggrFlow,isRugPull,isPostDecay,bb}=eng;
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
      const LOCK_THRESHOLD_UP=(is15m?70:68)+_sessThreshAdj;
      const LOCK_THRESHOLD_DN=(is15m?30:32)-_sessThreshAdj;

      // ── IMPROVEMENT 2: Regime-gated consecutive requirement ──────────────
      // RANGE-CHOP is 56% WR (near coin flip) — needs one extra confirmation sample
      // TRENDING DOWN is 86% WR — can fire faster (2 samples)
      // ── IMPROVEMENT 3: Session multiplier on consecutive requirement ─────
      // US session 59% WR — needs one extra sample to reduce false locks
      const _regime=lastRegimeRef.current||'RANGE-CHOP';
      const _regimeConsecAdj=_regime==='RANGE-CHOP'?1:_regime==='HIGH VOL CHOP'?1:_regime==='TRENDING DOWN'?-1:0;
      const _sessConsecAdj=_sess==='US'?1:_sess==='OFF-HOURS'?1:0;
      const CONSECUTIVE_NEEDED=Math.max(1,(is15m?3:2)+_regimeConsecAdj+_sessConsecAdj);

      // ── IMPROVEMENT 4: Late lock penalty ─────────────────────────────────
      // Very late locks (>820s elapsed in 15m = last 80s) get suppressed
      // Data shows losses lock avg 777s vs wins 744s — very late = higher risk
      const elapsedSeconds=(is15m?900:300)-clockSeconds;
      const isVeryLateLock=is15m?(elapsedSeconds>820):(elapsedSeconds>260);
      // Late lock warning zone (700-820s elapsed) — show indicator, allow but note
      const isLateLockZone=is15m?(elapsedSeconds>700&&elapsedSeconds<=820):(elapsedSeconds>220&&elapsedSeconds<=260);

      // Add current posterior to history (capped at 12 samples)
      posteriorHistoryRef.current.push(posterior);
      if(posteriorHistoryRef.current.length>12)posteriorHistoryRef.current.shift();

      // Count consecutive bullish/bearish samples from recent history
      const recentHist=posteriorHistoryRef.current.slice(-6);
      const bullCount=recentHist.filter(p=>p>=LOCK_THRESHOLD_UP).length;
      const bearCount=recentHist.filter(p=>p<=LOCK_THRESHOLD_DN).length;

      // ── DOWN REGIME GATE ──────────────────────────────────────────────────
      // Data: DOWN in SHORT SQUEEZE = 50% WR (coin flip), DOWN in HVC = 48.4% WR (below coin flip)
      // Only trust DOWN in TRENDING DOWN (93%) and RANGE-CHOP (51%, still weak)
      // In SHORT SQUEEZE: DOWN requires 2× the normal consecutive samples AND stricter threshold
      const _downGated=regime==='SHORT SQUEEZE'||regime==='HIGH VOL CHOP';
      const _downTDOnly=regime==='TRENDING DOWN'; // most reliable DOWN regime
      const LOCK_THRESHOLD_DN_EFFECTIVE=_downGated?(is15m?22:20):_downTDOnly?(is15m?28:26):(is15m?30:32)-_sessThreshAdj;
      // Rebalanced: DOWN was too hesitant (+2), UP was firing too fast in weak regimes
      // DOWN now: +1 extra in gated regimes (not +2). UP: +1 in HVC/RC weak UP regimes.
      const CONSECUTIVE_NEEDED_DN=_downGated
        ? Math.max(2,CONSECUTIVE_NEEDED+1) // 1 extra for gated regimes — was +2, too slow
        : CONSECUTIVE_NEEDED;
      // UP gate: HIGH VOL CHOP and RANGE-CHOP UP calls need one extra sample too (55-59% WR)
      const _upGated=regime==='HIGH VOL CHOP'||regime==='RANGE-CHOP';
      const CONSECUTIVE_NEEDED_UP=_upGated
        ? Math.max(2,CONSECUTIVE_NEEDED+1) // extra confirmation in weak UP regimes
        : CONSECUTIVE_NEEDED;

      // ── Phase 1: Pre-lock ──
      if(!lockedCallRef.current){
        const avgRecent=recentHist.reduce((a,b)=>a+b,0)/(recentHist.length||1);

        // Track first FORMING direction this window — commit to it, no flipping
        if(!windowSignalDirRef.current){
          if(avgRecent>=58)windowSignalDirRef.current='UP';
          else if(avgRecent<=42)windowSignalDirRef.current='DOWN';
        }
        const committedDir=windowSignalDirRef.current; // null until first FORMING signal

        if(isVeryLateLock){
          taraAdviceRef.current=taraAdviceRef.current||'SEARCHING...';

        } else if(bullCount>=CONSECUTIVE_NEEDED_UP&&!isEndgameLock){
          // ── Quality gate: suppress lock if score too low ──
          const _rm=regimeMemory[regime]||{wins:0,losses:0};
          const _rt=_rm.wins+_rm.losses;
          const _rWR=_rt>5?(_rm.wins/_rt)*100:60;
          const _sessQ={'EU':67,'ASIA':62,'US':57,'OFF-HOURS':55}[_sess]||57;
          const _qScore=Math.min(40,Math.max(0,(Math.abs(posterior-50)-15)*1.6))+Math.min(30,(_rWR-50)*0.6)+Math.min(15,(_sessQ-50)*0.6)+(isLateLockZone?-8:0)+(isVeryLateLock?-20:0);
          const _quality=Math.max(0,Math.min(100,_qScore+5));
          if(_quality<40){
            // Quality too low — Tara sits out rather than making a weak call
            taraAdviceRef.current='LOW QUALITY — SITTING OUT';
          } else {
          // ── Direction flip guard: if FORMING DOWN already fired, don't lock UP ──
          const dirAllowed=!committedDir||committedDir==='UP';
          if(!dirAllowed){
            taraAdviceRef.current='SEARCHING...';
          } else {
            lockedCallRef.current={dir:'UP',lockedAt:Date.now(),lockedPosterior:posterior,lockedRegime:regime,lockPrice:currentPrice,isLateLock:isLateLockZone};
            taraAdviceRef.current='UP - LOCKED';
            biasCountRef.current={UP:0,DOWN:0};
          }
          } // close quality gate else

        } else if(bearCount>=CONSECUTIVE_NEEDED_DN&&posterior<=LOCK_THRESHOLD_DN_EFFECTIVE&&!isEndgameLock){
          // ── Quality gate for DOWN ──
          const _rm2=regimeMemory[regime]||{wins:0,losses:0};
          const _rt2=_rm2.wins+_rm2.losses;
          const _rWR2=_rt2>5?(_rm2.wins/_rt2)*100:60;
          const _sessQ2={'EU':67,'ASIA':62,'US':57,'OFF-HOURS':55}[_sess]||57;
          const _qScore2=Math.min(40,Math.max(0,(Math.abs(posterior-50)-15)*1.6))+Math.min(30,(_rWR2-50)*0.6)+Math.min(15,(_sessQ2-50)*0.6)+(isLateLockZone?-8:0)+(isVeryLateLock?-20:0);
          const _quality2=Math.max(0,Math.min(100,_qScore2+5));
          if(_quality2<40){
            taraAdviceRef.current='LOW QUALITY — SITTING OUT';
          } else {
          // ── Direction flip guard: if FORMING UP already fired, don't lock DOWN ──
          const dirAllowed=!committedDir||committedDir==='DOWN';
          if(!dirAllowed){
            taraAdviceRef.current='SEARCHING...';
          } else {
            lockedCallRef.current={dir:'DOWN',lockedAt:Date.now(),lockedPosterior:posterior,lockedRegime:regime,lockPrice:currentPrice,isLateLock:isLateLockZone};
            taraAdviceRef.current='DOWN - LOCKED';
            biasCountRef.current={UP:0,DOWN:0};
          }
          } // close quality gate else

        } else {
          if(isVeryLateLock)taraAdviceRef.current='NO CALL';
          else if(avgRecent>=58&&!isEndgameLock)taraAdviceRef.current=`UP (FORMING)${isLateLockZone?' LATE':''}`;
          else if(avgRecent<=42&&!isEndgameLock)taraAdviceRef.current=`DOWN (FORMING)${isLateLockZone?' LATE':''}`;
          else taraAdviceRef.current='SEARCHING...';
        }
      }

      // ── Phase 2: Post-lock — check only EXTREME unlock conditions ──
      if(lockedCallRef.current){
        const lock=lockedCallRef.current;
        const gapBps=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;
        // Unlock only if price has MASSIVELY moved against the locked direction
        const deepWrong=(lock.dir==='UP'&&gapBps<-55)||(lock.dir==='DOWN'&&gapBps>55);
        // Rug pull while locked UP = immediate release (don't show both simultaneously)
        const catastrophicRugpull=(isRugPull&&showRugPullAlerts&&lock.dir==='UP')||(isRugPull&&lock.dir==='UP'&&posterior<10);
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

      // V110 Smart Advisor — lock-state-aware
      const _advisorResult=computeAdvisor({userPosition,positionStatus,currentOdds,offerVal,betAmount,maxPayout,clockSeconds,windowType,tickSlope,isRugPull,showRugPullAlerts,hasReversedRef,peakOfferRef,posterior,targetMargin,currentPrice,minsRemaining:timeState.minsRemaining,secsRemaining:timeState.secsRemaining,accel,pnlSlope,atrBps,activePrediction,regime,lockInfo:lockedCallRef.current?{dir:lockedCallRef.current.dir,lockedAt:lockedCallRef.current.lockedAt,lockedPosterior:lockedCallRef.current.lockedPosterior,lockPrice:lockedCallRef.current.lockPrice,lockRegime:lockedCallRef.current.lockedRegime}:null});

      // Projections
      const getHP=(msAgo)=>{const t=Date.now()-msAgo;const m=priceMemoryRef.current;if(!m||m.length===0)return currentPrice;let c=m[0];for(let i=m.length-1;i>=0;i--){if(m[i].time<=t){c=m[i];break;}}return c.p;};
      let trendBps=isNaN(drift1m)?0:drift1m;
      if(isUP&&trendBps<=0)trendBps=2;if(isDN&&trendBps>=0)trendBps=-2;
      const genTimeline=(min,steps)=>{const out=[],iMs=min*60*1000,now=Date.now();let nT=Math.ceil(now/iMs)*iMs;if(nT-now<iMs*0.1)nT+=iMs;const tz=useLocalTime?undefined:{timeZone:'America/New_York'};for(let i=0;i<steps;i++){const sT=nT+(i*iMs);const diff=(sT-now)/60000;const p=currentPrice*(1+(trendBps/10000)*diff);const d=new Date(sT);let ts=`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;try{ts=d.toLocaleTimeString('en-US',{...tz,hour12:true,hour:'numeric',minute:'2-digit'});}catch(e){}out.push({timeStr:ts,timestamp:Math.floor(sT/1000),price:p});}return out;};
      const t5=genTimeline(5,8),t15=genTimeline(15,8),t60=genTimeline(60,8);
      const projections=[{id:'5m',time:'5 MIN',price:t5[0]?.price||currentPrice,conf:Math.min(95,posterior+5),timeline:t5},{id:'15m',time:'15 MIN',price:t15[0]?.price||currentPrice,conf:posterior,timeline:t15},{id:'1h',time:'1 HOUR',price:t60[0]?.price||currentPrice,conf:Math.max(10,posterior-15),timeline:t60}];

      // Multi-timeframe confluence: check if the OTHER timeframe has a recent lock in same direction
      const _otherTF=windowType==='15m'?'5m':'15m';
      const _otherLock=mtfLocksRef.current[_otherTF];
      const _thisLock=lockedCallRef.current;
      const mtfAligned=_thisLock&&_otherLock&&_otherLock.dir===_thisLock.dir&&(Date.now()-_otherLock.lockedAt)<20*60*1000;
      const mtfOpposed=_thisLock&&_otherLock&&_otherLock.dir!==_thisLock.dir&&(Date.now()-_otherLock.lockedAt)<20*60*1000;
      return{confidence:String(isDN?(100-posterior).toFixed(1):posterior.toFixed(1)),prediction:String(activePrediction),textColor:String(textColor),rawProbAbove:Number(posterior),regime:String(regime),reasoning,atrBps:Number(atrBps),realGapBps:Number(realGapBps),clockSeconds:Number(clockSeconds),isSystemLocked:Boolean(isEndgameLock),isPostDecay:Boolean(isPostDecay),isRugPull:Boolean(isRugPull),bb,livePnL:Number(livePnL),liveEstValue:Number(liveEstValue),kellyPct:Number(kellyPct),projections,advisor:_advisorResult,currentOdds:Number(currentOdds),aggrFlow:Number(aggrFlow),isEarlyWindow:Boolean(isEarlyWindow),consecutive:eng.consecutive,volRatio:Number(eng.volRatio),mtfAligned:Boolean(mtfAligned),mtfOpposed:Boolean(mtfOpposed),isLateLockZone:Boolean(isLateLockZone),isVeryLateLock:Boolean(isVeryLateLock),consecutiveNeeded:Number(CONSECUTIVE_NEEDED),
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
    broadcastToDiscord('LOCK',{
      dir:lock.dir,price:currentPrice,strike:targetMargin,
      gap:targetMargin>0?((currentPrice-targetMargin)/targetMargin*10000):0,
      clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`,
      regime:lastRegimeRef.current,posterior:analysis?.rawProbAbove||0,record
    });
    playAlert(lock.dir==='UP'?'lock-up':'lock-down');
  },[analysis?.lockInfo?.lockedAt]);

  // ── STAGE 1: SIGNAL broadcast when FORMING is first detected ──
  const lastFormingBroadcastRef=useRef(null);
  useEffect(()=>{
    if(!analysis?.prediction)return;
    const isForming=analysis.prediction.includes('FORMING');
    if(!isForming)return;
    const dir=analysis.prediction.includes('UP')?'UP':'DOWN';
    // One SIGNAL broadcast per direction per window — use window start time as key
    const formingKey=`${dir}-${timeState.startWindow||timeState.nextWindow}`;
    if(lastFormingBroadcastRef.current===formingKey)return;
    lastFormingBroadcastRef.current=formingKey;
    broadcastToDiscord('SIGNAL',{
      dir,price:currentPrice,strike:targetMargin,
      gap:targetMargin>0?((currentPrice-targetMargin)/targetMargin*10000):0,
      clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`,
      regime:lastRegimeRef.current,posterior:analysis?.rawProbAbove||0
    });
  },[analysis?.prediction]);

  // ── WHALE AUTO-BROADCAST ─────────────────────────────────────────────────
  // Only fires when: streak ≥4 AND net delta >$500K AND 5-min cooldown passed
  // Also checks spot/futures alignment for accuracy flag
  const lastWhaleBroadcastRef=useRef({time:0,dir:null});
  // ── FLOW INTELLIGENCE AUTO-OPEN ─────────────────────────────────────────
  // Auto-opens when whale streak ≥3 and user is in trade — so they don't miss it
  const prevStreakRef=useRef(0);
  useEffect(()=>{
    const fs=flowSignal;
    // Auto-open when: score hits STRONG (≥75) OR streak ≥4 — regardless of trade state
    // Closes automatically only if user dismisses it; stays open if still strong
    const prevScore=prevStreakRef.current;
    const justHitStrong=fs.score>=75&&prevScore<75;
    const streakJustHit=fs.streakCount>=4&&(prevStreakRef.current||0)<4;
    prevStreakRef.current=fs.score;
    if(justHitStrong||streakJustHit){
      setShowWhaleLog(true);
    }
    // Auto-close when flow returns to NOISE and user hasn't manually interacted
    if(fs.score<25&&fs.streakCount<2){
      // Don't force-close — let user dismiss manually. Just dim the button.
    }
  },[flowSignal.score,flowSignal.streakCount]);

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
        const exitLog={...pendingTradeRef.current,result:'LOSS',closingPrice:currentPrice,strikePrice:targetMargin,reversed:true};
        const newLog1=[...tradeLogRef.current,exitLog];
        saveTradeLog(newLog1);setTradeLog(newLog1);
        setAdaptiveWeights(updateWeights(adaptiveWeights,newLog1,'LOSS'));
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
      // Create trade log entry when user confirms entry
      const eng=lockedCallRef.current;
      pendingTradeRef.current={
        id:Date.now(),dir,
        posterior:eng?.lockedPosterior||analysis?.rawProbAbove||50,
        regime:lastRegimeRef.current,
        clockAtLock:timeState.minsRemaining*60+timeState.secsRemaining,
        hour:new Date().getHours(),session:getMarketSessions().dominant,windowType,
        signals:analysis?.rawSignalScores||{},result:null,
        betAmt:betAmount||0,maxPay:maxPayout||0  // captured at entry for P&L calc
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
          const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin,earlyExit:true};
          const newLog=[...tradeLogRef.current,resolvedTrade];
          saveTradeLog(newLog);setTradeLog(newLog);
          setAdaptiveWeights(updateWeights(adaptiveWeights,newLog,result));
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

  const handleChatSubmit=(e)=>{if(e.key!=='Enter'||!chatInput.trim())return;const ut=chatInput.trim();const log=[...chatLog,{role:'user',text:ut}];setChatLog(log);setChatInput('');setTimeout(()=>{let r='';const u=ut.toLowerCase();if(u.includes('/broadcast')){const g=targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0;const dir=analysis?.prediction.includes('UP')?'UP':analysis?.prediction.includes('DOWN')?'DOWN':'SIT OUT';broadcastToDiscord('SIGNAL',{dir,price:currentPrice,strike:targetMargin,gap:g,clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`});r='Signal broadcasted to Discord.';}else if(u.includes('why')||u.includes('explain'))r=`Posterior UP: ${Number(analysis?.rawProbAbove||0).toFixed(1)}%. Regime: ${analysis?.regime}. Signal composite output. Ask 'whale' or 'position'.`;else if(u.includes('whale'))r=whaleLog.length>0?whaleLog.slice(0,8).map(w=>{const d=new Date(w.time);return`${d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})} ${w.src} ${w.side} $${(w.usd/1000).toFixed(0)}K @ $${w.price.toFixed(0)}`;}).join('\n'):'No whale trades yet.';else if(u.includes('position'))r=positionStatus?`${positionStatus.side} @ $${positionStatus.entry.toFixed(2)} | PnL: ${positionStatus.pnlPct>0?'+':''}${positionStatus.pnlPct.toFixed(1)}% | ${positionStatus.isStopHit?'STOP HIT':'Safe'}`:'No active position.';else if(u.includes('session'))r=`Active: ${marketSessions.sessions.map(s=>`${s.flag} ${s.name}`).join(' + ')} | Dominant: ${marketSessions.dominant}`;else r=`P(UP): ${Number(analysis?.rawProbAbove||0).toFixed(1)}%. Advisor: ${analysis?.advisor?.label||'—'}. Try: why | whale | position | session | /broadcast`;setChatLog([...log,{role:'tara',text:r}]);},400);};

  const handleWindowToggle=(t)=>{if(t===windowType)return;setWindowType(String(t));setPendingStrike(null);taraAdviceRef.current='SEARCHING...';lockedCallRef.current=null;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};hasReversedRef.current=false;manuallyClosedRef.current=null;windowSignalDirRef.current=null;isManualStrikeRef.current=false;hasSetInitialMargin.current=false;fetchWindowOpenPrice(t);setUserPosition(null);setPositionEntry(null);setManualAction(null);setCurrentOffer('');setBetAmount(0);setMaxPayout(0);lastWindowRef.current='';peakOfferRef.current=0;setForceRender(p=>p+1);};

  if(!isMounted)return<div className={'min-h-screen bg-[#111312] flex items-center justify-center text-[#E8E9E4]/50 font-serif text-xl animate-pulse'}>Initializing Tara V110...</div>;

  const totalDOM=(orderBook.localBuy+orderBook.localSell)||1;
  const buyPct=(orderBook.localBuy/totalDOM)*100;
  const sellPct=(orderBook.localSell/totalDOM)*100;
  const advisor=analysis?.advisor||{label:'CONNECTING...',reason:'Fetching market data...',color:'zinc',animate:false,hasAction:false};
  const advisorColorMap={emerald:'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',rose:'text-rose-400 border-rose-500/40 bg-rose-500/10',amber:'text-amber-400 border-amber-500/40 bg-amber-500/10',zinc:'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'};
  const advisorStyle=advisorColorMap[advisor.color]||advisorColorMap.zinc;

  return(
    <div className={'min-h-screen bg-[#111312] text-[#E8E9E4] font-sans flex flex-col selection:bg-[#E8E9E4]/20'} style={{fontSize:"16px",lineHeight:"1.5",overflowX:"hidden",maxWidth:"100vw"}}>
      
      {/* ── STICKY HEADER ── */}
      <header className={'sticky top-0 z-40 bg-[#111312]/95 backdrop-blur-md border-b border-[#E8E9E4]/10 px-2 sm:px-4 py-2 shrink-0'}>
        <div className="max-w-[1600px] mx-auto flex items-center gap-1 sm:gap-2">
          
          {/* Logo — text only on mobile, badge on sm+ */}
          <div className="flex items-center gap-1 shrink-0">
            <h1 className="text-base sm:text-lg font-serif tracking-tight text-white">Tara</h1>
            <span className={'hidden sm:flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20'}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> V110
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
            <button onClick={()=>setShowGuide(true)} className={'p-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors'} title="How Tara Works">?</button>
            {/* Hidden on mobile — accessible via mobile tab nav or sm+ */}
            <FlowBtn flowSignal={flowSignal} active={showWhaleLog} onClick={()=>setShowWhaleLog(!showWhaleLog)} cls="hidden sm:flex"/>
            <button onClick={()=>setShowSettings(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-indigo-400 transition-colors'}><IC.Link className="w-3.5 h-3.5"/></button>
            <button onClick={()=>setShowAnalytics(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-indigo-400 transition-colors'} title="Analytics"><IC.BarChart className="w-3.5 h-3.5"/></button>
            <button onClick={()=>setShowHelp(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-white transition-colors'}><IC.Help className="w-3.5 h-3.5"/></button>
          </div>
        </div>
      </header>

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
                  title={strikeMode==='auto'?'Live spot price at window open · click to re-capture':'Manual override · click to restore live'}
                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer select-none font-bold transition-colors ${strikeMode==='auto'?'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30':'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-emerald-500/15 hover:text-emerald-400'}`}
                >{strikeMode==='auto'?'LIVE':'MANUAL'}</span>
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

        {/* ── MIDDLE ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0">
          
          {/* ── PREDICTION CARD ── */}
          <div className={`bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col relative ${mobileTab!=='signal'?'hidden lg:flex':''}`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-30 rounded-t-xl"></div>
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
                    const resolvedTrade={...pendingTradeRef.current,result,closingPrice:currentPrice,strikePrice:targetMargin,forceExit:true};
                    const newLog=[...tradeLogRef.current,resolvedTrade];saveTradeLog(newLog);setTradeLog(newLog);
                    const newW=updateWeights(adaptiveWeights,newLog,result);setAdaptiveWeights(newW);setRegimeWeights(prev=>updateRegimeWeights(prev,resolvedTrade,result));pendingTradeRef.current=null;
                  }
                }
                setUserPosition(null);setPositionEntry(null);taraAdviceRef.current='CLOSED';setForceRender(p=>p+1);
              }} className={'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-colors'}>
                <IC.Alert className="w-4 h-4"/>Force Exit
              </button>
            </div>

            <PredictionContent strikeConfirmed={strikeConfirmed} strikeMode={strikeMode} targetMargin={targetMargin} isLoading={isLoading} analysis={analysis} currentPrice={currentPrice} qualityGate={qualityGate} userPosition={userPosition} timeState={timeState} streakData={streakData} handleManualSync={handleManualSync} getMarketSessions={getMarketSessions}/>
          </div>
      </div>

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
            <div className={'bg-[#111312] p-2.5 flex justify-between items-center border-b border-[#E8E9E4]/10'}><span className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><IC.Msg className="w-3.5 h-3.5 text-indigo-400"/>Chat with Tara V110</span><button onClick={()=>setIsChatOpen(false)} className="opacity-50 hover:opacity-100"><IC.X className="w-4 h-4"/></button></div>
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
                  const csv=['id,dir,posterior,regime,clockAtLock,hour,session,windowType,gap,momentum,structure,flow,technical,regime_s,result'].concat(
                    tradeLog.map(t=>`${t.id},${t.dir},${t.posterior?.toFixed(1)},${t.regime},${t.clockAtLock},${t.hour},${t.session},${t.windowType},${t.signals?.gap?.toFixed(2)||0},${t.signals?.momentum?.toFixed(2)||0},${t.signals?.structure?.toFixed(2)||0},${t.signals?.flow?.toFixed(2)||0},${t.signals?.technical?.toFixed(2)||0},${t.signals?.regime?.toFixed(2)||0},${t.result||'PENDING'}`)
                  ).join('\n');
                  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='tara_training_data.csv';a.click();
                }} className={'px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-colors'}>Export CSV</button>
                <button onClick={()=>{if(confirm('Reset all training data and weights? Cannot undo.')){setAdaptiveWeights({...DEFAULT_WEIGHTS});setTradeLog([]);saveWeights({...DEFAULT_WEIGHTS});saveTradeLog([]);pendingTradeRef.current=null;}}} className={'px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-colors'}>Reset</button>
                <button onClick={()=>{setShowAnalytics(false);setSelectedTradeId(null);}} className={'text-[#E8E9E4]/50 hover:text-white'}><IC.X className="w-5 h-5"/></button>
              </div>
            </div>
            <div className="p-4 space-y-5">

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
                    setAdaptiveWeights(updateWeights(adaptiveWeights,newLog,newResult));
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
                            return(
                              <div key={i} className={`flex items-center gap-2 text-[10px] px-2 py-1 rounded border ${t.result==='WIN'?'bg-emerald-500/5 border-emerald-500/15':'bg-rose-500/5 border-rose-500/15'}`}>
                                <span className={'font-mono text-[#E8E9E4]/30 shrink-0 w-14'}>{timeStr}</span>
                                <span className={`font-bold w-8 shrink-0 ${t.dir==='UP'?'text-emerald-400':'text-rose-400'}`}>{t.dir}</span>
                                <span className={'text-[#E8E9E4]/40 shrink-0'}>{t.windowType||'15m'}</span>
                                <span className={'text-[#E8E9E4]/30 flex-1 truncate'}>{t.regime||'—'}</span>
                                <span className={'text-[#E8E9E4]/25 shrink-0'}>{t.session||'—'}</span>
                                <span className={`font-bold shrink-0 ${t.result==='WIN'?'text-emerald-400':'text-rose-400'}`}>{t.result}</span>
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
                  <span className="text-indigo-400 text-xl font-bold">?</span> How Tara V110 Works
                </h2>
                <p className={'text-xs text-[#E8E9E4]/40 mt-0.5'}>Complete guide — predictions, learning, advisor, and best practices</p>
              </div>
              <button onClick={()=>setShowGuide(false)} className={'text-[#E8E9E4]/50 hover:text-white p-1'}><IC.X className="w-5 h-5"/></button>
            </div>
            <div className={'p-4 sm:p-6 space-y-6 text-sm text-[#E8E9E4]/80'}>

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
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}>3 consecutive readings (15m) or 2 consecutive (5m) all above 68% threshold. Tara has committed for the window. She will NOT change this prediction — the posterior can drop to 55% and she stays locked UP. The only releases are a 55+ bps adverse gap or catastrophic rug pull. This is the <strong className="text-white">only state to enter on.</strong></p>
                  </div>
                  <div className={'bg-[#111312] rounded-lg p-3 border border-rose-500/20'}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-rose-400 font-bold text-xs">DOWN — LOCKED 🔒</span><span className={'text-[10px] text-[#E8E9E4]/30 uppercase'}>Entry signal — act now</span></div>
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}>Same as UP — LOCKED but bearish. Posterior consistently below 32% for N consecutive samples. If you missed the entry window and it's late, the advisor will say WINDOW CLOSING — don't chase it.</p>
                  </div>
                  <div className={'bg-[#111312] rounded-lg p-3 border border-zinc-500/15'}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-zinc-400 font-bold text-xs">NO CALL — WINDOW CLOSED — LOCK RELEASED</span><span className="text-[10px] text-rose-400 uppercase">Sit out</span></div>
                    <p className={'text-xs leading-relaxed text-[#E8E9E4]/60'}><strong className="text-white">NO CALL:</strong> Never reached threshold before endgame. Skip this round.<br/><strong className="text-white">WINDOW CLOSED:</strong> Last 90s (15m) or 45s (5m) with no lock. Too late to enter safely.<br/><strong className="text-white">LOCK RELEASED:</strong> Price moved 55+ bps wrong direction, Tara released. Respect it immediately.</p>
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
              <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2"><IC.Info className="w-5 h-5 text-indigo-400"/>Tara V110 — What's New</h2>
              <button onClick={()=>setShowHelp(false)} className={'text-[#E8E9E4]/50 hover:text-white'}><IC.X className="w-5 h-5"/></button>
            </div>
            <div className={'p-4 sm:p-6 space-y-5 text-xs sm:text-sm text-[#E8E9E4]/80'}>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">V110 Prediction Engine</h3><p className="leading-relaxed">Predictions now use a <strong>6-signal weighted composite</strong> instead of simple addition: (1) Gap Gravity, (2) Momentum Composite with alignment detection, (3) Candle Structure — consecutive candles + volume confirmation, (4) Flow Imbalance, (5) Technical Composite — RSI divergence, VWAP, Bollinger Bands, price channel, (6) Funding Momentum. Signals are weighted by reliability, preventing single-factor dominance.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">Smart Advisor (In-Trade)</h3><p className="leading-relaxed">The advisor now runs a <strong>10-state priority machine</strong> with time-remaining awareness. Every message shows how many minutes are left and specific price context. It distinguishes between "cut now" (late window, losing) and "hold" (time to recover). Profit recommendations include specific exit triggers relative to peak offer.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">Canvas Chart (No CDN)</h3><p className="leading-relaxed">Chart is built entirely in canvas — no external library needed. Always renders. Dual API fallback: Coinbase first, Binance if blocked. Supports full EMA/BB overlays, strike line, live price sync, crosshair hover, and volume bars. Resize-aware.</p></section>
              <section><h3 className="text-emerald-400 font-bold uppercase tracking-wide mb-2 text-xs">New Signals</h3><ul className="list-disc pl-4 space-y-1"><li><strong>Candle Structure:</strong> 3+ consecutive candles in same direction = momentum confirmation. Volume surge compounds the signal.</li><li><strong>Price Channel:</strong> Near top of 20-candle range with upward drift = resistance signal, and vice versa.</li><li><strong>RSI Divergence:</strong> Price moving up but RSI flat = hidden weakness. Price down but RSI flat = hidden strength.</li><li><strong>Funding Momentum:</strong> Direction of funding rate change, not just the level.</li></ul></section>
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
    </main>
    </div>
  );
}

export default function App(){return<ErrorBoundary><TaraApp/></ErrorBoundary>;}
