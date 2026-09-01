import{goalOwner,type UnitRow}from'./goalsRepository';
import{loadTrackers,type Tracker}from'./trackerRepository';
import{supabase}from'./supabase';

export type RecoveryRecord={id:string;tracker_id:string;value:number;occurred_at:string;note:string|null;corrected_at:string|null};
export type RecoveryData={trackers:Tracker[];records:RecoveryRecord[];units:UnitRow[]};
const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};
export const filterRecoveryTrackers=(trackers:Tracker[])=>trackers.filter(tracker=>tracker.module==='medication'&&tracker.status!=='archived');

export async function loadRecovery():Promise<RecoveryData>{
  const owner=await goalOwner();
  const[{trackers,options},records]=await Promise.all([
    loadTrackers(),
    supabase.from('tracking_records').select('id,tracker_id,value,occurred_at,note,corrected_at').eq('owner_id',owner.id).is('deleted_at',null).order('occurred_at',{ascending:false}).limit(200)
  ]);
  fail('Supplements & Recovery records',records.error);
  const available=filterRecoveryTrackers(trackers);
  const ids=new Set(available.map(tracker=>tracker.id));
  return{trackers:available,records:(records.data??[]).filter(record=>ids.has(record.tracker_id))as RecoveryRecord[],units:options.units};
}
