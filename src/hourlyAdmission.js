// A pick is approved only after a conditional shared write wins. A read followed
// by a debounced union is not a lock; re-run admission on every CAS conflict.
export async function commitHourlyAdmission({read,compareAndSwap,insert,merge,readLocal,preflightLocal,saveLocal,revalidate,guard,entry,attempts=5}){
  try{preflightLocal();}catch{return {accepted:false,code:'record-storage',reason:'Hourly record could not be saved on this device.'};}
  for(let attempt=0;attempt<attempts;attempt++){
    let row;try{row=await read();}catch{return {accepted:false,code:'record-read',reason:'Hourly shared record is unavailable; no pick was approved.'};}
    const current=merge(row?.data||{},readLocal());
    const decision=revalidate(current);if(!decision.ok)return {accepted:false,...decision};
    const g=guard(current);if(!g.ok)return {accepted:false,...g};
    const next={...merge(current,{pending:[entry],history:[]}),_admissionRevision:crypto.randomUUID()};
    let written;try{written=row?await compareAndSwap(row,next):await insert(next);}catch{return {accepted:false,code:'record-write',reason:'Hourly shared save could not be confirmed; waiting for a fresh record.'};}
    if(!written)continue;
    // The shared approval is durable even if local storage subsequently fails.
    // Do not emit a local alert in that case; hydration recovers the same row.
    try{saveLocal(next);}catch{return {accepted:false,code:'record-storage',reason:'Hourly pick is saved in the shared record, but local recovery is required.',record:next};}
    return {accepted:true,record:next};
  }
  return {accepted:false,code:'record-conflict',reason:'Hourly record changed repeatedly; collecting fresh confirmation.'};
}

export function supabaseHourlyTransport(client,path,now=()=>new Date().toISOString()){
  if(!client)throw Error('Hourly shared store unavailable');
  return {
    read:async()=>{const {data,error}=await client.from('tara_state').select('data,updated_at').eq('doc_path',path).maybeSingle();if(error)throw error;return data;},
    compareAndSwap:async(row,data)=>{let q=client.from('tara_state').update({data,updated_at:now()},{count:'exact'}).eq('doc_path',path).eq('updated_at',row.updated_at);q=row.data?._admissionRevision?q.eq('data->>_admissionRevision',row.data._admissionRevision):q.is('data->>_admissionRevision',null);const r=await q;if(r.error)throw r.error;return r.count===1;},
    insert:async data=>{const r=await client.from('tara_state').insert({doc_path:path,data,updated_at:now()});if(r.error?.code==='23505')return false;if(r.error)throw r.error;return true;},
  };
}
