import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
const traverse=traverseModule.default||traverseModule;
// Checked against the actual v14.7.11 Git commit when this fixture was created.
// Hash fixtures also run in shallow Cloudflare checkouts without Git history.
const baseline=JSON.parse(readFileSync(new URL('./fixtures/notificationBaseline.json',import.meta.url),'utf8'));
const normalize=s=>s.replace(/\r\n/g,'\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
const current=path=>normalize(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const ignored=new Set(['start','end','loc','extra','leadingComments','trailingComments','innerComments']);
const clean=x=>Array.isArray(x)?x.map(clean):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>!ignored.has(k)).map(([k,v])=>[k,clean(v)])):x;
function selected(source,names) {
  const found={};traverse(parse(source,{sourceType:'module',plugins:['jsx']}),{
    VariableDeclarator(p){const name=p.node.id.name||p.node.id.elements?.[0]?.name;if(names.includes(name))found[name]=clean(p.node.init);},
    FunctionDeclaration(p){if(names.includes(p.node.id?.name))found[p.node.id.name]=clean(p.node);},
  });return found;
}
test('notification release leaves all protected policy, execution, sync and hourly source files byte-equivalent',()=>{
  for(const [path,expected] of Object.entries(baseline.files))assert.equal(hash(current(path)),expected,`${path} changed`);
});
test('actual forecast, commit/lifecycle, AutoTrade and hourly engines are AST-equivalent to v14.7.11',()=>{
  const names=['taraCall','autoExecSettings','_runEntry','_runExit','_resolveStakeDollars','computeV99Posterior','computeFGT',
    '_prepareCallCommit','_sealCallSnapshot','_persistLock','useHourlyEngine','useHourlyRecord','useHourlyLadder'];
  const next=selected(current('src/App.jsx'),names);
  for(const name of names){assert.ok(baseline.asts[name],`${name} missing`);assert.equal(hash(JSON.stringify(next[name])),baseline.asts[name],`${name} changed`);}
});
