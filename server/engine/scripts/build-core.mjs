// Generates server/engine/src/generated/: Tara's real decision path pulled out
// of src/App.jsx as plain functions, so the cloud engine runs exactly the code
// the website runs. Nothing is copied by hand.
//
//   computeAnalysis(scope)  the `analysis` useMemo body
//   produceTaraCall(scope)  the `taraCall` candidate IIFE and its post-processing
//   makeCallCommit(scope)   _prepareCallCommit / _sealCallSnapshot
//   runCallLifecycle(scope) the Call lifecycle useEffect body
//
// `scope` carries what TaraApp keeps in hooks (state values, refs, setters).
// Every App.jsx top-level helper those blocks reach is emitted at module level,
// with setters for the mutable ones (`let`), and the src/*.js modules they
// import are vendored. Browser globals (localStorage, window) become injectable
// module-level objects. manifest.json lists the scope keys each function needs,
// so the runtime can refuse to start with a missing input.
//
// Run from the repo root after `npm ci`:  node server/engine/scripts/build-core.mjs
import {readFileSync, writeFileSync, mkdirSync, rmSync, existsSync} from 'node:fs';
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
  'parseFloat', 'parseInt', 'isNaN', 'isFinite', 'Infinity', 'NaN', 'undefined', 'Promise', 'Error', 'TypeError', 'RangeError', 'RegExp',
  'Symbol', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'structuredClone', 'encodeURIComponent', 'decodeURIComponent',
  'fetch', 'AbortSignal', 'AbortController', 'performance', 'BigInt', 'WeakMap', 'WeakSet', 'globalThis', 'queueMicrotask', 'Response',
  'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'crypto', 'atob', 'btoa', 'Uint8Array', 'ArrayBuffer', 'Float64Array', 'Reflect', 'Proxy', 'arguments']);
// Injectable stand-ins. Anything else browser-only is a build error.
const BROWSER_STUBS = new Set(['window', 'localStorage', 'sessionStorage']);
const BROWSER_FORBIDDEN = new Set(['document', 'navigator', 'indexedDB', 'BroadcastChannel', 'AudioContext', 'webkitAudioContext', 'Notification', 'location', 'alert', 'confirm', 'prompt']);

// ---------- App.jsx top level ----------
const top = new Map(); // name -> {kind, code, mutable}
const imports = new Map(); // local -> {source, imported}
for (const st of ast.program.body) {
  if (st.type === 'ImportDeclaration') for (const s of st.specifiers) {
    imports.set(s.local.name, {source: st.source.value, imported: s.type === 'ImportDefaultSpecifier' ? 'default' : s.type === 'ImportNamespaceSpecifier' ? '*' : s.imported.name});
  }
  if (st.type === 'VariableDeclaration') for (const d of st.declarations) {
    if (d.id.type !== 'Identifier') continue;
    top.set(d.id.name, {kind: st.kind, mutable: st.kind !== 'const', code: `${st.kind} ${d.id.name}=${d.init ? app.slice(d.init.start, d.init.end) : 'undefined'};`});
  }
  if (st.type === 'FunctionDeclaration') top.set(st.id.name, {kind: 'function', mutable: false, code: app.slice(st.start, st.end)});
  if (st.type === 'ClassDeclaration') top.set(st.id.name, {kind: 'class', mutable: false, code: app.slice(st.start, st.end)});
}

