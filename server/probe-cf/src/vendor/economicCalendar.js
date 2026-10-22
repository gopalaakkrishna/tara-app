// Official schedules only. No guessed first-Friday or mid-month release dates.
export const CALENDAR_MAX_AGE_MS = 6 * 3600000;
export const CALENDAR_SOURCES = Object.freeze([
  {id:'bls', name:'BLS', url:'https://www.bls.gov/schedule/news_release/bls.ics', page:'https://www.bls.gov/schedule/'},
  {id:'bea', name:'BEA', url:'https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics', page:'https://www.bea.gov/news/schedule'},
  {id:'fed', name:'Federal Reserve', url:'https://www.federalreserve.gov/json/calendar.json', page:'https://www.federalreserve.gov/newsevents/calendar.htm'},
]);

const easternParts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
export function zonedTime(date, time, zone='America/New_York') {
  const [y,m,d]=date.split('-').map(Number), [h,min,s=0]=time.split(':').map(Number);
  if (![y,m,d,h,min,s].every(Number.isFinite)||m<1||m>12||d<1||d>31||h>23||min>59||s>59) return null;
  const wall=Date.UTC(y,m-1,d,h,min,s);
  if(new Date(wall).toISOString().slice(0,10)!==date)return null;
  if(zone==='UTC')return wall;
  if(zone!=='America/New_York')return null;
  const fmt=easternParts;
  let instant=wall;
  for(let i=0;i<3;i++){
    const p=Object.fromEntries(fmt.formatToParts(instant).map(p=>[p.type,p.value]));
    const rendered=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    if(rendered===wall)return instant;
    instant+=wall-rendered;
  }
  return null; // nonexistent DST wall time must not be invented
}

