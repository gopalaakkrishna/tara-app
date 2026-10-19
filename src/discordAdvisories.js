// Notification-only context. None of these observations can create/alter a Call,
// position, order, exit, signal threshold, or execution reservation.
import {BTC_DISCORD_CHANNEL} from './discordCalls.js';
import {inspectDecisionQuote} from './callIntegrity.js';

export const ADVISORY_POLICY=Object.freeze({windowMs:900000,cooldownMs:300000,maxPerWindow:2,
  confirmationMs:5000,observationGapMs:15000,ttlMs:30000,minimumSecondsLeft:60});
const n=v=>v==null||v===''||typeof v==='boolean'?null:Number.isFinite(Number(v))?Number(v):null;
const fresh=(at,now,max=15000)=>n(at)>0&&at<=now+2000&&now-at<=max;
export function coachCondition(title='') {
  if(/^(Price spiking|Sudden .* move).*against/i.test(title))return 'adverse-velocity';
  if(/^Drawing down from/i.test(title))return 'strike-lead-giveback';
  if(/^Extreme risk.*contrary/i.test(title))return 'adverse-risk';
  if(/^Tara flipped to/i.test(title))return 'live-model-opposed';
  if(/^Trailing exit/i.test(title))return 'trailing-giveback';
  return null; // no static caution, generic filler, historical claim or single-print directive
}
const titles={
  'adverse-velocity':'Price moving against the saved Call',
  'strike-lead-giveback':'Favorable distance to strike is narrowing',
  'adverse-risk':'Live movement risk opposes the saved Call',
  'live-model-opposed':'Live model now opposes the saved Call',
  'trailing-giveback':'Dashboard trailing-giveback warning',
};

export function advisoryCandidates(input,calls,now=Date.now()) {
  if(input?.asset!=='BTC'||input.ready!==true||!fresh(input.spotAt,now)||!(n(input.spot)>0))return [];
  const start=Math.floor(now/ADVISORY_POLICY.windowMs)*ADVISORY_POLICY.windowMs,end=start+ADVISORY_POLICY.windowMs;
  if(end-now<=ADVISORY_POLICY.minimumSecondsLeft*1000)return [];
  const result=[],active=calls.filter(c=>c.kind==='15m'&&c.closeMs===end&&c.lockedAt<=now&&!c.result);
  const call=active.length===1?active[0]:null,coach=input.coach,condition=coachCondition(coach?.title);
  if(call&&condition&&coach?.callKey===call.key&&coach.position===call.dir&&
    fresh(coach.observedAt,now,10000)&&n(coach.trackingStartedAt)>=Math.max(start,call.lockedAt-2000)&&
    coach.trackingStartedAt<=now&&n(coach.strike)>0&&Math.abs(coach.strike-call.strike)<=.02) {
    const quote=inspectDecisionQuote(input.quote,{windowId:call.key.slice('BTC|15m|'.length),asset:'BTC',now,ticker:call.ticker});
    if(quote.ok) {
      let facts=`Saved ${call.dir} Call · strike $${call.strike.toFixed(2)}. `;
      if(condition==='strike-lead-giveback'&&n(coach.gap)!==null&&n(coach.peak)!==null)
        facts+=`Favorable distance from strike: ${Number(coach.gap).toFixed(1)}bps; observed peak ${Number(coach.peak).toFixed(1)}bps. This is not trade P&L. `;
      const bid=call.dir==='UP'?quote.bid:100-quote.ask;
      facts+=`Observed side's displayed bid ${bid.toFixed(1)}¢; not a fill. Review the dashboard for context.`;
      result.push({family:'coach',condition,key:`${start}|coach|${condition}|${call.key}`,start,end,
        callKey:call.key,observations:[input.spotAt],observedAt:now,title:titles[condition],facts,
        expiresAt:Math.min(now+ADVISORY_POLICY.ttlMs,end-60000)});
    }
  }
  const flow=input.flow||{},ticks=(input.ticks||[]).filter(t=>['bn','by'].includes(t?.src)&&
    fresh(t.time,now,90000)&&n(t.usd)>0&&['B','S'].includes(t.t));
  const venue=src=>{const rows=ticks.filter(t=>t.src===src);return {net:rows.reduce((sum,t)=>sum+(t.t==='B'?Number(t.usd):-Number(t.usd)),0),
    at:rows.length?Math.max(...rows.map(t=>t.time)):0};};
  const bn=venue('bn'),by=venue('by'),net=bn.net+by.net,sign=Math.sign(net);
  const spot=(input.spotTicks||[]).filter(t=>fresh(t?.time,now,30000)&&n(t.p??t.price)>0).sort((a,b)=>a.time-b.time);
  const first=spot[0],last=spot.at(-1),move=first&&last?(Number(last.p??last.price)/Number(first.p??first.price)-1)*10000:0;
  // Two independent futures venues, plus actual fresh spot PRICE movement.
  // The legacy tape has no populated Coinbase-volume stream: never invent one.
  if(n(flow.score)>=75&&n(flow.streakCount)>=4&&flow.divergence!==true&&
    Math.abs(net)>=1500000&&Math.abs(bn.net)>=100000&&Math.abs(by.net)>=100000&&
    Math.sign(bn.net)===sign&&Math.sign(by.net)===sign&&fresh(bn.at,now,10000)&&fresh(by.at,now,10000)&&
    first&&last&&last.time-first.time>=5000&&fresh(last.time,now)&&Math.abs(move)>=1&&Math.sign(move)===sign) {
    const side=sign>0?'BUY':'SELL';
    result.push({family:'whale',condition:side,key:`${start}|whale|${side}`,start,end,callKey:call?.key||null,
      observations:[last.time,bn.at,by.at],observedAt:now,title:`Cross-venue BTC ${side.toLowerCase()} flow`,
      facts:`Observed 90s futures net: ${net>0?'+':'−'}$${(Math.abs(net)/1000000).toFixed(2)}M across Binance and Bybit. `+
        `Spot price moved ${move>0?'+':''}${move.toFixed(1)}bps over the observed ${Math.round((last.time-first.time)/1000)}s span. `+
        'Spot price agreement is not spot-volume confirmation. Flow can be hedging; it does not predict settlement.',
      expiresAt:Math.min(now+ADVISORY_POLICY.ttlMs,end-60000)});
  }
  return result;
}