// ---------- decision slices ----------
const slices = {};
traverse(ast, {
  VariableDeclarator(p) {
    if (p.node.id.name === 'analysis' && p.node.init?.callee?.name === 'useMemo') {
      const fn = p.node.init.arguments[0];
      slices.computeAnalysis = {body: app.slice(fn.body.start + 1, fn.body.end - 1), ret: ''};
    }
  },
  CallExpression(p) {
    const n = p.node;
    if (n.callee.name !== 'useEffect' || n.arguments[0]?.type !== 'ArrowFunctionExpression') return;
    const b = n.arguments[0].body, text = app.slice(b.start + 1, b.end - 1);
    if (text.includes("const isCall=tc.call==='UP'||tc.call==='DOWN';") && text.includes('const _noteGateHold=')) slices.runCallLifecycle = {body: text, ret: ''};
  },
});
const between = (a, b) => { const s = app.indexOf(a), e = app.indexOf(b, s); if (s < 0 || e < 0) throw new Error(`slice markers not found: ${a}`); return app.slice(s, e); };
slices.produceTaraCall = {body: between('  const taraCall=(()=>{', '  // Three coordinated effects'), ret: 'return taraCall;'};
slices.makeCallCommit = {body: between('  const _prepareCallCommit=', '  const _persistLock='), ret: 'return {_prepareCallCommit,_sealCallSnapshot};'};
for (const k of ['computeAnalysis', 'produceTaraCall', 'makeCallCommit', 'runCallLifecycle']) if (!slices[k]) throw new Error(`decision block not found: ${k}`);

function freeIdentifiers(code, wrap) {
  const names = new Set(), assigned = new Set();
  const a = parse(wrap ? `function __run(){${code}\n}` : code, {sourceType: 'script', plugins: ['jsx'], allowReturnOutsideFunction: true});
  traverse(a, {
    ReferencedIdentifier(p) { if (!p.scope.hasBinding(p.node.name, true)) names.add(p.node.name); },
    AssignmentExpression(p) { const l = p.node.left; if (l.type === 'Identifier' && !p.scope.hasBinding(l.name, true)) assigned.add(l.name); },
    UpdateExpression(p) { const l = p.node.argument; if (l.type === 'Identifier' && !p.scope.hasBinding(l.name, true)) assigned.add(l.name); },
    JSXElement() { throw new Error('JSX inside a decision block cannot run on the server'); },
  });
  return {names, assigned};
}

// ---------- closure over App.jsx top level ----------
const selectedTop = [], selected = new Set(), neededImports = new Map(), browserUsed = new Set();
function needName(name, from) {
  if (JS_GLOBALS.has(name)) return 'global';
  if (BROWSER_STUBS.has(name)) { browserUsed.add(name); return 'browser'; }
  if (BROWSER_FORBIDDEN.has(name)) throw new Error(`${from} uses browser-only ${name}; the server cannot provide it`);
  if (imports.has(name)) { neededImports.set(name, imports.get(name)); return 'import'; }
  if (top.has(name)) { selectTop(name); return 'top'; }
  return 'scope';
}
function selectTop(name) {
  if (selected.has(name)) return;
  selected.add(name);
  const t = top.get(name);
  const {names} = freeIdentifiers(t.code, false);
  for (const n of names) if (n !== name) {
    const kind = needName(n, `App.jsx top-level ${name}`);
    if (kind === 'scope') throw new Error(`top-level ${name} reads ${n}, which is not module-level`);
  }
  selectedTop.push(name);
}

const manifest = {source: 'src/App.jsx', sha256: createHash('sha256').update(app).digest('hex'), functions: {}};
const generatedFns = [];
for (const [fn, s] of Object.entries(slices)) {
  const {names, assigned} = freeIdentifiers(s.body, true);
  const scopeKeys = [];
  for (const n of [...names].sort()) if (needName(n, fn) === 'scope') scopeKeys.push(n);
  for (const n of assigned) if (scopeKeys.includes(n)) throw new Error(`${fn} reassigns hook value ${n}; it would not reach React-free callers`);
  manifest.functions[fn] = {scopeKeys, reassignsTopLevel: [...assigned].filter((n) => top.has(n))};
  generatedFns.push(`export function ${fn}(scope) {\n  const {${scopeKeys.join(', ')}} = scope;\n${s.body}\n  ${s.ret}\n}`);
}

