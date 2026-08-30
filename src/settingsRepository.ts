import {supabase} from './supabase';
import {goalOwner,type AreaRow,type SubcategoryRow,type UnitRow} from './goalsRepository';

const fail=(label:string,error:{message:string}|null)=>{if(error)throw new Error(`${label}: ${error.message}`)};
export type ProfilePreferences={display_name:string|null;timezone:string;unit_system:'metric'|'imperial';default_currency:string;week_starts_on:number;date_format:'DD/MM/YYYY'|'MM/DD/YYYY'|'YYYY-MM-DD';time_format:'12h'|'24h'};
export type SettingsData={profile:ProfilePreferences;areas:AreaRow[];units:UnitRow[];subcategories:SubcategoryRow[];email:string};

export async function loadSettings():Promise<SettingsData>{
  const user=await goalOwner();
  const[profile,areas,units,subcategories]=await Promise.all([
    supabase.from('profiles').select('display_name,timezone,unit_system,default_currency,week_starts_on,date_format,time_format').eq('id',user.id).single(),
    supabase.from('areas').select('*').order('position'),
    supabase.from('measurement_units').select('*').order('measurement_type').order('position'),
    supabase.from('subcategories').select('id,area_key,name,archived_at').order('name')
  ]);
  fail('Preferences',profile.error);fail('Areas',areas.error);fail('Units',units.error);fail('Subcategories',subcategories.error);
  return{profile:profile.data as ProfilePreferences,areas:(areas.data??[]) as AreaRow[],units:(units.data??[]) as UnitRow[],subcategories:(subcategories.data??[]) as SubcategoryRow[],email:user.email??''};
}

export async function savePreferences(input:ProfilePreferences){
  const user=await goalOwner();
  const payload={...input,display_name:input.display_name?.trim()||null,default_currency:input.default_currency.trim().toUpperCase(),updated_at:new Date().toISOString()};
  fail('Save preferences',(await supabase.from('profiles').update(payload).eq('id',user.id)).error);
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
