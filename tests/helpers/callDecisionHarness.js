// Execute the real candidate producer, post-processors, complete lifecycle,
// shared commit/seal boundary and local record builders. Only outside services,
// timers and hook state are faked; no copy of the decision algorithm lives here.
import {readFileSync} from 'node:fs';
import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as integrity from '../../src/callIntegrity.js';
import * as policy from '../../src/callPolicy.js';
import {describeCallBlocker} from '../../src/callBlocker.js';
import {postProcessLegacyCall,readCallCostBand} from '../../src/callCandidateRules.js';
const traverse=traverseModule.default||traverseModule;
export const app=readFileSync(new URL('../../src/App.jsx',import.meta.url),'utf8');
function compile(body, result='') {
  const names=new Set();
  const ast=parse(`function run(){${body}\n${result}}`,{sourceType:'script'});
  traverse(ast,{ReferencedIdentifier(path){if(!path.scope.hasBinding(path.node.name,true))names.add(path.node.name);}});
  // Explicit destructuring isolates every application dependency from the host.
  const free=[...names].filter(name=>!['Array','Object','Number','String','Math','Set','Map','JSON','Boolean','parseFloat','parseInt','isNaN','Infinity','NaN','undefined'].includes(name));
  const fn=new Function('scope',`let {${free.join(',')}}=scope; ${body}\n${result}`);
  fn.dependencies=free;return fn;
}
const candidateStart=app.indexOf('  const taraCall=(()=>{');
const candidateEnd=app.indexOf('  // Three coordinated effects',candidateStart);
const candidate=compile(app.slice(candidateStart,candidateEnd),'return taraCall;');
const ast=parse(app,{sourceType:'module',plugins:['jsx']});
let effectBody;
traverse(ast,{CallExpression(path){const n=path.node;
  if(n.callee.name!=='useEffect'||n.arguments[0]?.type!=='ArrowFunctionExpression')return;
  const body=n.arguments[0].body,text=app.slice(body.start+1,body.end-1);
  if(text.includes("const isCall=tc.call==='UP'||tc.call==='DOWN';")&&text.includes('const _noteGateHold='))effectBody=text;
}});
if(!effectBody)throw new Error('Complete Call lifecycle not found');
const effect=compile(effectBody);
const boundary=compile(app.slice(app.indexOf('  const _prepareCallCommit='),app.indexOf('  const _persistLock=')),
  'return {_prepareCallCommit,_sealCallSnapshot};');

