import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CALENDAR_SOURCES,parseIcs,parseFed,zonedTime,macroEventState,economicCalendarRisk,upcomingEvents,dampenScore,calendarStatus,eventPolicy} from '../src/economicCalendar.js';
import {assessSpotResponse,freshOkxResults,freshFeedStatus,observedFundingPair} from '../src/marketDataQuality.js';
import {cachedSource,fetchBounded} from '../lib/publicData.js';
import {onRequest as calendarHandler} from '../functions/api/economic-calendar.js';
import {onRequest as publicHandler} from '../functions/api/kalshi-public/[[path]].js';

const ics=body=>`BEGIN:VCALENDAR\n${body}\nEND:VCALENDAR`;
const entry=(uid,start,name='Consumer Price Index',extra='')=>`BEGIN:VEVENT\nUID:${uid}\nDTSTART${start}\nSUMMARY:${name}\n${extra}\nEND:VEVENT`;
const now=Date.parse('2026-09-11T12:20:00Z');
const fixture=parseIcs(ics(entry('cpi',';TZID=US-Eastern:20260911T083000')),CALENDAR_SOURCES[0]);
const calendar={events:fixture,sources:CALENDAR_SOURCES.map(s=>({...s,status:'fresh',fetchedAt:now-60000}))};

test('official event times handle the actual US daylight-saving transitions',()=>{
  assert.equal(new Date(zonedTime('2026-03-06','08:30')).toISOString(),'2026-03-06T13:30:00.000Z');
  assert.equal(new Date(zonedTime('2026-03-09','08:30')).toISOString(),'2026-03-09T12:30:00.000Z');
  assert.equal(new Date(zonedTime('2026-11-02','08:30')).toISOString(),'2026-11-02T13:30:00.000Z');
  assert.equal(zonedTime('2026-03-08','02:30'),null);
  assert.equal(zonedTime('2026-02-30','08:30'),null);
});
test('ICS supports UTC, folded titles, valid zero sequence, and rescheduled/cancelled revisions',()=>{
  const text=ics([entry('a',';VALUE=DATE-TIME:20260911T123000Z','Personal Income and Outlays\\, Aug\n ust'),entry('a',';VALUE=DATE-TIME:20260912T123000Z','Revised','SEQUENCE:2'),entry('b',';TZID=US-Eastern:20260911T083000'),entry('b',';TZID=US-Eastern:20260911T083000','CPI','SEQUENCE:2\nSTATUS:CANCELLED')].join('\n'));
  const events=parseIcs(text,CALENDAR_SOURCES[1]);assert.equal(events.length,1);assert.equal(events[0].at,Date.parse('2026-09-12T12:30:00Z'));
  assert.equal(parseIcs(ics(entry('c',';VALUE=DATE-TIME:20260911T123000Z','Gross Domestic Pro\n duct\\, test')),CALENDAR_SOURCES[1])[0].name,'Gross Domestic Product, test');
});
test('unrecognized HTML, all-day, unsupported timezone and recurrence are not made-up events',()=>{
  assert.throws(()=>parseIcs('<html>blocked</html>',CALENDAR_SOURCES[0]));
  assert.equal(parseIcs(ics([entry('a',';VALUE=DATE:20260911'),entry('b',';TZID=Unknown:20260911T083000'),entry('c',';TZID=US-Eastern:20260911T083000','CPI','RRULE:FREQ=DAILY')].join('\n')),CALENDAR_SOURCES[0]).length,0);
});
test('Fed dates and explicit times come from published JSON, not weekly guesses',()=>{
  const events=parseFed(JSON.stringify({events:[{title:'FOMC Meeting',type:'FOMC',month:'2026-10',days:'28',time:'2:00 p.m.'},{title:'FOMC Press Conference',type:'FOMC',month:'2026-10',days:'28',time:'2:30 p.m.'},{title:'FOMC Meeting',type:'FOMC',month:'2026-10',days:'27-28',time:''}]}));
  assert.equal(events.length,2);assert.equal(events[0].at,Date.parse('2026-10-28T18:00:00Z'));assert.equal(events[1].risk,30);
});
test('one schedule drives the UI, guard and confidence adjustment with exact minutes',()=>{
  assert.equal(upcomingEvents(calendar,now)[0].minutesUntil,10);
  assert.equal(macroEventState(calendar,now).state,'BLACKOUT');
  assert.equal(economicCalendarRisk(calendar,now).risk,25);
  assert.equal(macroEventState(calendar,now+11*60000).state,'OBSERVE');
  assert.equal(macroEventState(calendar,now+16*60000).state,'ENHANCED');
  assert.equal(macroEventState(calendar,now+60*60000).state,'CLEAR');
  assert.equal(macroEventState({...calendar,events:[]},now).state,'CLEAR');
});
test('missing, stale or future receipt times never give a false calendar all-clear',()=>{
  assert.equal(macroEventState(null,now).state,'UNKNOWN');
  assert.equal(economicCalendarRisk(calendar,now+7*3600000).risk,0);
  assert.equal(macroEventState(calendar,now+7*3600000).state,'UNKNOWN');
  const partial={...calendar,sources:calendar.sources.map(s=>({...s,status:s.id==='bls'?'fresh':'unavailable'}))};
  assert.equal(calendarStatus(partial,now),'partial');assert.equal(macroEventState(partial,now).state,'BLACKOUT');
  assert.equal(macroEventState({...partial,events:[]},now).state,'UNKNOWN');
  assert.equal(calendarStatus({...calendar,sources:calendar.sources.map(s=>({...s,fetchedAt:now+3600000}))},now),'unavailable');
});
test('calendar dampening never reverses a directional score',()=>{
  assert.equal(dampenScore(5,25),0);assert.equal(Math.abs(dampenScore(-5,25)),0);
  assert.equal(dampenScore(-40,25),-15);assert.equal(dampenScore(40,25),15);
});
test('national GDP abbreviations are recognized without treating county GDP as the national release',()=>{
  assert.equal(eventPolicy('GDP (Third Estimate), Industries, Corporate Profits, State GDP').impact,'HIGH');
  assert.equal(eventPolicy('GDP by County and Personal Income by County, 2025').impact,'CONTEXT');
});
test('failed refresh preserves receipt time but marks cached schedules stale',async()=>{
  const saved={fetchedAt:now-7200000,events:fixture};
  const cache={match:async()=>Response.json(saved)};
  const ctx={request:new Request('https://tara.test/api/economic-calendar'),waitUntil(){throw new Error('Must not cache a failure');}};
  const result=await cachedSource(ctx,CALENDAR_SOURCES[0],parseIcs,{now,cache,fetcher:async()=>new Response('limited',{status:429})});
  assert.equal(result.status,'stale');assert.equal(result.fetchedAt,saved.fetchedAt);assert.equal(result.error,'Upstream HTTP 429');
  assert.equal(economicCalendarRisk({events:result.events,sources:[result]},now).risk,0);
});
test('fresh cache is reused, expiry cannot resurrect old schedules and cold outages stay unavailable',async()=>{
  const ctx={request:new Request('https://tara.test/api/economic-calendar')};let calls=0;
  const fetcher=async()=>{calls++;throw new Error('offline');};
  const fresh=await cachedSource(ctx,CALENDAR_SOURCES[0],parseIcs,{now,cache:{match:async()=>Response.json({events:fixture,fetchedAt:now-1000})},fetcher});
  assert.equal(fresh.status,'fresh');assert.equal(calls,0);
  const old=await cachedSource(ctx,CALENDAR_SOURCES[0],parseIcs,{now,cache:{match:async()=>Response.json({events:fixture,fetchedAt:now-90000000})},fetcher});
  assert.equal(old.status,'unavailable');assert.deepEqual(old.events,[]);assert.equal(old.fetchedAt,null);
});
test('bounded upstream reading rejects oversized bodies and non-success responses',async()=>{
  await assert.rejects(fetchBounded('https://source.test',{maxBytes:4,fetcher:async()=>new Response('oversized')}),/too large/);
  await assert.rejects(fetchBounded('https://source.test',{fetcher:async()=>new Response('no',{status:503})}),/503/);
  assert.equal(await fetchBounded('https://source.test',{fetcher:async()=>new Response('okay')}),'okay');
});
test('public data endpoints cannot place orders or become an open proxy',async()=>{
  assert.equal((await calendarHandler({request:new Request('https://tara.test/api/economic-calendar',{method:'POST'})})).status,405);
  for(const path of ['portfolio/orders','https://evil.test','markets/../portfolio','markets//evil.test'])assert.equal((await publicHandler({request:new Request('https://tara.test'),params:{path}})).status,400);
  assert.equal((await publicHandler({request:new Request('https://tara.test',{method:'POST'}),params:{path:'markets'}})).status,405);
});
test('exchange event timestamps and receipt timestamps remain distinct',()=>{
  assert.equal(assessSpotResponse('CB',{time:new Date(now-40000).toISOString()},84000,now).status,'stale');
  assert.equal(assessSpotResponse('CB',{time:new Date(now+20000).toISOString()},84000,now).status,'stale');
  assert.equal(assessSpotResponse('KR',{},84000,now).timestampBasis,'receipt-only');
  assert.equal(assessSpotResponse('CB',{},null,now).status,'unavailable');
  assert.equal(freshFeedStatus(now-60000,15000,now),'stale');
});
test('all OKX failures are unavailable; partial successes cannot preserve stale groups',()=>{
  const fail=Array.from({length:7},()=>({status:'rejected'}));
  assert.equal(freshOkxResults(fail,now).status,'unavailable');assert.equal(freshOkxResults(fail,now).lastUpdate,0);
  fail[0]={status:'fulfilled',value:{code:'0',data:[{markPx:'84000',ts:String(now-1000)}]}};
  const partial=freshOkxResults(fail,now);assert.equal(partial.status,'partial');assert.equal(partial.health.mark.status,'fresh');assert.equal(partial.health.funding.status,'unavailable');
  fail[0].value.data[0].ts=String(now-60000);assert.equal(freshOkxResults(fail,now).status,'unavailable');
});
test('a real zero funding rate is valid, while missing numeric fields are not',()=>{
  const results=Array.from({length:7},()=>({status:'rejected'}));
  results[2]={status:'fulfilled',value:{code:'0',data:[{fundingRate:'0',ts:now}]}};
  assert.equal(freshOkxResults(results,now).health.funding.status,'fresh');
  results[2].value.data[0].fundingRate='';assert.equal(freshOkxResults(results,now).health.funding.status,'unavailable');
});
test('missing current funding cannot create a reversal against known history, but an observed zero can',()=>{
  assert.deepEqual(observedFundingPair({fundingRate:null,fundingRatePrev:0.002}),{funding:0,fundingPrev:0});
  assert.deepEqual(observedFundingPair({fundingRate:0.002,fundingRatePrev:null}),{funding:0.002,fundingPrev:0.002});
  assert.deepEqual(observedFundingPair({fundingRate:0,fundingRatePrev:0.002}),{funding:0,fundingPrev:0.002});
});
test('live call site uses shared schedule; research provenance cannot trigger orders',()=>{
  const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.ok(!app.includes('const MACRO_EVENTS='));assert.ok(!app.includes('const computeEconCalendarRisk='));
  assert.ok(app.includes('econCalRisk:computeEconCalendarRisk()'));
  assert.ok(app.includes('useEconomicCalendar()'));assert.ok(app.includes('referenceIsBenchmark:false'));
  const hook=readFileSync(new URL('../src/useEconomicCalendar.js',import.meta.url),'utf8');
  assert.ok(!/portfolio|placeOrder|kalshiOrder|armAuto/.test(hook));
});
