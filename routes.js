import {Router} from 'express'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken';
import {User,Device,Schedule,Notification,Usage} from './models.js'; import {secret,notify,push,dayKey,seedHome} from './lib.js';
const r=Router(),wrap=f=>(q,s,n)=>f(q,s,n).catch(e=>s.status(400).json({error:e.message}));
const auth=(q,s,n)=>{try{q.user=jwt.verify((q.headers.authorization||'').slice(7),secret());n()}catch{s.status(401).json({error:'Login required'})}};
const sign=u=>({token:jwt.sign({id:u._id,name:u.name},secret(),{expiresIn:'7d'}),user:{name:u.name}});
r.post('/auth/register',wrap(async(q,s)=>{const {name,email,password}=q.body; if(!name||!email||!password||password.length<6) throw Error('Name, email and 6+ char password required');
 const u=await User.create({name,email:email.toLowerCase(),password:await bcrypt.hash(password,10)}); await seedHome(u._id); s.json(sign(u))}));
r.post('/auth/login',wrap(async(q,s)=>{const u=await User.findOne({email:(q.body.email||'').toLowerCase()});
 if(!u||!await bcrypt.compare(q.body.password||'',u.password)) throw Error('Invalid email or password'); s.json(sign(u))}));
// Devices
r.get('/devices',auth,wrap(async(q,s)=>s.json(await Device.find({user:q.user.id}).sort('room name'))));
r.post('/devices',auth,wrap(async(q,s)=>{const {name,room,type,watts}=q.body; if(!name||!room) throw Error('Name and room required'); s.json(await Device.create({user:q.user.id,name,room,type,watts:Math.max(0,+watts||0),value:type==='ac'?24:undefined}))}));
r.patch('/devices/:id',auth,wrap(async(q,s)=>{const p={},b=q.body; if(typeof b.on==='boolean')p.on=b.on; if(b.value!==undefined)p.value=Math.min(30,Math.max(16,+b.value));
 const d=await Device.findOneAndUpdate({_id:q.params.id,user:q.user.id},p,{new:true}); if(!d) throw Error('Device not found'); push(d); s.json(d)}));
r.delete('/devices/:id',auth,wrap(async(q,s)=>{await Device.deleteOne({_id:q.params.id,user:q.user.id});await Schedule.deleteMany({device:q.params.id});s.json({ok:1})}));
// Schedules
r.get('/schedules',auth,wrap(async(q,s)=>s.json(await Schedule.find({user:q.user.id}).populate('device','name room'))));
r.post('/schedules',auth,wrap(async(q,s)=>{const {device,action,time,days}=q.body;
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'')||!days?.length||!['on','off'].includes(action)) throw Error('Pick a device, action, time and at least one day');
 if(!await Device.exists({_id:device,user:q.user.id})) throw Error('Device not found'); s.json(await Schedule.create({user:q.user.id,device,action,time,days}))}));
r.patch('/schedules/:id',auth,wrap(async(q,s)=>s.json(await Schedule.findOneAndUpdate({_id:q.params.id,user:q.user.id},{enabled:!!q.body.enabled},{new:true}))));
r.delete('/schedules/:id',auth,wrap(async(q,s)=>{await Schedule.deleteOne({_id:q.params.id,user:q.user.id});s.json({ok:1})}));
// Notifications
r.get('/notifications',auth,wrap(async(q,s)=>s.json(await Notification.find({user:q.user.id}).sort('-createdAt').limit(50))));
r.post('/notifications/read',auth,wrap(async(q,s)=>{await Notification.updateMany({user:q.user.id},{read:true});s.json({ok:1})}));
// Demo triggers for the IoT simulation
r.post('/simulate/:kind',auth,wrap(async(q,s)=>{
 if(q.params.kind==='motion') await notify(q.user.id,'Motion detected at the front door','warning');
 else if(q.params.kind==='heat'){const d=await Device.findOneAndUpdate({user:q.user.id,type:'sensor'},{value:35},{new:true}); if(d){push(d);await notify(q.user.id,`High temperature: 35°C in ${d.room}`,'warning')}}
 else throw Error('Unknown event'); s.json({ok:1})}));
// Energy analytics (last 7 days)
r.get('/analytics',auth,wrap(async(q,s)=>{const from=dayKey(new Date(Date.now()-6*864e5)),rate=+process.env.RATE_PER_KWH||8;
 const rows=await Usage.find({user:q.user.id,day:{$gte:from}}).populate('device','name'),byDay={},byDev={};
 for(const x of rows){byDay[x.day]=(byDay[x.day]||0)+x.kwh;const n=x.device?.name||'Removed device';byDev[n]=(byDev[n]||0)+x.kwh}
 const days=[];for(let i=6;i>=0;i--){const k=dayKey(new Date(Date.now()-i*864e5));days.push({day:k,kwh:+(byDay[k]||0).toFixed(2)})}
 const total=+days.reduce((a,d)=>a+d.kwh,0).toFixed(2);
 s.json({days,total,cost:Math.round(total*rate),rate,devices:Object.entries(byDev).map(([name,kwh])=>({name,kwh:+kwh.toFixed(2)})).sort((a,b)=>b.kwh-a.kwh)})}));
export default r;
