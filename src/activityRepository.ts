import {supabase} from './supabase';
import {goalOwner} from './goalsRepository';
import type {Tracker} from './trackerRepository';

const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};
export type ActivityEntry={id:string;tracker_id:string|null;performed_on:string;occurred_at:string|null;activity:string;duration_min:number;watch_calories:number|null;distance_km:number|null;average_hr:number|null;notes:string|null;is_social:boolean;corrected_at:string|null;goalIds:string[]};
export type ActivityInput={trackerId:string|null;activity:string;occurredAt:string;durationMin:number;watchCalories:number|null;distanceKm:number|null;averageHr:number|null;notes:string;isSocial:boolean;goalIds:string[]};
export type ActivityData={trackers:Tracker[];entries:ActivityEntry[];goals:{id:string;title:string}[]};

export function validateActivity(input:ActivityInput){
  if(!input.activity.trim())throw new Error('Choose an activity type.');
  if(!Number.isFinite(input.durationMin)||input.durationMin<=0)throw new Error('Duration must be greater than zero.');
  for(const [label,value] of [['Distance',input.distanceKm],['Calories',input.watchCalories],['Average heart rate',input.averageHr]] as const)if(value!==null&&(!Number.isFinite(value)||value<0))throw new Error(`${label} cannot be negative.`);
}

export async function loadActivities():Promise<ActivityData>{
  const user=await goalOwner();
  const[trackers,entries,goals,links]=await Promise.all([
    supabase.from('trackers').select('*').eq('owner_id',user.id).eq('module','activity').neq('status','archived').order('name'),
    supabase.from('cardio_entries').select('id,tracker_id,performed_on,occurred_at,activity,duration_min,watch_calories,distance_km,average_hr,notes,is_social,corrected_at').eq('owner_id',user.id).is('deleted_at',null).order('occurred_at',{ascending:false}),
    supabase.from('goals').select('id,title').eq('owner_id',user.id).in('status',['active','dormant']).order('title'),
    supabase.from('cardio_entry_goals').select('cardio_entry_id,goal_id').eq('owner_id',user.id)
  ]);
  fail('Activity types',trackers.error);fail('Activities',entries.error);fail('Activity Goals',goals.error);fail('Activity Goal links',links.error);
  return{trackers:(trackers.data??[]).map(x=>({...x,schedule:null,recordCount:0,recentCount:0,lastRecordedAt:null})) as Tracker[],entries:(entries.data??[]).map(x=>({...x,goalIds:(links.data??[]).filter(l=>l.cardio_entry_id===x.id).map(l=>l.goal_id)})) as ActivityEntry[],goals:(goals.data??[]) as {id:string;title:string}[]};
}

export async function saveActivity(input:ActivityInput,id?:string){
  validateActivity(input);const user=await goalOwner(),occurred=new Date(input.occurredAt).toISOString(),payload={owner_id:user.id,tracker_id:input.trackerId,performed_on:occurred.slice(0,10),occurred_at:occurred,activity:input.activity.trim(),duration_min:input.durationMin,watch_calories:input.watchCalories,distance_km:input.distanceKm,average_hr:input.averageHr,notes:input.notes.trim()||null,is_social:input.isSocial,updated_at:new Date().toISOString(),...(id?{corrected_at:new Date().toISOString()}:{})};
  let entryId=id;
  if(id){const updated=await supabase.from('cardio_entries').update(payload).eq('id',id).eq('owner_id',user.id).is('deleted_at',null).select('id').single();fail('Correct activity',updated.error)}else{const created=await supabase.from('cardio_entries').insert(payload).select('id').single();fail('Log activity',created.error);entryId=created.data?.id}
  if(!entryId)throw new Error('Activity was not saved.');
  fail('Replace Activity Goal links',(await supabase.from('cardio_entry_goals').delete().eq('cardio_entry_id',entryId).eq('owner_id',user.id)).error);
  if(input.goalIds.length)fail('Link Activity Goals',(await supabase.from('cardio_entry_goals').insert(input.goalIds.map(goal_id=>({cardio_entry_id:entryId,goal_id,owner_id:user.id})))).error);
}

export async function removeActivity(id:string){const user=await goalOwner();const result=await supabase.from('cardio_entries').update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',user.id).is('deleted_at',null).select('id').single();fail('Remove activity',result.error)}
