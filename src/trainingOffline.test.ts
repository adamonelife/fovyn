import{beforeEach,describe,expect,it,vi}from'vitest';
const storage=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}});Object.defineProperty(globalThis,'crypto',{value:{randomUUID:()=> 'queue-1'}});
import{queueWorkout,queuedWorkouts}from'./trainingOffline';
describe('offline workout queue',()=>{beforeEach(()=>storage.clear());it('preserves a full workout payload for later sync',()=>{queueWorkout({date:'2026-08-30',type:'Pull',variant:'A',items:[]});expect(queuedWorkouts()[0]).toMatchObject({id:'queue-1',payload:{type:'Pull',variant:'A'}})})});
