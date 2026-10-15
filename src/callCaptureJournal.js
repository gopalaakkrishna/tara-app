import {restoredSnapshot,finalizeClosedSitouts} from './sharedDecision.js';
import {callKey} from './callIntegrity.js';

export const CALL_CAPTURE_JOURNAL='taraCallCaptureJournal_v1';
const read=storage=>{try{const rows=JSON.parse(storage.getItem(CALL_CAPTURE_JOURNAL)||'[]');return Array.isArray(rows)?rows:[];}catch{return [];}};

// Synchronous write-ahead evidence, before React updates and throttled archive /
// cloud persistence. Never regenerate a decision at recovery time.
export function journalCapturedCall(storage,snapshot) {
  if(snapshot?.originalDecision?.provenance!=='captured-at-lock')return false;
  const old=read(storage),key=callKey(snapshot);
  if(old.some(s=>callKey(s)===key&&JSON.stringify(s.originalDecision)===JSON.stringify(snapshot.originalDecision)))return true;
  try{storage.setItem(CALL_CAPTURE_JOURNAL,JSON.stringify([...old.filter(s=>callKey(s)!==key),snapshot]));return true;}catch{return false;}
}

export function recoverCapturedCalls(entries,storage,now=Date.now()) {
  const keys=new Set(entries.filter(Boolean).map(callKey)),recovered=[];
  for(const snapshot of read(storage)){
    const o=snapshot?.originalDecision;
    if(o?.provenance!=='captured-at-lock'||keys.has(callKey(snapshot)))continue;
    const valid=restoredSnapshot(snapshot,{windowId:o.windowId,asset:o.asset,windowType:o.windowType,now});
    if(!valid)continue;
    recovered.push({...valid,id:o.lockedAt,time:new Date(o.lockedAt).toISOString(),dir:o.direction,
      strike:o.strike,result:null,lockedAt:o.lockedAt,reason:o.reason,confidence:o.signalScore,
      posterior:o.probabilityUpCurrent,kalshiAtLock:o.yesPrice,recoveredFrom:'capture-journal'});
    keys.add(callKey(valid));
  }
  const combined=recovered.length?[...entries,...recovered].sort((a,b)=>(a.id||0)-(b.id||0)):entries;
  // Applies only to genuinely captured closed sit-outs; directional results stay
  // pending for the normal exact-ticker official settlement worker.
  return ['15m','5m'].reduce((rows,windowType)=>finalizeClosedSitouts(rows,{now,asset:'BTC',windowType}),combined);
}

export function acknowledgeCapturedCalls(storage,entries) {
  const saved=new Map(entries.filter(Boolean).map(e=>[callKey(e),e]));
  const old=read(storage),remaining=old.filter(s=>{
    const row=saved.get(callKey(s));
    return !row||JSON.stringify(row.originalDecision)!==JSON.stringify(s.originalDecision);
  });
  if(remaining.length===old.length)return;
  try{storage.setItem(CALL_CAPTURE_JOURNAL,JSON.stringify(remaining));}catch{}
}
