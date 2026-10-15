// Hourly advisory picks have their own market/horizon and evidence. Nothing in
// this module changes the 5m/15m Call lifecycle or places an order.
export const HOURLY_POLICY_VERSION='14.7.6';
export const HOURLY_POLL_MS=20000;
export const HOURLY_QUOTE_MAX_AGE_MS=45000;
export const HOURLY_SPOT_MAX_AGE_MS=15000;
export const HOURLY_MIN_CONFIDENCE=65; // existing early/mid Call confidence standard
const number=v=>v==null||v===''||typeof v==='boolean'?null:(Number.isFinite(Number(v))?Number(v):null);
const wait=(code,reason,details={})=>({ok:false,code,reason,...details});
export const hourlyKey=p=>`${p?.ticker}|${p?.side}`;

export function readHourlyPolicy(storage) {
  const read=(key,fallback,valid,integer=false)=>{try{const raw=storage.getItem(key),v=integer?parseInt(raw,10):parseFloat(raw);return Number.isFinite(v)&&valid(v)?v:fallback;}catch{return fallback;}};
  return {
    confirmTicks:read('taraHourlyConfirmTicks',3,v=>v>=1&&v<=10,true),
    minCost:read('taraHourlyMinCost',45,v=>v>0),maxCost:read('taraHourlyMaxCost',60,v=>v>0),
    maxLocks:read('taraHourlyMaxLocks',3,v=>v>=1&&v<=12,true),
    cooldownMs:read('taraHourlyCooldownMin',3,v=>v>0)*60000,
    maxMinsLeft:read('taraHourlyMaxMinsLeft',40,v=>v>0&&v<=60),
    deadLo:read('taraHourlyDeadLo',0,v=>v>=0&&v<=60),deadHi:read('taraHourlyDeadHi',15,v=>v>=0&&v<=60),
  };
}

export function normalizeHourlyMarkets(markets,event,requestedAt,receivedAt,fees) {
  const parsed=(Array.isArray(markets)?markets:[]).filter(m=>m?.event_ticker===event&&
    m.ticker?.startsWith(event+'-')&&event?.startsWith('KXBTCD-')&&m.status==='active'&&m.strike_type==='greater')
    .map(m=>({ticker:m.ticker,event,closeMs:Date.parse(m.close_time),status:m.status,strikeType:m.strike_type,
      strike:number(m.floor_strike),bid:number(m.yes_bid_dollars),ask:number(m.yes_ask_dollars),vol:number(m.volume_fp)}))
    .filter(m=>m.closeMs>receivedAt&&m.strike>0&&m.vol>100&&m.bid!==null&&m.ask!==null&&
      m.bid>=0&&m.ask<=1&&m.bid<=m.ask&&m.ask>0)
    .map(m=>({...m,bid:m.bid*100,ask:m.ask*100}));
  const closeMs=parsed.length?Math.min(...parsed.map(m=>m.closeMs)):null;
  return {loading:false,err:null,event,closeMs,requestedAt,receivedAt,
    sampleId:`${event}|${requestedAt}`,fees,strikes:parsed.filter(m=>m.closeMs===closeMs).sort((a,b)=>a.strike-b.strike)};
}

export function hourlyFeeCents(cost,fees) {
  const multiplier=number(fees?.multiplier),c=number(cost);
  if(!['quadratic','quadratic_with_maker_fees'].includes(fees?.type)||multiplier===null||multiplier<0||c===null||c<=0||c>=100)return null;
  const p=c/100;return Math.ceil(0.07*multiplier*p*(1-p)*100); // one-contract taker estimate
}

