// Notification projection only. Never creates a Call, order or settlement.
import {hasDecisionAmendment,windowCloseMs,settlementPatch} from './callIntegrity.js';
import {inspectHourlySettlement} from './hourlyDecision.js';

export const BTC_DISCORD_CHANNEL = '1493809239788097728';
const num = v => v == null || v === '' || typeof v === 'boolean' ? null : Number.isFinite(Number(v)) ? Number(v) : null;
const direction = v => ['UP','DOWN'].includes(v);
const money = n => Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const day = at => new Date(at).toLocaleDateString('en-CA',{timeZone:'America/New_York'});

export function projectBtcCall(row,kind='15m',now=Date.now()) {
  if(!row || row.manualEdit || row.manualEditedAt || row.wasOverriddenNoTrade || row.isUserForced || row.recordIntegrity?.status==='review-required')return null;
  if(kind==='15m') {
    const o=row.originalDecision,closeMs=windowCloseMs(o?.windowId),lockedAt=num(o?.lockedAt);
    if(!o || o.provenance!=='captured-at-lock' || o.asset!=='BTC' || o.windowType!=='15m' ||
      o.commitPolicy?.action!=='allow' || !direction(o.direction) || hasDecisionAmendment(row) ||
      (row.asset||'BTC')!=='BTC' || row.windowType!=='15m' || row.windowId!==o.windowId ||
      (row.dir??row.call)!==o.direction || !o.marketTicker?.startsWith('KXBTC15M-') || !(o.strike>0) ||
      !Number.isFinite(closeMs) || Math.abs(Date.parse(o.marketCloseTime)-closeMs)>1000 ||
      !Number.isFinite(Date.parse(o.marketCloseTime)) || !(lockedAt>0) || lockedAt>=closeMs || lockedAt>now+2000)return null;
    const cost=o.direction==='UP'?num(o.yesAsk):num(o.yesBid)===null?null:100-Number(o.yesBid);
    const s=row.officialSettlement;
    let result=null,settledAt=null;
    if(s?.source==='kalshi-public-api' && s.ticker===o.marketTicker && num(s.strike)!==null &&
      Math.abs(s.strike-o.strike)<=.02 && num(s.verifiedAt)>=closeMs && num(s.verifiedAt)<=now) {
      const verified=settlementPatch(row,{ticker:s.ticker,close_time:s.closeTime,floor_strike:s.strike,
        status:'settled',result:s.outcomeDir==='UP'?'yes':s.outcomeDir==='DOWN'?'no':null},now);
      if(verified.ok && verified.patch.result===row.result){result=row.result;settledAt=s.verifiedAt;}
    }
    return {key:`BTC|15m|${o.windowId}`,kind,dir:o.direction,ticker:o.marketTicker,strike:Number(o.strike),
      closeMs,lockedAt,cost:cost>0&&cost<100?cost:null,score:num(o.signalScore),version:o.modelVersion,
      result,settledAt};
  }
  const a=row.approval,q=a?.quote,lockedAt=num(row.ms),closeMs=num(row.closeMs);
  if(kind!=='1h' || a?.asset!=='BTC' || !a.recordedAt || !a.samples?.length ||
    !['YES','NO'].includes(row.side) || !row.ticker?.startsWith('KXBTCD-') || q?.ticker!==row.ticker ||
    q.closeMs!==closeMs || !(row.strike>0) || !(lockedAt>0) || !(closeMs>lockedAt) || lockedAt>now+2000 ||
    !(num(row.cost)>0&&num(row.cost)<100))return null;
  let result=null,settledAt=null;
  const s=row.officialSettlement;
  if(s?.source==='kalshi-public-api' && num(s.verifiedAt)>=closeMs && num(s.verifiedAt)<=now) {
    const verified=inspectHourlySettlement(row,{ticker:s.ticker,close_time:s.closeTime,floor_strike:s.strike,
      event_ticker:q.event,strike_type:'greater',status:'settled',result:s.outcome},now);
    if(verified.ok && verified.won===row.won){result=verified.won?'WIN':'LOSS';settledAt=s.verifiedAt;}
  }
  return {key:`BTC|1h|${row.ticker}|${row.side}|${closeMs}`,kind,dir:row.side==='YES'?'UP':'DOWN',
    ticker:row.ticker,strike:Number(row.strike),closeMs,lockedAt,cost:Number(row.cost),score:num(row.conf),
    version:a.modelVersion,result,settledAt};
}

