import {BTC_DISCORD_CHANNEL,callIdentity} from './discordCalls.js';

export const DISCORD_OUTBOX_KEY='taraBtcDiscordOutbox_v1';
export const DISCORD_LOCK='tara-btc-discord-delivery-v1';
const MAX_ATTEMPTS=5;
export function discordDestination(value) {
  try{const u=new URL(value),match=/^\/api(?:\/v10)?\/webhooks\/(\d+)\/([A-Za-z0-9_-]+)\/?$/.exec(u.pathname);
    if(u.protocol!=='https:'||u.hostname!=='discord.com'||u.port||u.username||u.password||!match||u.search||u.hash)return null;
    return {id:match[1],url:u.origin+u.pathname.replace(/\/$/,'')};
  }catch{return null;}
}
export function readDiscordOutbox(storage,now=Date.now()) {
  const raw=storage.getItem(DISCORD_OUTBOX_KEY);
  if(!raw)return {schema:1,activatedAt:now,rows:[]};
  const box=JSON.parse(raw);
  if(box.schema!==1||!(box.activatedAt>0)||!Array.isArray(box.rows))throw Error('Saved Discord queue is unreadable; preserved without sending.');
  return box;
}
export function saveDiscordOutbox(storage,box) {
  storage.setItem(DISCORD_OUTBOX_KEY,JSON.stringify(box)); // must succeed BEFORE any request
}
export function reconcileDiscordOutbox(box,calls,payloadFor,destination,now=Date.now(),conflicts=[]) {
  const next=JSON.parse(JSON.stringify(box)),map=new Map(calls.map(c=>[c.key,c]));
  const latest={};for(const row of next.rows)if(row.messageId&&(!latest[row.call.kind]||row.call.lockedAt>latest[row.call.kind].call.lockedAt))latest[row.call.kind]=row;
  for(const row of next.rows) {
    if(row.state==='posting'){row.state='uncertain';row.error='Send outcome unknown. Check the channel; automatic repost blocked to avoid duplicates.';}
    const call=map.get(row.key);
    if(conflicts.includes(row.key)||(call&&(callIdentity(row.call)!==callIdentity(call)||
      (row.call.result&&call.result&&row.call.result!==call.result)))) {
      row.state='blocked';row.error='Conflicting original Call evidence; preserved without reposting.';continue;
    }
    if(call) {
      // A temporary slim/missing settlement receipt cannot undo an already
      // verified result on the acknowledged original message.
      row.call={...row.call,result:call.result||row.call.result,settledAt:call.settledAt||row.call.settledAt};
      if(!row.messageId&&!['uncertain','blocked','failed','expired'].includes(row.state)) {
        row.delayed=now-call.lockedAt>30000;row.payload=payloadFor(row.call,row.delayed);row.desiredResult=call.result;
      }
      if(row.messageId && (row.desiredResult!==row.call.result || latest[call.kind]?.key===row.key)) {
        row.payload=payloadFor(row.call,row.delayed);row.desiredResult=row.call.result;
      }
    }
    if(!row.messageId&&row.call.closeMs<=now&&!['uncertain','blocked'].includes(row.state)) {
      row.state='expired';row.error='Window closed before acknowledged delivery; no stale Call blast.';
    }
  }
  // Keep recent receipts and every unresolved/failed item, within the shared
  // browser quota. Closed pruned Calls cannot be posted again (see close guard).
  const settled=next.rows.filter(r=>r.state==='delivered'&&r.call.result&&r.call.closeMs<now-86400000);
  const prune=new Set(settled.slice(0,Math.max(0,next.rows.length-350)).map(r=>r.key));
  next.rows=next.rows.filter(r=>!prune.has(r.key));
  if(destination)for(const call of calls) {
    if(call.lockedAt<next.activatedAt || call.lockedAt>now-2000 || call.closeMs<=now || next.rows.some(r=>r.key===call.key))continue;
    if(next.rows.length>=500)throw Error('Discord queue is full; older unresolved evidence is preserved.');
    const delayed=now-call.lockedAt>30000;
    next.rows.push({key:call.key,call,payload:payloadFor(call,delayed),desiredResult:call.result,
      webhookId:destination.id,channelId:BTC_DISCORD_CHANNEL,createdAt:now,delayed,state:'queued',
      attempts:0,editAttempts:0,nextAt:0,messageId:null,deliveredSignature:null,error:null});
  }
  // Prune only old, acknowledged settled payloads. No missing/uncertain evidence is evicted.
  next.rows=next.rows.filter(r=>!(r.state==='delivered'&&r.call.result&&r.call.closeMs<now-30*86400000));
  return next;
}
const editPayload=payload=>({embeds:payload.embeds,allowed_mentions:{parse:[]}});
const signature=payload=>JSON.stringify(editPayload(payload));
const retryAfter = response => Math.max(1000,Number.isFinite(Number(response.retryAfterMs))&&Number(response.retryAfterMs)>0?Number(response.retryAfterMs):5000);

