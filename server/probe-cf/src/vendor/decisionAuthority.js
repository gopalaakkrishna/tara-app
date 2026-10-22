import {finiteNumber as num,isDirection,inspectDecisionQuote,windowCloseMs} from './callIntegrity.js';
import {directionalConfidence} from './callPolicy.js';

export const DECISION_AUTHORITY='single-forecast-v1';
export function canonicalRegimeFlags(regime) {
  const r=String(regime||'');
  return {trend:['TRENDING UP','TRENDING DOWN','STRONG TREND'].includes(r),
    chop:['RANGE-CHOP','HIGH VOL CHOP','CHOPPY','RANGE-BOUND'].includes(r)};
}
// Signal score and forecast probability are different axes. Never mirror a
// signal score as if it were P(UP), or synthesize a probability from a bps move.
export function callDecisionEvidence(call,analysis,tape={}) {
  const probabilityUp=num(analysis?.rawProbAbove);
  const direction=probabilityUp!==null&&probabilityUp>=0&&probabilityUp<=100&&probabilityUp!==50
    ?(probabilityUp>50?'UP':'DOWN'):null;
  const projectedGap=num(analysis?.projectedGapBps),drift=num(analysis?.last60sDriftBps);
  const buy=num(tape?.w15?.buyPct),pump=buy!==null&&drift!==null&&buy>=85&&drift>=8,
    dump=buy!==null&&drift!==null&&buy<=15&&drift<=-8;
  return {authority:DECISION_AUTHORITY,direction,probabilityUp,
    probabilitySide:directionalConfidence(probabilityUp,direction),score:num(call?.confidence),scoreKind:'signal-score',
    trajectoryDirection:projectedGap===null||projectedGap===0?null:projectedGap>0?'UP':'DOWN',projectedGap,
    reversalWarning:pump?'pump-exhaustion':dump?'dump-exhaustion':null,
    target:'official-kalshi-contract-settlement',regime:analysis?.regime||null};
}

// Only genuine fresh spot observations advance formation. Quotes must remain
// valid and cannot regress. The existing weighted count and tier thresholds
// remain; time/identity checks prevent repeated clock renders becoming samples.
export function advanceCallFormation(previous,input) {
  const {direction,windowId,asset='BTC',source,spotAt,quote,probabilityUp,now}=input;
  const key=`${asset}|${windowId}|${source||'unknown'}|${direction}`;
  const close=windowCloseMs(windowId),start=close-(windowId?.startsWith('15m-')?900000:300000);
  const old=previous?.schema===2&&previous.key===key&&previous.firstAt>=start&&previous.lastAt<=now&&
    previous.firstAt<=previous.lastAt&&Number.isFinite(previous.count)&&previous.count>=0&&
    previous.observations>=1&&previous.count<=previous.observations*1.5
    ?previous:{schema:2,key,dir:direction,count:0,firstAt:null,lastAt:0,lastSpotAt:0,lastQuoteAt:0,observations:0};
  const spot=num(spotAt),p=num(probabilityUp),checked=inspectDecisionQuote(quote,{windowId,asset,now});
  if(!isDirection(direction)||p===null||p<0||p>100||spot===null||spot<start||spot>now+2000||now-spot>15000||!checked.ok)
    return {state:old,fresh:false,reason:'Waiting for fresh, matching market observations.'};
  if(spot<=old.lastSpotAt||checked.at<old.lastQuoteAt||(old.observations>0&&now-old.lastAt<1000))
    return {state:old,fresh:false,reason:'Waiting for a new spot observation; clock ticks do not confirm a Call.'};
  const weight=Math.max(.5,Math.min(1.5,Math.abs(p-50)/14));
  return {fresh:true,state:{...old,count:old.count+weight,firstAt:old.firstAt??now,lastAt:now,
    lastSpotAt:spot,lastQuoteAt:checked.at,observations:old.observations+1}};
}

export function callFormationReady(state,required,now=Date.now()) {
  const n=num(required);
  // The same synchronous decision can cross a millisecond boundary. The
  // caller separately requires a fresh observation, so a bounded receipt age
  // permits normal evaluation time without admitting another clock-only tick.
  if(state?.schema!==2||n===null||n<1||state.count<n||state.lastAt>now||now-state.lastAt>1000)return false;
  const minimumMs=Math.max(0,Math.ceil(n/1.5)-1)*1000;
  return state.lastAt-state.firstAt>=minimumMs;
}
