import {Device,Usage,Notification} from './models.js';
export const hub={io:null}; export const secret=()=>process.env.JWT_SECRET||'dev';
export const dayKey=(d=new Date())=>d.toLocaleDateString('en-CA'); // YYYY-MM-DD in server local time
export const notify=async(user,message,type='info')=>{const n=await Notification.create({user,message,type});hub.io?.to('u:'+user).emit('notification',n)};
export const push=d=>hub.io?.to('u:'+d.user).emit('device',d);
const DEFAULTS=[{name:'Ceiling Light',room:'Living Room',type:'light',watts:12,on:true},{name:'Ceiling Fan',room:'Living Room',type:'fan',watts:60},
 {name:'Smart TV',room:'Living Room',type:'tv',watts:110},{name:'Air Conditioner',room:'Bedroom',type:'ac',watts:1400,value:24},
 {name:'Bedside Lamp',room:'Bedroom',type:'light',watts:8},{name:'Front Door Lock',room:'Entrance',type:'lock',watts:2,on:true},
 {name:'Temperature Sensor',room:'Hall',type:'sensor',watts:1,on:true,value:29}];
// New accounts get demo devices plus 7 days of fake usage so the analytics charts are not empty
export async function seedHome(user){
 const ds=await Device.insertMany(DEFAULTS.map(d=>({...d,user}))),rows=[];
 for(let i=1;i<=7;i++){const day=dayKey(new Date(Date.now()-i*864e5));
  for(const d of ds){const h={light:5,fan:8,tv:3,ac:6,lock:24,sensor:24,}[d.type]*(0.6+Math.random()*0.8);rows.push({user,device:d._id,day,kwh:+(d.watts*h/1000).toFixed(3)})}}
 await Usage.insertMany(rows);
}
