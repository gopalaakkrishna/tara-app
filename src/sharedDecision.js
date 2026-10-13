import {isDirection,finiteNumber,windowCloseMs} from './callIntegrity.js';

export const SHARED_DECISION_CACHE='taraSharedDecision_v1';
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
export function sharedWindowId(windowType='15m',now=Date.now()) {
  const length=windowType==='15m'?900000:300000;
  return `${windowType}-${new Date(Math.floor(now/length)*length).toISOString()}`;
}
const direction=s=>s?.originalDecision?.direction||s?.call||s?.dir;
const committedAt=s=>finiteNumber(s?.originalDecision?.lockedAt??s?._committedAt??s?.lockedAt);
export function matchesSharedWindow(doc,context) {
  return !!doc&&doc.windowId===context.windowId&&(!doc.asset||doc.asset===context.asset)&&
    (!doc.windowType||doc.windowType===context.windowType);
}
export function restoredSnapshot(snapshot,context) {
  if(!snapshot?.locked)return null;
  const original=snapshot.originalDecision;
  const wid=original?.windowId||snapshot.windowId||snapshot.lockedWindowId||context.windowId;
  const asset=original?.asset||snapshot.asset||context.asset;
  const type=original?.windowType||snapshot.windowType||context.windowType;
  if(wid!==context.windowId||asset!==context.asset||type!==context.windowType)return null;
  // Contradictory nested identities are not repaired by trusting the envelope.
  if((snapshot.windowId&&snapshot.windowId!==wid)||(snapshot.asset&&snapshot.asset!==asset)||
    (snapshot.windowType&&snapshot.windowType!==type))return null;
  const call=direction(snapshot),at=committedAt(snapshot),close=windowCloseMs(wid);
  const start=close-(type==='15m'?900000:300000);
  if(!['UP','DOWN','SIT_OUT'].includes(call)||at===null||at<start||at>=close||at>context.now+2000)return null;
  return {...clone(snapshot),call,dir:call,direction:call,windowId:wid,windowType:type,asset,_committedAt:at,
    ...(original?{reason:original.reason??snapshot.reason,confidence:original.signalScore??snapshot.confidence??0,
      atPosterior:original.probabilityUpCurrent??snapshot.atPosterior,blockedDecision:clone(original.blockedDecision??snapshot.blockedDecision),
      kalshiAtLock:original.yesPrice??snapshot.kalshiAtLock,marketTicker:original.marketTicker??snapshot.marketTicker,
      marketCloseTime:original.marketCloseTime??snapshot.marketCloseTime,taraVersion:original.modelVersion??snapshot.taraVersion,
      decisionTrace:clone(original.decisionTrace??snapshot.decisionTrace)}:{})};
}
export function ledgerDecision(entries,context) {
  let winner=null;
  for(const row of Array.isArray(entries)?entries:[]){
    const o=row?.originalDecision;
    if(!o||o.provenance!=='captured-at-lock'||o.windowId!==context.windowId)continue;
    const s=restoredSnapshot({...row,call:o.direction,locked:true,_committedAt:o.lockedAt,originalDecision:o},context);
    if(s&&(!winner||s._committedAt<winner._committedAt))winner=s;
  }
  return winner;
}
// Preserve the established >1s skew tolerance. Equal/near-simultaneous captures
// favor the existing shared value, rather than oscillating on every notification.
export function chooseSharedSnapshot(shared,local,context) {
  const a=restoredSnapshot(shared,context),b=restoredSnapshot(local,context);
  if(!a)return b;if(!b)return a;
  if(b._committedAt+1000<a._committedAt)return b;
  if(a._committedAt===b._committedAt&&!a.originalDecision&&b.originalDecision)return b;
  return a;
}
export function sharedSnapshotIdentity(s) {
  return s?JSON.stringify([s.windowId,s.asset,s.windowType,direction(s),committedAt(s),s.originalDecision||null]):null;
}
export function restoredEngineLock(lock,context,local=null,saved=null) {
  if(!lock||!isDirection(lock.dir))return null;
  if((lock.windowId&&lock.windowId!==context.windowId)||(lock.asset&&lock.asset!==context.asset)||
    (lock.windowType&&lock.windowType!==context.windowType))return null;
  const at=finiteNumber(lock._committedAt??lock.lockedAt),close=windowCloseMs(context.windowId);
  if(at===null||at<close-(context.windowType==='15m'?900000:300000)||at>=close||at>context.now+2000)return null;
  const result={...clone(lock),windowId:context.windowId};
  const sameLocal=local?.windowId===context.windowId&&local.dir===lock.dir;
  if(sameLocal&&local.timeSeries?.length)result.timeSeries=clone(local.timeSeries);
  else if(saved?.windowId===context.windowId&&saved.ts?.length)result.timeSeries=clone(saved.ts);
  if(sameLocal&&local.releaseSignalsHistory?.length)result.releaseSignalsHistory=clone(local.releaseSignalsHistory);
  return result;
}
export function readDecisionCache(storage,context) {
  try{const docs=JSON.parse(storage.getItem(SHARED_DECISION_CACHE)||'[]');
    return Array.isArray(docs)?docs.find(d=>matchesSharedWindow(d,context)&&restoredSnapshot(d.taraSnapshot,context))||null:null;
  }catch{return null;}
}
export function cacheSharedDecision(storage,doc,context) {
  if(!matchesSharedWindow(doc,context)||!restoredSnapshot(doc.taraSnapshot,context))return false;
  try{const old=JSON.parse(storage.getItem(SHARED_DECISION_CACHE)||'[]');
    const docs=(Array.isArray(old)?old:[]).filter(d=>!(d.windowId===doc.windowId&&d.asset===doc.asset&&d.windowType===doc.windowType));
    storage.setItem(SHARED_DECISION_CACHE,JSON.stringify([...docs,doc].slice(-8)));return true;
  }catch{return false;}
}

