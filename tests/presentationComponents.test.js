import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transformSync} from 'esbuild';
import {capturedReason,recordVersion,evidenceCohort} from '../src/presentationEvidence.js';
import {finiteNumber} from '../src/callIntegrity.js';
// Render the real JSX, with React's actual hooks, without mounting an engine,
// accessing browser storage, or making a network request.
const source=fs.readFileSync(new URL('../src/TaraPresentation.jsx',import.meta.url),'utf8')
  .replace(/^import .*;\r?$/gm,'').replace(/export (const|function) /g,'$1 ');
const compiled=transformSync(source,{loader:'jsx',format:'cjs'}).code;
const {PaperPerformanceSummary,TaraStorageStatus,TaraBrainSummary,TaraEvidenceAnalytics,HourlyApprovalSummary,RecordInspector,TaraSignalsSummary,TaraDetailEnvelope}=new Function('React','capturedReason','recordVersion','evidenceCohort','finiteNumber',`${compiled};return {PaperPerformanceSummary,TaraStorageStatus,TaraBrainSummary,TaraEvidenceAnalytics,HourlyApprovalSummary,RecordInspector,TaraSignalsSummary,TaraDetailEnvelope};`)(React,capturedReason,recordVersion,evidenceCohort,finiteNumber);
const render=(C,props)=>renderToStaticMarkup(React.createElement(C,props));

test('Sports price-matched report labels its sample and missing prices without claiming actual profits',()=>{
  const html=render(PaperPerformanceSummary,{stats:{wins:849,losses:954,priced_n:1485,unpriced_n:318,priced_wins:662,priced_win_rate:662/1485,breakeven:.516,edge:-.07075,units:-105.0681}});
  assert.match(html,/Priced sample: 1485/);assert.match(html,/Unpriced: 318/);
  assert.match(html,/-7.1%/);assert.match(html,/-105.07u/);assert.match(html,/not actual account profit/);
  const old=render(PaperPerformanceSummary,{stats:{edge:.2}});assert.match(old,/unavailable/);assert.doesNotMatch(old,/20.0%/);
  const missing=render(PaperPerformanceSummary,{stats:{priced_n:0,unpriced_n:4}});
  assert.match(missing,/Estimated return unavailable/);assert.doesNotMatch(missing,/0.00u/);
});
test('forming Brain never claims a captured Call or converts missing evidence to confidence',()=>{
  const html=render(TaraBrainSummary,{lock:{committed:false},candidate:{blockedDecision:{reason:'Waiting for fresh quote'}}});
  assert.match(html,/Current candidate/);assert.match(html,/Waiting for fresh quote/);assert.match(html,/Not captured/);assert.doesNotMatch(html,/Original decision captured|50\.0/);
});
test('captured Brain reason stays original when live candidate changes',()=>{
  const html=render(TaraBrainSummary,{snapshot:{originalDecision:{reason:'Original DOWN gate',signalScore:73,secondsLeft:460}},candidate:{reason:'Current UP'},lock:{committed:true,tradeable:true,dir:'DOWN'}});
  assert.match(html,/Original DOWN gate/);assert.doesNotMatch(html,/Current UP/);assert.match(html,/73\.0/);
});
test('analytics empty state cannot claim profit, probability or settled success',()=>{
  const html=render(TaraEvidenceAnalytics,{entries:[]});assert.match(html,/Unavailable/);assert.match(html,/not AutoTrade P/);assert.match(html,/0 wins \/ 0 settled/);assert.doesNotMatch(html,/\+0\.0¢/);
});
test('hourly legacy pick does not fabricate a sample sequence, probability or net edge',()=>{
  const html=render(HourlyApprovalSummary,{locks:[{side:'NO',strike:84000,cost:55}],samples:[],status:{reason:'Current gate'}});
  assert.match(html,/NO/);assert.match(html,/Current scan:/);assert.match(html,/0 captured samples/);assert.match(html,/Inspect captured approval/);assert.doesNotMatch(html,/New quote \+ spot/);
});
test('inspector keeps exact blocker and marks an amended row without changing its original evidence',()=>{
  const entry={dir:'SIT_OUT',result:'SITOUT',manualEdit:true,originalDecision:{direction:'SIT_OUT',blockedDecision:{code:'timing-confidence',reason:'Observed 61.2; required 65',gate:{observedConfidence:61.2,requiredConfidence:65}}}};
  const prior=JSON.stringify(entry),html=render(RecordInspector,{entry,onClose(){}});assert.match(html,/Observed 61\.2; required 65/);assert.match(html,/timing-confidence/);assert.match(html,/Amended row/);assert.equal(JSON.stringify(entry),prior);
});
test('live signals do not substitute a candidate for the committed Call or invent depth and tape',()=>{
  const html=render(TaraSignalsSummary,{candidate:{call:'UP',confidence:80,reason:'Strong candidate'},lock:{committed:false},deadline:420});
  assert.match(html,/Not committed/);assert.match(html,/7:00 remaining/);assert.match(html,/Waiting for tape/);assert.match(html,/Waiting for depth/);assert.doesNotMatch(html,/UP · locked/);
});
test('disclosure does not conditionally remove its original panels',()=>{
  const children=React.createElement('div',null,'Original control');
  assert.match(render(TaraDetailEnvelope,{enabled:true,children}),/Original control/);
  assert.match(render(TaraDetailEnvelope,{enabled:false,children}),/Original control/);
});
test('history status distinguishes verified archive from small paint caches and real write failures',()=>{
  const good=render(TaraStorageStatus,{status:{state:'ok',archiveSaved:true,archiveRows:1200,deepRows:100,fastRows:10}});
  assert.match(good,/1200 archived/);assert.match(good,/History archived/);assert.doesNotMatch(good,/needs attention/);
  const bad=render(TaraStorageStatus,{status:{state:'degraded',archiveSaved:false,error:'History transaction aborted.',deepRows:0,fastRows:0}});
  assert.match(bad,/needs attention/);assert.match(bad,/History transaction aborted/);assert.doesNotMatch(bad,/History archived/);
});
