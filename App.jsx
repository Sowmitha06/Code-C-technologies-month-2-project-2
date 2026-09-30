import {useState,useEffect} from 'react';
import {io} from 'socket.io-client';
import api,{API_URL} from './api';
const ICON={light:'💡',fan:'🌀',tv:'📺',ac:'❄️',lock:'🔒',sensor:'🌡️'},DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function Auth({onDone}){
  const [reg,setReg]=useState(false),[f,setF]=useState({name:'',email:'',password:''}),[err,setErr]=useState('');
  const go=async()=>{try{const r=await api(reg?'/auth/register':'/auth/login','POST',f);localStorage.token=r.token;localStorage.user=JSON.stringify(r.user);onDone(r.user)}catch(e){setErr(e.message)}};
  const set=k=>e=>setF({...f,[k]:e.target.value});
  return <div className="card" style={{maxWidth:380,margin:'40px auto'}}><h2>{reg?'Create your home':'Welcome back'}</h2>
    {reg&&<input placeholder="Name" value={f.name} onChange={set('name')}/>}<input placeholder="Email" value={f.email} onChange={set('email')}/>
    <input type="password" placeholder="Password" value={f.password} onChange={set('password')}/>{err&&<p className="err">{err}</p>}
    <button className="p" onClick={go}>{reg?'Sign up':'Log in'}</button> <button className="g" onClick={()=>setReg(!reg)}>{reg?'I have an account':'New here? Sign up'}</button></div>;
}

const Switch=({on,onClick,label})=><button className={'sw'+(on?' on':'')} onClick={onClick} aria-label={label} aria-pressed={on}><i/></button>;

function Card({d,update}){
  const toggle=()=>api('/devices/'+d._id,'PATCH',{on:!d.on}).then(update);
  const temp=v=>api('/devices/'+d._id,'PATCH',{value:v}).then(update);
  return <div className={'card dev'+(d.on?' on':'')}><div className="row"><span className="ic">{ICON[d.type]}</span>{d.type!=='sensor'&&<Switch on={d.on} onClick={toggle} label={'Toggle '+d.name}/>}</div>
    <b>{d.name}</b><div className="mut">{d.type==='lock'?(d.on?'Locked':'Unlocked'):d.type==='sensor'?'Live reading':d.on?`On · ${d.watts} W`:'Off'}</div>
    {d.type==='sensor'&&<div className="stat">{d.value}°C</div>}
    {d.type==='ac'&&<div className="row" style={{marginTop:8}}><button className="g" onClick={()=>temp(d.value-1)}>−</button><b>{d.value}°C</b><button className="g" onClick={()=>temp(d.value+1)}>+</button></div>}</div>;
}

function Dashboard({devices,update,power}){
  const rooms=[...new Set(devices.map(d=>d.room))],on=devices.filter(d=>d.on&&d.type!=='sensor').length;
  const sim=k=>api('/simulate/'+k,'POST');
  return <><div className="grid" style={{marginBottom:20}}><div className="card"><div className="mut">Live power draw</div><div className="stat">{power} W</div></div>
    <div className="card"><div className="mut">Devices on</div><div className="stat">{on} / {devices.filter(d=>d.type!=='sensor').length}</div></div>
    <div className="card"><div className="mut">Simulate IoT events</div><button className="g" onClick={()=>sim('motion')}>Motion</button> <button className="g" onClick={()=>sim('heat')}>Heat spike</button></div></div>
    {!devices.length&&<p>No devices yet. Add one from the Devices page.</p>}
    {rooms.map(r=><section key={r} style={{marginBottom:20}}><h3>{r}</h3><div className="grid">{devices.filter(d=>d.room===r).map(d=><Card key={d._id} d={d} update={update}/>)}</div></section>)}</>;
}

function Devices({devices,reload}){
  const [f,setF]=useState({name:'',room:'',type:'light',watts:10}),[err,setErr]=useState('');
  const add=async()=>{try{await api('/devices','POST',f);setF({...f,name:''});setErr('');reload()}catch(e){setErr(e.message)}};
  return <><h2>Manage devices</h2><div className="card"><input placeholder="Device name" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input placeholder="Room" value={f.room} onChange={e=>setF({...f,room:e.target.value})}/>
    <div className="row"><select value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{Object.keys(ICON).map(t=><option key={t}>{t}</option>)}</select>
    <input type="number" placeholder="Watts" value={f.watts} onChange={e=>setF({...f,watts:e.target.value})}/></div>{err&&<p className="err">{err}</p>}<button className="p" onClick={add}>Add device</button></div>
    <div className="card" style={{marginTop:14}}>{devices.map(d=><div className="row" key={d._id} style={{padding:'6px 0'}}><span>{ICON[d.type]} {d.name} <span className="mut">· {d.room} · {d.watts} W</span></span>
      <button className="g" onClick={()=>confirm('Delete '+d.name+'?')&&api('/devices/'+d._id,'DELETE').then(reload)}>Delete</button></div>)}</div></>;
}

