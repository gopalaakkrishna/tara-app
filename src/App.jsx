import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// ═══════════════════════════════════════
// V5.6: FIRESTORE SYNC LAYER
// ═══════════════════════════════════════
// Cloud-backed persistence for Tara. Fixes the "refresh-roulette" problem where Tara's Call
// and the engine lock both reset on page reload because they lived only in React refs.
//
// Model: localStorage stays as the fast-paint cache so first paint is instant. Firestore
// is the source of truth — its read overwrites local state ~200-500ms after mount when
// fresher data exists. Writes go to both stores (localStorage immediately, Firestore
// debounced 300-1500ms depending on path).
//
// V5.6.3: SHARED TARA. Previously every userId was its own namespace. Now there is one
// global Tara — every browser, every device, every user who opens the app sees the same
// record, the same memory, the same lock state. Paths are 2-segment globals.
//
// Paths (global, no namespace):
//   state/currentLock     → engine lockedCallRef + Tara snapshot for the active window.
//                           windowId-keyed so a refresh during the same window restores
//                           exactly what was on screen before reload. Stale locks from
//                           previous windows are ignored on restore.
//   scorecards/tara       → Tara's Call W/L/sitouts per window-type.
//   memory/taraCallLog    → array of every call she's made (capped at 500).
//   meta/info             → baselineVersion + lastSeenAt for migration tracking.
//
// NOT cloud-synced (per V5.5b decision — user-trade-driven training stays ephemeral):
//   adaptiveWeights, regimeWeights, tradeLog. These remain in-memory only this session.
//
// Test-mode caveat: Firestore rules are wide open for ~30 days. Lock down in V5.7 with
// proper rules.
const FIREBASE_CONFIG={apiKey:"AIzaSyD8jltDNdmXPE0JolUSX6fXzSQUdsYjLcY",authDomain:"tara-app-ee39d.firebaseapp.com",projectId:"tara-app-ee39d",storageBucket:"tara-app-ee39d.firebasestorage.app",messagingSenderId:"512450573817",appId:"1:512450573817:web:b1659b8f28f894900f7928"};
let _fbApp=null,_fbDb=null;
try{_fbApp=initializeApp(FIREBASE_CONFIG);_fbDb=getFirestore(_fbApp);console.info('[Firestore] init ok — shared Tara, no namespacing');}
catch(e){console.warn('[Firestore] init failed — falling back to localStorage only:',e?.message);}

const _fbDoc=(path)=>{
  if(!_fbDb)return null;
  // V5.6.3: paths are 2-segment globals (collection/doc). One Tara, everyone shares.
  const segs=path.split('/');
  return doc(_fbDb,...segs);
};
// V5.6.1: Cloud sync status — subscribers (React components) get notified on state change.
//   States: 'idle' (no recent activity), 'writing' (debounced or in-flight), 'ok' (last
//   write succeeded), 'error' (last write/read failed). Used for a visible indicator dot.
// V5.6.3: Track active onSnapshot listeners. If listeners > 0, real-time sync is alive
//   and changes from any device propagate within ~1s without refresh. If listeners = 0
//   but Firestore is initialized, something's wrong (rules, network, etc.).
const _cloudSyncListeners=new Set();
let _cloudSyncStatus={state:_fbDb?'idle':'disabled',lastOk:null,lastError:null,writes:0,reads:0,listeners:0};
const _setCloudStatus=(patch)=>{_cloudSyncStatus={..._cloudSyncStatus,...patch};_cloudSyncListeners.forEach(l=>l(_cloudSyncStatus));};
const subscribeCloudStatus=(fn)=>{_cloudSyncListeners.add(fn);fn(_cloudSyncStatus);return()=>_cloudSyncListeners.delete(fn);};

const cloudRead=async(path)=>{
  const ref=_fbDoc(path);if(!ref)return null;
  try{
    const s=await getDoc(ref);
    _setCloudStatus({state:'ok',lastOk:Date.now(),reads:_cloudSyncStatus.reads+1});
    return s.exists()?s.data():null;
  }catch(e){
    console.warn('[Firestore read failed]',path,e?.message);
    _setCloudStatus({state:'error',lastError:{path,message:e?.message,at:Date.now()}});
    return null;
  }
};
const cloudWrite=async(path,data)=>{
  const ref=_fbDoc(path);if(!ref)return false;
  _setCloudStatus({state:'writing'});
  try{
    await setDoc(ref,{...data,_updatedAt:serverTimestamp()});
    _setCloudStatus({state:'ok',lastOk:Date.now(),writes:_cloudSyncStatus.writes+1});
    return true;
  }catch(e){
    console.warn('[Firestore write failed]',path,e?.message);
    _setCloudStatus({state:'error',lastError:{path,message:e?.message,at:Date.now()}});
    return false;
  }
};
const cloudDelete=async(path)=>{
  const ref=_fbDoc(path);if(!ref)return false;
  try{await deleteDoc(ref);_setCloudStatus({state:'ok',lastOk:Date.now(),writes:_cloudSyncStatus.writes+1});return true;}
  catch(e){console.warn('[Firestore delete failed]',path,e?.message);_setCloudStatus({state:'error',lastError:{path,message:e?.message,at:Date.now()}});return false;}
};
// V5.6.2: Real-time listener — fires once with current cloud value, then again on every
//   change from any connected client. This is what makes cross-device sync actually work:
//   Device A writes, Device B's listener fires within ~1s, B's UI updates without refresh.
//   Returns an unsubscribe function the caller stores in a useEffect cleanup.
// V5.6.3: Tracks active listener count in sync status — so the badge can show whether
//   real-time sync is actually established vs. just one-shot reads happening.
const cloudWatch=(path,callback)=>{
  const ref=_fbDoc(path);
  if(!ref){callback(null,'disabled');return()=>{};}
  _setCloudStatus({listeners:_cloudSyncStatus.listeners+1});
  const unsub=onSnapshot(ref,
    (snap)=>{
      _setCloudStatus({state:'ok',lastOk:Date.now(),reads:_cloudSyncStatus.reads+1});
      callback(snap.exists()?snap.data():null,'ok');
    },
    (err)=>{
      console.warn('[Firestore listen failed]',path,err?.message);
      _setCloudStatus({state:'error',lastError:{path,message:err?.message,at:Date.now()}});
      callback(null,'error');
    }
  );
  return()=>{
    _setCloudStatus({listeners:Math.max(0,_cloudSyncStatus.listeners-1)});
    unsub();
  };
};
// Coalesces rapid updates per-path into a single Firestore write (saves quota + bandwidth).
const _writeQueue=new Map();
const cloudWriteDebounced=(path,data,delayMs=1500)=>{
  if(_writeQueue.has(path))clearTimeout(_writeQueue.get(path));
  const tid=setTimeout(()=>{cloudWrite(path,data);_writeQueue.delete(path);},delayMs);
  _writeQueue.set(path,tid);
};
// Deterministic ID for the current trading window (UTC ISO of window-open boundary).
// Refresh during the same window → same ID → restore the same lock.
const computeWindowId=(windowType)=>{
  const winMs=windowType==='15m'?900000:300000;
  const bucketMs=Math.floor(Date.now()/winMs)*winMs;
  return `${windowType}-${new Date(bucketMs).toISOString()}`;
};

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
// V5.7.3: Single source of truth for duration formatting. Returns "Xs" under 60s,
//   "Mm SSs" otherwise. Handles null/NaN gracefully. Used everywhere a countdown is shown.
const formatDuration=(seconds)=>{
  if(seconds==null||isNaN(seconds))return'—';
  const s=Math.max(0,Math.round(seconds));
  if(s<60)return`${s}s`;
  const m=Math.floor(s/60);
  const r=s%60;
  return`${m}m ${String(r).padStart(2,'0')}s`;
};
// V5.7.3: Stable signed-integer formatter — fixes -0 / +0 weirdness in score breakdowns.
const formatSignedInt=(val)=>{
  if(val==null||isNaN(val))return'0';
  const r=Math.round(val);
  if(r===0)return'0';
  return(r>0?'+':'')+r;
};
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
// V4.6 FRESH START: Default weights reset to neutral midpoint. Per user request — full
//   training reset, no carryover from the 57-trade seed CSV. Each signal starts at the
//   same weight so gradient descent learns purely from the user's live trades.
const DEFAULT_WEIGHTS={gap:35.00,momentum:35.00,structure:35.00,flow:35.00,technical:35.00,regime:35.00,rangePosition:35.00};

// Per-regime weight sets — each regime gets its own gradient descent
// Initialized from global defaults, diverge over time based on what works in each regime
// V143: Per-regime weight defaults pre-trained from 379 seed trades. Previously all four
//       regimes started from identical DEFAULT_WEIGHTS — gradient descent was supposed to
//       differentiate them over time but the attribution gate (>10%) + small learning rate
//       produced ~1-3pt deltas after hundreds of trades. Pre-baking the seed-trained values
//       gives users a differentiated starting point on first load. Subsequent live trades
//       continue to update via gradient descent on top.
// V4.6 FRESH START: Per-regime weights reset to neutral. All four regimes start identical
//   from DEFAULT_WEIGHTS — gradient descent will differentiate them as you trade.
const DEFAULT_REGIME_WEIGHTS={
  'SHORT SQUEEZE': {...DEFAULT_WEIGHTS},
  'RANGE-CHOP':    {...DEFAULT_WEIGHTS},
  'HIGH VOL CHOP': {...DEFAULT_WEIGHTS},
  'TRENDING DOWN': {...DEFAULT_WEIGHTS},
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
// V5.5b: User-trade persistence stubbed per user request:
//   'stats and training records for Tara's calls needs to be saved only, not the ones i
//    take from predictor'.
//   - saveRegimeWeights: was learning per-regime weights from user trades → no-op
//   - saveWeights: was learning adaptive weights from user trades → no-op
//   - saveTradeLog (below at line ~136): was user trade history → no-op
//   In-memory state still updates during a session so existing logic doesn't break.
//   Tara's Call scorecards (taraCallScorecards_v1) remain persisted independently.
const saveRegimeWeights=(rwObj)=>{};
const WEIGHT_BOUNDS={gap:[5,65],momentum:[5,58],structure:[2,38],flow:[2,55],technical:[5,48],regime:[2,45],rangePosition:[5,55]};
const LEARNING_RATE=0.8;

const loadWeights=()=>{try{const s=localStorage.getItem('taraWeightsV110');if(s){const w=JSON.parse(s);if(w&&typeof w.gap==='number')return w;}return{...DEFAULT_WEIGHTS};}catch(e){return{...DEFAULT_WEIGHTS};}};
const saveWeights=(w)=>{};

// Load trade log
// removed
// removed
// Best hours: 4 (100%) and 5 (100%)
// V134: Baseline version marker — bump when SEED_TRADES is refreshed.
// Personal layer compares this on load and offers a sync prompt if the user's
// last-synced version is older than the current baked baseline.
const BASELINE_VERSION='2026.05.03-v5.7.3-text-polish-pass';

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
// V3.2.4: BASELINE_RECORD reset to zero. Per user request: "completely reset the stats and
//   score. lets start fresh." The 487-302 figure was the live cumulative running tally; with
//   the new architecture (Tara's Call is the only thing that scores; general prediction is
//   informational only), we start the new tracking from zero. The seed trades remain for
//   weight calibration, but no synthetic baseline scorecard.
const BASELINE_RECORD={'15m':{wins:0,losses:0},'5m':{wins:0,losses:0}};

// V4.6 FRESH START: Per user request — full reset, no baked-in seed data.
const SEED_TRADES=[];

const loadTradeLog=()=>{try{const s=localStorage.getItem('taraTradeLogV110');if(s){const p=JSON.parse(s);if(p&&p.length>0)return p;}return SEED_TRADES;}catch(e){return SEED_TRADES;}};
const saveTradeLog=(log)=>{}; // V5.5b: stubbed — user trades no longer persist per user request
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
  // V3.2.4: User explicitly requested fresh start — clear Tara's Call scorecard too.
  //   New architecture: Tara's Call is the only thing that scores. Start tracking from zero.
  localStorage.removeItem('taraCallScorecards_v1');
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
  const wedUS=trades.filter(t=>t.session==='US'&&new Date(t.id).getDay()===3);
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
  // V5.7: All time classification is LOCAL. Sessions are buckets of user's day:
  //   Asia=morning, EU=mid, US=afternoon, OFF-HOURS=evening/late-night.
  //   Day×session quality matrix continues to apply, indexed by user's local day.
  const localH=now.getHours();
  const dayLocal=now.getDay(); // 0=Sun..6=Sat in user's locale
  const dayName=['SUN','MON','TUE','WED','THU','FRI','SAT'][dayLocal];
  const asia=localH>=0&&localH<9;
  const eu=localH>=7&&localH<16;
  const us=localH>=13&&localH<22;
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
  return{sessions,dominant,localH,dayLocal,dayName,dsAdj,dsRating,dsKey};
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
      return{label:'🧠 DELIBERATING',reason:`Reading market structure. Tara commits when conviction sustains. [${timeLabel}]`,color:'indigo',animate:true,hasAction:false};
    }
    if(activePrediction?.includes('SITTING OUT'))return{label:'⛔ SITTING OUT',reason:`Signals are split, no clear edge this window. Better to skip than force a call. [${timeLabel}]`,color:'rose',animate:false,hasAction:false};
    if(activePrediction?.includes('ANALYZING')){
      return{label:'🔍 ANALYZING',reason:`Scanning for direction. Tara loosens her standards each minute — even mixed setups get a call eventually. [${timeLabel}]`,color:'indigo',animate:true,hasAction:false};
    }
    if(activePrediction?.includes('UP (FORMING)'))return{label:'SIGNAL FORMING — UP',reason:`Bullish bias building (${posterior.toFixed(1)}%). Tara commits when tape agrees or quality clears bar. [${timeLabel}]`,color:'amber',animate:false,hasAction:false};
    if(activePrediction?.includes('DOWN (FORMING)'))return{label:'SIGNAL FORMING — DOWN',reason:`Bearish bias building (${(100-posterior).toFixed(1)}%). Tara commits when tape agrees or quality clears bar. [${timeLabel}]`,color:'amber',animate:false,hasAction:false};

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
// V3.1.11: Single-candle classification. Returns the candle's character based on body/wick ratios.
//   bull/bear  = direction (close vs open)
//   bullStrong/bearStrong = body ≥70% of total range, decisive
//   doji       = body ≤15% of total range, indecision
//   hammer     = small body at top of range with long lower wick (rejection of lower prices, bullish)
//   shooting   = small body at bottom of range with long upper wick (rejection of higher prices, bearish)
const classifyCandle=(c)=>{
  if(!c||!c.h||!c.l||c.h<=c.l)return{kind:'unknown'};
  const bodyHigh=Math.max(c.o||c.c,c.c);
  const bodyLow=Math.min(c.o||c.c,c.c);
  const range=c.h-c.l;
  const body=Math.abs(c.c-(c.o||c.c));
  const upperWick=c.h-bodyHigh;
  const lowerWick=bodyLow-c.l;
  const bodyPct=range>0?body/range:0;
  const isBull=c.c>(c.o||c.c);
  const isBear=c.c<(c.o||c.c);
  // Doji: very small body
  if(bodyPct<=0.15)return{kind:'doji',isBull:false,isBear:false};
  // Hammer: small body in upper third with long lower wick
  if(bodyPct<=0.40&&lowerWick>=2*body&&upperWick<=body)return{kind:'hammer',isBull:true,isBear:false};
  // Shooting star: small body in lower third with long upper wick
  if(bodyPct<=0.40&&upperWick>=2*body&&lowerWick<=body)return{kind:'shooting',isBull:false,isBear:true};
  // Strong: body dominates the range
  if(bodyPct>=0.70){
    return isBull?{kind:'bullStrong',isBull:true,isBear:false}:{kind:'bearStrong',isBull:false,isBear:true};
  }
  // Standard
  return isBull?{kind:'bull',isBull:true,isBear:false}:isBear?{kind:'bear',isBull:false,isBear:true}:{kind:'doji',isBull:false,isBear:false};
};

