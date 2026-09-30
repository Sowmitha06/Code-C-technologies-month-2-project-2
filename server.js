import 'dotenv/config'; import express from 'express'; import cors from 'cors'; import mongoose from 'mongoose'; import http from 'http'; import jwt from 'jsonwebtoken'; import {Server} from 'socket.io';
import routes from './routes.js'; import {hub,secret} from './lib.js'; import {startSimulator} from './simulator.js';
const app=express(); app.use(cors()); app.use(express.json()); app.use('/api',routes);
const server=http.createServer(app),io=new Server(server,{cors:{origin:'*'}}); hub.io=io;
io.use((s,n)=>{try{s.data.id=jwt.verify(s.handshake.auth.token,secret()).id;n()}catch{n(Error('auth'))}}); // only logged-in users get live updates
io.on('connection',s=>s.join('u:'+s.data.id));
mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/homebase').then(()=>{server.listen(process.env.PORT||5000,()=>console.log('API on :'+(process.env.PORT||5000)));startSimulator()}).catch(e=>console.error(e));
