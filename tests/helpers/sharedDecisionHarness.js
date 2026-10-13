import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
import {app,compile,makeHarness} from './callDecisionHarness.js';
import * as shared from '../../src/sharedDecision.js';
const traverse=traverseModule.default||traverseModule;
const ast=parse(app,{sourceType:'module',plugins:['jsx']});
function declaration(name){let body;traverse(ast,{VariableDeclarator(p){if(p.node.id.name===name)body=app.slice(p.node.start,p.node.end);}});
  if(!body)throw new Error(`Missing actual declaration ${name}`);return compile(`const ${body};`,`return ${name};`);}
function effect(marker){let body;traverse(ast,{CallExpression(p){const fn=p.node.arguments[0];
  if(p.node.callee.name==='useEffect'&&fn?.type==='ArrowFunctionExpression'&&app.slice(fn.start,fn.end).includes(marker))body=app.slice(fn.body.start+1,fn.body.end-1);
}});if(!body)throw new Error(`Missing actual effect ${marker}`);return compile(body);}
const apply=declaration('_applySharedDecision'),persist=declaration('_persistLock'),clear=declaration('_clearLock');
const complete=declaration('_completeSharedRestore');
const watch=effect('let cancelled=false,retryTimer='),wake=effect('const resync=async()=>');
export const actualCloudWatch=declaration('cloudWatch'),actualCloudWrite=declaration('cloudWrite'),actualCloudRead=declaration('cloudSupabaseRead');

export function restoreHarness({secondsLeft=300,ready=false,rows=[]}={}){
  const h=makeHarness({secondsLeft,ready,claimedDirection:null,samples:0}),callbacks=[],writes=[],renders=[],toasts=[],timers=[];
  const ref=current=>({current});
  Object.assign(h.scope,shared,{
    _cloudLockMirrorRef:ref(null),_hasRestoredLockRef:ref(false),_cloudRestoreCompletedRef:ref(false),_cloudRestoreErrorRef:ref(null),
    taraAdviceRef:ref('SEARCHING...'),engineLockedDirRef:ref(null),
    _lastSharedProgressPersistRef:ref({at:0,windowId:null,engineAt:null}),
    _firstSharedRestoreCompletedRef:ref(false),_sharedLedgerLookupRef:ref(null),
    _sharedRestoreGenerationRef:ref(0),
    _SB_PAUSED:false,_sbClient:{},_priceAlive:true,currentPriceRef:ref(83400),
    computeWindowId:type=>shared.sharedWindowId(type,h.scope.Date.now()),
    cloudWriteDebounced:(path,data)=>writes.push({path,data:structuredClone(data)}),
    cloudDelete(){throw new Error('Shared decision must not be deleted');},
    setForceRender:fn=>renders.push(fn(0)),pushToast:(...args)=>toasts.push(args),
    cloudWatch:(path,callback)=>{callbacks.push({path,callback});return()=>{};},
    cloudSupabaseRead:async()=>null,
    setTimeout:(fn,ms)=>{const t={fn,ms,cancelled:false};timers.push(t);return t;},clearTimeout:t=>{if(t)t.cancelled=true;},
    document:{visibilityState:'visible',listeners:{},addEventListener(k,fn){this.listeners[k]=fn;},removeEventListener(k){delete this.listeners[k];}},
    window:{listeners:{},addEventListener(k,fn){this.listeners[k]=fn;},removeEventListener(k){delete this.listeners[k];}},
  });
  h.scope.timeState.nextWindowMs=h.close;
  h.logs.push(...structuredClone(rows));h.scope.taraCallLogRef.current=h.logs;
  h.scope._lockCloudPath=()=>`state/currentLock_${h.scope.currentAssetRef.current}_${h.scope.windowType}`;
  h.scope._completeSharedRestore=complete(h.scope);h.scope._applySharedDecision=apply(h.scope);h.scope._persistLock=persist(h.scope);h.scope._clearLock=clear(h.scope);
  return {...h,callbacks,writes,renders,toasts,timers,
    startWatch:()=>watch(h.scope),startWake:()=>wake(h.scope),apply:(d,source)=>h.scope._applySharedDecision(d,source),
    clear:()=>h.scope._clearLock(),persist:()=>h.scope._persistLock()};
}
