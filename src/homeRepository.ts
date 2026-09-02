import {supabase} from './supabase';
import {goalOwner} from './goalsRepository';
import{dateWeekday,fovynDateKey,fovynDateRange,shiftDateKey}from'./fovynDate';
import{loadRoutines,type Routine}from'./routinesRepository';

const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};
export type HomeHabit={id:string;name:string;tracking_type?:'check'|'count'|'duration';target_value?:number;unit?:string|null;status:'complete'|'failed'|'skipped'|null;frequency_type:'daily'|'specific_days'|'times_per_week'|null;days_of_week:number[]};
export type HomeTracker={id:string;name:string;module:string;icon_key:string;daypart:'morning'|'day'|'evening'|null;specific_time:string|null;recorded:boolean};
export type HomeGoal={id:string;title:string;status:'active'|'dormant'|'completed'|'ended'|'archived';presentation_priority:'primary'|'secondary';area_key:string};
export type HomeClearing={id:string;name:string;intention:string|null;starts_at:string;ends_at:string;focusedGoals:string[]};
export type HomeMoneyExpected={id:string;name:string;transaction_type:'income'|'expense';amount:number;currency:string;next_expected_date:string};
export type HomeData={profile:{first_name:string|null;display_name:string|null;current_climate:string;onboarding_completed_at:string|null;timezone:string};habits:HomeHabit[];trackers:HomeTracker[];routines:Routine[];moneyExpected:HomeMoneyExpected[];goals:HomeGoal[];recentCount:number;configuredCount:number;unresolvedRoundupDate:string|null;unresolvedHabits:HomeHabit[];currentClearing:HomeClearing|null;clearingReviewPending:{id:string;name:string}|null};
export type HabitResolution={habitId:string;status:'complete'|'failed'|'skipped';value:number|null};
export function expectedToday(habit:HomeHabit,date?:string|Date){
  if(habit.frequency_type==='daily')return true;
  const weekday=typeof date==='string'?dateWeekday(date):date instanceof Date?date.getDay():dateWeekday(fovynDateKey('UTC'));
  if(habit.frequency_type==='specific_days')return habit.days_of_week.includes(weekday);
  return false;
}

