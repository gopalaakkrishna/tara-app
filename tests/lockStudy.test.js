import test from 'node:test';
import assert from 'node:assert/strict';
import {createLockStudy,observeLockStudy,settleLockStudy,studyCoverage,summarizeLockStudies,calibrateStudyProbability} from '../src/lockStudy.js';

const start=Date.parse('2026-09-27T00:00:00Z'),windowId='15m-2026-09-27T00:00:00.000Z';
const market={ticker:'KXBTC15M-26SEP262015-15',close_time:'2026-09-27T00:15:00Z',floor_strike:75000,result:'yes',status:'settled'};
const sample=(elapsed,patch={})=>({windowId,asset:'BTC',now:start+elapsed*1000,probabilityUpRaw:75,
  quote:{ticker:market.ticker,closeTime:market.close_time,bid:55,ask:57,mid:56,at:start+elapsed*1000,strike:75000},...patch});
const fresh=()=>createLockStudy({windowId,asset:'BTC',device:'test',version:'14.2',now:start});
test('early policy waits for stability, locks once and cannot flip with hindsight',()=>{
  let s=observeLockStudy(fresh(),sample(0));
  s=observeLockStudy(s,sample(15));assert.equal(s.early.status,'waiting');
  s=observeLockStudy(s,sample(30));assert.equal(s.early.direction,'UP');
  const lock=s.early;s=observeLockStudy(s,sample(45,{probabilityUpRaw:20}));
  assert.equal(s.early,lock);assert.equal(s.policy.mode,'shadow-only');
});
test('quote recovery before cutoff can qualify, and an observation gap resets stability',()=>{
  let s=observeLockStudy(fresh(),sample(0,{quote:null}));assert.equal(s.early.status,'waiting');
  for(const t of [15,30,60,75])s=observeLockStudy(s,sample(t));
  assert.equal(s.early.status,'waiting');
  s=observeLockStudy(s,sample(90));assert.equal(s.early.status,'locked');
});
test('no candidate can first lock after the seven-minute cutoff',()=>{
  let s=observeLockStudy(fresh(),sample(465));
  s=observeLockStudy(s,sample(480));
  s=observeLockStudy(s,sample(495));assert.equal(s.early.status,'sitout');
  s=observeLockStudy(s,sample(510));assert.equal(s.early.status,'sitout');
});
test('DOWN costs the NO ask and uses the selected-side probability',()=>{
  let s=fresh();for(const t of [0,15,30])s=observeLockStudy(s,sample(t,{probabilityUpRaw:20}));
  assert.equal(s.early.direction,'DOWN');assert.equal(s.early.costCents,45);assert.equal(s.early.probability,.8);
});
test('late-opened and incomplete windows do not improve reported performance',()=>{
  let s=fresh();for(const t of [120,135,150])s=observeLockStudy(s,sample(t));
  assert.equal(studyCoverage(s).complete,false);
  s=settleLockStudy(s,market,start+1000000);
  const report=summarizeLockStudies([s]);assert.equal(report.settled,1);assert.equal(report.complete,0);assert.equal(report.early.calls,0);
});
test('complete windows are officially scored, priced as estimates, and never promoted automatically',()=>{
  let s=fresh();for(let t=0;t<=885;t+=15)s=observeLockStudy(s,sample(t));
  assert.equal(studyCoverage(s).complete,true);
  assert.equal(settleLockStudy(s,{...market,result:'',status:'active'},start+1000000),s);
  assert.equal(settleLockStudy(s,{...market,ticker:'KXBTC15M-OTHER'},start+1000000),s);
  s=settleLockStudy(s,market,start+1000000);
  const report=summarizeLockStudies([s]);assert.equal(report.early.wins,1);assert.equal(report.marketAtEarly.wins,1);assert.equal(report.promotionAllowed,false);
  assert.deepEqual(report.calibration.map(b=>b.to),[60,70,80,90,100]);
  assert.equal(report.early.estimatedNetCents,100-57-2);
});
test('duplicate or out-of-order observations do not manufacture stability',()=>{
  let s=observeLockStudy(fresh(),sample(15));
  assert.equal(observeLockStudy(s,sample(15)),s);assert.equal(observeLockStudy(s,sample(0)),s);
  assert.equal(observeLockStudy(s,{...sample(30),asset:'ETH'}),s);
});
test('calibration cannot learn from an outcome unavailable at decision time',()=>{
  let s=fresh();for(let t=0;t<=885;t+=15)s=observeLockStudy(s,sample(t));
  s=settleLockStudy(s,market,start+1000000);
  assert.equal(calibrateStudyProbability(Array(40).fill(s),.75,start+500000).n,0);
  assert.equal(calibrateStudyProbability([s],.75,start+1100000).probability,null);
  assert.equal(calibrateStudyProbability(Array(40).fill(s),.75,start+1100000).n,1);
});

test('downtime after the early deadline cannot make current Tara look like it sat out',()=>{
  let s=fresh();for(let t=0;t<=480;t+=15)s=observeLockStudy(s,sample(t));
  assert.equal(studyCoverage(s).complete,false);
  assert.equal(summarizeLockStudies([settleLockStudy(s,market,start+1000000)]).early.calls,0);
});

test('current-policy capture rejects previous-window snapshots and preserves the first valid lock',()=>{
  const stale={locked:true,call:'DOWN',windowId:'15m-2026-09-26T23:45:00.000Z',_committedAt:start-60000};
  let s=observeLockStudy(fresh(),sample(0,{currentDecision:stale}));
  assert.equal(s.current,null);
  const valid={locked:true,call:'UP',windowId,_committedAt:start+10000,kalshiAskAtLock:57};
  s=observeLockStudy(s,sample(15,{currentDecision:valid}));
  assert.equal(s.current.direction,'UP');assert.equal(s.current.at,start+10000);
  s=observeLockStudy(s,sample(30,{currentDecision:{...valid,call:'DOWN'}}));
  assert.equal(s.current.direction,'UP');
});
