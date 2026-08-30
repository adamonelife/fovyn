import type{WorkoutSave}from'./trainingRepository';import{saveWorkout}from'./trainingRepository';
const KEY='forbair-pending-workouts-v1';
export type QueuedWorkout={id:string;queuedAt:string;payload:WorkoutSave};
export function queuedWorkouts():QueuedWorkout[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
export function queueWorkout(payload:WorkoutSave){const item={id:crypto.randomUUID(),queuedAt:new Date().toISOString(),payload};localStorage.setItem(KEY,JSON.stringify([...queuedWorkouts(),item]));return item}
export async function syncQueuedWorkouts(){const pending=queuedWorkouts(),failed:QueuedWorkout[]=[];let synced=0;for(const item of pending){try{await saveWorkout(item.payload);synced++}catch{failed.push(item)}}localStorage.setItem(KEY,JSON.stringify(failed));return{synced,remaining:failed.length}}
