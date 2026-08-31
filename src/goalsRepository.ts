import {supabase} from './supabase';
import type {Aggregation, GoalPeriod, MeasurementType, TargetOperator} from './goalsDomain';

const fail = (label:string,error:{message:string}|null) => { if(error) throw new Error(`${label}: ${error.message}`); };
export async function goalOwner(){
  if(!supabase) throw new Error('Fovyn is not connected to Supabase.');
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user) throw new Error('Sign in to manage your Fovyn data.');
  return data.user;
}

export type AreaRow={key:string;name:string;position:number};
export type UnitRow={key:string;measurement_type:MeasurementType;symbol:string;name:string;system:string;position:number};
export type SubcategoryRow={id:string;area_key:string;name:string;archived_at:string|null};
export type GoalRow={id:string;title:string;description:string|null;area_key:string;subcategory_id:string|null;status:'active'|'dormant'|'completed'|'ended'|'archived';presentation_priority:'primary'|'secondary';goal_kind:'permanent'|'finite'|'maintenance';negotiability:'negotiable'|'non_negotiable';starts_on:string;ends_on:string|null;created_at:string};
export type RuleRow={id:string;goal_id:string;measurement_type:MeasurementType;unit_key:string|null;custom_unit:string|null;target_operator:TargetOperator;target_min:number;target_max:number|null;period:GoalPeriod;aggregation:Aggregation;effective_from:string;effective_to:string|null};
export type RecordRow={id:string;value:number;occurred_at:string;note:string|null;corrected_at:string|null;deleted_at:string|null;unit_key:string|null;custom_unit:string|null};
export type GoalEvent={id:string;event_type:'planted'|'pruned'|'dormant'|'awakened'|'completed'|'ended';occurred_at:string;details:Record<string,unknown>};
export type GoalBundle=GoalRow&{rule:RuleRow|null;ruleHistory:RuleRow[];records:RecordRow[];events:GoalEvent[];tracker_id:string|null};

export type GoalInput={
  title:string;description?:string;areaKey:string;subcategoryId?:string;
  goalKind:GoalRow['goal_kind'];priority:GoalRow['presentation_priority'];negotiability:GoalRow['negotiability'];startsOn:string;endsOn?:string;
  measurementType:MeasurementType;unitKey?:string;customUnit?:string;
  operator:TargetOperator;targetMin:number;targetMax?:number;period:GoalPeriod;aggregation:Aggregation;
};

export async function loadGoalOptions(){
  await goalOwner();
  const [areas,units,subcategories]=await Promise.all([
    supabase!.from('areas').select('*').order('position'),
    supabase!.from('measurement_units').select('*').order('measurement_type').order('position'),
    supabase!.from('subcategories').select('id,area_key,name,archived_at').is('archived_at',null).order('name')
  ]);
  fail('Areas',areas.error);fail('Units',units.error);fail('Subcategories',subcategories.error);
  return {areas:(areas.data??[]) as AreaRow[],units:(units.data??[]) as UnitRow[],subcategories:(subcategories.data??[]) as SubcategoryRow[]};
}

export async function listGoals():Promise<GoalBundle[]>{
  const owner=await goalOwner();
  const goals=await supabase!.from('goals').select('*').eq('owner_id',owner.id).order('created_at',{ascending:false});
  fail('Goals',goals.error);
  const ids=(goals.data??[]).map(x=>x.id);
  if(!ids.length)return[];
  const [rules,links,contributions,events]=await Promise.all([
    supabase!.from('goal_rules').select('*').in('goal_id',ids).order('effective_from',{ascending:false}),
    supabase!.from('goal_trackers').select('goal_id,tracker_id').in('goal_id',ids),
    supabase!.from('goal_contributions').select('goal_id,tracking_records(id,value,occurred_at,note,corrected_at,deleted_at,unit_key,custom_unit)').in('goal_id',ids),
    supabase!.from('goal_events').select('id,goal_id,event_type,occurred_at,details').in('goal_id',ids).order('occurred_at',{ascending:false})
  ]);
  fail('Goal rules',rules.error);fail('Goal trackers',links.error);fail('Goal records',contributions.error);fail('Goal Growth Rings',events.error);
  return (goals.data??[]).map(goal=>({
    ...(goal as GoalRow),
    rule:((rules.data??[]).find(x=>x.goal_id===goal.id&&x.effective_to===null)??null) as RuleRow|null,
    ruleHistory:(rules.data??[]).filter(x=>x.goal_id===goal.id) as RuleRow[],
    tracker_id:(links.data??[]).find(x=>x.goal_id===goal.id)?.tracker_id??null,
    records:(contributions.data??[]).filter(x=>x.goal_id===goal.id).flatMap(x=>x.tracking_records?[x.tracking_records as unknown as RecordRow]:[]),
    events:(events.data??[]).filter(x=>x.goal_id===goal.id) as GoalEvent[]
  }));
}

export type GoalMetadataInput={title:string;description:string;areaKey:string;subcategoryId?:string;priority:GoalRow['presentation_priority']};
export async function updateGoalMetadata(goal:GoalBundle,input:GoalMetadataInput){const owner=await goalOwner();fail('Edit Goal',(await supabase.from('goals').update({title:input.title.trim(),description:input.description.trim()||null,area_key:input.areaKey,subcategory_id:input.subcategoryId||null,presentation_priority:input.priority,updated_at:new Date().toISOString()}).eq('id',goal.id).eq('owner_id',owner.id)).error);if(goal.tracker_id)fail('Edit Goal tracker',(await supabase.from('trackers').update({name:input.title.trim(),area_key:input.areaKey,subcategory_id:input.subcategoryId||null,updated_at:new Date().toISOString()}).eq('id',goal.tracker_id).eq('owner_id',owner.id)).error)}

