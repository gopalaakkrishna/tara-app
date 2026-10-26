// Just enough of React for TaraApp's logic to run with no DOM.
//
// One component renders (the generated EngineApp). Hooks keep their slots by
// call order, as in React. setState applies at once and schedules one
// re-render per microtask; an update to the same value is skipped. After each
// render, layout effects then effects whose deps changed run in source order,
// all cleanups before any setup, as React does. Errors in render or effects
// are reported and the loop keeps going, so one bad tick never kills the engine.

let current = null;
const MAX_PASSES = 40;

const depsChanged = (a, b) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));

function slot(init) {
  if (!current) throw new Error('hook called outside the engine render');
  const i = current.index++;
  if (i >= current.hooks.length) current.hooks.push(init());
  return current.hooks[i];
}

function markDirty(root) {
  root.dirty = true;
  if (root.rendering || root.scheduled || root.unmounted) return;
  root.scheduled = true;
  queueMicrotask(() => { root.scheduled = false; root.render(); });
}

export function useState(initial) {
  const root = current;
  const s = slot(() => {
    const st = {value: typeof initial === 'function' ? initial() : initial};
    st.set = (next) => {
      const value = typeof next === 'function' ? next(st.value) : next;
      if (Object.is(value, st.value)) return;
      st.value = value;
      markDirty(root);
    };
    return st;
  });
  return [s.value, s.set];
}

export function useReducer(reducer, initialArg, init) {
  const root = current;
  const s = slot(() => {
    const st = {value: init ? init(initialArg) : initialArg, reducer};
    st.dispatch = (action) => {
      const value = st.reducer(st.value, action);
      if (Object.is(value, st.value)) return;
      st.value = value;
      markDirty(root);
    };
    return st;
  });
  s.reducer = reducer;
  return [s.value, s.dispatch];
}

export function useRef(initial) {
  return slot(() => ({current: initial}));
}

export function useMemo(factory, deps) {
  const s = slot(() => ({deps: undefined, value: undefined, init: false}));
  if (!s.init || depsChanged(s.deps, deps)) { s.value = factory(); s.deps = deps; s.init = true; }
  return s.value;
}

export function useCallback(fn, deps) {
  return useMemo(() => fn, deps);
}

function effect(layout, fn, deps) {
  const root = current;
  const s = slot(() => ({deps: undefined, cleanup: null, init: false}));
  if (!s.init || depsChanged(s.deps, deps)) { s.init = true; s.deps = deps; root.pending.push({s, fn, layout}); }
}
export const useEffect = (fn, deps) => effect(false, fn, deps);
export const useLayoutEffect = (fn, deps) => effect(true, fn, deps);
export const useInsertionEffect = useLayoutEffect;

export function useSyncExternalStore(subscribe, getSnapshot) {
  const [, force] = useState(0);
  const value = getSnapshot();
  useEffect(() => subscribe(() => force((n) => n + 1)), [subscribe]);
  return value;
}
export const useDebugValue = () => {};
export const useDeferredValue = (v) => v;
export const useTransition = () => [false, (fn) => fn()];
let idSeq = 0;
export const useId = () => useMemo(() => `engine-${++idSeq}`, []);
export const useContext = (ctx) => ctx?._value;
export const createContext = (value) => ({_value: value, Provider: () => null, Consumer: () => null});
export const createElement = () => null;
export const Fragment = 'Fragment';
export const memo = (c) => c;
export const forwardRef = (c) => c;
export const startTransition = (fn) => fn();

// Mounts a component. Returns render() and unmount(); onError gets every
// error thrown in render or effects with a label saying where.
export function createRoot(Component, props, {onError = () => {}} = {}) {
  const root = {hooks: [], index: 0, pending: [], dirty: false, scheduled: false, rendering: false, unmounted: false, renders: 0, errors: 0};
  const runEffects = (list) => {
    for (const e of list) if (typeof e.s.cleanup === 'function') {
      try { e.s.cleanup(); } catch (err) { root.errors++; onError(err, 'effect-cleanup'); }
      e.s.cleanup = null;
    }
    for (const e of list) {
      try { const c = e.fn(); e.s.cleanup = typeof c === 'function' ? c : null; } catch (err) { root.errors++; onError(err, 'effect'); }
    }
  };
  root.render = () => {
    if (root.unmounted || root.rendering) return;
    let passes = 0;
    do {
      root.dirty = false;
      root.index = 0;
      root.pending = [];
      current = root;
      root.rendering = true;
      let ok = false;
      try { Component(props); ok = true; } catch (err) { root.errors++; onError(err, 'render'); } finally { root.rendering = false; current = null; }
      root.renders++;
      if (!ok) return; // keep state; the next tick or update renders again
      const pending = root.pending;
      runEffects(pending.filter((e) => e.layout));
      runEffects(pending.filter((e) => !e.layout));
      if (++passes >= MAX_PASSES && root.dirty) {
        onError(new Error(`render loop: ${passes} passes without settling`), 'render-loop');
        root.dirty = false;
        setTimeout(() => root.render(), 250);
        return;
      }
    } while (root.dirty && !root.unmounted);
  };
  root.unmount = () => {
    root.unmounted = true;
    for (const s of root.hooks) if (s && typeof s.cleanup === 'function') { try { s.cleanup(); } catch (err) { onError(err, 'unmount'); } }
  };
  return root;
}

const React = {useState, useReducer, useRef, useMemo, useCallback, useEffect, useLayoutEffect, useInsertionEffect, useSyncExternalStore,
  useDebugValue, useDeferredValue, useTransition, useId, useContext, createContext, createElement, Fragment, memo, forwardRef, startTransition};
export default React;
