import {Device,Usage,Schedule} from './models.js'; import {hub,notify,push,dayKey} from './lib.js';
const SPEED=+process.env.SIM_SPEED||60,TICK=5,cool=new Map();
// IoT simulation: no real hardware — this loop plays the role of devices publishing readings
export function startSimulator(){
 setInterval(async()=>{try{
  const ds=await Device.find(),power={};
  for(const d of ds){const u=String(d.user); power[u]=power[u]||0;
   if(d.type==='sensor'){const cur=d.value??29,v=Math.round((cur+(Math.random()-0.5)*1.4+(29-cur)*0.05)*10)/10;
    await Device.updateOne({_id:d._id},{value:v}); d.value=v; push(d);
    if(v>=33&&Date.now()-(cool.get(String(d._id))||0)>300000){cool.set(String(d._id),Date.now());await notify(d.user,`High temperature: ${v}°C in ${d.room}`,'warning')}}
   if(d.on){power[u]+=d.watts; const kwh=d.watts*TICK*SPEED/3600/1000;
    await Usage.updateOne({device:d._id,day:dayKey()},{$inc:{kwh},$setOnInsert:{user:d.user}},{upsert:true})}}
  for(const u in power){hub.io?.to('u:'+u).emit('power',{watts:power[u]}); if(Math.random()<0.01) await notify(u,'Motion detected at the front door','warning')}
 }catch(e){console.error('sim',e.message)}},TICK*1000);
 // Scheduler: checks every 15s for schedules due this minute
 setInterval(async()=>{try{const n=new Date(),hm=n.toTimeString().slice(0,5),key=dayKey()+' '+hm;
  const ss=await Schedule.find({enabled:true,time:hm,days:n.getDay(),lastRun:{$ne:key}}).populate('device');
  for(const s of ss){if(!s.device) continue; const d=await Device.findByIdAndUpdate(s.device._id,{on:s.action==='on'},{new:true}); push(d);
   s.lastRun=key; await s.save(); await notify(s.user,`Schedule ran: ${d.name} turned ${s.action}`)}
 }catch(e){console.error('sched',e.message)}},15000);
}
