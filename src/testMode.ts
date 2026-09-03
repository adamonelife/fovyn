import {supabase} from './supabase';

export type DataContext='real'|'test';
const key='fovyn-data-context';
export const dataContextEvent='fovyn:data-context';

export function getDataContext():DataContext{return typeof sessionStorage!=='undefined'&&sessionStorage.getItem(key)==='test'?'test':'real'}
export function setDataContext(context:DataContext){if(context==='test')sessionStorage.setItem(key,'test');else sessionStorage.removeItem(key);window.dispatchEvent(new CustomEvent(dataContextEvent,{detail:context}))}
export function resetDataContext(){if(typeof sessionStorage!=='undefined')sessionStorage.removeItem(key)}
export async function isSuperAdmin(){
  const{data:userData}=await supabase.auth.getUser();
  if(userData.user?.app_metadata?.fovyn_role==='super_admin')return true;
  const{data,error}=await supabase.rpc('current_user_capabilities');
  if(error)throw new Error('Unable to verify developer access.');
  const row=Array.isArray(data)?data[0]:data;
  if(typeof row==='boolean')return row;
  return Boolean((row as {super_admin?:boolean}|null)?.super_admin);
}
export async function clearTestData(domain:'all'|'goals'|'training'|'nutrition'|'money'|'logs'='all'){const{error}=await supabase.rpc('clear_my_test_data',{p_domain:domain});if(error)throw new Error('Test data could not be cleared. No real data was changed.')}
