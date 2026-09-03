import {createClient} from '@supabase/supabase-js';
// These are public browser credentials, not secrets. Environment overrides keep
// preview environments flexible; the fallback ensures the installed PWA stays
// connected when a Vercel build is missing its VITE-prefixed variables.
const url=import.meta.env.VITE_SUPABASE_URL||'https://ukvrfejyyhgnzljquxvt.supabase.co';
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_dl9JaUQp-U1dmuaGY1qu2A_oUHsatPt';
const contextualFetch:typeof fetch=(input,init={})=>{const headers=new Headers(init.headers);if(typeof sessionStorage!=='undefined'&&sessionStorage.getItem('fovyn-data-context')==='test')headers.set('x-fovyn-data-context','test');return fetch(input,{...init,headers})};
export const supabase=createClient(url,key,{
  global:{fetch:contextualFetch},
  // Production keeps normal token rotation. Local QA can open several preview
  // ports/tabs; disabling background rotation there prevents those previews
  // racing the same one-time refresh token and revoking the session family.
  auth:{autoRefreshToken:!import.meta.env.DEV,persistSession:true,detectSessionInUrl:true},
});
