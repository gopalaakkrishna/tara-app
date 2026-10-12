import test from 'node:test';
import assert from 'node:assert/strict';
import {coinbaseCandleRange} from '../src/candleRequests.js';
test('all supported timeframes stay within Coinbase maximum range and do not request future data',()=>{
  const now=Date.parse('2026-10-12T17:48:41Z');
  for(const interval of [60,300,900,3600,21600,86400]){
    const query=new URLSearchParams(coinbaseCandleRange(interval,now));
    const end=Date.parse(query.get('end')),start=Date.parse(query.get('start'));
    assert.equal((end-start)/(interval*1000),299);
    assert.ok(end<=now&&now-end<30000);
  }
});
test('a new refresh slot changes the CDN key while repeated requests share the current range',()=>{
  const now=Date.parse('2026-10-12T17:48:00Z');
  assert.equal(coinbaseCandleRange(60,now),coinbaseCandleRange(60,now+29000));
  assert.notEqual(coinbaseCandleRange(60,now),coinbaseCandleRange(60,now+30000));
});
test('unsupported intervals and invalid clocks cannot form a candle request',()=>{
  assert.throws(()=>coinbaseCandleRange(180));
  assert.throws(()=>coinbaseCandleRange(60,NaN));
});
