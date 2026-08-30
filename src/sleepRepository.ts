import {supabase} from './supabase';
import {goalOwner} from './goalsRepository';

const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};
export type SleepQuality='poor'|'fair'|'good'|'great';
export type WakingEnergy='low'|'medium'|'high';
export type SleepEntry={id:string;bedtime:string;wake_time:string;quality:SleepQuality;waking_energy:WakingEnergy;notes:string|null;corrected_at:string|null;goalIds:string[]};
export type SleepInput={bedtime:string;wakeTime:string;quality:SleepQuality;wakingEnergy:WakingEnergy;notes:string;goalIds:string[]};
export type SleepData={entries:SleepEntry[];goals:{id:string;title:string}[]};

export async function loadSleep():Promise<SleepData>{const owner=await goalOwner();const[entries,goals,links]=await Promise.all([supabase.from('sleep_entries').select('id,bedtime,wake_time,quality,waking_energy,notes,corrected_at').eq('owner_id',owner.id).is('deleted_at',null).order('wake_time',{ascending:false}),supabase.from('goals').select('id,title').eq('owner_id',owner.id).in('status',['active','dormant']).order('title'),supabase.from('sleep_entry_goals').select('sleep_entry_id,goal_id').eq('owner_id',owner.id)]);fail('Sleep entries',entries.error);fail('Sleep Goals',goals.error);fail('Sleep Goal links',links.error);return{entries:(entries.data??[]).map(x=>({...x,goalIds:(links.data??[]).filter(l=>l.sleep_entry_id===x.id).map(l=>l.goal_id)})) as SleepEntry[],goals:(goals.data??[]) as {id:string;title:string}[]}}

export async function saveSleep(input:SleepInput,id?:string){const owner=await goalOwner(),payload={owner_id:owner.id,bedtime:input.bedtime,wake_time:input.wakeTime,quality:input.quality,waking_energy:input.wakingEnergy,notes:input.notes.trim()||null,updated_at:new Date().toISOString(),...(id?{corrected_at:new Date().toISOString()}:{})};let entryId=id;if(id)fail('Correct sleep',(await supabase.from('sleep_entries').update(payload).eq('id',id).eq('owner_id',owner.id)).error);else{const created=await supabase.from('sleep_entries').insert(payload).select('id').single();fail('Log sleep',created.error);entryId=created.data?.id}if(!entryId)throw new Error('Sleep entry was not saved.');fail('Replace Sleep Goal links',(await supabase.from('sleep_entry_goals').delete().eq('sleep_entry_id',entryId).eq('owner_id',owner.id)).error);if(input.goalIds.length)fail('Link Sleep Goals',(await supabase.from('sleep_entry_goals').insert(input.goalIds.map(goal_id=>({sleep_entry_id:entryId,goal_id,owner_id:owner.id})))).error)}
export async function removeSleep(id:string){const owner=await goalOwner();fail('Remove sleep',(await supabase.from('sleep_entries').update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',owner.id)).error)}
export const sleepHours=(entry:Pick<SleepEntry,'bedtime'|'wake_time'>)=>Math.round((new Date(entry.wake_time).getTime()-new Date(entry.bedtime).getTime())/36000)/100;
