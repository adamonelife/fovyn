import {supabase} from './supabase';
import {goalOwner} from './goalsRepository';

const friendly=(action:string,error:{message:string}|null)=>{if(error){console.error(action,error);throw new Error(`We couldn't ${action.toLowerCase()}. Please try again.`)}};
export type Hobby={id:string;name:string;category:string|null;project_name:string|null;measure_type:'duration'|'count'|'distance'|'custom';unit:string;notes:string|null};
export type HobbyEntry={id:string;hobby_id:string;amount:number|null;unit:string;occurred_at:string;note:string|null;corrected_at:string|null;goalIds:string[]};
export type HobbyData={hobbies:Hobby[];entries:HobbyEntry[];goals:{id:string;title:string}[]};
export type HobbyInput=Omit<Hobby,'id'>;
export type HobbyEntryInput={hobby_id:string;amount:number|null;unit:string;occurred_at:string;note:string;goalIds:string[]};

export function normaliseHobbyAmount(value:string){if(value.trim()==='')return null;const number=Number(value);if(!Number.isFinite(number)||number<0)throw new Error('Enter a valid amount of zero or more.');return number}
export function validateHobby(input:Pick<HobbyInput,'name'|'unit'>){if(!input.name.trim())throw new Error('Exercise or hobby name is required.');if(!input.unit.trim())throw new Error('A measurement unit is required.')}

export async function loadHobbies():Promise<HobbyData>{
 const user=await goalOwner();
 const[h,e,l,g]=await Promise.all([
  supabase.from('hobbies').select('id,name,category,project_name,measure_type,unit,notes').eq('owner_id',user.id).is('archived_at',null).order('name'),
  supabase.from('hobby_entries').select('id,hobby_id,amount,unit,occurred_at,note,corrected_at').eq('owner_id',user.id).is('deleted_at',null).order('occurred_at',{ascending:false}).limit(500),
  supabase.from('hobby_entry_goals').select('entry_id,goal_id').eq('owner_id',user.id),
  supabase.from('goals').select('id,title').eq('owner_id',user.id).in('status',['active','dormant']).order('title')
 ]);
 friendly('Load hobbies',h.error);friendly('Load hobby history',e.error);friendly('Load related Goals',l.error);friendly('Load Goals',g.error);
 return{hobbies:(h.data??[])as Hobby[],entries:(e.data??[]).map(x=>({...x,amount:x.amount==null?null:Number(x.amount),goalIds:(l.data??[]).filter(y=>y.entry_id===x.id).map(y=>y.goal_id)}))as HobbyEntry[],goals:(g.data??[])as{id:string;title:string}[]}
}
export async function saveHobby(input:HobbyInput,id?:string){validateHobby(input);const user=await goalOwner();const payload={owner_id:user.id,name:input.name.trim(),category:input.category?.trim()||null,project_name:input.project_name?.trim()||null,measure_type:input.measure_type,unit:input.unit.trim(),notes:input.notes?.trim()||null,updated_at:new Date().toISOString()};const result=id?await supabase.from('hobbies').update(payload).eq('id',id).eq('owner_id',user.id):await supabase.from('hobbies').insert(payload);friendly(id?'Update hobby':'Add hobby',result.error)}
export async function archiveHobby(id:string){const user=await goalOwner();friendly('Archive hobby',(await supabase.from('hobbies').update({archived_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',user.id)).error)}
export async function saveHobbyEntry(input:HobbyEntryInput,id?:string){if(!input.hobby_id)throw new Error('Choose a hobby.');if(!input.unit.trim())throw new Error('A measurement unit is required.');if(input.amount!=null&&(!Number.isFinite(input.amount)||input.amount<0))throw new Error('Enter a valid amount of zero or more.');const user=await goalOwner(),payload={owner_id:user.id,hobby_id:input.hobby_id,amount:input.amount,unit:input.unit.trim(),occurred_at:new Date(input.occurred_at).toISOString(),note:input.note.trim()||null,updated_at:new Date().toISOString(),...(id?{corrected_at:new Date().toISOString()}:{})};let entryId=id;if(id){const result=await supabase.from('hobby_entries').update(payload).eq('id',id).eq('owner_id',user.id).select('id').single();friendly('Update hobby entry',result.error)}else{const result=await supabase.from('hobby_entries').insert(payload).select('id').single();friendly('Log hobby',result.error);entryId=result.data?.id}if(!entryId)throw new Error("We couldn't save that hobby entry. Please try again.");friendly('Update related Goals',(await supabase.from('hobby_entry_goals').delete().eq('entry_id',entryId).eq('owner_id',user.id)).error);if(input.goalIds.length)friendly('Link related Goals',(await supabase.from('hobby_entry_goals').insert(input.goalIds.map(goal_id=>({owner_id:user.id,entry_id:entryId,goal_id})))).error)}
export async function removeHobbyEntry(id:string){const user=await goalOwner();friendly('Remove hobby entry',(await supabase.from('hobby_entries').update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',user.id)).error)}