// Called under the origin-wide Web Lock. Persist-before-send and wait=true
// acknowledgement are deliberate: a timeout is not success and not safe to repost.
export async function drainDiscordOutbox(box,{storage,destination,transport,now=Date.now(),clock,maxOperations=3}={}) {
  if(box.nextAt>now)return box;
  let operations=0;
  for(const row of box.rows) {
    const attemptAt=clock?clock():now;
    if(operations>=maxOperations)break;
    const edit=!!row.messageId;
    if(['uncertain','blocked','expired','failed'].includes(row.state)||row.nextAt>attemptAt)continue;
    if(!destination || row.webhookId!==destination.id) {
      row.error=destination?'Saved recipient differs from configured webhook; not retargeted.':'BTC webhook is missing.';continue;
    }
    if(edit&&row.deliveredSignature===signature(row.payload))continue;
    if(!edit&&row.call.closeMs<=attemptAt){row.state='expired';row.error='Window closed; no stale Call blast.';saveDiscordOutbox(storage,box);continue;}
    const attempts=edit?'editAttempts':'attempts';
    if(row[attempts]>=MAX_ATTEMPTS){row.state='failed';row.error='Bounded delivery attempts exhausted; needs attention.';saveDiscordOutbox(storage,box);continue;}
    row[attempts]++;row.state=edit?'editing':'posting';row.error=null;
    saveDiscordOutbox(storage,box);
    operations++;
    let response;
    try{response=await transport({destination,method:edit?'PATCH':'POST',messageId:row.messageId,
      payload:edit?editPayload(row.payload):row.payload});}catch{response={kind:'unknown'};}
    const receivedAt=clock?clock():now;
    if(response.kind==='ok'&&/^\d+$/.test(String(response.messageId||''))&&response.channelId===row.channelId&&
      response.webhookId===row.webhookId&&(!edit||response.messageId===row.messageId)) {
      row.messageId=response.messageId;row.deliveredSignature=signature(row.payload);row.state='delivered';
      row.ackAt=receivedAt;row.nextAt=0;row[attempts]=0;
    }else if(response.kind==='rate-limit'||(edit&&['unknown','retry'].includes(response.kind))) {
      row.state='retry';row.error=edit?'Original message update pending; no new post.':'Discord rate-limited this Call; waiting to retry.';
      row.nextAt=receivedAt+(response.kind==='rate-limit'?retryAfter(response):Math.min(60000,5000*2**(row[attempts]-1)));
      if(response.kind==='rate-limit')box.nextAt=row.nextAt;
      if(row[attempts]>=MAX_ATTEMPTS){row.state='failed';row.error='Bounded delivery attempts exhausted; needs attention.';}
    }else if(response.kind==='rejected') {
      row.state='failed';row.error=edit?'Original message edit rejected; no replacement blast.':'Discord rejected the Call; check webhook permissions.';
    }else {
      row.state='uncertain';row.error='Send acknowledgement unknown. Check the channel; no automatic duplicate post.';
    }
    saveDiscordOutbox(storage,box);
    if(response.kind==='rate-limit')break; // respect the webhook bucket, not only this row
  }
  return box;
}

export async function verifyDiscordDestination(destination,{fetchImpl=fetch}={}) {
  const r=await fetchImpl(destination.url,{signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!r.ok)throw Error('BTC webhook could not be verified; no messages sent.');
  const body=await r.json();
  if(body.id!==destination.id||body.channel_id!==BTC_DISCORD_CHANNEL)throw Error('Webhook is not the existing tara-btc channel; delivery blocked.');
  return true;
}
export async function discordWebhookTransport({destination,method,messageId,payload},{fetchImpl=fetch}={}) {
  try{
    const url=method==='PATCH'?`${destination.url}/messages/${messageId}`:`${destination.url}?wait=true`;
    const r=await fetchImpl(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
    if(r.status===429) {let b={};try{b=await r.json();}catch{}return {kind:'rate-limit',retryAfterMs:1000*(Number(b.retry_after)||Number(r.headers.get('retry-after'))||5)};}
    if(r.status>=500)return {kind:method==='PATCH'?'retry':'unknown'};
    if(!r.ok)return {kind:'rejected'};
    const b=await r.json();return {kind:'ok',messageId:b.id,channelId:b.channel_id,webhookId:b.webhook_id};
  }catch{return {kind:'unknown'};} // never log a token-bearing URL or raw private response
}
