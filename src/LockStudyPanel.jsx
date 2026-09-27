import React from 'react';
import {isScoredCall} from './callIntegrity.js';
import {LOCK_STUDY_POLICY,calibrateStudyProbability} from './lockStudy.js';
import {callWindowCoverage} from './executionIntegrity.js';

const percent=value=>value===null?'—':`${(value*100).toFixed(1)}%`;
export default function LockStudyPanel({research,callLog=[]}) {
  if(!research)return null;
  const {summary,current,studies}=research;
  const repaired=callLog.filter(e=>e.recordIntegrity?.status==='repaired').length;
  const review=callLog.filter(e=>e.recordIntegrity?.status==='review-required').length;
  const scoreOnly=callLog.filter(e=>isScoredCall(e)&&!e.officialSettlement).length;
  const coverage=callWindowCoverage(callLog,Date.now(),24);
  const rawUp=current?.observations?.at(-1)?.probabilityUpRaw;
  const calibrated=typeof rawUp==='number'?calibrateStudyProbability(studies,Math.max(rawUp,1-rawUp),Date.now()):null;
  const download=()=>{
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),policy:LOCK_STUDY_POLICY,summary,studies},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`tara-lock-study-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <section className="tara-lock-study" aria-label="Early-lock research">
    <div className="tara-lock-study-heading"><div><span className="tara-v14-kicker">DECISION QUALITY</span><h3>Earlier locks, measured honestly.</h3></div><span className="tara-lock-study-badge">SHADOW ONLY · NO ORDERS</span></div>
    <p>Testing a stable opportunity before seven minutes remain. The candidate uses an uncalibrated model score; it does not control Tara’s live call or AutoTrade.</p>
    <div className="tara-lock-study-status"><strong>{current?.early?.status==='locked'?`Paper lock · ${current.early.direction}`:current?.early?.status==='sitout'?'Paper sit-out':research.owner?'Observing this window':'Research viewer'}</strong><span>{current?.early?.reason?.replaceAll('-',' ')||'Waiting for timestamped observations'}</span></div>
    {(research.storageError||research.syncError)&&<p role="status" className="tara-lock-study-warning">{research.storageError||research.syncError}</p>}
    <div className="tara-lock-study-table"><table><thead><tr><th>Same complete windows</th><th>Calls</th><th>W / L</th><th>Accuracy</th><th>Participation</th></tr></thead><tbody>
      {[['Current Tara',summary.current],['Early candidate',summary.early],['Market at candidate time',summary.marketAtEarly]].map(([name,s])=><tr key={name}><td>{name}</td><td>{s.calls}</td><td>{s.wins} / {s.losses}</td><td>{percent(s.winRate)}</td><td>{percent(s.coverage)}</td></tr>)}
    </tbody></table></div>
    <p>{summary.observed} observed · {summary.settled} officially settled · {summary.complete} fully observed windows · {summary.excludedPartial} partial windows excluded. Browser downtime is missing evidence, not a sit-out.</p>
    <p>Last 24 hours: {coverage.recorded}/{coverage.expected} fifteen-minute Call windows recorded · {coverage.unobserved} unobserved. Unobserved means the browser was offline, the record did not sync, or collection failed; it is never counted as a deliberate sit-out.</p>
    <details><summary>Confidence, costs and record integrity</summary>
      <p>“Confidence” is currently a signal score, not a promised win probability. These forward results test whether its probability estimates match actual outcomes.</p>
      <p>Past-only calibration for the current raw-score band: {calibrated?.probability!=null?`${percent(calibrated.probability)} from ${calibrated.n} previous complete windows; research estimate only`:`insufficient forward evidence (${calibrated?.n||0}/30 minimum comparable windows)`}.</p>
      <ul>{summary.calibration.map(b=><li key={b.from}>{b.from}–{b.to}% raw side estimate: {b.n?`${b.wins}/${b.n} correct (${(b.wins/b.n*100).toFixed(1)}%)`:'no settled sample'}</li>)}</ul>
      <p>Early candidate Brier score: {summary.early.brier===null?'not available':summary.early.brier.toFixed(3)} (lower is better). Estimated quote-to-settlement net: {summary.early.estimatedNetCents===null?'not available':`${summary.early.estimatedNetCents.toFixed(1)}¢ across ${summary.early.priced} priced paper calls`}. This includes an estimated taker fee but is not actual fills or account profit.</p>
      <p>{repaired} audited record repairs · {review} contract mismatches excluded pending review · {scoreOnly} scored calls without the new official-settlement evidence object. Legacy flags alone do not certify original lock provenance.</p>
      {review>0&&<ul>{callLog.filter(e=>e.recordIntegrity?.status==='review-required').map(e=><li key={`${e.asset}-${e.windowId}-${e.id}`}>{e.asset||'BTC'} · {e.windowId} · {e.recordIntegrity.reason?.replaceAll('-',' ')} · excluded, original retained</li>)}</ul>}
      <p>Protocol {LOCK_STUDY_POLICY.id}: 15-second sampling, 30-second stability, 65% minimum raw side estimate and 3¢ estimated edge. These are frozen research parameters, not validated live thresholds. No automatic promotion is enabled.</p>
    </details>
    <button type="button" onClick={download}>Export research evidence</button>
  </section>;
}
