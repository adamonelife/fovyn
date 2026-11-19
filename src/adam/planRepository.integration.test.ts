import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planRepository } from './planRepository';
import { createPlan, syntheticAccounts } from './planFixtures';
import { taskState, type Plan } from './planning';

// Test tooling only: the actual SDK/repository calls actual PostgreSQL RPCs.
const moduleName = '../../scripts/local-planning-db.mjs';
let store: any, dir: string;
const A=syntheticAccounts[0].id,B=syntheticAccounts[1].id;
let viewer=A,failTransport=false,dropAfterCommit=false;
function repository(ownerId:string,isTest=true){
 const client=createClient('http://127.0.0.1:9999','synthetic-public-key',{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{fetch:async(input,init)=>{
   if(failTransport)return new Response(JSON.stringify({message:'Connection unavailable'}),{status:503});
   const url=new URL(String(input));
   if(url.pathname==='/auth/v1/user')return new Response(JSON.stringify({id:viewer,aud:'authenticated',app_metadata:{},user_metadata:{}}),{status:200});
   try{
    const name=url.pathname.split('/').pop()!;
    const result=await store.rpc(viewer,isTest?'test':'real',name,JSON.parse(String(init?.body??'{}')));
    if(dropAfterCommit && name==='save_plan_action'){dropAfterCommit=false;return new Response(JSON.stringify({message:'Response lost after commit'}),{status:503});}
    return new Response(JSON.stringify(result),{status:200});
   }catch(e:any){return new Response(JSON.stringify({code:e.code,message:e.message}),{status:400});}
  }},
 });
 const getUser=client.auth.getUser.bind(client.auth);client.auth.getUser=()=>getUser('synthetic-token');
 return planRepository(client,{ownerId,isTest});
}
let repo:ReturnType<typeof repository>,plan:Plan;
const fixtures=createPlan({ownerId:A,isTest:true});
async function save(action:Parameters<typeof repo.save>[1]){plan=await repo.save(plan,action);return plan;}
describe.skipIf(!process.env.FOVYN_PGLITE_MODULE_PATH)('persistent planning: actual SDK → RPC → disposable PostgreSQL',()=>{
beforeAll(async()=>{
 const {openPlanningDb}=await import(moduleName);
 dir=await mkdtemp(join(tmpdir(),'fovyn-batch2-'));
 store=await openPlanningDb(join(dir,'db'));repo=repository(A);plan=await repo.load();
},30000);
afterAll(async()=>{await store?.close();if(dir)await rm(dir,{recursive:true,force:true});});

 it('starts empty without inventing personal programme data',()=>{expect(plan.goals).toHaveLength(0);expect(plan.settings.programme_name).toBe('My programme');expect(plan.settings.updated_at).toBeUndefined();});
 it('creates a goal and its area mapping atomically in existing goals',async()=>{
  await save({type:'goal',value:fixtures.goals[0],focusArea:'health'});
  const reloaded=await repo.load();expect(reloaded.goals[0].title).toBe(fixtures.goals[0].title);expect(reloaded.settings.goal_areas[fixtures.goals[0].id]).toBe('health');expect(reloaded.goals[0].updated_at).toBeTruthy();
 });
 it('saves programme configuration, modules and dates and reloads them',async()=>{
  await save({type:'settings',value:{...fixtures.settings,updated_at:plan.settings.updated_at,goal_areas:plan.settings.goal_areas}});
  await save({type:'settings',value:{...plan.settings,programme_name:'Synthetic saved programme',target_on:'2028-01-31',preferred_modules:['Health','Projects']}});
  plan=await repo.load();expect(plan.settings.programme_name).toBe('Synthetic saved programme');expect(plan.settings.target_on).toBe('2028-01-31');expect(plan.settings.preferred_modules).toEqual(['Health','Projects']);
 });
 it('edits a goal without changing its forest state or identity',async()=>{
  const id=plan.goals[0].id;
  await save({type:'goal',value:{...plan.goals[0],title:'Saved goal edit',description:'A useful outcome',ends_on:'2027-10-15'},focusArea:'health'});
  const loaded=await repo.load();expect(loaded.goals[0]).toMatchObject({id,title:'Saved goal edit',description:'A useful outcome',ends_on:'2027-10-15'});
  expect((await store.db.query('select forest_stage,status from public.goals where id=$1',[id])).rows[0]).toEqual({forest_stage:1,status:'active'});
 });
 it('creates and edits a milestone with an exact due date',async()=>{
  await save({type:'milestone',value:fixtures.milestones[0]});
  await save({type:'milestone',value:{...plan.milestones[0],title:'Edited milestone',due_on:'2027-02-14'}});
  expect((await repo.load()).milestones[0]).toMatchObject({title:'Edited milestone',due_on:'2027-02-14'});
 });
 it('creates and reloads task links, dates, time, priority and blocked reason',async()=>{
  await save({type:'task',value:{...fixtures.tasks[0],status:'blocked',blocked_reason:'Waiting for a fixture decision'}});
  const loaded=await repo.load();expect(loaded.tasks[0]).toMatchObject({goal_id:plan.goals[0].id,milestone_id:plan.milestones[0].id,scheduled_time:'17:30',due_on:'2026-11-02',focus_on:'2026-11-02',status:'blocked',blocked_reason:'Waiting for a fixture decision'});
 });
 it('edits, completes and reopens the same persisted task',async()=>{
  const id=plan.tasks[0].id;
  await save({type:'task',value:taskState({...plan.tasks[0],title:'Saved task edit'},'done')});
  expect((await repo.load()).tasks[0].completed_at).toBeTruthy();
  await save({type:'task',value:taskState(plan.tasks[0],'todo')});
  expect((await repo.load()).tasks[0]).toMatchObject({id,title:'Saved task edit',status:'todo',completed_at:null});expect(plan.tasks).toHaveLength(1);
 });
 it('persists milestone completion and reopening',async()=>{
  await save({type:'milestone',value:{...plan.milestones[0],completed_at:'2026-11-03T12:00:00Z'}});expect((await repo.load()).milestones[0].completed_at).toBeTruthy();
  await save({type:'milestone',value:{...plan.milestones[0],completed_at:null}});expect((await repo.load()).milestones[0].completed_at).toBeNull();
 });
 it('rejects stale task edits instead of overwriting another tab',async()=>{
  const stale=structuredClone(plan);
  await save({type:'task',value:{...plan.tasks[0],title:'Newer tab title'}});
  await expect(repo.save(stale,{type:'task',value:{...stale.tasks[0],title:'Stale overwrite'}})).rejects.toThrow('changed elsewhere');
  expect((await repo.load()).tasks[0].title).toBe('Newer tab title');
 });
 it('rolls back a goal change if its settings mapping is stale',async()=>{
  const stale=structuredClone(plan);
  await save({type:'settings',value:{...plan.settings,programme_name:'Newer settings'}});
  await expect(repo.save(stale,{type:'goal',value:{...stale.goals[0],title:'Must not partially save'},focusArea:'career'})).rejects.toThrow('changed elsewhere');
  expect((await repo.load()).goals[0].title).toBe('Saved goal edit');
 });
 it('rejects stale milestone and programme edits',async()=>{
  const stale=structuredClone(plan);
  await save({type:'milestone',value:{...plan.milestones[0],title:'Latest milestone title'}});
  await expect(repo.save(stale,{type:'milestone',value:{...stale.milestones[0],title:'Old milestone title'}})).rejects.toThrow('changed elsewhere');
  const oldSettings=structuredClone(plan);
  await save({type:'settings',value:{...plan.settings,programme_name:'Latest programme title'}});
  await expect(repo.save(oldSettings,{type:'settings',value:{...oldSettings.settings,programme_name:'Old programme title'}})).rejects.toThrow('changed elsewhere');
 });
 it('keeps both persistence functions invoker-only and unavailable to anonymous users',async()=>{
  const r=await store.db.query("select proname,prosecdef,has_function_privilege('anon',p.oid,'execute') as anon,has_function_privilege('authenticated',p.oid,'execute') as signed_in from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('load_my_plan','save_plan_action')");
  expect(r.rows).toHaveLength(2);for(const f of r.rows){expect(f.prosecdef).toBe(false);expect(f.anon).toBe(false);expect(f.signed_in).toBe(true);}
 });
 it('supports an ordinary user without changing roles or bypassing real-context isolation',async()=>{
  const C='33333333-3333-4333-8333-333333333333';viewer=C;
  try{
   const normal=repository(C,false);let p=await normal.load();
   const goal={...fixtures.goals[0],id:crypto.randomUUID(),owner_id:C,is_test:false};
   p=await normal.save(p,{type:'goal',value:goal,focusArea:'health'});
   const milestone={...fixtures.milestones[0],id:crypto.randomUUID(),owner_id:C,is_test:false,goal_id:goal.id};
   p=await normal.save(p,{type:'milestone',value:milestone});
   const task={...fixtures.tasks[0],id:crypto.randomUUID(),owner_id:C,is_test:false,goal_id:goal.id,milestone_id:milestone.id};
   p=await normal.save(p,{type:'task',value:task});
   expect((await normal.load()).tasks[0]).toMatchObject({owner_id:C,is_test:false});
   expect((await store.db.query('select count(*)::int n from public.user_roles where user_id=$1',[C])).rows[0].n).toBe(0);
  }finally{viewer=A;}
 });
 it('reports a connection failure and leaves the existing plan untouched',async()=>{
  const before=structuredClone(plan);failTransport=true;
  try{await expect(repo.save(plan,{type:'task',value:{...plan.tasks[0],title:'Unsaved draft'}})).rejects.toThrow();expect(plan).toEqual(before);}finally{failTransport=false;}
  expect((await repo.load()).tasks[0].title).toBe('Newer tab title');
 });
 it('recovers an ambiguous committed response by reload; retry cannot duplicate/overwrite',async()=>{
  const old=structuredClone(plan);dropAfterCommit=true;
  await expect(repo.save(old,{type:'task',value:{...old.tasks[0],title:'Committed despite lost response'}})).rejects.toThrow();
  await expect(repo.save(old,{type:'task',value:{...old.tasks[0],title:'Unsafe retry'}})).rejects.toThrow('changed elsewhere');
  plan=await repo.load();expect(plan.tasks).toHaveLength(1);expect(plan.tasks[0].title).toBe('Committed despite lost response');
 });
 it('keeps a second user and real/test contexts separate',async()=>{
  viewer=B;try{const other=await repository(B).load();expect(other.goals).toHaveLength(0);expect(other.settings.programme_name).toBe('My programme');await expect(repo.load()).rejects.toThrow('account changed');}finally{viewer=A;}
  const real=await repository(A,false).load();expect(real.goals).toHaveLength(0);expect(real.tasks).toHaveLength(0);
 });
 it('rejects forged ownership and signed-out RPCs at the database boundary',async()=>{
  await expect(store.rpc(B,'test','save_plan_action',{p_kind:'task',p_value:plan.tasks[0],p_expected:plan.tasks[0].updated_at})).rejects.toMatchObject({code:'42501'});
  await expect(store.rpc('','test','load_my_plan')).rejects.toMatchObject({code:'42501'});
 });
 it('rejects invalid parent links and anonymous RPC access',async()=>{
  const forged={...plan.tasks[0],milestone_id:'99999999-9999-4999-8999-999999999999'};
  await expect(store.rpc(A,'test','save_plan_action',{p_kind:'task',p_value:forged,p_expected:forged.updated_at})).rejects.toMatchObject({code:'23503'});
  await expect(store.asUser(A,'test',async(db:any)=>{await db.exec('set local role anon');return db.exec('select public.load_my_plan()')})).rejects.toMatchObject({code:'42501'});
 });
 it('persists cancellation and retains data after the database process reopens',async()=>{
  await save({type:'task',value:taskState(plan.tasks[0],'cancelled')});
  const expected=structuredClone(plan);await store.close();const {openPlanningDb}=await import(moduleName);store=await openPlanningDb(join(dir,'db'));
  plan=await repo.load();expect(plan).toEqual(expected);expect(plan.tasks[0]).toMatchObject({status:'cancelled',focus_on:null});
 });
});
