import {useEffect,useState} from 'react';
import {economicCalendarRisk,macroEventState,upcomingEvents} from './economicCalendar.js';
// Shared read-only snapshot lets existing engine and context widgets use one schedule.
let snapshot={status:'loading',sources:[],events:[]};
export const getEconomicCalendarSnapshot=()=>snapshot;
export const computeEconCalendarRisk=()=>economicCalendarRisk(snapshot);
export const getMacroEventState=(now=new Date())=>macroEventState(snapshot,Number(now));
export const getUpcomingMacroEvents=(now=new Date(),hours=24)=>upcomingEvents(snapshot,Number(now),hours);

export function useEconomicCalendar(){
  const [calendar,setCalendar]=useState(snapshot);
  useEffect(()=>{
    let stopped=false,busy=false,controller;
    const refresh=async()=>{
      if(busy||stopped)return;busy=true;controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),15000);
      try{
        const r=await fetch('/api/economic-calendar',{signal:controller.signal,cache:'no-store'});
        if(!r.ok)throw new Error(`Calendar HTTP ${r.status}`);
        const data=await r.json();
        if(data.version!==1||!Array.isArray(data.sources)||!Array.isArray(data.events))throw new Error('Invalid calendar response');
        if(!stopped){snapshot=data;setCalendar(data);}
      }catch(error){if(!stopped){snapshot={...snapshot,status:'unavailable',error:'Calendar refresh failed',sources:snapshot.sources.map(s=>({...s,status:s.fetchedAt?'stale':'unavailable'}))};setCalendar(snapshot);}}
      finally{clearTimeout(timer);busy=false;}
    };
    void refresh();const timer=setInterval(refresh,300000);
    const wake=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',wake);
    return()=>{stopped=true;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',wake);};
  },[]);
  return calendar;
}
