import { supabase } from './supabase';

export type RecoveryStage={id:string;stage_number:number;stage_key:string;name:string;purpose:string;implemented:boolean};
export type RecoveryExercise={id:string;exercise_key:string;name:string;regions:string[];exercise_types:string[];equipment:string[];goal_tags:string[];unilateral:boolean;default_prescription:string|null;stop_criteria:string|null;position:number};
export type RecoveryProgramme={id:string;programme_key:string;name:string;description:string;primary_region:string;secondary_regions:string[];safety_notes:string|null};
export type RecoveryEnrolment={id:string;programme_id:string;current_stage_id:string;status:'active'|'completed'|'archived';date_started:string;notes:string|null};
export type RecoveryProgrammeData={programme:RecoveryProgramme;stages:RecoveryStage[];exercises:Record<string,RecoveryExercise[]>;enrolment:RecoveryEnrolment|null};

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
    muscle_group:exercise.regions[0]??'Recovery',equipment:exercise.equipment.join(' / '),
    default_sets:Number(exercise.default_prescription?.match(/^\d+/)?.[0]??1),min_target:null,max_target:null,
    increment_kg:0,measurement_type:/minute|second/i.test(exercise.default_prescription??'')?'Duration':'Reps',progression_type:'Recovery',active:true,
    source_payload:{source:'recovery_programme',recovery_exercise_id:exercise.id,unilateral:exercise.unilateral,regions:exercise.regions,goals:exercise.goal_tags},
  }));
  const result=await supabase!.from('training_exercises').upsert(rows,{onConflict:'owner_id,exercise_key'});
  fail('Prepare Recovery exercises',result.error);
  return{...data,enrolment};
}

export async function changeRecoveryStage(enrolment:RecoveryEnrolment,nextStageId:string,notes=''){
  const owner=await requireOwner();
  const history=await supabase!.from('recovery_stage_history').insert({owner_id:owner,enrolment_id:enrolment.id,from_stage_id:enrolment.current_stage_id,to_stage_id:nextStageId,recommendation_source:'user',notes});
  fail('Record stage change',history.error);
  const result=await supabase!.from('recovery_enrolments').update({current_stage_id:nextStageId,updated_at:new Date().toISOString()}).eq('id',enrolment.id).eq('owner_id',owner).select('*').single();
  fail('Change Recovery stage',result.error);return result.data as RecoveryEnrolment;
}
