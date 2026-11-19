// Development/test tooling only. No hosted URL, credentials or production data.
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export async function openPlanningDb(dataDir) {
 const modulePath=process.env.FOVYN_PGLITE_MODULE_PATH;
 if(!modulePath)throw new Error('Set FOVYN_PGLITE_MODULE_PATH to an existing local PGlite module.');
 const {PGlite}=await import(pathToFileURL(modulePath).href);
 const db=new PGlite(dataDir ? {dataDir} : undefined);
 if(!(await db.query("select to_regclass('public.tasks') as existing")).rows[0].existing){
  await db.exec(readFileSync('scripts/planning-test-schema.sql','utf8'));
  for(const suffix of ['_fovyn_shared_planning_foundations.sql','_fovyn_planning_persistence.sql']){
   const name=readdirSync('supabase/migrations').find(x=>x.endsWith(suffix));
   if(!name)throw new Error(`Missing ${suffix}`);
   await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
  }
 }
 // PGlite is one connection. Serialize complete role/claim transactions.
 let pending=Promise.resolve();
 function asUser(owner,context,fn){
  const next=pending.then(async()=>{
   await db.exec('begin; set local role authenticated');
   try{
    await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.headers',$2,true)",[owner,JSON.stringify({'x-fovyn-data-context':context})]);
    const result=await fn(db);await db.exec('commit');return result;
   }catch(error){await db.exec('rollback');throw error;}
  });pending=next.catch(()=>{});return next;
 }
 async function rpc(owner,context,name,args={}){
  return asUser(owner,context,async()=>{
   if(name==='load_my_plan')return (await db.query('select public.load_my_plan() as plan')).rows[0].plan;
   if(name!=='save_plan_action')throw new Error('Unsupported local planning RPC');
   return (await db.query('select public.save_plan_action($1,$2::jsonb,$3::timestamptz,$4,$5::timestamptz) as plan',[args.p_kind,JSON.stringify(args.p_value),args.p_expected??null,args.p_focus_area??null,args.p_settings_expected??null])).rows[0].plan;
  });
 }
 return {db,asUser,rpc,close:async()=>{await pending;await db.close();}};
}
