import {useEffect,useState} from 'react';
import {LEARNING_PROTOCOL,activeModel} from './learningCore.js';
import {setLearningRegistry} from './learningCapture.js';
export function useLearningRegistry(){
  const [state,setState]=useState({registry:null,status:'loading',checkedAt:0});
  useEffect(()=>{let stopped=false,controller;
    const load=async()=>{controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
      try{const r=await fetch('/api/learning',{signal:controller.signal,cache:'no-store'});if(!r.ok)throw new Error('unavailable');const data=await r.json();
        if(data.protocol!==LEARNING_PROTOCOL||!Number.isFinite(data.generatedAt)||data.generatedAt>Date.now()+2000||!data.profiles)throw new Error('invalid');
        if(!stopped){setLearningRegistry(data);setState({registry:data,status:Date.now()-data.generatedAt>48*3600000?'stale':'ready',checkedAt:Date.now()});}
      }catch{if(!stopped)setState(s=>({...s,status:'unavailable',checkedAt:Date.now()}));}finally{clearTimeout(timer);}};
    void load();const interval=setInterval(load,180000);return()=>{stopped=true;controller?.abort();clearInterval(interval);};
  },[]);
  return {...state,model:(profile)=>state.status==='ready'?activeModel(state.registry,profile):null};
}
