// Generates server/engine/src/generated/engine-app.js: the slice of TaraApp
// (src/App.jsx) that makes BTC 15-minute Calls, as a hook component the
// engine's mini React runtime (src/runtime/react.js) renders on Cloudflare.
//
// The slice is found automatically, not by line numbers:
//   1. seed with the four decision blocks (analysis, taraCall, commit/seal,
//      the Call lifecycle effect);
//   2. add the declaration of every TaraApp binding the kept code reads;
//   3. add every TaraApp statement that WRITES a ref or state the kept code
//      reads (rollover, window tracking, the feeds, small sync effects);
//   4. repeat until nothing changes.
// UI handlers, cloud restore/sync, positions, money and alert sound are never
// pulled in; the build fails if a kept statement can place orders or post to
// Discord. Cloud writes reached through App.jsx helpers become no-ops (shadow
// mode), and the lock publisher and alert sound get server stand-ins.
//
// Run from server/engine after `npm ci`:  node scripts/build-app.mjs
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join, posix} from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const outDir = join(here, '..', 'src', 'generated');
const app = readFileSync(join(repo, 'src', 'App.jsx'), 'utf8');
const ast = parse(app, {sourceType: 'module', plugins: ['jsx']});

const JS_GLOBALS = new Set(['Array', 'Object', 'Number', 'String', 'Math', 'Set', 'Map', 'JSON', 'Boolean', 'Date', 'console', 'Intl',
  'parseFloat', 'parseInt', 'isNaN', 'isFinite', 'Infinity', 'NaN', 'undefined', 'Promise', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'RegExp',
  'Symbol', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'structuredClone', 'encodeURIComponent', 'decodeURIComponent', 'escape', 'unescape',
  'AbortSignal', 'AbortController', 'performance', 'BigInt', 'WeakMap', 'WeakSet', 'WeakRef', 'globalThis', 'queueMicrotask', 'Response', 'Request', 'Headers',
  'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'crypto', 'atob', 'btoa', 'Uint8Array', 'Int8Array', 'Uint16Array', 'Int32Array', 'Uint32Array',
  'Float32Array', 'Float64Array', 'ArrayBuffer', 'DataView', 'Reflect', 'Proxy', 'arguments', 'Blob', 'FormData', 'Event', 'CustomEvent', 'EventTarget']);
// Provided by src/runtime/browser.js (server stand-ins); never the real thing.
const BROWSER = new Set(['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location', 'fetch', 'indexedDB', 'BroadcastChannel',
  'WebSocket', 'Notification', 'Audio', 'AudioContext', 'webkitAudioContext', 'alert', 'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame', 'Image', 'matchMedia', 'getComputedStyle', 'screen']);
// Statements that must never run on the server.
const EXCLUDE_NAME = /^(handle[A-Z]|executeAction|setCurrentAsset|handleWindowToggle|forceResyncFromCloud|applyBaseline|_completeSharedRestore|_applySharedDecision|handleSoundToggle|_runEntry|_runExit|_lockCloudPath)$/;
const FORBIDDEN_CODE = /\b(kalshiPlaceOrder|kalshiRunEntryLadder|kalshiAuthedFetch|_runEntry|_runExit|discord\.com\/api\/webhooks|broadcastToDiscord|sendDiscord)\b/;
// App.jsx top-level helpers replaced on the server. Shadow mode: no cloud writes.
const TOP_OVERRIDES = {
  cloudSupabaseRead: 'const cloudSupabaseRead=(path,opts={})=>__server.cloudRead(SUPABASE_URL,SUPABASE_ANON_KEY,path,opts);',
  cloudSupabaseWatch: "const cloudSupabaseWatch=(path,callback)=>(!path||typeof callback!=='function'||_NO_REALTIME_PATHS.has(path))?()=>{}:__server.cloudPoll(SUPABASE_URL,SUPABASE_ANON_KEY,path,callback);",
  cloudSupabaseWrite: "const cloudSupabaseWrite=(path)=>__server.droppedWrite('write',path).then(()=>true);",
  cloudSupabaseDelete: "const cloudSupabaseDelete=(path)=>__server.droppedWrite('delete',path).then(()=>true);",
  cloudSupabaseWriteDebouncedRMW: "const cloudSupabaseWriteDebouncedRMW=(path)=>{__server.droppedWrite('rmw',path);};",
  cloudWrite: "const cloudWrite=(path)=>__server.droppedWrite('write',path).then(()=>true);",
  cloudDelete: "const cloudDelete=(path)=>__server.droppedWrite('delete',path).then(()=>true);",
  cloudWriteDebounced: "const cloudWriteDebounced=(path)=>{__server.droppedWrite('debounced',path);};",
  cloudWriteDebouncedRMW: "const cloudWriteDebouncedRMW=(path)=>{__server.droppedWrite('rmw',path);};",
};
// TaraApp statements given server stand-ins in place (same position, so TDZ order holds).
const STATEMENT_STANDINS = {
  playAlert: 'const playAlert=(...args)=>{__engine.onAlert?.(...args);};',
  _persistLock: 'const _persistLock=()=>{__engine.onPersistLock?.(taraCallSnapshotRef.current);};',
  // The browser waits for the shared (cross-device) lock before committing. The
  // server decides on its own, so the shared-restore gate is always open.
  _cloudRestoreCompletedRef: 'const _cloudRestoreCompletedRef={get current(){return true;},set current(v){}};',
};