export async function loadHome():Promise<HomeData>{
  const user=await goalOwner(),profile=await supabase.from('profiles').select('first_name,display_name,current_climate,onboarding_completed_at,timezone').eq('id',user.id).single();
  fail('Home profile',profile.error);if(!profile.data)throw new Error('Home profile was not found.');
  const day=fovynDateKey(profile.data.timezone||'UTC'),yesterday=shiftDateKey(day,-1),since=new Date(Date.now()-86400000).toISOString();
  fail('Synchronise Current Clearing',(await supabase.rpc('sync_current_clearing')).error);
  const[goals,habits,trackers,moneyExpected,recent,configured,yesterdayRecords,yesterdayRoundup,currentClearing,clearingReview]=await Promise.all([
    supabase.from('goals').select('id,title,status,presentation_priority,area_key').eq('owner_id',user.id).order('created_at'),
    supabase.from('habits').select('id,name,tracking_type,target_value,unit').eq('owner_id',user.id).eq('active',true).is('archived_at',null).lte('start_date',day).or(`ends_on.is.null,ends_on.gte.${yesterday}`),
    supabase.from('trackers').select('id,name,module,icon_key').eq('owner_id',user.id).eq('status','active').neq('module','routines'),
    supabase.from('money_recurring_items').select('id,name,transaction_type,amount,currency,next_expected_date').eq('owner_id',user.id).eq('status','active').lte('next_expected_date',day).order('next_expected_date'),
    supabase.from('tracking_records').select('id',{count:'exact',head:true}).eq('owner_id',user.id).is('deleted_at',null).gte('occurred_at',since),
    supabase.from('trackers').select('id',{count:'exact',head:true}).eq('owner_id',user.id).neq('status','archived'),
    supabase.from('tracking_records').select('id',{count:'exact',head:true}).eq('owner_id',user.id).is('deleted_at',null).gte('occurred_at',`${yesterday}T00:00:00`).lt('occurred_at',`${day}T00:00:00`),
    supabase.from('daily_roundups').select('id').eq('owner_id',user.id).eq('roundup_date',yesterday).maybeSingle(),
    supabase.from('current_clearings').select('id,name,intention,starts_at,ends_at').eq('owner_id',user.id).eq('status','current').maybeSingle(),
    supabase.from('current_clearings').select('id,name').eq('owner_id',user.id).eq('status','review_pending').order('ends_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  fail('Home Goals',goals.error);fail('Home habits',habits.error);fail('Home trackers',trackers.error);fail('Expected Money',moneyExpected.error);fail('Recent activity',recent.error);fail('Configured items',configured.error);fail('Yesterday records',yesterdayRecords.error);fail('Yesterday Round-Up',yesterdayRoundup.error);fail('Current Clearing',currentClearing.error);fail('Clearing review',clearingReview.error);
  let focusedGoals:string[]=[];
  if(currentClearing.data){
    const focused=await supabase.from('clearing_goal_treatments').select('goal_id,goals(title)').eq('clearing_id',currentClearing.data.id).eq('is_focused',true);
    fail('Clearing focus',focused.error);
    focusedGoals=(focused.data??[]).map(row=>(row.goals as unknown as {title:string}|null)?.title).filter((title):title is string=>Boolean(title));
  }
  const ids=(habits.data??[]).map(x=>x.id);
  const[schedules,entries]=ids.length?await Promise.all([
    supabase.from('habit_schedules').select('id,habit_id,frequency_type,days_of_week,effective_from,effective_to').in('habit_id',ids).lte('effective_from',day).or(`effective_to.is.null,effective_to.gte.${yesterday}`),
    supabase.from('habit_entries').select('habit_id,status,entry_date').in('habit_id',ids).in('entry_date',[day,yesterday])
  ]):[{data:[],error:null},{data:[],error:null}];
  fail('Home schedules',schedules.error);fail('Home habit entries',entries.error);
  const makeHabit=(h:{id:string;name:string;tracking_type:'check'|'count'|'duration';target_value:number;unit:string|null},date:string):HomeHabit=>{const s=(schedules.data??[]).find(x=>x.habit_id===h.id&&x.effective_from<=date&&(!x.effective_to||x.effective_to>=date)),e=(entries.data??[]).find(x=>x.habit_id===h.id&&x.entry_date===date);return{id:h.id,name:h.name,tracking_type:h.tracking_type,target_value:Number(h.target_value),unit:h.unit,status:(e?.status??null) as HomeHabit['status'],frequency_type:(s?.frequency_type??null) as HomeHabit['frequency_type'],days_of_week:s?.days_of_week??[]}};
  const todayHabits=(habits.data??[]).map(h=>makeHabit(h,day)),yesterdayHabits=(habits.data??[]).map(h=>makeHabit(h,yesterday)),unresolvedHabits=yesterdayHabits.filter(h=>expectedToday(h,yesterday)&&!h.status),hadYesterdayActivity=(yesterdayRecords.count??0)>0||(entries.data??[]).some(x=>x.entry_date===yesterday);
  const trackerIds=(trackers.data??[]).map(x=>x.id),todayRange=fovynDateRange(day,profile.data.timezone||'UTC');
  const[trackerSchedules,trackerRecords]=trackerIds.length?await Promise.all([
    supabase.from('tracker_schedules').select('tracker_id,frequency_type,days_of_week,daypart,specific_time').in('tracker_id',trackerIds).lte('effective_from',day).or(`effective_to.is.null,effective_to.gte.${day}`),
    supabase.from('tracking_records').select('tracker_id').in('tracker_id',trackerIds).is('deleted_at',null).gte('occurred_at',todayRange.start.toISOString()).lt('occurred_at',todayRange.end.toISOString())
  ]):[{data:[],error:null},{data:[],error:null}];
  fail('Home tracker schedules',trackerSchedules.error);fail('Home tracker records',trackerRecords.error);
  const expectedTrackers=(trackers.data??[]).flatMap(tracker=>{const schedule=(trackerSchedules.data??[]).find(x=>x.tracker_id===tracker.id);if(!schedule||!(schedule.frequency_type==='daily'||(schedule.frequency_type==='specific_days'&&schedule.days_of_week.includes(dateWeekday(day)))))return[];return[{...tracker,daypart:schedule.daypart??null,specific_time:schedule.specific_time??null,recorded:(trackerRecords.data??[]).some(x=>x.tracker_id===tracker.id)} as HomeTracker]});
  const routineData=await loadRoutines(day),routines=routineData.routines.filter(r=>r.status==='active'&&(r.schedule.frequency_type==='daily'||r.schedule.frequency_type==='times_per_week'||(r.schedule.frequency_type==='specific_days'&&r.schedule.days_of_week.includes(dateWeekday(day)))));
  return{profile:profile.data,goals:(goals.data??[]) as HomeGoal[],recentCount:recent.count??0,configuredCount:configured.count??0,unresolvedRoundupDate:(hadYesterdayActivity||unresolvedHabits.length)&&!yesterdayRoundup.data?yesterday:null,unresolvedHabits,habits:todayHabits,trackers:expectedTrackers,routines,moneyExpected:(moneyExpected.data??[]).map(item=>({...item,amount:Number(item.amount)})) as HomeMoneyExpected[],currentClearing:currentClearing.data?{...currentClearing.data,focusedGoals}:null,clearingReviewPending:clearingReview.data};
}

export async function completeOnboarding(){const user=await goalOwner();fail('Complete onboarding',(await supabase.from('profiles').update({onboarding_completed_at:new Date().toISOString()}).eq('id',user.id)).error)}
export async function saveRoundup(date:string,mood:'bad'|'ok'|'great',note:string,resolutions:HabitResolution[]){await goalOwner();fail('Save Round-Up',(await supabase.rpc('save_daily_roundup',{p_roundup_date:date,p_mood:mood,p_note:note,p_resolutions:resolutions.map(item=>({habit_id:item.habitId,status:item.status,value:item.value}))})).error)}
