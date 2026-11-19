// Loopback-only Vite test harness, never bundled into the application.
// It exercises the real Supabase SDK RPC calls against disposable PostgreSQL.
// Synthetic bearer sessions are NOT Supabase Auth or production authentication.
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { openPlanningDb } from './local-planning-db.mjs';
export function localPlanningPlugin(){
 return {name:'fovyn-disposable-planning',async configureServer(server){
  if(!process.env.FOVYN_PGLITE_MODULE_PATH)return;
  const store=await openPlanningDb(resolve('../phase1/batch2-disposable-db'));
  const fixtures=await server.ssrLoadModule('/src/adam/planFixtures.ts');
  // Seed once, atomically; restarting this server does not replace saved work.
  for(const account of fixtures.syntheticAccounts){
   const loaded=await store.rpc(account.id,'test','load_my_plan');
   if(!loaded.settings && !loaded.goals.length){
    const plan=fixtures.createPlan({ownerId:account.id,isTest:true});
    await store.asUser(account.id,'test',async(db)=>{
     const save=async(type,value)=>db.query('select public.save_plan_action($1,$2::jsonb)',[type,JSON.stringify(value)]);
     await save('settings',plan.settings);
     for(const goal of plan.goals)await save('goal',goal);
     for(const m of plan.milestones)await save('milestone',m);
     for(const t of plan.tasks)await save('task',t);
    });
   }
  }
  const sessions=new Map();
  server.httpServer?.once('close',()=>{void store.close()});
  server.middlewares.use('/__fovyn_local',async(req,res)=>{
   const send=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
   // Cross-origin pages cannot create sessions or submit writes.
   if(!['127.0.0.1:4178','localhost:4178'].includes(req.headers.host??'') || (req.headers.origin && !['http://127.0.0.1:4178','http://localhost:4178'].includes(req.headers.origin)))return send(403,{message:'Loopback review only.'});
   try{
    const path=(req.url??'').split('?')[0];
    let args={};
    if(req.method==='POST'){
     let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw new Error('Request too large');}args=body?JSON.parse(body):{};
    }
    if(path==='/session' && req.method==='POST'){
     const account=fixtures.syntheticAccounts.find(a=>a.id===args.ownerId);
     if(!account)return send(400,{message:'Unknown synthetic account'});
     const token=randomBytes(32).toString('hex');sessions.set(token,account.id);
     return send(200,{token,ownerId:account.id});
    }
    const owner=sessions.get((req.headers.authorization??'').replace(/^Bearer /,''));
    if(!owner)return send(401,{message:'Local review session expired. Reload to reconnect.',code:'401'});
    if(path==='/auth/v1/user' && req.method==='GET')return send(200,{id:owner,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-29T00:00:00Z'});
    const name=path.replace('/rest/v1/rpc/','');
    if(req.method!=='POST'||!['load_my_plan','save_plan_action'].includes(name))return send(404,{message:'Local planning endpoint not found'});
    const result=await store.rpc(owner,'test',name,args);return send(200,result);
   }catch(error){return send(error.code==='42501'?403:400,{message:error.message,code:error.code??'LOCAL_ERROR'});}
  });
 }};
}
