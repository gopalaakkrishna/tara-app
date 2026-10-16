// Recovery is scoped to optimistic document writes, never exchange requests.
// Re-read and re-merge on every retry: an interrupted PATCH may have committed.
export function boundedCloudWriteQuery(query, signal=AbortSignal.timeout(15000)) {
  // Abort the underlying fetch, not only a Promise.race that leaves an old
  // request running behind the next CAS. Its result remains unacknowledged.
  return query.abortSignal(signal);
}
export function cloudWriteRetryDelay(error, failures) {
  const code=String(error?.code||'');
  const message=String(error?.message||error||'');
  const transient=['57014','55P03','40001','40P01'].includes(code)||
    /statement timeout|lock timeout|timed? ?out|Failed to fetch|network|fetch failed|HTTP (502|503|504|520)/i.test(message);
  if(!transient)return 60000;
  // Three bounded fast recoveries, then the ordinary minute cadence. Do not
  // hammer a struggling database or weaken its statement/security limits.
  return [1500,5000,15000][Math.max(0,failures-1)]??60000;
}
