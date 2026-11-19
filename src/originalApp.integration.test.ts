import {beforeAll,describe,it,expect,vi} from 'vitest';
import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {planRepository} from './adam/planRepository';
import {taskState,type Plan} from './adam/planning';
const state=vi.hoisted(()=>({client:undefined as any}));
vi.mock('./supabase',()=>({get supabase(){return state.client;}}));
import {loadMoney,saveAccount,saveMoney,saveCategory,saveRecurring,advanceRecurring,saveReportingCurrency} from './moneyRepository';
import {loadNutrition,saveItem,saveEntry,saveTarget} from './nutritionRepository';
import {createGoal,listGoals,updateGoalMetadata,loadGoalOptions} from './goalsRepository';
import {saveExerciseProfile,loadExerciseProfiles} from './exerciseRepository';
import {saveTemplate,loadTemplate,saveWorkout,loadTrainingSession,correctTrainingSession} from './trainingRepository';
import {saveActivity,loadActivities} from './activityRepository';
import {createTracker,loadTrackers} from './trackerRepository';
import {addMetricRecord} from './metricsRepository';
import {loadRecovery,correctTrackerCategoryRecord} from './recoveryRepository';
import {loadHome} from './homeRepository';
import {loadRecoveryProgramme,beginRecoveryProgramme,changeRecoveryStage,updateRecoveryEnrolment} from './recoveryProgrammeRepository';

