import mongoose from 'mongoose'; const {Schema,model}=mongoose, ref=n=>({type:Schema.Types.ObjectId,ref:n});
export const User=model('User',new Schema({name:String,email:{type:String,unique:true},password:String}));
export const Device=model('Device',new Schema({user:ref('User'),name:String,room:String,type:{type:String,enum:['light','fan','tv','ac','lock','sensor']},watts:{type:Number,default:0},on:{type:Boolean,default:false},value:Number}));
export const Schedule=model('Schedule',new Schema({user:ref('User'),device:ref('Device'),action:{type:String,enum:['on','off']},time:String,days:[Number],enabled:{type:Boolean,default:true},lastRun:String}));
export const Notification=model('Notification',new Schema({user:ref('User'),message:String,type:{type:String,default:'info'},read:{type:Boolean,default:false}},{timestamps:true}));
const u=new Schema({user:ref('User'),device:ref('Device'),day:String,kwh:{type:Number,default:0}}); u.index({device:1,day:1},{unique:true});
export const Usage=model('Usage',u);