// ---------- top level ----------
const top = new Map(), imports = new Map();
for (const st of ast.program.body) {
  if (st.type === 'ImportDeclaration') for (const s of st.specifiers) imports.set(s.local.name, {source: st.source.value, imported: s.type === 'ImportDefaultSpecifier' ? 'default' : s.type === 'ImportNamespaceSpecifier' ? '*' : s.imported.name});
  if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier') top.set(d.id.name, {pos: d.start, mutable: st.kind !== 'const', code: `${st.kind} ${d.id.name}=${d.init ? app.slice(d.init.start, d.init.end) : 'undefined'};`});
  if (st.type === 'FunctionDeclaration') top.set(st.id.name, {pos: st.start, mutable: false, code: app.slice(st.start, st.end)});
  if (st.type === 'ClassDeclaration') top.set(st.id.name, {pos: st.start, mutable: false, code: app.slice(st.start, st.end)});
}
for (const [n, code] of Object.entries(TOP_OVERRIDES)) if (top.has(n)) top.set(n, {pos: top.get(n).pos, mutable: false, code, override: true});
// Small in-place edits to App.jsx helpers that otherwise run unchanged. The
// build fails if the original text moves, so a website change cannot silently
// skip one.
const TOP_PATCHES = {
  // Marks the watch's first read as the ledger hydrate (see runtime/server.js).
  cloudWatch: [["cloudSupabaseRead(path,{throwOnError:path.startsWith('state/currentLock_')})", "cloudSupabaseRead(path,{throwOnError:path.startsWith('state/currentLock_'),hydrate:true})"]],
};
for (const [n, edits] of Object.entries(TOP_PATCHES)) {
  const t = top.get(n);
  if (!t) throw new Error(`patch target ${n} not found`);
  for (const [from, to] of edits) { if (!t.code.includes(from)) throw new Error(`patch for ${n} no longer matches App.jsx: ${from}`); t.code = t.code.replace(from, to); }
}

