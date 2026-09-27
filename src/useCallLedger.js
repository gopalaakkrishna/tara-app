import {useState, useCallback, useRef} from 'react';
import {normalizeCallLedger} from './callIntegrity.js';

export function useCallLedger(initializer, getSnapshot) {
  const snapshotReader = useRef(getSnapshot);
  snapshotReader.current = getSnapshot;
  const [entries, setEntries] = useState(() => normalizeCallLedger(initializer()));
  const update = useCallback(action => setEntries(previous => {
    const next = typeof action === 'function' ? action(previous) : action;
    if (next === previous) return previous;
    return normalizeCallLedger(next, previous, snapshotReader.current?.());
  }), []);
  return [entries, update];
}
