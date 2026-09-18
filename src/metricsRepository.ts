import {supabase} from './supabase';import {goalOwner,type UnitRow} from './goalsRepository';import type {Tracker} from './trackerRepository';import{fovynDateKey}from'./fovynDate';
const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};export type OccurrenceStatus='complete'|'failed'|'skipped';export type MetricRecord={id:string;tracker_id:string;value:number;unit_key:string|null;custom_unit:string|null;currency:string|null;occurred_at:string;note:string|null;corrected_at:string|null;deleted_at:string|null;occurrence_status:OccurrenceStatus|null};export type MetricData={trackers:Tracker[];records:MetricRecord[];units:UnitRow[];goalNames:Record<string,string[]>;timezone:string};
export async function loadMetrics():Promise<MetricData>{const user=await goalOwner();const[t,r,u,p]=await Promise.all([supabase.from('trackers').select('*').eq('owner_id',user.id).eq('module','metrics').neq('status','archived').order('name'),supabase.from('tracking_records').select('*').eq('owner_id',user.id).is('deleted_at',null).order('occurred_at',{ascending:false}).limit(100),supabase.from('measurement_units').select('*'),supabase.from('profiles').select('timezone').eq('id',user.id).single()]);fail('Metric trackers',t.error);fail('Metric entries',r.error);fail('Units',u.error);fail('Metric timezone',p.error);const timezone=p.data?.timezone||'UTC',ids=(t.data??[]).map(x=>x.id),goalNames:Record<string,string[]>={};if(ids.length){const links=await supabase.from('goal_trackers').select('tracker_id,goals(title)').in('tracker_id',ids);fail('Connected Goals',links.error);for(const link of links.data??[]){const title=(link.goals as unknown as {title:string}|null)?.title;if(title)(goalNames[link.tracker_id]??=[]).push(title)}}return{trackers:(t.data??[]).map(x=>{const own=(r.data??[]).filter(y=>y.tracker_id===x.id);return{...x,schedule:null,recordCount:own.length,recentCount:own.length,lastRecordedAt:own[0]?.occurred_at??null,recordDates:[...new Set(own.map(record=>fovynDateKey(timezone,new Date(record.occurred_at))))]}}) as Tracker[],records:(r.data??[]).filter(x=>ids.includes(x.tracker_id)) as MetricRecord[],units:(u.data??[]) as UnitRow[],goalNames,timezone}}
export function occurrenceValue(status:OccurrenceStatus,value:string){if(status!=='complete')return 0;if(value.trim()==='')return 1;const parsed=Number(value);if(!Number.isFinite(parsed)||parsed<0)throw new Error('Enter a valid value of zero or more.');return parsed}
export async function addMetricRecord(tracker:Tracker,value:number,occurredAt:string,note:string,currency?:string,occurrenceStatus:OccurrenceStatus|null=null,occurrenceDateKey?:string){const user=await goalOwner();if(tracker.metric_record_cardinality==='one_per_day'&&occurrenceDateKey){const[p,records]=await Promise.all([supabase.from('profiles').select('timezone').eq('id',user.id).single(),supabase.from('tracking_records').select('*').eq('owner_id',user.id).eq('tracker_id',tracker.id).is('deleted_at',null)]);fail('Metric timezone',p.error);fail('Existing Metric entries',records.error);const timezone=p.data?.timezone||'UTC',existing=(records.data??[]).find(record=>fovynDateKey(timezone,new Date(record.occurred_at))===occurrenceDateKey) as MetricRecord|undefined;if(existing){await correctMetricRecord(existing,value,occurredAt,note);return}}const row=await supabase.from('tracking_records').insert({owner_id:user.id,tracker_id:tracker.id,value,unit_key:tracker.unit_key,custom_unit:tracker.custom_unit,currency:tracker.measurement_type==='money'?(currency||'USD').toUpperCase():null,occurred_at:occurredAt,note:note.trim()||null,occurrence_status:occurrenceStatus}).select('id').single();fail('Add Metric entry',row.error);if(!row.data)throw new Error('Metric entry was not created.');}

