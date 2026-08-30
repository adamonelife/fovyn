import {supabase} from './supabase';
import {goalOwner} from './goalsRepository';

const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};
export type SearchDestination='Goals'|'Log'|'History';
export type SearchResult={id:string;type:'Goal'|'Habit'|'Logging item'|'Record'|'Note';title:string;detail:string;destination:SearchDestination};

export async function loadSearchIndex():Promise<SearchResult[]>{
  const user=await goalOwner();
  const[goals,habits,trackers,records,notes]=await Promise.all([
    supabase.from('goals').select('id,title,status,area_key').eq('owner_id',user.id).neq('status','archived').order('updated_at',{ascending:false}).limit(100),
    supabase.from('habits').select('id,name,active,area_key').eq('owner_id',user.id).is('archived_at',null).order('updated_at',{ascending:false}).limit(100),
    supabase.from('trackers').select('id,name,module,status').eq('owner_id',user.id).neq('status','archived').order('updated_at',{ascending:false}).limit(100),
    supabase.from('tracking_records').select('id,tracker_id,value,note,occurred_at,corrected_at').eq('owner_id',user.id).is('deleted_at',null).order('occurred_at',{ascending:false}).limit(100),
    supabase.from('notes').select('id,title,body,occurred_at,corrected_at').eq('owner_id',user.id).is('deleted_at',null).order('occurred_at',{ascending:false}).limit(100)
  ]);
  fail('Search Goals',goals.error);fail('Search habits',habits.error);fail('Search logging items',trackers.error);fail('Search records',records.error);fail('Search Notes',notes.error);
  const trackerNames=new Map((trackers.data??[]).map(x=>[x.id,x.name]));
  return[
    ...(goals.data??[]).map(x=>({id:x.id,type:'Goal' as const,title:x.title,detail:`${x.status} · ${x.area_key}`,destination:'Goals' as const})),
    ...(habits.data??[]).map(x=>({id:x.id,type:'Habit' as const,title:x.name,detail:`${x.active?'active':'paused'} · ${x.area_key}`,destination:'Log' as const})),
    ...(trackers.data??[]).map(x=>({id:x.id,type:'Logging item' as const,title:x.name,detail:`${x.module} · ${x.status}`,destination:'Log' as const})),
    ...(records.data??[]).map(x=>({id:x.id,type:'Record' as const,title:trackerNames.get(x.tracker_id)||'Recorded item',detail:`${x.note||x.value} · ${new Date(x.occurred_at).toLocaleDateString()}${x.corrected_at?' · corrected':''}`,destination:'History' as const})),
    ...(notes.data??[]).map(x=>({id:x.id,type:'Note' as const,title:x.title,detail:`${x.body} · ${new Date(x.occurred_at).toLocaleDateString()}${x.corrected_at?' · corrected':''}`,destination:'Log' as const}))
  ];
}
