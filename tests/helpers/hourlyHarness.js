import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
import {app,compile} from './callDecisionHarness.js';
import * as hourly from '../../src/hourlyDecision.js';
import {normalizeHourlyRecord} from '../../src/hourlyRecordMath.js';
import {capturePickLearning,capturePickSettlement} from '../../src/learningCapture.js';
const traverse=traverseModule.default||traverseModule,ast=parse(app,{sourceType:'module',plugins:['jsx']});
const declarations=new Map();
traverse(ast,{
  FunctionDeclaration(p){declarations.set(p.node.id.name,app.slice(p.node.start,p.node.end));},
  VariableDeclarator(p){if(p.node.id.type==='Identifier')declarations.set(p.node.id.name,'const '+app.slice(p.node.start,p.node.end)+';');},
});
export function actual(name,scope){return compile(declarations.get(name),`return ${name};`)(scope);}
export function actualHourlyModel(){const scope={};for(const name of ['TARA_HOURLY_VOL_A','TARA_HOURLY_VOL_H','TARA_HOURLY_DRIFT_BPS','_taraNormCdf','taraHourlyProb'])scope[name]=actual(name,scope);return scope.taraHourlyProb;}

// Minimal deterministic hook host runs the production component's effects and
// record hook. Timers, storage, clock and remote services are isolated doubles.
export function hourlyHarness({lad,now,props={},record={w:0,l:0,pending:[],history:[]},readCloud=async()=>null,model=actualHourlyModel(),realLadder=false,race,sharedStorage,fetchMock}={}) {
  let clock=now,cursor=0,dirty=false,latestProps=props,output,active=true;
  const hooks=[],effects=[],intervals=[],alerts=[],writes=[],storage=sharedStorage||new Map([['taraHourlyRecord_v1',JSON.stringify(record)]]);
  const React={
    useState(initial){const i=cursor++;hooks[i]??={value:typeof initial==='function'?initial():initial};return [hooks[i].value,next=>{const v=typeof next==='function'?next(hooks[i].value):next;if(v!==hooks[i].value){hooks[i].value=v;dirty=true;}}];},
    useRef(initial){const i=cursor++;return hooks[i]??=( {current:initial});},
    useCallback(fn,deps){const i=cursor++;if(!hooks[i]||deps.some((v,j)=>v!==hooks[i].deps[j]))hooks[i]={value:fn,deps};return hooks[i].value;},
    useEffect(fn,deps){const i=cursor++,old=hooks[i];if(!old||!deps||deps.some((v,j)=>v!==old.deps?.[j])){effects.push(()=>{old?.cleanup?.();const cleanup=fn();hooks[i]={deps,cleanup};});}},
  };
  const FakeDate=class extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};
  const scope={...hourly,normalizeHourlyRecord,capturePickLearning,capturePickSettlement,React,Date:FakeDate,encodeURIComponent,console:{info(){},warn(){}},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,v)=>storage.set(key,v)},
    _HR_KEY:'taraHourlyRecord_v1',_HR_HISTORY_CAP:500,_HR_PENDING_CAP:40,_HR_CLOUD_PATH:'memory/hourlyRecord',_hrIntervalActive:false,
    cloudSupabaseRead:(...args)=>readCloud(...args),cloudWriteDebounced:(...args)=>writes.push(structuredClone(args)),
    setInterval:(fn,ms)=>{const t={fn,ms};intervals.push(t);return t;},clearInterval(){},
    fetch:fetchMock|| (async()=>{throw new Error('Unexpected network fetch');}),TARA_BUILD_VERSION:'14.4.10-test',taraHourlyProb:model,
    _K_PUB:'https://test.invalid',_kLadRace:race,
  };
  for(const name of ['_hrLoad','_hrMerge','_hrSave','useHourlyRecord'])scope[name]=actual(name,scope);
  scope.useHourlyLadder=realLadder?actual('useHourlyLadder',scope):()=>lad;
  const panel=declarations.get('HourlyLadderPanel');
  const component=compile(panel.slice(0,panel.indexOf('  if(!on)return null;'))+
    'return {LOCKS,status:_hourlyStatus,confirmation:confirmationRef.current,input,assessment};}', 'return HourlyLadderPanel;')(scope);
  const render=(next=latestProps)=>{latestProps=next;cursor=0;dirty=false;output=component({onHourlyLock:lk=>alerts.push(structuredClone(lk)),...latestProps});for(const effect of effects.splice(0))effect();return output;};
  return {scope,alerts,writes,storage,intervals,render,
    setTime:t=>{clock=t;},setLadder:l=>{lad=l;},get output(){return output;},
    get record(){return JSON.parse(storage.get('taraHourlyRecord_v1'));},
    async flush(){for(let i=0;i<12;i++){if(dirty&&active)render();await new Promise(r=>setImmediate(r));if(!dirty&&i>2)break;}return output;},
    unmount(){active=false;for(const hook of hooks)hook?.cleanup?.();},
  };
}
