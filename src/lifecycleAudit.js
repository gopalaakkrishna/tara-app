export function lifecycleAuditState(record,entries=[],now=Date.now()) {
  const row=entries.find(e=>e?.windowId===record.wid&&(e.asset||'BTC')===(record.asset||'BTC')&&e.id!=null);
  if(row||record.logConfirmedAt!=null)return {diagnosis:'ok',
    logConfirmedAt:record.logConfirmedAt??now,canonicalRowId:row?.id??record.canonicalRowId,
    logResult:record.logResult||'canonical-recorded'};
  if(record.logCalls?.length)return {diagnosis:'log-called-but-not-confirmed'};
  if(record.snapshotSets?.some(s=>s.committed===true))return {diagnosis:'committed-snapshot-without-record'};
  return {diagnosis:record.snapshotSets?.length?'candidate-only-not-committed':'no-commit-attempted'};
}