// ---------- vendored src modules ----------
// Hook-only modules keep their plain exports; the React hook is stripped and a
// setter is added for module state the hook used to fill.
const vendorDone = new Map();
function vendor(spec, fromDir) {
  const rel = posix.normalize(posix.join(fromDir, spec)).replace(/^\.\//, '');
  if (vendorDone.has(rel)) return;
  const file = join(repo, 'src', rel);
  if (!existsSync(file)) throw new Error(`vendor module missing: ${rel}`);
  let code = readFileSync(file, 'utf8');
  const mast = parse(code, {sourceType: 'module', plugins: ['jsx']});
  const cuts = [], setters = [];
  for (const st of mast.program.body) {
    if (st.type === 'ImportDeclaration') {
      if (st.source.value === 'react') { cuts.push([st.start, st.end]); continue; }
      if (!st.source.value.startsWith('.')) throw new Error(`${rel} imports package ${st.source.value}`);
      vendor(st.source.value, posix.dirname(rel));
    }
    const decl = st.type === 'ExportNamedDeclaration' ? st.declaration : st;
    if (decl?.type === 'FunctionDeclaration' && /^use[A-Z]/.test(decl.id.name)) cuts.push([st.start, st.end]);
    if (st.type === 'VariableDeclaration' && st.kind === 'let') for (const d of st.declarations) if (d.id.type === 'Identifier') setters.push(d.id.name);
  }
  for (const [a, b] of cuts.sort((x, y) => y[0] - x[0])) code = code.slice(0, a) + code.slice(b);
  if (cuts.length) code = `// VENDORED for the server engine: React hook removed by build-core.mjs.\n${code}\n${setters.map((n) => `export function __set_${n}(value){${n}=value;}`).join('\n')}\n`;
  if (/\buse(State|Effect|Ref|Memo|Callback)\(/.test(code)) throw new Error(`${rel} still uses React after stripping`);
  vendorDone.set(rel, code);
}
for (const [, {source}] of neededImports) vendor(source, '.');

// ---------- emit ----------
rmSync(outDir, {recursive: true, force: true});
mkdirSync(join(outDir, 'vendor'), {recursive: true});
for (const [rel, code] of vendorDone) { mkdirSync(dirname(join(outDir, 'vendor', rel)), {recursive: true}); writeFileSync(join(outDir, 'vendor', rel), code); }

const bySource = new Map();
for (const [local, {source, imported}] of neededImports) {
  const src = `./vendor/${posix.normalize(source).replace(/^\.\//, '')}`;
  if (!bySource.has(src)) bySource.set(src, []);
  bySource.get(src).push(imported === local ? local : imported === 'default' ? `default as ${local}` : `${imported} as ${local}`);
}
const importLines = [...bySource].map(([src, names]) => `import {${names.join(', ')}} from '${src}';`);
const mutableTop = selectedTop.filter((n) => top.get(n).mutable);
manifest.topLevel = selectedTop;
manifest.mutableTopLevel = mutableTop;
manifest.browserStubs = [...browserUsed];
manifest.vendor = [...vendorDone.keys()];

const header = `// GENERATED by server/engine/scripts/build-core.mjs from src/App.jsx. Do not edit.
// App.jsx sha256 ${manifest.sha256.slice(0, 16)}; ${selectedTop.length} top-level declarations; ${vendorDone.size} vendored modules.
${importLines.join('\n')}

// Browser stand-ins. The runtime installs a settings-backed localStorage.
let localStorage = {getItem: () => null, setItem() {}, removeItem() {}};
let sessionStorage = {getItem: () => null, setItem() {}, removeItem() {}};
let window = {};
export function installBrowserStubs(stubs = {}) {
  if (stubs.localStorage) localStorage = stubs.localStorage;
  if (stubs.sessionStorage) sessionStorage = stubs.sessionStorage;
  if (stubs.window) window = stubs.window;
}
`;
const topCode = selectedTop.map((n) => top.get(n).code).join('\n');
const setters = mutableTop.map((n) => `export function __get_${n}(){return ${n};}\nexport function __set_${n}(value){${n}=value;}`).join('\n');
writeFileSync(join(outDir, 'core.js'), `${header}\n${topCode}\n\n${setters}\n\n${generatedFns.join('\n\n')}\n`);
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`core.js: ${selectedTop.length} top-level, ${mutableTop.length} mutable, vendor ${vendorDone.size}, browser stubs ${[...browserUsed].join(',') || 'none'}`);
for (const [fn, m] of Object.entries(manifest.functions)) console.log(`  ${fn}: ${m.scopeKeys.length} scope keys`);
