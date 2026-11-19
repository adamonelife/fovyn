import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { planRepository } from './adam/planRepository';
import { PlanWorkspace } from './adam/PlanWorkspace';
import { PlanEditor, type Edit } from './adam/PlanEditor';
import { ProgrammeSettings } from './adam/ProgrammeSettings';
import type { Action, Plan } from './adam/planning';
import { fovynDateKey } from './fovynDate';
import './personal-plan.css';

export default function PersonalPlanModule({ownerId,isTest,openGoal}:{ownerId:string;isTest:boolean;openGoal:(id?:string)=>void}) {
 const [timezone,setTimezone]=useState('UTC');const [plan,setPlan]=useState<Plan>(); const [error,setError]=useState(''); const [notice,setNotice]=useState('');
 const [tab,setTab]=useState('plan');const [editing,setEditing]=useState<Edit>();const [busy,setBusy]=useState(false);const [reload,setReload]=useState(0);
 const saving=useRef(false);const generation=useRef(0);const scope={ownerId,isTest};
 useEffect(()=>{const version=++generation.current;setPlan(undefined);setEditing(undefined);setError('');setNotice('');
  const repo=planRepository(supabase,{ownerId,isTest});Promise.all([repo.load(),supabase.from('profiles').select('timezone').eq('id',ownerId).single()]).then(([value,profile])=>{if(profile.error)throw new Error(profile.error.message);if(generation.current===version){setPlan(value);setTimezone(profile.data.timezone||'UTC');}}).catch(e=>{if(generation.current===version)setError(e.message)});
  return()=>{generation.current++};
 },[ownerId,isTest,reload]);
 async function apply(action:Action){
  if(!plan||saving.current)return false;const version=generation.current;saving.current=true;setBusy(true);setError('');setNotice('Saving…');
  try{const saved=await planRepository(supabase,scope).save(plan,action);if(generation.current!==version)return false;setPlan(saved);setNotice('Saved');return true;}
  catch(e){if(generation.current===version){setError(e instanceof Error?e.message:'Unable to save.');setNotice('Save not confirmed. Reload saved data before retrying.');}return false;}
  finally{saving.current=false;if(generation.current===version)setBusy(false);}
 }
 const today=fovynDateKey(timezone);
 function edit(value:Edit){if(value.kind==='goal')openGoal(value.value?.id);else setEditing(value);}
 return <div className="page-wrap personal-plan"><header className="page-head"><div><p className="eyebrow">PERSONAL PLANNING</p><h1>My Plan</h1><p>Your programme, goals and next actions. </p></div><button className="soft-button" disabled={busy||Boolean(editing)} onClick={()=>setReload(n=>n+1)}>Reload saved plan</button></header>
 {error&&<p className="goal-error" role="alert">{error}</p>}<p role="status">{notice||(!plan&&!error?'Loading your plan…':'')}</p>
 {plan&&<><div className="page-tabs" aria-label="Planning sections"><button aria-pressed={tab==='plan'} onClick={()=>setTab('plan')}>Goals & tasks</button><button aria-pressed={tab==='programme'} onClick={()=>setTab('programme')}>Programme</button></div><fieldset className="planning-save-boundary" disabled={busy}>{tab==='plan'?<PlanWorkspace plan={plan} today={today} apply={apply} edit={edit}/>:<ProgrammeSettings programmeOnly settings={plan.settings} save={value=>apply({type:'settings',value})}/>}</fieldset>
 {editing&&<PlanEditor edit={editing} plan={plan} scope={scope} today={today} save={apply} busy={busy} error={error} close={()=>{setEditing(undefined);setError('')}}/>}</>}
 </div>;
}
