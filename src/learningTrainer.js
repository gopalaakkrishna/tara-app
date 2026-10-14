import {LEARNING_PROTOCOL,LEARNING_POLICY,callLearningRow,studyLearningRows,pickLearningRow,uniqueLearningRows,learningDigest,
  createChallenger,forwardEvidence,promotionDecision,probabilityMetrics,validFeatures,trainingRowDigest} from './learningCore.js';
import {windowCloseMs} from './callIntegrity.js';
export const LEARNING_PROFILES=Object.freeze(['BTC_15m','BTC_5m','BTC_hourly','Sports','Weather_paper','Weather_live']);
export const witnessKey=p=>`${p.modelId}|${p.key}|${p.featureDigest}|${p.at}`;
export function collectLearningWitnesses({calls,studies,hourly,weather,previous,now}){
  const found={...(previous.witnesses||{})};
  const admit=(features,predictions,close)=>{
    // Server/job observation before close, not a backdated browser claim.
    if(!validFeatures(features)||!Number.isFinite(close)||now>=close-60000)return;
    for(const p of predictions||[])if(p.at<=now&&p.at<close&&p.featureDigest===learningDigest(features.values)){
      const key=witnessKey(p);found[key]??={at:now,close};
    }
  };
  for(const e of calls)if(e.result==null)admit(e.originalDecision?.learningFeatures,e.originalDecision?.learningPredictions,windowCloseMs(e.windowId));
  for(const s of studies)if(!s.settlement)for(const o of s.observations||[])if(o.dataReady)admit(o.learningFeatures,o.learningPredictions,windowCloseMs(s.windowId));
  for(const p of [...hourly,...weather])if(!p.learningSettlement)admit(p.learningCapture?.features,p.learningCapture?.predictions,p.learningCapture?.close);
  return Object.fromEntries(Object.entries(found).filter(([,w])=>w.at>now-180*86400000).slice(-10000));
}
// Pure orchestration: no network, orders, mutable trading settings or credentials.
export function trainLearningRegistry({calls=[],studies=[],hourly=[],weather=[],sports={},previous={},now=Date.now(),sourceHealth={}}={}){
  const exclusions={},rows=[],known=new Set();
  const admit=(checked,key)=>{if(key)known.add(key);if(checked.ok)rows.push(checked.row);else exclusions[checked.reason]=(exclusions[checked.reason]||0)+1;};
  for(const e of calls)admit(callLearningRow(e,{asOf:now}),`${e.asset||'BTC'}|${e.windowType||'15m'}|${e.windowId||e.id}`);
  const studyByWindow=new Map();for(const s of [...studies].sort((a,b)=>a.firstObservedAt-b.firstObservedAt||String(a.device).localeCompare(String(b.device))))if(!studyByWindow.has(s.windowId)||(!studyByWindow.get(s.windowId).coverage?.complete&&s.coverage?.complete))studyByWindow.set(s.windowId,s);
  for(const s of studyByWindow.values()){const r=studyLearningRows(s,{asOf:now});rows.push(...r);if(!r.length)exclusions['partial-unsettled-or-legacy-observation']=(exclusions['partial-unsettled-or-legacy-observation']||0)+1;}
  for(const p of hourly)admit(pickLearningRow(p,'BTC_hourly',{asOf:now}),`BTC_hourly|${p.ticker}|${p.side}`);
  for(const p of weather){const profile=`Weather_${p.tier}`;if(['Weather_paper','Weather_live'].includes(profile))admit(pickLearningRow(p,profile,{asOf:now}),`${profile}|${p.ticker}|${p.side}`);}
  // Retained settled captures survive rolling dashboard caps. A currently seen
  // amended/ineligible row invalidates its archived counterpart, not vice versa.
  const retained=(previous.rows||[]).filter(r=>!known.has(r.key));
  const all=[...retained,...rows],corpus=uniqueLearningRows(all).slice(-20000),profiles={};
  if(all.length>corpus.length)exclusions['duplicate-conflicting-or-retention-capped-captures']=all.length-corpus.length;
  const witnesses=collectLearningWitnesses({calls,studies,hourly,weather,previous,now});
  for(const profile of LEARNING_PROFILES){
    const scope=corpus.filter(r=>r.profile===profile),schema=profile==='BTC_15m'||profile==='BTC_5m'?'btc-direction-v1':'pick-calibration-v1';
    const prior=previous.registry?.profiles?.[profile];
    let challenger=prior?.challenger;
    const current=new Map(scope.map(r=>[r.key,trainingRowDigest(r)])),retired=[...(prior?.retired||[])];
    const invalidated=challenger?.model&&(!challenger.evidence?.length||challenger.evidence.some(e=>current.get(e.key)!==e.digest));
    const failedForward=challenger?.model&&prior.forwardGroups>=LEARNING_POLICY.minForward&&prior.promotion?.ok===false;
    if(invalidated||failedForward){retired.push({modelId:challenger.model.id,at:now,reason:invalidated?'source-evidence-corrected-or-excluded':'forward-validation-failed'});challenger=null;}
    // A candidate is frozen across training runs, including its holdout. Its
    // future predictions must have been captured before those labels existed.
    if(!challenger?.model)challenger=createChallenger(scope,{profile,schema,now});
    const forward=challenger.model?scope.flatMap(r=>(r.predictions||[]).filter(p=>{
      const w=witnesses[witnessKey(p)];return w&&w.at<r.close-60000&&w.at>=p.at;
    }).map(p=>forwardEvidence(challenger.model,r,p,{now})).filter(Boolean)):[];
    const promotion=challenger.model?promotionDecision(challenger,forward):{ok:false,reason:challenger.reason};
    const recent=forward.slice(-200),drift=recent.length?probabilityMetrics(recent,r=>r.frozenPrediction):null;
    profiles[profile]={status:promotion.ok?'ready-for-policy-review':challenger.status,reason:promotion.reason,eligible:scope.length,retired:retired.slice(-20),
      independentGroups:new Set(scope.map(r=>r.group)).size,challenger:{...challenger,forward:undefined},
      forwardGroups:new Set(forward.map(r=>r.group)).size,promotion,drift,champion:null,
      lastVerifiedOutcome:Math.max(0,...scope.map(r=>r.labelAt)),liveInfluence:false};
    if(profile==='Sports')profiles[profile]={...profiles[profile],status:'source-review',reason:'external-record-not-independent-settlement-proof',
      sourceOpen:(sports.open||[]).length,sourceSettled:(sports.settled||[]).length};
  }
  const registry={protocol:LEARNING_PROTOCOL,schema:2,generatedAt:now,policy:{...LEARNING_POLICY},profiles,sourceHealth,
    exclusions,datasetId:learningDigest(corpus),liveActivationApproved:false,
    mode:'automatic-training-frozen-shadow-human-reviewed-live-promotion',
    coverage:'Only originally observed, data-ready samples with exact-market verified outcomes. Missing browser observations are not sit-outs.',
    rollback:{liveChampion:null,previousDataset:previous.registry?.datasetId||null}};
  return {registry,rows:corpus,witnesses,sportsCaptures:[...(previous.sportsCaptures||[]),...(sports.open||[]).filter(p=>
    !(previous.sportsCaptures||[]).some(o=>o.id===p.id)).map(p=>({id:p.id,event:p.event,pick:p.pick,probability:p.model,start:p.start,capturedAt:now,source:'external-sports-record',eligible:false}))].slice(-1000)};
}