export type GoalPruneInput={operator:TargetOperator;targetMin:number;targetMax?:number;period:GoalPeriod;aggregation:Aggregation};
export async function pruneGoal(goal:GoalBundle,input:GoalPruneInput){const owner=await goalOwner();if(!goal.rule)throw new Error('This Goal has no current rule to Prune.');const effective=new Date().toISOString().slice(0,10),next={target_operator:input.operator,target_min:input.targetMin,target_max:input.operator==='range'?input.targetMax:null,period:input.period,aggregation:input.aggregation};if(goal.rule.effective_from>=effective){fail('Update same-day Goal rule',(await supabase.from('goal_rules').update(next).eq('id',goal.rule.id).eq('owner_id',owner.id)).error);return}const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);fail('Close previous Goal rule',(await supabase.from('goal_rules').update({effective_to:yesterday.toISOString().slice(0,10)}).eq('id',goal.rule.id).eq('owner_id',owner.id)).error);fail('Create pruned Goal rule',(await supabase.from('goal_rules').insert({goal_id:goal.id,owner_id:owner.id,measurement_type:goal.rule.measurement_type,unit_key:goal.rule.unit_key,custom_unit:goal.rule.custom_unit,...next,effective_from:effective})).error)}

export async function createGoal(input:GoalInput){
  await goalOwner();
  const created=await supabase!.rpc('create_goal_bundle',{p_input:{title:input.title,description:input.description??'',area_key:input.areaKey,subcategory_id:input.subcategoryId??'',goal_kind:input.goalKind,presentation_priority:input.priority,negotiability:input.negotiability,starts_on:input.startsOn,ends_on:input.endsOn??'',measurement_type:input.measurementType,unit_key:input.unitKey??'',custom_unit:input.customUnit??'',target_operator:input.operator,target_min:input.targetMin,target_max:input.targetMax??'',period:input.period,aggregation:input.aggregation}});
  fail('Create Goal',created.error);
  if(!created.data)throw new Error('Create Goal returned no record.');
  return created.data as string;
}

export async function updateGoal(goal:GoalBundle,input:GoalInput){
  const owner=await goalOwner();
  fail('Update Goal',(await supabase!.from('goals').update({title:input.title,description:input.description||null,area_key:input.areaKey,subcategory_id:input.subcategoryId||null,goal_kind:input.goalKind,presentation_priority:input.priority,negotiability:input.negotiability,starts_on:input.startsOn,ends_on:input.endsOn||null,updated_at:new Date().toISOString()}).eq('id',goal.id).eq('owner_id',owner.id)).error);
  if(goal.tracker_id) fail('Update tracker',(await supabase!.from('trackers').update({name:input.title,area_key:input.areaKey,subcategory_id:input.subcategoryId||null,measurement_type:input.measurementType,unit_key:input.measurementType==='custom'?null:input.unitKey,custom_unit:input.measurementType==='custom'?input.customUnit:null,updated_at:new Date().toISOString()}).eq('id',goal.tracker_id)).error);
  if(goal.rule){
    const effective=new Date().toISOString().slice(0,10);
    if(goal.rule.effective_from>=effective){
      fail('Update Goal rule',(await supabase!.from('goal_rules').update({measurement_type:input.measurementType,unit_key:input.measurementType==='custom'?null:input.unitKey,custom_unit:input.measurementType==='custom'?input.customUnit:null,target_operator:input.operator,target_min:input.targetMin,target_max:input.operator==='range'?input.targetMax:null,period:input.period,aggregation:input.aggregation}).eq('id',goal.rule.id)).error);
    }else{
      const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
      fail('Close Goal rule',(await supabase!.from('goal_rules').update({effective_to:yesterday.toISOString().slice(0,10)}).eq('id',goal.rule.id)).error);
      fail('Create Goal rule',(await supabase!.from('goal_rules').insert({goal_id:goal.id,owner_id:owner.id,measurement_type:input.measurementType,unit_key:input.measurementType==='custom'?null:input.unitKey,custom_unit:input.measurementType==='custom'?input.customUnit:null,target_operator:input.operator,target_min:input.targetMin,target_max:input.operator==='range'?input.targetMax:null,period:input.period,aggregation:input.aggregation,effective_from:effective})).error);
    }
  }
}

export async function setGoalStatus(goal:GoalBundle,status:GoalRow['status']){
  await goalOwner();
  fail('Update Goal status',(await supabase!.rpc('set_goal_lifecycle',{p_goal_id:goal.id,p_status:status})).error);
}

export async function deleteEmptyGoal(goal:GoalBundle){
  if(goal.records.length)throw new Error('Goals with history must be archived, not deleted.');
  fail('Delete Goal',(await supabase!.from('goals').delete().eq('id',goal.id)).error);
}

export async function addGoalRecord(goal:GoalBundle,value:number,note=''){
  await goalOwner();
  if(!goal.tracker_id||!goal.rule)throw new Error('This Goal has no contributing tracker.');
  fail('Record contribution',(await supabase!.rpc('add_goal_contribution',{p_goal_id:goal.id,p_value:value,p_note:note||null,p_occurred_at:new Date().toISOString()})).error);
}

export async function updateGoalRecord(record:RecordRow,value:number,note=''){
  const owner=await goalOwner();
  fail('Correct contribution',(await supabase!.from('tracking_records').update({value,note:note||null,corrected_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',record.id).eq('owner_id',owner.id).is('deleted_at',null)).error);
}

export async function deleteGoalRecord(record:RecordRow){
  const owner=await goalOwner();
  fail('Remove contribution',(await supabase!.from('tracking_records').update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',record.id).eq('owner_id',owner.id).is('deleted_at',null)).error);
}
