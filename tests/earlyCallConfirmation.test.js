import test from 'node:test';
import assert from 'node:assert/strict';
import {observeEarlyFlatGap,earlyFlatGapReady} from '../src/earlyCallConfirmation.js';

const start=Date.parse('2026-10-17T18:15:00Z'),now=start+61000;
const windowId='15m-2026-10-17T18:15:00.000Z';
function input(direction='UP',patch={}) {
  const up=direction==='UP';
  return {asset:'BTC',windowType:'15m',windowId,direction,source:'coinbase',now,ready:true,candidateQualified:true,
    score:77,probabilityUp:up?77:23,mtfAlignment:up?1:-1,
    tapeWindows:{w15:{buyPct:up?80:20},w30:{buyPct:up?80:20},w60:{buyPct:50}},
    quote:{ticker:'KXBTC15M-26OCT171430-30',closeTime:new Date(start+900000).toISOString(),
      at:now,bid:up?51:48,ask:up?52:49},spotAt:now,referencePrice:up?81401:81391,strike:81396,
    minCost:44,maxCost:77,...patch};
}
function next(i,ms=1000,patch={}) {
  return {...i,now:i.now+ms,spotAt:i.now+ms,quote:{...i.quote,at:i.now+ms},...patch};
}

test('UP and DOWN require two distinct fresh spot/book observations and the ordinary sample requirement',()=>{
  for(const dir of ['UP','DOWN']){
    const i=input(dir),a=observeEarlyFlatGap(null,i);
    assert.equal(a.eligible,true);assert.equal(a.evidence.entryCost,52);
    assert.equal(earlyFlatGapReady(a,3,i.now),false);
    const b=observeEarlyFlatGap(a.state,next(i));
    assert.equal(b.state.formation.observations,2);
    assert.equal(earlyFlatGapReady(b,3,i.now+1000),true);
    assert.equal(earlyFlatGapReady(b,4,i.now+1000),false);
    assert.equal(earlyFlatGapReady(b,null,i.now+1000),false);
    assert.equal(earlyFlatGapReady(b,3,i.now+2001),false);
  }
});

test('existing strong score, forecast, tape, alignment and early phase bounds are explicit',()=>{
  const i=input('UP',{score:75,probabilityUp:72,mtfAlignment:.7,
    tapeWindows:{w15:{buyPct:70},w30:{buyPct:70},w60:{buyPct:50}}});
  assert.equal(observeEarlyFlatGap(null,i).eligible,true);
  for(const patch of [{score:74.99},{score:101},{score:null},{probabilityUp:71.99},{probabilityUp:23},
    {mtfAlignment:.69},{mtfAlignment:-1},{referencePrice:81395},{referencePrice:81396},{strike:null},
    {ready:false},{candidateQualified:false},{source:''},{windowType:'5m'},
    {asset:'ETH'},{now:start-1},{now:start+120000},{now:start+480000},
    {tapeWindows:{w15:{buyPct:70},w30:{buyPct:69},w60:{buyPct:50}}},
    {tapeWindows:{w15:{buyPct:80},w30:{buyPct:80},w60:{buyPct:null}}}]){
    assert.equal(observeEarlyFlatGap(null,{...i,...patch}).eligible,false,JSON.stringify(patch));
  }
});

test('cheap executable prices are symmetric and honor tighter user bounds without widening44–77',()=>{
  for(const dir of ['UP','DOWN'])for(const cost of [43,44,68,69,77,78]){
    const i=input(dir),quote={...i.quote,...(dir==='UP'?{bid:cost-1,ask:cost}:{bid:100-cost,ask:101-cost})};
    assert.equal(observeEarlyFlatGap(null,{...i,quote}).eligible,cost>=44&&cost<=68,dir+' '+cost);
  }
  const i=input();
  assert.equal(observeEarlyFlatGap(null,{...i,minCost:53}).eligible,false);
  assert.equal(observeEarlyFlatGap(null,{...i,maxCost:51}).eligible,false);
  assert.equal(observeEarlyFlatGap(null,{...i,quote:{...i.quote,bid:49,ask:52}}).reason,'wide-spread');
  assert.equal(observeEarlyFlatGap(null,{...i,quote:{...i.quote,bid:50,ask:52}}).eligible,true);
});

test('stale, future, missing, crossed and wrong-market data never creates an early proof',()=>{
  const i=input();
  for(const patch of [{quote:null},{quote:{...i.quote,ticker:null}},
    {quote:{...i.quote,ticker:'KXETH15M-26OCT171430-30'}},
    {quote:{...i.quote,closeTime:new Date(start+1800000).toISOString()}},
    {quote:{...i.quote,at:now-30001}},{quote:{...i.quote,at:now+2001}},
    {quote:{...i.quote,bid:54,ask:52}},{quote:{...i.quote,bid:null}},
    {spotAt:null},{spotAt:now-15001},{spotAt:now+2001},{spotAt:start-1},
    {probabilityUp:null},{probabilityUp:101},{referencePrice:0}]){
    const r=observeEarlyFlatGap(null,{...i,...patch});
    assert.equal(r.eligible,false,JSON.stringify(patch));assert.equal(r.state,null);
  }
});

test('clock renders, duplicate quotes or unchanged spot cannot manufacture confirmation',()=>{
  const i=input(),a=observeEarlyFlatGap(null,i);
  for(const n of [next(i,500),next(i,1000,{spotAt:i.spotAt}),next(i,1000,{quote:i.quote}),i]){
    const b=observeEarlyFlatGap(a.state,n);assert.equal(b.fresh,false);
    assert.equal(b.state.formation.observations,1);assert.equal(earlyFlatGapReady(b,1,n.now),false);
  }
});

test('source, direction, exact market, strike, window, long gaps and quote retreats start fresh',()=>{
  const i=input(),a=observeEarlyFlatGap(null,i);
  const cases=[next(i,1000,{source:'backup'}),next(input('DOWN')),
    next(i,1000,{strike:81395}),next(i,1000,{quote:{...i.quote,at:now+1000,ticker:i.quote.ticker+'-OTHER'}}),
    next(i,16000),next(i,1000,{quote:{...i.quote,at:now+1000,bid:50,ask:51}}),
    {...next(i),windowId:'15m-2026-10-17T18:30:00.000Z',now:now+900000,spotAt:now+900000,
      quote:{...i.quote,at:now+900000,closeTime:new Date(start+1800000).toISOString()}}];
  for(const n of cases){const b=observeEarlyFlatGap(a.state,n);assert.equal(b.fresh,true);
    assert.equal(b.state.formation.observations,1);assert.equal(earlyFlatGapReady(b,3,n.now),false);}
  const invalid=observeEarlyFlatGap(a.state,next(i,1000,{score:70}));assert.equal(invalid.state,null);
  const renewed=observeEarlyFlatGap(invalid.state,next(i,2000));assert.equal(renewed.state.formation.observations,1);
});

test('no result or historical performance field can affect the forward-only decision',()=>{
  const i=input();
  const a=observeEarlyFlatGap(null,i);
  for(const result of ['WIN','LOSS',null])assert.deepEqual(observeEarlyFlatGap(null,{...i,result,settlement:'yes',historicalWinRate:100}),a);
});
