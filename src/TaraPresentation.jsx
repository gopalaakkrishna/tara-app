import React from 'react';
import {capturedReason,recordVersion,evidenceCohort} from './presentationEvidence.js';
import {finiteNumber} from './callIntegrity.js';
const fmt=(v,unit='')=>finiteNumber(v)===null?'—':`${Number(v).toFixed(1)}${unit}`;
const time=v=>Number(v)>0?new Date(Number(v)).toLocaleString():'Unavailable';
const seconds=v=>finiteNumber(v)===null?'Unavailable':`${Math.floor(Number(v)/60)}:${String(Math.floor(Number(v)%60)).padStart(2,'0')}`;
export const EvidenceMetrics=({items})=><div className="tara-v145-metrics">{items.map(([label,value,note,tone])=><div key={label}><label>{label}</label><strong className={tone||''}>{value}</strong><small>{note}</small></div>)}</div>;
// The wrapper is always mounted. Changing a visual tab must not remount the
// original panels or reset their observation/confirmation effects.
export function TaraDetailEnvelope({enabled,children,label='All signal panels, detectors & original controls'}) {
  return <details className={enabled?'tara-v145-disclosure':'tara-v145-unwrapped'} open={!enabled}>{enabled&&<summary>{label}</summary>}{children}</details>;
}
export function TaraSignalsSummary({analysis,candidate,lock,orderBook,tapeWindows,smartMoneySignals,qualityGate,deadline}) {
  const buy=Number(orderBook?.localBuy)||0,sell=Number(orderBook?.localSell)||0,total=buy+sell;
  const tape=key=>{const t=tapeWindows?.[key];return (Number(t?.buys)||0)+(Number(t?.sells)||0)>0?`${Math.round(Number(t.buyPct)||0)}% buy · ${t.side||'mixed'}`:'Waiting for tape';};
  const smart=Object.entries(smartMoneySignals||{}).filter(([,s])=>s?.detected).map(([n,s])=>`${n==='pinning'?'PIN':n==='retailCrowd'?'FADE':n==='kalshiSpot'?'DIV':'ABSORB'} ${s.side||''}`.trim());
  return <div className="tara-v145-analysis-grid"><section><h3>Tape &amp; depth</h3><p><span>30-second tape</span><b>{tape('w30')}</b></p><p><span>60-second tape</span><b>{tape('w60')}</b></p><p><span>Order-book bids</span><b>{total?`${Math.round(buy/total*100)}% bid`:'Waiting for depth'}</b></p><p><span>Smart money</span><b>{smart.join(' · ')||'No active detector'}</b></p><small>Live observations, not captured Call results or exchange positions.</small></section><section><h3>Trend &amp; timing</h3><p><span>Regime</span><b>{analysis?.regime||'Unavailable'}</b></p><p><span>Multi-timeframe alignment</span><b>{fmt(analysis?.mtfAlignment,' / 4')}</b></p><p><span>Window quality</span><b>{fmt(qualityGate?.score,' / 100')}</b></p><p><span>Live candidate score</span><b>{fmt(candidate?.confidence,' / 100')}</b></p><p><span>Entry deadline</span><b>{seconds(deadline)} remaining</b></p><p><span>Actual Call</span><b>{lock?.tradeable?`${lock.dir} · locked`:lock?.satOut?'SIT OUT':'Not committed'}</b></p><small>{candidate?.blockedDecision?.reason||candidate?.reason||'Waiting for signal evidence.'}</small></section></div>;
}
export function RecordInspector({entry,onClose,title='Original decision'}) {
  const dialog=React.useRef(null);
  React.useEffect(()=>{if(entry)dialog.current?.showModal();else dialog.current?.close();},[entry]);
  if(!entry)return null;
  const o=entry.originalDecision,a=entry.approval,b=o?.blockedDecision||entry.blockedDecision;
  return <dialog ref={dialog} className="tara-v145-inspector" aria-label={title} onClose={onClose} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}>
    <div className="tara-v145-inspector__head"><span>{title}</span><button type="button" aria-label="Close decision details" onClick={()=>dialog.current?.close()}>×</button></div>
    <div className="tara-v145-inspector__body"><h2>{o?.direction||entry.dir||entry.side||'Decision'} · {entry.result||(entry.won===true?'WIN':entry.won===false?'LOSS':'Pending')}</h2>
      <p>Captured version {recordVersion(entry)} · {o?.asset||entry.asset||'BTC'} · {entry.windowType||(a?'hourly':'15m')}</p>
      <EvidenceMetrics items={[
        ['Signal confidence',fmt(o?.signalScore??entry.conf??entry.confidence,' / 100'),'Captured score, not probability'],
        ['Captured at',time(o?.lockedAt??a?.at??entry.ms),'Original timestamp'],
        ['Remaining',seconds(o?.secondsLeft??(entry.minsAtLock==null?null:entry.minsAtLock*60)),'At the original decision'],
      ]}/>
      <h3>{b?'Captured blocker':'Captured reason'}</h3><p className="tara-v145-reason">{a?'Hourly approval captured with fresh observations.':capturedReason(entry)}</p>
      <div className="tara-v145-evidence-rows">
        <p><span>Market</span><b>{o?.marketTicker||entry.marketTicker||entry.ticker||'Not captured'}</b></p>
        <p><span>Original capture</span><b>{o?.provenance|| (a?'Hourly approval preserved':'Legacy / unavailable')}</b></p>
        <p><span>YES bid / ask</span><b>{o?`${fmt(o.yesBid,'¢')} / ${fmt(o.yesAsk,'¢')}`:a?`${fmt(a.quote?.bid,'¢')} / ${fmt(a.quote?.ask,'¢')}`:'Not captured'}</b></p>
        {b&&<><p><span>Gate</span><b>{b.code||b.gate?.code||'Unavailable'}</b></p><p><span>Observed / required</span><b>{fmt(b.gate?.observedConfidence??b.gate?.confidence)} / {fmt(b.gate?.requiredConfidence)}</b></p></>}
        {a&&<><p><span>Fresh confirmations</span><b>{a.samples?.length||0} · {fmt(a.spanMs/1000,'s')} span</b></p><p><span>Chosen-side model / price</span><b>{fmt(a.probabilitySide,'%')} / {fmt(a.cost,'¢')}</b></p><p><span>Fee / estimated net edge</span><b>{fmt(a.feeCents,'¢')} / {fmt(a.netEdgeCents,'¢')}</b></p></>}
        <p><span>Official result</span><b>{entry.officialSettlement?`${entry.officialSettlement.result||'Unknown'} · ${entry.officialSettlement.source}`:entry.kalshiResult?String(entry.kalshiResult):entry.result==='SITOUT'?'Sit-out finalized':'Not available; pending or legacy'}</b></p>
        {entry.manualEdit&&<p><span>Record revision</span><b>Amended row; original capture shown above</b></p>}
      </div>
      {(a?.samples?.length>0)&&<details className="tara-v145-disclosure"><summary>Captured sample sequence</summary><div>{a.samples.map((s,i)=><p key={i}>{i+1} · quote {time(s.quoteAt)} · spot {time(s.spotAt)} · signal {fmt(s.confidence)} · estimated edge {fmt(s.netEdgeCents,'¢')}</p>)}</div></details>}
      <p className="tara-v145-note">This inspector reads the retained evidence. It does not change a record or place an order.</p>
    </div>
  </dialog>;
}
export function RecordVersionFilter({entries,value,onChange}) {
  const versions=[...new Set((entries||[]).map(recordVersion))].sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
  return <label className="tara-v145-version-filter">Version <select aria-label="Recorded version" value={value} onChange={e=>onChange(e.target.value)}><option value="all">All versions</option>{versions.map(v=><option key={v} value={v}>{v==='Unknown'?v:`v${v}`}</option>)}</select></label>;
}
export function TaraEvidenceAnalytics({entries,asset='BTC',windowType='15m'}) {
  const [version,setVersion]=React.useState('all');
  const scope=React.useMemo(()=>(entries||[]).filter(e=>(e.asset||'BTC')===asset&&(e.windowType||'15m')===windowType),[entries,asset,windowType]);
  const c=React.useMemo(()=>evidenceCohort(scope,{version}),[scope,version]);
  return <div className="tara-v145-analytics"><div className="tara-v145-filter-row"><span>{asset} · {windowType} · retained Call records</span><RecordVersionFilter entries={scope} value={version} onChange={setVersion}/></div>
    <EvidenceMetrics items={[
      ['Win rate',c.winRate===null?'—':`${c.winRate.toFixed(1)}%`,`${c.wins} wins / ${c.settled} settled directional Calls`],
      ['Estimated return',c.estimatedNet===null?'Unavailable':`${c.estimatedNet>=0?'+':''}${c.estimatedNet.toFixed(1)}¢`,`${c.priced} verified captures · per contract after estimated fees`],
      ['Record coverage',`${c.rows.length}`,`${c.sitouts} sit-outs · ${c.pending} directional pending`],
      ['Evidence',`${c.settled} Calls`,'Selected version and window; retained records'],
    ]}/>
    <p className="tara-v145-reason">Win rate alone does not establish positive returns. The return estimate uses original executable quotes and matching official settlements, excludes amended rows, and is not AutoTrade P&amp;L.</p>
    <div className="tara-v145-analysis-grid"><section><h3>Confidence vs observed wins</h3>{c.confidence.length?<div className="tara-v145-confidence-bars">{c.confidence.map(g=><div key={g.label}><span>{g.label} <small>n={g.n}</small></span><div><i style={{width:`${g.wins/g.n*100}%`}}/></div><b>{Math.round(g.wins/g.n*100)}%</b></div>)}</div>:<p>No settled captured scores in this cohort.</p>}<small>Signal confidence is a score. Observed win rate is measured separately.</small></section>
      <section><h3>Lock timing</h3>{c.timing.length?c.timing.map(g=><p key={g.label}><span>{g.label}</span><b>{g.wins}W · {g.n-g.wins}L</b></p>):<p>No settled captures yet.</p>}<small>Use comparable versions and sample counts before changing timing.</small></section>
      <section><h3>Sit-out reasons</h3>{c.blockers.length?c.blockers.map(b=><details key={b.code}><summary>{b.code.replaceAll('-',' ')} <b>{b.n}</b></summary><p>{b.reason}</p></details>):<p>No captured sit-outs in this cohort.</p>}</section>
      <section><h3>Version comparison</h3>{evidenceCohort(scope).versions.map(([v,n])=><p key={v}><span>{v==='Unknown'?'Version unavailable':`v${v}`}</span><b>{n} records</b></p>)}<small>Original versions are retained. Empty or missing evidence remains unavailable.</small></section>
    </div>
  </div>;
}
export function TaraBrainSummary({snapshot,candidate,analysis,lock}) {
  const committed=lock?.committed,dir=lock?.tradeable?lock.dir:lock?.satOut?'SIT OUT':'Scanning';
  const reason=committed?capturedReason(snapshot):candidate?.blockedDecision?.reason||candidate?.reason||'Waiting for market evidence.';
  const original=snapshot?.originalDecision;
  return <div className="tara-v145-brain-summary"><section className="tara-v145-brain-hero"><small>{committed?'Captured Call':'Current candidate'} · {dir}</small><h3>{reason}</h3><p>{committed?'The original direction, reason and evidence remain fixed while live signals continue to change.':'The candidate has not become a committed Call.'}</p></section>
    <div className="tara-v145-analysis-grid"><section><h3>{lock?.satOut?'Why Tara sat out':lock?.tradeable?'Why the Call qualified':'Current gate'}</h3><p><span>Signal confidence</span><b>{fmt(committed?(original?.signalScore??lock.confidence):candidate?.confidence,' / 100')}</b></p><p><span>Captured at</span><b>{committed?time(original?.lockedAt??snapshot?.lockedAt):'Not captured'}</b></p><p><span>Time left at capture</span><b>{committed?seconds(original?.secondsLeft??snapshot?.atSecondsLeft):'Not captured'}</b></p><p><span>Market</span><b>{original?.marketTicker||snapshot?.marketTicker||'Not captured'}</b></p></section>
      <section><h3>Live evidence now</h3><p><span>Regime</span><b>{analysis?.regime||'Unavailable'}</b></p><p><span>Trend alignment</span><b>{fmt(analysis?.mtfAlignment,' / 4')}</b></p><p><span>Prediction</span><b>{analysis?.prediction||'Waiting for evidence'}</b></p><small>Live evidence is context; it does not revise the captured Call.</small></section></div>
  </div>;
}
export function HourlyApprovalSummary({locks,candidate,status,samples,required}) {
  const [inspected,setInspected]=React.useState(null),pick=locks?.[0]||candidate;
  return <div className="tara-v145-hourly-summary"><div className="tara-v145-panel-head"><h3>{locks?.length?'Current hourly picks':'Hourly confirmation'}</h3><span>{locks?.length?`${locks.length} open`:'Candidate only'}</span></div>
    <div className="tara-v145-hourly-hero"><div><small>{pick?`BTC ${pick.side==='YES'?'above':'below'} $${Number(pick.strike).toLocaleString()} · ${pick.closeMs?new Date(pick.closeMs).toLocaleTimeString():''}`:'Waiting for a qualifying contract'}</small><h3>{pick?<><span className={pick.side==='YES'?'is-up':'is-down'}>{pick.side}</span> at {fmt(pick.cost,'¢')}</>:'No approved pick'}</h3><p role="status">{locks?.length?'Current scan: ':''}{status?.reason}</p><div className="tara-v145-pick-metrics"><div><label>Signal confidence</label><b>{fmt(pick?.conf,' /100')}</b></div><div><label>Chosen-side model</label><b>{fmt(pick?.approval?.probabilitySide??pick?.probabilitySide,'%')}</b></div><div><label>Est. edge after fee</label><b>{fmt(pick?.approval?.netEdgeCents??pick?.netEdgeCents,'¢')}</b></div></div></div>
      <div><h4>{locks?.length?'Captured confirmation':'Fresh observations'}</h4><div className="tara-v145-confirmations">{(pick?.approval?.samples||samples||[]).map((s,i)=><div key={`${s.quoteId||i}`}><b>{i+1}</b><small>{time(s.quoteAt)}</small><span>New quote + spot</span></div>)}</div><p>{locks?.length?`${pick?.approval?.samples?.length||0} captured samples · ${fmt((pick?.approval?.spanMs||0)/1000,'s')} span`:`${samples?.length||0} / ${required||3} fresh samples`}</p>{locks?.length&&<button type="button" onClick={()=>setInspected(pick)}>Inspect captured approval ↗</button>}</div></div>
    {(locks?.length>1)&&<div className="tara-v145-other-hourly">{locks.slice(1).map((p,i)=><button key={`${p.ticker}-${p.side}-${i}`} onClick={()=>setInspected(p)}>{p.side} · ${Number(p.strike).toLocaleString()} · {fmt(p.cost,'¢')} · inspect ↗</button>)}</div>}
    <RecordInspector entry={inspected} onClose={()=>setInspected(null)} title="Hourly approval"/>
  </div>;
}