// Conflicting duplicate identities are quarantined, never picked by array order.
export function collectBtcCalls(entries,hourly,now=Date.now()) {
  const byKey=new Map(),conflicts=new Set();
  for(const [rows,kind] of [[entries,'15m'],[[...(hourly?.pending||[]),...(hourly?.history||[])],'1h']]) {
    for(const row of rows||[]) {
      const call=projectBtcCall(row,kind,now);if(!call)continue;
      const old=byKey.get(call.key);
      if(old && (callIdentity(old)!==callIdentity(call) || (old.result&&call.result&&old.result!==call.result)))conflicts.add(call.key);
      else if(!old || call.result || !old.result)byKey.set(call.key,old?.result&&!call.result?old:call);
    }
  }
  return {calls:[...byKey.values()].filter(c=>!conflicts.has(c.key)).sort((a,b)=>a.lockedAt-b.lockedAt),conflicts:[...conflicts]};
}

export const callIdentity = c => JSON.stringify([c.kind,c.dir,c.ticker,c.strike,c.closeMs,c.lockedAt,c.cost,c.score,c.version]);
const rate = rows => {const wins=rows.filter(c=>c.result==='WIN').length;return {wins,losses:rows.length-wins,n:rows.length,pct:rows.length?Math.round(wins/rows.length*1000)/10:null};};
export function btcCallRecord(calls,kind,now=Date.now()) {
  const settled=calls.filter(c=>c.kind===kind&&['WIN','LOSS'].includes(c.result)).sort((a,b)=>a.closeMs-b.closeMs);
  return {retained:rate(settled),today:rate(settled.filter(c=>day(c.closeMs)===day(now))),
    last20:rate(settled.slice(-20)),sevenDays:rate(settled.filter(c=>c.closeMs>=now-7*86400000)),
    pending:calls.filter(c=>c.kind===kind&&!c.result).length,
    asOf:settled.length?Math.max(...settled.map(c=>c.settledAt)):null};
}
export const recordRateText = r => r.n?`${r.wins}W–${r.losses}L · ${r.pct}% (${r.n} settled)`:'No verified settlements';

export function discordCallPayload(call,record,{username='Tara',avatar='',delayed=false,now=Date.now()}={}) {
  const status=call.result||(call.closeMs<=now?'OFFICIAL RESULT PENDING':'CONFIRMED');
  const fields=[
    {name:'Original quote · not a fill',value:call.cost===null?'Unavailable':`${call.cost.toFixed(1)}¢ · fees extra`,inline:true},
    {name:'Strike',value:`$${money(call.strike)}`,inline:true},
    {name:'Closes',value:`<t:${Math.floor(call.closeMs/1000)}:t> · <t:${Math.floor(call.closeMs/1000)}:R>`,inline:true},
    {name:'Verified Call record · this timeframe',value:`Retained: ${recordRateText(record.retained)}\nToday (ET): ${recordRateText(record.today)}\nLast 20: ${recordRateText(record.last20)}\nLast 7 days: ${recordRateText(record.sevenDays)}\n${record.pending} pending · excludes sit-outs, edits and unverified results`,inline:false},
    {name:'Contract',value:call.ticker,inline:false},
  ];
  if(call.score!==null)fields.splice(3,0,{name:'Captured signal score',value:`${call.score}/100 · not win probability`,inline:true});
  return {username:username||'Tara',...(avatar?{avatar_url:avatar}:{}),allowed_mentions:{parse:[]},embeds:[{
    title:`${call.dir==='UP'?'▲':'▼'} BTC ${call.kind==='1h'?'HOURLY':'15m'} · ${call.dir} · ${status}`,
    color:call.result==='WIN'?2340993:call.result==='LOSS'?15683661:call.dir==='UP'?2340993:15683661,
    description:`Paper Call · real trading paused · not an executed trade.\nCaptured <t:${Math.floor(call.lockedAt/1000)}:T>${delayed?' · delayed delivery; not a new signal':''}.`+
      (call.result?`\nOfficial exact-contract result: ${call.result}.`:'\nResult and record update here quietly; no separate result blast.'),
    fields,footer:{text:`${call.version||'Tara'} · verified retained Calls, not account P&L · ${call.key}`},
    timestamp:new Date(call.lockedAt).toISOString(),
  }]};
}
