import { createClient } from '@supabase/supabase-js';
import { planRepository } from './planRepository';
// Deliberately fixed to the current loopback origin. Never reads hosted env vars.
export async function localPlanRepository(ownerId: string) {
  if (!['127.0.0.1', 'localhost'].includes(location.hostname)) throw new Error('This review connects only to a disposable local database.');
  const base = `${location.origin}/__fovyn_local`;
  const response = await fetch(`${base}/session`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ownerId})});
  if(!response.ok) throw new Error('The disposable local database is unavailable. Start the local planning preview server.');
  const {token} = await response.json();
  const client = createClient(base,'local-review-public-key',{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:`fovyn-local-review-${crypto.randomUUID()}`},
    global:{headers:{Authorization:`Bearer ${token}`}},
  });
  // getUser must explicitly receive the local token: there is no Supabase session.
  const auth = client.auth;
  const getUser = auth.getUser.bind(auth);
  auth.getUser = () => getUser(token);
  return planRepository(client,{ownerId,isTest:true});
}
