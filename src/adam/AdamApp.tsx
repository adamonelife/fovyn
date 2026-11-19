import { useEffect, useRef, useState } from 'react';
import fovynMark from '../../public/brand/forbair-mark.png';
import { loadToday, type TodayData } from './todayRepository';
import { fixtureReader, previewInstant } from './fixtures';
import { adamPresentation, availableWorkspaces, legacyPresentation } from './presentation';
import { TodayPanel } from './TodayPanel';
import { type Action, type Plan } from './planning';
import { localPlanRepository } from './localPlanClient';
import { syntheticAccounts } from './planFixtures';
import { PlanWorkspace } from './PlanWorkspace';
import { PlanEditor, type Edit } from './PlanEditor';
import { ProgrammeSettings } from './ProgrammeSettings';
// Filename retained for local review-link compatibility; Fovyn is the product.
export function AdamApp() {
  const [account, setAccount] = useState(syntheticAccounts[0].id);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const plan = plans[account], scope = { ownerId: account, isTest: true };
  const repository = useRef<Awaited<ReturnType<typeof localPlanRepository>> | null>(null);
  const saving = useRef(false);
  const [busy,setBusy] = useState(false);
  const [loaded,setLoaded] = useState('');
  const [saveStatus,setSaveStatus] = useState('');
  const [reload,setReload] = useState(0);
  const [workspace, setWorkspace] = useState('Today');
  const [data, setData] = useState<TodayData>();
  const [error, setError] = useState('');
  const [legacy, setLegacy] = useState(false);
  const [more, setMore] = useState(false);
  const [quickLog, setQuickLog] = useState(false);
  const [notes, setNotes] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState('');
  const [reviews, setReviews] = useState<Record<string,string>>({});
  const [editing, setEditing] = useState<Edit>();
  const logDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d=logDialog.current; if(quickLog&&!d?.open)d?.showModal();else if(!quickLog&&d?.open)d.close(); },[quickLog]);
  useEffect(() => {
    let active = true; setData(undefined);
    const user = syntheticAccounts.find(x => x.id === account)!;
    const reader = { ...fixtureReader, viewer: async () => ({ownerId:account,context:'test' as const,timezone:user.timezone}), goals:async()=>[],schedules:async()=>[],records:async()=>[],nutrition:async()=>[] };
    loadToday(reader,previewInstant).then(v=>{if(active)setData(v)}).catch(e=>{if(active)setError(String(e))});
    return()=>{active=false};
  },[account]);
  useEffect(() => {
    let active=true; repository.current=null;setLoaded('');setError('');setSaveStatus('');
    localPlanRepository(account).then(async repo=>{const result=await repo.load();if(active){repository.current=repo;setPlans(current=>({...current,[account]:result}));setLoaded(account);}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load saved plan.');});
    return()=>{active=false};
  },[account,reload]);
  async function apply(action: Action) {
    if(saving.current || !repository.current || loaded!==account)return false;
    saving.current=true;setBusy(true);setSaveStatus('Saving…');setError('');
    try {
      const next=await repository.current.save(plan,action);
      setPlans(current=>({...current,[account]:next}));setSaveStatus('Saved to local database');return true;
    } catch(e){setError(e instanceof Error?e.message:'Unable to save plan.');setSaveStatus('Save not confirmed. Reload to check saved data before retrying.');return false;}
    finally{saving.current=false;setBusy(false);}
  }
  function navigate(name:string){setWorkspace(name);setMore(false);setError('');}
  function switchAccount(id:string){setAccount(id);setEditing(undefined);setQuickLog(false);setDraft('');setWorkspace('Today');setError('');}
  if(!plan || loaded!==account)return <div className="adam-app"><main className="adam-main"><h1>Fovyn</h1><p role="status">{error?'Unable to load your saved plan.':'Loading your saved local plan…'}</p>{error&&<p role="alert">{error}</p>}<button onClick={()=>setReload(v=>v+1)}>Retry connection</button><p>Synthetic users · Disposable local database · Production unchanged</p></main></div>;
  const navigation=availableWorkspaces(legacy?legacyPresentation:adamPresentation).filter(name=>!['Health','Money','Projects','Life'].includes(name)||plan.settings.preferred_modules.includes(name));
  const workspaceAreas=workspace==='Health'?['health']:workspace==='Money'?['wealth']:workspace==='Projects'?['career','ventures']:workspace==='Life'?['life']:undefined;
  return <div className="adam-app"><div className="local-notice"><span>LOCAL DATABASE · Synthetic accounts · Planning saves survive reload</span><label>Preview account<select aria-label="Preview account" disabled={busy} value={account} onChange={e=>switchAccount(e.target.value)}>{syntheticAccounts.map(u=><option key={u.id} value={u.id}>{u.label}</option>)}</select></label></div>
    <div className="adam-shell"><aside className="adam-sidebar"><div className="adam-brand"><img src={fovynMark} alt="Fovyn growing F"/><span>Fovyn</span><small>Grow more good days.</small></div><nav aria-label="Workspaces">{navigation.map(n=><button key={n} aria-current={workspace===n?'page':undefined} onClick={()=>navigate(n)}>{n}</button>)}</nav><p className="adam-private">Private by design.<br/>AI is off.</p></aside>
    <main className="adam-main"><header className="adam-header"><div className="fovyn-mobile-mark"><img src={fovynMark} alt=""/><strong>Fovyn</strong></div><span>{data ? new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeZone:syntheticAccounts.find(u=>u.id===account)!.timezone}).format(previewInstant):'Fovyn'}</span><button className="adam-primary" onClick={()=>setQuickLog(true)}>+ Log a note</button></header><div className="adam-intro"><p className="adam-eyebrow">{workspace}</p><h1>{workspace==='Today'?'Make room for what matters.':workspace}</h1><p>{workspace==='Today'?'Choose a few useful actions and give them room.':workspace==='My Plan'?`${plan.settings.programme_name} · Your goals, milestones and next actions.`:'One shared plan, viewed through what matters here.'}</p></div>
      {error && <p className="planning-error" role="alert">{error}</p>}<div className="planning-save-status"><span role="status">{saveStatus || 'Loaded from local database'}</span><button className="adam-link" disabled={busy || Boolean(editing)} onClick={()=>setReload(v=>v+1)}>Reload saved plan</button></div><fieldset className="planning-save-boundary" disabled={busy}>
      {!data?<p role="status">Loading your local plan…</p>:workspace==='Today'?<TodayPanel data={data} plan={plan} notes={notes[account]??[]} apply={apply} open={navigate}/>:['My Plan','Health','Money','Projects','Life'].includes(workspace)?<PlanWorkspace key={`${account}:${workspace}`} plan={plan} today={data.date} areas={workspaceAreas} title={workspace==='My Plan'?undefined:`${workspace} · goals & actions`} apply={apply} edit={setEditing}/>:workspace==='Settings'?<><ProgrammeSettings key={account} settings={plan.settings} save={value=>apply({type:'settings',value})}/><section><h2>Dormant Product Features</h2><label className="adam-switch"><input type="checkbox" checked={legacy} onChange={e=>setLegacy(e.target.checked)}/>Show dormant Forest and Social entry points</label><p className="adam-muted">Forest, Trees, Canopy, Groves visualisations and Friends/Beta remain preserved. These flags change presentation only.</p><p className="adam-muted">AI disabled · No provider or key · No live integrations in this preview.</p></section></>:workspace==='Review'?<section><h2>A short weekly reflection</h2><label htmlFor="review">What worked, what was difficult, and one focus for next week</label><textarea id="review" value={reviews[account]??''} onChange={e=>{const text=e.target.value;setReviews(v=>({...v,[account]:text}))}}/><p className="adam-muted">Draft for this synthetic account only. Nothing is uploaded.</p></section>:<section><h2>{workspace} is a Dormant Product Feature</h2><p>Original code, assets, data relationships and restoration documentation remain preserved. This preview does not mount dormant systems.</p></section>}
      </fieldset><footer className="adam-footer">Fovyn · Planning saved in a disposable local database. Notes and review drafts are temporary. No AI or hosted requests.</footer></main></div>
    <nav className="adam-mobile" aria-label="Mobile navigation"><button onClick={()=>navigate('Today')}>Today</button><button onClick={()=>navigate('My Plan')}>My Plan</button><button className="adam-primary" onClick={()=>setQuickLog(true)}>+ Log</button><button aria-expanded={more} onClick={()=>setMore(v=>!v)}>More</button></nav>{more&&<section className="adam-more" aria-label="More workspaces">{navigation.filter(n=>!['Today','My Plan'].includes(n)).map(n=><button key={n} onClick={()=>navigate(n)}>{n}</button>)}</section>}
    {editing&&data&&<PlanEditor key={`${account}:${editing.kind}:${editing.value?.id??'new'}`} edit={editing} plan={plan} scope={scope} today={data.date} save={apply} busy={busy} error={error} close={()=>{setEditing(undefined);setError('')}}/>}
    <dialog ref={logDialog} className="adam-dialog" aria-labelledby="log-title" onCancel={()=>setQuickLog(false)}><h2 id="log-title">Capture a thought</h2><label htmlFor="quick-note">Note</label><textarea autoFocus id="quick-note" value={draft} onChange={e=>setDraft(e.target.value)}/><p className="adam-muted">Kept in this account’s preview. Nothing is uploaded.</p><button className="adam-primary" disabled={!draft.trim()} onClick={()=>{setNotes(v=>({...v,[account]:[...(v[account]??[]),draft.trim()]}));setDraft('');setQuickLog(false)}}>Add to preview</button><button className="adam-link" onClick={()=>setQuickLog(false)}>Cancel</button></dialog>
  </div>;
}