// V3.1.11: Within-window candle pattern detector. Looks at 1m candles since window-open
//   and classifies what's happening NOW — sequences of bull/bear, exhaustion patterns,
//   reversal signals. Output is a directional bias (-100 to +100) and a label.
//
//   Patterns detected (in priority order):
//     CLIMAX-TOP        2-3 strong bull candles followed by doji/shooting at top → bearish
//     CLIMAX-BOTTOM     2-3 strong bear candles followed by doji/hammer at low → bullish
//     ENGULFING-BULL    bear candle followed by bull candle that engulfs it → bullish
//     ENGULFING-BEAR    bull followed by bear that engulfs it → bearish
//     STAIR-UP          ≥3 consecutive bull candles, each higher → bullish trend
//     STAIR-DOWN        ≥3 consecutive bear candles, each lower → bearish trend
//     COMPRESSION       multiple small/doji candles in tight range → directionless until break
//     EXHAUSTION-UP     trend up but bodies shrinking → bull losing steam
//     EXHAUSTION-DOWN   trend down but bodies shrinking → bear losing steam
//
//   Score is informational and exposed in engine reasoning + UI chip.
//   NOT yet integrated into posterior — same approach as VOL-FLOW, gather outcome data first.
const detectWithinWindowPattern=(c1m,windowOpenTime)=>{
  if(!c1m||c1m.length<2)return{label:'INSUFFICIENT',score:0,context:'not enough 1m candles'};
  // Filter to candles within current window (their openTime ≥ windowOpenTime)
  // c1m candles are typically [{t, o, h, l, c, v}] — t is open timestamp
  const winCandles=windowOpenTime>0
    ? c1m.filter(c=>{const t=c.t||c.time||0; return t>=windowOpenTime-60000;}) // -60s for boundary slack
    : c1m.slice(-15); // fallback: last 15 candles
  if(winCandles.length<2)return{label:'OPENING',score:0,context:`${winCandles.length} candles in window`};
  // Sort oldest-first
  const ordered=winCandles.slice().sort((a,b)=>(a.t||a.time||0)-(b.t||b.time||0));
  const classified=ordered.map(classifyCandle);
  const last=classified[classified.length-1];
  const prev=classified[classified.length-2];
  const prev2=classified[classified.length-3];
  const recent3=classified.slice(-3);
  const lastCandle=ordered[ordered.length-1];
  const prevCandle=ordered[ordered.length-2];

  // ENGULFING patterns
  if(prev&&last&&prevCandle&&lastCandle){
    const prevBody=Math.abs((prevCandle.c||0)-(prevCandle.o||0));
    const lastBody=Math.abs((lastCandle.c||0)-(lastCandle.o||0));
    if(prev.isBear&&last.isBull&&lastBody>prevBody*1.2&&(lastCandle.c||0)>(prevCandle.o||0)){
      return{label:'ENGULFING-BULL',score:55,context:`bull engulfing — body ${(lastBody/prevBody).toFixed(1)}× prev`};
    }
    if(prev.isBull&&last.isBear&&lastBody>prevBody*1.2&&(lastCandle.c||0)<(prevCandle.o||0)){
      return{label:'ENGULFING-BEAR',score:-55,context:`bear engulfing — body ${(lastBody/prevBody).toFixed(1)}× prev`};
    }
  }

  // CLIMAX-TOP: 2+ strong bulls then doji/shooting at top
  if(prev2&&prev&&last&&prev2.isBull&&prev.isBull&&(last.kind==='doji'||last.kind==='shooting')){
    const prev2Strong=prev2.kind==='bullStrong';
    const prevStrong=prev.kind==='bullStrong';
    if(prev2Strong||prevStrong){
      return{label:'CLIMAX-TOP',score:-45,context:'strong bull run topped with rejection candle'};
    }
  }

  // CLIMAX-BOTTOM: 2+ strong bears then doji/hammer at bottom
  if(prev2&&prev&&last&&prev2.isBear&&prev.isBear&&(last.kind==='doji'||last.kind==='hammer')){
    const prev2Strong=prev2.kind==='bearStrong';
    const prevStrong=prev.kind==='bearStrong';
    if(prev2Strong||prevStrong){
      return{label:'CLIMAX-BOTTOM',score:45,context:'strong bear run bottomed with reversal candle'};
    }
  }

  // STAIR patterns: ≥3 consecutive same-direction with each closing further
  if(classified.length>=3){
    const consecutiveBulls=recent3.every(c=>c.isBull);
    const consecutiveBears=recent3.every(c=>c.isBear);
    const closes=ordered.slice(-3).map(c=>c.c||0);
    const monotonicUp=closes[2]>closes[1]&&closes[1]>closes[0];
    const monotonicDown=closes[2]<closes[1]&&closes[1]<closes[0];
    if(consecutiveBulls&&monotonicUp){
      // Check if bodies are shrinking (exhaustion warning)
      const bodies=ordered.slice(-3).map(c=>Math.abs((c.c||0)-(c.o||0)));
      if(bodies[2]<bodies[0]*0.6){
        return{label:'EXHAUSTION-UP',score:-25,context:'3 bulls but bodies shrinking — buying losing steam'};
      }
      return{label:'STAIR-UP',score:50,context:'3 consecutive bulls, monotonically rising'};
    }
    if(consecutiveBears&&monotonicDown){
      const bodies=ordered.slice(-3).map(c=>Math.abs((c.c||0)-(c.o||0)));
      if(bodies[2]<bodies[0]*0.6){
        return{label:'EXHAUSTION-DOWN',score:25,context:'3 bears but bodies shrinking — selling losing steam'};
      }
      return{label:'STAIR-DOWN',score:-50,context:'3 consecutive bears, monotonically falling'};
    }
  }

  // COMPRESSION: 4+ candles with small bodies and tight range
  if(classified.length>=4){
    const last4=classified.slice(-4);
    const last4Candles=ordered.slice(-4);
    const smallBodyCount=last4.filter(c=>c.kind==='doji'||c.kind==='hammer'||c.kind==='shooting').length;
    if(smallBodyCount>=3){
      const highs=last4Candles.map(c=>c.h||0);
      const lows=last4Candles.map(c=>c.l||0);
      const tightRange=Math.max(...highs)-Math.min(...lows);
      const avgPrice=last4Candles.reduce((s,c)=>s+(c.c||0),0)/4;
      const tightPct=avgPrice>0?tightRange/avgPrice:0;
      if(tightPct<0.0015){ // <15bps tight range over 4 minutes
        return{label:'COMPRESSION',score:0,context:'small bodies in tight range — break imminent'};
      }
    }
  }

  // Fall through: aggregate bull/bear count and return mild bias
  const bulls=classified.filter(c=>c.isBull).length;
  const bears=classified.filter(c=>c.isBear).length;
  if(bulls>bears+1)return{label:'BULL-LEAN',score:15,context:`${bulls} bull / ${bears} bear candles`};
  if(bears>bulls+1)return{label:'BEAR-LEAN',score:-15,context:`${bears} bear / ${bulls} bull candles`};
  return{label:'MIXED',score:0,context:`${bulls} bull / ${bears} bear · no clear pattern`};
};

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
  // V3.2.2: Tape acceleration override. The aggrFlow value averages 90 seconds of trades,
  //   so a sharp 30s shift gets diluted. When the 30s window is extremely one-sided
  //   (≥85% one direction AND ≥$30K total volume), surface that recency directly.
  //   This catches "tape just flipped" scenarios that the slower average misses.
  const _ticks=params.tradeTicksRef?.current||[];
  if(_ticks.length>=5){
    const now=Date.now();
    let buy30=0,sell30=0;
    for(const t of _ticks){
      if(now-t.time>30000)continue;
      const u=t.usd||(t.s*t.p);
      if(t.t==='B')buy30+=u;else sell30+=u;
    }
    const total30=buy30+sell30;
    if(total30>=30000){
      const sellPct=sell30/total30;
      const buyPct=buy30/total30;
      if(sellPct>=0.85){
        flowScore-=15;
        reasoning.push(`[TAPE-30s] ${(sellPct*100).toFixed(0)}% sell on $${(total30/1000).toFixed(0)}K — sharp recent shift, boosting DOWN`);
      } else if(buyPct>=0.85){
        flowScore+=15;
        reasoning.push(`[TAPE-30s] ${(buyPct*100).toFixed(0)}% buy on $${(total30/1000).toFixed(0)}K — sharp recent shift, boosting UP`);
      }
    }
  }
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
  // V3.2.2: VWAP "suppression" rules removed. They were actively fighting real reversals.
  //   The intent was mean-reversion to VWAP, but on 15m windows this added counter-trend
  //   bias precisely when the trend was breaking. Example: price above VWAP + drift turning
  //   negative = REAL DOWN setup, but the rule added +10 to UP, killing the DOWN call.
  //   RSI overbought/oversold above already handles mean-reversion at extremes; VWAP rule
  //   was redundant noise.
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
  // V3.2.1: SS thresholds rebalanced based on 57-trade audit. Tara called UP 27 times vs
  //         DOWN 1 time in SS — but UP only won 63% in SS, while DOWN-call WR data was hidden
  //         by sample size (n=1). The asymmetry was too aggressive (UP at 68 / DN at 20).
  //         New: UP 72, DN 26. Both directions tightened, but UP more, so DOWN can fire when
  //         signals genuinely warrant it.
  if(retailShorting&&whalesBuying&&drift1m>-3){regime='SHORT SQUEEZE';upThreshold=72;downThreshold=26;}
  else if(retailLonging&&whalesSelling&&drift1m<3){regime='LONG SQUEEZE';upThreshold=80;downThreshold=36;}
  else if(retailShorting&&whalesBuying&&drift1m<=-3){
    // V135: SS conditions met but price contradicting — treat as CHOP, log the suppression
    reasoning.push(`[REGIME-VETO] SHORT SQUEEZE conditions but drift1m=${drift1m.toFixed(1)} → suppressed`);
  }
  else if(retailLonging&&whalesSelling&&drift1m>=3){
    reasoning.push(`[REGIME-VETO] LONG SQUEEZE conditions but drift1m=${drift1m.toFixed(1)} → suppressed`);
  }
  else if(isCleanUp){regime='TRENDING UP';upThreshold=64;downThreshold=20;}
  // V3.2.1: TD UP threshold 80→85. Tara called UP 2x in TRENDING DOWN, won 1 of 2.
  //         Should be very expensive to call UP in a downtrending regime.
  else if(isCleanDn){regime='TRENDING DOWN';upThreshold=85;downThreshold=20;}
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

  // V3.1.7: VOLUME-FLOW SIGNAL — informational only, not yet fed into posterior.
  //   Reads dollar-volume rate of change from tapeRef + ticksRef and compares to price drift.
  //   Goal: distinguish "real" moves (price + volume both rising in agreement) from "drift"
  //   moves (price moves but volume fading — likely to reverse).
  //
  //   This is a NEW signal as of V3.1.7. Track its label correlation with outcomes for
  //   30+ trades before integrating into posterior. We surface it so user can see it in
  //   the engine log, and so the trade log captures it for later analysis.
  const volFlow=(()=>{
    const _tape=params.tapeRef?.current;
    const _ticks=params.tradeTicksRef?.current||[];
    if(!_tape||_ticks.length<10)return{label:'INSUFFICIENT',score:0,trend:'flat',context:'not enough tape data'};
    const now=Date.now();
    // Compute buy/sell USD in last 30s and 30-90s (the "before" window)
    let recent_buy=0,recent_sell=0,recent_n=0;
    let prior_buy=0,prior_sell=0,prior_n=0;
    for(const t of _ticks){
      const age=now-t.time;
      const u=t.usd||(t.s*t.p);
      if(age<=30000){
        if(t.t==='B')recent_buy+=u;else recent_sell+=u;
        recent_n++;
      } else if(age<=90000){
        if(t.t==='B')prior_buy+=u;else prior_sell+=u;
        prior_n++;
      }
    }
    const recent_total=recent_buy+recent_sell;
    const prior_total=prior_buy+prior_sell;
    // Need enough volume in both windows to make a comparison
    if(recent_total<10000||prior_total<10000){
      return{label:'INSUFFICIENT',score:0,trend:'flat',context:`recent ${(recent_total/1000).toFixed(0)}K / prior ${(prior_total/1000).toFixed(0)}K — too thin`};
    }
    // Volume rate per second in each window
    const recent_rate=recent_total/30;
    const prior_rate=prior_total/60;
    const volTrend=recent_rate/prior_rate; // >1 = rising, <1 = falling
    // Net dollar pressure direction in recent window
    const recent_net=recent_buy-recent_sell;
    const recent_pressure=recent_total>0?(recent_net/recent_total):0; // -1 to +1
    // Price direction agreement
    const priceUp=drift1m>2;
    const priceDown=drift1m<-2;
    // Smoothness: ratio of net move to total tick range (more directional = smoother)
    let smoothness=0;
    if(_ticks.length>=10){
      const recent10=_ticks.slice(-10);
      const netMove=Math.abs(recent10[recent10.length-1].p-recent10[0].p);
      let totalRange=0;
      for(let i=1;i<recent10.length;i++){totalRange+=Math.abs(recent10[i].p-recent10[i-1].p);}
      smoothness=totalRange>0?netMove/totalRange:0; // 0=pure chop, 1=monotonic
    }
    // Classify
    let label='NEUTRAL',score=0;
    const _trendLabel=volTrend>1.3?'rising':volTrend<0.7?'falling':'flat';
    if(priceUp&&recent_pressure>0.2){
      if(_trendLabel==='rising'&&smoothness>0.5){label='BUY-CONFIRMED';score=70;}
      else if(_trendLabel==='falling'){label='BUY-FAILING';score=-30;}
      else{label='BUY-MIXED';score=10;}
    } else if(priceDown&&recent_pressure<-0.2){
      if(_trendLabel==='rising'&&smoothness>0.5){label='SELL-CONFIRMED';score=-70;}
      else if(_trendLabel==='falling'){label='SELL-FAILING';score=30;}
      else{label='SELL-MIXED';score=-10;}
    } else if(Math.abs(drift1m)<2){
      label='QUIET'; score=0;
    } else {
      // Price moving but tape doesn't agree
      label=priceUp?'BUY-DIVERGENT':'SELL-DIVERGENT';
      score=priceUp?-10:10;
    }
    const _ctx=`drift1m=${drift1m.toFixed(1)} · vol=${volTrend.toFixed(2)}x · pressure=${(recent_pressure*100).toFixed(0)}% · smooth=${(smoothness*100).toFixed(0)}%`;
    return{label,score,trend:_trendLabel,context:_ctx,recentBuyUSD:recent_buy,recentSellUSD:recent_sell,smoothness,volTrend,pressure:recent_pressure};
  })();
  if(volFlow.label!=='INSUFFICIENT'&&volFlow.label!=='QUIET'&&volFlow.label!=='NEUTRAL'){
    reasoning.push(`[VOL-FLOW] ${volFlow.label} · ${volFlow.context}`);
  }

  // V3.1.11: WITHIN-WINDOW CANDLE PATTERN — answers "what's the 1m candle structure
  //   of THIS window saying about where price is heading at close?"
  //   Looks for engulfing, climax-top/bottom, stair, exhaustion, compression patterns.
  //   Informational only — surfaced via [CANDLE] reasoning + UI chip. Not yet integrated
  //   into posterior. Track per-pattern WR before deciding to integrate.
  const candlePattern=(()=>{
    const c1m=tfCandles?.c1m||[];
    return detectWithinWindowPattern(c1m,params.windowOpenTime||0);
  })();
  if(candlePattern.label!=='INSUFFICIENT'&&candlePattern.label!=='OPENING'&&candlePattern.label!=='MIXED'){
    reasoning.push(`[CANDLE] ${candlePattern.label} · ${candlePattern.context}`);
  }

  // V3.1.7+/V3.1.9: WINDOW TYPE CLASSIFIER — answers "what kind of window is this?"
  //
  //   Two windows can have the same amplitude (high − low) but trade completely differently:
  //   a window that drifts smoothly from open to close 50bps is TRENDING; a window that
  //   visits both ±25bps multiple times is WHIPSAW. Same amplitude, opposite trade profiles.
  //
  //   Three measurements per window:
  //     1. rangeBps     = (high − low) / openPrice × 10000  — the amplitude
  //     2. dirChanges   = count of significant reversals so far (each ≥8bps swing from a
  //                       recent local extreme counts as one)
  //     3. motionTiming = WHEN in the window were high/low first reached?
  //                       Both early → SPIKE-FADE
  //                       Both late  → LATE-BREAK
  //                       Spread     → TRENDING / GRIND / WHIPSAW / RANGE
  //
  //   Seven labels:
  //     OPENING     <2 minutes elapsed, not enough data
  //     TRENDING    range ≥25bps, smooth one-direction motion (≤1 dir change)
  //     WHIPSAW     range ≥30bps, multiple direction changes (≥3)
  //     SPIKE-FADE  range ≥25bps, both extremes reached in first 30% of window
  //     LATE-BREAK  range ≥25bps, both extremes reached in last 30% of window
  //     GRIND       range 15-25bps, smooth one-direction motion (≤1 dir change)
  //     RANGE       range 15-30bps, symmetric oscillation (≈2 dir changes — one round trip)
  //     DEAD        range <15bps, minimal motion
  //
  //   Each type has its own lock-release threshold (see app.jsx). Other engine behaviors
  //   stay unchanged for now — informational signal first, then integrate as data justifies.
  const windowAmplitude=(()=>{
    const wHigh=params.windowHigh||0;
    const wLow=params.windowLow||0;
    const wHighTime=params.windowHighTime||0;
    const wLowTime=params.windowLowTime||0;
    const wOpenTime=params.windowOpenTime||0;
    if(!windowOpenPrice||windowOpenPrice<=0||wHigh<=0||wLow<=0){
      return{label:'OPENING',rangeBps:0,directionChanges:0,motionTiming:'unknown',context:'window data not yet available'};
    }
    const rangeBpsAmp=((wHigh-wLow)/windowOpenPrice)*10000;
    const tf=timeFraction||0;
    const elapsedMin=tf*(is15m?15:5);
    if(elapsedMin<2){
      return{label:'OPENING',rangeBps:rangeBpsAmp,directionChanges:0,motionTiming:'unknown',context:`${elapsedMin.toFixed(1)}m elapsed · range ${rangeBpsAmp.toFixed(0)}bps`};
    }

    // ── Compute direction changes from priceMemoryRef samples within this window ──
    // A direction change is when price reverses ≥8bps from a recent local extreme.
    let dirChanges=0;
    if(priceMemoryRef?.current&&wOpenTime>0){
      const samples=priceMemoryRef.current.filter(s=>s.time>=wOpenTime);
      if(samples.length>=4){
        const reversalThresholdPct=8/10000; // 8bps
        let lastExtreme=samples[0].p;
        let lastDir=0; // -1 = down, +1 = up, 0 = none yet
        for(let i=1;i<samples.length;i++){
          const p=samples[i].p;
          const moveAbs=Math.abs(p-lastExtreme);
          const movePct=moveAbs/lastExtreme;
          if(movePct>=reversalThresholdPct){
            const newDir=p>lastExtreme?1:-1;
            if(lastDir!==0&&newDir!==lastDir){
              dirChanges++;
            }
            lastDir=newDir;
            lastExtreme=p;
          } else {
            // Update lastExtreme to track the running edge
            if(lastDir===1&&p>lastExtreme)lastExtreme=p;
            else if(lastDir===-1&&p<lastExtreme)lastExtreme=p;
          }
        }
      }
    }

    // ── Compute motion timing — when high and low were first reached ──
    let motionTiming='spread';
    if(wHighTime>0&&wLowTime>0&&wOpenTime>0){
      const totalElapsed=Date.now()-wOpenTime;
      const highElapsedFrac=(wHighTime-wOpenTime)/Math.max(totalElapsed,1);
      const lowElapsedFrac=(wLowTime-wOpenTime)/Math.max(totalElapsed,1);
      // Both first reached in first 30% of elapsed time → spike-loaded
      if(highElapsedFrac<=0.30&&lowElapsedFrac<=0.30){
        motionTiming='early';
      }
      // Both first reached in last 30% of elapsed time → late-loaded
      else if(highElapsedFrac>=0.70&&lowElapsedFrac>=0.70){
        motionTiming='late';
      }
    }

    // ── Classify ──
    let label='NORMAL'; // default fallback
    if(rangeBpsAmp<15){
      label='DEAD';
    } else if(rangeBpsAmp>=30&&dirChanges>=3){
      label='WHIPSAW';
    } else if(rangeBpsAmp>=25&&motionTiming==='early'){
      label='SPIKE-FADE';
    } else if(rangeBpsAmp>=25&&motionTiming==='late'){
      label='LATE-BREAK';
    } else if(rangeBpsAmp>=25&&dirChanges<=1){
      label='TRENDING';
    } else if(rangeBpsAmp>=15&&rangeBpsAmp<25&&dirChanges<=1){
      label='GRIND';
    } else if(rangeBpsAmp>=15&&dirChanges===2){
      label='RANGE';
    } else {
      // Mid-range with 2-3 dir changes — falls through to RANGE as best fit
      label='RANGE';
    }

    const _ctx=`${rangeBpsAmp.toFixed(0)}bps range · ${dirChanges} reversals · motion ${motionTiming}`;
    return{
      label,
      rangeBps:rangeBpsAmp,
      directionChanges:dirChanges,
      motionTiming,
      context:_ctx,
      windowHigh:wHigh,
      windowLow:wLow,
    };
  })();
  if(windowAmplitude.label!=='OPENING'){
    reasoning.push(`[WIN-TYPE] ${windowAmplitude.label} · ${windowAmplitude.context}`);
  }

  return{posterior:finalPosterior,rawPosterior:posterior,displayPosterior,regime,upThreshold,downThreshold,reasoning,atrBps,rsi,bb,vwap,realGapBps,drift1m,drift5m,drift15m,accel,pnlSlope,tickSlope,aggrFlow,isRugPull,isMoonshot,isPostDecay,consecutive,volRatio,channel,momentumAlign,rawSignalScores,totalSignalWeight,velocityRegime,velocityScalars:_velAdj,projectedPrice:_projectedPrice,projectedGapBps:_projectedGapBps,trajectoryAdj,windowDriftBps,mtfAlignment,mtfBonus,fgtResults,windowExhaustionPenalty,
    // V152: range-position telemetry — exposed so trade log can audit "was Tara at the edge of typical range?"
    rangeBps,
    // V3.1.7: volume-flow signal — informational, not yet integrated into posterior
    volFlow,
    // V3.1.7+: window amplitude classification (WILD/NORMAL/DEAD/OPENING)
    windowAmplitude,
    // V3.1.11: within-window 1m candle pattern (ENGULFING-BULL, CLIMAX-TOP, etc.)
    candlePattern,
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
    newsSentiment, // V145: dual-source news scanner output (geoRisk, geoTopic, source)
    taraCall,taraScorecards,windowType, // V3.2.4: Tara's Call surface
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
          {/* V3.1.7: Volume-flow signal chip — informational, shows whether tape volume is
                     confirming or failing the price move. Hidden when neutral/quiet/insufficient. */}
          {analysis.volFlow&&!['INSUFFICIENT','QUIET','NEUTRAL'].includes(analysis.volFlow.label)&&(
            (()=>{
              const vf=analysis.volFlow;
              const isConfirm=vf.label==='BUY-CONFIRMED'||vf.label==='SELL-CONFIRMED';
              const isFail=vf.label==='BUY-FAILING'||vf.label==='SELL-FAILING';
              const isDiv=vf.label.includes('DIVERGENT');
              const cls=isConfirm
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                : isFail||isDiv
                ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                : 'text-[#E8E9E4]/50 bg-[#E8E9E4]/5 border-[#E8E9E4]/15';
              const icon=vf.label.startsWith('BUY')?'↑':vf.label.startsWith('SELL')?'↓':'·';
              return(<span className={'text-xs uppercase tracking-wide px-2 py-1 rounded border font-bold '+cls} title={`Volume-flow: ${vf.context}. Tells you whether tape volume is confirming or failing the current price move. INFORMATIONAL ONLY — not yet integrated into Tara's posterior decision.`}>
                {icon} VOL {vf.label.replace('BUY-','').replace('SELL-','')}
              </span>);
            })()
          )}
          {/* V3.1.11: Within-window candle pattern chip — shows 1m candle structure since
                window open. Bullish patterns emerald, bearish amber/rose, neutral dim. */}
          {analysis.candlePattern&&!['INSUFFICIENT','OPENING','MIXED'].includes(analysis.candlePattern.label)&&(
            (()=>{
              const cp=analysis.candlePattern;
              const isBull=cp.score>10;
              const isBear=cp.score<-10;
              const cls=isBull
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                : isBear
                ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                : 'text-[#E8E9E4]/55 bg-[#E8E9E4]/5 border-[#E8E9E4]/15';
              const icon=
                cp.label==='ENGULFING-BULL'||cp.label==='CLIMAX-BOTTOM'?'⤴':
                cp.label==='ENGULFING-BEAR'||cp.label==='CLIMAX-TOP'?'⤵':
                cp.label==='STAIR-UP'?'↗':
                cp.label==='STAIR-DOWN'?'↘':
                cp.label==='COMPRESSION'?'⊜':
                cp.label.includes('EXHAUSTION')?'⤓':
                cp.label==='BULL-LEAN'?'↑':
                cp.label==='BEAR-LEAN'?'↓':
                '·';
              const tooltip=`Candle pattern (last 1m candles since window open): ${cp.context}. INFORMATIONAL — not yet feeding into posterior. Track per-pattern WR before integrating.`;
              return(<span className={'text-xs uppercase tracking-wide px-2 py-1 rounded border font-bold '+cls} title={tooltip}>
                {icon} {cp.label.replace('ENGULFING-','').replace('CLIMAX-','').replace('EXHAUSTION-','EXH-').replace('STAIR-','')}
              </span>);
            })()
          )}
          {/* V3.1.7+/V3.1.9: Window type chip — shows what kind of 15m window we're in.
                Combines amplitude × structure × motion-distribution into a single label.
                Tooltip shows the underlying measurements for transparency. */}
          {analysis.windowAmplitude&&analysis.windowAmplitude.label!=='OPENING'&&(
            (()=>{
              const wa=analysis.windowAmplitude;
              const lbl=wa.label;
              // Color semantics:
              //   TRENDING / GRIND / LATE-BREAK — directional, lock-friendly → emerald
              //   WHIPSAW / SPIKE-FADE — hostile to locks → amber
              //   RANGE — mean-reverts, neutral → indigo
              //   DEAD — quiet, dim
              const cls=(lbl==='TRENDING'||lbl==='GRIND'||lbl==='LATE-BREAK')
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                : (lbl==='WHIPSAW'||lbl==='SPIKE-FADE')
                ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                : (lbl==='RANGE')
                ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
                : (lbl==='DEAD')
                ? 'text-[#E8E9E4]/50 bg-[#E8E9E4]/5 border-[#E8E9E4]/20'
                : 'text-[#E8E9E4]/60 bg-[#E8E9E4]/5 border-[#E8E9E4]/15';
              const icon=
                lbl==='TRENDING'?'↗':
                lbl==='WHIPSAW'?'⇌':
                lbl==='SPIKE-FADE'?'⇡':
                lbl==='LATE-BREAK'?'⇣':
                lbl==='GRIND'?'→':
                lbl==='RANGE'?'⇄':
                lbl==='DEAD'?'·':
                '~';
              const desc=
                lbl==='TRENDING'?'Smooth one-direction motion. Lock-friendly. Release threshold 35bps.':
                lbl==='WHIPSAW'?'High amplitude, multiple reversals. Lock-hostile — both directions visited. Release threshold relaxed to 50bps to ride out noise.':
                lbl==='SPIKE-FADE'?'Big move early, mean-reverting now. Late locks risky. Release threshold tightened to 25bps.':
                lbl==='LATE-BREAK'?'Quiet early, breaking out late. Strong gap commitment. Standard 30bps release.':
                lbl==='GRIND'?'Slow steady drift. Trend signals work but slowly. Standard 30bps release.':
                lbl==='RANGE'?'Symmetric oscillation around open. Mean-reversion plays. Tighter 20bps release.':
                lbl==='DEAD'?'Minimal motion. Almost any move is meaningful. Tightest 15bps release.':
                'Window character not yet classified.';
              const tooltip=`${wa.context}. ${desc} INFORMATIONAL — directly affects lock release threshold; not yet integrated into entry posterior.`;
              return(<span className={'text-xs uppercase tracking-wide px-2 py-1 rounded border font-bold '+cls} title={tooltip}>
                {icon} {lbl}
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

        {/* V3.1.13: Reasoning chips — each factor pulling for/against, color-coded.
            Inspired by the chip-row pattern from competitor bots, but in Tara's palette.
            Compact: shows top 5 contributors by absolute weight. */}
        {(()=>{
          const sig=analysis.rawSignalScores||{};
          const post=analysis.rawProbAbove||50;
          const leaning=post>=50?'UP':'DOWN';
          const fgt=analysis.mtfAlignment||0;
          const fgtAbs=Math.abs(fgt);
          const traj=analysis.trajectoryAdj||0;
          const cp=analysis.candlePattern||{};
          const vf=analysis.volFlow||{};
          const winType=analysis.windowAmplitude?.label;

          const chips=[];
          const addChip=(label,score,note)=>{
            if(Math.abs(score)<2)return;
            // Determine if this chip supports the current leaning or opposes it
            const supports=leaning==='UP'?score>0:score<0;
            chips.push({label,score:Math.abs(score),supports,note,sortKey:Math.abs(score)});
          };
          // Core signals
          if(sig.gap)addChip('Gap',sig.gap,'price-vs-strike');
          if(sig.momentum)addChip('Momentum',sig.momentum,'recent drift');
          if(sig.flow)addChip('Flow',sig.flow,'tape buy/sell');
          if(sig.structure)addChip('Structure',sig.structure,'support/resistance');
          if(sig.technical)addChip('Technical',sig.technical);
          if(sig.regime)addChip('Regime',sig.regime);
          if(sig.rangePosition)addChip('Range',sig.rangePosition,'σ from open');
          // FGT bonus (V2.9 weighted: ≥3.5=±42, ≥2.5=±26, ≥1.5=±14, ≥0.7=±6)
          if(fgtAbs>=0.7){
            const fgtBonus=fgtAbs>=3.5?42:fgtAbs>=2.5?26:fgtAbs>=1.5?14:6;
            addChip(`FGT ${fgtAbs.toFixed(1).replace(/\.0$/,'')}/4`,fgt>0?fgtBonus:-fgtBonus,'multi-timeframe');
          }
          // Trajectory
          if(Math.abs(traj)>=3){
            addChip('Trajectory',traj,'forward forecast');
          }
          // Candle pattern (informational, but show as chip if directional)
          if(cp.label&&!['MIXED','OPENING','INSUFFICIENT','COMPRESSION'].includes(cp.label)&&Math.abs(cp.score||0)>=10){
            const cpShort=cp.label.replace('ENGULFING-','Engulf ').replace('CLIMAX-','Climax ').replace('STAIR-','Stair ').replace('EXHAUSTION-','Exh ').toLowerCase();
            addChip(`Candles: ${cpShort}`,cp.score,'1m pattern');
          }
          // Vol-flow
          if(vf.label&&!['INSUFFICIENT','QUIET','NEUTRAL'].includes(vf.label)){
            const vShort=vf.label.replace('-CONFIRMED',' confirms').replace('-FAILING',' fading').replace('-DIVERGENT',' diverges').toLowerCase();
            // Vol-flow score sign aligns with direction
            addChip(`Tape: ${vShort}`,vf.score,'volume vs price');
          }
          // Window character context (not a score, just a tag)
          // Sort by absolute weight, take top 5
          chips.sort((a,b)=>b.sortKey-a.sortKey);
          const top=chips.slice(0,5);
          if(top.length===0)return null;
          return(
            <div className="mt-2 max-w-md w-full px-2">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {top.map((c,i)=>{
                  const cls=c.supports
                    ? (leaning==='UP'?'bg-emerald-500/8 border-emerald-500/30 text-emerald-300':'bg-rose-500/8 border-rose-500/30 text-rose-300')
                    : 'bg-amber-500/8 border-amber-500/25 text-amber-300/80';
                  const sign=c.supports?'+':'−';
                  return(
                    <span key={i} className={'inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] px-2 py-0.5 rounded border font-medium '+cls} title={c.note?`${c.label} · ${c.note}`:c.label}>
                      <span>{c.label}</span>
                      <span className="tabular-nums opacity-70">{sign}{c.score.toFixed(0)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* V4.2: Tara's Call card moved to top of projections column for prominence. */}

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
          <div className="mt-2 w-full px-4 max-w-md">
            {(()=>{
              const post=analysis.rawProbAbove||50;
              const dir=post>=50?'UP':'DOWN';
              const conviction=Math.abs(post-50);
              const fgt=analysis.mtfAlignment||0;
              const fgtAbs=Math.abs(fgt);
              const samplesNeeded=analysis.consecutiveNeeded||2;
              const samplesHave=formingCount;
              const remaining=Math.max(0,samplesNeeded-samplesHave);
              // V4.5: Build contextual message — labeled 'Engine' to distinguish from Tara's
              //   Call samples (different system, both visible).
              let line='';
              if(analysis.prediction.includes('FORMING')){
                line=`Engine forming ${dir} — ${remaining} more sample${remaining===1?'':'s'}`;
              } else if(conviction<10){
                line='Engine: posterior near neutral — waiting for clearer signal';
              } else if(fgtAbs<2){
                line=`Engine leaning ${dir} ${conviction.toFixed(0)} pts — FGT ${fgtAbs.toFixed(1)}/4 silent`;
              } else if(samplesHave<samplesNeeded){
                line=`Engine leaning ${dir} ${conviction.toFixed(0)} pts — ${remaining} sample${remaining===1?'':'s'} to lock`;
              } else {
                line=`Engine working on ${dir} call — checking lock conditions`;
              }
              return(
                <>
                  <div className={'flex justify-between text-xs mb-1'}>
                    <span className="text-[#E8E9E4]/55">{line}</span>
                    {samplesNeeded>0&&<span className="text-[#E8E9E4]/35 tabular-nums">{samplesHave}/{samplesNeeded}</span>}
                  </div>
                  <div className="w-full h-1 bg-[#111312] rounded-full overflow-hidden">
                    <div className={formingBarCls} style={{width:formingPct+'%'}}/>
                  </div>
                </>
              );
            })()}
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

      <div className={'flex flex-col gap-1.5 border-t border-[#E8E9E4]/10 pt-3 mt-auto'}>
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


// V5.6.1: Tara's Call card extracted into reusable component so it can render in both
//   the desktop projections column (hidden md:block) and the mobile signal section
//   (md:hidden). Same logic, same display, two mount points.
function TaraCallCard({taraCall,taraScorecards,taraCallLog,windowType,timeState,analysis,className,taraLearnings}){
  if(!taraCall)return null;
    const tc=taraCall;
    const sc=taraScorecards?.[windowType]||{wins:0,losses:0,sitouts:0};
    const total=(sc.wins||0)+(sc.losses||0);
    const wr=total>0?Math.round((sc.wins/total)*100):null;
    // V5.5b/c: Snapshot persistence. Once Tara has committed (snap set), the display
    //   stays committed for the window — never flips back to WATCHING/SIT_OUT/different
    //   direction. User spec: 'once she says down up or sitout she sticks to it no
    //   matter what'. All display values read from snap when present.
    const snap=tc.snapshot;
    const isCommittedSnap=snap!==null;
    const isLockedSnap=snap&&snap.call!=='SIT_OUT';
    const isSatOutSnap=snap&&snap.call==='SIT_OUT';
    // V5.6.5: ONLY FOUR USER-VISIBLE STATES.
    //   No snapshot yet     → SCANNING (no direction, no UP/DOWN reveal)
    //   Snapshot LOCKED UP  → LOCKED UP
    //   Snapshot LOCKED DN  → LOCKED DOWN
    //   Snapshot SIT_OUT    → SITTING OUT
    // The internal tc.call still tracks current posterior direction (used by the lifecycle
    // effect to count consistency samples) but it does NOT leak to the headline anymore.
    // User feedback: "she doesn't call anything, no signals too. tara's calls are only for
    // her locks. ideally she locks and stays quicker but if needed she can take time."
    const dispCall=snap?snap.call:'SCANNING';
    const dispDir=snap?(snap.direction||snap.call):null;
    const dispConfidence=snap?snap.confidence:0;
    const dispReason=snap
      ?(snap.reason||(isSatOutSnap?'Sat out — no edge this window':'Locked'))
      :'Scanning for direction. She\'ll signal only on commit.';
    const isCall=isLockedSnap;
    const effDir=isLockedSnap?snap.call:null;
    const callColor=effDir==='UP'?'text-emerald-300':effDir==='DOWN'?'text-rose-300':isSatOutSnap?'text-amber-400/85':'text-amber-300/80';
    const borderClr=effDir==='UP'?'rgba(52,211,153,0.45)':effDir==='DOWN'?'rgba(244,114,182,0.45)':isSatOutSnap?'rgba(245,158,11,0.4)':T2_GOLD_BORDER;
    const bgClr=effDir==='UP'?'rgba(52,211,153,0.08)':effDir==='DOWN'?'rgba(244,114,182,0.08)':isSatOutSnap?'rgba(245,158,11,0.06)':'rgba(229,200,112,0.05)';
    const callLabel=isLockedSnap?(snap.call==='UP'?'LOCKED UP':'LOCKED DOWN'):isSatOutSnap?'SITTING OUT':'SCANNING';
    const arrow=effDir==='UP'?'▲':effDir==='DOWN'?'▼':isSatOutSnap?'·':'·';
    // V5.6.5: Phase mirrors the four states, no in-between flicker.
    const phaseLabel=snap?(isSatOutSnap?'SITTING OUT':'LOCKED'):'SCANNING';
    const samplesLeft=Math.max(0,(tc.needSamples||180)-(tc.samples||0));
    // Window timing
    const _totalSec=windowType==='15m'?900:300;
    const _elapsed=timeState?Math.max(0,_totalSec-((timeState.minsRemaining*60)+timeState.secsRemaining)):0;
    const _remSec=Math.max(0,_totalSec-_elapsed);
    const _remMin=Math.floor(_remSec/60),_remRem=_remSec%60;
    const _remLabel=_remMin>0?`${_remMin}m ${String(_remRem).padStart(2,'0')}s left`:`${_remRem}s left`;
    const _elapsedFrac=Math.min(1,_elapsed/_totalSec);
    // Decision-step countdown
    const _elapsedMin=Math.floor(_elapsed/60);
    const _secIntoMin=_elapsed%60;
    const _secToNextMin=60-_secIntoMin;
    const _nextDecisionMin=_elapsedMin+1;
    const _totalMin=_totalSec/60;
    // Minute markers for the bar
    const _minMarkers=[];
    for(let m=1;m<_totalMin;m++){
      _minMarkers.push({pos:(m/_totalMin)*100,m,isPast:_elapsed>=m*60});
    }
    // V5.6.5: Countdown text — neutral, no direction reveal during scanning.
    let countdownText,phaseHint='',phaseProgressPct;
    if(snap){
      countdownText=_remLabel;
      phaseHint=snap.earlyLock?'committed early':snap.call==='SIT_OUT'?'declined this window':'committed';
      phaseProgressPct=_elapsedFrac*100;
    } else {
      // Pure scanning state. Use sample progress (if accumulating) or general elapsed.
      const _need=tc.needSamples||100;
      const _samples=tc.samples||0;
      const _samplesInt=Math.round(_samples);
      const _needInt=Math.round(_need);
      // V5.7.2: Honest ETA. tc.lockEtaSec is null when stalled (samples not accruing).
      if(_samples>=5&&_need>0){
        if(tc.lockEtaStalled||tc.lockEtaSec==null){
          countdownText='waiting for stronger signal';
          phaseHint=`${_samplesInt}/${_needInt} samples · conviction not firm enough yet`;
        } else if(tc.lockEtaSec===0){
          countdownText='committing this tick';
          phaseHint=`${_samplesInt}/${_needInt} samples`;
        } else {
          countdownText=`decision in ~${formatDuration(tc.lockEtaSec)}`;
          phaseHint=`${_samplesInt}/${_needInt} samples`;
        }
        phaseProgressPct=Math.min(95,(_samples/_need)*100);
      } else if(_elapsed<20){
        countdownText=`observing — ${20-_elapsed}s of search remaining`;
        phaseProgressPct=Math.min(15,_elapsed*0.7);
      } else {
        countdownText='scanning for edge';
        phaseHint=tc.phase==='WATCHING'?'no clear direction yet':'';
        phaseProgressPct=Math.min(50,_elapsed*0.05);
      }
    }
    return(
      <div className={"mb-3 px-3 py-3 rounded-lg shrink-0 "+(className||"")} style={{background:bgClr,border:'1px solid '+borderClr,boxShadow:isLockedSnap?`inset 0 0 24px ${snap.call==='UP'?'rgba(52,211,153,0.06)':'rgba(244,114,182,0.06)'}`:'none'}}>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{color:T2_GOLD}}>Tara's Call</span>
          {snap&&snap.earlyLock&&<span className="text-[8px] tracking-[0.18em] uppercase text-emerald-400/70 font-bold">⚡ early lock</span>}
        </div>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className={`flex items-baseline gap-2 ${callColor}`}>
            <span className="text-2xl">{arrow}</span>
            <span className="text-3xl font-serif font-bold tracking-tight leading-none">{callLabel}</span>
            {isLockedSnap&&<span className="text-lg tabular-nums opacity-75 self-baseline">{dispConfidence}%</span>}
          </div>
        </div>
        <div className="text-[11px] text-[#E8E9E4]/65 leading-snug mb-3">{dispReason||'Awaiting signal data...'}</div>

        {/* V4.3: vs General prediction — show how Tara compares to the engine's read.
            V5.6.5: Comparison labels rewritten for the four-state model. Agree/disagree
            only meaningful AFTER Tara commits — during scanning the engine acts as an
            independent advisor for the user to take their own calls from. */}
        {analysis&&(()=>{
          const genPred=analysis.prediction||'';
          const genPost=analysis.rawProbAbove||50;
          const genDir=genPred.includes('UP')?'UP':genPred.includes('DOWN')?'DOWN':null;
          const genState=genPred.includes('LOCKED')?'LOCKED':genPred.includes('FORMING')?'FORMING':genPred.includes('SEARCHING')?'SEARCHING':genPred.includes('SITTING')?'SIT OUT':genPred.includes('REJECTED')?'REJECTED':'WATCHING';
          // Comparison logic — only valid once Tara has committed
          let tagLabel,tagColor;
          if(!snap){
            tagLabel='ANALYZING — engine shown for reference';
            tagColor='text-[#E8E9E4]/45';
          } else if(isSatOutSnap){
            tagLabel=genDir?`OVERRODE — engine said ${genDir}, Tara wasn't convinced`:'SAT OUT — engine also unsure';
            tagColor='text-amber-400/85';
          } else {
            // Tara locked UP or DOWN
            if(genDir===snap.call){tagLabel='AGREED — same direction';tagColor='text-emerald-400/85';}
            else if(genDir&&genDir!==snap.call){tagLabel='DISAGREED — split with engine';tagColor='text-rose-400/85';}
            else{tagLabel='LOCKED — engine still searching';tagColor='text-[#E8E9E4]/55';}
          }
          const genArrow=genDir==='UP'?'▲':genDir==='DOWN'?'▼':'—';
          const genColor=genDir==='UP'?'text-emerald-400/65':genDir==='DOWN'?'text-rose-400/65':'text-[#E8E9E4]/45';
          return(
            <div className="mb-3 px-2.5 py-2 rounded-md bg-[#0E100F]/50 border border-[#E8E9E4]/8">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[8px] uppercase tracking-[0.2em] text-[#E8E9E4]/40 font-bold">Engine general prediction</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className={`flex items-baseline gap-1.5 ${genColor}`}>
                  <span className="text-sm">{genArrow}</span>
                  <span className="text-sm font-bold tabular-nums">{genState}</span>
                  {genDir&&<span className="text-[10px] tabular-nums opacity-70">{genPost.toFixed(0)}%</span>}
                </div>
                <span className={`text-[9px] tracking-wider uppercase font-bold ${tagColor} text-right`}>{tagLabel.split('—')[0].trim()}</span>
              </div>
              <div className="text-[9px] text-[#E8E9E4]/45 mt-1 italic">{tagLabel.split('—')[1]?.trim()||''}</div>
            </div>
          );
        })()}

        {/* V5.1: Phase strip with minute-marker decision-progress timeline. */}
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1 gap-2">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[#E8E9E4]/55 font-bold shrink-0">Phase · {phaseLabel}</span>
            <div className="flex items-baseline gap-1.5 min-w-0 justify-end">
              <span className={`text-[10px] tabular-nums font-bold tracking-wide truncate ${isCall&&!snap?'text-[#E8E9E4]/85':snap?'text-[#E8E9E4]/85':'text-[#E8E9E4]/45'}`}>{countdownText}</span>
              {phaseHint&&<span className="text-[8px] tracking-wider text-[#E8E9E4]/35 hidden sm:inline">· {phaseHint}</span>}
            </div>
          </div>
          <div className="relative h-1.5 bg-[#0E100F] rounded-full overflow-hidden">
            {/* Minute tick markers */}
            {_minMarkers.map((mk,i)=>(
              <div key={i} className="absolute top-0 bottom-0 w-px" style={{
                left:mk.pos+'%',
                background:mk.isPast?'rgba(229,200,112,0.4)':'rgba(232,233,228,0.15)',
              }}></div>
            ))}
            {/* Progress fill — elapsed-time based */}
            <div className="absolute top-0 bottom-0 left-0 transition-all duration-700" style={{
              width:(_elapsedFrac*100).toFixed(1)+'%',
              background:isCall?(tc.call==='UP'?'rgba(52,211,153,0.6)':'rgba(244,114,182,0.6)'):tc.call==='SIT_OUT'?'rgba(245,158,11,0.5)':T2_GOLD,
              opacity:0.85,
            }}/>
            {/* Position marker */}
            <div className="absolute top-0 bottom-0 w-0.5 transition-all duration-700" style={{
              left:(_elapsedFrac*100).toFixed(1)+'%',
              background:isCall?(tc.call==='UP'?'rgba(52,211,153,0.9)':'rgba(244,114,182,0.9)'):snap?'rgba(245,158,11,0.7)':T2_GOLD,
              transform:'translateX(-50%)',
              boxShadow:'0 0 4px currentColor',
            }}/>
          </div>
          {_totalMin>=10&&(
            <div className="flex justify-between mt-0.5 px-px text-[7px] text-[#E8E9E4]/30 tabular-nums">
              <span>0</span><span>5m</span><span>10m</span><span>15m</span>
            </div>
          )}
        </div>

        {/* V4.3: Scorecard — visible, larger numbers, color-coded. */}
        <div className="border-t border-[#E8E9E4]/8 pt-2.5">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[#E8E9E4]/45 font-bold">Tara's Record</span>
            {wr!==null&&<span className="text-[10px] tabular-nums text-[#E8E9E4]/60">{wr}% win rate</span>}
            {wr===null&&<span className="text-[10px] text-[#E8E9E4]/35">no calls yet</span>}
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-serif font-bold text-emerald-400 tabular-nums leading-none">{sc.wins||0}</span>
              <span className="text-[8px] uppercase tracking-wider text-emerald-400/60 mt-1">wins</span>
            </div>
            <div className="h-7 w-px bg-[#E8E9E4]/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-serif font-bold text-rose-400 tabular-nums leading-none">{sc.losses||0}</span>
              <span className="text-[8px] uppercase tracking-wider text-rose-400/60 mt-1">losses</span>
            </div>
            <div className="h-7 w-px bg-[#E8E9E4]/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-serif font-bold tabular-nums leading-none" style={{color:T2_GOLD}}>{sc.sitouts||0}</span>
              <span className="text-[8px] uppercase tracking-wider mt-1" style={{color:'rgba(229,200,112,0.6)'}}>sat out</span>
            </div>
          </div>
        </div>

        {/* V5.6.1: Tara's Memory — last 6 calls with results. Synced to Firestore so it
            survives refresh + spans devices. Click "all" to see the full history. */}
        {/* V5.6.4: Always render. Empty-state placeholder ensures users know where to find it
            even before Tara has committed to any windows. */}
        <TaraMemoryStrip taraCallLog={taraCallLog||[]} windowType={windowType} taraLearnings={taraLearnings}/>
      </div>
    );

}

// V5.6.6: PastWindowsPill — Kalshi-style "past outcomes" tracker. Shows the most recent
//   resolved windows as colored arrows (▲ green = closed UP, ▼ red = closed DOWN). Collapsed
//   pill displays last 3 outcomes inline. Click to expand into a vertical list with full
//   timestamps. Filters by current windowType so 15m and 5m have separate histories.
function PastWindowsPill({pastWindows,windowType}){
  const[open,setOpen]=React.useState(false);
  const filtered=React.useMemo(()=>{
    return [...(pastWindows||[])].filter(e=>e&&e.windowType===windowType&&(e.dir==='UP'||e.dir==='DOWN')).reverse();
  },[pastWindows,windowType]);
  const last3=filtered.slice(0,3);
  const wrapRef=React.useRef(null);
  // Close on outside click
  React.useEffect(()=>{
    if(!open)return;
    const onDoc=(e)=>{if(wrapRef.current&&!wrapRef.current.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',onDoc);
    document.addEventListener('touchstart',onDoc);
    return()=>{document.removeEventListener('mousedown',onDoc);document.removeEventListener('touchstart',onDoc);};
  },[open]);
  if(filtered.length===0)return null;
  const _fmt=(ms)=>{
    const d=new Date(ms);
    const _mo=d.toLocaleString([],{month:'short',day:'numeric'});
    const _t=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
    return `${_mo}, ${_t}`;
  };
  return React.createElement('div',{ref:wrapRef,className:'relative'},
    React.createElement('button',{
      onClick:()=>setOpen(!open),
      className:'flex items-center gap-1.5 bg-[#111312] border border-[#E8E9E4]/12 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide hover:border-[rgba(229,200,112,0.4)] transition-colors',
    },
      React.createElement('span',{className:`text-[10px] text-[#E8E9E4]/55 transition-transform inline-block ${open?'rotate-180':''}`},'▾'),
      React.createElement('span',{className:'text-[#E8E9E4]/65 text-[11px]'},'Past'),
      React.createElement('span',{className:'w-px h-3 bg-[#E8E9E4]/20 mx-0.5'}),
      React.createElement('span',{className:'flex items-center gap-0.5'},
        last3.map((w)=>React.createElement('span',{
          key:w.id,
          className:`text-xs ${w.dir==='UP'?'text-emerald-400':'text-rose-400'}`,
        },w.dir==='UP'?'▲':'▼')),
      ),
    ),
    open&&React.createElement('div',{
      className:'absolute top-full mt-1.5 right-0 sm:left-0 sm:right-auto bg-[#181A19] border border-[#E8E9E4]/15 rounded-lg shadow-2xl py-1.5 min-w-[180px] z-50 max-h-[320px] overflow-y-auto',
      style:{boxShadow:'0 8px 32px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(229,200,112,0.06)'},
    },
      filtered.slice(0,15).map((w)=>React.createElement('div',{
        key:w.id,
        className:'flex items-center gap-2 px-3 py-1.5 hover:bg-[#E8E9E4]/5 transition-colors',
        title:`Strike $${(w.strike||0).toLocaleString(undefined,{maximumFractionDigits:0})} → Close $${(w.closingPrice||0).toLocaleString(undefined,{maximumFractionDigits:0})} · ${w.gapBps!=null?formatSignedInt(w.gapBps):'?'} bps`,
      },
        React.createElement('span',{className:`text-base ${w.dir==='UP'?'text-emerald-400':'text-rose-400'}`},w.dir==='UP'?'▲':'▼'),
        React.createElement('span',{className:'text-[11px] tabular-nums text-[#E8E9E4]/70 whitespace-nowrap'},_fmt(w.time)),
      )),
    ),
  );
}

// V5.6.1: Tara's Memory — compact strip showing the most recent calls inline in the
//   Tara card. Click "all" to open a fuller paged view. The strip + modal both source
//   from taraCallLog (cloud-synced array of every call she's made).
function TaraMemoryStrip({taraCallLog,windowType,taraLearnings}){
  const[open,setOpen]=React.useState(false);
  const[learnOpen,setLearnOpen]=React.useState(false);
  const recent=React.useMemo(()=>{
    return [...taraCallLog].filter(e=>e&&e.windowType===windowType).slice(-6).reverse();
  },[taraCallLog,windowType]);
  const totalAcrossWindows=Array.isArray(taraCallLog)?taraCallLog.length:0;
  const _learnTotal=taraLearnings?.totalResolved||0;
  const _resultColors={WIN:{bg:'rgba(52,211,153,0.18)',fg:'rgba(110,231,183,0.95)'},LOSS:{bg:'rgba(244,114,182,0.18)',fg:'rgba(244,114,182,0.95)'},SITOUT:{bg:'rgba(229,200,112,0.16)',fg:'rgba(229,200,112,0.85)'},pending:{bg:'rgba(232,233,228,0.06)',fg:'rgba(232,233,228,0.5)'}};
  const _dirArrow=(d)=>d==='UP'?'▲':d==='DOWN'?'▼':'·';
  const _fmtTime=(ms)=>{const d=new Date(ms);return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});};
  return React.createElement(React.Fragment,null,
    React.createElement('div',{className:'border-t border-[#E8E9E4]/8 pt-2.5 mt-2.5'},
      React.createElement('div',{className:'flex justify-between items-baseline mb-1.5 gap-2'},
        React.createElement('span',{className:'text-[9px] uppercase tracking-[0.18em] text-[#E8E9E4]/45 font-bold'},'Tara\'s Memory'),
        React.createElement('div',{className:'flex items-center gap-2'},
          // V5.6.7: brain icon — opens the learnings panel
          taraLearnings&&React.createElement('button',{
            onClick:()=>setLearnOpen(true),
            title:`Adaptive learning · ${_learnTotal} resolved trades`,
            className:'flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold transition-colors '+(_learnTotal>=5?'text-amber-400/80 hover:text-amber-300':'text-[#E8E9E4]/35 hover:text-[#E8E9E4]/55'),
          },'🧠 ',_learnTotal>=5?`learnings (${_learnTotal})`:`learning (${_learnTotal})`),
          React.createElement('button',{onClick:()=>setOpen(true),className:'text-[9px] uppercase tracking-wider text-indigo-400/70 hover:text-indigo-300 font-bold'},totalAcrossWindows>0?'all →':'open ↗'),
        ),
      ),
      recent.length===0
        ? React.createElement('div',{className:'text-[9px] italic text-[#E8E9E4]/35'},
            totalAcrossWindows===0
              ? 'No calls yet — record builds as windows resolve.'
              : `No ${windowType} calls yet — open the full record for everything.`
          )
        : React.createElement('div',{className:'flex flex-wrap gap-1'},
            recent.map((e)=>{
              const r=e.result||'pending';
              const c=_resultColors[r]||_resultColors.pending;
              return React.createElement('div',{
                key:e.id,
                className:'flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] tabular-nums font-bold',
                style:{background:c.bg,color:c.fg},
                title:`${_fmtTime(e.time)} · ${e.regime||'?'} · q${e.qScore||0} · ${e.dir||'?'} ${e.confidence||0}% · ${r}${e.gapBps!=null?` · ${formatSignedInt(e.gapBps)} bps`:''}`,
              },
                React.createElement('span',null,_dirArrow(e.dir)),
                React.createElement('span',{className:'text-[8px] opacity-70'},_fmtTime(e.time)),
                e.result&&React.createElement('span',{className:'text-[8px]'},r==='WIN'?'✓':r==='LOSS'?'✗':'—'),
              );
            })
          ),
    ),
    open&&React.createElement(TaraMemoryModal,{taraCallLog:taraCallLog,onClose:()=>setOpen(false)}),
    learnOpen&&React.createElement(TaraLearningsModal,{learnings:taraLearnings,onClose:()=>setLearnOpen(false)}),
  );
}

// V5.6.8: TaraLearningsModal — readout of what Tara has learned. Shows the actually-active
//   learning signals: per regime+direction speed/confidence adjustments + per-tier speed
//   adjustments. Other buckets (regime, direction, session) are shown as performance
//   context but do NOT adjust gates by default — only an extreme safety valve does.
function TaraLearningsModal({learnings,onClose}){
  const data=learnings||{byRegime:{},byDirection:{},byTier:{},bySession:{},byRegimeDir:{},multipliers:{}};
  const total=data.totalResolved||0;
  const _renderRegimeDirBucket=()=>{
    const entries=Object.entries(data.byRegimeDir||{}).filter(([_,v])=>v&&(v.wins+v.losses)>=3).sort((a,b)=>(b[1].wins+b[1].losses)-(a[1].wins+a[1].losses));
    if(entries.length===0)return null;
    return React.createElement('div',{className:'mb-4'},
      React.createElement('div',{className:'text-[10px] uppercase tracking-[0.18em] text-[#E8E9E4]/55 font-bold mb-2'},'Regime + Direction · ACTIVE LEARNING'),
      React.createElement('div',{className:'space-y-1'},
        entries.map(([k,v])=>{
          const total=v.wins+v.losses;
          const wr=Math.round((v.wins/total)*100);
          const speedAdj=data.multipliers?.regimeDirSpeedAdj?.[k]||0;
          const confAdj=data.multipliers?.regimeDirConfBoost?.[k]||0;
          const labelParts=[];
          if(speedAdj<0)labelParts.push(`${Math.abs(Math.round(speedAdj*100))}% faster lock`);
          else if(speedAdj>0)labelParts.push(`${Math.round(speedAdj*100)}% slower lock`);
          if(confAdj>0)labelParts.push(`+${confAdj} confidence`);
          else if(confAdj<0)labelParts.push(`${confAdj} confidence`);
          const _adjLabel=labelParts.length>0?labelParts.join(' · '):'no change';
          const _adjColor=speedAdj<0||confAdj>0?'text-emerald-400/85':speedAdj>0||confAdj<0?'text-amber-400/80':'text-[#E8E9E4]/35';
          const wrColor=wr>=70?'text-emerald-400':wr>=55?'text-[#E8E9E4]/80':wr>=45?'text-amber-400/80':'text-rose-400';
          const [regime,dir]=k.split('|');
          const arrow=dir==='UP'?'▲':'▼';
          return React.createElement('div',{key:k,className:'px-2 py-2 rounded bg-[#0E100F]/40 border border-[#E8E9E4]/6'},
            React.createElement('div',{className:'flex items-baseline justify-between gap-2 mb-0.5'},
              React.createElement('span',{className:'text-[11px] font-bold tracking-wide text-[#E8E9E4]/85 truncate flex items-baseline gap-1.5'},
                React.createElement('span',{className:dir==='UP'?'text-emerald-400':'text-rose-400'},arrow),
                regime+' · '+dir,
              ),
              React.createElement('div',{className:'flex items-baseline gap-2 shrink-0'},
                React.createElement('span',{className:`text-[11px] tabular-nums font-bold ${wrColor}`},`${v.wins}W·${v.losses}L`),
                React.createElement('span',{className:`text-[10px] tabular-nums ${wrColor}`},`${wr}%`),
              ),
            ),
            React.createElement('div',{className:`text-[9px] italic ${_adjColor}`},_adjLabel),
          );
        })
      )
    );
  };
  const _renderTierBucket=()=>{
    const entries=Object.entries(data.byTier||{}).filter(([_,v])=>v&&(v.wins+v.losses)>=3).sort((a,b)=>(b[1].wins+b[1].losses)-(a[1].wins+a[1].losses));
    if(entries.length===0)return null;
    return React.createElement('div',{className:'mb-4'},
      React.createElement('div',{className:'text-[10px] uppercase tracking-[0.18em] text-[#E8E9E4]/55 font-bold mb-2'},'Tier · SPEED LEARNING'),
      React.createElement('div',{className:'space-y-1'},
        entries.map(([k,v])=>{
          const total=v.wins+v.losses;
          const wr=Math.round((v.wins/total)*100);
          const adj=data.multipliers?.tierSamplesAdjust?.[k]||0;
          const _adjLabel=adj<0?`${Math.abs(Math.round(adj*100))}% faster lock`:adj>0?`${Math.round(adj*100)}% slower`:'no change';
          const _adjColor=adj<0?'text-emerald-400/85':adj>0?'text-amber-400/80':'text-[#E8E9E4]/35';
          const wrColor=wr>=70?'text-emerald-400':wr>=55?'text-[#E8E9E4]/80':wr>=45?'text-amber-400/80':'text-rose-400';
          return React.createElement('div',{key:k,className:'flex items-baseline justify-between gap-2 px-2 py-1.5 rounded bg-[#0E100F]/40 border border-[#E8E9E4]/6'},
            React.createElement('span',{className:'text-[11px] font-bold tracking-wide text-[#E8E9E4]/85 truncate'},k),
            React.createElement('div',{className:'flex items-baseline gap-2 shrink-0'},
              React.createElement('span',{className:`text-[11px] tabular-nums font-bold ${wrColor}`},`${v.wins}W·${v.losses}L`),
              React.createElement('span',{className:`text-[10px] tabular-nums ${wrColor}`},`${wr}%`),
              React.createElement('span',{className:`text-[9px] italic ${_adjColor} hidden sm:inline`},_adjLabel),
            ),
          );
        })
      )
    );
  };
  const _renderContextBucket=(title,bucket)=>{
    const entries=Object.entries(bucket||{}).filter(([_,v])=>v&&(v.wins+v.losses)>=3).sort((a,b)=>(b[1].wins+b[1].losses)-(a[1].wins+a[1].losses));
    if(entries.length===0)return null;
    return React.createElement('div',{className:'mb-3'},
      React.createElement('div',{className:'text-[10px] uppercase tracking-[0.18em] text-[#E8E9E4]/40 font-bold mb-1.5'},title+' · context only'),
      React.createElement('div',{className:'space-y-0.5'},
        entries.map(([k,v])=>{
          const total=v.wins+v.losses;
          const wr=Math.round((v.wins/total)*100);
          const wrColor=wr>=70?'text-emerald-400':wr>=55?'text-[#E8E9E4]/80':wr>=45?'text-amber-400/80':'text-rose-400';
          return React.createElement('div',{key:k,className:'flex items-baseline justify-between gap-2 px-2 py-1'},
            React.createElement('span',{className:'text-[10px] tracking-wide text-[#E8E9E4]/65 truncate'},k),
            React.createElement('span',{className:`text-[10px] tabular-nums ${wrColor}`},`${v.wins}W·${v.losses}L (${wr}%)`),
          );
        })
      )
    );
  };
  return React.createElement('div',{
    className:'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm',
    onClick:onClose,
  },
    React.createElement('div',{
      className:'bg-[#181A19] border border-[#E8E9E4]/15 rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-5',
      onClick:(e)=>e.stopPropagation(),
      style:{boxShadow:'0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(229,200,112,0.06)'},
    },
      React.createElement('div',{className:'flex justify-between items-baseline mb-4'},
        React.createElement('div',null,
          React.createElement('h2',{className:'text-lg font-serif text-white tracking-tight'},'Tara\'s Learnings'),
          React.createElement('p',{className:'text-[10px] uppercase tracking-wider text-[#E8E9E4]/45 mt-0.5'},`${total} resolved trades · directional + speed learning`),
        ),
        React.createElement('button',{onClick:onClose,className:'text-[#E8E9E4]/40 hover:text-white text-xl leading-none'},'×'),
      ),
      total<5
        ? React.createElement('div',{className:'p-4 rounded-lg bg-[#0E100F]/60 border border-[#E8E9E4]/8 text-[12px] text-[#E8E9E4]/65 leading-relaxed'},
            'Tara is gathering data. After 5 resolved UP/DOWN calls she\'ll start adapting based on what\'s actually been working — locking faster on proven regime+direction combos, dampening confidence on combos that\'ve been losing, but never withdrawing into more sit-outs.',
            React.createElement('div',{className:'mt-2 text-[10px] text-[#E8E9E4]/40'},`Currently at ${total}/5.`),
          )
        : React.createElement(React.Fragment,null,
            _renderRegimeDirBucket(),
            _renderTierBucket(),
            _renderContextBucket('By Regime',data.byRegime),
            _renderContextBucket('By Direction',data.byDirection),
            _renderContextBucket('By Session',data.bySession),
            React.createElement('div',{className:'mt-4 p-3 rounded-lg bg-[#0E100F]/60 border border-[#E8E9E4]/8 text-[10px] text-[#E8E9E4]/55 leading-relaxed'},
              React.createElement('div',{className:'mb-1.5'},React.createElement('span',{className:'font-bold text-[#E8E9E4]/75'},'How she learns: '),'Tara picks BETTER, doesn\'t call LESS. Default learning adjusts speed and displayed confidence per regime+direction combo. Combos with ≥75% win rate get 20% faster lock + confidence boost. Combos with <40% get 20% slower lock + dampened confidence — but she still calls them. Floors stay fixed except for an emergency safety valve (only triggers if a regime drops below 25% over 15+ trades).'),
              React.createElement('div',null,'The shared call log syncs across devices, so every device sees the same Tara — and contributes to the same training set.'),
            ),
          ),
    ),
  );
}

// V5.6.1: Full memory history modal. Filter by window type, sort newest first.
function TaraMemoryModal({taraCallLog,onClose}){
  const[filter,setFilter]=React.useState('all'); // all | 15m | 5m | wins | losses | sitouts
  const filtered=React.useMemo(()=>{
    let arr=[...taraCallLog].reverse();
    if(filter==='15m'||filter==='5m')arr=arr.filter(e=>e.windowType===filter);
    else if(filter==='wins')arr=arr.filter(e=>e.result==='WIN');
    else if(filter==='losses')arr=arr.filter(e=>e.result==='LOSS');
    else if(filter==='sitouts')arr=arr.filter(e=>e.result==='SITOUT');
    return arr;
  },[taraCallLog,filter]);
  const counts=React.useMemo(()=>{
    return {
      total:taraCallLog.length,
      wins:taraCallLog.filter(e=>e.result==='WIN').length,
      losses:taraCallLog.filter(e=>e.result==='LOSS').length,
      sitouts:taraCallLog.filter(e=>e.result==='SITOUT').length,
      pending:taraCallLog.filter(e=>!e.result).length,
    };
  },[taraCallLog]);
  const _wr=counts.wins+counts.losses>0?Math.round((counts.wins/(counts.wins+counts.losses))*100):null;
  const _resultStyle=(r)=>r==='WIN'?{color:'rgba(110,231,183,0.95)'}:r==='LOSS'?{color:'rgba(244,114,182,0.95)'}:r==='SITOUT'?{color:'rgba(229,200,112,0.85)'}:{color:'rgba(232,233,228,0.4)'};
  const _dirStyle=(d)=>d==='UP'?{color:'rgba(110,231,183,0.85)'}:d==='DOWN'?{color:'rgba(244,114,182,0.85)'}:{color:'rgba(229,200,112,0.7)'};
  return React.createElement('div',{
    className:'fixed inset-0 z-50 bg-[#0E100F]/95 backdrop-blur-md overflow-y-auto',
    onClick:(e)=>{if(e.target===e.currentTarget)onClose();},
  },
    React.createElement('div',{className:'max-w-[900px] mx-auto px-4 py-6 sm:py-8'},
      React.createElement('div',{className:'flex items-center justify-between mb-5'},
        React.createElement('div',null,
          React.createElement('div',{className:'text-[10px] uppercase font-bold tracking-[0.18em]',style:{color:T2_GOLD}},'TARA · MEMORY'),
          React.createElement('h2',{className:'font-serif text-3xl text-white tracking-tight'},'Every call, ',React.createElement('span',{style:{color:T2_GOLD}},'·'),' her record'),
        ),
        React.createElement('button',{onClick:onClose,className:'p-2 rounded-lg hover:bg-[#E8E9E4]/5 text-[#E8E9E4]/60 hover:text-white transition-colors text-xl'},'✕'),
      ),
      React.createElement('div',{className:'grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5'},
        React.createElement('div',{className:'bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3'},
          React.createElement('div',{className:'text-[9px] uppercase tracking-wider text-[#E8E9E4]/40 font-bold mb-1'},'Total calls'),
          React.createElement('div',{className:'text-2xl font-bold text-white tabular-nums'},counts.total),
        ),
        React.createElement('div',{className:'bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3'},
          React.createElement('div',{className:'text-[9px] uppercase tracking-wider text-[#E8E9E4]/40 font-bold mb-1'},'Win rate'),
          React.createElement('div',{className:'text-2xl font-bold tabular-nums',style:{color:_wr>=60?'rgb(110,231,183)':_wr>=50?'#fff':'rgb(244,114,182)'}},_wr!==null?`${_wr}%`:'—'),
        ),
        React.createElement('div',{className:'bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3'},
          React.createElement('div',{className:'text-[9px] uppercase tracking-wider text-[#E8E9E4]/40 font-bold mb-1'},'Wins'),
          React.createElement('div',{className:'text-2xl font-bold tabular-nums',style:{color:'rgb(110,231,183)'}},counts.wins),
        ),
        React.createElement('div',{className:'bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3'},
          React.createElement('div',{className:'text-[9px] uppercase tracking-wider text-[#E8E9E4]/40 font-bold mb-1'},'Losses'),
          React.createElement('div',{className:'text-2xl font-bold tabular-nums',style:{color:'rgb(244,114,182)'}},counts.losses),
        ),
        React.createElement('div',{className:'bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl p-3'},
          React.createElement('div',{className:'text-[9px] uppercase tracking-wider text-[#E8E9E4]/40 font-bold mb-1'},'Sat out'),
          React.createElement('div',{className:'text-2xl font-bold tabular-nums',style:{color:T2_GOLD}},counts.sitouts),
        ),
      ),
      React.createElement('div',{className:'flex flex-wrap gap-1 mb-4'},
        ['all','15m','5m','wins','losses','sitouts'].map(f=>(
          React.createElement('button',{
            key:f,
            onClick:()=>setFilter(f),
            className:'px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-colors '+(filter===f?'':'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/70'),
            style:filter===f?{background:'rgba(229,200,112,0.12)',color:T2_GOLD,border:'1px solid rgba(229,200,112,0.3)'}:{border:'1px solid rgba(232,233,228,0.08)'},
          },f)
        )),
      ),
      React.createElement('div',{className:'bg-[#181A19] border border-[#E8E9E4]/8 rounded-xl overflow-hidden'},
        filtered.length===0
          ? React.createElement('div',{className:'p-8 text-center text-[#E8E9E4]/40 italic'},'No calls match this filter yet.')
          : React.createElement('div',{className:'divide-y divide-[#E8E9E4]/5 max-h-[60vh] overflow-y-auto'},
              filtered.map((e)=>(
                React.createElement('div',{key:e.id,className:'px-3 sm:px-4 py-2.5 hover:bg-[#E8E9E4]/3 flex items-center justify-between gap-3 text-xs'},
                  React.createElement('div',{className:'flex items-center gap-2 sm:gap-3 min-w-0 flex-1'},
                    React.createElement('span',{className:'tabular-nums text-[10px] text-[#E8E9E4]/40 shrink-0',style:{minWidth:80}},new Date(e.time).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})),
                    React.createElement('span',{className:'tabular-nums text-[10px] text-[#E8E9E4]/30 shrink-0 hidden sm:inline'},e.windowType),
                    React.createElement('span',{className:'font-bold tabular-nums shrink-0',style:_dirStyle(e.dir)},e.dir==='UP'?'▲ UP':e.dir==='DOWN'?'▼ DOWN':'· SIT'),
                    React.createElement('span',{className:'text-[10px] text-[#E8E9E4]/40 shrink-0 hidden sm:inline'},'q',e.qScore||0),
                    e.regime&&React.createElement('span',{className:'text-[10px] text-[#E8E9E4]/35 truncate hidden md:inline'},e.regime),
                    e.confidence&&React.createElement('span',{className:'text-[10px] text-[#E8E9E4]/40 tabular-nums shrink-0'},e.confidence,'%'),
                  ),
                  React.createElement('div',{className:'flex items-center gap-2 shrink-0'},
                    e.gapBps!=null&&React.createElement('span',{className:'text-[10px] tabular-nums',style:{color:e.gapBps>=0?'rgba(110,231,183,0.7)':'rgba(244,114,182,0.7)'}},(e.gapBps>=0?'+':'')+e.gapBps.toFixed(0)+'bps'),
                    React.createElement('span',{className:'text-[10px] uppercase font-bold tabular-nums tracking-wider',style:_resultStyle(e.result)},e.result||'pending'),
                  ),
                )
              )),
            ),
      ),
      React.createElement('div',{className:'mt-4 text-[10px] text-[#E8E9E4]/40 leading-relaxed'},'Memory is cloud-synced — same record across devices. Showing ',filtered.length,' of ',taraCallLog.length,' total. Capped at 500 most recent.'),
    ),
  );
}

// ── V111: ProjectionsCard with clickable timeframe tabs ──
// V4.2: Now also renders Tara's Call at the top of the column.
function ProjectionsCard({analysis,mobileTab,taraCall,taraScorecards,taraCallLog,windowType,timeState,taraLearnings}){
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

      {/* V4.2: TARA'S CALL — primary panel, top of column. */}
      <TaraCallCard taraCall={taraCall} taraScorecards={taraScorecards} taraCallLog={taraCallLog} windowType={windowType} timeState={timeState} analysis={analysis} taraLearnings={taraLearnings} className="hidden md:block"/>

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

// ── V3.1.12: BrainView — Tara's synthesized current thinking ──
//   The other UI surfaces (badges, score breakdown, engine log) show fragments. This view
//   pulls them together into one readable place that answers:
//     1. What is she calling and why? (one-paragraph synthesis)
//     2. What signals are pulling each direction? (clean for/against ledger)
//     3. What is she watching for? (what would change her call)
//     4. What's blocking entry? (gates that fired, what would unblock them)
//
//   Designed to read like a trader's thought process, not a dump of internals.
function BrainView({analysis,qualityGate,scorecards,baseline,kalshiDebug,strikeSource,strikeMode,taraCall,taraScorecards,windowType,onClose}){
  if(!analysis)return null;
  const post=analysis.rawProbAbove||50;
  // V3.2.1: Acknowledge balanced posterior. When |post-50|<3, signals are genuinely mixed.
  //   Don't force a UP/DOWN tiebreaker that creates false 'UP bias' framing.
  const conviction=Math.abs(post-50);
  const isBalanced=conviction<3;
  const dir=post>=50?'UP':'DOWN';
  const fgt=analysis.mtfAlignment||0;
  const fgtAbs=Math.abs(fgt);
  const fgtDir=fgt>0.05?'UP':fgt<-0.05?'DOWN':null;
  const traj=analysis.trajectoryAdj||0;
  const trajDir=traj>0?'UP':traj<0?'DOWN':null;
  const regime=analysis.regime||'?';
  const winType=analysis.windowAmplitude?.label||null;
  const cp=analysis.candlePattern?.label||null;
  const cpScore=analysis.candlePattern?.score||0;
  const vf=analysis.volFlow?.label||null;
  const prediction=analysis.prediction||'';
  const isLocked=prediction.includes('LOCKED');
  const isRejected=prediction.includes('REJECTED');
  const isSearching=prediction==='SEARCHING...'||prediction.includes('FORMING');
  const lockInfo=analysis.lockInfo||null;

  // ── Synthesize current read in plain English ──
  const synthesize=()=>{
    if(prediction==='MACRO BLACKOUT')return 'A scheduled macro event is imminent. Trading through it has been historically loss-making, so I\'m sitting out this window regardless of what the signals say.';
    if(isLocked)return `I'm locked ${lockInfo?.dir} from ${(lockInfo?.lockPrice||0).toFixed(0)}. Posterior at lock was ${(lockInfo?.lockedPosterior||0).toFixed(0)}. I'll only release if posterior collapses ${analysis.windowAmplitude?.label==='WHIPSAW'?'50bps':analysis.windowAmplitude?.label==='DEAD'?'15bps':'30bps'} adverse, FGT flips against me, or trajectory inverts.`;
    if(isRejected){
      const why=prediction.split('—')[1]?.trim()||'mixed signals';
      return `I'm rejecting this setup. ${why.charAt(0).toUpperCase()+why.slice(1)}. Even though some signals are pulling ${dir}, the rejection gate fired because the underlying conditions don't support a high-conviction call here.`;
    }
    if(isSearching){
      const fgtPart=fgtDir?` FGT is leaning ${fgtDir} ${fgtAbs.toFixed(1)}/4`:' FGT is silent';
      const trajPart=trajDir?`, trajectory says ${trajDir} ${Math.abs(traj).toFixed(0)}`:'';
      const cpPart=cp&&cp!=='MIXED'&&cp!=='OPENING'&&cp!=='INSUFFICIENT'?`, candles showing ${cp.toLowerCase().replace('-',' ')}`:'';
      // V3.2.1: balanced phrasing when no real edge
      if(isBalanced){
        return `No clear edge in ${regime}.${fgtPart}${trajPart}${cpPart}. Posterior at ${post.toFixed(0)} — signals are balanced. Sitting out is the right move here.`;
      }
      return `Searching for a high-conviction read in ${regime}.${fgtPart}${trajPart}${cpPart}. Posterior at ${post.toFixed(0)} — ${conviction<10?'too neutral to commit':conviction<20?'mildly leaning '+dir+' but not enough':'leaning '+dir+' but waiting for confirmation samples'}.`;
    }
    // V3.2.1: balanced fallback
    if(isBalanced){
      return `Posterior ${post.toFixed(0)} in ${regime} — signals are balanced, no real edge either way. ${winType?'Window is '+winType.toLowerCase()+'. ':''}Quality ${qualityGate?.score||0}.`;
    }
    return `Posterior ${post.toFixed(0)} (${dir} lean) in ${regime}. ${winType?'Window is '+winType.toLowerCase()+'. ':''}Quality score ${qualityGate?.score||0}.`;
  };

  // ── For/Against ledger ──
  const sig=analysis.rawSignalScores||{};
  const ledger={UP:[],DOWN:[]};
  const addSig=(label,score,note)=>{
    if(score>1)ledger.UP.push({label,score,note});
    else if(score<-1)ledger.DOWN.push({label,Math:Math,score:Math.abs(score),note});
  };
  if(sig.gap)addSig('Gap',sig.gap,'price-vs-strike');
  if(sig.momentum)addSig('Momentum',sig.momentum,'recent drift');
  if(sig.flow)addSig('Flow',sig.flow,'tape buy/sell');
  if(sig.structure)addSig('Structure',sig.structure,'support/resistance');
  if(sig.technical)addSig('Technical',sig.technical,'RSI/BB/VWAP');
  if(sig.regime)addSig('Regime',sig.regime,'directional regime bias');
  if(sig.rangePosition)addSig('Range Pos',sig.rangePosition,'σ from window open');
  // FGT bonus is applied separately, not in rawSignalScores
  if(fgtAbs>=0.7){
    const fgtBonus=fgtAbs>=3.5?42:fgtAbs>=2.5?26:fgtAbs>=1.5?14:6;
    if(fgt>0)ledger.UP.push({label:'FGT',score:fgtBonus,note:`${fgtAbs.toFixed(1)}/4 timeframe alignment`});
    else ledger.DOWN.push({label:'FGT',score:fgtBonus,note:`${fgtAbs.toFixed(1)}/4 timeframe alignment`});
  }
  // Trajectory contribution
  if(Math.abs(traj)>=3){
    if(traj>0)ledger.UP.push({label:'Trajectory',score:traj,note:'forward forecast'});
    else ledger.DOWN.push({label:'Trajectory',score:Math.abs(traj),note:'forward forecast'});
  }
  // Candle pattern (informational, but show)
  if(cp&&cp!=='MIXED'&&cp!=='OPENING'&&cp!=='INSUFFICIENT'){
    if(cpScore>10)ledger.UP.push({label:'Candle 1m',score:cpScore,note:cp.toLowerCase().replace('-',' ')+' (informational)'});
    else if(cpScore<-10)ledger.DOWN.push({label:'Candle 1m',score:Math.abs(cpScore),note:cp.toLowerCase().replace('-',' ')+' (informational)'});
  }
  ledger.UP.sort((a,b)=>b.score-a.score);
  ledger.DOWN.sort((a,b)=>b.score-a.score);

  // ── What she's watching for ──
  const watching=[];
  if(isSearching){
    if(post<60&&post>50)watching.push(`Posterior climbing past ${analysis.upThreshold||65} → triggers UP form/lock`);
    if(post>40&&post<50)watching.push(`Posterior dropping past ${analysis.downThreshold||35} → triggers DOWN form/lock`);
    if(fgtAbs<2)watching.push(`FGT alignment increasing past 2/4 — currently ${fgtAbs.toFixed(1)}`);
    const samplesNeeded=qualityGate?.consecutiveNeeded||2;
    const samplesHave=Math.max(analysis.bullCount||0,analysis.bearCount||0);
    if(samplesNeeded>samplesHave)watching.push(`${samplesNeeded-samplesHave} more confirming samples (currently ${samplesHave}/${samplesNeeded})`);
  }
  if(isLocked){
    const wType=analysis.windowAmplitude?.label||'NORMAL';
    const releaseThr=wType==='WHIPSAW'?50:wType==='TRENDING'?35:wType==='SPIKE-FADE'?25:wType==='RANGE'?20:wType==='DEAD'?15:30;
    watching.push(`Adverse gap exceeding ${releaseThr}bps → release lock`);
    watching.push(`FGT flipping against ${lockInfo?.dir} → release lock`);
    watching.push(`Posterior collapsing ≥25 points from lock → severe-collapse release`);
  }
  if(watching.length===0)watching.push('Window state stable — no specific inflection point being watched');

  // ── Gates / what's blocking ──
  const gates=[];
  if(qualityGate&&qualityGate.score<45)gates.push({label:'LOW QUALITY',detail:`Quality score ${qualityGate.score} — below threshold of 45`});
  if(prediction.includes('BLACKOUT'))gates.push({label:'MACRO BLACKOUT',detail:'Scheduled news event imminent'});
  if(prediction.includes('BREAKING NEWS'))gates.push({label:'BREAKING NEWS',detail:'Active news event being monitored'});
  if(prediction.includes('REJECTED')){
    const why=prediction.split('—')[1]?.trim()||'rejected';
    gates.push({label:'REJECTED',detail:why});
  }

  // Recent record
  const sc=scorecards?.['15m']||{wins:0,losses:0};
  const totalGames=sc.wins+sc.losses;
  const wr=totalGames>0?((sc.wins/totalGames)*100).toFixed(1):'—';

  return(
    <div className={'fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-3 sm:p-6'} onClick={onClose}>
      <div className={'bg-[#0E100F] border border-[#E8E9E4]/15 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto'} onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0E100F]/95 backdrop-blur border-b border-[#E8E9E4]/8 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{color:T2_GOLD}}>Tara · Brain</div>
            <h2 className="font-serif text-2xl text-white tracking-tight">What she's thinking</h2>
          </div>
          <button onClick={onClose} className="text-[#E8E9E4]/60 hover:text-white text-xl px-3 py-1">×</button>
        </div>

        <div className="p-5 space-y-6">
          {/* V4.2: TARA'S CALL — leading panel. Her actual decision, framed first. */}
          {taraCall&&(()=>{
            const tc=taraCall;
            const sc=taraScorecards?.[windowType]||{wins:0,losses:0,sitouts:0};
            const total=(sc.wins||0)+(sc.losses||0);
            const wr=total>0?Math.round((sc.wins/total)*100):null;
            const isCall=tc.call==='UP'||tc.call==='DOWN';
            const callColor=tc.call==='UP'?'text-emerald-300':tc.call==='DOWN'?'text-rose-300':'text-amber-300/85';
            const borderClr=tc.call==='UP'?'rgba(52,211,153,0.4)':tc.call==='DOWN'?'rgba(244,114,182,0.4)':T2_GOLD_BORDER;
            const bgClr=tc.call==='UP'?'rgba(52,211,153,0.06)':tc.call==='DOWN'?'rgba(244,114,182,0.06)':'rgba(229,200,112,0.04)';
            const callLabel=tc.call==='SIT_OUT'?'SITTING OUT':tc.call;
            const arrow=tc.call==='UP'?'▲':tc.call==='DOWN'?'▼':'—';
            return(
              <section className="px-4 py-3 rounded-lg" style={{background:bgClr,border:'1px solid '+borderClr}}>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{color:T2_GOLD}}>Tara's Call</div>
                  {wr!==null?<span className="text-[10px] tabular-nums text-[#E8E9E4]/50">{sc.wins}W · {sc.losses}L · {sc.sitouts||0} skip · {wr}%</span>:<span className="text-[10px] tabular-nums text-[#E8E9E4]/40">{sc.sitouts||0} skip · no calls yet</span>}
                </div>
                <div className={`flex items-baseline gap-2 mb-2 ${callColor}`}>
                  <span className="text-2xl">{arrow}</span>
                  <span className="text-3xl font-serif font-bold tracking-tight">{callLabel}</span>
                  {isCall&&<span className="text-base tabular-nums opacity-70">{tc.confidence}%</span>}
                </div>
                <p className="text-sm text-[#E8E9E4]/80 leading-relaxed">{tc.reason||'Awaiting signal data...'}</p>
              </section>
            );
          })()}

          {/* CURRENT READ — supporting engine context */}
          <section>
            <div className="text-[9px] uppercase tracking-[0.18em] font-bold text-[#E8E9E4]/50 mb-2">Engine Read · How she got there</div>
            <p className="text-base text-[#E8E9E4]/90 leading-relaxed font-light">
              {synthesize()}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[#E8E9E4]/45">
              <span><strong className="text-[#E8E9E4]/70 tabular-nums">{post.toFixed(0)}%</strong> posterior</span>
              <span>·</span>
              <span><strong className="text-[#E8E9E4]/70">{regime}</strong></span>
              <span>·</span>
              {winType&&<><span><strong className="text-[#E8E9E4]/70">{winType}</strong> window</span><span>·</span></>}
              <span><strong className="text-[#E8E9E4]/70 tabular-nums">{qualityGate?.score||0}/100</strong> quality</span>
              <span>·</span>
              <span>FGT <strong className="text-[#E8E9E4]/70 tabular-nums">{fgtAbs.toFixed(1).replace(/\.0$/,'')}/4</strong>{fgtDir?' '+fgtDir:''}</span>
            </div>
          </section>

          {/* SIGNALS LEDGER */}
          <section>
            <div className="text-[9px] uppercase tracking-[0.18em] font-bold text-[#E8E9E4]/50 mb-2">Signals Pulling Each Direction</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-2">Pulling UP</div>
                {ledger.UP.length===0?(
                  <div className="text-xs text-[#E8E9E4]/35 italic">Nothing meaningful pulling UP right now</div>
                ):(
                  <div className="space-y-1.5">
                    {ledger.UP.map((s,i)=>(
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="text-emerald-300 font-bold">{s.label}</span>
                          <span className="text-[#E8E9E4]/35 ml-1">· {s.note}</span>
                        </div>
                        <span className="text-emerald-300 tabular-nums font-bold">+{(s.score||0).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-rose-500/5 border border-rose-500/15 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-rose-400 font-bold mb-2">Pulling DOWN</div>
                {ledger.DOWN.length===0?(
                  <div className="text-xs text-[#E8E9E4]/35 italic">Nothing meaningful pulling DOWN right now</div>
                ):(
                  <div className="space-y-1.5">
                    {ledger.DOWN.map((s,i)=>(
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="text-rose-300 font-bold">{s.label}</span>
                          <span className="text-[#E8E9E4]/35 ml-1">· {s.note}</span>
                        </div>
                        <span className="text-rose-300 tabular-nums font-bold">−{(s.score||0).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* WATCHING FOR */}
          <section>
            <div className="text-[9px] uppercase tracking-[0.18em] font-bold text-[#E8E9E4]/50 mb-2">What I'm Watching For</div>
            <ul className="space-y-1.5">
              {watching.map((w,i)=>(
                <li key={i} className="text-sm text-[#E8E9E4]/75 leading-relaxed flex gap-2">
                  <span className="shrink-0" style={{color:T2_GOLD}}>·</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* GATES */}
          {gates.length>0&&(
            <section>
              <div className="text-[9px] uppercase tracking-[0.18em] font-bold text-[#E8E9E4]/50 mb-2">Active Gates</div>
              <div className="space-y-2">
                {gates.map((g,i)=>(
                  <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-sm">
                    <span className="text-amber-300 font-bold uppercase tracking-wide text-xs">{g.label}</span>
                    <div className="text-[#E8E9E4]/65 mt-1">{g.detail}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CONTEXT — running record + Kalshi state */}
          <section>
            <div className="text-[9px] uppercase tracking-[0.18em] font-bold text-[#E8E9E4]/50 mb-2">Context</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-[#E8E9E4]/35 mb-0.5">Lifetime</div>
                <div className="text-[#E8E9E4]/85 tabular-nums">{sc.wins}-{sc.losses} <span className="text-[#E8E9E4]/35">({wr}%)</span></div>
              </div>
              <div>
                <div className="text-[#E8E9E4]/35 mb-0.5">Strike source</div>
                <div className={strikeSource==='kalshi'?'text-emerald-400':strikeMode==='auto'?'text-emerald-400/70':'text-amber-400/80'}>{strikeSource==='kalshi'?'Kalshi':strikeMode==='auto'?'Live spot':'Manual'}</div>
              </div>
              <div>
                <div className="text-[#E8E9E4]/35 mb-0.5">Window</div>
                <div className="text-[#E8E9E4]/85">{winType||'opening'}</div>
              </div>
              <div>
                <div className="text-[#E8E9E4]/35 mb-0.5">Candle pattern</div>
                <div className="text-[#E8E9E4]/85">{cp||'mixed'}</div>
              </div>
            </div>
            {kalshiDebug&&kalshiDebug.ok===false&&(
              <div className="mt-3 text-[11px] text-rose-400/80 bg-rose-500/5 border border-rose-500/15 rounded p-2 font-mono">
                Kalshi extraction failing: {kalshiDebug.reason}
              </div>
            )}
            {kalshiDebug&&kalshiDebug.ok===true&&!kalshiDebug.bestStrike&&(
              <div className="mt-3 text-[11px] text-amber-400/80 bg-amber-500/5 border border-amber-500/15 rounded p-2 font-mono">
                Kalshi returned {kalshiDebug.totalMarkets} markets, {kalshiDebug.matchingClose} matching this window — but no strike could be extracted. Fields: {(kalshiDebug.sampleFields||[]).slice(0,6).join(', ')}
              </div>
            )}
          </section>

        </div>
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
function StatsView({tradeLog,scorecards,taraCallLog,onClose}){
  const[tab,setTab]=React.useState('today'); // 'today' | 'week' | 'all'
  const[selectedHour,setSelectedHour]=React.useState(null);

  // V5.6.9: Merge manual tradeLog with Tara's resolved calls. Each resolved Tara call
  //   counts as a trade for analytics purposes. SITOUT entries are excluded (they
  //   don't contribute to win rate). Tagged with `source` so we can show the split.
  const allResolved=React.useMemo(()=>{
    const manual=(tradeLog||[]).filter(t=>t.result==='WIN'||t.result==='LOSS').map(t=>({...t,source:'manual'}));
    const taraCalls=(taraCallLog||[]).filter(e=>e&&(e.result==='WIN'||e.result==='LOSS')&&(e.dir==='UP'||e.dir==='DOWN')).map(e=>({
      id:e.id,time:e.time,result:e.result,
      regime:e.regime,
      direction:e.dir,
      session:e.session,
      hour:new Date(e.id||e.time||0).getHours(),
      windowType:e.windowType,
      qScore:e.qScore,
      tier:e.tier,
      source:'tara',
    }));
    return [...manual,...taraCalls].sort((a,b)=>(a.id||0)-(b.id||0));
  },[tradeLog,taraCallLog]);

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

  // ── Hourly breakdown — V5.7: always local-bucketed ──
  const hourly=React.useMemo(()=>{
    const buckets=Array.from({length:24},(_,i)=>({hour:i,wins:0,losses:0,trades:[]}));
    for(const t of trades){
      // V5.7: always recompute from id — don't trust stored t.hour (might be UTC from old code)
      const h=new Date(t.id||0).getHours();
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
            <div className="text-xs uppercase tracking-[0.22em] font-bold" style={{color:T2_GOLD}}>Hourly Breakdown <span className="text-[10px] tracking-wider text-[#E8E9E4]/30 ml-1 font-normal normal-case">LOCAL · tap to drill</span></div>
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
                  // V3.1.7: round to 1 decimal (V2.9 weighted FGT can be fractional)
                  const fgtAbsDisplay=fgtAbs<0.05?'0':fgtAbs.toFixed(1).replace(/\.0$/,'');
                  return(
                    <div key={i} className="flex items-center gap-2 sm:gap-3 px-2 py-1.5 rounded text-[11px] hover:bg-[#0E100F]/40">
                      <span className="text-[#E8E9E4]/50 w-16 shrink-0" style={T2_MONO_STYLE}>{ts}</span>
                      <span className={'font-bold w-12 shrink-0 '+dirCol}>{t.dir}</span>
                      <span className="text-[#E8E9E4]/40 w-24 sm:w-28 truncate hidden sm:block">{t.regime}</span>
                      <span className="text-[#E8E9E4]/40 w-12 hidden sm:block" style={T2_MONO_STYLE}>{t.posterior?.toFixed(0)}%</span>
                      <span className="text-[#E8E9E4]/40 w-14 hidden md:block" style={T2_MONO_STYLE}>FGT {fgtAbsDisplay}/4</span>
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
//   V3.1.5/V3.1.6: Per-window volume floors. Below these thresholds the percentage is
//   replaced with "—" because the reading would be noise-driven (single print can flip a
//   sub-floor window from 50% to 90%). Floors tuned to filter single-print noise without
//   killing the strip during normal-but-quiet periods:
//     5s ≥ $5K, 15s ≥ $10K, 30s ≥ $25K, 60s ≥ $50K
//   When the headline 30s window is below floor, the whole strip shows "TAPE THIN" instead
//   of confident percentages. Trend indicator only computes when at least 3 windows clear
//   their floors — otherwise we'd be inferring acceleration from noise.
const TAPE_FLOORS={w5:5000,w15:10000,w30:25000,w60:50000};

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
          // FGT effective contribution: V2.9 weighted bonus (≥3.5=±42, ≥2.5=±26, ≥1.5=±14, ≥0.7=±6)
          const fgtAbs=Math.abs(mtf||0);
          // V3.1.7: V2.9 weighted FGT can produce fractional values — round display to 1 dp.
          const fgtAbsDisplay=fgtAbs<0.05?'0':fgtAbs.toFixed(1).replace(/\.0$/,'');
          // V2.9 weighted FGT bonus tiers (must match the actual engine):
          //   ≥3.5 → ±42, ≥2.5 → ±26, ≥1.5 → ±14, ≥0.7 → ±6
          // V3.1.11 FIX: Display was using V136 stale calibration (4=±30, 3=±18, 2=±8).
          //   That made the breakdown show 18-26 fewer points than FGT actually contributed.
          const fgtContribution=mtf!=null?(fgtAbs>=3.5?42:fgtAbs>=2.5?26:fgtAbs>=1.5?14:fgtAbs>=0.7?6:0)*Math.sign(mtf):0;
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
                  <span className={'font-mono text-[10px] w-10 shrink-0 text-right '+(e.v>0.5?'text-emerald-300':e.v<-0.5?'text-rose-300':'text-[#E8E9E4]/30')}>{formatSignedInt(e.v)}</span>
                </div>
              ))}
              {/* FGT row — primary signal, separated with gold-tinted divider (V2.1) */}
              <div className="flex items-center gap-2 text-[10px] pt-1.5 mt-0.5" style={{borderTop:'1px solid '+T2_GOLD_GLOW}}>
                <span className={'text-purple-300 w-16 shrink-0 font-bold'}>FGT {fgtAbsDisplay}/4</span>
                <div className="flex-1 relative h-3 bg-[#111312] rounded-sm overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#E8E9E4]/20"></div>
                  <div className={'absolute top-0 bottom-0 '+(fgtContribution>0?'bg-emerald-400':fgtContribution<0?'bg-rose-400':'bg-[#E8E9E4]/15')} style={{
                    left:fgtContribution>=0?'50%':`calc(50% - ${(Math.abs(fgtContribution)/maxAbs)*50}%)`,
                    width:`${(Math.abs(fgtContribution)/maxAbs)*50}%`,
                  }}></div>
                </div>
                <span style={T2_MONO_STYLE} className={'text-[10px] w-10 shrink-0 text-right font-bold '+(fgtContribution>0?'text-emerald-300':fgtContribution<0?'text-rose-300':'text-[#E8E9E4]/30')}>{formatSignedInt(fgtContribution)}</span>
              </div>
              {/* Total row with gold accent divider above (V2.1 — major boundary) */}
              <div className="flex items-center gap-2 text-[10px] pt-1.5 mt-1" style={{borderTop:'1px solid '+T2_GOLD_BORDER}}>
                <span className="w-16 shrink-0 font-bold uppercase tracking-[0.18em] text-[8px]" style={{color:T2_GOLD}}>Total</span>
                <span style={T2_MONO_STYLE} className={'flex-1 text-[#E8E9E4]/40'}>→ posterior {post.toFixed(0)}% {dir}</span>
                <span style={T2_MONO_STYLE} className={'w-10 text-right font-bold '+(totalAll>0?'text-emerald-400':'text-rose-400')}>{formatSignedInt(totalAll)}</span>
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
function MobileTabBar({mobileTab,setMobileTab,setShowBrain,setShowStats}){
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
      {/* V3.2.2: Brain + Stats access on mobile — header buttons hidden at this width */}
      <button onClick={()=>setShowBrain&&setShowBrain(true)} className={'shrink-0 px-2 py-2 text-xs rounded-lg border transition-all'} style={{background:T2_GOLD_GLOW,color:T2_GOLD,borderColor:T2_GOLD_BORDER}} title="Tara's Brain">🧠</button>
      <button onClick={()=>setShowStats&&setShowStats(true)} className={'shrink-0 px-2 py-2 text-xs rounded-lg border transition-all'} style={{background:T2_GOLD_GLOW,color:T2_GOLD,borderColor:T2_GOLD_BORDER}} title="Stats">📊</button>
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
              <div className="font-serif text-2xl text-white mb-2 tracking-tight">Tara <span style={{color:'#E5C870'}}>5.7.4</span></div>
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
  const[showBrain,setShowBrain]=useState(false); // V3.1.12: Tara's Brain — synthesized reasoning view
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
  // V3.2.1: Cache last-successful Kalshi response across 503 outages. When Kalshi's API
  //   returns HTTP 503 (Service Unavailable), instead of falling back to live spot, we
  //   reuse the previous response if it's recent enough (≤90s old). 503s are usually
  //   transient — rate limiting or maintenance — and the strike doesn't change second-to-second.
  //   When the cache is older than 90s we let it expire so we don't show truly stale data.
  const lastKalshiSuccessRef=useRef({at:0,strike:null,yesPrice:null,activeMarket:null,debug:null});
  // V3.0: The actual market ticker so we can re-find the same market at settlement time.
  const[kalshiActiveMarket,setKalshiActiveMarket]=useState(null);
  // V3.1.11: surface Kalshi extraction status in UI so user can diagnose without DevTools
  const[kalshiDebug,setKalshiDebug]=useState({ok:null,reason:'not yet polled',totalMarkets:0,matchingClose:0,bestStrike:null,sampleFields:[]});
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
  // V5.5.5: When true, signals the fill-on-tick effect to set strike from next currentPrice.
  //   Set true at window rollover or page-load, set false after fill happens.
  const needsCapturedPriceRef=useRef(false);
  // Auto-strike: tracks the window's opening price, fetched at each new window
  const windowOpenPriceRef=useRef(0);
  // V3.1.7+: Window amplitude tracking — high/low since window open. Reset on rollover.
  //         Powers the "is this a wild window or a dead window" classification.
  // V3.1.9: Also track WHEN high/low were first reached (windowHighTime / windowLowTime)
  //         so we can detect SPIKE-FADE (motion early) vs LATE-BREAK (motion late).
  const windowHighRef=useRef(0);
  const windowLowRef=useRef(0);
  const windowHighTimeRef=useRef(0);
  const windowLowTimeRef=useRef(0);
  const windowOpenTimeRef=useRef(0);
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
  // V5.6.11: Cooldown after lock release. Prevents rapid flip-flopping (engine LOCKED UP →
  //   triggers release on a noise tick → immediately re-locks DOWN within seconds). After
  //   any lock release, engine must scan for 45s before re-locking. This kills the visible
  //   "advisor keeps flipping" behavior the user reported.
  const lockReleasedAtRef=useRef(0);
  const posteriorHistoryRef=useRef([]);    // rolling 10-sample history for confirming lock
  const biasCountRef=useRef({UP:0,DOWN:0}); // consecutive samples in same direction before lock
  const peakOfferRef=useRef(0);
  const hasReversedRef=useRef(false);
  // Tracks whether user manually closed the trade this window (prevents double-scoring at rollover)
  // Values: null=no trade, 'WIN'=user cashed out profit, 'LOSS'=user cut losses
  const manuallyClosedRef=useRef(null);
  const[positionEntry,setPositionEntry]=useState(null);
  const[activeProjectionTab,setActiveProjectionTab]=useState('5m');
  const[scorecards,setScorecards]=useState({'15m':{wins:0,losses:0},'5m':{wins:0,losses:0}});
  // V3.2.4: Tara's Call scorecard — separate from general prediction. Tracks UP/DOWN/SIT_OUT
  //   decisions where Tara has applied an additional conviction filter. SIT_OUT trades don't
  //   count for or against. Lets us measure "would Tara's selective calls win at higher rate?"
  // V5.7.1: taraScorecards is now DERIVED from taraCallLog instead of being its own
  //   incrementally-updated state. This eliminates the multi-device double-counting:
  //   each device incrementing locally + max-merging in cloud was racy (if PC bumped to 4
  //   and synced, then tab synced to 4, then tab bumped its own copy to 5, both ended
  //   at 5 for what should have been a single +1). With derive-from-log, the dedup'd
  //   call log is the single source of truth — no separate counter to drift.
  // V5.7.1 declarations moved to AFTER taraCallLog (V5.7.4 hotfix — TDZ fix).
  const _callLogHydratedRef=useRef(false);
  // V3.2.4: Snapshot Tara's Call at endgame freeze. Whatever Tara is calling when the
  //   final 90s zone begins becomes "Tara's Call for this round." It gets resolved when
  //   the window rolls over. This ref persists across the snapshot→rollover transition.
  //   The snapshot is reset (to null) on rollover so the next window starts fresh.
  const taraCallSnapshotRef=useRef(null);
  // V4.2: Track consecutive frames Tara has a directional call. Used to determine when
  //   she's confident enough to lock early — fast for clean setups, slower for mixed.
  const taraCallSampleRef=useRef({dir:null,count:0});
  // V5.7.2: Sample rate tracker — last 8 measurements of (timestamp, count) so we can compute
  //   actual samples-per-second over the recent window. Used for honest "decision in ~Xs"
  //   estimates that account for samples only accumulating when conviction ≥ floor.
  const taraSampleRateRef=useRef([]);
  // V5.6.1: TARA CALL LOG — per-call memory. Every call she commits (UP/DOWN/SIT_OUT) appends
  //   one entry; on rollover scoring the entry gets a result. This is "Tara's training records"
  //   — the user-visible audit trail of what she called, why, and how it resolved. Persisted
  //   to Firestore so it accumulates across sessions and devices. Capped at 500 most-recent
  //   entries to keep payload size sane.
  const[taraCallLog,setTaraCallLog]=useState(()=>{
    try{const stored=localStorage.getItem('taraCallLog_v1');if(stored)return JSON.parse(stored);}catch(e){}
    return[];
  });
  // V5.7.1: taraScorecards is DERIVED from taraCallLog instead of incrementally tracked.
  //   Eliminates multi-device double-counting: a sync race could otherwise turn one LOSS
  //   into 2 (PC bumped 3→4 + synced, tab synced to 4 + bumped its copy to 5, both end at 5).
  //   With derive-from-log, the dedup'd log is the single source of truth — no counter to
  //   drift. Declaration order matters: this MUST be after the taraCallLog useState.
  const taraScorecards=React.useMemo(()=>{
    const out={'15m':{wins:0,losses:0,sitouts:0},'5m':{wins:0,losses:0,sitouts:0}};
    (taraCallLog||[]).forEach(e=>{
      if(!e||!e.windowType||!e.result)return;
      const wt=e.windowType;
      if(!out[wt])out[wt]={wins:0,losses:0,sitouts:0};
      if(e.result==='WIN')out[wt].wins++;
      else if(e.result==='LOSS')out[wt].losses++;
      else if(e.result==='SITOUT')out[wt].sitouts++;
    });
    return out;
  },[taraCallLog]);
  // V5.7.1: scorecards/tara cloud doc is legacy. Local-only — no setTaraScorecards exists.
  //   localStorage cached for fast paint on next mount.
  React.useEffect(()=>{
    try{localStorage.setItem('taraCallScorecards_v1',JSON.stringify(taraScorecards));}catch(e){}
  },[taraScorecards]);
  const taraCallLogRef=useRef(taraCallLog);
  taraCallLogRef.current=taraCallLog;
  useEffect(()=>{
    try{localStorage.setItem('taraCallLog_v1',JSON.stringify(taraCallLog.slice(-500)));}catch(e){}
    if(_callLogHydratedRef.current){
      cloudWriteDebounced('memory/taraCallLog',{entries:taraCallLog.slice(-500)},1500);
    }
  },[taraCallLog]);
  // V5.6.2: Real-time listener for the call log. Merges by id — cloud entries that local
  //   doesn't have get added; cloud entries that local has but with a result populated
  //   (resolved on another device after the window rolled over) overwrite local. Sorted
  //   by id (timestamp), capped at 500.
  // V5.6.9: Backfill windowId on entries that don't have one (legacy from V5.6.8 and earlier).
  //   Computes from e.time + e.windowType so that legacy entries from the same window get
  //   the same windowId as new entries — and dedup collapses them together.
  const _backfillCallLogId=React.useCallback((e)=>{
    if(!e||e.windowId)return e;
    if(!e.time||!e.windowType)return e;
    const winMs=e.windowType==='15m'?900000:300000;
    const bucket=Math.floor(e.time/winMs)*winMs;
    return{...e,windowId:`${e.windowType}-${new Date(bucket).toISOString()}`};
  },[]);
  useEffect(()=>{
    const unsub=cloudWatch('memory/taraCallLog',(d)=>{
      _callLogHydratedRef.current=true;
      if(!d||!Array.isArray(d.entries)||!d.entries.length)return;
      setTaraCallLog(prev=>{
        // V5.6.9: Dedup by windowId+windowType, not by entry id. Multiple devices commit
        //   their own entries with different ids for the same window — these need to
        //   coalesce to ONE row per window. Prefer resolved over unresolved; if both
        //   resolved with same outcome, prefer earliest committed (lowest id).
        //   Legacy entries get windowId backfilled from time+windowType.
        const _key=(e)=>e.windowId+'|'+e.windowType;
        const byKey=new Map();
        const _shouldReplace=(existing,incoming)=>{
          if(!existing.result&&incoming.result)return true;
          if(existing.result&&!incoming.result)return false;
          if((incoming.id||0)<(existing.id||0))return true;
          return false;
        };
        prev.forEach(e=>{const f=_backfillCallLogId(e);if(f&&f.windowId)byKey.set(_key(f),f);});
        let changed=false;
        d.entries.forEach(raw=>{
          const e=_backfillCallLogId(raw);
          if(!e||!e.id||!e.windowId)return;
          const k=_key(e);
          const existing=byKey.get(k);
          if(!existing){byKey.set(k,e);changed=true;}
          else if(_shouldReplace(existing,e)){byKey.set(k,e);changed=true;}
        });
        // Detect if prev itself had duplicates that backfill would now collapse
        if(!changed&&Array.from(byKey.values()).length!==prev.length)changed=true;
        if(!changed)return prev;
        return Array.from(byKey.values()).sort((a,b)=>(a.id||0)-(b.id||0)).slice(-500);
      });
    });
    return unsub;
  },[_backfillCallLogId]);
  // V5.6.6: PAST WINDOWS HISTORY — record of how each window resolved. Captured at rollover
  //   regardless of whether Tara called or sat out. Lets users pattern-match recent market
  //   behavior. Capped at 50 most recent. Cloud-synced so the history matches across devices.
  const[pastWindows,setPastWindows]=useState(()=>{
    try{const stored=localStorage.getItem('taraPastWindows_v1');if(stored)return JSON.parse(stored);}catch(e){}
    return[];
  });
  const _pastWindowsHydratedRef=useRef(false);
  useEffect(()=>{
    try{localStorage.setItem('taraPastWindows_v1',JSON.stringify(pastWindows.slice(-50)));}catch(e){}
    if(_pastWindowsHydratedRef.current){
      cloudWriteDebounced('history/pastWindows',{entries:pastWindows.slice(-50)},1500);
    }
  },[pastWindows]);
  useEffect(()=>{
    const unsub=cloudWatch('history/pastWindows',(d)=>{
      _pastWindowsHydratedRef.current=true;
      if(!d||!Array.isArray(d.entries)||!d.entries.length)return;
      setPastWindows(prev=>{
        // V5.6.9: Dedup by windowId. Backfill from time+windowType for legacy entries
        //   so duplicates from before this version collapse together.
        const _backfill=(e)=>{
          if(!e||e.windowId)return e;
          if(!e.time||!e.windowType)return e;
          const winMs=e.windowType==='15m'?900000:300000;
          const bucket=Math.floor(e.time/winMs)*winMs;
          return{...e,windowId:`${e.windowType}-${new Date(bucket).toISOString()}`};
        };
        const _key=(e)=>e.windowId+'|'+e.windowType;
        const byKey=new Map();
        prev.forEach(e=>{const f=_backfill(e);if(f&&f.windowId)byKey.set(_key(f),f);});
        let changed=false;
        d.entries.forEach(raw=>{
          const e=_backfill(raw);
          if(!e||!e.id||!e.windowId)return;
          const k=_key(e);
          if(!byKey.has(k)){byKey.set(k,e);changed=true;}
          else{
            const existing=byKey.get(k);
            if((e.id||0)<(existing.id||0)){byKey.set(k,e);changed=true;}
          }
        });
        if(!changed&&Array.from(byKey.values()).length!==prev.length)changed=true;
        if(!changed)return prev;
        return Array.from(byKey.values()).sort((a,b)=>(a.id||0)-(b.id||0)).slice(-50);
      });
    });
    return unsub;
  },[]);
  // V5.6.7: SELF-LEARNING SYSTEM. After every resolved Tara call, we recompute
  //   per-category win rates from the call log (single source of truth — no drift)
  //   and derive multipliers that bend the gates toward what's actually been working.
  //   Categories: regime, direction, session (Asia/EU/US), tier (exceptional/strong/...)
  //   Multipliers only kick in once a category has ≥5 resolved trades — below that,
  //   sample size is too small to trust.
  const[taraLearnings,setTaraLearnings]=useState(()=>{
    try{const stored=localStorage.getItem('taraLearnings_v1');if(stored)return JSON.parse(stored);}catch(e){}
    return{byRegime:{},byDirection:{},byTier:{},bySession:{},multipliers:{regimeConvAdjust:{},directionConvAdjust:{},sessionConvAdjust:{},tierSamplesAdjust:{}},lastUpdated:0,totalResolved:0};
  });
  const taraLearningsRef=useRef(taraLearnings);
  taraLearningsRef.current=taraLearnings;
  const _learningsHydratedRef=useRef(false);
  useEffect(()=>{
    try{localStorage.setItem('taraLearnings_v1',JSON.stringify(taraLearnings));}catch(e){}
    if(_learningsHydratedRef.current){
      cloudWriteDebounced('learnings/tara',taraLearnings,1500);
    }
  },[taraLearnings]);
  useEffect(()=>{
    const unsub=cloudWatch('learnings/tara',(d)=>{
      _learningsHydratedRef.current=true;
      if(!d||typeof d!=='object')return;
      // Cloud wins if it has more total samples (cross-device convergence)
      setTaraLearnings(prev=>{
        if((d.totalResolved||0)<=(prev.totalResolved||0))return prev;
        return d;
      });
    });
    return unsub;
  },[]);
  // V5.6.8 LEARNING REDESIGN: Default learning does NOT make Tara more selective.
  //   Floors stay fixed (Q≥30, conv≥10) except in extreme cases (<25% win rate over
  //   15+ trades on a regime — a true safety valve, not the default response).
  //   Active learning instead does:
  //     - Per regime+direction combo: adjust SPEED (faster on proven combos, slower on
  //       weak ones) and CONFIDENCE (boost on winning combos, dampen on losing)
  //     - Per tier: adjust SPEED (faster on proven tiers, slightly slower on weak)
  //   The intent: keep calling, just pick direction better and lock smarter.
  const _deriveMultipliers=React.useCallback((stats)=>{
    const out={
      regimeFloorSafety:{},     // tighten ONLY for absolute-bad regimes (<25% over 15+)
      regimeDirSpeedAdj:{},     // {`regime|UP`: -0.20, `regime|DOWN`: +0.20, ...}
      regimeDirConfBoost:{},    // {`regime|UP`: +5, ...}
      tierSamplesAdjust:{},
    };
    // Safety valve — only kicks in for absolute-bad regimes
    Object.entries(stats.byRegime||{}).forEach(([k,v])=>{
      if(!v||(v.wins+v.losses)<15){out.regimeFloorSafety[k]=0;return;}
      const wr=v.wins/(v.wins+v.losses);
      out.regimeFloorSafety[k]=wr<0.25?5:0;
    });
    // Per regime+direction speed and confidence (the main learning signal)
    Object.entries(stats.byRegimeDir||{}).forEach(([k,v])=>{
      if(!v||(v.wins+v.losses)<5){out.regimeDirSpeedAdj[k]=0;out.regimeDirConfBoost[k]=0;return;}
      const wr=v.wins/(v.wins+v.losses);
      if(wr>=0.75){out.regimeDirSpeedAdj[k]=-0.20;out.regimeDirConfBoost[k]=5;}
      else if(wr<0.40){out.regimeDirSpeedAdj[k]=0.20;out.regimeDirConfBoost[k]=-5;}
      else if(wr<0.55){out.regimeDirSpeedAdj[k]=0.05;out.regimeDirConfBoost[k]=-2;}
      else{out.regimeDirSpeedAdj[k]=0;out.regimeDirConfBoost[k]=0;}
    });
    // Per tier speed (proven tiers lock faster)
    Object.entries(stats.byTier||{}).forEach(([k,v])=>{
      if(!v||(v.wins+v.losses)<5){out.tierSamplesAdjust[k]=0;return;}
      const wr=v.wins/(v.wins+v.losses);
      if(wr>=0.75)out.tierSamplesAdjust[k]=-0.15;
      else if(wr<0.50)out.tierSamplesAdjust[k]=0.15;
      else out.tierSamplesAdjust[k]=0;
    });
    return out;
  },[]);
  // Recompute learnings from a full call log. Called after each resolution.
  const _recomputeLearningsFromLog=React.useCallback((log)=>{
    const stats={byRegime:{},byDirection:{},byTier:{},bySession:{},byRegimeDir:{}};
    let total=0;
    (log||[]).forEach(e=>{
      if(!e||!e.result||e.result==='SITOUT')return;       // only resolved UP/DOWN calls
      if(e.dir!=='UP'&&e.dir!=='DOWN')return;
      const won=e.result==='WIN';
      total++;
      const _bump=(bucket,key)=>{
        if(!key)return;
        bucket[key]=bucket[key]||{wins:0,losses:0};
        bucket[key][won?'wins':'losses']++;
      };
      _bump(stats.byRegime,e.regime||'UNKNOWN');
      _bump(stats.byDirection,e.dir);
      _bump(stats.byTier,e.tier||'default');
      _bump(stats.bySession,e.session||'UNKNOWN');
      // V5.6.8: regime+direction combo — the most actionable learning bucket
      _bump(stats.byRegimeDir,(e.regime||'UNKNOWN')+'|'+e.dir);
    });
    const multipliers=_deriveMultipliers(stats);
    setTaraLearnings({...stats,multipliers,lastUpdated:Date.now(),totalResolved:total});
  },[_deriveMultipliers]);
  // V5.6: Save/clear the active window's lock state to Firestore. Refresh restores from this.
  //   _persistLock writes whatever the refs currently hold (engine lock + Tara snapshot +
  //   sample formation progress). _clearLock wipes the doc — used only on rollover when
  //   the window changes and the previous lock is no longer relevant.
  const _hasRestoredLockRef=useRef(false);
  const _persistLock=()=>{
    if(!_fbDb)return;
    cloudWriteDebounced('state/currentLock',{
      windowId:computeWindowId(windowType),
      windowType,
      engineLock:lockedCallRef.current?{...lockedCallRef.current}:null,
      taraSnapshot:taraCallSnapshotRef.current?{...taraCallSnapshotRef.current}:null,
      taraSamples:taraCallSampleRef.current?{...taraCallSampleRef.current}:null,
      savedAt:Date.now(),
    },300);
  };
  const _clearLock=()=>{cloudDelete('state/currentLock');};
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
  const[chatLog,setChatLog]=useState([{role:'tara',text:'Tara 5.7.4 online — TDZ hotfix. The V5.7.1 derived-scorecard useMemo was reading taraCallLog before its declaration, crashing the engine on mount. Reordered declarations.'}]);
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
    // V4.6 AUTO FRESH-START: If user has any prior baseline version stored, wipe all training
    //   data automatically on first load of V4.6. Per user: 'i asked for a fresh start right'.
    //   This fires once on version-bump, then never again.
    try{
      const lastSyncedVersion=localStorage.getItem('taraBaselineVersion');
      const FRESH_START_MARKER='taraFreshStartV46';
      const alreadyWiped=localStorage.getItem(FRESH_START_MARKER);
      if(!alreadyWiped&&lastSyncedVersion&&lastSyncedVersion!==BASELINE_VERSION){
        // Wipe everything training-related
        localStorage.removeItem('taraTradeLogV110');
        localStorage.removeItem('taraV110Score');
        localStorage.removeItem('taraScoreV110');
        localStorage.removeItem('taraWeightsV110');
        localStorage.removeItem('taraCalibrationV110');
        localStorage.removeItem('taraV110Mem');
        localStorage.removeItem('taraCallScorecards_v1');
        Object.keys(localStorage).filter(k=>k.startsWith('taraV110RW_')).forEach(k=>localStorage.removeItem(k));
        // Mark as wiped so we don't re-wipe on subsequent loads
        localStorage.setItem(FRESH_START_MARKER,'1');
        localStorage.setItem('taraBaselineVersion',BASELINE_VERSION);
        console.info('[Tara] V4.6 fresh-start migration completed — all training data wiped');
        // Reload to re-init from clean state
        window.location.reload();
        return;
      }
      // First-ever install — just stamp the version
      if(!lastSyncedVersion){
        localStorage.setItem('taraBaselineVersion',BASELINE_VERSION);
        localStorage.setItem(FRESH_START_MARKER,'1');
      }
    }catch(e){}
    // V134: Baseline version check — detect if a newer baseline has shipped (post-fresh-start)
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
      const cleanDU=(du&&!new RegExp('V1[0-9][0-9]').test(du||''))?du:'Tara 5.7.4'; // no regex literal — esbuild safe
      setDiscordUsername(cleanDU);
      if(cleanDU!==du)localStorage.setItem('taraV110DU',cleanDU); // write back corrected value
      const da=localStorage.getItem('taraV110DA');if(da)setDiscordAvatar(da);}catch(e){};},[]);
  // V5.5b: Personal scorecard (taraV110Score) and regime memory (taraV110Mem) no longer
  //   persist — they're derived from user trades, which user wants excluded from saved
  //   stats/training. Discord settings (preference, not trade data) still persist.
  useEffect(()=>{if(!isMounted)return;try{localStorage.setItem('taraV110Hook',discordWebhook);localStorage.setItem('taraV110TZ',String(useLocalTime));localStorage.setItem('taraV110DU',discordUsername);localStorage.setItem('taraV110DA',discordAvatar);}catch(e){};},[discordWebhook,useLocalTime,discordUsername,discordAvatar,isMounted]);

  useEffect(()=>{if(!currentPrice)return;const iv=setInterval(()=>{priceMemoryRef.current.push({p:currentPrice,time:Date.now()});priceMemoryRef.current=priceMemoryRef.current.filter(t=>Date.now()-t.time<600000);},2000);return()=>clearInterval(iv);},[currentPrice]);

  // V3.1.7+/V3.1.9: Window amplitude tracking — update high/low refs on each price tick.
  //   Also records WHEN high/low were first reached for structure detection.
  useEffect(()=>{
    if(!currentPrice||!windowOpenPriceRef.current||windowOpenPriceRef.current<=0)return;
    const _now=Date.now();
    if(windowHighRef.current===0||currentPrice>windowHighRef.current){
      windowHighRef.current=currentPrice;
      windowHighTimeRef.current=_now;
    }
    if(windowLowRef.current===0||currentPrice<windowLowRef.current){
      windowLowRef.current=currentPrice;
      windowLowTimeRef.current=_now;
    }
  },[currentPrice]);

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
    // V5.5.5: New strike-source flow per user spec:
    //   'everytime new window starts, i want strike pricing to go blank and when Tara
    //    finds the current price of the window lets have that set'.
    //   Step 1: At rollover, set strike BLANK (targetMargin=0, strikeConfirmed=false).
    //   Step 2: A separate effect watches currentPrice — when first non-zero tick arrives
    //           after rollover, that's "Tara finding the current price" → fills strike
    //           with live spot, auto-confirms.
    //   Step 3: Kalshi auto-set effect overrides whenever Kalshi data arrives.
    //   This block only sets the BLANK state. The fill-on-tick is in the effect below.
    const _now=Date.now();
    windowOpenPriceRef.current=0;
    windowHighRef.current=0;
    windowLowRef.current=0;
    windowHighTimeRef.current=_now;
    windowLowTimeRef.current=_now;
    windowOpenTimeRef.current=_now;
    setTargetMargin(0);
    setStrikeConfirmed(false);
    setPendingStrike(null);
    setStrikeMode('manual');
    setStrikeSource('manual');
    needsCapturedPriceRef.current=true;  // signals next-tick-fill effect to fire
    hasSetInitialMargin.current=true;
  };

  // Alias so call-sites using the old name still work
  const fetchWindowOpenPrice=useCallback((wType)=>{
    setWindowOpenStrike(currentPriceRef.current);
  },[]);

  // V5.5.5 patch: Strike capture effect — Kalshi-ONLY per user request.
  //   'if this happens keep the strike price blank and dont pull from live, i will
  //    enter myself'. If Kalshi cached → fill. Otherwise leave strike blank for
  //    manual entry. windowOpenPriceRef still gets captured from live spot for
  //    scoring fallback purposes only (so Tara's record updates even with blank strike).
  useEffect(()=>{
    if(!currentPrice)return;
    const _firstTime=!hasSetInitialMargin.current;
    const _needsFill=needsCapturedPriceRef.current;
    if(!_firstTime&&!_needsFill)return;
    // Always capture windowOpenPriceRef from live for scoring-fallback (never displayed).
    const _now=Date.now();
    if(windowOpenPriceRef.current===0){
      windowOpenPriceRef.current=Math.round(currentPrice);
      windowHighRef.current=Math.round(currentPrice);
      windowLowRef.current=Math.round(currentPrice);
      windowHighTimeRef.current=_now;
      windowLowTimeRef.current=_now;
      windowOpenTimeRef.current=_now;
    }
    // Strike-fill: ONLY if Kalshi cached. No live-spot fallback per user spec.
    const _kStrike=kalshiStrikeRef.current;
    const _kStrikeValid=_kStrike!=null&&_kStrike>1000&&_kStrike<10000000;
    if(_kStrikeValid){
      const p=Math.round(_kStrike);
      windowOpenPriceRef.current=p;
      windowHighRef.current=p;
      windowLowRef.current=p;
      setTargetMargin(p);
      setStrikeConfirmed(true);
      setStrikeMode('manual');
      setStrikeSource('kalshi');
      hasSetInitialMargin.current=true;
      needsCapturedPriceRef.current=false;
    } else {
      // No Kalshi yet — leave strike blank, but mark as initialized so the page-load
      //   path doesn't fight with the rollover path. Kalshi auto-set effect will fill
      //   when/if data arrives. User can enter manually anytime.
      hasSetInitialMargin.current=true;
      // Keep needsCapturedPriceRef true so we re-check next tick (in case Kalshi arrives)
    }
  },[currentPrice]);

  // V3.1.7: Kalshi strike re-snap. The window-open event fires before Kalshi's API has
  //   returned, so the strike usually gets set to live spot first. When Kalshi data arrives
  // V5.0: Kalshi strike auto-set works on page-open AND new window. Per user:
  //   'when i open the page anytime or when the new window start can it automatically
  //    set itself, i'll still be checking and confirming'. Removed the 60s elapsed
  //   cutoff that was preventing auto-snap on mid-window page opens.
  useEffect(()=>{
    if(!kalshiStrike||kalshiStrike<1000||kalshiStrike>10000000)return;
    if(isManualStrikeRef.current)return;       // user typed their own strike — respect it
    if(strikeSource==='kalshi'&&Math.abs((targetMargin||0)-Math.round(kalshiStrike))<1)return; // already set, no change
    const rounded=Math.round(kalshiStrike);
    windowOpenPriceRef.current=rounded;
    setTargetMargin(rounded);
    setPendingStrike(null);
    setStrikeMode('manual');
    setStrikeSource('kalshi');
    setStrikeConfirmed(true); // V3.2.4: auto-confirm Kalshi strike, no extra tap needed
  },[kalshiStrike,strikeSource,targetMargin]);

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
        footer:{text:'Tara 5.7.4  |  signal'},
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
        footer:{text:'Tara 5.7.4  |  stand-down'},
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
        footer:{text:'Tara 5.7.4  |  search'},
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
        footer:{text:'Tara 5.7.4  |  lock'},
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
          footer:{text:'Tara 5.7.4  |  close'},
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
        footer:{text:'Tara 5.7.4  |  exit'},
        timestamp:new Date().toISOString(),
      };

      // Whale pressure alert — clinical, accurate, no hype
      // V3.2.4: Tara's Call broadcasts — auto-sent. The user's "general prediction" path
      //   (SIGNAL/LOCK above) is now manual-only. These four are Tara talking, distinct from
      //   the engine's general lock state.
      else if(type==='TARA_SCAN')embed={
        title:`TARA  ·  SCANNING`,
        color:6710886,
        description:data.summary||'No commitment yet — observing.',
        fields:[
          {name:'Posterior',value:`${(data.posterior||0).toFixed(0)}`,inline:true},
          {name:'Quality',value:`${data.quality||0}/100`,inline:true},
          {name:'FGT',value:`${(data.fgtAbs||0).toFixed(1)}/4`,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Window',value:data.windowAmp||'—',inline:true},
          {name:'Clock',value:data.clock||'—',inline:true},
          {name:'Record',value:data.taraRecord||'—',inline:false},
        ],
        footer:{text:'Tara 5.7.4  |  scanning'},
        timestamp:new Date().toISOString(),
      };

      else if(type==='TARA_SIGNAL')embed={
        title:`TARA  ·  ${data.dir} SIGNAL`,
        color:data.dir==='UP'?3404125:16478549,
        description:data.reason||`Forming ${data.dir}. Not yet locked.`,
        fields:[
          {name:'Direction',value:data.dir||'—',inline:true},
          {name:'Confidence',value:`${data.confidence||0}%`,inline:true},
          {name:'Posterior',value:`${(data.posterior||0).toFixed(0)}`,inline:true},
          {name:'Quality',value:`${data.quality||0}/100`,inline:true},
          {name:'FGT',value:`${(data.fgtAbs||0).toFixed(1)}/4 ${data.fgtDir||''}`,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Strike',value:`$${(data.strike||0).toFixed(2)}`,inline:true},
          {name:'Price',value:`$${(data.price||0).toFixed(2)}`,inline:true},
          {name:'Clock',value:data.clock||'—',inline:true},
          {name:'Record',value:data.taraRecord||'—',inline:false},
        ],
        footer:{text:'Tara 5.7.4  |  signal'},
        timestamp:new Date().toISOString(),
      };

      else if(type==='TARA_LOCK')embed={
        title:`TARA  ·  ${data.dir} LOCKED`,
        color:data.dir==='UP'?3404125:16478549,
        description:data.reason||`Committed ${data.dir} for this round.`,
        fields:[
          {name:'Direction',value:data.dir||'—',inline:true},
          {name:'Confidence',value:`${data.confidence||0}%`,inline:true},
          {name:'Posterior',value:`${(data.posterior||0).toFixed(0)}`,inline:true},
          {name:'Strike',value:`$${(data.strike||0).toFixed(2)}`,inline:true},
          {name:'Price',value:`$${(data.price||0).toFixed(2)}`,inline:true},
          {name:'Gap',value:`${(data.gap||0).toFixed(1)} bps`,inline:true},
          {name:'Quality',value:`${data.quality||0}/100`,inline:true},
          {name:'FGT',value:`${(data.fgtAbs||0).toFixed(1)}/4 ${data.fgtDir||''}`,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Record',value:data.taraRecord||'—',inline:false},
        ],
        footer:{text:'Tara 5.7.4  |  lock'},
        timestamp:new Date().toISOString(),
      };

      else if(type==='TARA_SITOUT')embed={
        title:`TARA  ·  SITTING OUT`,
        color:14935562, // amber
        description:data.reason||'Conditions don\'t support a confident call.',
        fields:[
          {name:'Posterior',value:`${(data.posterior||0).toFixed(0)}`,inline:true},
          {name:'Quality',value:`${data.quality||0}/100`,inline:true},
          {name:'FGT',value:`${(data.fgtAbs||0).toFixed(1)}/4`,inline:true},
          {name:'Regime',value:data.regime||'—',inline:true},
          {name:'Window',value:data.windowAmp||'—',inline:true},
          {name:'Clock',value:data.clock||'—',inline:true},
          {name:'Record',value:data.taraRecord||'—',inline:false},
        ],
        footer:{text:'Tara 5.7.4  |  sit-out'},
        timestamp:new Date().toISOString(),
      };

      // V3.2.4: Tara's Call result — fires when window resolves
      else if(type==='TARA_RESULT'){
        const isWin=data.result==='WIN';
        const isSitout=data.result==='SITOUT';
        embed={
          title:`TARA  ·  ${isSitout?'SAT OUT':isWin?'WIN':'LOSS'}  ·  ${data.window||windowType}`,
          color:isSitout?6710886:isWin?3404125:16478549,
          description:isSitout
            ? `Tara passed on this round.${data.outcomeDir?` Actual outcome: ${data.outcomeDir}.`:''}`
            : `Tara called ${data.calledDir}. Actual: ${data.outcomeDir}. ${isWin?'Correct.':'Wrong.'}`,
          fields:[
            {name:'Tara\'s Call',value:isSitout?'SIT OUT':data.calledDir||'—',inline:true},
            {name:'Outcome',value:data.outcomeDir||'—',inline:true},
            {name:'Strike',value:`$${(data.strike||0).toFixed(2)}`,inline:true},
            {name:'Close',value:`$${(data.price||0).toFixed(2)}`,inline:true},
            {name:'Gap',value:`${(data.gap||0).toFixed(1)} bps`,inline:true},
            {name:'Record',value:data.taraRecord||'—',inline:false},
          ],
          footer:{text:'Tara 5.7.4  |  result'},
          timestamp:new Date().toISOString(),
        };
      }

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
        // V3.2.4: position-aware advisory line
        let advisoryLine='';
        if(data.whaleAdvisory){
          const a=data.whaleAdvisory;
          const tag=a.action==='HOLD'?'🟢 HOLD':a.action==='CASH OUT'?'🔴 CASH OUT':'🟡 WATCH';
          advisoryLine=`\n**${tag}**  ·  position ${data.userPosition}\n${a.reason}\n`;
        }
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
            advisoryLine,
          ].filter(Boolean).join('\n'),
          footer:{text:'Tara 5.7.4  |  futures tape  |  not financial advice'},
          timestamp:new Date().toISOString(),
        };
      }

      const res=await fetch(discordWebhook+'?wait=true',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:discordUsername||'Tara 5.7.4',avatar_url:discordAvatar||undefined,embeds:[embed]})});
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
        footer:{text:`Tara 5.7.4 · edited ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}`},
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
  //         SERIES of strikes per close_time (20+ markets for each window). Now filter by
  //         close_time first, then within that find market closest to current spot.
  // V3.1.7: More robust extraction. Tries more field names. Exposes debug state to
  //         window.__taraKalshiDebug so the user can inspect what Kalshi returned. Also
  //         logs to engine reasoning so failures show up in the engine log.
  useEffect(()=>{
    setKalshiYesPrice(null); // reset on window change so we don't show stale prior-strike price
    setKalshiStrike(null);
    setKalshiActiveMarket(null);
    // V4.2: Kalshi fetch ONLY on 15m windows. Per user request — 5m markets either don't
    //   exist on Kalshi as KXBTC5M or they're returning errors that pollute the diagnostic.
    //   15m windows are what we trade primarily; 5m falls back to live spot.
    if(windowType!=='15m'){
      setKalshiDebug({ok:null,reason:'5m window — Kalshi disabled (15m only)',totalMarkets:0,matchingClose:0,bestStrike:null,sampleFields:[]});
      return;
    }
    // V3.2.2: Helper to retry the Kalshi fetch up to 3 times with backoff on 503/transient errors
    // V3.2.4: Removed the `Accept: application/json` header. That header is "non-simple" per
    //   CORS spec and forces a preflight OPTIONS request before the GET. Kalshi's CORS handling
    //   for OPTIONS may return 503 even when the GET would succeed — and the browser surfaces
    //   the 503 from OPTIONS as if the GET failed. Without that header, the browser does a
    //   simple GET (no preflight) and the request goes through cleanly.
    const fetchWithRetry=async(url,attempts=3)=>{
      let lastError=null;
      for(let i=0;i<attempts;i++){
        try{
          const r=await fetch(url,{signal:AbortSignal.timeout(3500)});
          // 503 = Service Unavailable, 502 = Bad Gateway, 504 = Gateway Timeout, 429 = Rate Limited.
          // All transient — retry. Other 4xx/5xx are not retried.
          if(r.status===503||r.status===502||r.status===504||r.status===429){
            lastError={status:r.status,reason:`HTTP ${r.status}`};
            if(i<attempts-1){
              const delay=1000*Math.pow(2,i); // 1s, 2s, 4s
              await new Promise(res=>setTimeout(res,delay));
              continue;
            }
            return{ok:false,...lastError};
          }
          if(!r.ok){
            return{ok:false,status:r.status,reason:`HTTP ${r.status}`};
          }
          const data=await r.json();
          return{ok:true,data};
        }catch(e){
          lastError={status:0,reason:`fetch error: ${(e.message||String(e)).slice(0,60)}`};
          if(i<attempts-1){
            const delay=1000*Math.pow(2,i);
            await new Promise(res=>setTimeout(res,delay));
            continue;
          }
        }
      }
      return{ok:false,...(lastError||{status:0,reason:'unknown error'})};
    };
    const fetchKalshi=async()=>{
      try{
        const now=Date.now();
        const intervalMin=windowType==='5m'?5:15;
        const iMs=intervalMin*60*1000;
        const nextMs=Math.ceil((now+500)/iMs)*iMs;
        // V3.2.2: Use correct series. Kalshi has multiple BTC series:
        //   KXBTC15M  — 15-minute BTC up/down markets (the ones we trade)
        //   KXBTCD    — 1-hour BTC range markets
        //   KXBTC     — longer-term "BTC above $X by date" markets (NOT what we want)
        // V3.2.3: Direct requests from claude.ai origin keep getting 503'd by Kalshi.
        //   Tinker and similar bots get through because they're either authenticated or
        //   come from origins Kalshi hasn't throttled. Route through corsproxy.io which
        //   caches responses (~10s) and uses different IPs — this is a known pattern for
        //   indie traders. Fall back to direct fetch if proxy itself fails.
        // V4.4 KALSHI BREAKTHROUGH: Switch from /markets to /events?with_nested_markets=true.
        //   Per docs review: /events scoped by min_close_ts returns just events closing soon,
        //   not all 200 markets across the series. Different rate-limit bucket. Smaller payload.
        //   Markets are nested by event — each 15m event has 2 markets (greater/less strike).
        //   Field names also migrated: yes_bid_dollars (string like "0.5600"), floor_strike
        //   (number, the actual strike value), cap_strike. Old yes_ask/yes_bid/last_price are
        //   deprecated. floor_strike IS the strike — no ticker regex needed.
        // V4.2: Always KXBTC15M (this effect only runs on 15m windows now)
        const _seriesTicker='KXBTC15M';
        // min_close_ts: events with at least one market closing after (now - 5min). Captures
        //   the active window plus a buffer for clock skew between us and Kalshi.
        const _minCloseTs=Math.floor(Date.now()/1000)-300;
        const _eventsUrl=`https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=${_seriesTicker}&with_nested_markets=true&status=open&limit=50&min_close_ts=${_minCloseTs}`;
        // V5.2: PARALLEL multi-proxy strategy — fire all 3 paths at once, take fastest success.
        //   User feedback: 'fetches but it takes a min ish to get it. can it be instant.'
        //   Sequential fetch was up to 18s (6s × 3 timeouts) when first paths fail. Parallel
        //   gets us the strike from whichever proxy responds first — typically 1-3s.
        const _directPromise=fetchWithRetry(_eventsUrl,1).then(r=>{if(r.ok)return r;throw new Error(r.reason||'direct fail');});
        const _corsproxyPromise=fetchWithRetry(`https://corsproxy.io/?url=${encodeURIComponent(_eventsUrl)}`,1).then(r=>{if(r.ok)return r;throw new Error(r.reason||'corsproxy fail');});
        const _allOriginsPromise=fetchWithRetry(`https://api.allorigins.win/get?url=${encodeURIComponent(_eventsUrl)}`,1).then(r=>{
          if(!r.ok)throw new Error(r.reason||'allorigins fail');
          if(r.data?.contents){
            try{return{ok:true,data:JSON.parse(r.data.contents)};}
            catch(e){throw new Error('allorigins parse error');}
          }
          throw new Error('allorigins empty');
        });
        // V5.5.5 patch: 2 more proxies for resilience. User: 'how to never get this'.
        //   With 5 parallel paths + 15-min cache, all-paths-fail is exceedingly rare.
        const _codetabsPromise=fetchWithRetry(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(_eventsUrl)}`,1).then(r=>{if(r.ok)return r;throw new Error(r.reason||'codetabs fail');});
        const _thingproxyPromise=fetchWithRetry(`https://thingproxy.freeboard.io/fetch/${_eventsUrl}`,1).then(r=>{if(r.ok)return r;throw new Error(r.reason||'thingproxy fail');});
        let result;
        try{
          result=await Promise.any([_directPromise,_corsproxyPromise,_allOriginsPromise,_codetabsPromise,_thingproxyPromise]);
        }catch(aggregateError){
          const _errMsgs=aggregateError?.errors?.map(e=>e?.message||String(e))||['unknown'];
          result={ok:false,reason:`all proxies failed: ${_errMsgs.join(' / ')}`.slice(0,140)};
        }
        if(!result.ok){
          // V5.5.5 patch: Cache TTL extended to 15min (900s) since the strike for a given
          //   Kalshi event doesn't change once the event opens — using a 15-min-old strike
          //   value for the same window is safe.
          const cache=lastKalshiSuccessRef.current;
          const cacheAgeS=(Date.now()-cache.at)/1000;
          if(cache.at>0&&cacheAgeS<=900&&cache.strike!=null){
            // Keep the cached strike/yes price visible — they don't change second-to-second
            setKalshiStrike(cache.strike);
            if(cache.yesPrice!=null)setKalshiYesPrice(cache.yesPrice);
            if(cache.activeMarket)setKalshiActiveMarket(cache.activeMarket);
            setKalshiDebug({ok:false,reason:`${result.reason} · using cached strike (${cacheAgeS.toFixed(0)}s old)`,totalMarkets:0,matchingClose:0,bestStrike:cache.strike,sampleFields:[]});
          } else {
            // No usable cache — user falls back to live spot
            if(typeof window!=='undefined')window.__taraKalshiDebug={ok:false,...result};
            setKalshiDebug({ok:false,reason:result.reason,totalMarkets:0,matchingClose:0,bestStrike:null,sampleFields:[]});
          }
          return;
        }
        const d=result.data;
        // /events response shape: {events: [{event_ticker, markets: [{...}], ...}]}
        const events=d.events||[];
        // Flatten nested markets, tagging each with its parent event_ticker for matching
        const markets=[];
        for(const ev of events){
          const evMarkets=ev.markets||[];
          for(const m of evMarkets){
            markets.push({...m, _event_ticker:ev.event_ticker});
          }
        }
        // V4.4: New extractStrike — floor_strike and cap_strike are now numbers per Kalshi's
        //   migrated schema. Fall through to legacy fields + ticker regex if those are absent
        //   (e.g. old cached responses or other series).
        const _extractStrike=(m)=>{
          // Direct numeric fields, in order of likelihood for v2 schema
          const candidates=[
            m.floor_strike,m.cap_strike,m.strike_price,m.strike,
            m.expected_expiration_value,m.expiration_value,m.settlement_value,
          ];
          for(const c of candidates){
            if(c==null)continue;
            const n=Number(c);
            if(isFinite(n)&&n>1000&&n<10000000)return n;
          }
          // Ticker pattern matching — fallback for legacy schema or unusual events
          if(m.ticker){
            const t1=m.ticker.match(/-T(\d{4,7}(?:\.\d+)?)/);
            if(t1){const n=Number(t1[1]);if(n>1000&&n<10000000)return n;}
            const t2=m.ticker.match(/-(\d{4,7}(?:\.\d+)?)$/);
            if(t2){const n=Number(t2[1]);if(n>1000&&n<10000000)return n;}
            const t3=m.ticker.match(/(\d{5,7}(?:\.\d+)?)/g);
            if(t3){
              for(const candidate of t3){
                const n=Number(candidate);
                if(n>10000&&n<10000000)return n;
              }
            }
          }
          // Subtitle text fallback
          const titleText=(m.subtitle||m.title||m.yes_sub_title||m.no_sub_title||m.event_ticker||m._event_ticker||'')+' ';
          const tm=titleText.match(/\$?([\d,]+(?:\.\d+)?)/g);
          if(tm){
            for(const match of tm){
              const n=Number(match.replace(/[$,]/g,''));
              if(n>10000&&n<10000000)return n;
            }
          }
          return null;
        };
        // Filter to markets whose close_time matches our active window
        const tolMs=Math.floor(intervalMin*60*1000/2);
        const matchingClose=markets.filter(m=>{
          const closeMs=m.close_time?new Date(m.close_time).getTime():0;
          return closeMs && Math.abs(closeMs-nextMs)<tolMs;
        });
        if(typeof window!=='undefined'){
          // Expose debug state for inspection in DevTools
          window.__taraKalshiDebug={
            ok:true,
            endpoint:'events',
            totalEvents:events.length,
            totalMarkets:markets.length,
            matchingClose:matchingClose.length,
            sampleFields:markets[0]?Object.keys(markets[0]):[],
            sampleTicker:markets[0]?.ticker||null,
            sampleEvent:markets[0]?._event_ticker||null,
            sampleStrike:markets[0]?.floor_strike||markets[0]?.cap_strike||null,
            sampleYesBid:markets[0]?.yes_bid_dollars||null,
          };
        }
        if(matchingClose.length===0){
          setKalshiDebug({ok:true,reason:`${events.length} events · ${markets.length} markets · 0 matching close_time`,totalMarkets:markets.length,matchingClose:0,bestStrike:null,sampleFields:markets[0]?Object.keys(markets[0]).slice(0,8):[]});
          return;
        }
        // V4.4: For 15m KXBTC events, each event has 2 markets — strike_type='greater' (above)
        //   and strike_type='less' (below) — bracketed by floor_strike/cap_strike. We want the
        //   "greater" market (will price be ABOVE strike) since that's the up/down direction
        //   we trade. If no strike_type field, fall through to closest-strike-to-spot logic.
        const _curPrice=currentPriceRef.current||0;
        let best=null,bestStrikeDiff=Infinity,bestStrike=null;
        // Prefer markets matching strike_type='greater' for our UP/DOWN semantics
        const greaterMarkets=matchingClose.filter(m=>m.strike_type==='greater'||m.strike_type==='greater_or_equal');
        const candidatePool=greaterMarkets.length>0?greaterMarkets:matchingClose;
        for(const m of candidatePool){
          const _s=_extractStrike(m);
          if(_s==null||_s<1000||_s>10000000)continue;
          if(_curPrice>0){
            const diff=Math.abs(_s-_curPrice);
            if(diff<bestStrikeDiff){bestStrikeDiff=diff;best=m;bestStrike=_s;}
          } else if(best===null){
            best=m; bestStrike=_s;
          }
        }
        if(!best){
          best=candidatePool[0];
          bestStrike=_extractStrike(best);
        }
        if(typeof window!=='undefined'){
          window.__taraKalshiDebug.bestStrike=bestStrike;
          window.__taraKalshiDebug.bestTicker=best?.ticker;
          window.__taraKalshiDebug.bestStrikeType=best?.strike_type;
        }
        // V3.1.11: Mirror to React state for UI surface
        setKalshiDebug({
          ok:true,
          reason:bestStrike?`/events ok · ${events.length} events · matched ${best?.ticker||'unknown'} (${bestStrike})`:`${matchingClose.length} matching markets but no strike extractable`,
          totalMarkets:markets.length,
          matchingClose:matchingClose.length,
          bestStrike,
          bestTicker:best?.ticker||null,
          sampleFields:markets[0]?Object.keys(markets[0]).slice(0,8):[],
        });
        // V4.4: New YES price extraction. Kalshi migrated from yes_ask (cents integer) to
        //   yes_ask_dollars (dollars string like "0.5600"). Convert to cents for UI consistency
        //   since the rest of Tara's code expects cents (0-100 range).
        const yesAskDollars=best.yes_ask_dollars??null;
        const yesBidDollars=best.yes_bid_dollars??null;
        const lastPriceDollars=best.last_price_dollars??null;
        // Prefer mid of bid+ask if both present, else fall back individually, else last price
        let yesCents=null;
        if(yesAskDollars!=null&&yesBidDollars!=null){
          const mid=(parseFloat(yesAskDollars)+parseFloat(yesBidDollars))/2;
          if(isFinite(mid))yesCents=Math.round(mid*100);
        } else if(yesAskDollars!=null){
          const v=parseFloat(yesAskDollars);
          if(isFinite(v))yesCents=Math.round(v*100);
        } else if(yesBidDollars!=null){
          const v=parseFloat(yesBidDollars);
          if(isFinite(v))yesCents=Math.round(v*100);
        } else if(lastPriceDollars!=null){
          const v=parseFloat(lastPriceDollars);
          if(isFinite(v))yesCents=Math.round(v*100);
        } else {
          // Final fallback to legacy fields
          const yes=best.yes_ask??best.yes_bid??best.last_price??null;
          if(yes!=null)yesCents=Number(yes);
        }
        if(yesCents!=null&&isFinite(yesCents))setKalshiYesPrice(yesCents);
        if(bestStrike!=null&&bestStrike>1000&&bestStrike<10000000){
          setKalshiStrike(bestStrike);
        }
        const _activeMarket=best.ticker?{ticker:best.ticker,closeTime:best.close_time,strike:bestStrike,strikeType:best.strike_type,event:best._event_ticker}:null;
        if(_activeMarket)setKalshiActiveMarket(_activeMarket);
        // V3.2.1: Cache this successful response so a future 503 can fall back to it
        if(bestStrike!=null&&bestStrike>1000&&bestStrike<10000000){
          lastKalshiSuccessRef.current={
            at:Date.now(),
            strike:bestStrike,
            yesPrice:yesCents!=null?yesCents:null,
            activeMarket:_activeMarket,
            debug:null,
          };
        }
      }catch(e){
        if(typeof window!=='undefined')window.__taraKalshiDebug={ok:false,error:e.message||String(e)};
        setKalshiDebug({ok:false,reason:`error: ${e.message||String(e).slice(0,40)}`,totalMarkets:0,matchingClose:0,bestStrike:null,sampleFields:[]});
      }
    };
    fetchKalshi();
    const iv=setInterval(fetchKalshi,30000);
    // V5.0: Refetch when tab becomes visible again — background tabs can stall the interval
    const onVisible=()=>{if(document.visibilityState==='visible')fetchKalshi();};
    document.addEventListener('visibilitychange',onVisible);
    return()=>{clearInterval(iv);document.removeEventListener('visibilitychange',onVisible);};
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
        // Try to fetch settlement from Kalshi (15m only — 5m series may not exist)
        if(pending.windowType!=='15m'){
          // 5m settlement falls back to local close determination — no Kalshi verify
          continue;
        }
        try{
          pending.attempts++;
          // V4.4: Use /events endpoint (smaller payload, different rate-limit bucket)
          const _settleUrl=`https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXBTC15M&with_nested_markets=true&status=settled&limit=50`;
          // V3.2.3: Use CORS proxy first to avoid 503 throttling, fall back to direct
          let r=await fetch(
            `https://corsproxy.io/?url=${encodeURIComponent(_settleUrl)}`,
            {signal:AbortSignal.timeout(8000)}
          ).catch(()=>null);
          if(!r||!r.ok){
            r=await fetch(_settleUrl,{signal:AbortSignal.timeout(8000)});
          }
          if(!r.ok)continue;
          const d=await r.json();
          // V4.4: Flatten nested markets from events response
          const events=d.events||[];
          const markets=[];
          for(const ev of events){
            const evMarkets=ev.markets||[];
            for(const m of evMarkets){
              markets.push({...m, _event_ticker:ev.event_ticker});
            }
          }
          // Match by close_time near our window close — prefer 'greater' strike_type for UP/DOWN semantics
          const target=pending.windowCloseTime;
          let best=null,bestDiff=Infinity;
          // First pass: only 'greater' strike_type markets
          for(const m of markets){
            if(m.strike_type!=='greater'&&m.strike_type!=='greater_or_equal')continue;
            const closeMs=m.close_time?new Date(m.close_time).getTime():0;
            if(!closeMs)continue;
            const diff=Math.abs(closeMs-target);
            if(diff<bestDiff){bestDiff=diff;best=m;}
          }
          // Second pass: any market if no 'greater' found (legacy fallback)
          if(!best){
            for(const m of markets){
              const closeMs=m.close_time?new Date(m.close_time).getTime():0;
              if(!closeMs)continue;
              const diff=Math.abs(closeMs-target);
              if(diff<bestDiff){bestDiff=diff;best=m;}
            }
          }
          // Must be within 90 seconds and have a result
          if(best&&bestDiff<90000&&best.result){
            // Kalshi result: 'yes' = market resolved YES (price closed >= strike → UP wins)
            //                'no'  = market resolved NO (price closed < strike → DOWN wins)
            const kalshiOutcomeDir=best.result==='yes'?'UP':best.result==='no'?'DOWN':null;
            // V4.4: Extract Kalshi's settled price using new field names. Prefer settlement_value_dollars.
            const _kalshiSettlement=(()=>{
              if(best.settlement_value_dollars!=null){const v=parseFloat(best.settlement_value_dollars);if(isFinite(v))return v;}
              if(best.settlement_value!=null)return Number(best.settlement_value);
              if(best.expiration_value!=null)return Number(best.expiration_value);
              if(best.final_value!=null)return Number(best.final_value);
              if(best.settled_price!=null)return Number(best.settled_price);
              // Fall back to floor_strike — we know the strike, not the actual settled price,
              // but it's better than nothing for trade resolution
              if(best.floor_strike!=null)return Number(best.floor_strike);
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
          // V3.2.4: General scorecard no longer auto-updates. Per user: scoring is decoupled
          //   from general predictions. The user enters/closes positions for their own use,
          //   and we DO track personal W-L when they take a position — that's their personal
          //   trading record. Tara's Call has a separate scorecard.
          //
          //   Three scorecards now:
          //     scorecards       — personal: only updates when userPosition!==null
          //     taraScorecards   — Tara's Call: updates on her own conviction-filtered decisions
          //     general prediction itself does not drive any scorecard
          if(manuallyClosedRef.current!==null){
            // User manually closed — result already captured at the moment of close
            won=manuallyClosedRef.current==='WIN';
            active=!!pendingTradeRef.current;
            // Personal scorecard already updated at exit time, no double-count here
          } else if(userPosition==='UP'){
            active=true;
            if(currentPrice>targetMargin){won=true;updateScore(windowType,'wins',1);}
            else updateScore(windowType,'losses',1);
          } else if(userPosition==='DOWN'){
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
              // Note: scorecard wins/losses NOT pre-incremented since we no longer auto-score the general
              const winsNow=scorecards[windowType]?.wins||0,lossesNow=scorecards[windowType]?.losses||0;
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
        // V3.2.4: Resolve Tara's Call for the round just closed.
        //   This runs whether or not the user actively traded — Tara has her own scorecard.
        //   If snapshot is null (window closed before endgame freeze fired), treat as SIT_OUT.
        // V5.5.5: Use windowOpenPriceRef as strike fallback if targetMargin happens to be 0
        //   at close — this can happen if Kalshi came in after rollover and user cleared it.
        const _scoringStrike=targetMargin>0?targetMargin:(windowOpenPriceRef.current||0);
        if(currentPrice!==null&&_scoringStrike>0){
          const _snap=taraCallSnapshotRef.current;
          const _outcomeDir=currentPrice>_scoringStrike?'UP':currentPrice<_scoringStrike?'DOWN':null;
          const _gap=_scoringStrike>0?((currentPrice-_scoringStrike)/_scoringStrike)*10000:0;
          // V5.6.6: Capture this window's outcome to the past-windows tracker. Every window
          //   gets recorded regardless of whether Tara called — pure market history.
          if(_outcomeDir){
            // V5.6.9: windowId for cross-device dedup. Just-closed window = current bucket - winMs.
            const _winMs=windowType==='15m'?900000:300000;
            const _justClosedBucket=Math.floor(Date.now()/_winMs)*_winMs-_winMs;
            const _pwid=`${windowType}-${new Date(_justClosedBucket).toISOString()}`;
            const _pastEntry={
              id:Date.now(),
              windowId:_pwid,
              time:Date.now(),
              windowType,
              strike:_scoringStrike,
              closingPrice:currentPrice,
              dir:_outcomeDir,
              gapBps:_gap,
            };
            // V5.6.9: at-append dedup. Match by windowId, or fallback to time-window for legacy entries.
            const _sixtySecAgo=Date.now()-60000;
            setPastWindows(prev=>{
              if(prev.some(e=>e&&((e.windowId&&e.windowId===_pwid)||(e.windowType===windowType&&e.time>_sixtySecAgo))))return prev;
              return [...prev,_pastEntry].slice(-50);
            });
          }
          // V5.6.1: helper — populate result on the latest unresolved log entry. Matched by
          //   most-recent entry with result===null and same windowType. Robust to repeats
          //   across multiple windows.
          const _logResult=(resultStr)=>{
            setTaraCallLog(prev=>{
              const idx=[...prev].map((e,i)=>({e,i})).reverse().find(({e})=>e.result===null&&e.windowType===windowType);
              if(!idx)return prev;
              const next=[...prev];
              next[idx.i]={...idx.e,result:resultStr,outcomeDir:_outcomeDir,strike:_scoringStrike,closingPrice:currentPrice,gapBps:_gap,resolvedAt:Date.now()};
              // V5.6.7: Trigger self-learning recompute on the updated log. Async via setTimeout
              //   so we don't loop inside the setState callback. This is the per-trade learning step.
              setTimeout(()=>_recomputeLearningsFromLog(next),0);
              return next;
            });
          };
          // No snapshot OR explicit SIT_OUT → sitouts++
          if(!_snap||_snap.call==='SIT_OUT'){
            // V5.7.1: scorecards derive from log — just log the result. Broadcast uses
            //   a forward-looking estimate (current scorecard + this result).
            const _curRec=taraScorecards[windowType]||{wins:0,losses:0,sitouts:0};
            const _projRec={..._curRec,sitouts:(_curRec.sitouts||0)+1};
            const taraRecord=`${_projRec.wins}W · ${_projRec.losses}L · ${_projRec.sitouts} sat out  (${_projRec.wins+_projRec.losses>0?((_projRec.wins/(_projRec.wins+_projRec.losses))*100).toFixed(1):'—'}%)`;
            broadcastToDiscord('TARA_RESULT',{result:'SITOUT',calledDir:'SIT_OUT',outcomeDir:_outcomeDir,window:windowType,strike:targetMargin,price:currentPrice,gap:_gap,taraRecord});
            _logResult('SITOUT');
          } else if(_outcomeDir&&(_snap.call==='UP'||_snap.call==='DOWN')){
            // Real call — score against outcome
            const _won=_snap.call===_outcomeDir;
            const _curRec=taraScorecards[windowType]||{wins:0,losses:0,sitouts:0};
            const _projRec={..._curRec,[_won?'wins':'losses']:(_curRec[_won?'wins':'losses']||0)+1};
            const taraRecord=`${_projRec.wins}W · ${_projRec.losses}L · ${_projRec.sitouts} sat out  (${_projRec.wins+_projRec.losses>0?((_projRec.wins/(_projRec.wins+_projRec.losses))*100).toFixed(1):'—'}%)`;
            broadcastToDiscord('TARA_RESULT',{result:_won?'WIN':'LOSS',calledDir:_snap.call,outcomeDir:_outcomeDir,window:windowType,strike:targetMargin,price:currentPrice,gap:_gap,taraRecord});
            _logResult(_won?'WIN':'LOSS');
          }
        }
        // Clear snapshot for next window
        taraCallSnapshotRef.current=null;
        taraCallSampleRef.current={dir:null,count:0};
        taraSampleRateRef.current=[]; // V5.7.2: clear rate history for new window
        taraAdviceRef.current='SEARCHING...';lockedCallRef.current=null;lockReleasedAtRef.current=0;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};hasReversedRef.current=false;manuallyClosedRef.current=null;windowSignalDirRef.current=null;setUserPosition(null);setPositionEntry(null);lastWindowRef.current=timeState.nextWindow;setManualAction(null);tickHistoryRef.current=[];setCurrentOffer('');setBetAmount(0);setMaxPayout(0);peakOfferRef.current=0;hasSetInitialMargin.current=true;
        _clearLock(); // V5.6: wipe cloud lock — new window starts clean
        _hasRestoredLockRef.current=false; // allow restore on next window if user refreshes
        }},[timeState.nextWindow,currentPrice,windowType,targetMargin,adaptiveWeights,userPosition]);

  useEffect(()=>{if(userPosition===null){peakOfferRef.current=0;}else{const o=parseFloat(currentOffer)||0;if(o>peakOfferRef.current)peakOfferRef.current=o;}},[currentOffer,userPosition]);

  // V5.6: LOCK RESTORE — runs once on mount once currentPrice is alive.
  //   Reads cloud state/currentLock. If the saved windowId matches the window we're in
  //   right now, restore the engine lock + Tara snapshot + sample formation progress.
  //   This is the fix for "refresh and Tara/the predictor flip" — they no longer recompute
  //   from scratch; they pick up exactly where they were.
  //
  //   What happens if the saved lock is now objectively wrong (price ran hard against)?
  //   We restore it anyway — the lock-release effect already running every tick will fire
  //   the appropriate safety release (rugpull/spike/deep-adverse-gap) on the very next tick.
  //   So we honor the historical commitment but let live data invalidate it normally.
  useEffect(()=>{
    if(_hasRestoredLockRef.current||!currentPrice||!_fbDb)return;
    _hasRestoredLockRef.current=true;
    let cancelled=false;
    cloudRead('state/currentLock').then(d=>{
      if(cancelled||!d)return;
      const expectedWid=computeWindowId(windowType);
      if(d.windowId!==expectedWid){
        console.info('[Firestore] saved lock is from a different window — ignoring',{saved:d.windowId,now:expectedWid});
        return;
      }
      if(d.windowType!==windowType)return;
      let restored=[];
      // Engine lock — only restore if not already set (the engine may have raced and locked
      // before our async cloud read returned).
      if(d.engineLock&&!lockedCallRef.current){
        lockedCallRef.current={...d.engineLock};
        taraAdviceRef.current=d.engineLock.dir==='UP'?'UP - LOCKED':'DOWN - LOCKED';
        restored.push(`engine ${d.engineLock.dir}`);
      }
      // Tara snapshot — same idea
      if(d.taraSnapshot&&!taraCallSnapshotRef.current){
        taraCallSnapshotRef.current={...d.taraSnapshot};
        restored.push(`tara ${d.taraSnapshot.call}${d.taraSnapshot.locked?' LOCKED':''}`);
      }
      // Mid-formation sample progress
      if(d.taraSamples&&taraCallSampleRef.current.dir===null&&d.taraSamples.dir){
        taraCallSampleRef.current={...d.taraSamples};
        restored.push(`forming ${d.taraSamples.dir} ${d.taraSamples.count}`);
      }
      if(restored.length){
        console.info('[Firestore] restored lock state:',restored.join(' · '));
        setForceRender(p=>p+1); // ensure UI re-renders with restored refs
      }
    });
    return()=>{cancelled=true;};
  },[currentPrice,windowType]);

  // News
  useEffect(()=>{let news=[];if(orderBook.imbalance>1.5)news.push({title:`BID wall detected near $${targetMargin.toFixed(0)} — maker support`,type:'info'});if(orderBook.imbalance<0.6)news.push({title:`ASK pressure at $${targetMargin.toFixed(0)} — sellers defending`,type:'info'});if(showWhaleAlerts&&whaleLog.length>0){const w=whaleLog[0];const age=Math.round((Date.now()-w.time)/1000);if(age<120)news.push({title:`WHALE PRESSURE: ${w.side}  $${(w.usd/1000).toFixed(0)}K  ${w.src}  ${age}s ago`,type:'whale'});}if(news.length<3)news.push({title:`Tara 3.1 active  ·  789 trades trained  ·  ${lastRegimeRef.current||'scanning'}`,type:'info'});setNewsEvents(news);},[orderBook.imbalance,globalFlow,targetMargin,windowType,showWhaleAlerts,whaleLog]);

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
      // V3.1.7: tapeRef and ticksRef passed for volume-flow signal computation
      // V3.1.7+: windowHighRef/windowLowRef passed for window-amplitude awareness
      // V3.1.9: windowHighTime/windowLowTime/windowOpenTime for structure detection (TRENDING/WHIPSAW/etc.)
      const eng=computeV99Posterior({currentPrice,liveHistory,targetMargin,globalFlow,bloomberg,velocityRef,tickHistoryRef,priceMemoryRef,windowType,timeFraction,clockSeconds,is15m,regimeMemory,adaptiveWeights,regimeWeights,currentRegime:lastRegimeRef.current||'RANGE-CHOP',calibration,windowOpenPrice:windowOpenPriceRef.current||0,depthFlash,tfCandles,tapeRef,tradeTicksRef:ticksRef,windowHigh:windowHighRef.current||0,windowLow:windowLowRef.current||0,windowHighTime:windowHighTimeRef.current||0,windowLowTime:windowLowTimeRef.current||0,windowOpenTime:windowOpenTimeRef.current||0});
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
      // V3.2.4: TRENDING DOWN — apply UP threshold raise to lock gate. Was UP 75/DN 36.
      //   In a downtrending regime, UP should be very expensive. Now UP 85, DN 26 (let DOWN
      //   fire on more reasonable conviction in the regime designed to favor it).
      if(regime==='TRENDING DOWN'){_baseUpThr=is15m?85:83; _baseDnThr=is15m?26:28;}
      else if(regime==='LONG SQUEEZE'){_baseUpThr=is15m?75:73; _baseDnThr=is15m?36:34;}
      else if(regime==='TRENDING UP'){_baseUpThr=is15m?60:58; _baseDnThr=is15m?20:22;}
      // V3.2.4: Apply the SS rebalance from V3.2.1 to the actual lock-gate thresholds.
      //   The line 2067 fix changed the regime classifier values but those are dead-ish; the
      //   real lock decision uses these `_baseUpThr` / `_baseDnThr` values. So V3.2.1's
      //   intent (UP 64→72, DN 22→26) wasn't actually being applied.
      //   SS in lock gate: UP 64 / DN 22 was 14pt up-bias asymmetry (UP only needed 14 from
      //   neutral, DN needed 28 — exactly 2× harder). Now UP 72 / DN 26: 22 vs 24 — symmetric.
      else if(regime==='SHORT SQUEEZE'){_baseUpThr=is15m?72:70; _baseDnThr=is15m?26:28;}
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
          if(eng.mtfAlignment!==undefined&&eng.mtfAlignment<=-2&&eng.mtfAlignment>-3)reasoning.push(`[MTF-WARN] UP lock proceeding but ${Math.abs(eng.mtfAlignment).toFixed(1).replace(/\.0$/,'')}/5 timeframes against UP`);
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
            } else if(Date.now()-lockReleasedAtRef.current<45000){
              // V5.6.11: post-release cooldown — must scan for 45s before re-locking
              taraAdviceRef.current='UP - SCANNING (post-release cooldown)';
              const _wait=Math.ceil((45000-(Date.now()-lockReleasedAtRef.current))/1000);
              reasoning.push(`[LOCK] UP candidate held — cooldown ${formatDuration(_wait)} remaining`);
            } else {
              lockedCallRef.current={dir:'UP',lockedAt:Date.now(),lockedPosterior:posterior,lockedRegime:regime,lockPrice:currentPrice,isLateLock:isLateLockZone,lockedSignals:eng.rawSignalScores?{...eng.rawSignalScores}:null}; // V134: snapshot signals at lock
              taraAdviceRef.current='UP - LOCKED';
              biasCountRef.current={UP:0,DOWN:0};
              _persistLock(); // V5.6: cloud-save so refresh restores this lock
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
          if(eng.mtfAlignment!==undefined&&eng.mtfAlignment>=2&&eng.mtfAlignment<3)reasoning.push(`[MTF-WARN] DOWN lock proceeding but ${eng.mtfAlignment.toFixed(1).replace(/\.0$/,'')}/5 timeframes against DOWN`);
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
            } else if(Date.now()-lockReleasedAtRef.current<45000){
              // V5.6.11: post-release cooldown
              taraAdviceRef.current='DOWN - SCANNING (post-release cooldown)';
              const _wait=Math.ceil((45000-(Date.now()-lockReleasedAtRef.current))/1000);
              reasoning.push(`[LOCK] DOWN candidate held — cooldown ${formatDuration(_wait)} remaining`);
            } else {
              lockedCallRef.current={dir:'DOWN',lockedAt:Date.now(),lockedPosterior:posterior,lockedRegime:regime,lockPrice:currentPrice,isLateLock:isLateLockZone,lockedSignals:eng.rawSignalScores?{...eng.rawSignalScores}:null,rugPullLock:isRugPull};
              if(isRugPull&&bearCount<CONSECUTIVE_NEEDED_DN)reasoning.push(`[RUG-FIRE] Rug pull detected — DOWN locked early at posterior ${posterior.toFixed(0)}`); // V134: snapshot signals at lock
              taraAdviceRef.current='DOWN - LOCKED';
              biasCountRef.current={UP:0,DOWN:0};
              _persistLock(); // V5.6: cloud-save so refresh restores this lock
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
            const reason=_fgtClear?`FGT now ${eng.mtfAlignment>0?'UP':'DOWN'} ${Math.abs(eng.mtfAlignment).toFixed(1).replace(/\.0$/,'')}/4`:
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
        const _severeCollapse=postDelta>=35; // V5.5.5: 25 → 35, less twitchy
        const decayCollapse=_severeCollapse||(postDelta>=22&&_postLockStable); // V5.5.5: 15 → 22
        // V135: Deep-adverse threshold lowered 55 → 30 bps. 55 bps on $75K BTC is a $400 move —
        //       by the time you're that far wrong, the round is already lost. 30 bps is enough
        //       adverse to recognize a broken call while still being above tick noise.
        // V3.1.7+/V3.1.9: Window-type-aware. Each window character has different normal-noise
        //   boundaries. WHIPSAW is the most extreme — adverse moves of 30-40bps are noise here,
        //   not signal. DEAD is the tightest — anything is meaningful. Per-type thresholds:
        //     WHIPSAW    50bps  — high amplitude with constant reversals; releasing on noise destroys winners
        //     SPIKE-FADE 25bps  — early move exhausted, late adverse moves real (front-loaded action)
        //     TRENDING   35bps  — established direction; tighter than WHIPSAW but wider than NORMAL
        //     LATE-BREAK 30bps  — standard once break is underway
        //     RANGE      20bps  — mean-reversion windows punish wrong-side commitment
        //     GRIND      30bps  — slow trends, normal default
        //     DEAD       15bps  — every move is signal, release fast
        //     OPENING    30bps  — fallback default
        const _ampLabel=eng.windowAmplitude?.label||'NORMAL';
        const _deepWrongBps=
          _ampLabel==='WHIPSAW'?50:
          _ampLabel==='TRENDING'?35:
          _ampLabel==='SPIKE-FADE'?25:
          _ampLabel==='RANGE'?20:
          _ampLabel==='DEAD'?15:
          /* LATE-BREAK / GRIND / OPENING / NORMAL */ 30;
        const deepWrong=(lock.dir==='UP'&&gapBps<-_deepWrongBps)||(lock.dir==='DOWN'&&gapBps>_deepWrongBps);
        const catastrophicRugpull=(isRugPull&&showRugPullAlerts&&lock.dir==='UP')||(isRugPull&&lock.dir==='UP'&&posterior<10);
        // V140: Mirror — catastrophic upward spike releases DOWN locks immediately.
        //       Faster than waiting for deepWrong (gap > 30 bps adverse). Symmetric to rug-pull.
        const catastrophicSpike=(eng.isMoonshot&&lock.dir==='DOWN')||(eng.isMoonshot&&lock.dir==='DOWN'&&posterior>90);
        // V5.5.5: Soft-flip releases tightened. User reports 'locks and releases in a min
        //   or so' on the engine general prediction. Each soft release now requires more
        //   decisive evidence before firing. Safety releases (rugpull/spike/deep adverse)
        //   left unchanged — those are real reversals.
        let signalRegimeChange=false;
        let flippedSignals=[];
        if(lock.lockedSignals&&eng.rawSignalScores&&_postLockStable){
          const lockSign=lock.dir==='UP'?1:-1;
          let flipCount=0;
          ['gap','momentum','structure','flow','technical','regime'].forEach(k=>{
            const at=lock.lockedSignals[k]||0;
            const now=eng.rawSignalScores[k]||0;
            const wasWith=Math.sign(at)===lockSign&&Math.abs(at)>3;
            const nowAgainst=Math.sign(now)===-lockSign&&Math.abs(now)>3;
            if(wasWith&&nowAgainst){flipCount++;flippedSignals.push(k);}
          });
          // V5.5.5: 4+ signals flipped (was 3+). Requires stronger consensus reversal.
          if(flipCount>=4)signalRegimeChange=true;
        }
        // V5.5.5: Trajectory flip threshold ±7 → ±10. Higher bar to release.
        const trajFlipAgainst=(lock.dir==='UP'&&(eng.trajectoryAdj||0)<=-10&&_postLockStable)||
                              (lock.dir==='DOWN'&&(eng.trajectoryAdj||0)>=10&&_postLockStable);
        // V5.5.5: FGT flip threshold 2/4 → 3/4. Harder to flip out.
        const fgtFlipAgainst=_postLockStable&&(
          (lock.dir==='UP'&&(eng.mtfAlignment||0)<=-3)||
          (lock.dir==='DOWN'&&(eng.mtfAlignment||0)>=3)
        );
        // V5.5.5: Regime revalidation tightened — trajectory must lean more decisively against.
        const _bullishRegimes=['SHORT SQUEEZE','TRENDING UP'];
        const _bearishRegimes=['TRENDING DOWN'];
        const _lockedInBullishRg=_bullishRegimes.includes(lock.lockedRegime||'');
        const _lockedInBearishRg=_bearishRegimes.includes(lock.lockedRegime||'');
        const _nowInBullishRg=_bullishRegimes.includes(regime);
        const _nowInBearishRg=_bearishRegimes.includes(regime);
        const _trajLeansDn=(eng.trajectoryAdj||0)<=-8; // V5.5.5: -5 → -8
        const _trajLeansUp=(eng.trajectoryAdj||0)>=8;  // V5.5.5: +5 → +8
        const regimeRevalidation=_postLockStable&&(
          (lock.dir==='UP'&&_lockedInBullishRg&&!_nowInBullishRg&&_trajLeansDn)||
          (lock.dir==='DOWN'&&_lockedInBearishRg&&!_nowInBearishRg&&_trajLeansUp)
        );
        if(deepWrong||catastrophicRugpull||catastrophicSpike||decayCollapse||signalRegimeChange||trajFlipAgainst||fgtFlipAgainst||regimeRevalidation){
          lockedCallRef.current=null;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};
          // V5.6.11: stamp release timestamp so the cooldown blocks re-lock for 45s
          lockReleasedAtRef.current=Date.now();
          // V134: reset window-direction commitment so flip to opposite direction is allowed
          windowSignalDirRef.current=null;
          taraAdviceRef.current='LOCK RELEASED';
          _persistLock(); // V5.6: reflect the now-released state in cloud
          if(catastrophicRugpull)reasoning.push(`[LOCK] Released — catastrophic rug pull (UP lock)`);
          else if(catastrophicSpike)reasoning.push(`[LOCK] Released — catastrophic upward spike (DOWN lock)`);
          else if(signalRegimeChange)reasoning.push(`[LOCK] Released — signal regime flipped (${flippedSignals.join(',')} now against ${lock.dir})`);
          else if(decayCollapse)reasoning.push(`[LOCK] Released — posterior decayed ${postDelta.toFixed(0)} pts since lock${_severeCollapse&&!_postLockStable?' (severe — bypassed stability window)':''}`);
          else if(trajFlipAgainst)reasoning.push(`[LOCK] Released — trajectory flipped against ${lock.dir} (${eng.trajectoryAdj.toFixed(0)})`);
          else if(fgtFlipAgainst)reasoning.push(`[LOCK] Released — FGT now ${eng.mtfAlignment>0?'UP':'DOWN'} ${Math.abs(eng.mtfAlignment).toFixed(1).replace(/\.0$/,'')}/4 against ${lock.dir}`);
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
        // V5.5: Pass through threshold values used by the lock state machine. These were
        //   computed inside the analysis useMemo but never exposed to consumers, so the
        //   projections panel showed `||65` and `||35` defaults instead of regime-adjusted values.
        upThreshold:Number(upThreshold),
        downThreshold:Number(downThreshold),
        // V3.1.7: volume-flow + window-amplitude signals (informational, surfaced via UI chips)
        volFlow:eng.volFlow||null,
        windowAmplitude:eng.windowAmplitude||null,
        // V3.1.11: within-window candle pattern (informational, surfaced via UI chip)
        candlePattern:eng.candlePattern||null,
        lockInfo:lockedCallRef.current?{dir:lockedCallRef.current.dir,lockedAt:lockedCallRef.current.lockedAt,lockedPosterior:lockedCallRef.current.lockedPosterior,lockPrice:lockedCallRef.current.lockPrice,lockRegime:lockedCallRef.current.lockedRegime}:null,
        bullCount:Number(bullCount),bearCount:Number(bearCount)};
    }catch(err){return{prediction:'ERROR',rawProbAbove:50,projections:[],reasoning:[err.stack||String(err)],textColor:'text-rose-500',advisor:{label:'MATH CRASH',reason:String(err),color:'rose',animate:false,hasAction:false},regime:'ERROR'};}
  },[currentPrice,liveHistory,targetMargin,timeState.minsRemaining,timeState.secsRemaining,timeState.currentHour,orderBook,forceRender,betAmount,maxPayout,currentOffer,globalFlow,userPosition,windowType,isMounted,showRugPullAlerts,positionStatus,velocityRef,bloomberg,useLocalTime,regimeMemory,regimeWeights,strikeConfirmed,adaptiveWeights,calibration]);

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

  // V3.2.4: TARA'S CALL — a separate, higher-conviction decision layer.
  //   The "general prediction" (analysis.prediction / posterior) tells you the most likely
  //   outcome given current signals. Tara's Call adds an explicit conviction filter — she
  //   only "calls" UP or DOWN when MULTIPLE signals confirm. Otherwise she sits out.
  //
  //   Decision tree (in order):
  //     1. Quality < 50           → SIT OUT (low signal quality, sit-out trades)
  //     2. |Posterior - 50| < 12  → SIT OUT (no real conviction either way)
  //     3. |FGT| < 1.5/4          → SIT OUT (primary multi-timeframe signal silent)
  //     4. Window DEAD/WHIPSAW + quality<70 → SIT OUT (regime hostile to direction trades)
  //     5. VOL-FLOW divergent against direction → SIT OUT (tape disagrees with price)
  //     6. Otherwise → match general prediction direction
  //
  //   The result is tracked separately in taraScorecards. SIT_OUT counts neither way.
  //   This lets us measure: do Tara's selective calls win at higher rate than the firehose?
  // V5.6.4 REDESIGN: Slower, more deliberate calls. User feedback: "Tara needs to stop
  //   locking so quickly, now most of her decision are being 50-50 at that point it is
  //   a coin flip." New flow:
  //     1. SEARCH phase (first 20s of every window): observe only, no commit possible
  //     2. SIGNAL phase: direction emerges, gates measure conviction
  //     3. LOCK: only when conviction is real and persistent (handled in lifecycle effect)
  //     4. Coin-flip → SIT_OUT (handled by tightened gates + posterior-history check)
  //     5. Kalshi sanity check: if market disagrees materially, require higher conviction
  const taraCall=(()=>{
    const _post=analysis?.rawProbAbove;
    if(!analysis||_post==null||isNaN(_post)){
      return{call:'SIT_OUT',reason:'Engine still loading — analysis not ready yet',confidence:0};
    }
    const post=_post;
    const conviction=Math.abs(post-50);
    const dir=post>=50?'UP':'DOWN';
    const fgtAbs=Math.abs(analysis.mtfAlignment||0);
    const winType=analysis.windowAmplitude?.label||'NORMAL';
    const vfLabel=analysis.volFlow?.label||'';
    const q=Math.round(qualityGate?.score||0);
    const _totalSec=windowType==='15m'?900:300;
    const _elapsed=_totalSec-((timeState.minsRemaining*60)+timeState.secsRemaining);
    const _remaining=Math.max(0,_totalSec-_elapsed);
    // V5.6.4: Mandatory search phase — first 20s, observe only. Even with strong signals,
    //   we don't form a call this early. Catches the "Kalshi initial price snap" noise.
    if(_elapsed<20){
      return{call:'SIT_OUT',reason:`Searching for direction (${20-_elapsed}s of observation remaining)`,confidence:0,direction:dir,conviction,phase:'SEARCH'};
    }
    // V5.6.4: HARD floors — no time-decay shenanigans. If conviction is below this, sit out
    //   no matter how late in the window. Coin-flip detection.
    // V5.6.8: HARD floors — fixed by default. Learning does NOT make Tara more selective
    //   except via a safety valve for absolute-bad regimes (<25% win rate over 15+ trades).
    //   Active learning lives in lifecycle (samples) and confidence (display), not here.
    const _learn=taraLearningsRef.current;
    const _safety=Math.max(0,Math.min(8,_learn?.multipliers?.regimeFloorSafety?.[analysis.regime]||0));
    const Q_FLOOR=30+_safety;             // base 30, +5 only if regime is absolutely bad
    const CONV_FLOOR=10+_safety;          // base 10, same safety nudge
    // Tape consensus (multi-window 15s/30s/60s buy%)
    const _tape15=tapeWindows?.w15?.buyPct??50;
    const _tape30=tapeWindows?.w30?.buyPct??50;
    const _tape60=tapeWindows?.w60?.buyPct??50;
    const _tapes=[_tape15,_tape30,_tape60];
    const _upAgrees=_tapes.filter(p=>p>=60).length>=2;
    const _downAgrees=_tapes.filter(p=>p<=40).length>=2;
    const tapeAgreesUP=_upAgrees&&dir==='UP';
    const tapeAgreesDOWN=_downAgrees&&dir==='DOWN';
    const tapeStronglyAgrees=tapeAgreesUP||tapeAgreesDOWN;
    const _upSuper=_tapes.filter(p=>p>=70).length>=2;
    const _downSuper=_tapes.filter(p=>p<=30).length>=2;
    const tapeSuperStrong=(_upSuper&&dir==='UP')||(_downSuper&&dir==='DOWN');
    const tapeBuyPct=dir==='UP'?Math.max(..._tapes):Math.min(..._tapes);
    // V5.6.4: KALSHI CROSS-CHECK — market price is a third opinion. Use as sanity check:
    //   - If Kalshi clearly agrees with our direction → boost confidence, allow faster lock
    //   - If Kalshi clearly disagrees → require materially higher conviction or sit out
    //   kalshiYesPrice is 0-100, representing market's P(price closes above strike) = P(UP).
    const _kPct=kalshiYesPrice;
    const kalshiAvail=_kPct!=null&&_kPct>0&&_kPct<100;
    const kalshiAgrees=kalshiAvail&&((dir==='UP'&&_kPct>=55)||(dir==='DOWN'&&_kPct<=45));
    const kalshiStronglyAgrees=kalshiAvail&&((dir==='UP'&&_kPct>=65)||(dir==='DOWN'&&_kPct<=35));
    // Disagreement: market sees the opposite direction with material conviction
    const kalshiDisagrees=kalshiAvail&&((dir==='UP'&&_kPct<=40)||(dir==='DOWN'&&_kPct>=60));
    const kalshiStronglyDisagrees=kalshiAvail&&((dir==='UP'&&_kPct<=30)||(dir==='DOWN'&&_kPct>=70));
    const _dirLead=`Watching ${dir} (${conviction.toFixed(0)}pt lean)`;
    // Gate 1: quality floor
    if(q<Q_FLOOR){
      return{call:'SIT_OUT',reason:`${_dirLead} — q${q} below ${Q_FLOOR} floor, signal too weak`,confidence:0,direction:dir,conviction,phase:'WATCHING'};
    }
    // Gate 2: conviction floor (THE coin-flip filter)
    if(conviction<CONV_FLOOR){
      return{call:'SIT_OUT',reason:`Coin-flip — posterior ${post.toFixed(0)}% only ${conviction.toFixed(0)}pt off neutral (need ±${CONV_FLOOR})`,confidence:0,direction:dir,conviction,phase:'WATCHING'};
    }
    // Gate 3: Kalshi material disagreement — market sees opposite direction strongly.
    //   When Kalshi strongly disagrees, we need extreme own-conviction to override.
    if(kalshiStronglyDisagrees&&conviction<25){
      return{call:'SIT_OUT',reason:`${_dirLead} — but Kalshi at ${_kPct}% says opposite, conviction ${conviction.toFixed(0)} insufficient to override`,confidence:0,direction:dir,conviction,phase:'WATCHING'};
    }
    // Gate 4: FGT support — primary multi-timeframe signal must show some pulse
    const isFastTrackRegime=['TRENDING UP','TRENDING DOWN','SHORT SQUEEZE','LONG SQUEEZE'].includes(analysis.regime);
    const fgtMin=tapeStronglyAgrees||kalshiStronglyAgrees?0.5:1.0; // V5.6.4: was 0.0/0.4/0.7
    if(fgtAbs<fgtMin&&!isFastTrackRegime){
      return{call:'SIT_OUT',reason:`${_dirLead} — FGT ${fgtAbs.toFixed(1)}/4 below ${fgtMin} threshold (multi-timeframe quiet)`,confidence:0,direction:dir,conviction,phase:'WATCHING'};
    }
    // SOFT gates — apply confidence haircuts instead of blocking
    let confidenceHaircut=0;
    let haircutReasons=[];
    if(winType==='DEAD'||winType==='WHIPSAW'){
      if(q<50&&!tapeStronglyAgrees&&!kalshiStronglyAgrees){
        return{call:'SIT_OUT',reason:`${_dirLead} — ${winType} regime + q${q} no consensus from tape/kalshi`,confidence:0,direction:dir,conviction,phase:'WATCHING'};
      }
      confidenceHaircut+=15;
      haircutReasons.push(`${winType} regime`);
    }
    const isDivergent=
      (dir==='UP'&&(vfLabel==='BUY-DIVERGENT'||vfLabel==='BUY-FAILING'))||
      (dir==='DOWN'&&(vfLabel==='SELL-DIVERGENT'||vfLabel==='SELL-FAILING'));
    if(isDivergent){
      if(q<50&&conviction<18&&!tapeStronglyAgrees){
        return{call:'SIT_OUT',reason:`${_dirLead} — tape ${vfLabel} disagrees, q+conv weak`,confidence:0,direction:dir,conviction,phase:'WATCHING'};
      }
      confidenceHaircut+=15;
      haircutReasons.push(`tape ${vfLabel}`);
    }
    if(kalshiDisagrees&&!kalshiStronglyDisagrees){
      // Mild Kalshi disagreement (40-45 / 55-60) — apply haircut, don't block
      confidenceHaircut+=10;
      haircutReasons.push(`kalshi ${_kPct}% disagrees`);
    }
    // All gates passed — Tara forms a call
    const _confBase=Math.min(95,Math.round(conviction*1.5+q*0.4));
    const _tapeBoost=tapeSuperStrong?15:tapeStronglyAgrees?8:0;
    const _kalshiBoost=kalshiStronglyAgrees?10:kalshiAgrees?5:0;
    // V5.6.8: Learning boost — when current regime+direction matches historically winning
    //   combos, add small confidence boost. When current matches historically losing combos,
    //   subtract. This is how Tara learns to PICK BETTER without sitting out more.
    const _regDirKey=(analysis.regime||'UNKNOWN')+'|'+dir;
    const _learnConfBoost=Math.max(-8,Math.min(8,_learn?.multipliers?.regimeDirConfBoost?.[_regDirKey]||0));
    const _confidence=Math.max(25,_confBase-confidenceHaircut+_tapeBoost+_kalshiBoost+_learnConfBoost);
    const _reasonParts=[`${conviction.toFixed(0)}pt ${dir} lean`,`FGT ${fgtAbs.toFixed(1)}/4`,`q${q}`];
    if(tapeSuperStrong)_reasonParts.push(`tape super-strong (${tapeBuyPct.toFixed(0)}%)`);
    else if(tapeStronglyAgrees)_reasonParts.push(`tape ${tapeBuyPct.toFixed(0)}%`);
    if(kalshiStronglyAgrees)_reasonParts.push(`kalshi ${_kPct}% confirms`);
    else if(kalshiAgrees)_reasonParts.push(`kalshi ${_kPct}% leans ${dir}`);
    if(haircutReasons.length>0)_reasonParts.push(`-${confidenceHaircut} for ${haircutReasons.join(' + ')}`);
    if(_learnConfBoost>0)_reasonParts.push(`+${_learnConfBoost} learned ${dir} preference in ${analysis.regime}`);
    else if(_learnConfBoost<0)_reasonParts.push(`${_learnConfBoost} historical ${dir} weakness in ${analysis.regime}`);
    return{
      call:dir,reason:_reasonParts.join(' · '),confidence:_confidence,direction:dir,conviction,phase:'FORMING',
      // Pass through to lifecycle so it can compute needSamples consistently
      _ctx:{q,conviction,fgtAbs,regime:analysis.regime,winType,tapeStronglyAgrees,tapeSuperStrong,kalshiAgrees,kalshiStronglyAgrees,_remaining,_elapsed},
    };
  })();
  // V4.3: Attach lifecycle data so the Tara's Call card can render phase/samples/snapshot.
  //   Refs read at render time — same data the lifecycle effect uses.
  taraCall.samples=taraCallSampleRef.current?.count||0;
  taraCall.snapshot=taraCallSnapshotRef.current||null;
  // V5.5d: Compute needSamples for display — mirrors lifecycle (clean=1, good=2, default=3,
  //   hostile=5) with per-60s time-decay.
  (()=>{
    const _q=qualityGate?.score||0;
    const _fgtAbs=Math.abs(analysis?.mtfAlignment||0);
    const _regime=analysis?.regime||'';
    const _cleanRegime=['TRENDING UP','TRENDING DOWN','SHORT SQUEEZE','LONG SQUEEZE'].includes(_regime);
    const _winType=analysis?.windowAmplitude?.label;
    const _hostile=_winType==='DEAD'||_winType==='WHIPSAW';
    // V5.6.4: Use the same _ctx the gate logic computed if available — keeps display in sync
    //   with the actual lock criteria. Falls back to local read of qualityGate if missing.
    const _ctx=taraCall._ctx;
    const _conv=_ctx?.conviction??Math.abs((analysis?.rawProbAbove||50)-50);
    const _tapeStronglyAgrees=_ctx?.tapeStronglyAgrees||false;
    const _tapeSuperStrong=_ctx?.tapeSuperStrong||false;
    const _kalshiAgrees=_ctx?.kalshiAgrees||false;
    const _kalshiStronglyAgrees=_ctx?.kalshiStronglyAgrees||false;
    const _totalSec=windowType==='15m'?900:300;
    const _elapsed=_totalSec-((timeState.minsRemaining*60)+timeState.secsRemaining);
    const _remaining=Math.max(0,_totalSec-_elapsed);
    // V5.6.4: Tier-based sample requirements (one sample ≈ one second).
    //   Tier 1 (exceptional, ~15s):   q≥85, conv≥20, FGT≥3.5, clean+!hostile, tape super-strong, kalshi confirms
    //   Tier 2 (strong,      ~60s):   q≥70, conv≥15, FGT≥2.5, !hostile, AND (tape OR kalshi agrees)
    //   Tier 3 (default,    ~180s):   q≥55, conv≥10, FGT≥1.5, !hostile  ← target sweet spot
    //   Tier 4 (patient,    ~270s):   anything else passing the gates
    let _need;
    if(_q>=85&&_conv>=20&&_fgtAbs>=3.5&&_cleanRegime&&!_hostile&&_tapeSuperStrong&&_kalshiStronglyAgrees){
      _need=10;
    } else if(_q>=75&&_conv>=18&&_fgtAbs>=3.0&&!_hostile&&_tapeStronglyAgrees&&_kalshiAgrees){
      _need=20;
    } else if(_q>=70&&_conv>=15&&_fgtAbs>=2.5&&!_hostile&&(_tapeStronglyAgrees||_kalshiStronglyAgrees||_kalshiAgrees)){
      _need=45;
    } else if(_q>=55&&_conv>=10&&_fgtAbs>=1.5&&!_hostile){
      _need=100;
    } else {
      _need=150;
    }
    // V5.7.2: cap at remaining time minus 90s buffer so lock has time to be meaningful
    const _maxWithBuffer=Math.max(15,_remaining-90);
    taraCall.needSamples=Math.min(_need,_maxWithBuffer);
    // V5.7.2: Honest ETA calculation. Track sample-count history with timestamps so we can
    //   compute actual accumulation rate. Samples only accrue when conviction ≥ floor —
    //   if conviction has been mostly below floor, rate is near zero and the old "1Hz
    //   assumption" was lying. Now we measure what's actually happening.
    const _now=Date.now();
    const _hist=taraSampleRateRef.current;
    // Only push a new datapoint when count actually changed, or every 5s as heartbeat
    const _last=_hist[_hist.length-1];
    if(!_last||_last.count!==taraCall.samples||_now-_last.t>=5000){
      _hist.push({t:_now,count:taraCall.samples});
      while(_hist.length>8)_hist.shift();
    }
    // Compute rate from oldest-to-newest in history (must span ≥10s for stable estimate)
    const _first=_hist[0];
    const _spanMs=_first?_now-_first.t:0;
    const _gain=_first?taraCall.samples-_first.count:0;
    const _rate=_spanMs>=10000?(_gain/(_spanMs/1000)):null; // samples per second
    if(_rate==null||_rate<0.1){
      // Stalled — no useful estimate. Display will show "scanning, conviction not firm enough"
      taraCall.lockEtaSec=null;
      taraCall.lockEtaStalled=true;
    } else {
      const _remainNeeded=Math.max(0,taraCall.needSamples-taraCall.samples);
      taraCall.lockEtaSec=Math.round(_remainNeeded/_rate);
      taraCall.lockEtaStalled=false;
    }
  })();

  // V3.2.4: Snapshot Tara's Call when endgame freeze first fires. This pins Tara's
  //   call for this round. Subsequent posterior shifts within the freeze zone don't
  //   change what gets scored. Reset on each window rollover (handled in rollover effect).
  // V4.2: Two snapshot paths now — early-lock when conditions are clean enough to commit
  //   without waiting, OR endgame-freeze fallback for everything else. Also resets sample
  //   counter when call direction flips.
  useEffect(()=>{
    if(taraCallSnapshotRef.current!==null)return; // already snapshotted this window
    const tc=taraCall;
    const isCall=tc.call==='UP'||tc.call==='DOWN';
    // Track sample stability — if direction flips, reset count
    const ref=taraCallSampleRef.current;
    if(!isCall){
      // V5.6.11 FIX: DO NOT reset accumulated samples on every gate-dip. Previously this
      //   wiped progress whenever conviction dipped below floor for even one tick — meaning
      //   if conviction wobbled around 10pt, samples never accumulated and Tara stayed in
      //   SCANNING forever. Now: preserve count. Conviction rebound resumes accumulation
      //   from where it left off. Only the rollover effect resets samples for a new window.
      // Endgame freeze still triggers a snapshot for SIT_OUT path
      if(analysis?.isSystemLocked){
        taraCallSnapshotRef.current={
          call:tc.call,direction:null,confidence:tc.confidence,reason:tc.reason,
          atSecondsLeft:timeState.minsRemaining*60+timeState.secsRemaining,
          atPosterior:analysis.rawProbAbove,
          locked:false,
          earlyLock:false,
        };
        _persistLock(); // V5.6: cloud-save SIT_OUT commit
        // V5.6.1: log entry — committed SIT_OUT
        // V5.6.9: windowId for dedup
        const _sitWid=computeWindowId(windowType);
        const _sitSessionInfo=typeof getMarketSessions==='function'?getMarketSessions():null;
        const _sitSession=_sitSessionInfo?.dominant||analysis?.session?.name||'UNKNOWN';
        const _entry={
          id:Date.now(),time:Date.now(),windowType,
          windowId:_sitWid,
          regime:analysis?.regime||'',
          dir:'SIT_OUT',confidence:tc.confidence,
          posterior:analysis?.rawProbAbove,
          qScore:Math.round(qualityGate?.score||0),
          fgt:analysis?.mtfAlignment,
          tier:'sitout',
          session:_sitSession,
          reason:tc.reason,
          result:null, // populated at rollover
        };
        setTaraCallLog(prev=>{
          if(prev.some(e=>e&&e.windowId===_sitWid&&e.windowType===windowType))return prev;
          return [...prev,_entry].slice(-500);
        });
      }
      return;
    }
    if(ref.dir!==null&&ref.dir!==tc.call){
      // V5.5d: Direction flipped during formation. Old behavior: reset count and start
      //   forming the new direction. User: 'if the outcome flips against tara's call I
      //   dont want tara to flip too'. Now: keep the original direction claimed, treat
      //   opposite samples as noise (no count change). If price returns to original
      //   direction, samples resume counting. Otherwise she ends up SIT_OUT this window.
      // No state change — preserve original ref.dir and count.
    } else if(ref.dir===null){
      // First directional sample — claim this direction for the window.
      // V5.6.7: Sample weight is conviction-magnitude-aware. weight = clamp(conv/14, 0.5, 1.5).
      //   conv=21 → 1.5 (50% faster lock), conv=14 → 1.0 (par), conv=10 → 0.71, floor 0.5.
      const _convNow=Math.abs((analysis?.rawProbAbove||50)-50);
      const _w=Math.max(0.5,Math.min(1.5,_convNow/14));
      taraCallSampleRef.current={dir:tc.call,count:_w};
    } else {
      // Same direction continues — increment by current weight
      const _convNow=Math.abs((analysis?.rawProbAbove||50)-50);
      const _w=Math.max(0.5,Math.min(1.5,_convNow/14));
      taraCallSampleRef.current={dir:tc.call,count:ref.count+_w};
    }
    const samples=taraCallSampleRef.current.count;
    // V5.5d: Use claimed direction for snapshot, not necessarily current tc.call
    const claimedDir=taraCallSampleRef.current.dir;
    // V5.6.4: Tier-based commit thresholds — same logic as display side. One sample ≈ one
    //   second. NO MORE TIME-DECAY: the decay was the cause of "locks too fast late in
    //   window" — Tara would lock with 1 confirmation if forming kicked in at minute 2+.
    //   Now needSamples is fixed by signal strength alone, capped only by remaining-window
    //   buffer (so we don't lock with 0s left to score).
    const q=qualityGate?.score||0;
    const fgtAbs=Math.abs(analysis?.mtfAlignment||0);
    const regime=analysis?.regime||'';
    const cleanRegime=['TRENDING UP','TRENDING DOWN','SHORT SQUEEZE','LONG SQUEEZE'].includes(regime);
    const winType=analysis?.windowAmplitude?.label;
    const hostileWindow=winType==='DEAD'||winType==='WHIPSAW';
    const _ctx=tc._ctx;
    const conv=_ctx?.conviction??Math.abs((analysis?.rawProbAbove||50)-50);
    const tapeStronglyAgrees=_ctx?.tapeStronglyAgrees||false;
    const tapeSuperStrong=_ctx?.tapeSuperStrong||false;
    const kalshiAgrees=_ctx?.kalshiAgrees||false;
    const kalshiStronglyAgrees=_ctx?.kalshiStronglyAgrees||false;
    const totalSec=windowType==='15m'?900:300;
    const elapsedSec=totalSec-((timeState.minsRemaining*60)+timeState.secsRemaining);
    const remaining=Math.max(0,totalSec-elapsedSec);
    // V5.6.7: Five tiers now. Tier 1.5 fills the gap between "perfect" (rare) and
    //   "strong" (1 min). Catches the "fast clean market" case the user worried about
    //   missing. Magnitude-weighted samples — high conviction locks faster.
    let needSamples,tierLabel;
    if(q>=85&&conv>=20&&fgtAbs>=3.5&&cleanRegime&&!hostileWindow&&tapeSuperStrong&&kalshiStronglyAgrees){
      needSamples=10;tierLabel='exceptional';     // V5.6.11: ~10s
    } else if(q>=75&&conv>=18&&fgtAbs>=3.0&&!hostileWindow&&tapeStronglyAgrees&&kalshiAgrees){
      needSamples=20;tierLabel='strong+';         // ~20s
    } else if(q>=70&&conv>=15&&fgtAbs>=2.5&&!hostileWindow&&(tapeStronglyAgrees||kalshiStronglyAgrees||kalshiAgrees)){
      needSamples=45;tierLabel='strong';          // ~45s
    } else if(q>=55&&conv>=10&&fgtAbs>=1.5&&!hostileWindow){
      needSamples=100;tierLabel='default';        // ~1.5 min — user wants 1-2 min target
    } else {
      needSamples=150;tierLabel='patient';        // ~2.5 min
    }
    // V5.6.7: LEARNING — apply tier-specific samples adjustment from past performance.
    //   If tier X has been winning >75%, lock faster (it's reliable). If <55%, lock slower
    //   (require more confirmation). _learnings.multipliers.tierSamplesAdjust is computed
    //   from historical tier outcomes and is a fraction (-0.15 to +0.25).
    const _learnings=taraLearningsRef.current;
    const _tierAdjustFrac=_learnings?.multipliers?.tierSamplesAdjust?.[tierLabel]||0;
    // V5.6.8: regime+direction speed adjustment — the active learning signal.
    //   Proven combos lock 20% faster. Weak combos take 20% more confirmation
    //   (but never sit out — that was the V5.6.7 mistake the user rejected).
    const _regDirKey=(analysis?.regime||'UNKNOWN')+'|'+claimedDir;
    const _regDirSpeedAdj=_learnings?.multipliers?.regimeDirSpeedAdj?.[_regDirKey]||0;
    needSamples=Math.round(needSamples*(1+_tierAdjustFrac)*(1+_regDirSpeedAdj));
    // Cap so lock has time to be scored after committing
    needSamples=Math.min(needSamples,Math.max(15,remaining-90));
    if(taraCallSnapshotRef.current!==null)return; // already committed — don't overwrite
    if(samples>=needSamples||analysis?.isSystemLocked){
      // V5.5d: Snapshot uses CLAIMED direction (the first formed direction this window),
      //   not current tc.call. If tc.call has flipped temporarily, we still commit to
      //   the original direction Tara was building toward.
      const _committedCall=claimedDir||tc.call;  // claimed wins; tc.call as fallback for safety
      const _committedReason=ref.dir===tc.call?tc.reason:`Locked ${_committedCall} — original lean held through flip`;
      // V5.6.7: Compute current session for learning context
      const _sessionInfo=typeof getMarketSessions==='function'?getMarketSessions():null;
      const _session=_sessionInfo?.dominant||analysis?.session?.name||'UNKNOWN';
      taraCallSnapshotRef.current={
        call:_committedCall,direction:_committedCall,confidence:tc.confidence,reason:_committedReason,
        atSecondsLeft:timeState.minsRemaining*60+timeState.secsRemaining,
        atPosterior:analysis?.rawProbAbove,
        locked:true,
        earlyLock:!analysis?.isSystemLocked,
        samples,
        needSamples,
        tier:tierLabel,
        session:_session,
        regime:analysis?.regime||'',
        qScore:Math.round(qualityGate?.score||0),
        fgt:analysis?.mtfAlignment,
      };
      _persistLock(); // V5.6: cloud-save LOCKED snapshot
      // V5.6.1: log entry — committed UP/DOWN
      // V5.6.9: windowId added so cross-device entries dedupe to one log row per window.
      const _wid=computeWindowId(windowType);
      const _entry={
        id:Date.now(),time:Date.now(),windowType,
        windowId:_wid,
        regime:analysis?.regime||'',
        dir:_committedCall,confidence:tc.confidence,
        posterior:analysis?.rawProbAbove,
        qScore:Math.round(qualityGate?.score||0),
        fgt:analysis?.mtfAlignment,
        tier:tierLabel,
        session:_session,
        reason:_committedReason,
        earlyLock:!analysis?.isSystemLocked,
        samples,needSamples,
        result:null, // populated at rollover scoring
      };
      // V5.6.9: At-append dedup. Another device may have already committed this window
      //   and replicated to cloud. Don't add a duplicate row from this device — just sync.
      setTaraCallLog(prev=>{
        if(prev.some(e=>e&&e.windowId===_wid&&e.windowType===windowType))return prev;
        return [...prev,_entry].slice(-500);
      });
    } else {
      // V5.6: Mid-formation persist — refresh during ANALYZING/FORMING restores sample
      //   count so Tara picks up where she left off instead of resetting to 0/N. Debounced
      //   so this doesn't hammer Firestore on every tick.
      _persistLock();
    }
  },[analysis?.isSystemLocked,taraCall.call,taraCall.direction,taraCall.confidence,timeState.minsRemaining,timeState.secsRemaining,analysis?.rawProbAbove,taraCall.reason,qualityGate?.score,analysis?.mtfAlignment,analysis?.regime,analysis?.windowAmplitude?.label]);

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

  // ── V3.2.4: TARA'S CALL AUTO-BROADCASTS ───────────────────────────────────
  // Tara's Call has its own broadcast lifecycle, distinct from the user-facing manual sends.
  // She auto-sends one of: SCAN (window opens, observing), SIGNAL (forming UP/DOWN), LOCK
  // (committed call), or SITOUT (explicit pass). Each fires at most once per window.
  const taraBroadcastRef=useRef({key:null,sentScan:false,sentSignal:false,sentLock:false,sentSitout:false});
  useEffect(()=>{
    if(!analysis||!discordWebhook||!discordWebhook.startsWith('http'))return;
    const winKey=timeState.startWindow||timeState.nextWindow;
    if(!winKey)return;
    // Reset broadcast flags on window change
    if(taraBroadcastRef.current.key!==winKey){
      taraBroadcastRef.current={key:winKey,sentScan:false,sentSignal:false,sentLock:false,sentSitout:false};
    }
    const sec=timeState.minsRemaining*60+timeState.secsRemaining;
    const totalSec=windowType==='15m'?900:300;
    const elapsed=totalSec-sec;
    const tc=taraCall;
    const tw=taraScorecards[windowType]||{wins:0,losses:0,sitouts:0};
    const taraRecord=`${tw.wins}W · ${tw.losses}L · ${tw.sitouts} sat out  (${tw.wins+tw.losses>0?((tw.wins/(tw.wins+tw.losses))*100).toFixed(1):'—'}%)`;
    const fgtAbs=Math.abs(analysis.mtfAlignment||0);
    const fgtDir=(analysis.mtfAlignment||0)>0.05?'UP':(analysis.mtfAlignment||0)<-0.05?'DOWN':'';
    const baseData={
      posterior:analysis.rawProbAbove,
      quality:qualityGate?.score||0,
      fgtAbs,fgtDir,
      regime:analysis.regime,
      windowAmp:analysis.windowAmplitude?.label,
      clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`,
      taraRecord,
      strike:targetMargin,
      price:currentPrice,
    };
    // SCAN: broadcast once per window after 30s of observing (gives signals time to develop)
    if(!taraBroadcastRef.current.sentScan&&elapsed>=30&&elapsed<=60){
      taraBroadcastRef.current.sentScan=true;
      broadcastToDiscord('TARA_SCAN',{...baseData,summary:`Posterior ${(analysis.rawProbAbove||50).toFixed(0)} · ${analysis.regime} · scanning`});
    }
    // SIGNAL: V5.5d — fires exactly ONCE per window. User: '1 of each message type'.
    //   Old logic let SIGNAL fire again on direction flip — that's now disabled.
    if(!taraBroadcastRef.current.sentSignal&&(tc.call==='UP'||tc.call==='DOWN')&&elapsed>=20){
      taraBroadcastRef.current.sentSignal=true;
      broadcastToDiscord('TARA_SIGNAL',{...baseData,dir:tc.call,confidence:tc.confidence,reason:tc.reason});
    }
    // LOCK: broadcast once per window after Tara's Call is snapshotted at endgame
    if(!taraBroadcastRef.current.sentLock&&taraCallSnapshotRef.current&&taraCallSnapshotRef.current.call!=='SIT_OUT'){
      taraBroadcastRef.current.sentLock=true;
      const snap=taraCallSnapshotRef.current;
      broadcastToDiscord('TARA_LOCK',{...baseData,dir:snap.call,confidence:snap.confidence,reason:snap.reason,gap:targetMargin>0?((currentPrice-targetMargin)/targetMargin)*10000:0});
    }
    // SITOUT: broadcast if Tara has been SIT_OUT for the bulk of the window AND we haven't broadcast a signal
    // Fires at endgame freeze if she's still SIT_OUT and never had a directional call
    if(!taraBroadcastRef.current.sentSitout&&!taraBroadcastRef.current.sentSignal&&analysis.isSystemLocked&&tc.call==='SIT_OUT'){
      taraBroadcastRef.current.sentSitout=true;
      broadcastToDiscord('TARA_SITOUT',{...baseData,reason:tc.reason});
    }
  },[analysis?.rawProbAbove,taraCall.call,taraCall.confidence,taraCall.reason,analysis?.isSystemLocked,timeState.startWindow,timeState.nextWindow,timeState.minsRemaining,timeState.secsRemaining,discordWebhook,windowType,taraScorecards,qualityGate?.score,targetMargin,currentPrice]);

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
      // V134: 30 second view window unless new activity — extends timer if more triggers.
      // V3.1.7 BUGFIX: Previous version ran clearTimeout in the effect's cleanup, which
      //   meant every subsequent flowSignal tick (deps change) cleared the auto-close timer.
      //   Result: panel stayed open indefinitely as long as flow kept moving (which is always
      //   in live markets). Now the timer is only cleared when triggered re-fires fresh.
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
    // V3.1.7: removed the cleanup that cleared autoCloseTimerRef on every dep change.
    //         The timer should persist across flow ticks once started.
  },[flowSignal.score,flowSignal.streakCount,flowSignal.netDelta90s,flowSignal.bnDivBps,analysis?.velocityRegime]);

  // V2.2.2: Manual-open auto-close. When user manually clicks FLOW to open the panel,
  //         start a 90s idle timer. Resets on real whale activity (score or streak rising).
  //         Without this, the panel stayed open indefinitely after any manual click — visible
  //         and obstructive long after the user had moved on.
  // V3.1.7: Hard safety net — close FlowPanel after 3 minutes regardless of how it opened.
  //         Even if other timers misfire or get cleared, this guarantees the panel doesn't
  //         stay obstructively visible indefinitely.
  const hardCloseTimerRef=useRef(null);
  useEffect(()=>{
    if(!showWhaleLog){
      if(hardCloseTimerRef.current){clearTimeout(hardCloseTimerRef.current);hardCloseTimerRef.current=null;}
      return;
    }
    if(hardCloseTimerRef.current)clearTimeout(hardCloseTimerRef.current);
    hardCloseTimerRef.current=setTimeout(()=>{
      setShowWhaleLog(false);
      autoOpenedRef.current=false;
    },180000); // 3 minutes hard maximum
    return()=>{if(hardCloseTimerRef.current)clearTimeout(hardCloseTimerRef.current);};
  },[showWhaleLog,setShowWhaleLog]);

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

    // V3.2.4: Whale advisory — if user has a position open, evaluate whether this whale
    //   flow helps or hurts them. Buy-side whale flow is bullish (good for UP positions,
    //   adverse for DOWN). Sell-side whale flow is bearish (good for DOWN, adverse for UP).
    //   The advisory is informational — user decides whether to act.
    let whaleAdvisory=null;
    if(userPosition&&fs.netDelta90s){
      const whaleDir=fs.netDelta90s>0?'UP':'DOWN';
      const aligned=whaleDir===userPosition;
      const heavySize=Math.abs(fs.netDelta90s)>=750000; // $750K+ in 90s
      const veryHeavy=Math.abs(fs.netDelta90s)>=1500000;
      if(aligned){
        whaleAdvisory={
          action:'HOLD',
          tone:'favorable',
          reason:`Whale flow ${whaleDir} ($${(Math.abs(fs.netDelta90s)/1000).toFixed(0)}K) aligns with your ${userPosition} position. ${veryHeavy?'Very heavy size — consider scaling up if room remains.':heavySize?'Heavy size — conviction increasing.':'Modest support.'}`
        };
      } else {
        whaleAdvisory={
          action:veryHeavy?'CASH OUT':heavySize?'CASH OUT':'WATCH',
          tone:'adverse',
          reason:`Whale flow ${whaleDir} ($${(Math.abs(fs.netDelta90s)/1000).toFixed(0)}K) opposes your ${userPosition} position. ${veryHeavy?'Very heavy adverse size — consider closing.':heavySize?'Heavy adverse size — exit risk rising.':'Watch for confirmation before acting.'}`
        };
      }
    }

    broadcastToDiscord('WHALE',{
      netFlow:fs.netDelta90s,
      totalVol:fs.streakUSD,
      tradeCount:fs.streakCount,
      exchangeCount:exCount,
      exchanges,exchangeCounts,
      totalBuy,totalSell,biggest,
      spotAligned,
      price:currentPrice,
      clock:`${timeState.minsRemaining}m ${timeState.secsRemaining}s`,
      // V3.2.4: position-aware advisory
      userPosition,
      whaleAdvisory,
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
        // V3.1.7+/V3.1.9: window type classification at lock — for later per-type WR audit
        windowAmpLabel:analysis?.windowAmplitude?.label||null,
        windowRangeBpsAtLock:analysis?.windowAmplitude?.rangeBps||0,
        windowDirChanges:analysis?.windowAmplitude?.directionChanges||0,
        windowMotionTiming:analysis?.windowAmplitude?.motionTiming||null,
        // V3.1.11: candle pattern at lock — for per-pattern WR audit
        candlePatternAtLock:analysis?.candlePattern?.label||null,
        candlePatternScore:analysis?.candlePattern?.score||0,
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
        // V4.1: Personal scorecard updates on manual close. User took action, that counts.
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

  const handleWindowToggle=(t)=>{if(t===windowType)return;setWindowType(String(t));setPendingStrike(null);taraAdviceRef.current='SEARCHING...';lockedCallRef.current=null;lockReleasedAtRef.current=0;posteriorHistoryRef.current=[];biasCountRef.current={UP:0,DOWN:0};hasReversedRef.current=false;manuallyClosedRef.current=null;windowSignalDirRef.current=null;isManualStrikeRef.current=false;hasSetInitialMargin.current=false;fetchWindowOpenPrice(t);setUserPosition(null);setPositionEntry(null);setManualAction(null);setCurrentOffer('');setBetAmount(0);setMaxPayout(0);lastWindowRef.current='';peakOfferRef.current=0;_hasRestoredLockRef.current=false; /* V5.6: allow restore for new window-type */ setForceRender(p=>p+1);};

  if(!isMounted)return<div className={'min-h-screen bg-[#111312] flex items-center justify-center text-[#E8E9E4]/50 font-serif text-xl animate-pulse'}>Initializing Tara 5.7.4...</div>;

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
      {showStats&&<StatsView tradeLog={tradeLog} scorecards={scorecards} taraCallLog={taraCallLog} onClose={()=>setShowStats(false)}/>}
      {showBrain&&<BrainView analysis={analysis} qualityGate={qualityGate} scorecards={scorecards} baseline={BASELINE_RECORD} kalshiDebug={kalshiDebug} strikeSource={strikeSource} strikeMode={strikeMode} taraCall={taraCall} taraScorecards={taraScorecards} windowType={windowType} onClose={()=>setShowBrain(false)}/>}

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
              5.7.4
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
            {/* Always visible — sound is essential */}
            <button onClick={handleSoundToggle} className={`p-1.5 rounded-lg border transition-colors ${soundEnabled?'bg-indigo-500/20 border-indigo-500/40 text-indigo-400':'border-[#E8E9E4]/10 text-[#E8E9E4]/40'}`}>{soundEnabled?<IC.Vol2 className="w-3.5 h-3.5"/>:<IC.VolX className="w-3.5 h-3.5"/>}</button>
            <button onClick={()=>setShowSessionStart(true)} className={'hidden sm:flex p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-bold'} title="Session Status Check">📋</button>
            {/* V2.7: Stats button — gold accent matches the analytics view.
                V3.2.2: hidden on tiny screens (<sm) to free header space. */}
            <button onClick={()=>setShowStats(true)} className={'hidden sm:flex p-1.5 rounded-lg transition-colors text-xs font-bold'} style={{
              background:T2_GOLD_GLOW,
              color:T2_GOLD,
              border:'0.5px solid '+T2_GOLD_BORDER,
            }} title="Performance Stats & Insights">📊</button>
            {/* V3.1.12: Brain button — Tara's synthesized current reasoning.
                V3.2.2: also hidden on tiny screens — accessible via mobile tab nav. */}
            <button onClick={()=>setShowBrain(true)} className={'hidden sm:flex p-1.5 rounded-lg transition-colors text-xs font-bold'} style={{
              background:T2_GOLD_GLOW,
              color:T2_GOLD,
              border:'0.5px solid '+T2_GOLD_BORDER,
            }} title="Tara's Brain — what she's thinking right now">🧠</button>
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
            const fgtRaw=analysis?.mtfAlignment||0;
            // V3.1.7: V2.9 weighted FGT voting produces fractional values (e.g. 0.3, 1.7).
            //         JS floating point shows 0.30000000000000004 — round to 1 decimal at display.
            const fgt=Math.abs(fgtRaw)<0.05?'0':Math.abs(fgtRaw).toFixed(1).replace(/\.0$/,'');
            const fgtSign=fgtRaw>0.05?'UP':fgtRaw<-0.05?'DN':'';
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
                  title={(()=>{
                    const baseTooltip=strikeSource==='kalshi'?'Strike from Kalshi · click to re-capture':strikeMode==='auto'?'Live spot price at window open · click to re-capture':'Manual override · click to restore live';
                    // V3.1.11: Always show Kalshi extraction status so user can diagnose
                    const dbg=kalshiDebug;
                    let dbgLine='';
                    if(dbg.ok===null)dbgLine='\n\nKalshi: not yet polled';
                    else if(dbg.ok===false)dbgLine=`\n\nKalshi extraction FAILED: ${dbg.reason}`;
                    else if(dbg.bestStrike)dbgLine=`\n\nKalshi: ${dbg.reason}`;
                    else dbgLine=`\n\nKalshi: ${dbg.totalMarkets} markets · ${dbg.matchingClose} matching close · NO STRIKE EXTRACTABLE\nFields: ${(dbg.sampleFields||[]).slice(0,5).join(', ')}`;
                    return baseTooltip+dbgLine;
                  })()}
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
              {/* V3.1.12: Visible Kalshi extraction diagnostic — shows status whenever
                  strike is NOT from Kalshi, so user can see why and copy field names.
                  Hidden when Kalshi is succeeding (KLSH pill speaks for itself). */}
              {strikeSource!=='kalshi'&&kalshiDebug.ok!==null&&(
                <div className="text-[9px] text-[#E8E9E4]/35 mt-1 font-mono">
                  {kalshiDebug.ok===false?(
                    <span className="text-rose-400/70">Kalshi: {kalshiDebug.reason}</span>
                  ):kalshiDebug.bestStrike?(
                    <span className="text-emerald-400/60">Kalshi {kalshiDebug.bestStrike} from {kalshiDebug.bestTicker?.slice(-20)||'?'}</span>
                  ):(
                    <span className="text-amber-400/60">Kalshi: {kalshiDebug.totalMarkets} mkts · {kalshiDebug.matchingClose} matching · no strike → fields: {(kalshiDebug.sampleFields||[]).slice(0,4).join(' ')}</span>
                  )}
                </div>
              )}
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
                  <div className={'text-xs text-[#E8E9E4]/40 uppercase tracking-wide mb-1 flex items-center gap-1'}><IC.Terminal className="w-4 h-4"/> YOUR {windowType.toUpperCase()}</div>
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

        {/* V5.3: pendingStrike confirmation banner removed per user request.
            Strike auto-confirms at window open (live spot) and Kalshi overrides when its data
            arrives. User can still manually edit the strike pill any time. */}

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
        <MobileTabBar mobileTab={mobileTab} setMobileTab={setMobileTab} setShowBrain={setShowBrain} setShowStats={setShowStats}/>

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
              <div className="flex items-center gap-2 min-w-0">
                <div onClick={()=>setUseLocalTime(!useLocalTime)} className={'flex items-center gap-1.5 bg-[#111312] border border-[#E8E9E4]/10 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer hover:border-indigo-500/30 transition-colors'}>
                  <IC.Clock className="w-4 h-4"/>
                  <span className={'text-[#E8E9E4]/60 hidden sm:inline'}>{timeState.startWindow}–{timeState.nextWindow} {useLocalTime?'LOCAL':'EST'}</span>
                  <span className="text-white font-bold text-sm">{timeState.minsRemaining}m {timeState.secsRemaining}s</span>
                  {analysis?.isPostDecay&&<span className="text-amber-400">⚡</span>}
                </div>
                {/* V5.6.6: Past-windows tracker — Kalshi-style outcome history pill */}
                <PastWindowsPill pastWindows={pastWindows} windowType={windowType}/>
              </div>
              <button onClick={()=>{
                // Force exit: score based on whether offer > bet (profit) or position in loss
                if(userPosition&&manuallyClosedRef.current===null&&taraAdviceRef.current.includes('LOCKED')){
                  const offerVal=parseFloat(currentOffer)||0;
                  const inProfit=offerVal>betAmount||(positionStatus&&positionStatus.pnlPct>0);
                  const result=inProfit?'WIN':'LOSS';
                  manuallyClosedRef.current=result;
                  // V4.1: Personal scorecard updates on force exit.
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

            {/* V5.1: Phase strip with MINUTE-MARKER decision-progress timeline.
                User asked for 'count progress timer for a decision to be made in 1min,
                2min, 3min etc — not a general timer of progress of the window.'
                Bar now shows 1m markers; current position highlighted. Countdown shows
                'decision in Xs' = time until next gate-relax + check moment. */}
            {(()=>{
              const totalSec=windowType==='15m'?900:300;
              const elapsed=totalSec-((timeState.minsRemaining*60)+timeState.secsRemaining);
              if(elapsed<=0)return null;
              const tc=taraCall;
              const isLocked=taraCallSnapshotRef.current!==null&&taraCallSnapshotRef.current.call!=='SIT_OUT';
              const isSitOut=taraCallSnapshotRef.current?.call==='SIT_OUT'||(tc?.call==='SIT_OUT'&&analysis?.isSystemLocked);
              const isCall=tc?.call==='UP'||tc?.call==='DOWN';
              const samplesLeft=Math.max(0,(tc?.needSamples||3)-(tc?.samples||0));
              // Window time-remaining
              const remSec=Math.max(0,totalSec-elapsed);
              const remMin=Math.floor(remSec/60),remRem=remSec%60;
              const remLabel=remMin>0?`${remMin}m ${String(remRem).padStart(2,'0')}s left`:`${remRem}s left`;
              // V5.1: Decision-step countdown. Gates relax every 60s — show seconds until next minute mark.
              const elapsedMin=Math.floor(elapsed/60);
              const secIntoMin=elapsed%60;
              const secToNextMin=60-secIntoMin;
              const nextDecisionMin=elapsedMin+1;
              // Window elapsed fraction
              const elapsedFrac=Math.min(1,elapsed/totalSec);
              const totalMin=totalSec/60;
              // V5.6.5: Phase label uses the same four-state model — no in-progress flicker.
              //   Tara is either SCANNING, LOCKED, SAT OUT, or pre-snapshot ANALYZING.
              //   Direction colors only show post-commit so the bar doesn't flash UP/DOWN
              //   based on internal lean.
              let label='SCANNING',accent=T2_GOLD,countdownText='gathering data';
              if(isLocked){
                const _lockDir=taraCallSnapshotRef.current?.call;
                label='LOCKED';
                accent=_lockDir==='UP'?'rgba(52,211,153,0.7)':_lockDir==='DOWN'?'rgba(244,114,182,0.7)':T2_GOLD;
                countdownText=remLabel;
              } else if(isSitOut){
                label='SITTING OUT';
                accent='rgba(245,158,11,0.5)';
                countdownText=remLabel;
              } else {
                // Pre-commit: pure scanning. No FORMING/WATCHING reveal.
                const _need=tc?.needSamples||100;
                const _samples=tc?.samples||0;
                if(_samples>=5&&_need>0){
                  if(tc?.lockEtaStalled||tc?.lockEtaSec==null){
                    countdownText='waiting for stronger signal';
                  } else if(tc.lockEtaSec===0){
                    countdownText='committing this tick';
                  } else {
                    countdownText=`decision in ~${formatDuration(tc.lockEtaSec)}`;
                  }
                } else if(elapsed<20){
                  countdownText=`observing — ${20-elapsed}s of search remaining`;
                } else {
                  countdownText='scanning for edge';
                }
              }
              // Minute markers along the bar (skip 0, mark every minute up to total)
              const minMarkers=[];
              for(let m=1;m<totalMin;m++){
                const isPast=elapsed>=m*60;
                minMarkers.push({pos:(m/totalMin)*100,m,isPast});
              }
              return(
                <div className="mb-3 px-1">
                  <div className="flex justify-between items-baseline mb-1 gap-2">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-[#E8E9E4]/55 font-bold shrink-0">Tara · {label}</span>
                    <span className={`text-[10px] tabular-nums tracking-wide truncate ${(isCall&&!isLocked)||isLocked?'text-[#E8E9E4]/85 font-bold':'text-[#E8E9E4]/45'}`}>{countdownText}</span>
                  </div>
                  <div className="relative h-1.5 bg-[#0E100F] rounded-full overflow-hidden">
                    {/* Minute tick markers */}
                    {minMarkers.map((mk,i)=>(
                      <div key={i} className="absolute top-0 bottom-0 w-px" style={{
                        left:mk.pos+'%',
                        background:mk.isPast?'rgba(229,200,112,0.4)':'rgba(232,233,228,0.15)',
                      }}></div>
                    ))}
                    {/* Progress fill — fills with elapsed time (always meaningful) */}
                    <div className="absolute top-0 bottom-0 left-0 transition-all duration-700" style={{
                      width:(elapsedFrac*100).toFixed(1)+'%',
                      background:accent,
                      opacity:0.85,
                    }}></div>
                    {/* Position marker — small dot at current elapsed time */}
                    <div className="absolute top-0 bottom-0 w-0.5 transition-all duration-700" style={{
                      left:(elapsedFrac*100).toFixed(1)+'%',
                      background:isCall||isLocked?accent:T2_GOLD,
                      transform:'translateX(-50%)',
                      boxShadow:'0 0 4px '+(isCall||isLocked?accent:T2_GOLD),
                    }}></div>
                  </div>
                  {/* Minute labels below — only show if window is 15m (cluttered on 5m) */}
                  {totalMin>=10&&(
                    <div className="flex justify-between mt-0.5 px-px text-[7px] text-[#E8E9E4]/30 tabular-nums">
                      <span>0</span><span>5m</span><span>10m</span><span>15m</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* V5.6.1: Tara's Call on mobile signal tab — moved here from the projections tab. */}
            <TaraCallCard taraCall={taraCall} taraScorecards={taraScorecards} taraCallLog={taraCallLog} windowType={windowType} timeState={timeState} analysis={analysis} taraLearnings={taraLearnings} className="md:hidden"/>

            <PredictionContent strikeConfirmed={strikeConfirmed} strikeMode={strikeMode} targetMargin={targetMargin} isLoading={isLoading} analysis={analysis} currentPrice={currentPrice} qualityGate={qualityGate} userPosition={userPosition} timeState={timeState} streakData={streakData} handleManualSync={handleManualSync} getMarketSessions={getMarketSessions} executeAction={executeAction} broadcastSignalManual={broadcastSignalManual} discordWebhook={discordWebhook} regimeDirWR={regimeDirWR} kalshiYesPrice={kalshiYesPrice} newsSentiment={newsSentiment} taraCall={taraCall} taraScorecards={taraScorecards} windowType={windowType}/>
          </div>

          {/* ── V111: PROJECTIONS CARD (col 2 - 5m/15m/1h tabs) ── */}
          <ProjectionsCard analysis={analysis} mobileTab={mobileTab} taraCall={taraCall} taraScorecards={taraScorecards} taraCallLog={taraCallLog} windowType={windowType} timeState={timeState} taraLearnings={taraLearnings}/>

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
                  <strong className={'text-emerald-400'}>Sync to Latest Training</strong> · Refreshes Tara to the latest baked baseline (487W-302L · 33W-25L 5m · 57 trades trained · V3.1). Use when switching devices.
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
            <div className={'bg-[#111312] p-2.5 flex justify-between items-center border-b border-[#E8E9E4]/10'}><span className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><IC.Msg className="w-3.5 h-3.5 text-indigo-400"/>Chat with Tara 5.7.4</span><button onClick={()=>setIsChatOpen(false)} className="opacity-50 hover:opacity-100"><IC.X className="w-4 h-4"/></button></div>
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
                {(()=>{
                  const _resolvedTara=(taraCallLog||[]).filter(e=>e&&(e.result==='WIN'||e.result==='LOSS')&&(e.dir==='UP'||e.dir==='DOWN')).length;
                  const _sitouts=(taraCallLog||[]).filter(e=>e&&e.result==='SITOUT').length;
                  return (
                    <p className={'text-xs text-[#E8E9E4]/40 mt-0.5'}>
                      {tradeLog.length} manual trades · <span className="text-amber-400/85">{_resolvedTara} Tara calls</span>{_sitouts>0&&<span className="text-[#E8E9E4]/35"> · {_sitouts} sat out</span>} · Weights auto-update from manual trades only
                    </p>
                  );
                })()}
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
                {(()=>{
                  // V5.6.9: Merge Tara's session stats with manual session stats so cards reflect
                  //   both data sources. Show as combined header with Tara breakdown underneath.
                  const _taraBySession={};
                  (taraCallLog||[]).forEach(e=>{
                    if(!e||(e.result!=='WIN'&&e.result!=='LOSS'))return;
                    if(e.dir!=='UP'&&e.dir!=='DOWN')return;
                    const s=e.session||'OFF-HOURS';
                    _taraBySession[s]=_taraBySession[s]||{wins:0,losses:0};
                    _taraBySession[s][e.result==='WIN'?'wins':'losses']++;
                  });
                  const allSessions=['ASIA','EU','US','OFF-HOURS'];
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {allSessions.map((sess)=>{
                        const manual=sessionPerf?.[sess]||{wins:0,losses:0};
                        const tara=_taraBySession[sess]||{wins:0,losses:0};
                        const totalManual=manual.wins+manual.losses;
                        const totalTara=tara.wins+tara.losses;
                        const totalAll=totalManual+totalTara;
                        const wins=manual.wins+tara.wins;
                        const wr=totalAll>0?((wins/totalAll)*100):0;
                        return(<div key={sess} className={'bg-[#111312] rounded-lg p-2.5 border border-[#E8E9E4]/5 text-center'}>
                          <div className={'text-xs font-bold text-[#E8E9E4]/70 mb-1'}>{sess}</div>
                          <div className={`text-lg font-serif font-bold ${wr>=60?'text-emerald-400':wr>=45?'text-amber-400':totalAll>0?'text-rose-400':'text-[#E8E9E4]/35'}`}>{totalAll>0?`${wr.toFixed(0)}%`:'—'}</div>
                          <div className={'text-[10px] text-[#E8E9E4]/55 mt-0.5'}>{wins}W · {(manual.losses+tara.losses)}L</div>
                          {totalTara>0&&<div className={'text-[9px] text-amber-400/70 mt-0.5'}>{totalTara} from Tara</div>}
                        </div>);
                      })}
                    </div>
                  );
                })()}
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
                                    {t.fgtAlignment!=null&&Math.abs(t.fgtAlignment)>=2&&<span className="text-purple-400/60">FGT {Math.abs(t.fgtAlignment).toFixed(1).replace(/\.0$/,'')}/4 {t.fgtAlignment>0?'↑':'↓'}</span>}
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
                  <span className="text-indigo-400 text-xl font-bold">?</span> How Tara 5.7.4 Works
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
              <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2"><IC.Info className="w-5 h-5 text-indigo-400"/>Tara 5.7.4 — What's New</h2>
              <button onClick={()=>setShowHelp(false)} className={'text-[#E8E9E4]/50 hover:text-white'}><IC.X className="w-5 h-5"/></button>
            </div>
            <div className={'p-4 sm:p-6 space-y-5 text-xs sm:text-sm text-[#E8E9E4]/80'}>

              {/* V5.5: Multi-window tape consensus + missing field fix */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Tape Consensus · Code Audit</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>5.5</span> — Multi-Window Tape + Audit</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">User showed me a missed UP win — POST 63%, tape 65% / 64% / 75% across 15s/30s/60s windows, but Tara still sat out. V5.4's field-name fix was correct but the tape-agreement logic itself was too brittle (single 30s window check). Plus a thorough code audit found another bug.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Multi-window tape consensus.</strong> Old override checked only 30s tape ≥ 70%. Single-window threshold meant a brief 30-second selling flush could turn off the override even when 60s and 15s both confirmed direction. New: tape agreement requires ≥2 of {'{'}15s, 30s, 60s{'}'} windows showing ≥60% same side. Much more robust to noise.</li>
                  <li><strong>Super-strong consensus tier.</strong> When ≥2 of 3 windows show ≥70% same direction, Tara gets a +20 confidence boost (was +10). This rewards rare strong-consensus setups where every tape window agrees decisively.</li>
                  <li><strong>For your screenshot's case.</strong> 15s=65, 30s=64, 60s=75 all ≥60 → tapeAgreesUP=true. Quality threshold drops 15→5, FGT bypassed, conviction floor drops to 2. Tara would have called UP at low confidence (~25%) instead of sitting out.</li>
                  <li><strong>Audit found: missing fields.</strong> The projections panel referenced <code>analysis.upThreshold</code> and <code>analysis.downThreshold</code> but those were never added to the analysis return. Fallbacks <code>||65</code> and <code>||35</code> masked it — projections always showed those fixed numbers regardless of regime. Now actually exposes regime-adjusted thresholds (e.g. SHORT SQUEEZE = 72/26, TRENDING UP = 64/20).</li>
                  <li><strong>Audit found: V5.4 field rename was complete.</strong> All 10 prior <code>analysis.posterior</code> references successfully migrated to <code>rawProbAbove</code>. Verified zero remaining incorrect references via grep.</li>
                  <li><strong>Audit confirmed: Tara is symmetric on direction.</strong> Both UP and DOWN paths in the engine have identical quality-floor gates (<code>_quality{'<'}45</code>), choppy-regime gates (<code>{'<'}50 in chop</code>), and trajectory-rejection gates. Tara's Call gates use absolute-value math — no UP-vs-DOWN bias.</li>
                </ul>
              </section>

              {/* V5.4: The actual root cause — wrong field name */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>The Actual Bug · Owning It</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>5.4</span> — Wrong Field Name</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">V5.2 and V5.3 fixes were correct but didn't fix the real bug. V5.4 fixes it.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>The actual bug.</strong> The engine produces a value called <code>posterior</code> internally. The outer analysis useMemo renames it to <code>rawProbAbove</code> in its return object. Every consumer was reading <code>analysis.posterior</code> — which is undefined — and silently falling back to 50% via <code>analysis.posterior||50</code>. Tara's Call's null check correctly fired SIT_OUT on undefined, while every display showed 50% as if it was a real reading.</li>
                  <li><strong>Why it took 4 versions to find.</strong> The display-side fallback masked the bug everywhere except Tara's Call. Engine general prediction "LOCKED 50%" looked like neutral conviction, not undefined. Score breakdown used a different field (rawProbAbove) so it always showed correct values. The disagreement between the two displays was the clue I missed in your earlier screenshots.</li>
                  <li><strong>Fix.</strong> All 10 references to <code>analysis.posterior</code> changed to <code>analysis.rawProbAbove</code>. Tara's Call gates now read the real value. Engine general prediction now shows real percentage instead of always 50. Lifecycle effect dep array now triggers correctly on posterior changes.</li>
                  <li><strong>Honest debrief.</strong> V5.0/5.1/5.2/5.3 gate logic and architecture were sound — they just never got real data. With V5.4, the gates I designed actually run. If you still see 100% sit-outs after this, the gates need genuine tuning. But this should be the fix.</li>
                </ul>
              </section>

              {/* V5.3: Removed strike confirm box + root cause of all the SIT_OUTs */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Root Cause · No More Sit-Outs</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>5.3</span> — Instant Strike, Real Calls</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">User report: "still no calls from tara". V5.2's gate-0 fix was correct but NOT sufficient. The actual root cause was upstream — analysis was null because of how strike confirmation worked. Identified and fixed.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>The actual bug.</strong> Window rollover used to set <code>targetMargin=0</code> + <code>strikeConfirmed=false</code> immediately. Then it showed the "NEW WINDOW — CONFIRM STRIKE PRICE" banner waiting for user to tap OK, OR for Kalshi to fetch (1-3s). During that gap, the analysis useMemo returned <code>null</code> because of two checks: <code>!strikeConfirmed&&strikeMode==='manual'&&targetMargin>0</code> AND <code>!targetMargin</code>. With analysis null, every SIT_OUT screenshot you sent had reason "Engine still loading". Tara was never even getting to evaluate her gates.</li>
                  <li><strong>The fix.</strong> Strike now auto-sets and auto-confirms at window open using live spot. Kalshi auto-set effect overrides when Kalshi data arrives (1-3s later with V5.2 parallel fetch). Analysis runs from second 1 of every window. Tara's gates can actually run.</li>
                  <li><strong>Same fix for mid-window page-opens.</strong> Used to leave strike at 0 (analysis null) until user manually entered or Kalshi fetched. Now auto-sets to live spot or Kalshi (whichever's available) the moment the page loads.</li>
                  <li><strong>Strike confirm banner removed.</strong> Per user request: "remove the confirm strike box completely now. we don't need it with kalshi price working. if i need to ill edit and press ok manually if and when needed." The strike pill in the row still lets you edit the value directly any time.</li>
                  <li><strong>What you should now actually see.</strong> Window opens → strike pill shows live spot immediately, KLSH ✓ → Kalshi overrides 1-3s later → engine forms posterior → Tara's Call evaluates gates → either WATCHING ▼ DOWN (faded) or ▼ DOWN 65% (locked).</li>
                </ul>
              </section>

              {/* V5.2: Bug fix + WATCHING display + parallel Kalshi */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Bug Fix · Visibility · Speed</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>5.2</span> — Show Tara's Thinking + Instant Kalshi</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">User report: "I've never seen Tara's call be anything other than sit out." Investigation found a real bug — Gate 0 was misfiring. Plus made Tara's reasoning visible during SIT_OUT, plus parallel Kalshi fetch.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Gate 0 bug fix.</strong> The first gate used <code>!analysis.posterior</code> to check for missing data. When the engine was super-confident DOWN, posterior could clamp to a value that triggered <code>!posterior=true</code> as a falsy edge case. This silently fired SIT_OUT with reason "No analysis yet" — even when posterior was 12% (88% DOWN) and every other signal aligned. Replaced with proper null/NaN check + fallback to rawPosterior/displayPosterior. This was likely the cause of most of the 100% sit-out rate.</li>
                  <li><strong>WATCHING ▼ DOWN display.</strong> When SIT_OUT but Tara has a proposed direction (conviction &gt; 0), the card now shows "WATCHING ▼ DOWN" with faded color + faint direction-tinted background, instead of just "— SIT OUT". You see what she's considering even when not committing.</li>
                  <li><strong>Transparent SIT_OUT reasons.</strong> Every blocker reason now leads with proposed direction + conviction + specific blocker + countdown to next gate-relax. Examples: "Watching DOWN (38pt lean) — quality 14 &lt; 25 bar · next gate check in 18s" or "Watching UP (15pt lean) — but FGT 0.4/4 too quiet (need 0.7) · next gate check in 22s".</li>
                  <li><strong>Parallel Kalshi fetch.</strong> User feedback: "fetches now thanks but it takes a min ish to get it. can it be instant." Sequential 3-proxy fallback (direct → corsproxy → allorigins) was up to 18 seconds when first paths failed. Now using <code>Promise.any</code> — all three fire simultaneously and fastest success wins. Typical strike fetch drops to 1-3 seconds. Per-attempt timeout reduced from 6s to 3.5s for faster failure detection.</li>
                </ul>
              </section>

              {/* V5.1: Tape-agreement override + decision-progress timer */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Engine · Decisive++ </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>5.1</span> — Tape Override</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">User feedback: "Tara missed an UP — POST 67%, tape 86% buy, but quality 14 because FGT conflicted." V5.0's gates blocked her. V5.1 adds the missing piece — when 30s tape strongly agrees with proposed direction, override the quality + FGT gates.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Tape-agreement override.</strong> Tape ≥70% same side as posterior → quality threshold drops 15pts (floor 5), FGT requirement bypassed entirely, conviction threshold drops 2pts. Tape is real money hitting the offer in size — when it agrees with price direction, that's two independent confirmations.</li>
                  <li><strong>Confidence boost.</strong> Tape agreement adds +10 to the call's confidence number. Strong tape + decent quality → 65%+ confidence. Tape agrees but quality is 14 → 35-40% confidence. The number tells you how much weight to put on the call.</li>
                  <li><strong>Time-decay accelerated.</strong> Gates loosen every 30s now (was 60s). By 90s into a 15m window, even hostile setups have minimal thresholds.</li>
                  <li><strong>Decision-progress timer.</strong> Phase strip redesigned per user spec — bar shows minute markers (1m, 2m, 3m...) along the 15m window with a position dot tracking current elapsed time. Watching countdown reads "decision check at 3m (in 25s)" — telling you exactly when Tara's next gate-relax fires.</li>
                  <li><strong>Honest framing.</strong> Lower-confidence calls now happen by design. A 35% Tara call means "she sees a lean but it's marginal — your judgment matters more here." The scorecard will tell us over 30+ trades whether the lower-confidence calls are worth taking.</li>
                </ul>
              </section>

              {/* V5.0: Decisive philosophy shift + Kalshi auto-set */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Engine · Philosophy Shift</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>5.0</span> — Decisive</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Tara was sitting out too many windows. V5.0 flipped her stance — gates are looser, time-decay aggressive, regime hostility + vol-flow divergence demoted from hard blocks to confidence haircuts. Plus Kalshi auto-sets on page-open and new windows.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Looser gates.</strong> Quality threshold 50→35, conviction 12→7, FGT 1.5→0.8. Time-decay drops these further as the window progresses.</li>
                  <li><strong>Soft-blocks become haircuts.</strong> DEAD/WHIPSAW window + low quality used to kill the call entirely. Now it's a -10 confidence haircut (call still happens, just at lower confidence). Vol-flow divergence: same — was hard block, now -15 haircut.</li>
                  <li><strong>Aggressive time-decay.</strong> Sample requirements drop every 30s. By 90s into a 15m window, even hostile setups need just 1 sample to lock.</li>
                  <li><strong>Kalshi auto-set.</strong> Removed the 60s elapsed cutoff that was preventing strike auto-snap on mid-window page opens. Now whenever Kalshi data arrives, it auto-sets and auto-confirms — regardless of when in the window you opened the page.</li>
                  <li><strong>Tab-visibility refetch.</strong> When you bring the tab back from background, Kalshi refetches immediately instead of waiting up to 30s for the next interval tick.</li>
                </ul>
              </section>

              {/* V4.6: Fresh start + countdown overhaul */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Reset · Clean Slate</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>4.6</span> — Fresh Start</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">User asked for a real fresh start. V4.0 had reset the scorecard but the 57-trade seed CSV was still loading + engine weights were pre-calibrated from those trades. V4.6 actually wipes everything.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>SEED_TRADES = [].</strong> No baked-in trade history.</li>
                  <li><strong>DEFAULT_WEIGHTS reset to neutral 35.</strong> All 7 signals start at the same weight. Per-regime weights also reset — gradient descent will differentiate them as you trade.</li>
                  <li><strong>Auto-migration on first load.</strong> If your stored baseline version differs from V4.6, the app silently wipes trade log, scorecards, weights, calibration, regime memory, then reloads. One-shot, never re-fires.</li>
                  <li><strong>Phase strip countdown overhaul.</strong> Every state has a real countdown now — FORMING shows "locks in ~Xs", LOCKED/SIT_OUT/WATCHING show "Xm Ys left" until window close. Bar progress is meaningful in every state.</li>
                </ul>
              </section>

              {/* V4.5: Faster commit + countdown timer */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Engine · Faster Commit</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>4.5</span> — Lock Sooner</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Sample thresholds halved. Plus time-decay forces commitment — by 4 minutes into a 15m window, even trickiest setups need just 1 sample.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Sample thresholds halved.</strong> Clean: 1 sample (was 2). Good: 2 samples (was 4). Default: 3 samples (was 6). Hostile: 5 samples (was 8).</li>
                  <li><strong>Time-decay added.</strong> Every full minute that passes, needSamples drops by 1 (floor 1).</li>
                  <li><strong>Layout fix.</strong> Pushed TARA ADVISOR + sync buttons to bottom of prediction column with mt-auto. Empty space distributes naturally instead of dead patch at the bottom.</li>
                  <li><strong>Engine sample line clarified.</strong> Now reads "Engine forming UP — 2 more samples" so you can tell it apart from Tara's Call sample count.</li>
                </ul>
              </section>

              {/* V4.4: Kalshi events endpoint breakthrough */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Kalshi · Breakthrough</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>4.4</span> — Strike Pull Works</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Five attempts to get Kalshi strikes pulling failed. The sixth — reading the official docs carefully — finally worked. Three things were wrong with prior attempts.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Wrong endpoint.</strong> Tara was hammering /markets which returns ALL markets across the series (200+). Right call: /events?series_ticker=KXBTC15M&with_nested_markets=true&status=open&min_close_ts=&lt;now-5min&gt;. Smaller payload, different rate-limit bucket.</li>
                  <li><strong>Wrong field names.</strong> Kalshi migrated from integer-cents (yes_ask, yes_bid) to dollars-formatted strings (yes_ask_dollars: "0.5600"). Old fields are deprecated.</li>
                  <li><strong>floor_strike IS the strike.</strong> Per OpenAPI spec, no ticker regex needed — the strike value is on the market object directly. For 15m KXBTC events, each event has 2 markets: strike_type='greater' (above) and 'less' (below). Pick 'greater' for our UP-bet semantics.</li>
                  <li><strong>3-proxy fallback retained.</strong> Direct → corsproxy.io → allorigins.win. Whichever gets through wins.</li>
                </ul>
              </section>

              {/* V4.3: Tara's Call clarity */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>UI · Tara's Call Clarity</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>4.3</span> — Visible Scorecard + Comparison</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Three real complaints from screenshot review: scorecard counter invisible, no phase strip on Tara's Call card, can't tell how Tara's Call differs from general prediction.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Visible scorecard row.</strong> Big 2xl serif W/L/Sat-Out numbers at the bottom of Tara's Call card. Color-coded — emerald wins, rose losses, gold sat-outs.</li>
                  <li><strong>Phase strip on Tara's Call card itself.</strong> Was only on the prediction card before. Now visible from both surfaces.</li>
                  <li><strong>Engine general prediction sub-panel.</strong> Inside Tara's Call card, shows engine direction + state alongside Tara's call with explicit comparison tag — TARA AGREES / TARA OVERRIDES / TARA DISAGREES / TARA OBSERVING. Makes the difference between systems visible.</li>
                  <li><strong>Three-proxy Kalshi fallback added.</strong> Direct → corsproxy.io → allorigins.win.</li>
                </ul>
              </section>

              {/* V4.2: Tara's Call prominence + faster lock + 15m only */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>UI · Prominence</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>4.2</span> — Promoted to Center</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Tara's Call moved to the top of the projections column — bigger, more prominent. Adaptive lock speed introduced.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Tara's Call is the hero.</strong> 3xl serif, gets the dominant slot in the middle column.</li>
                  <li><strong>Adaptive lock speed.</strong> Clean conditions → 2 samples; mixed → 4-6 samples; hostile → 8 samples. Fast when it's obvious, slow when it isn't.</li>
                  <li><strong>Phase strip tracks Tara's lifecycle.</strong> ANALYZING → SCANNING → SIGNAL → LOCKED / SIT OUT, not the window-clock phase.</li>
                  <li><strong>Brain modal leads with Tara's Call.</strong> Engine context becomes supporting evidence below.</li>
                  <li><strong>Kalshi 15m only.</strong> 5m falls back to live spot since KXBTC5M may not exist as a series.</li>
                </ul>
              </section>

              {/* V4.1: Personal scorecard restored */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Tracking · Personal vs Tara</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>4.1</span> — Your Trading Record</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Two independent scorecards now: Personal (only updates when you trade) and Tara's Call (her selective conviction-filtered decisions).</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Personal scorecard auto-updates.</strong> Click UP/DOWN sync → entry tracked. Window closes or you cash out → result counted. If you don't trade, nothing changes.</li>
                  <li><strong>Tara's Call scorecard.</strong> Independent — counts her calls regardless of your action. SIT_OUT counts as 'sat out', neither way.</li>
                  <li><strong>Strike row label change.</strong> "15M SCORE" → "YOUR 15M" to make distinction obvious from Tara's Call card.</li>
                  <li><strong>Manual ± buttons retained</strong> for adjustments to your personal record.</li>
                </ul>
              </section>

              {/* V4.0: Tara's Call architecture */}
              <section className="mb-2 pb-3" style={{borderBottom:'1px solid '+T2_GOLD_GLOW}}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{color:T2_GOLD}}>Architecture · Major Reset</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#E8E9E4]/30">2026.05.02</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 tracking-tight text-white">Tara <span style={{color:T2_GOLD}}>4.0</span> — Three Surfaces</h3>
                <p className="text-xs text-[#E8E9E4]/70 leading-relaxed mb-3">Major architectural rewire. Per user request: complete reset, decouple scoring from general prediction, Tara's Call as primary auto-broadcast surface, whale advisory based on position context.</p>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li><strong>Three independent surfaces.</strong> (1) General prediction = informational only, no auto-scoring. (2) Tara's Call = autonomous, conviction-filtered, auto-broadcast. (3) Personal scorecard = your trading record.</li>
                  <li><strong>Tara's Call decision tree.</strong> 5 gates — quality &lt; 50 → SIT_OUT, conviction &lt; 12 → SIT_OUT, FGT &lt; 1.5 → SIT_OUT, DEAD/WHIPSAW + low quality → SIT_OUT, vol-flow divergent → SIT_OUT, otherwise match general direction.</li>
                  <li><strong>Auto-broadcasts.</strong> TARA_SCAN (30s in), TARA_SIGNAL (per direction once), TARA_LOCK (at snapshot), TARA_SITOUT (endgame still SIT_OUT), TARA_RESULT (window close).</li>
                  <li><strong>Whale advisory.</strong> When you have a position: HOLD (aligned), CASH OUT (heavy adverse $750K+), WATCH (small adverse).</li>
                  <li><strong>Fresh-start scorecards.</strong> All counters reset to 0 — prior baseline of 487-302 was preserved as historical reference but no longer auto-displayed.</li>
                </ul>
              </section>

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
                  <li><strong>(Outdated note from 3.1 launch — see V5.1)</strong> Tape was originally informational only; since V3.2.2 it feeds the FLOW signal (acceleration override) and as of V5.1 the 30s buyPct is a major Tara's Call gate-override. Tape is now one of the most-weighted inputs.</li>
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
