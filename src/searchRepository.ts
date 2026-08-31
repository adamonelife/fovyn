import {supabase} from './supabase';
import {goalOwner} from './goalsRepository';

const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};
export type SearchDestination='Goals'|'Log'|'History';
export type SearchResult={id:string;type:'Goal'|'Habit'|'Logging item'|'Record'|'Note'|'Sleep'|'Activity'|'Nutrition';title:string;detail:string;destination:SearchDestination};

export async function loadSearchIndex():Promise<SearchResult[]>{
  const user=await goalOwner();
  const[goals,habits,trackers,records,notes,sleep,activities,nutrition]=await Promise.all([
    supabase.from('goals').select('id,title,status,area_key').eq('owner_id',user.id).neq('status','archived').order('updated_at',{ascending:false}).limit(100),
    supabase.from('habits').select('id,name,active,area_key').eq('owner_id',user.id).is('archived_at',null).order('updated_at',{ascending:false}).limit(100),
    supabase.from('trackers').select('id,name,module,status').eq('owner_id',user.id).neq('status','archived').order('updated_at',{ascending:false}).limit(100),
    supabase.from('tracking_records').select('id,tracker_id,value,note,occurred_at,corrected_at').eq('owner_id',user.id).is('deleted_at',null).order('occurred_at',{ascending:false}).limit(100),
    supabase.from('notes').select('id,title,body,occurred_at,corrected_at').eq('owner_id',user.id).is('deleted_at',null).order('occurred_at',{ascending:false}).limit(100),
    supabase.from('sleep_entries').select('id,bedtime,wake_time,quality,waking_energy,corrected_at').eq('owner_id',user.id).is('deleted_at',null).order('wake_time',{ascending:false}).limit(100),
    supabase.from('cardio_entries').select('id,activity,duration_min,distance_km,occurred_at,performed_on,corrected_at').eq('owner_id',user.id).is('deleted_at',null).order('occurred_at',{ascending:false}).limit(100),
    supabase.from('nutrition_entries').select('id,name,meal_type,calories,protein_g,occurred_at,corrected_at').eq('owner_id',user.id).is('deleted_at',null).order('occurred_at',{ascending:false}).limit(100)
  ]);
  fail('Search Goals',goals.error);fail('Search habits',habits.error);fail('Search logging items',trackers.error);fail('Search records',records.error);fail('Search Notes',notes.error);fail('Search Sleep',sleep.error);fail('Search Activities',activities.error);fail('Search Nutrition',nutrition.error);
  const trackerNames=new Map((trackers.data??[]).map(x=>[x.id,x.name]));
  return[
    ...(goals.data??[]).map(x=>({id:x.id,type:'Goal' as const,title:x.title,detail:`${x.status} · ${x.area_key}`,destination:'Goals' as const})),
    ...(habits.data??[]).map(x=>({id:x.id,type:'Habit' as const,title:x.name,detail:`${x.active?'active':'paused'} · ${x.area_key}`,destination:'Log' as const})),
    ...(trackers.data??[]).map(x=>({id:x.id,type:'Logging item' as const,title:x.name,detail:`${x.module} · ${x.status}`,destination:'Log' as const})),
    ...(records.data??[]).map(x=>({id:x.id,type:'Record' as const,title:trackerNames.get(x.tracker_id)||'Recorded item',detail:`${x.note||x.value} · ${new Date(x.occurred_at).toLocaleDateString()}${x.corrected_at?' · corrected':''}`,destination:'History' as const})),
    ...(notes.data??[]).map(x=>({id:x.id,type:'Note' as const,title:x.title,detail:`${x.body} · ${new Date(x.occurred_at).toLocaleDateString()}${x.corrected_at?' · corrected':''}`,destination:'Log' as const})),
    ...(sleep.data??[]).map(x=>({id:x.id,type:'Sleep' as const,title:'Sleep',detail:`${Math.round((new Date(x.wake_time).getTime()-new Date(x.bedtime).getTime())/36000)/100} hours · ${x.quality} · ${x.waking_energy} energy · ${new Date(x.wake_time).toLocaleDateString()}${x.corrected_at?' · corrected':''}`,destination:'Log' as const})),
    ...(activities.data??[]).map(x=>({id:x.id,type:'Activity' as const,title:x.activity,detail:`${x.duration_min} min${x.distance_km!=null?` · ${x.distance_km} km`:''} · ${new Date(x.occurred_at??`${x.performed_on}T12:00:00`).toLocaleDateString()}${x.corrected_at?' · corrected':''}`,destination:'Log' as const})),
    ...(nutrition.data??[]).map(x=>({id:x.id,type:'Nutrition' as const,title:x.name,detail:`${x.meal_type} · ${x.calories} kcal · P ${x.protein_g}g · ${new Date(x.occurred_at).toLocaleDateString()}${x.corrected_at?' · corrected':''}`,destination:'Log' as const}))
  ];
}