// A queued formation/null/old-window payload cannot erase a committed decision.
// Called again after every failed compare-and-swap; no stale mirror authorizes writes.
export function mergeSharedDecision(existing,incoming,context) {
  if(!matchesSharedWindow(incoming,context))return {write:false,reason:'stale-window-payload',doc:existing};
  if(existing?.windowId&&windowCloseMs(existing.windowId)>windowCloseMs(context.windowId))
    return {write:false,reason:'newer-shared-window',doc:existing};
  const current=matchesSharedWindow(existing,context)?existing:null;
  const shared=restoredSnapshot(current?.taraSnapshot,context),local=restoredSnapshot(incoming.taraSnapshot,context);
  const winner=chooseSharedSnapshot(shared,local,context);
  if(shared&&sharedSnapshotIdentity(winner)===sharedSnapshotIdentity(shared))
    return {write:false,reason:'shared-canonical-preserved',doc:current};
  return {write:true,reason:winner?'canonical-decision':'formation-only',
    doc:{...incoming,taraSnapshot:winner}};
}

// Transport is injected: production uses conditional Supabase updates, tests
// use an in-memory server. No credentials, order APIs or policy thresholds here.
export async function publishSharedDecision(path,incoming,{readRow,compareAndSwap,insertIfAbsent,now=Date.now,revision=()=>crypto.randomUUID(),attempts=4}) {
  for(let i=0;i<attempts;i++){
    const at=now(),windowType=incoming.windowType||'15m',asset=incoming.asset||'BTC';
    const context={windowId:sharedWindowId(windowType,at),windowType,asset,now:at};
    if(path!==`state/currentLock_${asset}_${windowType}`)return {ok:false,reason:'path-identity-mismatch'};
    const row=await readRow(path);
    if(sharedWindowId(windowType,now())!==context.windowId)return {ok:false,reason:'stale-window-payload',doc:row?.data||null};
    const merged=mergeSharedDecision(row?.data||null,incoming,context);
    if(!merged.write)return {ok:merged.reason==='shared-canonical-preserved',...merged};
    const doc={...merged.doc,_revision:revision()};
    const applied=row?await compareAndSwap(path,row,doc):await insertIfAbsent(path,doc);
    if(applied)return {ok:true,reason:'published',doc};
  }
  return {ok:false,reason:'shared-write-conflict'};
}
