// Optional built-app smoke test. All external networking (including Supabase,
// market feeds and execution APIs) is intercepted; no production engine runs.
// Supply TARA_SMOKE_PLAYWRIGHT when using a bundled Playwright installation.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.TARA_SMOKE_PLAYWRIGHT?pathToFileURL(process.env.TARA_SMOKE_PLAYWRIGHT).href:'playwright');
const {version}=JSON.parse(await readFile('package.json','utf8'));
const root=resolve('dist'),errors=[],blocked=[];
const server=http.createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  try{const bytes=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(bytes);}
  catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await chromium.launch({headless:true,...(process.env.TARA_SMOKE_CHANNEL?{channel:process.env.TARA_SMOKE_CHANNEL}:{})});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
  const origin=process.env.TARA_SMOKE_SITE?new URL(process.env.TARA_SMOKE_SITE).origin:`http://127.0.0.1:${server.address().port}`;
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    const staticPath=/^\/(assets|fonts)\//.test(url.pathname)||['/','/index.html','/sports.json','/manifest.json'].includes(url.pathname);
    if(url.origin===origin&&request.method()==='GET'&&staticPath)return route.continue();
    blocked.push({host:url.hostname,method:request.method()});
    if(url.hostname==='cdn.tailwindcss.com')return route.fulfill({status:200,contentType:'text/javascript',body:'window.tailwind={config:{}};'});
    return route.fulfill({status:503,contentType:'application/json',body:'{"error":"isolated smoke test: network disabled"}'});
  });
  if(context.routeWebSocket)await context.routeWebSocket('**/*',socket=>socket.close());
  if(process.env.TARA_SMOKE_LEGACY_LEFT==='1')await context.addInitScript(()=>localStorage.setItem('taraCoachLeft','1'));
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.getByText(`DECISION ENGINE · V${version}`,{exact:true}).waitFor({timeout:15000});
  assert.match(await page.locator('body').innerText(),/Your current window/);
  assert.equal(errors.length,0,JSON.stringify(errors));
  const visited=[];
  for(const name of ['AutoTrade','Hourly','Memory','Sports','Weather','Analytics','Brain','Trade']){
    await page.getByRole('button',{name,exact:true}).first().click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(errors.length,0,`${name}: ${JSON.stringify(errors)}`);visited.push(name);
    const duplicates=await page.evaluate(()=>{const ids=new Map();for(const e of document.querySelectorAll('[id]'))ids.set(e.id,(ids.get(e.id)||0)+1);return [...ids].filter(([,count])=>count>1);});
    assert.deepEqual(duplicates,[],`${name}: duplicate DOM IDs`);
  }
  assert.equal(await page.locator('.tara-v145-hourly-panel').count(),1,'legacy placement cannot create another hourly panel');
  console.log(JSON.stringify({version,desktop:'rendered',visited,errors,blockedRequests:blocked.length}));
  await page.setViewportSize({width:390,height:844});
  await page.getByText(`DECISION ENGINE · V${version}`,{exact:true}).waitFor();
  for(const name of ['AutoTrade','Hourly','Memory','Sports','Weather','Analytics','Brain','Trade']){
    await page.getByRole('button',{name,exact:true}).first().click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(errors.length,0,`mobile ${name}: ${JSON.stringify(errors)}`);
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log(`PASS built application all eight pages desktop/mobile; legacy left=${process.env.TARA_SMOKE_LEGACY_LEFT==='1'}; zero unhandled page errors; all non-static requests blocked.`);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