export function makeHarness({probabilityUp=77.25,confidence,yesPrice=74,secondsLeft=631,windowType='15m',
  quotePatch={},ready=true,noEntryGates=true,claimedDirection,samples=200,tier1Only=false,quality=57,
  mtf=0,tapeBuy=77,regime='RANGE-CHOP',gapScore=20,rangeBps=10}={}) {
  const start=Date.parse('2026-10-13T20:45:00Z'),close=start+(windowType==='15m'?900000:300000);
  let clock=close-secondsLeft*1000;
  const windowId=`${windowType}-2026-10-13T20:45:00.000Z`;
  const logs=[],errors=[],audit=[],cloud=[],timers=[],storage=new Map();
  const ref=current=>({current});
  const FakeDate=class extends Date {constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};
  const scope={...integrity,...policy,describeCallBlocker,postProcessLegacyCall,readCallCostBand,Date:FakeDate,
    captureOriginalDecision:(entry,options={})=>integrity.captureOriginalDecision(entry,{now:clock,...options}),
    console:{info(){},warn(){},error(...args){errors.push(args.map(String).join(' '));}},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
    window:{},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},
    analysis:{rawProbAbove:probabilityUp,rawPosteriorUncalibrated:probabilityUp,regime,mtfAlignment:mtf,
      windowAmplitude:{label:'DEAD',rangeBps},rawSignalScores:{gap:gapScore,_isChop:false},
      realGapBps:20,kalshiAtLock:yesPrice,projectedGapBps:0,atrBps:12,volFlow:{},isSystemLocked:false},
    startupReadiness:{ready,code:ready?'ready':'startup-history',reason:'Loading verified current candles',samples:150,spanMs:180000},
    qualityGate:{score:quality},qualityGateV2:{score:quality},
    timeState:{minsRemaining:Math.floor(secondsLeft/60),secsRemaining:secondsLeft%60,startWindow:start,nextWindow:close},
    windowType,currentAsset:'BTC',currentAssetRef:ref('BTC'),currentPrice:83400,targetMargin:83200,
    targetMarginRef:ref(83200),kalshiStrike:83200,kalshiYesPrice:yesPrice,
    _kalshiQuote:{ticker:`KXBTC${windowType==='15m'?'15M':'5M'}-26OCT131700-00`,closeTime:new Date(close).toISOString(),
      bid:yesPrice-1,ask:yesPrice+1,at:clock,...quotePatch},
    tapeWindows:{w15:{buyPct:tapeBuy},w30:{buyPct:tapeBuy},w60:{buyPct:tapeBuy}},tapeBuyPct:tapeBuy,
    tapeSuperStrong:false,hardForceRef:ref(0),softHintRef:ref(0),_rolloverGraceRef:ref(0),
    taraLearningsRef:ref({multipliers:{confluenceConfBoost:{'single-signal':4}}}),taraCallLogRef:ref([]),
    _v97DiagRef:ref({}),kalshiHistoryRef:ref([]),windowOpenTimeRef:ref(start),regimeTransitionRef:ref(null),
    taraCallSnapshotRef:ref(null),taraCallSampleRef:ref({dir:claimedDirection===undefined?(probabilityUp>=50?'UP':'DOWN'):claimedDirection,count:samples}),
    lockedCallRef:ref(null),callCommitHoldRef:ref(null),callGateHoldRef:ref(null),currentCallBlockerRef:ref(null),
    _cloudRestoreCompletedRef:ref(true),_v104_1_abortCountRef:ref({windowId,count:0,lastAbortAt:0}),
    _v104_1_delayStateRef:ref(null),_v104_1_pendingDelayStampRef:ref(null),_v1364_oppRef:ref(null),_v112Live:{},
    NO_ENTRY_GATES:noEntryGates,NO_SITOUT_MODE:false,LOCK_DEADLINE_SEC:30,
    USE_V104_1_DELAY_GATE:true,V104_1_KALSHI_EXPENSIVE_THRESHOLD:50,V106_3_AVG_SLIPPAGE_CENTS:0,
    V104_1_CONVICTION_STRONG_THRESHOLD:85,V104_1_DEADLINE_SECONDS_LEFT:180,
    getEntryMinCost:()=>noEntryGates?0:55,getEntryMaxCost:()=>noEntryGates?100:70,
    computeWindowId:()=>windowId,kalshiWasBelowThreshUpRef:ref(true),kalshiWasBelowThreshDownRef:ref(true),
    kalshiLastBelowThreshUpRef:ref(clock-60000),kalshiLastBelowThreshDownRef:ref(clock-60000),
    _flatGapWatchRef:ref(null),lastPriceSourceRef:ref({time:clock}),depthFlash:{},
    _SITOUT_KEEP:new Set(['no-go-price-unavailable-sitout','trend-at-lock-sitout','tier1-only-skip']),
    getMarketSessions:()=>({dominant:'OFF-HOURS'}),getPhaseKey:()=>null,buildCalibrationTable:()=>({}),lookupCalibration:()=>({found:false}),
    brtiApprox:null,dayContext:null,whaleLog:[],adaptiveWeightsByAssetRef:ref({}),_otherAssetRef:ref({}),
    tradingSettings:{tier1OnlyMode:tier1Only},sessionTierMode:'off',_resolveSessionTierMultiplier:()=>1,
    betAmount:1,maxPayout:2,TARA_CALL_LOG_CAP:1000,TARA_BUILD_VERSION:'2026.10.13-v14.4.6-consistent-call-decision-path',
    _lossCooldownRef:ref(null),taraCallLog:logs,_ana:null,computeReversalRisk:()=>({flag:'NONE',score:0}),
    playAlert(){},brtiApproxRef:ref(null),lastKalshiSuccessRef:ref(clock),_windowCushionHistoryRef:ref([]),
    kalshiStrikeRef:ref(83200),_mountTimeRef:ref(clock-180000),_deriveSitoutCategory:()=>null,
    BASELINE_VERSION:'isolated-test',_quoteUsable:()=>true,_execCostCents:()=>yesPrice,
    computeMultiSignalPivot:()=>({active:false}),feedFrozenRef:ref(false),clockSeconds:secondsLeft,
    priceSourceRef:ref('coinbase'),_windowTypeSeqRef:ref(0),windowOpenPriceRef:ref(83200),windowHighRef:ref(83400),windowLowRef:ref(83200),
    _taraDeviceId:'isolated-test',_phase4DecisionRef:ref(null),_hbtLastSampleRef:ref(null),
    _auditLogEvent:(kind,detail)=>audit.push({kind,...detail}),
    _lifecycleRecordSnapshot(){},_lifecycleRecordLogCall(){},_lifecycleRecordLogResult(){},_lifecycleRecordConfirmed(){},
    setTaraCallLog:fn=>{const next=fn(logs);logs.splice(0,logs.length,...next);scope.taraCallLogRef.current=[...logs];},
  };
  const bindings=boundary(scope);Object.assign(scope,bindings);
  // Use the real seal before the fake transport, so persistence sees only
  // validated, quote-hydrated, captured decisions. No network client exists.
  scope._persistLock=()=>{if(!scope.taraCallSnapshotRef.current)return;
    if(bindings._sealCallSnapshot(scope.taraCallSnapshotRef.current)===false)return;
    cloud.push(structuredClone(scope.taraCallSnapshotRef.current));};
  function run(){scope.taraCall=candidate(scope);
    if(confidence!==undefined)scope.taraCall.confidence=confidence;
    scope.taraCall._ctx||={};
    scope.currentCallBlockerRef.current=describeCallBlocker({call:scope.taraCall,readiness:scope.startupReadiness,
      hold:scope.callCommitHoldRef.current,gateHold:scope.callGateHoldRef.current,samples:scope.taraCallSampleRef.current,
      quote:scope._kalshiQuote,windowId,asset:'BTC',now:clock});
    effect(scope);return scope.taraCallSnapshotRef.current;
  }
  function advance(nextSecondsLeft){clock=close-nextSecondsLeft*1000;scope.clockSeconds=nextSecondsLeft;
    Object.assign(scope.timeState,{minsRemaining:Math.floor(nextSecondsLeft/60),secsRemaining:nextSecondsLeft%60});
    scope._kalshiQuote.at=clock;scope.lastPriceSourceRef.current.time=clock;
    scope.lastKalshiSuccessRef.current=clock;}
  return {run,scope,logs,errors,audit,cloud,timers,storage,clock,close,windowId,
    advance,
    missing:[...new Set([...candidate.dependencies,...effect.dependencies,...boundary.dependencies])].filter(name=>!(name in scope))};
}