export function hourlyRecordGuard(record,pick,policy,now) {
  const all=[...(record?.pending||[]),...(record?.history||[])];
  if(all.some(x=>hourlyKey(x)===hourlyKey(pick)))return wait('duplicate','This hourly contract and side are already recorded.');
  const same=all.filter(x=>x.closeMs===pick.closeMs);
  if(same.some(x=>x.side!==pick.side&&
    (pick.side==='YES'?pick.strike:Number(x.strike))>=(pick.side==='NO'?pick.strike:Number(x.strike))))
    return wait('contradiction','This pick conflicts with an existing hourly lock.');
  if(same.length>=policy.maxLocks)return wait('lock-cap',`Hourly limit reached (${policy.maxLocks} locks).`);
  const last=[...same].sort((a,b)=>(number(b.ms)||0)-(number(a.ms)||0))[0];
  if(last&&(!(number(last.ms)>0)||now-last.ms<=policy.cooldownMs))
    return wait('cooldown','Waiting for the hourly cooldown after the previous lock.');
  return {ok:true,last};
}

export function assessHourlyPick(input,policy,probability,fee=hourlyFeeCents) {
  const {lad,spot,spotAt,signal,readiness,now,record,enabled=true}=input;
  if(!enabled)return wait('disabled','Hourly picks are off.');
  if(!readiness?.ready)return wait('readiness',readiness?.reason||'Waiting for ready market data.');
  if(number(spot)===null||spot<=0||number(spotAt)===null||spotAt>now+2000||now-spotAt>HOURLY_SPOT_MAX_AGE_MS)
    return wait('spot-stale','Waiting for a fresh spot observation.');
  if(lad?.err)return wait('quote-error',`Waiting for hourly quotes: ${lad.err}`);
  if(!lad?.sampleId||number(lad.requestedAt)===null||number(lad.receivedAt)===null||
    lad.requestedAt>lad.receivedAt||lad.receivedAt>now+2000||now-lad.requestedAt>HOURLY_QUOTE_MAX_AGE_MS)
    return wait('quote-stale','Waiting for a fresh hourly market poll.');
  if(!(number(lad.closeMs)>0)||!lad.event?.startsWith('KXBTCD-')||!lad.strikes?.length)
    return wait('market-unavailable','Waiting for an active hourly market with a valid close time and quotes.');
  const currentHourClose=(Math.floor(now/3600000)+1)*3600000;
  if(lad.closeMs>currentHourClose+1000)
    return wait('market-unavailable','No current-hour BTC market is available. Waiting for an active contract for this hour.',
      {nextMarketCloseMs:lad.closeMs,nextEvent:lad.event});
  const minutes=(lad.closeMs-now)/60000;
  if(!Number.isFinite(minutes)||minutes<=1.5||minutes>policy.maxMinsLeft||
    (policy.deadHi>policy.deadLo&&minutes>=policy.deadLo&&minutes<policy.deadHi))
    return wait('timing',`Outside the hourly entry window (${Number.isFinite(minutes)?minutes.toFixed(1):'?'}m remaining).`);
  const dir=signal?.call,conf=number(signal?.confidence);
  if(!['UP','DOWN'].includes(dir)||signal?.isNoGo||signal?.startupBlocked||signal?.wasOverriddenNoTrade||signal?.isUserForced)
    return wait('signal',signal?.reason||'Waiting for a qualifying directional signal.');
  if(conf===null||conf<HOURLY_MIN_CONFIDENCE||conf>100)
    return wait('confidence',`Hourly confidence ${conf===null?'unavailable':conf.toFixed(1)}; needs ${HOURLY_MIN_CONFIDENCE}.`,{confidence:conf,requiredConfidence:HOURLY_MIN_CONFIDENCE});
  const side=dir==='UP'?'YES':'NO',eligible=[],rejections=[];
  for(const row of lad.strikes||[]) {
    if(row.event!==lad.event||row.closeMs!==lad.closeMs||row.status!=='active'||row.strikeType!=='greater'||
      !row.ticker?.startsWith(lad.event+'-')||!lad.event?.startsWith('KXBTCD-')||!(row.strike>0)||
      number(row.bid)===null||number(row.ask)===null||row.bid<0||row.ask>=98||row.ask<=2||row.bid>row.ask||!(row.vol>100))continue;
    const cost=side==='YES'?row.ask:100-row.bid;
    if(cost<policy.minCost||cost>policy.maxCost)continue;
    const p=number(probability(spot,row.strike,minutes)),probabilityYes=p===null?null:p*100;
    const probabilitySide=p===null?null:(side==='YES'?p:1-p)*100,feeCents=fee(cost,lad.fees);
    if(p===null||p<0||p>1){rejections.push(wait('model','Hourly probability is unavailable.'));continue;}
    if(feeCents===null){rejections.push(wait('fees','Hourly fee schedule is unavailable.'));continue;}
    const netEdgeCents=probabilitySide-cost-feeCents;
    if(probabilitySide<=50||netEdgeCents<=0){rejections.push(wait('model-edge',
      `Hourly model ${probabilitySide.toFixed(1)}% for ${side}; ${cost.toFixed(1)}¢ price + ${feeCents}¢ estimated fee leaves ${netEdgeCents.toFixed(1)}¢ edge.`,
      {probabilitySide,cost,feeCents,netEdgeCents}));continue;}
    const pick={ticker:row.ticker,event:lad.event,strike:row.strike,closeMs:lad.closeMs,dir,side,cost,conf,
      model:probabilityYes,mktPct:cost,probabilitySide,feeCents,netEdgeCents,bid:row.bid,ask:row.ask,minsAtLock:minutes};
    const guard=hourlyRecordGuard(record,pick,policy,now);
    if(!guard.ok){rejections.push(guard);continue;}
    eligible.push({...pick,needTicks:policy.confirmTicks*(guard.last&&guard.last.side!==side?2:1)});
  }
  eligible.sort((a,b)=>b.netEdgeCents-a.netEdgeCents||b.probabilitySide-a.probabilitySide||a.ticker.localeCompare(b.ticker));
  if(!eligible.length)return rejections[0]||wait('price-band',`No valid hourly quote inside ${policy.minCost}–${policy.maxCost}¢ for ${side}.`);
  return {ok:true,code:'qualifying',reason:'Hourly signal and model edge qualify.',pick:eligible[0]};
}