export function observeAdvisories(previous,candidates,now=Date.now()) {
  const state={},ready=[];
  for(const c of candidates) {
    const old=previous?.[c.key],same=old&&now-old.lastAt<=ADVISORY_POLICY.observationGapMs;
    const prior=same?old:null;
    const independent=prior&&c.observations.length===prior.observations.length&&c.observations.every((at,i)=>at>prior.observations[i]);
    const next={firstAt:prior?.firstAt??now,firstObservations:prior?.firstObservations||c.observations,
      lastAt:now,observations:independent||!prior?c.observations:prior.observations};
    state[c.key]=next;
    if(independent&&now-next.firstAt>=ADVISORY_POLICY.confirmationMs&&
      c.observations.every((at,i)=>at-next.firstObservations[i]>=ADVISORY_POLICY.confirmationMs))ready.push(c);
  }
  return {state,ready};
}

export function advisoryPayload(c,{username='Tara',avatar='',version='Tara'}={}) {
  return {username, ...(avatar?{avatar_url:avatar}:{}),allowed_mentions:{parse:[]},embeds:[{
    title:`BTC ${c.family==='coach'?'COACH':'FLOW'} CONTEXT · ${c.title}`,color:11965751,
    description:`${c.facts}\n\nContext only · not a new Call, verified position or entry/exit instruction. Real trading remains paused.`,
    fields:c.callKey?[{name:'Related saved Call',value:c.callLink?`[Original Call](${c.callLink})`:c.callKey,inline:false}]:[],
    timestamp:new Date(c.observedAt).toISOString(),footer:{text:`${version} · limited BTC context · ${c.key}`},
  }]};
}

