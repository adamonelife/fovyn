import {createClient} from '@supabase/supabase-js';
// These are public browser credentials, not secrets. Environment overrides keep
// preview environments flexible; the fallback ensures the installed PWA stays
// connected when a Vercel build is missing its VITE-prefixed variables.
const url=import.meta.env.VITE_SUPABASE_URL||'https://ukvrfejyyhgnzljquxvt.supabase.co';
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_dl9JaUQp-U1dmuaGY1qu2A_oUHsatPt';
export const supabase=createClient(url,key);