export type BulkConflictPolicy='skip'|'replace';
export type BulkMetricResult={created:number;replaced:number;skipped:number;createdIds:string[];conflictDates:string[];failedDates:string[]};
export const occurrenceForDate=(dateKey:string,localTime:string)=>new Date(`${dateKey}T${localTime}`).toISOString();
export const normaliseBulkDates=(dateKeys:string[])=>[...new Set(dateKeys)].sort();
export async function addMetricRecordsBulk(tracker:Tracker,value:number,dateKeys:string[],localTime:string,note:string,currency?:string,conflictPolicy?:BulkConflictPolicy):Promise<BulkMetricResult>{
  const dates=normaliseBulkDates(dateKeys);
  if(dates.length<2)throw new Error('Choose at least two dates for bulk logging.');
  if(dates.length>31)throw new Error('Choose no more than 31 dates at a time.');
  if(tracker.module!=='metrics'||tracker.measurement_type==='money')throw new Error('Bulk logging is not available for this item.');
  const user=await goalOwner(),[profile,records]=await Promise.all([
    supabase.from('profiles').select('timezone').eq('id',user.id).single(),
    supabase.from('tracking_records').select('*').eq('owner_id',user.id).eq('tracker_id',tracker.id).is('deleted_at',null),
  ]);
  fail('Metric timezone',profile.error);fail('Existing Metric entries',records.error);
  const timezone=profile.data?.timezone||'UTC',byDate=new Map<string,MetricRecord>();
  for(const record of (records.data??[]) as MetricRecord[])byDate.set(fovynDateKey(timezone,new Date(record.occurred_at)),record);
  const conflictDates=tracker.metric_record_cardinality==='one_per_day'?dates.filter(date=>byDate.has(date)):[];
  if(conflictDates.length&&!conflictPolicy)return{created:0,replaced:0,skipped:0,createdIds:[],conflictDates,failedDates:[]};
  const createDates=dates.filter(date=>!conflictDates.includes(date)||tracker.metric_record_cardinality!=='one_per_day');
  const payload=createDates.map(date=>({owner_id:user.id,tracker_id:tracker.id,value,unit_key:tracker.unit_key,custom_unit:tracker.custom_unit,currency:null,occurred_at:occurrenceForDate(date,localTime),note:note.trim()||null,occurrence_status:null}));
  const inserted=payload.length?await supabase.from('tracking_records').insert(payload).select('id,occurred_at'):{data:[],error:null};
  fail('Add Metric entries',inserted.error);
  const failedDates:string[]=[],replaceDates=conflictPolicy==='replace'?conflictDates:[];
  for(const date of replaceDates){
    const existing=byDate.get(date);
    if(!existing)continue;
    try{await correctMetricRecord(existing,value,occurrenceForDate(date,localTime),note)}catch{failedDates.push(date)}
  }
  return{created:(inserted.data??[]).length,replaced:replaceDates.length-failedDates.length,skipped:conflictPolicy==='skip'?conflictDates.length:0,createdIds:(inserted.data??[]).map(row=>row.id),conflictDates,failedDates};
}
export async function correctMetricRecord(record:MetricRecord,value:number,occurredAt:string,note:string){const user=await goalOwner();fail('Update Metric entry',(await supabase.from('tracking_records').update({value,occurred_at:occurredAt,note:note.trim()||null,corrected_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',record.id).eq('owner_id',user.id).is('deleted_at',null)).error)}
export async function removeMetricRecord(record:MetricRecord){const user=await goalOwner();fail('Delete Metric entry',(await supabase.from('tracking_records').update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',record.id).eq('owner_id',user.id).is('deleted_at',null)).error)}
export async function removeMetricRecords(ids:string[]){if(!ids.length)return;const user=await goalOwner(),now=new Date().toISOString();fail('Undo Metric entries',(await supabase.from('tracking_records').update({deleted_at:now,updated_at:now}).in('id',ids).eq('owner_id',user.id).is('deleted_at',null)).error)}
