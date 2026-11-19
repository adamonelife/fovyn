// Isolated PostgreSQL engine. Synthetic fixtures only; no network or hosted URL.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const modulePath = process.env.FOVYN_PGLITE_MODULE_PATH;
if (!modulePath) throw new Error('Set FOVYN_PGLITE_MODULE_PATH to a local @electric-sql/pglite 0.5.12 module. No application dependency or remote database is required.');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const migration = readdirSync('supabase/migrations').find(n=>n.endsWith('_fovyn_shared_planning_foundations.sql'));
const passed=[];
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222', C='33333333-3333-4333-8333-333333333333';
const GA='aaaaaaaa-0000-4000-8000-000000000001',GA2='aaaaaaaa-0000-4000-8000-000000000002',GAR='aaaaaaaa-0000-4000-8000-000000000003',GB='bbbbbbbb-0000-4000-8000-000000000001';
const M='aaaaaaaa-0000-4000-8000-000000000010',M2='aaaaaaaa-0000-4000-8000-000000000020',T='aaaaaaaa-0000-4000-8000-000000000100';
await db.exec(readFileSync('scripts/planning-test-schema.sql','utf8'));
await db.exec(`alter table public.goals disable trigger user;insert into public.goals(id,owner_id,is_test,title) values('${GA}','${A}',true,'A test goal'),('${GA2}','${A}',true,'A second test goal'),('${GAR}','${A}',false,'A real-context synthetic goal'),('${GB}','${B}',true,'B test goal');alter table public.goals enable trigger user;
`);
await db.exec(readFileSync(`supabase/migrations/${migration}`,'utf8'));
async function runAs(owner,context,fn){await db.exec('begin;set local role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.headers',$2,true)",[owner,JSON.stringify({'x-fovyn-data-context':context})]);try{const r=await fn();await db.exec('commit');return r;}catch(e){await db.exec('rollback');throw e;}}
async function pass(name,fn){await fn();passed.push(name);console.log('PASS',name);}
async function denied(name,owner,context,sql,code){await pass(name,async()=>{let error;try{await runAs(owner,context,()=>db.exec(sql))}catch(e){error=e;}assert.ok(error,'operation unexpectedly allowed');if(code)assert.equal(error.code,code);});}
try{
 await pass('migration creates exactly three empty owned tables, without founder defaults',async()=>{for(const t of ['tasks','goal_milestones','user_plan_settings']){assert.equal((await db.query(`select count(*)::int n from public.${t}`)).rows[0].n,0);assert.equal((await db.query(`select relrowsecurity from pg_class where oid='public.${t}'::regclass`)).rows[0].relrowsecurity,true);}});
 await pass('owner A can create scoped preferences and linked milestones/tasks',()=>runAs(A,'test',()=>db.exec(`insert into public.user_plan_settings(programme_name,starts_on,target_on) values('A programme','2026-11-01','2027-12-31');insert into public.goal_milestones(id,goal_id,title) values('${M}','${GA}','A checkpoint'),('${M2}','${GA2}','Another checkpoint');insert into public.tasks(id,goal_id,milestone_id,title) values('${T}','${GA}','${M}','A private task');`)));
 await pass('owner B has independent programme settings',()=>runAs(B,'test',()=>db.exec(`insert into public.user_plan_settings(programme_name) values('B programme');insert into public.tasks(goal_id,title) values('${GB}','B private task');`)));
 for(const t of ['tasks','goal_milestones','user_plan_settings']){
  await pass(`${t}: cross-owner rows invisible`,()=>runAs(B,'test',async()=>{const r=await db.query(`select * from public.${t} where owner_id='${A}'`);assert.equal(r.rows.length,0);}));
  await denied(`${t}: cannot forge another owner`,B,'test',t==='user_plan_settings'?`insert into public.${t}(owner_id) values('${A}')`:`insert into public.${t}(owner_id,goal_id,title) values('${A}','${GA}','forged')`,'42501');
  await pass(`${t}: real and test contexts separated`,()=>runAs(A,'real',async()=>assert.equal((await db.query(`select count(*)::int n from public.${t} where owner_id='${A}'`)).rows[0].n,0)));
  await pass(`${t}: foreign update changes zero rows`,()=>runAs(B,'test',async()=>assert.equal((await db.query(`update public.${t} set updated_at=now() where owner_id='${A}' returning owner_id`)).rows.length,0)));
  await denied(`${t}: anonymous role has no table access`,A,'test',`set local role anon;select * from public.${t}`,'42501');
 }
 await denied('same owner cannot link a real goal into test task',A,'test',`insert into public.tasks(goal_id,title) values('${GAR}','wrong context')`,'23503');
 await denied('cannot link another owner’s goal',A,'test',`insert into public.tasks(goal_id,title) values('${GB}','wrong owner')`,'23503');
 await denied('cannot link a milestone from a different goal',A,'test',`insert into public.tasks(goal_id,milestone_id,title) values('${GA}','${M2}','wrong goal')`,'23503');
 await denied('cannot reparent a linked milestone into another goal',A,'test',`update public.goal_milestones set goal_id='${GA2}' where id='${M}'`,'23503');
 await denied('cannot reassign a task to another owner',A,'test',`update public.tasks set owner_id='${B}',goal_id='${GB}',milestone_id=null where id='${T}'`,'42501');
 await denied('test provenance is immutable',A,'test',`update public.tasks set is_test=false where id='${T}'`,'42501');
 await denied('inconsistent completion rejected',A,'test',`update public.tasks set status='done' where id='${T}'`,'23514');
 await denied('blocked task needs an explanation',A,'test',`update public.tasks set status='blocked' where id='${T}'`,'23514');
 await denied('time needs scheduled day',A,'test',`update public.tasks set scheduled_time='09:00' where id='${T}'`,'23514');
 await denied('invalid programme horizon rejected',A,'test',`update public.user_plan_settings set target_on='2026-10-01'`,'23514');
 await denied('unknown module rejected',A,'test',`update public.user_plan_settings set preferred_modules=array['Billing']`,'23514');
 await pass('real preferences cannot be hard-deleted, including by a super admin',()=>runAs(A,'real',async()=>{await db.exec("insert into public.user_plan_settings(programme_name) values('A real-context fixture')");assert.equal((await db.query('delete from public.user_plan_settings returning owner_id')).rows.length,0);}));
 await pass('complete and reopen preserves the canonical task ID',()=>runAs(A,'test',async()=>{await db.exec(`update public.tasks set status='done',completed_at=now() where id='${T}';update public.tasks set status='todo',completed_at=null where id='${T}'`);const r=await db.query(`select id,status from public.tasks where id='${T}'`);assert.equal(r.rows[0].status,'todo');assert.equal(r.rows[0].id,T);}));
 await pass('non-admin cannot elevate context with a client header',()=>runAs(C,'test',async()=>{await db.exec("insert into public.user_plan_settings(is_test,programme_name) values(true,'C programme')");const r=await db.query('select is_test from public.user_plan_settings');assert.equal(r.rows[0].is_test,false);}));
 await denied('non-admin cannot invoke planning test cleanup',C,'real',`select public.clear_my_test_data('planning')`,'42501');
 await pass('explicit planning cleanup removes only this owner’s test data',async()=>{await runAs(A,'test',()=>db.exec("select public.clear_my_test_data('planning')"));for(const t of ['tasks','goal_milestones','user_plan_settings'])await runAs(A,'test',async()=>assert.equal((await db.query(`select count(*)::int n from public.${t}`)).rows[0].n,0));await runAs(B,'test',async()=>assert.equal((await db.query('select count(*)::int n from public.tasks')).rows[0].n,1));await runAs(A,'real',async()=>assert.equal((await db.query('select count(*)::int n from public.user_plan_settings')).rows[0].n,1));});
 await pass('new trigger helper does not bypass RLS',async()=>{assert.equal((await db.query("select prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and proname='planning_touch_updated_at'")).rows[0].prosecdef,false);});
 const report={migration,engine:'PGlite 0.5.12 / isolated PostgreSQL; minimal synthetic Auth/profile/goal scaffold',status:'passed',checks:passed.length,passed,hosted_migration_applied:false,hosted_rls_certified:false,limitations:['Uses captured helper semantics and minimal synthetic scaffold, not a full hosted Supabase stack.','UI is an in-memory synthetic repository; hosted persistence adapter and full recovery remain separate gates.']};
 if(process.env.FOVYN_RLS_REPORT)writeFileSync(process.env.FOVYN_RLS_REPORT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:'passed',checks:passed.length,migration}));
}finally{await db.close();}
