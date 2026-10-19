import {useEffect,useRef,useState} from 'react';
import {recoverCapturedCalls} from './callCaptureJournal.js';
import {collectBtcCalls,btcCallRecord,discordCallPayload} from './discordCalls.js';
import {DISCORD_LOCK,discordDestination,readDiscordOutbox,saveDiscordOutbox,reconcileDiscordOutbox,
  drainDiscordOutbox,verifyDiscordDestination,discordWebhookTransport} from './discordDelivery.js';
import {advisoryCandidates,observeAdvisories,reconcileAdvisories,drainAdvisories} from './discordAdvisories.js';

export function useDiscordCalls({entries,hourly,webhook,username,avatar,enabled,readAdvisories,version}) {
  const latest=useRef(null),busy=useRef(false),verified=useRef(null),lastView=useRef(''),viewRef=useRef(null);
  const advisoryObservations=useRef({});
  latest.current={entries,hourly,webhook,username,avatar,readAdvisories,version};
  const [view,setView]=useState({rows:[],advisories:[],records:{},error:null,checkedAt:null,configured:false});
  viewRef.current=view;
  useEffect(()=>{
    if(!enabled)return;
    let alive=true;
    const publish=next=>{if(!alive)return;const sig=JSON.stringify({...next,checkedAt:null});
      if(sig!==lastView.current){lastView.current=sig;setView(next);}};
    const tick=async()=>{
      if(busy.current)return;
      busy.current=true;
      try{
        if(!navigator.locks?.request)throw Error('Safe single-sender browser locking unavailable; Discord sending paused.');
        await navigator.locks.request(DISCORD_LOCK,{ifAvailable:true},async lock=>{
          if(!lock)return;
          const now=Date.now(),current=latest.current,destination=discordDestination(current.webhook);
          const saved=recoverCapturedCalls(current.entries||[],localStorage,now);
          const {calls,conflicts}=collectBtcCalls(saved,current.hourly,now);
          const records={'15m':btcCallRecord(calls,'15m',now),'1h':btcCallRecord(calls,'1h',now)};
          const payloadFor=(call,delayed)=>discordCallPayload(call,records[call.kind],{
            username:current.username,avatar:current.avatar,delayed,now});
          let box=reconcileDiscordOutbox(readDiscordOutbox(localStorage,now),calls,payloadFor,destination,now,conflicts);
          let observations;
          try{observations=observeAdvisories(advisoryObservations.current,
            advisoryCandidates(current.readAdvisories?.(),calls,now),now);}
          catch{observations={state:{},ready:[]};} // context failure cannot interrupt confirmed Call delivery
          advisoryObservations.current=observations.state;
          box=reconcileAdvisories(box,observations.ready,calls,destination,
            {username:current.username,avatar:current.avatar,version:current.version},now);
          saveDiscordOutbox(localStorage,box);
          const dirty=box.rows.some(r=>!['failed','blocked','expired','uncertain'].includes(r.state)&&
            (r.state!=='delivered'||r.deliveredSignature!==JSON.stringify({embeds:r.payload.embeds,allowed_mentions:{parse:[]}})))||
            box.advisories.some(r=>['queued','retry'].includes(r.state));
          const online=navigator.onLine!==false;
          let error=conflicts.length?'Conflicting Call identities are withheld from Discord and the verified record.':null;
          if(!destination)error='BTC webhook missing or invalid. No Discord messages sent.';
          if(!online)error='Browser offline; saved Calls wait for reconnection. Closed windows will not be blasted.';
          if(online&&destination&&dirty&&(!verified.current||verified.current.url!==destination.url||
            (!verified.current.ok&&now>=verified.current.retryAt)||(verified.current.ok&&now-verified.current.at>300000))){
            try{await verifyDiscordDestination(destination);verified.current={url:destination.url,at:now,ok:true,failures:0};}
            catch{const failures=verified.current?.url===destination.url?(verified.current.failures||0)+1:1;
              verified.current={url:destination.url,ok:false,failures,at:now,retryAt:now+(failures%5===0?300000:Math.min(60000,5000*2**(failures%5)))};}
          }
          if(online&&destination&&dirty&&verified.current?.ok===false)error='Could not verify the existing tara-btc destination. Queue retained; connection checks back off automatically.';
          if(online&&navigator.onLine!==false&&alive&&destination&&verified.current?.ok&&verified.current.url===destination.url){
            box=await drainDiscordOutbox(box,{storage:localStorage,destination,transport:discordWebhookTransport,now:Date.now(),clock:Date.now});
            box=await drainAdvisories(box,{storage:localStorage,save:saveDiscordOutbox,destination,
              transport:discordWebhookTransport,now:Date.now(),clock:Date.now});
          }
          publish({rows:box.rows.map(({key,call,state,messageId,channelId,error,ackAt})=>({key,call,state,messageId,channelId,error,ackAt})),
            advisories:box.advisories.map(({key,family,title,state,messageId,channelId,error})=>({key,family,title,state,messageId,channelId,error})),
            archivedAdvisoryUncertain:box.archivedAdvisoryUncertain||0,
            records,error,checkedAt:now,configured:!!destination});
        });
      }catch{
        // Do not expose webhook URLs, raw bodies, or unrelated local data.
        publish({...viewRef.current,error:'Discord queue or safe browser locking unavailable. Sending stopped; check storage and the channel before retrying.',checkedAt:Date.now()});
      }finally{busy.current=false;}
    };
    tick();const interval=setInterval(tick,5000);
    const online=()=>tick();window.addEventListener('online',online);
    return()=>{alive=false;clearInterval(interval);window.removeEventListener('online',online);};
  },[enabled]);
  return view;
}
