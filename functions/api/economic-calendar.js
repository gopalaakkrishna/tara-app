import {CALENDAR_SOURCES,parseIcs,parseFed} from '../../src/economicCalendar.js';
import {cachedSource,jsonResponse} from '../../lib/publicData.js';

export async function onRequest(ctx) {
  if(ctx.request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
  const now=Date.now(),results=await Promise.all(CALENDAR_SOURCES.map(s=>cachedSource(ctx,s,s.id==='fed'?parseFed:parseIcs)));
  const events=results.flatMap(s=>s.events).filter(e=>e.at>=now-86400000&&e.at<=now+90*86400000).sort((a,b)=>a.at-b.at);
  const sources=results.map(({events,...source})=>({...source,upcomingCount:events.filter(e=>e.at>=now).length}));
  const fresh=sources.filter(s=>s.status==='fresh').length;
  return jsonResponse({version:1,status:fresh===3?'ready':fresh?'partial':'unavailable',checkedAt:now,sources,events,coverage:'BLS, BEA and published Fed events; not a comprehensive global calendar. Unscheduled news, Treasury/Census/claims releases and licensed benchmark data are not covered.'});
}
