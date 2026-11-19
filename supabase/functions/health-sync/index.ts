import {createClient} from 'npm:@supabase/supabase-js@2.57.4';

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const arrays=['daily','exercises','sleep','heart_rate'] as const;

Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return json({error:'POST required'},405);
  const authorization=req.headers.get('authorization')??'';
  if(!authorization.startsWith('Bearer '))return json({error:'Authentication required'},401);
  const url=Deno.env.get('SUPABASE_URL')??'',anon=Deno.env.get('SUPABASE_ANON_KEY')??'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
  if(!url||!anon||!service)return json({error:'Service configuration unavailable'},503);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser(authorization.slice(7));
  if(userError||!user)return json({error:'Invalid or expired session'},401);
  let payload:Record<string,unknown>;
  try{payload=await req.json()}catch{return json({error:'Invalid JSON'},400)}
  if(typeof payload.device_id!=='string'||payload.device_id.length<8||payload.device_id.length>200)return json({error:'Invalid device identity'},400);
  for(const key of arrays)if(!Array.isArray(payload[key]))return json({error:`${key} must be an array`},400);
  if((payload.daily as unknown[]).length>32||(payload.exercises as unknown[]).length>500||(payload.sleep as unknown[]).length>100||(payload.heart_rate as unknown[]).length>32)return json({error:'Sync batch is too large'},413);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await admin.rpc('health_ingest_sync',{p_owner:user.id,p_payload:payload,p_is_test:false});
  if(error){console.error('health_ingest_sync failed',{code:error.code,message:error.message});return json({error:'Health sync could not be saved. Retry is safe.'},500)}
  return json(data);
});