// Opt in only against the explicitly fixed disposable loopback environment.
// These tests use original repositories and real local Auth + PostgREST + RLS.
describe.skipIf(process.env.FOVYN_INTEGRATED_LOCAL_TESTS!=='1')('original Fovyn modules + planning in one authenticated local environment',()=>{
 const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
 const suffix=crypto.randomUUID().slice(0,8),date=new Date().toISOString().slice(0,10),now=new Date().toISOString();
 let a:any,b:any,goalId:string,accountId:string,exercise:any,sessionId:string,plan:Plan,repo:ReturnType<typeof planRepository>;
 beforeAll(async()=>{
  const config=JSON.parse(readFileSync('../phase1/integrated-tools/local-services.json','utf8'));
  async function signIn(email:string){const c=createClient('http://127.0.0.1:4178/__supabase',config.anonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:crypto.randomUUID()},global:{headers:{'x-fovyn-environment':'development'}}});const r=await c.auth.signInWithPassword({email,password:'LocalPreview!2026'});expect(r.error).toBeNull();return c;}
  a=await signIn('founder@fovyn.test');b=await signIn('second@fovyn.test');state.client=a;repo=planRepository(a,{ownerId:A,isTest:false});
 },30000);
 it('uses real signed-in identities with separate sessions',async()=>{expect((await a.auth.getUser()).data.user.id).toBe(A);expect((await b.auth.getUser()).data.user.id).toBe(B);});
 it('creates and edits the original measured goal, keeping its rule and tracker',async()=>{
  await createGoal({title:`Integrated goal ${suffix}`,areaKey:'health',goalKind:'finite',priority:'primary',negotiability:'negotiable',startsOn:date,endsOn:'2027-12-31',measurementType:'count',unitKey:'count',operator:'minimum',targetMin:1,period:'day',aggregation:'sum',trackerModule:'metrics'});
  const goal=(await listGoals()).find(g=>g.title===`Integrated goal ${suffix}`)!;expect(goal).toBeTruthy();goalId=goal.id;expect(goal.rule).toBeTruthy();expect(goal.tracker_id).toBeTruthy();
  await updateGoalMetadata(goal,{title:`Integrated goal edited ${suffix}`,description:'Synthetic existing-goal editor verification',areaKey:'health',priority:'primary'});
  expect((await listGoals()).find(g=>g.id===goalId)?.title).toBe(`Integrated goal edited ${suffix}`);expect((await loadGoalOptions()).areas).toHaveLength(6);
 });
 it('saves programme configuration and links milestones/tasks to that same existing goal',async()=>{
  plan=await repo.load();plan=await repo.save(plan,{type:'settings',value:{...plan.settings,programme_name:'Adam 2.0',starts_on:'2026-11-01',target_on:'2027-12-31'}});
  const owned={owner_id:A,is_test:false};const milestone={...owned,id:crypto.randomUUID(),goal_id:goalId,title:`Integrated milestone ${suffix}`,due_on:'2026-12-01',completed_at:null};
  plan=await repo.save(plan,{type:'milestone',value:milestone});
  const task={...owned,id:crypto.randomUUID(),goal_id:goalId,milestone_id:milestone.id,title:`Integrated task ${suffix}`,due_on:date,scheduled_on:date,scheduled_time:'17:30',focus_on:date,status:'todo' as const,blocked_reason:'',completed_at:null};
  plan=await repo.save(plan,{type:'task',value:task});
  const saved=plan.tasks.find(t=>t.id===task.id)!;plan=await repo.save(plan,{type:'task',value:taskState({...saved,title:`Integrated task edited ${suffix}`},'done')});
  const loaded=await repo.load();expect(loaded.tasks.find(t=>t.id===task.id)).toMatchObject({status:'done',scheduled_time:'17:30',goal_id:goalId});expect(loaded.settings.programme_name).toBe('Adam 2.0');
  const measured=(await listGoals()).find(g=>g.id===goalId)!;expect(measured.records).toHaveLength(0);expect(measured.rule).toBeTruthy();
 });
 it('creates/edits/reloads the original Money account and transaction with correct balance',async()=>{
  const input={name:`Local account ${suffix}`,account_type:'cash' as const,currency:'IDR',opening_balance:100000,include_in_total:true,icon_key:'money'};
  let money=await loadMoney();const existing=money.accounts.find(x=>x.name.startsWith('Local account edited'));if(existing){accountId=existing.id;input.opening_balance=existing.opening_balance;}else{await saveAccount(input);money=await loadMoney();accountId=money.accounts.find(x=>x.name===input.name)!.id;}const startingBalance=money.accounts.find(x=>x.id===accountId)!.balance;
  await saveAccount({...input,name:`Local account edited ${suffix}`},accountId);
  const tx={transaction_type:'expense' as const,amount:10000,currency:'IDR',account_id:accountId,destination_account_id:null,destination_amount:null,destination_currency:null,category_id:money.categories.find(c=>c.category_type==='expense')?.id??null,title:`Local expense ${suffix}`,occurred_at:now,note:'Synthetic',goalIds:[]};
  await saveMoney(tx);money=await loadMoney();const row=money.transactions.find(t=>t.title===tx.title)!;
  await saveMoney({...tx,amount:15000,title:`Local expense edited ${suffix}`},row.id);
  money=await loadMoney();expect(money.accounts.find(x=>x.id===accountId)?.balance).toBe(startingBalance-15000);expect(money.transactions.find(t=>t.id===row.id)?.amount).toBe(15000);
 });
 it('preserves income, cross-currency transfers, categories, recurring schedules and retry identity',async()=>{
  let money=await loadMoney();let destination=money.accounts.find(x=>x.name==='Local transfer reserve');
  if(!destination){await saveAccount({name:'Local transfer reserve',account_type:'savings',currency:'GBP',opening_balance:100,include_in_total:true,icon_key:'money'});money=await loadMoney();destination=money.accounts.find(x=>x.name==='Local transfer reserve')!;}
  await saveCategory({name:`Preview income category ${suffix}`,category_type:'income',icon_key:'money'});money=await loadMoney();const category=money.categories.find(x=>x.name===`Preview income category ${suffix}`)!;
  await saveCategory({name:`Preview income category edited ${suffix}`,category_type:'income',icon_key:'money'},category.id);
  const balance=money.accounts.find(x=>x.id===accountId)!.balance,reserve=destination.balance;
  const income={transaction_type:'income' as const,amount:50000,currency:'IDR',account_id:accountId,destination_account_id:null,destination_amount:null,destination_currency:null,category_id:category.id,title:`Preview income ${suffix}`,occurred_at:now,note:'Synthetic',goalIds:[goalId],clientRequestId:crypto.randomUUID()};
  await saveMoney(income);await expect(saveMoney(income)).rejects.toThrow();
  money=await loadMoney();expect(money.transactions.filter(x=>x.client_request_id===income.clientRequestId)).toHaveLength(1);expect(money.transactions.find(x=>x.title===income.title)?.goalIds).toContain(goalId);
  const transfer={...income,clientRequestId:crypto.randomUUID(),transaction_type:'transfer' as const,amount:20000,destination_account_id:destination.id,destination_amount:1,destination_currency:'GBP',category_id:null,title:`Preview transfer ${suffix}`,goalIds:[]};
  await saveMoney(transfer);money=await loadMoney();const row=money.transactions.find(x=>x.title===transfer.title)!;
  await saveMoney({...transfer,amount:25000,destination_amount:1.25},row.id);money=await loadMoney();
  expect(money.accounts.find(x=>x.id===accountId)!.balance).toBe(balance+25000);expect(money.accounts.find(x=>x.id===destination!.id)!.balance).toBe(reserve+1.25);
  expect(money.transactions.filter(x=>x.id===row.id)).toHaveLength(1);expect(money.categories.find(x=>x.id===category.id)?.name).toBe(`Preview income category edited ${suffix}`);
  const recurring={name:`Preview recurring ${suffix}`,transaction_type:'income' as const,amount:10000,currency:'IDR',account_id:accountId,category_id:category.id,recurrence:'weekly' as const,next_expected_date:date,note:'Synthetic'};
  await saveRecurring(recurring);money=await loadMoney();const item=money.recurring.find(x=>x.name===recurring.name)!;
  await saveRecurring({...recurring,amount:12000},item.id);await advanceRecurring(item);money=await loadMoney();
  expect(money.recurring.find(x=>x.id===item.id)?.amount).toBe(12000);expect(money.recurring.find(x=>x.id===item.id)!.next_expected_date).toBe(new Date(new Date(`${date}T12:00:00Z`).getTime()+7*86400000).toISOString().slice(0,10));
  await saveReportingCurrency('GBP');expect((await loadMoney()).currency).toBe('GBP');await saveReportingCurrency('IDR');expect((await loadMoney()).currency).toBe('IDR');
 });
 it('reloads edited milestones and rejects duplicate planning identities without extra rows',async()=>{
  const loaded=await repo.load();const milestone=loaded.milestones.find(x=>x.title===`Integrated milestone ${suffix}`)!;
  const updated=await repo.save(loaded,{type:'milestone',value:{...milestone,title:`Milestone edited ${suffix}`,completed_at:new Date().toISOString()}});
  const task=updated.tasks.find(x=>x.title===`Integrated task edited ${suffix}`)!;
  await expect(repo.save(updated,{type:'task',value:{...task,updated_at:undefined}})).rejects.toThrow();
  const reloaded=await repo.load();expect(reloaded.tasks.filter(x=>x.id===task.id)).toHaveLength(1);expect(reloaded.milestones.find(x=>x.id===milestone.id)).toMatchObject({title:`Milestone edited ${suffix}`,goal_id:goalId});expect(reloaded.milestones.find(x=>x.id===milestone.id)?.completed_at).toBeTruthy();
 });
 it('creates/edits/reloads foods, entries and nutrition targets through original repositories',async()=>{
  const item={kind:'food' as const,name:`Preview food ${suffix}`,healthy:null,calories:200,protein_g:20,carbs_g:15,fat_g:5,fibre_g:3};await saveItem(item);
  let data=await loadNutrition();const food=data.items.find(i=>i.name===item.name)!;await saveItem({...item,name:`Preview food edited ${suffix}`},food.id);
  const entry={sourceItemId:food.id,entryKind:'food' as const,name:`Preview lunch ${suffix}`,mealType:'lunch' as const,customMeal:'',healthy:null,occurredAt:now,notes:'Synthetic',goalIds:[],calories:200,protein_g:20,carbs_g:15,fat_g:5,fibre_g:3};
  await saveEntry(entry);data=await loadNutrition();const logged=data.entries.find(e=>e.name===entry.name)!;await saveEntry({...entry,calories:220,protein_g:22,name:`Preview lunch edited ${suffix}`},logged.id);
  await saveTarget({nutrient:'protein_g',target_type:'minimum',minimum_value:100,maximum_value:null});data=await loadNutrition();expect(data.entries.find(e=>e.id===logged.id)?.protein_g).toBe(22);expect(data.targets.find(t=>t.nutrient==='protein_g')?.minimum_value).toBe(100);
 });
 it('reuses saved meals with persisted macros, targets, history and original goal links',async()=>{
  const meal={kind:'saved_meal' as const,name:`Saved meal ${suffix}`,healthy:true,calories:450,protein_g:30,carbs_g:50,fat_g:15,fibre_g:8};await saveItem(meal);
  let data=await loadNutrition();const item=data.items.find(x=>x.name===meal.name)!;await saveItem({...meal,name:`Saved meal edited ${suffix}`,protein_g:32},item.id);
  const entry={sourceItemId:item.id,entryKind:'saved_meal' as const,name:`Saved meal log ${suffix}`,mealType:'dinner' as const,customMeal:'',healthy:true,occurredAt:now,notes:'Synthetic saved meal',goalIds:[goalId],calories:450,protein_g:32,carbs_g:50,fat_g:15,fibre_g:8};
  await saveEntry(entry);data=await loadNutrition();const logged=data.entries.find(x=>x.name===entry.name)!;await saveEntry({...entry,calories:460,notes:'Corrected'},logged.id);
  await saveTarget({nutrient:'calories',target_type:'range',minimum_value:1800,maximum_value:2200});data=await loadNutrition();
  expect(data.items.find(x=>x.id===item.id)?.protein_g).toBe(32);expect(data.entries.filter(x=>x.id===logged.id)).toHaveLength(1);expect(data.entries.find(x=>x.id===logged.id)).toMatchObject({calories:460,protein_g:32,source_item_id:item.id,goalIds:[goalId]});expect(data.targets.find(x=>x.nutrient==='calories')).toMatchObject({minimum_value:1800,maximum_value:2200});
 });
 it('creates/edits/reloads an original exercise, template and workout history',async()=>{
  const input:any={name:`Preview squat ${suffix}`,canonical_movement_key:null,exercise_alias:null,name_standardisation_status:'custom',muscle_group:'quadriceps',secondary_muscle_group:null,equipment:'bodyweight',resistance_type:'bodyweight',default_sets:1,min_target:5,max_target:10,increment_kg:0,minimum_weight:null,maximum_weight:null,available_weights:[],weight_convention:'bodyweight_only',measurement_type:'reps',progression_type:'double_progression',notes:'Synthetic'};
  await saveExerciseProfile(input);exercise=(await loadExerciseProfiles()).find(e=>e.name===input.name)!;expect(exercise).toBeTruthy();await saveExerciseProfile({...input,notes:'Edited synthetic exercise'},exercise.id);
  const template=await saveTemplate({name:`Preview template ${suffix}`,exerciseIds:[exercise.id]});expect((await loadTemplate(template)).exerciseCount).toBe(1);
  sessionId=await saveWorkout({date,type:'Custom',variant:`Preview ${suffix}`,templateId:template,duration:15,items:[{exerciseId:exercise.exercise_key,exerciseName:exercise.name,slotName:'Movement',sets:[{kg:'0',value:8}]}]});
  let session=await loadTrainingSession(sessionId);expect(session.exercises[0].sets[0].target_value).toBe(8);
  await correctTrainingSession(sessionId,{...session,notes:'Edited synthetic workout',duration_min:20},session.exercises);session=await loadTrainingSession(sessionId);expect(session.notes).toBe('Edited synthetic workout');expect(session.duration_min).toBe(20);
 });
 it('creates/edits/reloads original Activity records',async()=>{
  const input={trackerId:null,activity:`Preview walk ${suffix}`,occurredAt:now,durationMin:20,watchCalories:80,distanceKm:1.5,averageHr:100,notes:'Synthetic',isSocial:false,goalIds:[]};await saveActivity(input);const record=(await loadActivities()).entries.find(e=>e.activity===input.activity)!;
  await saveActivity({...input,durationMin:25,notes:'Edited synthetic activity'},record.id);expect((await loadActivities()).entries.find(e=>e.id===record.id)?.duration_min).toBe(25);
 });
 it('creates/edits/reloads the existing Recovery check-in path',async()=>{
  await createTracker({name:`Preview recovery ${suffix}`,module:'medication',iconKey:'recovery',areaKey:'health',measurementType:'count',unitKey:'count',metricSummaryMode:'latest',metricSummaryPeriod:'total',metricRecordCardinality:'multiple',frequency:'anytime',days:[],daypart:null});
  const tracker=(await loadTrackers()).trackers.find(t=>t.name===`Preview recovery ${suffix}`)!;await addMetricRecord(tracker,1,now,'Synthetic recovery check',undefined,'complete');
  const record=(await loadRecovery()).records.find(r=>r.tracker_id===tracker.id)!;expect(record).toBeTruthy();await correctTrackerCategoryRecord(record,{value:1,occurredAt:now,note:'Edited synthetic recovery',occurrenceStatus:'complete'});expect((await loadRecovery()).records.find(r=>r.id===record.id)?.note).toBe('Edited synthetic recovery');
 });
 it('starts, edits and reloads the existing Recovery programme for this account only',async()=>{
  let data=await loadRecoveryProgramme();expect(data.stages.length).toBeGreaterThan(1);expect(Object.keys(data.exercises).length).toBeGreaterThan(0);
  const enrolment=data.enrolment??await beginRecoveryProgramme(data.programme.id,data.stages[0].id);
  await updateRecoveryEnrolment(enrolment.id,{notes:'Synthetic programme verification',prescribedBy:'self',professionalName:'',professionalPrescribed:false});
  await changeRecoveryStage(enrolment,data.stages[1].id,'Synthetic stage change');data=await loadRecoveryProgramme();expect(data.enrolment?.current_stage_id).toBe(data.stages[1].id);expect(data.enrolment?.notes).toBe('Synthetic programme verification');
  state.client=b;try{expect((await loadRecoveryProgramme()).enrolment).toBeNull();}finally{state.client=a;}
 });
 it('loads original Home using the preserved functional dependencies',async()=>{const home=await loadHome();expect(home.goals.some(g=>g.id===goalId)).toBe(true);});
 it('denies foreign reads, updates and forged inserts across core modules and planning',async()=>{
  for(const table of ['money_accounts','money_transactions','money_categories','money_recurring_items','nutrition_items','nutrition_targets','nutrition_entries','training_sessions','trackers','goals','tasks','goal_milestones','user_plan_settings']){
   const read=await b.from(table).select('*').eq('owner_id',A);expect(read.error,table).toBeNull();expect(read.data,table).toHaveLength(0);
  }
  const write=await b.from('money_accounts').update({name:'Foreign edit'}).eq('id',accountId).select('id');expect(write.error).toBeNull();expect(write.data).toHaveLength(0);
  const forge=await b.from('money_accounts').insert({owner_id:A,name:'Forged',account_type:'cash',currency:'IDR',opening_balance:0,include_in_total:true,icon_key:'money'});expect(forge.error?.code).toBe('42501');
  const second=await planRepository(b,{ownerId:B,isTest:false}).load();expect(second.goals.some(g=>g.id===goalId)).toBe(false);expect(second.settings.programme_name).not.toBe('Adam 2.0');
 });
});
