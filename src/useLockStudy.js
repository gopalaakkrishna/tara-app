import {useEffect, useRef, useState} from 'react';
import {createLockStudy, observeLockStudy, settleLockStudy, summarizeLockStudies} from './lockStudy.js';
import {windowCloseMs} from './callIntegrity.js';

let databasePromise;
function database() {
  if(!databasePromise)databasePromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open('tara-lock-research-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('windows',{keyPath:'windowId'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  return databasePromise;
}
async function readStudies(){const db=await database();return new Promise((resolve,reject)=>{const r=db.transaction('windows').objectStore('windows').getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}
async function saveStudy(study){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('windows','readwrite');tx.objectStore('windows').put(study);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}

export function useLockStudy(input, {device, version, publish} = {}) {
  const live=useRef(input), publisher=useRef(publish);
  live.current=input;publisher.current=publish;
  const [studies,setStudies]=useState([]),[storageError,setStorageError]=useState(null),[syncError,setSyncError]=useState(null),[owner,setOwner]=useState(false);
  const records=useRef(new Map()), lastPublished=useRef(new Map());
  useEffect(()=>{
    let stopped=false, ready=false, active=false, busy=false, settling=false, release, pollTimer, settlementTimer;
    const push=()=>{if(!stopped)setStudies([...records.current.values()].sort((a,b)=>a.firstObservedAt-b.firstObservedAt));};
    const persist=async(study,force=false)=>{
      await saveStudy(study).then(()=>{if(!stopped)setStorageError(null);}).catch(()=>{if(!stopped)setStorageError('Research could not be saved on this device.');});
      const now=Date.now();
      if(publisher.current&&(force||now-(lastPublished.current.get(study.windowId)||0)>=60000)){
        lastPublished.current.set(study.windowId,now);
        const path=`research/lockStudy_v1_${device}_${study.windowId}`;
        await publisher.current(path,study).then(()=>{if(!stopped)setSyncError(null);}).catch(()=>{lastPublished.current.delete(study.windowId);if(!stopped)setSyncError('Cloud research backup is pending; local evidence is retained.');});
      }
    };
    const tick=async()=>{
      if(stopped||!ready||busy)return;
      if(!active){
        busy=true;
        try{const saved=await readStudies();if(!stopped){records.current=new Map(saved.map(s=>[s.windowId,s]));push();}}catch{}finally{busy=false;}
        return;
      }
      const i=live.current;
      if(i.asset!=='BTC'||i.windowType!=='15m'||!i.windowId)return;
      busy=true;
      try{
        const previous=records.current.get(i.windowId)||createLockStudy({...i,device,version});
        const next=observeLockStudy(previous,{...i,now:Date.now(),visibility:document.visibilityState});
        if(next!==previous){
          records.current.set(i.windowId,next);push();
          await persist(next,next.early.status!==previous.early.status);
        }
      }finally{busy=false;}
    };
    const settle=async()=>{
      if(stopped||!ready||!active||settling)return;
      const pending=[...records.current.values()].filter(s=>!s.settlement&&windowCloseMs(s.windowId)<Date.now()-15000);
      if(!pending.length)return;
      settling=true;
      try{
        const response=await fetch('/api/kalshi/events?series_ticker=KXBTC15M&with_nested_markets=true&status=settled&limit=200',{signal:AbortSignal.timeout(12000)});
        if(!response.ok)return;
        const data=await response.json(),markets=(data.events||[]).flatMap(e=>e.markets||[]);
        const byClose=new Map(markets.map(m=>[Date.parse(m.close_time),m]));
        for(const study of pending){
          if(stopped)break;
          let market=byClose.get(windowCloseMs(study.windowId));
          // An old pending window may be outside the last 200 events after downtime.
          const ticker=study.observations.find(o=>o.quote?.ticker)?.quote.ticker;
          if(!market&&ticker){
            const r=await fetch(`/api/kalshi/markets/${encodeURIComponent(ticker)}`,{signal:AbortSignal.timeout(8000)});
            if(r.ok)market=(await r.json()).market;
          }
          if(!market)continue;
          const next=settleLockStudy(study,market);
          if(next!==study){records.current.set(study.windowId,next);await persist(next,true);}
        }
        push();
      }catch{/* A failed exchange read leaves the outcome pending, never a loss. */}
      finally{settling=false;}
    };
    const start=async()=>{
      const saved=await readStudies().catch(()=>{if(!stopped)setStorageError('Research history could not be loaded.');return[];});
      if(stopped)return;
      records.current=new Map(saved.map(s=>[s.windowId,s]));ready=true;push();
      // A second tab is a viewer, not another writer to the same device's stream.
      if(navigator.locks){
        navigator.locks.request('tara-lock-research-writer',{mode:'exclusive'},async()=>{
          if(stopped)return;
          active=true;setOwner(true);void tick();void settle();
          await new Promise(resolve=>{release=resolve;});active=false;
        }).catch(()=>{if(!stopped)setStorageError('Research writer could not start.');});
      }else{setStorageError('This browser cannot coordinate research tabs; collection is disabled.');}
      pollTimer=setInterval(()=>{void tick();},15000);
      settlementTimer=setInterval(()=>{void settle();},60000);
    };
    void start();
    return()=>{stopped=true;clearInterval(pollTimer);clearInterval(settlementTimer);release?.();};
  },[device,version]);
  return {studies,summary:summarizeLockStudies(studies),current:studies.find(s=>s.windowId===input.windowId)||null,storageError,syncError,owner};
}
