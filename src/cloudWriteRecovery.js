// Recovery is scoped to optimistic document writes, never exchange requests.
// Re-read and re-merge on every retry: an interrupted PATCH may have committed.
export function boundedCloudWriteQuery(query, signal=AbortSignal.timeout(15000)) {
  // Abort the underlying fetch, not only a Promise.race that leaves an old
  // request running behind the next CAS. Its result remains unacknowledged.
  return query.abortSignal(signal);
}
// Failures that keep repeating back off to this ceiling. On Oct 26 a 9 MB call
// log PATCH timed out 248 times in six hours at the old fixed one-minute
// cadence; each attempt was written to disk and rolled back, which drained the
// Supabase Disk IO budget and restarted the database three times.
export const CLOUD_WRITE_MAX_RETRY_MS=30*60000;
const doubling=(n)=>Math.min(CLOUD_WRITE_MAX_RETRY_MS,60000*2**Math.max(0,n));
export function cloudWriteRetryDelay(error, failures) {
  const code=String(error?.code||'');
  const message=String(error?.message||error||'');
  const transient=['57014','55P03','40001','40P01'].includes(code)||
    /statement timeout|lock timeout|timed? ?out|Failed to fetch|network|fetch failed|HTTP (502|503|504|520)/i.test(message);
  if(!transient)return doubling(failures-1);
  // Three bounded fast recoveries, then a doubling minute cadence. Do not
  // hammer a struggling database or weaken its statement/security limits.
  return [1500,5000,15000][Math.max(0,failures-1)]??doubling(failures-4);
}
