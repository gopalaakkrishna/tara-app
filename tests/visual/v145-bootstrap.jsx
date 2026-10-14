// This entry is outside the production Vite input. Real UI, isolated services.
import React from 'react';import {createRoot} from 'react-dom/client';
if(location.origin!=='http://127.0.0.1:4186')throw new Error('Visual fixture restricted to the owned QA origin.');
const NOW=Date.parse('2026-10-14T20:22:18-04:00'),NativeDate=Date;
window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[NOW]));}static now(){return NOW;}};
const start=Math.floor(NOW/900000)*900000,windowId=`15m-${new NativeDate(start).toISOString()}`,lockedAt=NOW-33000;
const ticker='KXBTC15M-26OCT142030',closeTime=new NativeDate(start+900000).toISOString();
const snapshot={asset:'BTC',windowType:'15m',windowId,locked:true,call:'UP',dir:'UP',_committedAt:lockedAt,lockedAt,
  confidence:72,conviction:22,posterior:72,atPosterior:72,atSecondsLeft:495,priceAtLock:84562.48,strike:84521.2,
  marketTicker:ticker,marketCloseTime:closeTime,kalshiAtLock:63,kalshiBidAtLock:62,kalshiAskAtLock:64,quoteObservedAt:lockedAt,
  reason:'Buy-side tape held and the trend agreed before the cutoff.',taraVersion:'2026.10.13-v14.4.10-hourly-fresh-approval',
  originalDecision:{schema:1,provenance:'captured-at-lock',asset:'BTC',windowType:'15m',windowId,direction:'UP',lockedAt,
    secondsLeft:495,signalScore:72,strike:84521.2,marketTicker:ticker,marketCloseTime:closeTime,yesBid:62,yesAsk:64,
    modelVersion:'2026.10.13-v14.4.10-hourly-fresh-approval',reason:'Buy-side tape held and the trend agreed before the cutoff.'}};
const records=Array.from({length:24},(_,i)=>{const at=start-(24-i)*900000,dir=i%3?'UP':'DOWN',result=i%5===0?'SITOUT':i%4===0?'LOSS':'WIN';const wid=`15m-${new NativeDate(at).toISOString()}`,market=`KXBTC15M-FIXTURE${i}`;return{id:at+405000,time:at+405000,asset:'BTC',windowType:'15m',windowId:wid,dir:result==='SITOUT'?'SIT_OUT':dir,result,confidence:72,strike:84521.2,closingPrice:84600,regime:'TREND',reason:'Captured fixture reason',tier:'tier1',
    originalDecision:{...snapshot.originalDecision,windowId:wid,lockedAt:at+405000,direction:result==='SITOUT'?'SIT_OUT':dir,marketTicker:market,
      modelVersion:i<12?'2026.10.13-v14.4.9-shared-decision-restoration':snapshot.taraVersion,
      reason:result==='SITOUT'?'Patient: letting tape/momentum decide (61% conviction). Required 65%.':'Tape and direction agreed at capture.',
      blockedDecision:result==='SITOUT'?{code:'timing-confidence',reason:'Patient: letting tape/momentum decide (61% conviction). Required 65%.',gate:{observedConfidence:61,requiredConfidence:65}}:null},
    officialSettlement:result==='SITOUT'?null:{source:'kalshi-public-api',ticker:market,result:(dir==='UP')===(result==='WIN')?'yes':'no'},};});
