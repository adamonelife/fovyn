import {supabase} from './supabase';
import {goalOwner} from './goalsRepository';

const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};
export type GroveType='ongoing'|'finite';
export type GroveStatus='active'|'completed'|'archived';
export type GroveRole='core'|'supporting';
export type Grove={id:string;name:string;description:string|null;grove_type:GroveType;status:GroveStatus;starts_on:string;ends_on:string|null;completed_at:string|null;archived_at:string|null;created_at:string;members:{id:string;goal_id:string;membership_role:GroveRole;added_at:string;goal:{title:string;status:string}}[]};
export type GroveInput={name:string;description:string;groveType:GroveType;startsOn:string;endsOn:string|null;members:{goalId:string;role:GroveRole}[]};

export async function listGroves():Promise<Grove[]>{
  const owner=await goalOwner();
  fail('Synchronise Groves',(await supabase.rpc('sync_grove_completion')).error);
  const[groves,members]=await Promise.all([
    supabase.from('groves').select('*').eq('owner_id',owner.id).order('created_at',{ascending:false}),
    supabase.from('grove_goals').select('id,grove_id,goal_id,membership_role,added_at,goals(title,status)').eq('owner_id',owner.id).is('removed_at',null)
  ]);
  fail('Groves',groves.error);fail('Grove Goals',members.error);
  return(groves.data??[]).map(grove=>({...grove,members:(members.data??[]).filter(member=>member.grove_id===grove.id).map(member=>({...member,goal:member.goals as unknown as Grove['members'][number]['goal']}))})) as Grove[];
}

export async function saveGrove(input:GroveInput,id?:string){
  await goalOwner();
  const result=await supabase.rpc('save_grove',{p_grove_id:id??null,p_name:input.name,p_description:input.description,p_grove_type:input.groveType,p_starts_on:input.startsOn,p_ends_on:input.endsOn,p_members:input.members.map(member=>({goal_id:member.goalId,role:member.role}))});
  fail('Save Grove',result.error);
  return result.data as string;
}

export async function archiveGrove(id:string){await goalOwner();fail('Archive Grove',(await supabase.rpc('archive_grove',{p_grove_id:id})).error)}
