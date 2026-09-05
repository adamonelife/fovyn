import {appEnvironment,supabase} from './supabase';
export type AnalyticsEnvironment='alpha'|'development';
export type SuperAdminOverview={environment:AnalyticsEnvironment;release_label:string;users:number;verified_users:number;trees_planted:number;active_goals:number;dormant_trees:number;heartwood_trees:number;new_users_last_7_days:number;trees_planted_last_7_days:number;excluded_test_trees:number};
export const currentAnalyticsEnvironment=():AnalyticsEnvironment=>appEnvironment;
export async function loadSuperAdminOverview(environment:AnalyticsEnvironment=currentAnalyticsEnvironment()){
  const{data,error}=await supabase.rpc('super_admin_overview',{p_environment:environment});
  if(error)throw new Error('Analytics counters could not be loaded.');
  const row=(Array.isArray(data)?data[0]:data) as SuperAdminOverview|undefined;
  if(!row)throw new Error('Analytics counters are unavailable.');
  return row;
}
type ProductEventInput={eventName:string;featureKey?:string;idempotencyKey:string;occurredAt?:string;properties?:Record<string,string|number|boolean|null>};
const forbiddenKeys=/^(amount|balance|value|note|notes|content|message|goal_name|cycle_detail|symptom|sexual_activity|pregnancy_result|health_value)$/;
export const isSafeTelemetryProperties=(properties:Record<string,unknown>)=>!Object.keys(properties).some(key=>forbiddenKeys.test(key));
export async function captureProductEvent(input:ProductEventInput){
  if(!isSafeTelemetryProperties(input.properties??{}))throw new Error('Sensitive values cannot be included in product telemetry.');
  const{data:{user}}=await supabase.auth.getUser();if(!user)return;
  const width=typeof window==='undefined'?1280:window.innerWidth,device_class=width<640?'mobile':width<1024?'tablet':'desktop';
  const{error}=await supabase.from('product_events').insert({owner_id:user.id,event_name:input.eventName,feature_key:input.featureKey??null,properties:input.properties??{},occurred_at:input.occurredAt??new Date().toISOString(),app_environment:appEnvironment,app_version:import.meta.env.VITE_APP_VERSION??null,device_class,interface_locale:document.documentElement.lang||'en',is_test:typeof sessionStorage!=='undefined'&&sessionStorage.getItem('fovyn-data-context')==='test',idempotency_key:input.idempotencyKey,event_version:1});
  if(error&&error.code!=='23505')console.warn('Product event was not recorded',{eventName:input.eventName,code:error.code});
}