records.push({...snapshot,id:lockedAt,time:lockedAt,result:null});
const doc={windowId,asset:'BTC',windowType:'15m',taraSnapshot:snapshot,lockedCall:{dir:'UP',lockedAt,windowId,asset:'BTC',windowType:'15m'},updatedAt:NOW};
const hourlyClose=new NativeDate(NOW);hourlyClose.setMinutes(60,0,0);const hClose=hourlyClose.getTime();
const samples=[0,1,2].map(i=>({quoteId:`fixture-${i}`,requestAt:NOW-60000+i*20000,quoteAt:NOW-59000+i*20000,spotAt:NOW-59000+i*20000,spot:84562.48,confidence:70,probabilityYes:67,cost:54,feeCents:2,netEdgeCents:11}));
const hourly={w:3,l:1,pending:[{ticker:'KXBTCD-26OCT1421-T84500',side:'YES',strike:84500,cost:54,conf:70,model:67,closeMs:hClose,ms:NOW-20000,at:'8:21 PM',minsAtLock:38.33,approval:{modelVersion:snapshot.taraVersion,policyVersion:'14.4.10',at:NOW-20000,samples,spanMs:40000,probabilitySide:67,probabilityYes:67,cost:54,feeCents:2,netEdgeCents:11,quote:{bid:52,ask:54}}}],history:[]};
const weather={picks:[{ticker:'KXHIGHNY-26OCT14-T71',cityId:'NY',cityLabel:'New York',station:'KNYC',dayKey:'2026-10-14',tier:'paper',side:'YES',price:54,sub:'High above 71°F',edge:11,why:'Fixture forecast evidence',atMs:NOW-60000,closeMs:NOW+3600000,result:null},{ticker:'KXHIGHNY-26OCT13-T71',cityId:'NY',cityLabel:'New York',station:'KNYC',dayKey:'2026-10-13',tier:'live',side:'NO',price:82,sub:'High above 71°F',atMs:NOW-86400000,settledAt:NOW-3600000,result:'win',settledResult:'no',pnl:16}]};
for(const [key,value]of Object.entries({taraCallLog_v1:records,taraSharedDecision_v1:[doc],taraHourlyRecord_v1:hourly,tara_weather_picks_v1:weather}))localStorage.setItem(key,JSON.stringify(value));
const sportsRows=[['Knicks vs Heat','Knicks','Heat','NBA','basketball'],['Dodgers vs Mets','Dodgers','Mets','MLB','baseball'],['Celtics vs Bulls','Celtics','Bulls','NBA','basketball']].map((x,i)=>({id:`fixture-${i}`,match:x[0],home:x[1],away:x[2],league:x[3],sport:x[4],sport_label:x[4],start:new NativeDate(NOW+(i+1)*1800000).toISOString(),tracked:i!==1,pick:x[1],pick_side:'home',model:.67,mkt:.65,model_p:.67,mkt_p:.65,p_home:.67,p_away:.33,home_price:65,away_price:37,advice:'ALIGNED',confidence:.7,edge:.02}));
const sports={generated:new NativeDate(NOW-120000).toISOString(),record_updated:new NativeDate(NOW-120000).toISOString(),board:sportsRows,upcoming:sportsRows,open:sportsRows.filter(x=>x.tracked),settled:[],record:{n:30,wins:18,losses:12,win_rate:.6,ll:.63,mkt_ll:.65,n_mkt:30,vs_market:-.02}};
const documents={'memory/taraCallLog':records,'state/currentLock_BTC_15m':doc,'memory/hourlyRecord':hourly,'memory/weatherPicks':weather};
const originalFetch=window.fetch.bind(window);window.__visualNetwork={reads:0,interceptedWrites:0,denied:0};
window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href),method=(init.method||input.method||'GET').toUpperCase();
  if(url.href.includes('sports.json'))return Response.json(sports);
  if(url.origin===location.origin&&!url.pathname.startsWith('/api/'))return originalFetch(input,init);
  if(method!=='GET'){window.__visualNetwork.interceptedWrites++;return new Response(null,{status:204});}
  window.__visualNetwork.reads++;
  if(url.pathname==='/api/learning')return Response.json({protocol:'tara-learning-v2',generatedAt:NOW,datasetId:'ISOLATED-FIXTURE',
    profiles:{BTC_15m:{status:'shadow',reason:'awaiting-forward-evidence',independentGroups:135,forwardGroups:32,liveInfluence:false,
      challenger:{model:{id:'ISOLATED-SHADOW-MODEL'},holdout:{candidate:{accuracy:.61,brier:.218},baseline:{accuracy:.56,brier:.243}}}},
      Sports:{status:'source-review',reason:'external-record-not-independent-settlement-proof'}},sourceHealth:{fixture:{status:'isolated-no-network'}},exclusions:{'legacy-features-unavailable':24}});
  if(url.pathname.endsWith('/tara_state')){const key=(url.searchParams.get('doc_path')||'').replace(/^eq\./,'');return Response.json(documents[key]===undefined?null:{data:documents[key],updated_at:new NativeDate(NOW).toISOString()});}
  if(url.href.includes('/series/KXBTCD'))return Response.json({series:{ticker:'KXBTCD',fee_type:'quadratic',fee_multiplier:1}});
  if(url.pathname.endsWith('/events'))return Response.json({events:[url.searchParams.get('series_ticker')==='KXBTCD'?{event_ticker:'KXBTCD-26OCT1421'}:{event_ticker:'KXBTC15M-26OCT142030',markets:[{ticker,status:'active',strike_type:'greater',floor_strike:84521.2,yes_bid_dollars:'.62',yes_ask_dollars:'.64',close_time:closeTime}]}]});
  if(url.pathname.endsWith('/markets')){const event=url.searchParams.get('event_ticker');return Response.json({markets:event?[84400,84500,84600].map((strike,i)=>({ticker:`${event}-T${strike}`,event_ticker:event,status:'active',strike_type:'greater',floor_strike:strike,yes_bid_dollars:['.66','.52','.45'][i],yes_ask_dollars:['.68','.54','.47'][i],volume_fp:'5000',close_time:new NativeDate(hClose).toISOString()})):[{ticker,status:'active',floor_strike:84521.2,yes_bid_dollars:'.62',yes_ask_dollars:'.64',yes_bid:62,yes_ask:64,volume:5000,close_time:closeTime}]});}
  if(url.pathname.includes('/markets/'))return Response.json({market:{ticker,status:'active',floor_strike:84521.2,yes_bid_dollars:'.62',yes_ask_dollars:'.64',yes_bid:62,yes_ask:64,close_time:closeTime}});
  if(url.href.includes('coinbase')&&url.pathname.includes('/spot'))return Response.json({data:{amount:'84562.48',currency:'USD'}});
  if(url.href.includes('coinbase')&&url.pathname.includes('ticker'))return Response.json({price:'84562.48',bid:'84562',ask:'84563',volume:'1000',time:new NativeDate(NOW).toISOString()});
  if(url.pathname.includes('candles')){const step=Number(url.searchParams.get('granularity'))||60;const end=Math.floor(NOW/1000/step)*step;return Response.json(Array.from({length:180},(_,i)=>[end-(179-i)*step,84470+i/10,84610+i/10,84500+i/10,84530+i/6,10]));}
  if(url.href.includes('kraken'))return Response.json({error:[],result:{XXBTZUSD:{c:['84562.48','1'],b:['84562'],a:['84563']}}});
  if(url.href.includes('binance')&&url.pathname.includes('ticker'))return Response.json({symbol:'BTCUSDT',price:'84562.48'});
  if(url.pathname.includes('ticker'))return Response.json({code:'0',data:[{last:'84562.48',ts:String(NOW),bidPx:'84562',askPx:'84563'}]});
  if(url.pathname.includes('books'))return Response.json({code:'0',data:[{bids:[['84560','3']],asks:[['84565','1']],ts:String(NOW)}]});
  if(url.href.includes('api.weather.gov'))return Response.json({properties:{temperature:{value:22.2},maxTemperatureLast24Hours:{value:23.3},timestamp:new NativeDate(NOW).toISOString(),forecast:'https://api.weather.gov/fixture/forecast',periods:[{temperature:74,temperatureUnit:'F',name:'Today',shortForecast:'Mostly clear'}]},features:[]});
  window.__visualNetwork.denied++;return new Response(JSON.stringify({error:'Unconfigured fixture endpoint'}),{status:503,headers:{'Content-Type':'application/json'}});
};
window.WebSocket=class{static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;constructor(){this.readyState=3;}addEventListener(){}removeEventListener(){}send(){}close(){}};
window.BroadcastChannel=class{postMessage(){}addEventListener(){}removeEventListener(){}close(){}};
navigator.sendBeacon=()=>false;
const {default:App}=await import('../../src/App.jsx');createRoot(document.getElementById('root')).render(<App/>);