export function advanceHourlyConfirmation(previous,assessment,input) {
  const {lad,spotAt,spot,now,source='unknown',asset='BTC'}=input;
  const old=previous||{samples:[]};
  const reset=()=>({samples:[],key:null,lastPoll:lad?.sampleId||old.lastPoll,lastSpotAt:spotAt});
  if(!assessment.ok)return {state:reset(),...assessment};
  const pick=assessment.pick,key=`${asset}|${source}|${pick.closeMs}|${hourlyKey(pick)}`;
  let samples=old.key===key?[...(old.samples||[])]:[];
  if(samples.length&&(now-samples.at(-1).quoteAt>HOURLY_QUOTE_MAX_AGE_MS||lad.requestedAt<samples.at(-1).requestAt))samples=[];
  // Repeated renders, a re-used quote or a stalled spot feed cannot add evidence.
  const fresh=lad.sampleId!==old.lastPoll&&spotAt>(old.lastSpotAt||0)&&
    (!samples.length||lad.requestedAt>samples.at(-1).requestAt);
  if(fresh)samples.push({quoteId:lad.sampleId,requestAt:lad.requestedAt,quoteAt:lad.receivedAt,spotAt,spot,
    confidence:pick.conf,probabilityYes:pick.model,cost:pick.cost,feeCents:pick.feeCents,netEdgeCents:pick.netEdgeCents});
  samples=samples.slice(-Math.max(pick.needTicks,20));
  const state={key,samples,lastPoll:fresh?lad.sampleId:old.lastPoll,lastSpotAt:fresh?spotAt:old.lastSpotAt};
  const spanMs=samples.length?samples.at(-1).requestAt-samples[0].requestAt:0;
  const minimumSpanMs=(pick.needTicks-1)*HOURLY_POLL_MS;
  // Approval is only emitted on a fresh observation. A clock tick cannot turn
  // the same snapshots into an approved pick after waiting out a timer.
  const ready=fresh&&samples.length>=pick.needTicks&&spanMs>=minimumSpanMs;
  return {state,ok:ready,code:ready?'approved':'confirming',pick,
    reason:ready?'Hourly pick confirmed with fresh samples.':
      `Confirming ${pick.side} @ ${pick.strike.toLocaleString('en-US')}: ${Math.min(samples.length,pick.needTicks)}/${pick.needTicks} fresh samples · ${Math.floor(spanMs/1000)}/${minimumSpanMs/1000}s.`,
    evidence:ready?{policyVersion:HOURLY_POLICY_VERSION,confidence:pick.conf,requiredConfidence:HOURLY_MIN_CONFIDENCE,
      probabilityYes:pick.model,probabilitySide:pick.probabilitySide,cost:pick.cost,feeCents:pick.feeCents,
      netEdgeCents:pick.netEdgeCents,quote:{event:lad.event,ticker:pick.ticker,closeMs:pick.closeMs,
        bid:pick.bid,ask:pick.ask,requestedAt:lad.requestedAt,receivedAt:lad.receivedAt},
      requiredSamples:pick.needTicks,minimumSpanMs,spanMs,samples}:null};
}

