import { supabase } from './supabase';

export type GymProfile={id:string;name:string;notes:string;archivedAt:string|null};
export type MovementFamily={id:string;name:string;primaryMuscleGroup:string;aliases:string[]};
export type GymEquipment={id:string;gymId:string;name:string;notes:string;preferred:boolean;archivedAt:string|null};

async function owner(){const {data,error}=await supabase!.auth.getUser();if(error||!data.user)throw new Error('Sign in required.');return data.user.id}
function fail(label:string,error:any){if(error)throw new Error(error.message||label)}

export async function loadGymContext(){
 const user=await owner();
 const [gyms,pref,families]=await Promise.all([
  supabase!.from('training_gym_profiles').select('*').eq('owner_id',user).is('archived_at',null).order('created_at'),
  supabase!.from('training_gym_preferences').select('selected_gym_id').eq('owner_id',user).maybeSingle(),
  supabase!.from('training_movement_families').select('*').eq('owner_id',user).is('archived_at',null).order('name')
 ]);
 fail('Gyms',gyms.error);fail('Gym preference',pref.error);fail('Movement families',families.error);
 return {
  gyms:(gyms.data??[]).map(x=>({id:x.id,name:x.name,notes:x.notes??'',archivedAt:x.archived_at}) as GymProfile),
  selectedGymId:pref.data?.selected_gym_id??gyms.data?.[0]?.id??null,
  families:(families.data??[]).map(x=>({id:x.id,name:x.name,primaryMuscleGroup:x.primary_muscle_group??'',aliases:x.aliases??[]}) as MovementFamily)
 };
}
export async function selectGym(gymId:string){const user=await owner();const r=await supabase!.from('training_gym_preferences').upsert({owner_id:user,selected_gym_id:gymId,updated_at:new Date().toISOString()});fail('Remember gym',r.error)}
export async function saveGym(input:{id?:string;name:string;notes?:string}){const user=await owner();const values={owner_id:user,name:input.name.trim(),notes:input.notes?.trim()??'',updated_at:new Date().toISOString()};if(!values.name)throw new Error('Gym name is required.');const r=input.id?await supabase!.from('training_gym_profiles').update(values).eq('id',input.id).eq('owner_id',user).select().single():await supabase!.from('training_gym_profiles').insert(values).select().single();fail('Save gym',r.error);return r.data}
export async function archiveGym(id:string){const user=await owner();const r=await supabase!.from('training_gym_profiles').update({archived_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',user);fail('Archive gym',r.error)}
export async function listGymEquipment(gymId:string){const user=await owner();const r=await supabase!.from('training_gym_equipment').select('*').eq('owner_id',user).eq('gym_id',gymId).is('archived_at',null).order('name');fail('Gym equipment',r.error);return(r.data??[]).map(x=>({id:x.id,gymId:x.gym_id,name:x.name,notes:x.notes??'',preferred:x.preferred,archivedAt:x.archived_at}) as GymEquipment)}
export async function saveGymEquipment(input:{id?:string;gymId:string;name:string;notes?:string;preferred?:boolean}){const user=await owner();const values={owner_id:user,gym_id:input.gymId,name:input.name.trim(),notes:input.notes?.trim()??'',preferred:Boolean(input.preferred)};const r=input.id?await supabase!.from('training_gym_equipment').update(values).eq('id',input.id).eq('owner_id',user):await supabase!.from('training_gym_equipment').insert(values);fail('Save equipment',r.error)}
export async function setGymExercise(gymId:string,exerciseProfileId:string,available=true,preferred=false){const user=await owner();const r=await supabase!.from('training_gym_exercises').upsert({owner_id:user,gym_id:gymId,exercise_id:exerciseProfileId,is_available:available,is_preferred:preferred,updated_at:new Date().toISOString()});fail('Exercise availability',r.error)}
export async function saveGymTemplatePreference(input:{gymId:string;templateId:string;slotId:string;exerciseProfileId:string}){const user=await owner();const r=await supabase!.from('training_gym_template_preferences').upsert({owner_id:user,gym_id:input.gymId,template_id:input.templateId,template_slot_id:input.slotId,exercise_id:input.exerciseProfileId,updated_at:new Date().toISOString()},{onConflict:'gym_id,template_slot_id'});fail('Gym preference',r.error)}
export async function quickCreateExercise(input:{name:string;familyId:string;equipment:string;muscleGroup:string;unilateral:boolean;aliases:string[];gymId?:string}){
 const user=await owner();const key='user_'+crypto.randomUUID().replaceAll('-','');
 const r=await supabase!.from('training_exercises').insert({owner_id:user,exercise_key:key,name:input.name.trim(),exercise_alias:input.aliases[0]??null,aliases:input.aliases,movement_family_id:input.familyId,variation_label:input.name.trim(),movement_family_status:'confirmed',equipment:input.equipment.trim()||'Other',muscle_group:input.muscleGroup||'other',unilateral:input.unilateral,source_payload:{unilateral:input.unilateral,source:'quick_add_v1'},active:true,default_sets:3,measurement_type:'Reps',progression_type:'DOUBLE_PROGRESSION',increment_kg:2.5}).select().single();fail('Create exercise',r.error);
 if(input.gymId)await setGymExercise(input.gymId,r.data.id,true,false);return r.data;
}
export function exerciseSearchText(e:any){return[e.exerciseName,e.variationLabel,e.familyName,e.equipment,...(e.aliases??[])].filter(Boolean).join(' ').toLowerCase()}
export function rankExercise(e:any,context:{gymId?:string;familyId?:string;query?:string}){let score=0;if(context.familyId&&e.movementFamilyId===context.familyId)score+=100;if(e.gymAvailable)score+=40;if(e.gymPreferred)score+=20;if(context.query&&exerciseSearchText(e).includes(context.query.toLowerCase()))score+=10;return score}

export type VariationOption={id:string;movementFamilyId:string;key:string;label:string;equipment:string|null;resistanceType:string|null;unilateral:boolean;weightConvention:string|null;sortOrder:number};
export async function loadVariationOptions(familyId:string){const user=await owner();const r=await supabase!.from('training_movement_variation_options').select('*').eq('owner_id',user).eq('movement_family_id',familyId).is('archived_at',null).order('sort_order');fail('Movement variations',r.error);return(r.data??[]).map(x=>({id:x.id,movementFamilyId:x.movement_family_id,key:x.variation_key,label:x.label,equipment:x.equipment,resistanceType:x.resistance_type,unilateral:x.unilateral,weightConvention:x.weight_convention,sortOrder:x.sort_order}) as VariationOption)}
export async function createMovementVariation(input:{family:MovementFamily;option?:VariationOption;customLabel?:string;gymId?:string;aliases?:string[]}){
 const user=await owner(),label=(input.option?.label??input.customLabel??'').trim();if(!label)throw new Error('Choose or name a variation.');
 const existing=await supabase!.from('training_exercises').select('id,exercise_key,name,variation_label,equipment,unilateral').eq('owner_id',user).eq('movement_family_id',input.family.id).eq('active',true);
 fail('Existing variations',existing.error);
 const match=(existing.data??[]).find(x=>(x.variation_label??'').toLowerCase()===label.toLowerCase()||Boolean(input.option&&x.equipment===input.option.equipment&&Boolean(x.unilateral)===input.option.unilateral&&(x.name??'').toLowerCase().includes(label.split(' — ')[0].toLowerCase())));
 if(match){if(input.gymId)await setGymExercise(input.gymId,match.id,true,false);return match}
 const name=label==='Standard'?input.family.name:`${input.family.name} — ${label}`,key='user_'+crypto.randomUUID().replaceAll('-','');
 const aliases=[...(input.aliases??[]),name,`${label} ${input.family.name}`].map(x=>x.trim()).filter(Boolean);
 const r=await supabase!.from('training_exercises').insert({owner_id:user,exercise_key:key,name,exercise_alias:aliases[0]??name,aliases:[...new Set(aliases)],movement_family_id:input.family.id,variation_label:label,movement_family_status:'confirmed',equipment:input.option?.equipment??null,muscle_group:(input.family.primaryMuscleGroup||'other').toLowerCase(),unilateral:input.option?.unilateral??false,resistance_type:input.option?.resistanceType??'other',weight_convention:input.option?.weightConvention??'total_weight',source_payload:{source:'movement_first_v110',movement_family:input.family.name,variation:label},active:true,default_sets:3,measurement_type:'Reps',progression_type:'DOUBLE_PROGRESSION',increment_kg:2.5}).select().single();
 fail('Create exercise variation',r.error);if(input.gymId)await setGymExercise(input.gymId,r.data.id,true,false);return r.data;
}