export function reconcileAdvisories(box,candidates,calls,destination,identity,now=Date.now()) {
  box.advisories ||= [];
  for(const row of box.advisories) {
    if(row.state==='posting'){row.state='uncertain';row.error='Context receipt unknown; no automatic duplicate.';}
    if(row.state!=='delivered'&&row.state!=='uncertain'&&row.expiresAt<=now)row.state='expired';
  }
  const recent=box.advisories.filter(r=>r.start===Math.floor(now/900000)*900000);
  for(const candidate of candidates) {
    if(!destination||candidate.expiresAt<=now||box.advisories.some(r=>r.key===candidate.key)||recent.length>=ADVISORY_POLICY.maxPerWindow||
      (box.advisoryLastAt!=null&&now-box.advisoryLastAt<ADVISORY_POLICY.cooldownMs))continue;
    // Call-related notes cannot precede the actual acknowledged Call, nor follow
    // its removal/conflict. Standalone flow is explicitly context, never a Call.
    if(candidate.callKey&&(!calls.some(c=>c.key===candidate.callKey&&!c.result&&c.closeMs>now)||
      !box.rows.some(r=>r.key===candidate.callKey&&r.messageId&&r.state==='delivered')))continue;
    const receipt=candidate.callKey?box.rows.find(r=>r.key===candidate.callKey&&r.messageId):null;
    const projected={...candidate,...(receipt?{callLink:`https://discord.com/channels/1492984305951965286/${receipt.channelId}/${receipt.messageId}`}:{})};
    const row={...projected,payload:advisoryPayload(projected,identity),webhookId:destination.id,
      channelId:BTC_DISCORD_CHANNEL,state:'queued',attempts:0,nextAt:0,messageId:null};
    box.advisories.push(row);recent.push(row);box.advisoryLastAt=now;
  }
  // Context-only payloads must not grow without bound and crowd out Call
  // durability. Keep two days, compact old ambiguous receipts to a count.
  const old=box.advisories.filter(r=>now-r.start>=2*86400000);
  box.archivedAdvisoryUncertain=(box.archivedAdvisoryUncertain||0)+old.filter(r=>['posting','uncertain'].includes(r.state)).length;
  box.advisories=box.advisories.filter(r=>now-r.start<2*86400000);
  return box;
}

export async function drainAdvisories(box,{storage,save,destination,transport,now=Date.now(),clock}={}) {
  const at=()=>clock?clock():now;
  if(box.nextAt>at()||!destination||box.rows.some(r=>!r.messageId&&r.call.closeMs>at()&&
    ['queued','retry','posting'].includes(r.state)))return box; // Calls always take priority
  for(const row of box.advisories||[]) {
    if(!['queued','retry'].includes(row.state)||row.nextAt>at()||row.webhookId!==destination.id)continue;
    if(row.expiresAt<=at()){row.state='expired';continue;}
    if(row.callKey&&!box.rows.some(r=>r.key===row.callKey&&r.state==='delivered'&&r.messageId&&r.call.closeMs>at())){row.state='expired';continue;}
    if(row.attempts>=5){row.state='failed';continue;}
    row.state='posting';row.attempts++;box.advisoryLastAt=at();save(storage,box);
    let response;try{response=await transport({destination,method:'POST',payload:row.payload});}catch{response={kind:'unknown'};}
    if(response.kind==='ok'&&/^\d+$/.test(String(response.messageId||''))&&response.channelId===row.channelId&&response.webhookId===row.webhookId){
      row.state='delivered';row.messageId=response.messageId;row.ackAt=at();
    }else if(response.kind==='rate-limit'){
      const delay=Number(response.retryAfterMs);row.nextAt=at()+Math.max(1000,Number.isFinite(delay)&&delay>0?delay:5000);
      box.nextAt=row.nextAt;row.state=row.attempts>=5?'failed':'retry';
    }else if(response.kind==='rejected')row.state='failed';
    else {row.state='uncertain';row.error='Context receipt unknown; no automatic duplicate.';}
    box.advisoryLastAt=at();save(storage,box);break; // cooldown also covers network/receipt delay
  }
  save(storage,box);return box;
}
