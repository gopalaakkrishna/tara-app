import React from 'react';
import './learning.css';
import {LEARNING_PROFILES} from './learningTrainer.js';
const names={BTC_15m:'BTC · 15 minutes',BTC_5m:'BTC · 5 minutes',BTC_hourly:'BTC · hourly',Sports:'Sports',Weather_paper:'Weather · paper',Weather_live:'Weather · live'};
const pct=n=>Number.isFinite(n)?`${(n*100).toFixed(1)}%`:'Not measured';
export function LearningStatus({learning}){
  const r=learning?.registry;
  return <section className="tara-learning" aria-label="Learning and validation"><header><div><small>LEARNING LAB</small><h3>Learn continuously. Prove improvements.</h3></div><span>{learning?.status==='ready'?'Scheduled trainer connected':learning?.status==='stale'?'Trainer result is stale':learning?.status==='loading'?'Connecting':'Trainer unavailable'}</span></header>
    <p>Training runs independently of this page. Candidates stay in shadow mode. No live model change, entry-rule change or AutoTrade change happens here.</p>
    <div className="tara-learning__profiles">{LEARNING_PROFILES.map(k=>{const p=r?.profiles?.[k],h=p?.challenger?.holdout;return <details key={k}><summary><b>{names[k]}</b><span>{p?.status==='shadow'?'Forward testing':p?.status==='ready-for-policy-review'?'Ready for review':p?.status==='source-review'?'Source verification needed':'Collecting trusted data'}</span><small>{p?.independentGroups||0} independent windows/events · {p?.forwardGroups||0}/100 forward</small></summary><div>
      <p>{p?.reason||'Waiting for a successful trainer run. No model is active.'}</p><p>Held-out accuracy: {pct(h?.candidate?.accuracy)} · baseline: {pct(h?.baseline?.accuracy)}</p>
      <p>Held-out Brier error: {h?.candidate?.brier?.toFixed(4)||'Not measured'} · baseline: {h?.baseline?.brier?.toFixed(4)||'Not measured'} (lower is better)</p>
      <p>Frozen model: {p?.challenger?.model?.id||'Not enough trustworthy samples yet'}</p><p>Live influence: off. {k==='Sports'?'Sports source records remain visible; they are not presented as independently verified model training.':''}</p>
    </div></details>;})}</div>
    <footer>{r?`Last trainer run: ${new Date(r.generatedAt).toLocaleString()} · dataset ${r.datasetId}`:'No validated registry received yet.'}<br/>Missing observations, old reconstructed features and edited/unverified outcomes are excluded—not counted as losses or sit-outs.</footer>
    {r&&<details><summary>Data exclusions &amp; source health</summary><div>{Object.entries(r.exclusions||{}).map(([reason,n])=><p key={reason}>{reason}: {n}</p>)}{Object.entries(r.sourceHealth||{}).map(([name,s])=><p key={name}>{name}: {s.status}{s.updatedAt?` · ${new Date(s.updatedAt).toLocaleString()}`:''}</p>)}</div></details>}
  </section>;
}
