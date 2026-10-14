// Execute the actual scoring engine and its transitive pure helpers. No browser,
// cloud publisher, React mount, orders, or network client is instantiated.
import vm from 'node:vm';
import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
import {app} from './callDecisionHarness.js';
import * as forecasts from '../../src/forecastTiming.js';
import {observedFundingPair} from '../../src/marketDataQuality.js';
import {dampenScore} from '../../src/economicCalendar.js';
import {directionFeatures} from '../../src/learningCore.js';
import {canonicalRegimeFlags} from '../../src/decisionAuthority.js';
const traverse=traverseModule.default||traverseModule;
const ast=parse(app,{sourceType:'module',plugins:['jsx']});
const declarations=new Map();
for(const statement of ast.program.body){
  if(statement.type==='VariableDeclaration')for(const d of statement.declarations){
    if(d.id.type==='Identifier'&&d.init)declarations.set(d.id.name,`const ${d.id.name}=${app.slice(d.init.start,d.init.end)};`);
  }
  if(statement.type==='FunctionDeclaration')declarations.set(statement.id.name,app.slice(statement.start,statement.end));
}
const external={...forecasts,observedFundingPair,dampenScore,directionFeatures,canonicalRegimeFlags};
const builtins=new Set(['Array','Object','Number','String','Math','Set','Map','JSON','Boolean','Date','console','Intl',
  'parseFloat','parseInt','isNaN','Infinity','NaN','undefined','window','localStorage']);
const ordered=[],selected=new Set();
function select(name){
  if(selected.has(name)||name in external||builtins.has(name))return;
  const code=declarations.get(name);if(!code)throw new Error(`Missing scoring dependency: ${name}`);
  selected.add(name);
  const parsed=parse(code,{sourceType:'script'});
  traverse(parsed,{ReferencedIdentifier(p){if(!p.scope.hasBinding(p.node.name,true))select(p.node.name);}});
  ordered.push(code);
}
select('computeV99Posterior');select('computeFGT');
const engineScript=new vm.Script(`${ordered.join('\n')}\n({computeV99Posterior,computeFGT})`);
export function scoreEngine(now=Date.parse('2026-10-13T21:00:00Z')){
  const errors=[];
  class TestDate extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const context=vm.createContext({...external,Date:TestDate,window:{},localStorage:{getItem:()=>null},
    console:{log(){},info(){},warn(){},error(...args){errors.push(args.map(String).join(' '));}}});
  return {...engineScript.runInContext(context,{timeout:3000}),errors};
}
export function scoringInputs({secondsLeft=631,is15m=true,direction='UP',now=Date.parse('2026-10-13T21:00:00Z')}={}){
  const sign=direction==='UP'?1:-1,currentPrice=83400;
  const candles=(step,period)=>Array.from({length:180},(_,i)=>({t:now-i*period,o:currentPrice-sign*(i+.5)*step,
    c:currentPrice-sign*i*step,h:currentPrice-sign*i*step+2,l:currentPrice-sign*(i+1)*step-2,v:20+i%5}));
  return {currentPrice,referencePrice:currentPrice,targetMargin:currentPrice-sign*35,
    liveHistory:candles(1,60000),tfCandles:{c1m:candles(1,60000),c5m:candles(3,300000),c15m:candles(5,900000)},
    globalFlow:{imbalance:sign*.6,deltaUSD:sign*100000,totalVolume:500000},bloomberg:{},velocityRef:{current:{v5s:sign*.2,v15s:sign*.18,v30s:sign*.15,accel:0}},
    tickHistoryRef:{current:[]},priceMemoryRef:{current:[]},windowType:is15m?'15m':'5m',is15m,
    clockSeconds:secondsLeft,timeFraction:1-secondsLeft/(is15m?900:300),windowOpenPrice:currentPrice-sign*20,
    windowHigh:currentPrice+20,windowLow:currentPrice-20,windowOpenTime:now-((is15m?900:300)-secondsLeft)*1000,
    tapeWindows:{w15:{buyPct:direction==='UP'?90:10},w30:{buyPct:direction==='UP'?90:10},w60:{buyPct:direction==='UP'?90:10}},
    currentAsset:'BTC',adaptiveWeights:null,calibration:null,regimeMemory:{},currentRegime:'RANGE-CHOP'};
}
