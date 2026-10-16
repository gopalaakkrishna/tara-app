import {callKey} from './callIntegrity.js';

// Compare the actual published records, not just count/id/W-L totals. Key order
// and row order are immaterial; all result, blocker and correction fields count.
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().filter(key => value[key] !== undefined)
      .map(key => [key, canonical(value[key])]));
  return value;
};
export function callLogSyncSignature(entries, project = entry => entry) {
  return JSON.stringify((Array.isArray(entries) ? entries : []).filter(Boolean)
    .map(entry => [callKey(entry), entry.id ?? null, canonical(project(entry))])
    .sort((a,b) => a[0].localeCompare(b[0]) || (Number(a[1]) || 0) - (Number(b[1]) || 0)));
}

// Pending is legitimate data, not a reason to rewrite an identical multi-MB
// document. Compare the exact capped/projected payload, including originals,
// blockers and settlement evidence, rather than only IDs or W/L counts.
export function callLogCloudPayload(cloudEntries, localEntries, merge, project, cap, now=Date.now()) {
  const entries=merge(cloudEntries,localEntries).slice(-cap).map(project);
  if(callLogSyncSignature(entries)===callLogSyncSignature(cloudEntries.map(project)))return null;
  return {entries,_strippedAt:now};
}

// Keep the legacy axes for older peers; add sit-out finalization and evidence
// timestamps so a same-window update can wake a catch-up reader too.
export function callLogSyncStatus(entries) {
  let resolved=0,finalized=0,maxId=0,count=0,evidenceAt=0;
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry) continue;
    count++;
    if (entry.result==='WIN'||entry.result==='LOSS') resolved++;
    if (['WIN','LOSS','SITOUT','NO_TRADE'].includes(entry.result)) finalized++;
    maxId=Math.max(maxId,Number(entry.id)||0);
    evidenceAt=Math.max(evidenceAt,Number(entry.resolvedAt)||0,Number(entry.manualEditedAt)||0,
      Number(entry.blockedDecision?.observedAt)||0,Number(entry.officialSettlement?.verifiedAt)||0,
      Number(entry.originalDecision?.capturedAt)||0,
      ...(Array.isArray(entry.recordRevisions)?entry.recordRevisions:[]).map(revision=>Number(revision?.at)||0));
  }
  return {resolved,finalized,maxId,count,evidenceAt};
}
