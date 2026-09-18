import {createClient} from '@supabase/supabase-js';
import {appConfig} from './appConfig';

// Missing configuration must stop the application. Never silently route a
// Development deployment to Alpha infrastructure.
const {supabaseUrl:url,supabasePublishableKey:key,environment:appEnvironment}=appConfig;
export {appEnvironment};
const contextualFetch:typeof fetch=(input,init={})=>{const headers=new Headers(init.headers);headers.set('x-fovyn-environment',appEnvironment);if(typeof sessionStorage!=='undefined'&&sessionStorage.getItem('fovyn-data-context')==='test')headers.set('x-fovyn-data-context','test');return fetch(input,{...init,headers})};
export const supabase=createClient(url,key,{
  global:{fetch:contextualFetch},
  // Production keeps normal token rotation. Local QA can open several preview
  // ports/tabs; disabling background rotation there prevents those previews
  // racing the same one-time refresh token and revoking the session family.
  auth:{autoRefreshToken:!import.meta.env.DEV,persistSession:true,detectSessionInUrl:true},
});
