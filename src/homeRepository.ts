import {supabase} from './supabase';
import {goalOwner} from './goalsRepository';

const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};
export type HomeHabit={id:string;name:string;status:'complete'|'failed'|'skipped'|null;frequency_type:'daily'|'specific_days'|'times_per_week'|null;days_of_week:number[]};
export type HomeGoal={id:string;title:string;status:'active'|'dormant'|'completed'|'ended'|'archived';presentation_priority:'primary'|'secondary';area_key:string};
export type HomeData={profile:{first_name:string|null;display_name:string|null;current_climate:string;onboarding_completed_at:string|null};habits:HomeHabit[];goals:HomeGoal[];recentCount:number;configuredCount:number;unresolvedRoundupDate:string|null};
const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export function expectedToday(habit:HomeHabit,date=new Date()){
  if(habit.frequency_type==='daily')return true;
  if(habit.frequency_type==='specific_days')return habit.days_of_week.includes(date.getDay());
  return false;
}

export async function loadHome():Promise<HomeData>{
  const user=await goalOwner(),now=new Date(),day=dateKey(now),yesterdayDate=new Date(now);yesterdayDate.setDate(yesterdayDate.getDate()-1);const yesterday=dateKey(yesterdayDate),since=new Date(Date.now()-24*60*60*1000).toISOString();
  const[profile,goals,habits,recent,configured,yesterdayRecords,yesterdayHabits,yesterdayRoundup]=await Promise.all([
    supabase.from('profiles').select('first_name,display_name,current_climate,onboarding_completed_at').eq('id',user.id).single(),
    supabase.from('goals').select('id,title,status,presentation_priority,area_key').eq('owner_id',user.id).order('created_at'),
    supabase.from('habits').select('id,name').eq('owner_id',user.id).eq('active',true).is('archived_at',null).lte('start_date',day).or(`ends_on.is.null,ends_on.gte.${day}`),
    supabase.from('tracking_records').select('id',{count:'exact',head:true}).eq('owner_id',user.id).is('deleted_at',null).gte('occurred_at',since),
    supabase.from('trackers').select('id',{count:'exact',head:true}).eq('owner_id',user.id).neq('status','archived'),
    supabase.from('tracking_records').select('id',{count:'exact',head:true}).eq('owner_id',user.id).is('deleted_at',null).gte('occurred_at',`${yesterday}T00:00:00`).lt('occurred_at',`${day}T00:00:00`),
    supabase.from('habit_entries').select('id',{count:'exact',head:true}).eq('owner_id',user.id).eq('entry_date',yesterday),
    supabase.from('daily_roundups').select('id').eq('owner_id',user.id).eq('roundup_date',yesterday).maybeSingle()
  ]);
  fail('Home profile',profile.error);fail('Home Goals',goals.error);fail('Home habits',habits.error);fail('Recent activity',recent.error);
  if(!profile.data)throw new Error('Home profile was not found.');
  const ids=(habits.data??[]).map(x=>x.id);
  const[schedules,entries]=ids.length?await Promise.all([
    supabase.from('habit_schedules').select('habit_id,frequency_type,days_of_week').in('habit_id',ids).is('effective_to',null),
    supabase.from('habit_entries').select('habit_id,status').in('habit_id',ids).eq('entry_date',day)
  ]):[{data:[],error:null},{data:[],error:null}];
  fail('Home schedules',schedules.error);fail('Home habit entries',entries.error);
  fail('Configured items',configured.error);fail('Yesterday records',yesterdayRecords.error);fail('Yesterday habits',yesterdayHabits.error);fail('Yesterday Round-Up',yesterdayRoundup.error);const hadYesterdayActivity=(yesterdayRecords.count??0)+(yesterdayHabits.count??0)>0;return{profile:profile.data,goals:(goals.data??[]) as HomeGoal[],recentCount:recent.count??0,configuredCount:configured.count??0,unresolvedRoundupDate:hadYesterdayActivity&&!yesterdayRoundup.data?yesterday:null,habits:(habits.data??[]).map(h=>{const s=(schedules.data??[]).find(x=>x.habit_id===h.id),e=(entries.data??[]).find(x=>x.habit_id===h.id);return{id:h.id,name:h.name,status:(e?.status??null) as HomeHabit['status'],frequency_type:(s?.frequency_type??null) as HomeHabit['frequency_type'],days_of_week:s?.days_of_week??[]}})};
}

export async function completeOnboarding(){const user=await goalOwner();fail('Complete onboarding',(await supabase.from('profiles').update({onboarding_completed_at:new Date().toISOString()}).eq('id',user.id)).error)}
export async function saveRoundup(date:string,mood:'hard'|'ok'|'good'|'great',note:string){const user=await goalOwner();fail('Save Round-Up',(await supabase.from('daily_roundups').upsert({owner_id:user.id,roundup_date:date,mood,note:note.trim()||null,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'owner_id,roundup_date'})).error)}