export function inspectHourlySettlement(pick,market,now=Date.now()) {
  const close=Date.parse(market?.close_time),strike=number(market?.floor_strike);
  if(!pick?.ticker?.startsWith('KXBTCD-')||market?.ticker!==pick.ticker||
    !Number.isFinite(close)||!(pick.closeMs>0)||Math.abs(close-pick.closeMs)>1000||
    strike===null||!(pick.strike>0)||Math.abs(strike-pick.strike)>0.02||
    (market.strike_type&&market.strike_type!=='greater')||
    (pick.approval?.quote?.event&&market.event_ticker!==pick.approval.quote.event))
    return wait('settlement-identity','Waiting for the exact captured hourly contract settlement.');
  if(!['YES','NO'].includes(pick.side)||!['yes','no'].includes(market.result)||
    !['settled','finalized'].includes(market.status)||now<close)
    return wait('settlement-pending','The captured hourly market has not officially settled.');
  return {ok:true,won:pick.side==='YES'?market.result==='yes':market.result==='no',
    officialSettlement:{source:'kalshi-public-api',ticker:market.ticker,closeTime:market.close_time,
      strike,outcome:market.result,verifiedAt:now}};
}

export function hourlyProposal(decision,input,version) {
  if(!decision.ok||!decision.evidence)return null;
  return {...decision.pick,ms:input.now,at:new Date(input.now).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
    band:null,approval:{...decision.evidence,modelVersion:version,source:input.source,asset:input.asset,at:input.now}};
}

export function revalidateHourlyProposal(proposal,input,policy,probability) {
  const current=assessHourlyPick(input,policy,probability);
  if(!current.ok)return current;
  if(hourlyKey(current.pick)!==hourlyKey(proposal)||current.pick.closeMs!==proposal.closeMs)
    return wait('candidate-changed','Hourly candidate changed while the record was being checked. Confirming again.');
  const samples=proposal.approval?.samples||[],required=current.pick.needTicks;
  if(samples.length<required||samples.at(-1).requestAt-samples[0].requestAt<(required-1)*HOURLY_POLL_MS)
    return wait('confirmation-changed','Hourly confirmation requirements changed; collecting fresh samples.');
  if(!proposal.approval?.samples?.length||input.now-proposal.approval.quote.requestedAt>HOURLY_QUOTE_MAX_AGE_MS||
    proposal.cost!==current.pick.cost||proposal.approval.source!==input.source||proposal.approval.asset!==input.asset)
    return wait('observation-changed','Hourly evidence changed while the record was being checked. Confirming again.');
  return {ok:true};
}
