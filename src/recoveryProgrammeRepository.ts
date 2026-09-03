import { supabase } from './supabase';

export type RecoveryStage={id:string;stage_number:number;stage_key:string;name:string;purpose:string;implemented:boolean};
export type RecoveryExercise={id:string;exercise_key:string;name:string;regions:string[];exercise_types:string[];equipment:string[];goal_tags:string[];unilateral:boolean;default_prescription:string|null;stop_criteria:string|null;position:number};
export type RecoveryProgramme={id:string;programme_key:string;name:string;description:string;primary_region:string;secondary_regions:string[];safety_notes:string|null};
export type RecoveryEnrolment={id:string;programme_id:string;current_stage_id:string;status:'active'|'completed'|'archived';date_started:string;notes:string|null};
export type RecoveryProgrammeData={programme:RecoveryProgramme;stages:RecoveryStage[];exercises:Record<string,RecoveryExercise[]>;enrolment:RecoveryEnrolment|null};
export type RecoveryHistory={sessions:Array<{id:string;performed_on:string;stage_id:string|null;symptom_response:string|null;pain_before:number|null;pain_after:number|null;stiffness_before:number|null;stiffness_after:number|null;delayed_response:string|null}>;sides:Array<{session_exercise_id:string;side:'left'|'right';load_kg:number|null;reps:number|null;duration_seconds:number|null}>};

function fail(label:string,error:{message:string}|null){if(error)throw new Error(`${label}: ${error.message}`)}
async function requireOwner(){if(!supabase)throw new Error('Supabase is not configured');const{data,error}=await supabase.auth.getUser();if(error||!data.user)throw new Error('Sign in to load Recovery');return data.user.id}

export async function loadRecoveryProgramme(key='lower_back_leg'):Promise<RecoveryProgrammeData>{
  const owner=await requireOwner();
  const [programmeResult,stagesResult]=await Promise.all([
    supabase!.from('recovery_programmes').select('*').eq('programme_key',key).is('owner_id',null).single(),
    supabase!.from('recovery_stages').select('*').order('stage_number'),
  ]);
  fail('Load Recovery programme',programmeResult.error);fail('Load Recovery stages',stagesResult.error);
  const programme=programmeResult.data as RecoveryProgramme,stages=(stagesResult.data??[]) as RecoveryStage[];
  const [linksResult,enrolmentResult]=await Promise.all([
    supabase!.from('recovery_programme_exercises').select('stage_id,position,prescription_override,recovery_exercises(*)').eq('programme_id',programme.id).order('position'),
    supabase!.from('recovery_enrolments').select('*').eq('owner_id',owner).eq('programme_id',programme.id).maybeSingle(),
  ]);
  fail('Load Recovery exercises',linksResult.error);fail('Load Recovery progress',enrolmentResult.error);
  const exercises:Record<string,RecoveryExercise[]>={};
  for(const row of linksResult.data??[]){
    const raw=Array.isArray(row.recovery_exercises)?row.recovery_exercises[0]:row.recovery_exercises;
    if(!raw)continue;
    (exercises[row.stage_id]??=[]).push({...raw,position:row.position,default_prescription:row.prescription_override??raw.default_prescription} as RecoveryExercise);
  }
  return{programme,stages,exercises,enrolment:(enrolmentResult.data as RecoveryEnrolment|null)??null};
}

export async function beginRecoveryProgramme(programmeId:string,stageId:string){
  const owner=await requireOwner();
  const result=await supabase!.from('recovery_enrolments').upsert({owner_id:owner,programme_id:programmeId,current_stage_id:stageId,status:'active',date_started:new Date().toISOString().slice(0,10)},{onConflict:'owner_id,programme_id'}).select('*').single();
  fail('Start Recovery programme',result.error);return result.data as RecoveryEnrolment;
}

