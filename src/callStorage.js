import {callKey,CALL_EVIDENCE_FIELDS,normalizeCallLedger} from './callIntegrity.js';

// Call evidence stays whole in the durable archive/cloud. The two synchronous
// paint caches have explicit budgets instead of competing for the entire quota.
export function boundedCallCache(entries,maxChars) {
  const pending=entries.filter(e=>e&&!e.result),selected=new Set(pending);
  let size=JSON.stringify(pending).length;
  if(size>maxChars)return null;
  for(let i=entries.length-1;i>=0;i--){const e=entries[i];if(!e||selected.has(e))continue;
    const next=JSON.stringify(e).length+1;if(size+next>maxChars)continue;
    selected.add(e);size+=next;
  }
  return entries.filter(e=>selected.has(e));
}

export function mergeDurableCallArchive(previous,incoming) {
  const byKey=new Map((Array.isArray(previous)?previous:[]).filter(Boolean).map(e=>[callKey(e),e]));
  for(const row of Array.isArray(incoming)?incoming:[]){
    if(!row)continue;const key=callKey(row),old=byKey.get(key);
    if(!old){byKey.set(key,row);continue;}
    const newerEdit=row.manualEdit===true&&Number(row.manualEditedAt||0)>Number(old.manualEditedAt||0);
    const preserve=(old.manualEdit&&!newerEdit)||(old.result&&!row.result)||
      (old.result&&row.result&&old.result!==row.result&&!newerEdit);
    const next=preserve?{...row,...old}:{...old,...row};
    for(const field of CALL_EVIDENCE_FIELDS)if(next[field]==null&&old[field]!=null)next[field]=old[field];
    byKey.set(key,normalizeCallLedger([next],[old])[0]);
  }
  return [...byKey.values()].sort((a,b)=>(a.id||0)-(b.id||0));
}

export function persistCallCaches(storage,entries,{project=e=>e,archiveSaved=false,deepChars=1200000,fastChars=160000}={}) {
  const status={state:'ok',archiveSaved,archiveRows:entries.length,deepRows:0,fastRows:0,error:null};
  for(const [key,rows,budget,count] of [
    ['taraCallLog_deep',entries.map(project),deepChars,'deepRows'],
    ['taraCallLog_v1',entries,fastChars,'fastRows']]){
    try{
      let old=[];try{old=JSON.parse(storage.getItem(key)||'[]');}catch{}
      // Without a verified durable write, do not evict records that only this
      // old cache may hold. Leave the journal and cloud retries intact.
      const oldRows=Array.isArray(old)?old:[];
      const next=boundedCallCache(rows,budget);
      if(!next)throw Error('Pending Call evidence exceeds the quick-cache budget.');
      if(!archiveSaved){
        const keys=new Set(next.map(e=>`${e.asset||'BTC'}|${e.windowType}|${e.windowId}`));
        if(oldRows.some(e=>!keys.has(`${e.asset||'BTC'}|${e.windowType}|${e.windowId}`)))
          throw Error('Durable archive unavailable; preserving the previous cache.');
      }
      storage.setItem(key,JSON.stringify(next));
      if(key==='taraCallLog_deep')storage.setItem('taraCallLog_deepCount',String(next.length));
      status[count]=next.length;
    }catch(e){status.state='degraded';status.error=e?.message||'Call cache could not be saved.';}
  }
  if(!archiveSaved){status.state='degraded';status.error||='Durable archive unavailable; cloud and journal recovery remain enabled.';}
  return status;
}

// A put request succeeding is NOT a durable acknowledgement: the transaction
// can still abort. Read/merge/write is serialized in one transaction per tab.
export async function updateIndexedRecord(openDb,storeName,key,merge,now=Date.now()) {
  try{const db=await openDb();if(!db)return {ok:false,error:'History database unavailable.'};
    return await new Promise(resolve=>{
      let value,done=false;const finish=r=>{if(!done){done=true;resolve(r);}};
      let tx;try{tx=db.transaction(storeName,'readwrite');const store=tx.objectStore(storeName),request=store.get(key);
        tx.oncomplete=()=>finish({ok:true,value});
        tx.onabort=tx.onerror=()=>finish({ok:false,error:tx.error?.message||'History transaction aborted.'});
        request.onerror=()=>finish({ok:false,error:request.error?.message||'History read failed.'});
        request.onsuccess=()=>{try{value=merge(request.result?.value);store.put({key,value,updatedAt:now});}
          catch(e){try{tx.abort();}catch{}finish({ok:false,error:e.message});}};
      }catch(e){finish({ok:false,error:e.message});}
    });
  }catch(e){return {ok:false,error:e.message};}
}
