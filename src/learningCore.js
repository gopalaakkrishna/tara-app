// Deterministic, side-effect-free learning protocol. No orders/settings here.
import {finiteNumber as num,callKey,windowCloseMs,isScoredCall} from './callIntegrity.js';
export const LEARNING_PROTOCOL='tara-learning-v2';
export const LEARNING_POLICY=Object.freeze({minTrain:80,minTest:30,minForward:100,minPriced:60,gapMs:3600000,
  minBrierGain:.005,maxAgeMs:48*3600000,maxScoreImpact:10,epochs:120,rate:.025,l2:.02});
export const DIRECTION_FEATURES=Object.freeze(['gap','momentum','flow','structure','technical','regime','rangePosition','reversal','meanReversion','crossAsset','baseUp','atr','timeLeft']);
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,canonical(x[k])])):x;
// Identity/hash for cache invalidation, not an authentication primitive.
export const learningDigest=x=>{let a=2166136261,b=0x9e3779b9;for(const c of JSON.stringify(canonical(x))){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b^c.charCodeAt(0),2246822519);}return `${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`;};
export function directionFeatures({signals,baseUp,atrBps,secondsLeft}) {
  // These four conditional contributions are absent when their detector does
  // not fire. Missing mandatory feed scores are NOT imputed as neutral data.
  const optional=new Set(['reversal','meanReversion','crossAsset']);
  const values=DIRECTION_FEATURES.slice(0,10).map(k=>signals?.[k]===undefined&&optional.has(k)?0:num(signals?.[k]));
  if(values.some(x=>x===null)||num(baseUp)===null||baseUp<0||baseUp>100||num(atrBps)===null||atrBps<=0||num(secondsLeft)===null||secondsLeft<0)return null;
  return {schema:'btc-direction-v1',protocol:LEARNING_PROTOCOL,values:[...values,baseUp/100,atrBps,secondsLeft],baseProbability:baseUp/100};
}
export function calibrationFeatures({probability,confidence,secondsLeft}) {
  if(num(probability)===null||probability<0||probability>1||num(confidence)===null||num(secondsLeft)===null||secondsLeft<0)return null;
  const p=clamp(probability,1e-4,1-1e-4);
  return {schema:'pick-calibration-v1',protocol:LEARNING_PROTOCOL,values:[Math.log(p/(1-p)),confidence/100,secondsLeft/3600],baseProbability:probability};
}
export function validFeatures(f) {
  const n=f?.schema==='btc-direction-v1'?DIRECTION_FEATURES.length:f?.schema==='pick-calibration-v1'?3:0;
  return f?.protocol===LEARNING_PROTOCOL&&n>0&&Array.isArray(f.values)&&f.values.length===n&&f.values.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e6)&&num(f.baseProbability)!==null&&f.baseProbability>=0&&f.baseProbability<=1;
}
// Statistical feedback is learning too: a legacy WIN label or a manually
// edited row is not an official, comparable early-window outcome.
export function verifiedSummaryCall(e,asOf=Date.now()){
  const o=e?.originalDecision,s=e?.officialSettlement,close=windowCloseMs(e?.windowId),at=num(o?.lockedAt),verified=num(s?.verifiedAt);
  if(!isScoredCall(e)||e.manualEdit||e.manualEditedAt||e.recordRevisions?.length||e.isUserForced||e.tier==='user-forced'||o?.commitPolicy?.action==='manual')return false;
  const cutoff=(e.windowType||'15m')==='15m'?420:30;
  return !!o&&o.windowId===e.windowId&&o.direction===e.dir&&o.asset===(e.asset||'BTC')&&o.windowType===(e.windowType||'15m')&&
    Number.isFinite(close)&&at!==null&&at>=Date.parse(e.windowId.slice(o.windowType.length+1))&&at<close-cutoff*1000&&
    verified!==null&&verified>=close&&verified<=asOf&&s?.source==='kalshi-public-api'&&!!o.marketTicker&&s.ticker===o.marketTicker&&
    Number.isFinite(Date.parse(s.closeTime))&&Math.abs(Date.parse(s.closeTime)-close)<=1000&&['UP','DOWN'].includes(s.outcomeDir)&&
    (e.result==='WIN')===(e.dir===s.outcomeDir);
}
export function callLearningRow(e,{asOf=Date.now()}={}) {
  const o=e?.originalDecision,s=e?.officialSettlement,f=o?.learningFeatures;
  if(!isScoredCall(e)||e.manualEdit||e.manualEditedAt||e.recordRevisions?.length)return {ok:false,reason:'unverified-or-amended-outcome'};
  if(o?.provenance!=='captured-at-lock'||!validFeatures(f)||f.schema!=='btc-direction-v1')return {ok:false,reason:'original-features-unavailable'};
  if(o.learningDataReady!==true||o.commitPolicy?.action!=='allow'||e.isUserForced||e.tier==='user-forced')return {ok:false,reason:'not-data-ready-automatic-call'};
  const at=num(o.lockedAt),close=windowCloseMs(o.windowId),verified=num(s?.verifiedAt);
  if(o.windowId!==e.windowId||o.asset!==(e.asset||'BTC')||o.windowType!==(e.windowType||'15m')||o.direction!==e.dir||
    !Number.isFinite(close)||at===null||at<Date.parse(o.windowId.slice(o.windowType.length+1))||at>=close||at>asOf||verified===null||verified<close||verified>asOf||
    s?.source!=='kalshi-public-api'||!o.marketTicker||s.ticker!==o.marketTicker||!Number.isFinite(Date.parse(s.closeTime))||Math.abs(Date.parse(s.closeTime)-close)>1000||!['UP','DOWN'].includes(s.outcomeDir))return {ok:false,reason:'settlement-or-capture-identity'};
  if((e.result==='WIN')!==(o.direction===s.outcomeDir))return {ok:false,reason:'result-contradiction'};
  const bid=num(o.yesBid),ask=num(o.yesAsk),quoted=num(o.quoteObservedAt);
  if(bid===null||ask===null||bid<=0||ask>=100||ask<bid||quoted===null||quoted>at+2000||at-quoted>30000||
    Math.abs(f.values.at(-1)-(close-at)/1000)>30)return {ok:false,reason:'original-quote-or-timing-unavailable'};
  return {ok:true,row:{key:callKey(e),group:`${o.asset}|${o.windowType}|${close}`,profile:`${o.asset}_${o.windowType}`,schema:f.schema,
    version:o.modelVersion,at,close,labelAt:verified,x:[...f.values],base:f.baseProbability,y:s.outcomeDir==='UP'?1:0,
    bid,ask,secondsLeft:o.secondsLeft,source:'captured-call',result:e.result,predictions:o.learningPredictions||[]}};
}
export function studyLearningRows(study,{asOf=Date.now()}={}) {
  if(study?.learningProtocol!==LEARNING_PROTOCOL||study.asset!=='BTC'||study.windowType!=='15m'||!study.coverage?.complete||
    num(study.settlement?.verifiedAt)===null||study.settlement.verifiedAt>asOf||!['UP','DOWN'].includes(study.settlement.outcomeDir))return [];
  const close=windowCloseMs(study.windowId);if(!Number.isFinite(close)||study.settlement.verifiedAt<close||study.settlement.source!=='kalshi-public-api')return [];
  const anchors=[720,600,480,420],out=[];
  for(const seconds of anchors){
    const o=(study.observations||[]).filter(x=>x.secondsLeft>=seconds&&x.secondsLeft<=seconds+20&&validFeatures(x.learningFeatures)&&
      x.dataReady===true&&x.quote&&x.at<=close-seconds*1000&&x.at<study.settlement.verifiedAt)
      .sort((a,b)=>b.at-a.at)[0];
    if(!o||o.quote.ticker!==study.settlement.ticker||[o.at,o.quote.bid,o.quote.ask,o.quote.at].some(x=>num(x)===null)||o.quote.bid<=0||o.quote.ask>=100||o.quote.ask<o.quote.bid||
      o.at-o.quote.at>30000||o.quote.at>o.at+2000||!Number.isFinite(Date.parse(o.quote.closeTime))||Math.abs(Date.parse(o.quote.closeTime)-close)>1000||Math.abs(o.learningFeatures.values.at(-1)-o.secondsLeft)>30)continue;
    out.push({key:`study|${study.asset}|${study.windowId}|${seconds}`,group:`BTC|15m|${close}`,profile:'BTC_15m',schema:o.learningFeatures.schema,
      version:study.version,at:o.at,close,labelAt:study.settlement.verifiedAt,x:[...o.learningFeatures.values],base:o.learningFeatures.baseProbability,
      y:study.settlement.outcomeDir==='UP'?1:0,bid:o.quote.bid,ask:o.quote.ask,secondsLeft:o.secondsLeft,source:'observed-window',predictions:o.learningPredictions||[]});
  }
  return out;
}
export function pickLearningRow(p,profile,{asOf=Date.now()}={}) {
  const capture=p?.learningCapture,f=capture?.features,s=p?.learningSettlement;
  if(capture?.protocol!==LEARNING_PROTOCOL||!validFeatures(f)||f.schema!=='pick-calibration-v1'||capture.profile!==profile)return {ok:false,reason:'original-features-unavailable'};
  if(s?.protocol!==LEARNING_PROTOCOL||s.ticker!==capture.ticker||s.source!=='kalshi-public-api'||!s.verified||!['yes','no'].includes(s.result)||num(s.close)===null||Math.abs(s.close-capture.close)>1000||
    num(s.at)===null||num(capture.close)===null||s.at>asOf||num(capture.at)===null||capture.at>=capture.close||s.at<capture.close||capture.at>asOf)return {ok:false,reason:'settlement-or-capture-identity'};
  if(!['YES','NO'].includes(capture.side)||num(capture.price)===null||capture.price<=0||capture.price>=100||num(capture.quoteAt)===null||capture.at-capture.quoteAt>30000||capture.quoteAt>capture.at+2000)return {ok:false,reason:'original-quote-unavailable'};
  return {ok:true,row:{key:`${profile}|${capture.ticker}|${capture.side}`,group:profile.startsWith('BTC_')?`${profile}|${capture.close}`:`${profile}|${capture.event||capture.ticker}`,
    profile,schema:f.schema,version:capture.version,at:capture.at,close:capture.close,labelAt:s.at,x:[...f.values],base:f.baseProbability,
    y:(capture.side==='YES')===(s.result==='yes')?1:0,cost:capture.price,source:'captured-pick',predictions:capture.predictions||[]}};
}
export function uniqueLearningRows(rows) {
  const by=new Map(),conflicts=new Set();
  for(const r of rows){if(!r||!Array.isArray(r.x))continue;const old=by.get(r.key);if(old&&learningDigest(old)!==learningDigest(r)){conflicts.add(r.key);continue;}by.set(r.key,r);}
  return [...by.values()].filter(r=>!conflicts.has(r.key)).sort((a,b)=>a.at-b.at||a.key.localeCompare(b.key));
}
export function chronologicalSplit(rows,policy=LEARNING_POLICY) {
  const clean=uniqueLearningRows(rows),groups=[...new Map(clean.map(r=>[r.group,r.close])).entries()].sort((a,b)=>a[1]-b[1]);
  const testN=Math.max(policy.minTest,Math.ceil(groups.length*.2)),testGroups=new Set(groups.slice(-testN).map(g=>g[0]));
  const test=clean.filter(r=>testGroups.has(r.group)),firstTest=Math.min(...test.map(r=>r.at));
  // Labels and normalization may only use information known before the test.
  const train=clean.filter(r=>!testGroups.has(r.group)&&r.labelAt<firstTest-policy.gapMs&&r.close<firstTest-policy.gapMs);
  return {train,test,trainGroups:new Set(train.map(r=>r.group)).size,testGroups:testGroups.size,
    ok:new Set(train.map(r=>r.group)).size>=policy.minTrain&&testGroups.size>=policy.minTest};
}
const sigmoid=z=>1/(1+Math.exp(-clamp(z,-25,25)));
export function fitLearningModel(rows,{profile,schema,policy=LEARNING_POLICY,at=Date.now()}={}) {
  if(!rows.length)return null;const n=rows[0].x.length;
  if(rows.some(r=>r.x.length!==n||r.x.some(x=>num(x)===null)||![0,1].includes(r.y)||r.profile!==profile||r.schema!==schema||r.labelAt>at))return null;
  const means=Array(n).fill(0),stds=Array(n).fill(0);for(const r of rows)r.x.forEach((x,j)=>{means[j]+=x/rows.length;});
  for(const r of rows)r.x.forEach((x,j)=>{stds[j]+=(x-means[j])**2/rows.length;});for(let j=0;j<n;j++)stds[j]=Math.sqrt(Math.max(stds[j],1e-6));
  const w=Array(n).fill(0);let bias=0;
  // No randomized seed/shuffle: identical corpus and protocol -> identical fit.
  for(let epoch=0;epoch<policy.epochs;epoch++){
    const dw=Array(n).fill(0);let db=0;
    for(const r of rows){const x=r.x.map((v,j)=>clamp((v-means[j])/stds[j],-8,8));const error=sigmoid(x.reduce((s,v,j)=>s+v*w[j],bias))-r.y;
      db+=error/rows.length;x.forEach((v,j)=>{dw[j]+=error*v/rows.length;});}
    bias-=policy.rate*db;w.forEach((_,j)=>{w[j]-=policy.rate*(dw[j]+policy.l2*w[j]);});
  }
  const datasetId=learningDigest(rows),trainedThrough=Math.max(...rows.map(r=>r.labelAt));
  return {protocol:LEARNING_PROTOCOL,id:`${profile}-${schema}-${datasetId}`,profile,schema,weights:w,bias,means,stds,nFeatures:n,
    trainedAt:at,trainedThrough,datasetId,nTrades:rows.length,nGroups:new Set(rows.map(r=>r.group)).size,activation:'shadow',accuracy:null};
}
export function predictLearningModel(model,features) {
  const x=Array.isArray(features)?features:features?.values;
  if(model?.protocol!==LEARNING_PROTOCOL||!x||x.length!==model.nFeatures||!Array.isArray(model.weights)||model.weights.length!==x.length||
    model.means?.length!==x.length||model.stds?.length!==x.length||[...x,...model.weights,...model.means,...model.stds,model.bias].some(v=>num(v)===null)||model.stds.some(v=>v<=0))return null;
  return sigmoid(x.reduce((s,v,j)=>s+clamp((v-model.means[j])/model.stds[j],-8,8)*model.weights[j],model.bias));
}
// Standard one-contract taker estimate, rounded to a centicent. Series-specific
// fees and actual fills remain authoritative; this is never AutoTrade P&L.
const fee=cost=>Math.ceil(7*(cost/100)*(1-cost/100)*100-1e-9)/100;
export function probabilityMetrics(rows,predict) {
  if(!rows.length)return null;let brier=0,loss=0,correct=0,priced=0,net=0;const bins=Array.from({length:10},()=>({n:0,p:0,y:0}));
  for(const r of rows){const raw=predict(r);if(num(raw)===null||raw<0||raw>1)return null;const p=clamp(raw,1e-6,1-1e-6);
    brier+=(p-r.y)**2;loss+=-r.y*Math.log(p)-(1-r.y)*Math.log(1-p);correct+=(p>=.5)===(r.y===1)?1:0;
    const b=bins[Math.min(9,Math.floor(p*10))];b.n++;b.p+=p;b.y+=r.y;
    const cost=r.cost??(p>=.5?r.ask:100-r.bid),won=r.cost!=null?r.y===1:(p>=.5)===(r.y===1);
    if(num(cost)!==null&&cost>0&&cost<100){net+=(won?100:0)-cost-fee(cost);priced++;}
  }
  return {n:rows.length,nGroups:new Set(rows.map(r=>r.group)).size,brier:brier/rows.length,logLoss:loss/rows.length,accuracy:correct/rows.length,
    calibrationError:bins.reduce((s,b)=>s+(b.n?Math.abs(b.p/b.n-b.y/b.n)*b.n/rows.length:0),0),priced,estimatedNet:priced?net/priced:null};
}
export function evaluateModel(model,rows) {
  return {candidate:probabilityMetrics(rows,r=>predictLearningModel(model,r.x)),baseline:probabilityMetrics(rows,r=>r.base)};
}
export const trainingRowDigest=r=>learningDigest([r.key,r.group,r.profile,r.schema,r.version,r.at,r.close,r.labelAt,r.x,r.base,r.y,r.bid,r.ask,r.cost]);
export function createChallenger(rows,{profile,schema,now=Date.now(),policy=LEARNING_POLICY}={}) {
  const scope=rows.filter(r=>r.profile===profile&&r.schema===schema&&r.labelAt<=now),split=chronologicalSplit(scope,policy);
  if(!split.ok)return {status:'collecting',reason:'insufficient-independent-chronological-samples',trainGroups:split.trainGroups,testGroups:split.testGroups,requiredTrain:policy.minTrain,requiredTest:policy.minTest};
  // Freeze this fitted candidate. Do not retrain it on its held-out labels.
  const model=fitLearningModel(split.train,{profile,schema,policy,at:now}),holdout=evaluateModel(model,split.test);
  if(!holdout.candidate||!holdout.baseline)return {status:'rejected',reason:'invalid-validation'};
  model.forwardStart=now;
  return {status:'shadow',reason:'awaiting-forward-evidence',model,holdout,createdAt:now,
    evidence:[...split.train,...split.test].map(r=>({key:r.key,digest:trainingRowDigest(r)})),
    holdoutDataset:learningDigest(split.test),forwardStart:now,forward:[],promotion:null};
}
export function forwardEvidence(model,row,prediction,{now=Date.now()}={}) {
  if(prediction?.modelId!==model?.id||prediction.protocol!==LEARNING_PROTOCOL||prediction.key!==row.key||prediction.profile!==model.profile||row.schema!==model.schema||num(prediction.at)===null||prediction.at<=model.trainedAt||prediction.at<model.forwardStart||
    prediction.at>=row.close||row.labelAt<=prediction.at||row.labelAt>now||prediction.profile!==row.profile||
    prediction.featureDigest!==learningDigest(row.x)||num(prediction.probability)===null||prediction.probability<0||prediction.probability>1)return null;
  const expected=predictLearningModel(model,row.x);if(expected===null||Math.abs(expected-prediction.probability)>1e-8)return null;
  return {...row,frozenPrediction:prediction.probability,predictedAt:prediction.at};
}
export function promotionDecision(challenger,forward,policy=LEARNING_POLICY) {
  const h=challenger?.holdout;if(!h?.candidate||!h?.baseline)return {ok:false,reason:'no-chronological-validation'};
  const rows=uniqueLearningRows(forward).filter(r=>r.predictedAt>challenger.createdAt),c=probabilityMetrics(rows,r=>r.frozenPrediction),b=probabilityMetrics(rows,r=>r.base);
  if(!c||c.nGroups<policy.minForward||c.priced<policy.minPriced)return {ok:false,reason:'insufficient-frozen-forward-evidence',forwardGroups:c?.nGroups||0,priced:c?.priced||0,required:policy.minForward};
  if(h.candidate.brier>h.baseline.brier-policy.minBrierGain||c.brier>b.brier-policy.minBrierGain||c.logLoss>b.logLoss||c.calibrationError>b.calibrationError+.01)return {ok:false,reason:'no-consistent-probability-improvement',candidate:c,baseline:b};
  if(challenger.model.schema==='pick-calibration-v1')return {ok:c.estimatedNet>0,
    reason:c.estimatedNet>0?'calibration-improved-same-picks-policy-review-required':'fixed-pick-cohort-not-fee-positive',
    candidate:c,baseline:b,forwardGroups:c.nGroups,profitImprovementEstablished:false};
  // Independent-window paired gains, not a count of correlated anchors/contracts.
  const group=new Map();for(const r of rows){const p=r.frozenPrediction,cp=r.cost??(p>=.5?r.ask:100-r.bid),bp=r.cost??(r.base>=.5?r.ask:100-r.bid);
    const cw=r.cost!=null?r.y===1:(p>=.5)===(r.y===1),bw=r.cost!=null?r.y===1:(r.base>=.5)===(r.y===1);
    if(num(cp)===null||num(bp)===null)continue;const gain=(cw?100:0)-cp-fee(cp)-((bw?100:0)-bp-fee(bp));
    const g=group.get(r.group)||[];g.push(gain);group.set(r.group,g);}
  const gains=[...group.values()].map(a=>a.reduce((s,x)=>s+x,0)/a.length),mean=gains.reduce((s,x)=>s+x,0)/gains.length;
  const variance=gains.length>1?gains.reduce((s,x)=>s+(x-mean)**2,0)/(gains.length-1):Infinity,lower=mean-1.96*Math.sqrt(variance/gains.length);
  if(!Number.isFinite(lower)||lower<=0||c.estimatedNet<=0)return {ok:false,reason:'fee-adjusted-gain-not-established',candidate:c,baseline:b,pairedGainLower:lower};
  return {ok:true,reason:'chronological-and-frozen-forward-validation-passed',candidate:c,baseline:b,pairedGainLower:lower,forwardGroups:c.nGroups};
}
export function activeModel(registry,profile,now=Date.now()) {
  const item=registry?.profiles?.[profile],m=item?.champion;
  if(registry?.protocol!==LEARNING_PROTOCOL||num(registry.generatedAt)===null||now-registry.generatedAt>LEARNING_POLICY.maxAgeMs||registry.generatedAt>now+2000||m?.profile!==profile||
    // Promotion of a forecast in shadow is not proof for a live lock policy.
    registry.liveActivationApproved!==true||m.activation!=='validated'||item?.promotion?.ok!==true||item.promotion.forwardGroups<LEARNING_POLICY.minForward||!m.weights)return null;
  return m;
}
export function modelScoreImpact(model,features,baseScore,context={}) {
  if(model?.activation!=='validated'||model.profile!==`${context.asset||'BTC'}_${context.windowType||'15m'}`||features?.schema!==model.schema)return 0;
  const p=predictLearningModel(model,features),lean=baseScore>5?1:baseScore<-5?-1:0;if(p===null||!lean)return 0;
  const side=lean>0?p:1-p,raw=lean*Math.round((side-.5)*20);
  return clamp(raw,-Math.min(LEARNING_POLICY.maxScoreImpact,Math.abs(baseScore)),Math.min(LEARNING_POLICY.maxScoreImpact,Math.abs(baseScore)));
}
export function outcomeLearningKey(entry) {
  const checked=callLearningRow(entry);if(!checked.ok)return null;
  return `${checked.row.key}|${learningDigest([entry.originalDecision,entry.officialSettlement])}`;
}
export function applyOnceLedger(ledger,entry) {
  const key=outcomeLearningKey(entry);if(!key)return {apply:false,reason:'ineligible-outcome',ledger};
  const window=callKey(entry),existing=ledger?.windows?.[window];
  if(existing)return {apply:false,reason:existing===key?'already-applied':'changed-outcome-needs-rebuild',ledger};
  return {apply:true,reason:'new-verified-outcome',ledger:{protocol:LEARNING_PROTOCOL,windows:{...(ledger?.windows||{}),[window]:key}}};
}
export function learningSource(entries) {
  const rows=(Array.isArray(entries)?entries:[]).filter(e=>e&&['WIN','LOSS','SITOUT','NO_TRADE'].includes(e.result));
  return {signature:learningDigest(rows.map(e=>[callKey(e),e.result,e.dir,e.regime,e.tier,e.session,e.isStructuralLed,e.isSuperConfluent,e.isConfluent,e.isTapeLed,e.isRisingConfluence,e.lossPattern,e.posterior,e.kalshiAtLock,e.originalDecision,e.officialSettlement,e.manualEditedAt,e.recordRevisions]).sort((a,b)=>a[0].localeCompare(b[0]))),
    maxId:Math.max(0,...rows.map(e=>Number(e.id)||0)),evidenceAt:Math.max(0,...rows.flatMap(e=>[e.officialSettlement?.verifiedAt,e.resolvedAt,e.manualEditedAt].map(x=>Number(x)||0))),count:rows.length};
}
export function learningSummarySource(entries){
  const source=learningSource(entries),policy='official-early-v1';
  // Changing eligibility must invalidate an old summary even when its ledger
  // contents/count have not changed since the previous application release.
  return {...source,policy,signature:learningDigest([policy,source.signature])};
}
export function preferLearningSummary(local,cloud,{canonicalSource}={}) {
  if(local?.learningProtocol!==LEARNING_PROTOCOL)return false;
  if(cloud?.learningProtocol!==LEARNING_PROTOCOL)return true;
  if(local.source?.signature===cloud.source?.signature)return false;
  const a=local.source,b=cloud.source;if(!a||!b)return false;
  if(canonicalSource?.signature===a.signature)return true;
  if(a.maxId!==b.maxId)return a.maxId>b.maxId;
  if(a.evidenceAt!==b.evidenceAt)return a.evidenceAt>b.evidenceAt;
  // Equal count changes/corrections are valid; wall-clock touch alone is not.
  return local.lastUpdated>cloud.lastUpdated&&a.count>=b.count;
}
export function recordPrediction(model,features,{at,profile,key}={}) {
  if(!model||!validFeatures(features)||features.schema!==model.schema||model.profile!==profile||at<=model.trainedAt)return null;
  const probability=predictLearningModel(model,features);if(probability===null)return null;
  return {protocol:LEARNING_PROTOCOL,modelId:model.id,profile,key,at,probability,featureDigest:learningDigest(features.values)};
}