export async function prepareRecoveryWorkout(){
  const owner=await requireOwner(),data=await loadRecoveryProgramme();
  const enrolment=data.enrolment??await beginRecoveryProgramme(data.programme.id,data.stages[0].id);
  const unique=new Map<string,RecoveryExercise>();Object.values(data.exercises).flat().forEach(item=>unique.set(item.id,item));
  const rows=[...unique.values()].map(exercise=>({
    owner_id:owner,exercise_key:`recovery_${exercise.exercise_key}`,name:exercise.name,
    muscle_group:({'Core':'core','Glute':'glutes','Quad':'quadriceps','Hamstring':'hamstrings','Calf':'calves','Full Body':'full_body','Upper Body':'other','Lower Body':'other','Lower Back':'back','Upper Back':'back'} as Record<string,string>)[exercise.regions[0]??'']??'other',equipment:exercise.equipment.join(' / '),
    default_sets:recoveryPrescriptionSetCount(exercise.default_prescription),min_target:null,max_target:null,
    increment_kg:0,measurement_type:/minute|second/i.test(exercise.default_prescription??'')?'Duration':'Reps',progression_type:'Recovery',active:true,
    source_payload:{source:'recovery_programme',recovery_exercise_id:exercise.id,unilateral:exercise.unilateral,regions:exercise.regions,goals:exercise.goal_tags},
  }));
  const result=await supabase!.from('training_exercises').upsert(rows,{onConflict:'owner_id,exercise_key'});
  fail('Prepare Recovery exercises',result.error);
  return{...data,enrolment};
}

export function recoveryPrescriptionSetCount(prescription:string|null){
  const explicitSets=prescription?.match(/^\s*(\d+)\s*[x×]/i)?.[1];
  return explicitSets?Number(explicitSets):1;
}

export async function changeRecoveryStage(enrolment:RecoveryEnrolment,nextStageId:string,notes=''){
  const owner=await requireOwner();
  const history=await supabase!.from('recovery_stage_history').insert({owner_id:owner,enrolment_id:enrolment.id,from_stage_id:enrolment.current_stage_id,to_stage_id:nextStageId,recommendation_source:'user',notes});
  fail('Record stage change',history.error);
  const result=await supabase!.from('recovery_enrolments').update({current_stage_id:nextStageId,updated_at:new Date().toISOString()}).eq('id',enrolment.id).eq('owner_id',owner).select('*').single();
  fail('Change Recovery stage',result.error);return result.data as RecoveryEnrolment;
}

export async function updateRecoveryEnrolment(enrolmentId:string,input:{notes:string;prescribedBy:string|null;professionalName:string;professionalPrescribed:boolean}){const owner=await requireOwner(),result=await supabase!.from('recovery_enrolments').update({notes:input.notes,prescribed_by:input.prescribedBy,professional_name:input.professionalName||null,professional_prescribed:input.professionalPrescribed,updated_at:new Date().toISOString()}).eq('id',enrolmentId).eq('owner_id',owner).select('*').single();fail('Save Recovery programme details',result.error);return result.data as RecoveryEnrolment}

export async function loadRecoveryHistory(enrolmentId:string):Promise<RecoveryHistory>{const owner=await requireOwner();const sessions=await supabase!.from('training_sessions').select('id,performed_on,recovery_stage_id,recovery_session_responses(symptom_response,pain_before,pain_after,stiffness_before,stiffness_after,delayed_response)').eq('owner_id',owner).eq('recovery_enrolment_id',enrolmentId).order('performed_on',{ascending:false}).limit(20);fail('Load Recovery history',sessions.error);const sessionIds=(sessions.data??[]).map(row=>row.id);const exercises=sessionIds.length?await supabase!.from('training_session_exercises').select('id').in('session_id',sessionIds):{data:[],error:null};fail('Load Recovery exercise history',exercises.error);const sides=exercises.data?.length?await supabase!.from('recovery_side_performance').select('session_exercise_id,side,load_kg,reps,duration_seconds').eq('owner_id',owner).in('session_exercise_id',exercises.data.map(row=>row.id)):{data:[],error:null};fail('Load Recovery side history',sides.error);return{sessions:(sessions.data??[]).map(row=>{const response=Array.isArray(row.recovery_session_responses)?row.recovery_session_responses[0]:row.recovery_session_responses;return{id:row.id,performed_on:row.performed_on,stage_id:row.recovery_stage_id,symptom_response:response?.symptom_response??null,pain_before:response?.pain_before??null,pain_after:response?.pain_after??null,stiffness_before:response?.stiffness_before??null,stiffness_after:response?.stiffness_after??null,delayed_response:response?.delayed_response??null}}),sides:(sides.data??[]).map(row=>({...row,load_kg:row.load_kg==null?null:Number(row.load_kg),reps:row.reps==null?null:Number(row.reps),duration_seconds:row.duration_seconds==null?null:Number(row.duration_seconds)})) as RecoveryHistory['sides']};}
