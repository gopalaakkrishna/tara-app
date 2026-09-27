import React,{useEffect,useState} from 'react';
import {calendarStatus,upcomingEvents,CALENDAR_MAX_AGE_MS} from './economicCalendar.js';
import {freshFeedStatus} from './marketDataQuality.js';
import './marketIntelligence.css';

const age=(at,now)=>!at?'not received':now-at<60000?`${Math.max(0,Math.floor((now-at)/1000))}s ago`:`${Math.floor((now-at)/60000)}m ago`;
const label=s=>({fresh:'Fresh',live:'Fresh',partial:'Partial',stale:'Stale',unavailable:'Unavailable',loading:'Loading',ready:'Connected'}[s]||'Connecting');
export default function MarketIntelligencePanel({calendar,derivatives,reference,quote,spotSource}) {
  const [now,setNow]=useState(Date.now());
  const [allEvents,setAllEvents]=useState(false);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const state=calendarStatus(calendar,now),events=upcomingEvents(calendar,now,24*90);
  const derivativeAge=freshFeedStatus(derivatives?.lastUpdate,30000,now);
  const core=[
    {name:`${spotSource?.exchange||'Selected'} spot`,status:freshFeedStatus(spotSource?.time,15000,now),at:spotSource?.time,detail:'Selected price feed · receipt time'},
    {name:'Kalshi market',status:quote?.ticker&&Date.parse(quote.closeTime)>now?freshFeedStatus(quote.at,30000,now):'unavailable',at:quote?.at,detail:'Public quote / strike · not account fills'},
    {name:'OKX derivatives',status:derivativeAge==='fresh'?derivatives.status:derivativeAge,at:derivatives?.lastUpdate,detail:'Funding · open interest · basis · resting order book'},
  ];
  const feeds=[...core,...(reference?.sourceHealth||[]).map(s=>({name:`${s.name} comparison`,status:s.status==='fresh'?freshFeedStatus(s.receivedAt,15000,now):s.status,at:s.receivedAt,detail:s.timestampBasis==='receipt-only'?'Receipt only; exchange quote time not supplied':s.timestampBasis==='exchange'?`Exchange timestamp ${age(s.sourceAt,now)}`:'No current response'}))];
  return <section className="tara-intelligence" aria-label="Market intelligence and data sources">
    <div className="tara-intelligence__head"><div><span>PUBLIC DATA / OFFICIAL SCHEDULES</span><h3>Market intelligence</h3></div><span className={`tara-data-status ${state==='ready'?'is-fresh':'is-warn'}`}>{label(state)} calendar</span></div>
    <p className="tara-intelligence__intro">Direct exchange data, with source checks. Scheduled events are context—not a prediction of direction.</p>
    <div className="tara-intelligence__events">
      <div className="tara-intelligence__subhead"><b>Next scheduled events</b><small>Eastern time · 90-day horizon</small></div>
      {events.slice(0,allEvents?events.length:4).map(e=><a key={e.id} href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="tara-intelligence__event"><time dateTime={new Date(e.at).toISOString()}>{new Date(e.at).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time><span>{e.name}<small>{e.source.toUpperCase()} · {e.impact==='CONTEXT'?'Scheduled context':e.impact.toLowerCase()+' impact'}</small></span><span aria-hidden="true">↗</span></a>)}
      {!events.length&&<p>{state==='ready'?'No upcoming events found in the connected schedules.':'The schedule is unavailable or still loading. This does not mean the market is clear of event risk.'}</p>}
      {events.length>4&&<button type="button" onClick={()=>setAllEvents(!allEvents)} aria-expanded={allEvents}>{allEvents?'Show fewer events':`Show more scheduled events (${events.length})`}</button>}
    </div>
    <details className="tara-intelligence__details"><summary>Data health & research tools <span>{core.filter(s=>['fresh','live'].includes(s.status)).length}/3 core reads fresh</span></summary>
      <div className="tara-intelligence__sources">{feeds.map(f=><div key={f.name}><span><b>{f.name}</b><small>{f.detail}</small></span><span className={['fresh','live'].includes(f.status)?'is-fresh':'is-warn'}>{label(f.status)}<small>{age(f.at,now)}</small></span></div>)}</div>
      {!!derivatives?.sourceHealth&&<p>OKX fields: {Object.entries(derivatives.sourceHealth).map(([k,v])=>`${k}: ${derivativeAge==='fresh'?v.status:derivativeAge}`).join(' · ')}</p>}
      <div className="tara-intelligence__sources">{(calendar?.sources||[]).map(s=><div key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.name} calendar ↗</a><span className={s.status==='fresh'&&freshFeedStatus(s.fetchedAt,CALENDAR_MAX_AGE_MS,now)==='fresh'?'is-fresh':'is-warn'}>{label(s.status==='fresh'?freshFeedStatus(s.fetchedAt,CALENDAR_MAX_AGE_MS,now):s.status)}<small>{age(s.fetchedAt,now)}{s.error?` · ${s.error}`:''}</small></span></div>)}</div>
      <p><b>Benchmark boundary:</b> the cross-exchange reference is Tara’s estimate, not licensed CF BRTI. Actual BRTI is not connected. Kalshi’s published settlement remains the outcome authority. Top-trader positioning is unavailable; resting orders are not confirmed liquidations.</p>
      <p><b>Coverage:</b> BLS, BEA and published Fed events. Not all economic releases or unscheduled news. Partial or stale schedules are never an “all clear.” Free sources have no guaranteed delivery or uptime.</p>
      <nav aria-label="Free research tools"><a href="https://www.koyfin.com/pricing/" target="_blank" rel="noopener noreferrer">Koyfin Free ↗</a><a href="https://fred.stlouisfed.org/" target="_blank" rel="noopener noreferrer">FRED macro research ↗</a><a href="https://docs.openbb.co/odp/python" target="_blank" rel="noopener noreferrer">OpenBB (optional) ↗</a><a href="https://www.cfbenchmarks.com/data/indices/BRTI" target="_blank" rel="noopener noreferrer">BRTI methodology ↗</a></nav>
      <p>Research links open separately. No subscriptions, licensed data or OpenBB server are included. The TradingView chart and existing trading controls are unchanged.</p>
    </details>
  </section>;
}
