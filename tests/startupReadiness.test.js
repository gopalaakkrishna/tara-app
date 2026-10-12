import test from 'node:test';
import assert from 'node:assert/strict';
import {assessStartupReadiness,candleReadiness,observeStartupSamples} from '../src/startupReadiness.js';
import {describeCallBlocker} from '../src/callBlocker.js';
import {deadlineSitout,assessCallCommit} from '../src/callPolicy.js';
import {captureOriginalDecision,normalizeCallLedger} from '../src/callIntegrity.js';

const now=Date.parse('2026-10-12T17:05:00Z');
const bars=(interval,count=100)=>Array.from({length:count},(_,i)=>({time:Math.floor(now/1000/interval)*interval-i*interval,o:100,h:102,l:99,c:101,v:10}));
const samples=Array.from({length:50},(_,i)=>now-73500+i*1500);
const input=()=>({now,history:bars(900),tfCandles:{c1m:bars(60),c5m:bars(300),c15m:bars(900)},
  samples,spot:101,spotAt:now,analysis:{rawProbAbove:65,prediction:'UP'}});
const windowId='15m-2026-10-12T17:00:00.000Z';
const quote={ticker:'KXBTC15M-26OCT121315-15',at:now,bid:59,ask:61,closeTime:'2026-10-12T17:15:00Z'};

test('fresh backfill plus 50 real samples is ready without waiting 75 minutes',()=>{
  assert.equal(assessStartupReadiness(input()).ready,true);
});
test('a long session cannot make missing or stale history ready',()=>{
  assert.match(assessStartupReadiness({...input(),history:[]}).reason,/0\/30/);
  assert.equal(candleReadiness(bars(60).map(c=>({...c,time:c.time-3600})),60,60,now).ok,false);
});
test('fake duplicates, future bars, broken OHLC and gaps cannot satisfy history coverage',()=>{
  const good=bars(60);
  for(const bad of [Array(100).fill(good[0]),good.map(c=>({...c,time:c.time+100000})),
    good.map(c=>({...c,h:50})),good.filter((_,i)=>i%2===0)]) {
    assert.equal(candleReadiness(bad,60,30,now).ok,false);
  }
});
test('unsorted real candles from either provider retain valid coverage',()=>{
  assert.equal(candleReadiness(bars(60).reverse(),60,60,now).ok,true);
});
test('a candle cache never substitutes for live observation samples',()=>{
  const status=assessStartupReadiness({...input(),samples:[]});
  assert.equal(status.ready,false);assert.equal(status.code,'startup-sampling');
  assert.equal(status.remainingSeconds,60);
});
test('repeated renders with one receipt do not accumulate stability',()=>{
  let tracker=null;
  for(let i=0;i<100;i++)tracker=observeStartupSamples(tracker,{asset:'BTC',source:'coinbase',spot:100,spotAt:now,now});
  assert.equal(tracker.samples.length,1);
});
test('observation count and elapsed coverage must both qualify',()=>{
  assert.equal(assessStartupReadiness({...input(),samples:samples.slice(-20)}).ready,false);
  assert.equal(assessStartupReadiness({...input(),samples:Array.from({length:50},(_,i)=>now-49+i)}).ready,false);
});
test('source or asset switch and interrupted feed restart sampling',()=>{
  const previous={asset:'BTC',source:'coinbase',samples};
  for(const overrides of [{asset:'ETH'},{source:'kraken'},{spotAt:now+30000,now:now+30000}]) {
    const next=observeStartupSamples(previous,{asset:'BTC',source:'coinbase',spot:100,spotAt:now,now,...overrides});
    assert.equal(next.samples.length,1);
  }
  assert.equal(observeStartupSamples(previous,{asset:'BTC',source:'coinbase',spot:100,spotAt:now-20000,now}).samples.length,0);
});
test('an explicit extra startup hold does not replace readiness checks',()=>{
  assert.equal(assessStartupReadiness({...input(),minimumUntil:now+60000}).code,'startup-user-hold');
  assert.equal(assessStartupReadiness({...input(),samples:[],minimumUntil:0}).ready,false);
});
test('quote failure and current commit rejection are explicit blockers',()=>{
  const base={call:{call:'UP',reason:'UP lean'},readiness:{ready:true},samples:{dir:'UP',count:3},windowId,quote,now};
  assert.match(describeCallBlocker({...base,quote:null}).reason,/market-mismatch/);
  assert.equal(describeCallBlocker({...base,hold:{windowId,reason:'Price outside entry band',at:now}}).reason,'Price outside entry band');
  assert.match(describeCallBlocker({...base,hold:{windowId,reason:'old',at:now-20000}}).reason,/Forming UP/);
});
test('deadline retains exact blocker through original capture and compact restore',()=>{
  const blocked=describeCallBlocker({call:{call:'SIT_OUT'},readiness:{ready:false,code:'startup-sampling',reason:'Warming up live observations: 20/50 samples.',samples:20,spanMs:30000},windowId,quote,now});
  const snapshot=deadlineSitout({blockedDecision:blocked},{reason:'No qualifying Call before cutoff.',secondsLeft:419,cutoff:420});
  assert.match(snapshot.reason,/20\/50/);assert.equal(snapshot.blockedDecision,blocked);
  const entry={...snapshot,asset:'BTC',windowType:'15m',windowId,id:now,result:'SITOUT'};
  entry.originalDecision=captureOriginalDecision(entry,{now});
  const restored=normalizeCallLedger([{id:now,asset:'BTC',windowType:'15m',windowId,dir:'SIT_OUT',result:'SITOUT'}],[entry])[0];
  assert.equal(restored.originalDecision.blockedDecision.reason,blocked.reason);
  assert.equal(restored.blockedDecision.reason,blocked.reason);
});
test('startup completion never extends the seven-minute deadline or rewrites an existing Call',()=>{
  const context={windowId,asset:'BTC',now:Date.parse(quote.closeTime)-419000,quote,readiness:{ready:true}};
  assert.equal(assessCallCommit({call:'UP',atPosterior:65,tier:'patient'},context).action,'sitout');
  assert.equal(assessCallCommit({call:'UP',originalDecision:{direction:'UP'}},{...context,readiness:{ready:false}}).action,'keep');
});