// ---------- TaraApp statements ----------
const tara = ast.program.body.find((s) => s.type === 'FunctionDeclaration' && s.id?.name === 'TaraApp');
const stmts = tara.body.body.map((st, i) => ({i, st, line: st.loc.start.line, code: app.slice(st.start, st.end)}));
const declares = new Map(), names = new Map(), refs = new Set(), setterOf = new Map();
for (const s of stmts) {
  const st = s.st;
  const own = [];
  if (st.type === 'VariableDeclaration') for (const d of st.declarations) {
    if (d.id.type === 'Identifier') own.push(d.id.name);
    else if (d.id.type === 'ArrayPattern') d.id.elements.forEach((e) => e?.type === 'Identifier' && own.push(e.name));
    else if (d.id.type === 'ObjectPattern') d.id.properties.forEach((p) => p.value?.type === 'Identifier' && own.push(p.value.name));
    if (d.init?.type === 'CallExpression' && d.init.callee.name === 'useRef' && d.id.type === 'Identifier') refs.add(d.id.name);
    if (d.init?.type === 'CallExpression' && ['useState', 'useCallLedger', 'useReducer'].includes(d.init.callee.name) && d.id.type === 'ArrayPattern' && d.id.elements[0] && d.id.elements[1]) setterOf.set(d.id.elements[1].name, d.id.elements[0].name);
  }
  if (st.type === 'FunctionDeclaration') own.push(st.id.name);
  own.forEach((n) => declares.set(n, s.i));
  names.set(s.i, own);
}
function analyse(code) {
  const reads = new Set(), writes = new Set();
  const a = parse(`function __s(){${code}\n}`, {sourceType: 'script', plugins: ['jsx'], allowReturnOutsideFunction: true});
  const rootRef = (node) => { let n = node; while (n && (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression')) { if (n.object.type === 'Identifier' && n.property?.name === 'current' && !n.computed) return n.object.name; n = n.object; } return null; };
  traverse(a, {
    ReferencedIdentifier(p) { if (!p.scope.hasBinding(p.node.name, true)) reads.add(p.node.name); },
    AssignmentExpression(p) { const r = rootRef(p.node.left); if (r && !p.scope.hasBinding(r, true)) writes.add(r); },
    UpdateExpression(p) { const r = rootRef(p.node.argument); if (r && !p.scope.hasBinding(r, true)) writes.add(r); },
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type === 'Identifier' && setterOf.has(c.name) && !p.scope.hasBinding(c.name, true)) writes.add(setterOf.get(c.name));
      if (c.type === 'MemberExpression' && ['push', 'splice', 'shift', 'unshift', 'pop', 'set', 'delete', 'clear'].includes(c.property?.name)) { const r = rootRef(c.object); if (r && !p.scope.hasBinding(r, true)) writes.add(r); }
    },
  });
  return {reads, writes};
}
const info = stmts.map((s) => (s.st.type === 'ReturnStatement' ? {reads: new Set(), writes: new Set()} : analyse(s.code)));
const STANDIN_NAMES = new Set(Object.keys(STATEMENT_STANDINS));
const nameExcluded = new Set();
for (const s of stmts) if (names.get(s.i).some((n) => EXCLUDE_NAME.test(n))) names.get(s.i).forEach((n) => nameExcluded.add(n));
const excluded = (i) => {
  const s = stmts[i];
  if (s.st.type === 'ReturnStatement') return 'render-return';
  const own = names.get(i);
  if (own.some((n) => STANDIN_NAMES.has(n))) return 'standin';
  if (own.some((n) => EXCLUDE_NAME.test(n))) return `excluded-name:${own.join(',')}`;
  if (FORBIDDEN_CODE.test(s.code)) return 'forbidden-code';
  const uses = [...info[i].reads].filter((n) => nameExcluded.has(n));
  if (uses.length) return `uses-excluded:${uses.join(',')}`;
  return null;
};
const between = (a) => { const s = app.indexOf(a); if (s < 0) throw new Error(`marker not found: ${a}`); return s + a.length - a.trimStart().length; };
const seedPos = [
  (() => { let p = -1; traverse(ast, {VariableDeclarator(x) { if (x.node.id.name === 'analysis' && x.node.init?.callee?.name === 'useMemo') p = x.node.start; }}); return p; })(),
  between('  const taraCall=(()=>{'), between('  const _prepareCallCommit='), between('  const _sealCallSnapshot='),
  (() => { let p = -1; traverse(ast, {CallExpression(x) { const n = x.node; if (n.callee.name !== 'useEffect' || n.arguments[0]?.type !== 'ArrowFunctionExpression') return; const b = n.arguments[0].body, t = app.slice(b.start + 1, b.end - 1); if (t.includes("const isCall=tc.call==='UP'||tc.call==='DOWN';") && t.includes('const _noteGateHold=')) p = n.start; }}); return p; })(),
];
if (seedPos.some((p) => p < 0)) throw new Error('decision block markers not found');
const stmtAt = (pos) => stmts.find((s) => pos >= s.st.start && pos <= s.st.end)?.i;
const keep = new Set(), skipped = new Map();
let frontier = seedPos.map(stmtAt);
if (frontier.some((i) => i === undefined)) throw new Error('decision block is not a TaraApp statement');
const writersOf = new Map();
info.forEach((inf, i) => inf.writes.forEach((w) => { if (!writersOf.has(w)) writersOf.set(w, []); writersOf.get(w).push(i); }));
while (frontier.length) {
  const next = [];
  for (const i of frontier) {
    if (keep.has(i)) continue;
    keep.add(i);
    for (const n of info[i].reads) {
      const d = declares.get(n);
      if (d !== undefined && !keep.has(d)) { const why = excluded(d); if (why) { skipped.set(n, why); } else next.push(d); }
      for (const w of writersOf.get(n) || []) if (!keep.has(w)) { const why = excluded(w); if (why) skipped.set(`writer of ${n} @${stmts[w].line}`, why); else next.push(w); }
    }
  }
  frontier = next;
}
// Stand-ins for excluded statements that kept code still needs.
const standins = new Map();
for (const [name] of Object.entries(STATEMENT_STANDINS)) {
  const i = declares.get(name);
  if (i === undefined) continue;
  const needed = [...keep].some((k) => info[k].reads.has(name));
  if (!needed) continue;
  if (names.get(i).length !== 1) throw new Error(`stand-in ${name} shares a statement with ${names.get(i).join(',')}`);
  standins.set(i, STATEMENT_STANDINS[name]);
  keep.add(i);
  info[i] = analyse(STATEMENT_STANDINS[name]);
  for (const n of info[i].reads) if (declares.has(n) && !keep.has(declares.get(n))) throw new Error(`stand-in ${name} reads ${n}, which the slice does not keep`);
}
const kept = [...keep].sort((a, b) => a - b);
for (const i of kept) if (!standins.has(i) && FORBIDDEN_CODE.test(stmts[i].code)) throw new Error(`kept statement @${stmts[i].line} contains order/Discord code`);

// ---------- module-level closure ----------
const selected = new Set(), selectedTop = [], neededImports = new Map(), browserUsed = new Set(), unresolved = new Set();
const keptBindings = new Set(kept.flatMap((i) => names.get(i)));
function need(name, from) {
  if (JS_GLOBALS.has(name) || keptBindings.has(name)) return;
  if (BROWSER.has(name)) { browserUsed.add(name); return; }
  if (imports.has(name)) { neededImports.set(name, imports.get(name)); return; }
  if (top.has(name)) { selectTop(name); return; }
  if (name === '__engine' || name === '__server') return;
  unresolved.add(`${name} (from ${from})`);
}
function selectTop(name) {
  if (selected.has(name)) return;
  selected.add(name);
  const t = top.get(name);
  for (const n of analyse(t.code).reads) if (n !== name) need(n, `top ${name}`);
  selectedTop.push(name);
}
for (const i of kept) for (const n of info[i].reads) need(n, `TaraApp @${stmts[i].line}`);
const blockingUnresolved = [...unresolved].filter((u) => !/^(clockSeconds) /.test(u));
if (blockingUnresolved.length) throw new Error(`unresolved names: ${blockingUnresolved.join('; ')}`);
for (const n of selectedTop) if (!top.get(n).override && FORBIDDEN_CODE.test(top.get(n).code)) throw new Error(`top-level ${n} contains order/Discord code`);

// ---------- vendor modules ('react' -> the engine's runtime) ----------
const vendorDone = new Map();
function vendor(spec, fromDir) {
  const rel = posix.normalize(posix.join(fromDir, spec)).replace(/^\.\//, '');
  if (vendorDone.has(rel)) return;
  const file = join(repo, 'src', rel);
  if (!existsSync(file)) throw new Error(`vendor module missing: ${rel}`);
  let code = readFileSync(file, 'utf8');
  const depth = rel.split('/').length;
  const runtimePath = `${'../'.repeat(depth + 1)}runtime/react.js`; // from src/generated/vendor/<rel>
  const mast = parse(code, {sourceType: 'module', plugins: ['jsx']});
  for (const st of mast.program.body) if (st.type === 'ImportDeclaration' && st.source.value !== 'react') {
    if (!st.source.value.startsWith('.')) throw new Error(`${rel} imports package ${st.source.value}`);
    if (/\.(css|jsx)(\?|$)/.test(st.source.value)) throw new Error(`${rel} imports ${st.source.value}`);
    vendor(st.source.value, posix.dirname(rel));
  }
  if (FORBIDDEN_CODE.test(code)) throw new Error(`vendored ${rel} contains order/Discord code`);
  // Browser globals a module uses directly (fetch, sessionStorage, ...) must be
  // the server stand-ins too, or they would skip the routing and the guard.
  const globalsUsed = new Set(), unknown = new Set();
  traverse(mast, {ReferencedIdentifier(p) {
    const n = p.node.name;
    if (p.scope.hasBinding(n, true)) return;
    if (BROWSER.has(n)) globalsUsed.add(n); else if (!JS_GLOBALS.has(n) && n !== 'React') unknown.add(n);
  }});
  if (unknown.size) throw new Error(`vendored ${rel} uses unknown globals: ${[...unknown].join(', ')}`);
  code = code.replace(/from\s+['"]react['"]/g, `from '${runtimePath}'`);
  if (globalsUsed.size) code = `import {${[...globalsUsed].sort().join(', ')}} from '${runtimePath.replace('react.js', 'browser.js')}';\n${code}`;
  vendorDone.set(rel, code);
}
for (const [, {source}] of neededImports) {
  if (source === 'react') continue;
  if (!source.startsWith('.')) throw new Error(`App.jsx import of package ${source} reached by the engine slice`);
  vendor(source, '.');
}

// ---------- emit ----------
mkdirSync(join(outDir, 'vendor'), {recursive: true});
for (const [rel, code] of vendorDone) { mkdirSync(dirname(join(outDir, 'vendor', rel)), {recursive: true}); writeFileSync(join(outDir, 'vendor', rel), code); }
const bySource = new Map();
for (const [local, {source, imported}] of neededImports) {
  const src = source === 'react' ? '../runtime/react.js' : `./vendor/${posix.normalize(source).replace(/^\.\//, '')}`;
  if (!bySource.has(src)) bySource.set(src, {named: [], def: null});
  const e = bySource.get(src);
  if (imported === 'default') e.def = local; else if (imported === '*') e.ns = local; else e.named.push(imported === local ? local : `${imported} as ${local}`);
}
const importLines = [...bySource].map(([src, e]) => {
  const parts = [];
  if (e.def) parts.push(e.def);
  if (e.ns) parts.push(`* as ${e.ns}`);
  if (e.named.length) parts.push(`{${e.named.join(', ')}}`);
  return `import ${parts.join(', ')} from '${src}';`;
});
const browserImport = browserUsed.size ? `import {${[...browserUsed].sort().join(', ')}} from '../runtime/browser.js';` : '';
const mutableTop = selectedTop.filter((n) => top.get(n).mutable);
const body = kept.map((i) => standins.get(i) || stmts[i].code).join('\n');
const sha = createHash('sha256').update(app).digest('hex');
const ordered = [...selectedTop].sort((a, b) => top.get(a).pos - top.get(b).pos);
const out = `// GENERATED by server/engine/scripts/build-app.mjs from src/App.jsx. Do not edit.
// App.jsx sha256 ${sha.slice(0, 16)}; ${kept.length} TaraApp statements; ${selectedTop.length} top-level helpers; ${vendorDone.size} vendored modules.
${importLines.join('\n')}
${browserImport}
import * as __server from '../runtime/server.js';

export const APP_SHA256 = '${sha}';

// Module-level state of App.jsx lives in this closure: one call, one engine.
export function createEngine() {
${ordered.map((n) => top.get(n).code).join('\n')}

// The engine passes hooks for observation and the server stand-ins.
function EngineApp({__engine}) {
${body}
  __engine.onRender?.({analysis, taraCall, timeState, startupReadiness, currentPrice, kalshiYesPrice, kalshiStrike,
    taraCallLog, taraCallSnapshotRef, currentCallBlockerRef, windowType});
  return null;
}
return {EngineApp, vars: {${mutableTop.map((n) => `get ${n}(){return ${n};}, set ${n}(v){${n}=v;}`).join(', ')}}};
}
`;
writeFileSync(join(outDir, 'engine-app.js'), out);
const report = {sha256: sha, statements: kept.map((i) => ({line: stmts[i].line, names: names.get(i), standin: standins.has(i)})),
  topLevel: selectedTop, mutableTopLevel: mutableTop, overrides: selectedTop.filter((n) => top.get(n).override), browser: [...browserUsed],
  vendor: [...vendorDone.keys()], skipped: Object.fromEntries(skipped), softUnresolved: [...unresolved]};
writeFileSync(join(outDir, 'engine-app.json'), JSON.stringify(report, null, 1));
console.log(`engine-app.js: ${kept.length} statements (${kept.reduce((a, i) => a + stmts[i].code.split('\n').length, 0)} lines), ${selectedTop.length} top-level, overrides [${report.overrides.join(', ')}], vendor ${vendorDone.size}, browser [${report.browser.join(', ')}]`);
console.log(`skipped (excluded) links: ${skipped.size}`);
