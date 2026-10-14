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
const {TaraBrainSummary,TaraEvidenceAnalytics,HourlyApprovalSummary,RecordInspector,TaraSignalsSummary,TaraDetailEnvelope}=new Function('React','capturedReason','recordVersion','evidenceCohort','finiteNumber',`${compiled};return {TaraBrainSummary,TaraEvidenceAnalytics,HourlyApprovalSummary,RecordInspector,TaraSignalsSummary,TaraDetailEnvelope};`)(React,capturedReason,recordVersion,evidenceCohort,finiteNumber);
const render=(C,props)=>renderToStaticMarkup(React.createElement(C,props));
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