function Schedules({devices}){
  const [l,setL]=useState([]),[f,setF]=useState({device:'',action:'on',time:'18:00',days:[1,2,3,4,5]}),[err,setErr]=useState('');
  const load=()=>api('/schedules').then(setL); useEffect(()=>{load()},[]);
  const day=i=>setF({...f,days:f.days.includes(i)?f.days.filter(x=>x!==i):[...f.days,i]});
  const add=async()=>{try{await api('/schedules','POST',{...f,device:f.device||devices[0]?._id});setErr('');load()}catch(e){setErr(e.message)}};
  return <><h2>Schedules</h2><div className="card"><select value={f.device} onChange={e=>setF({...f,device:e.target.value})}>{devices.map(d=><option key={d._id} value={d._id}>{d.name} ({d.room})</option>)}</select>
    <div className="row"><select value={f.action} onChange={e=>setF({...f,action:e.target.value})}><option value="on">Turn on</option><option value="off">Turn off</option></select><input type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/></div>
    <div className="days" style={{marginBottom:10}}>{DAYS.map((n,i)=><label key={n}><input type="checkbox" checked={f.days.includes(i)} onChange={()=>day(i)}/>{n}</label>)}</div>
    {err&&<p className="err">{err}</p>}<button className="p" onClick={add}>Add schedule</button></div>
    <div className="card" style={{marginTop:14}}>{!l.length&&<p className="mut">No schedules yet. Add one above; it runs at the chosen time on the server.</p>}
    {l.map(s=><div className="row" key={s._id} style={{padding:'6px 0'}}><span>{s.device?.name||'Removed device'}: turn {s.action} at {s.time} <span className="mut">· {s.days.map(i=>DAYS[i]).join(', ')}</span></span>
      <span><Switch on={s.enabled} label="Enable schedule" onClick={()=>api('/schedules/'+s._id,'PATCH',{enabled:!s.enabled}).then(load)}/> <button className="g" onClick={()=>api('/schedules/'+s._id,'DELETE').then(load)}>Delete</button></span></div>)}</div></>;
}

function Energy(){
  const [d,setD]=useState(null); useEffect(()=>{const f=()=>api('/analytics').then(setD);f();const t=setInterval(f,10000);return()=>clearInterval(t)},[]);
  if(!d) return <p>Loading…</p>; const mx=Math.max(...d.days.map(x=>x.kwh),1),md=Math.max(...d.devices.map(x=>x.kwh),1);
  return <><h2>Energy usage</h2><div className="grid"><div className="card"><div className="mut">Last 7 days</div><div className="stat">{d.total} kWh</div></div><div className="card"><div className="mut">Estimated cost at ₹{d.rate}/kWh</div><div className="stat">₹{d.cost}</div></div></div>
    <div className="card" style={{marginTop:14}}><h3>Daily consumption (kWh)</h3><div style={{display:'flex',alignItems:'flex-end',gap:8,height:160}}>
      {d.days.map(x=><div key={x.day} style={{flex:1,textAlign:'center'}}><div className="mut">{x.kwh}</div><div style={{height:Math.max(x.kwh/mx*110,2),background:'var(--acc)',borderRadius:4}}/><div className="mut">{x.day.slice(5)}</div></div>)}</div></div>
    <div className="card" style={{marginTop:14}}><h3>By device</h3>{d.devices.map(x=><div key={x.name} style={{marginBottom:8}}><div className="row"><span>{x.name}</span><span className="mut">{x.kwh} kWh</span></div><div className="bar"><i style={{width:x.kwh/md*100+'%'}}/></div></div>)}</div></>;
}

function Alerts({notes,markRead}){
  return <><div className="row"><h2>Notifications</h2><button className="g" onClick={markRead}>Mark all read</button></div>{!notes.length&&<p className="mut">Nothing yet. Alerts for schedules, motion and high temperature appear here.</p>}
    {notes.map(n=><div key={n._id} className={'card'+(n.type==='warning'?' warn':'')} style={{marginBottom:8,opacity:n.read?.6:1}}>{n.message}<div className="mut">{new Date(n.createdAt).toLocaleString()}</div></div>)}</>;
}

export default function App(){
  const [user,setUser]=useState(()=>JSON.parse(localStorage.user||'null')),[page,setPage]=useState('home'),[devices,setDevices]=useState([]),[notes,setNotes]=useState([]),[power,setPower]=useState(0),[toast,setToast]=useState('');
  const reload=()=>api('/devices').then(setDevices);
  const update=d=>setDevices(l=>l.some(x=>x._id===d._id)?l.map(x=>x._id===d._id?d:x):[...l,d]);
  useEffect(()=>{if(!user)return; reload(); api('/notifications').then(setNotes);
    const s=io(API_URL,{auth:{token:localStorage.token}});
    s.on('device',update); s.on('power',p=>setPower(p.watts)); s.on('notification',n=>{setNotes(l=>[n,...l]);setToast(n.message);setTimeout(()=>setToast(''),4000)});
    return()=>s.disconnect()},[user]);
  if(!user) return <main><Auth onDone={setUser}/></main>;
  const unread=notes.filter(n=>!n.read).length;
  const Tab=({id,children})=><button className={page===id?'on':''} onClick={()=>setPage(id)}>{children}</button>;
  return <><nav><b>Homebase</b><Tab id="home">Dashboard</Tab><Tab id="devices">Devices</Tab><Tab id="sched">Schedules</Tab><Tab id="energy">Energy</Tab>
    <Tab id="alerts">Alerts{unread>0&&<span className="badge">{unread}</span>}</Tab><button onClick={()=>{localStorage.clear();setUser(null)}}>Log out ({user.name})</button></nav>
    <main>{page==='home'&&<Dashboard devices={devices} update={update} power={power}/>}{page==='devices'&&<Devices devices={devices} reload={reload}/>}{page==='sched'&&<Schedules devices={devices}/>}
    {page==='energy'&&<Energy/>}{page==='alerts'&&<Alerts notes={notes} markRead={()=>api('/notifications/read','POST').then(()=>setNotes(l=>l.map(n=>({...n,read:true}))))}/>}</main>{toast&&<div className="toast" role="status">{toast}</div>}</>;
}
