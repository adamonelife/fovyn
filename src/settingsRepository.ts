import {supabase} from './supabase';
import {goalOwner,type AreaRow,type SubcategoryRow,type UnitRow} from './goalsRepository';

const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};
export type ProfilePreferences={first_name:string|null;last_name:string|null;display_name:string|null;username:string|null;date_of_birth:string|null;gender:'male'|'female'|'na'|null;country:string|null;preferred_language:string;timezone:string;unit_system:'metric'|'imperial';default_currency:string;week_starts_on:number;date_format:'DD/MM/YYYY'|'MM/DD/YYYY'|'YYYY-MM-DD';time_format:'12h'|'24h'};
export type SettingsData={profile:ProfilePreferences;areas:AreaRow[];units:UnitRow[];subcategories:SubcategoryRow[];email:string};

export function validatePreferences(input:ProfilePreferences){
  const username=input.username?.trim();
  if(username&&!/^[a-zA-Z0-9_]{3,30}$/.test(username))throw new Error('Username must be 3–30 letters, numbers, or underscores.');
  if(input.date_of_birth&&input.date_of_birth>new Date().toISOString().slice(0,10))throw new Error('Date of birth cannot be in the future.');
  if(!input.preferred_language.trim())throw new Error('Preferred language is required.');
  if(!/^[A-Z]{3}$/.test(input.default_currency.trim().toUpperCase()))throw new Error('Main currency must be a three-letter code, such as GBP or USD.');
  try{Intl.DateTimeFormat('en-US',{timeZone:input.timezone.trim()}).format()}catch{throw new Error('Enter a valid timezone, such as Europe/London.');}
}

export async function loadSettings():Promise<SettingsData>{
  const user=await goalOwner();
  const[profile,areas,units,subcategories]=await Promise.all([
    supabase.from('profiles').select('first_name,last_name,display_name,username,date_of_birth,gender,country,preferred_language,timezone,unit_system,default_currency,week_starts_on,date_format,time_format').eq('id',user.id).single(),
    supabase.from('areas').select('*').order('position'),
    supabase.from('measurement_units').select('*').order('measurement_type').order('position'),
    supabase.from('subcategories').select('id,area_key,name,archived_at').order('name')
  ]);
  fail('Preferences',profile.error);fail('Areas',areas.error);fail('Units',units.error);fail('Subcategories',subcategories.error);
  return{profile:profile.data as ProfilePreferences,areas:(areas.data??[]) as AreaRow[],units:(units.data??[]) as UnitRow[],subcategories:(subcategories.data??[]) as SubcategoryRow[],email:user.email??''};
}

export async function savePreferences(input:ProfilePreferences){
  validatePreferences(input);
  const user=await goalOwner();
  const payload={...input,first_name:input.first_name?.trim()||null,last_name:input.last_name?.trim()||null,display_name:input.display_name?.trim()||null,username:input.username?.trim().toLowerCase()||null,country:input.country?.trim()||null,preferred_language:input.preferred_language.trim(),timezone:input.timezone.trim(),default_currency:input.default_currency.trim().toUpperCase(),updated_at:new Date().toISOString()};
  const result=await supabase.from('profiles').update(payload).eq('id',user.id).select('id').single();
  if(result.error?.code==='23505')throw new Error('That username is already taken.');
  fail('Save preferences',result.error);
}

export async function createSubcategory(areaKey:string,name:string){
  const user=await goalOwner();
  fail('Create subcategory',(await supabase.from('subcategories').insert({owner_id:user.id,area_key:areaKey,name:name.trim()})).error);
}

export async function renameSubcategory(id:string,name:string){
  const user=await goalOwner();
  fail('Rename subcategory',(await supabase.from('subcategories').update({name:name.trim(),updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',user.id)).error);
}

export async function setSubcategoryArchived(id:string,archived:boolean){
  const user=await goalOwner();
  fail(archived?'Archive subcategory':'Restore subcategory',(await supabase.from('subcategories').update({archived_at:archived?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',user.id)).error);
}
