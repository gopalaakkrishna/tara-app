// The hourly headline describes the retained rolling history, not lifetime totals.
// Keep this pure so storage hydration and settlement use the same count rule.
export function normalizeHourlyRecord(record, cap = 500) {
  const history = Array.isArray(record?.history) ? record.history.slice(-cap) : [];
  return {
    ...record,
    w: history.length ? history.filter(entry => entry?.won === true).length : (record?.w | 0),
    l: history.length ? history.filter(entry => entry?.won === false).length : (record?.l | 0),
    pending: Array.isArray(record?.pending) ? record.pending : [],
    history,
  };
}