const clean=s=>String(s||'').replace(/\\n/gi,' ').replace(/\\([,;\\])/g,'$1').replace(/&(?:lt|gt|amp|quot|#39);/g,e=>({'&lt;':'<','&gt;':'>','&amp;':'&','&quot;':'"','&#39;':"'"}[e])).replace(/<[^>]*>/g,'').trim().slice(0,240);
export function eventPolicy(title) {
  if(/FOMC Meeting|Rate Decision/i.test(title))return {impact:'EXTREME',preMin:45,postMin:30,risk:35,riskPre:15,riskPost:15};
  if(/FOMC Press Conference/i.test(title))return {impact:'EXTREME',preMin:5,postMin:30,risk:30,riskPre:5,riskPost:30};
  if(/Consumer Price Index|Employment Situation/i.test(title))return {impact:'EXTREME',preMin:30,postMin:15,risk:25,riskPre:15,riskPost:15};
  if(/Producer Price Index/i.test(title))return {impact:'HIGH',preMin:30,postMin:15,risk:15,riskPre:10,riskPost:10};
  if(/Personal Income and Outlays/i.test(title))return {impact:'HIGH',preMin:30,postMin:15,risk:0};
  if(/Gross Domestic Product|^GDP \((Advance|Second|Third) Estimate\)/i.test(title))return {impact:'HIGH',preMin:20,postMin:10,risk:0};
  // Additional events are context, not newly invented trading restrictions.
  return {impact:'CONTEXT',preMin:0,postMin:0,risk:0};
}
const event=(id,title,at,source)=>({id:`${source.id}:${id}`,name:clean(title),at,source:source.id,sourceUrl:source.page,...eventPolicy(title)});

export function parseIcs(text, source, {from=-Infinity,to=Infinity}={}) {
  if(!text.includes('BEGIN:VCALENDAR'))throw new Error('Invalid calendar response');
  const events=new Map();
  for(const block of text.replace(/\r?\n[ \t]/g,'').matchAll(/BEGIN:VEVENT\s*([\s\S]*?)END:VEVENT/g)){
    const fields={};
    for(const line of block[1].split(/\r?\n/)){
      const i=line.indexOf(':');if(i<0)continue;
      fields[line.slice(0,i).split(';')[0]]={key:line.slice(0,i),value:line.slice(i+1)};
    }
    const uid=fields.UID?.value;if(!uid)continue;
    const sequence=Number(fields.SEQUENCE?.value)||0;
    if(events.has(uid)&&events.get(uid).sequence>sequence)continue;
    // Keep cancellations in the dedup map so a later cancelled revision removes it.
    if(fields.STATUS?.value==='CANCELLED'){events.set(uid,{sequence,cancelled:true});continue;}
    const value=fields.DTSTART?.value, match=value?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
    if(!match||!fields.SUMMARY||fields.RRULE)continue; // never fabricate a time for all-day/recurring entries
    const day=Date.UTC(+match[1],+match[2]-1,+match[3]);
    if(day<from-86400000||day>to+86400000)continue;
    let zone=match[7]?'UTC':fields.DTSTART.key.match(/TZID=([^;:]+)/)?.[1];
    if(zone==='US-Eastern')zone='America/New_York';
    if(!['UTC','America/New_York'].includes(zone))continue;
    const at=zonedTime(`${match[1]}-${match[2]}-${match[3]}`,`${match[4]}:${match[5]}:${match[6]}`,zone);
    if(at!==null)events.set(uid,{...event(uid,fields.SUMMARY.value,at,source),sequence});
  }
  return [...events.values()].filter(e=>!e.cancelled);
}

export function parseFed(text,source=CALENDAR_SOURCES[2],{from=-Infinity,to=Infinity}={}) {
  const data=JSON.parse(text);if(!Array.isArray(data.events))throw new Error('Invalid Fed calendar');
  const events=new Map();
  for(const e of data.events){
    if(!/^(FOMC|Speeches|Testimony)$/i.test(e.type||''))continue;
    if(!/^\d{4}-\d{2}$/.test(e.month||'')||!/^\d{1,2}$/.test(String(e.days||'')))continue;
    const day=Date.parse(`${e.month}-${String(e.days).padStart(2,'0')}T00:00:00Z`);
    if(day<from-86400000||day>to+86400000)continue;
    const time=e.time?.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i);if(!time||+time[1]<1||+time[1]>12)continue;
    const hour=+time[1]%12+(time[3].toLowerCase()==='p'?12:0);
    const at=zonedTime(`${e.month}-${String(e.days).padStart(2,'0')}`,`${hour}:${time[2]}`);
    const name=clean(e.title);if(at===null||!name)continue;
    const id=`${at}:${name}`;events.set(id,event(id,name,at,source));
  }
  return [...events.values()];
}

export function freshCalendarEvents(calendar,now=Date.now()) {
  const sources=new Set((calendar?.sources||[]).filter(s=>s.status==='fresh'&&s.fetchedAt>0&&now-s.fetchedAt>=-60000&&now-s.fetchedAt<=CALENDAR_MAX_AGE_MS).map(s=>s.id));
  return (calendar?.events||[]).filter(e=>sources.has(e.source)&&Number.isFinite(e.at));
}
export function calendarStatus(calendar,now=Date.now()) {
  const fresh=(calendar?.sources||[]).filter(s=>s.status==='fresh'&&s.fetchedAt>0&&now-s.fetchedAt>=-60000&&now-s.fetchedAt<=CALENDAR_MAX_AGE_MS).length;
  return fresh===3?'ready':fresh?'partial':'unavailable';
}
export function upcomingEvents(calendar,now=Date.now(),hours=24) {
  return freshCalendarEvents(calendar,now).filter(e=>e.at>=now&&e.at<=now+hours*3600000).sort((a,b)=>a.at-b.at).map(e=>({...e,eventTime:new Date(e.at),minutesUntil:Math.round((e.at-now)/60000),hoursUntil:Math.floor((e.at-now)/3600000),weekday:new Date(e.at).toLocaleDateString('en-US',{weekday:'short',timeZone:'America/New_York'}).toUpperCase()}));
}
export function macroEventState(calendar,now=Date.now()) {
  const candidates=freshCalendarEvents(calendar,now).filter(e=>e.preMin>0).sort((a,b)=>(b.risk||0)-(a.risk||0)||a.at-b.at);
  for(const e of candidates){
    const d=(e.at-now)/60000;
    const state=d>0&&d<=e.preMin?'BLACKOUT':d<=0&&d>=-2?'OBSERVE':d<0&&d>=-e.postMin?'ENHANCED':null;
    if(state)return {state,event:e,minutesUntil:Math.round(d),coverage:calendarStatus(calendar,now)};
  }
  return {state:calendarStatus(calendar,now)==='ready'?'CLEAR':'UNKNOWN',event:null,minutesUntil:null,coverage:calendarStatus(calendar,now)};
}
export function economicCalendarRisk(calendar,now=Date.now()) {
  const hits=freshCalendarEvents(calendar,now).filter(e=>e.risk>0&&(now-e.at)/60000>=-e.riskPre&&(now-e.at)/60000<=e.riskPost).sort((a,b)=>b.risk-a.risk);
  const e=hits[0];
  return e?{risk:e.risk,event:e.name,etTime:new Date(e.at).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})+' ET',minsOffset:Math.round((now-e.at)/60000)}:{risk:0,event:null,etTime:null,minsOffset:null,coverage:calendarStatus(calendar,now)};
}
export const dampenScore=(score,risk)=>Math.sign(score)*Math.max(0,Math.abs(score)-Math.max(0,risk));
