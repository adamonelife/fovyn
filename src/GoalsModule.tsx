import {useEffect,useMemo,useState} from 'react';
import {Archive,Check,ChevronRight,Leaf,Pause,Play,Plus,Square,Trash2,X} from 'lucide-react';
import {supabase} from './supabase';
import {goalProgress,targetLabel,type Aggregation,type GoalPeriod,type MeasurementType,type TargetOperator} from './goalsDomain';
import {addGoalRecord,createGoal,deleteEmptyGoal,deleteGoalRecord,listGoals,loadGoalOptions,pruneGoal,setGoalStatus,updateGoal,updateGoalMetadata,updateGoalRecord,type AreaRow,type GoalBundle,type GoalInput,type GoalTracker,type RecordRow,type SubcategoryRow,type UnitRow} from './goalsRepository';
import GrovesPanel from './GrovesPanel';
import {formatDisplayLabel} from './displayLabels';

type Options={areas:AreaRow[];units:UnitRow[];subcategories:SubcategoryRow[];trackers:GoalTracker[]};
const today=()=>new Date().toISOString().slice(0,10);
export const recentGoalStart=()=>{const date=new Date();date.setDate(date.getDate()-7);return date.toISOString().slice(0,10)};
const yesterday=()=>{const date=new Date();date.setDate(date.getDate()-1);return date.toISOString().slice(0,10)};

function SignIn({onDone}:{onDone:()=>void}){
  const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState('');
  return <div className="goals-auth">
<Leaf/>
<h1>Your Goals grow here.</h1>
<p>Sign in to load your private Goals and progress.</p>
<input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
<input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="goal-error">{error}</p>}<button onClick={async()=>{setError('');const{error}=await supabase!.auth.signInWithPassword({email,password});if(error)setError(error.message);else onDone();}}>Sign in</button>
</div>;
}

function Editor({options,goal,initialTrackerId='',first=false,close,saved}:{options:Options;goal?:GoalBundle;initialTrackerId?:string;first?:boolean;close:()=>void;saved:()=>void}){
  const rule=goal?.rule;
  const[title,setTitle]=useState(goal?.title??'');
  const[description,setDescription]=useState(goal?.description??'');
  const[area,setArea]=useState(goal?.area_key??options.areas[0]?.key??'health');
  const[subcategory,setSubcategory]=useState(goal?.subcategory_id??'');
  const[measurement,setMeasurement]=useState<MeasurementType>(rule?.measurement_type??'count');
  const[unit,setUnit]=useState(rule?.unit_key??'count');
  const[customUnit,setCustomUnit]=useState(rule?.custom_unit??'');
  const[operator,setOperator]=useState<TargetOperator>(rule?.target_operator??'minimum');
  const[targetMin,setTargetMin]=useState(String(rule?.target_min??1));
  const[targetMax,setTargetMax]=useState(String(rule?.target_max??''));
  const[period,setPeriod]=useState<GoalPeriod>(rule?.period??'week');
  const[aggregation,setAggregation]=useState<Aggregation>(rule?.aggregation??'sum');
  const[kind,setKind]=useState<GoalInput['goalKind']>(goal?.goal_kind??'finite');
  const[priority,setPriority]=useState<GoalInput['priority']>(goal?.presentation_priority??(first?'primary':'secondary'));
  const[negotiability,setNegotiability]=useState<GoalInput['negotiability']>(goal?.negotiability??'negotiable');
  const[startsOn,setStartsOn]=useState(goal?.starts_on??today());
  const[endsOn,setEndsOn]=useState(goal?.ends_on??'');
  const[trackerId,setTrackerId]=useState(goal?.tracker_id??initialTrackerId);
  const[saving,setSaving]=useState(false),[error,setError]=useState('');
  const units=options.units.filter(x=>x.measurement_type===measurement);
  const selectedTracker=options.trackers.find(x=>x.id===trackerId);
  useEffect(()=>{if(!goal&&selectedTracker){setArea(selectedTracker.area_key);setSubcategory(selectedTracker.subcategory_id??'');setMeasurement(selectedTracker.measurement_type);setUnit(selectedTracker.unit_key??'');setCustomUnit(selectedTracker.custom_unit??'');if(!title)setTitle(selectedTracker.name)}},[trackerId]);
  useEffect(()=>{if(measurement!=='custom'&&!units.some(x=>x.key===unit))setUnit(units[0]?.key??'');},[measurement]);
  const input=():GoalInput=>({title:title.trim(),description:description.trim(),areaKey:area,subcategoryId:subcategory||undefined,goalKind:kind,priority,negotiability,startsOn,endsOn:endsOn||undefined,measurementType:measurement,unitKey:unit||undefined,customUnit:customUnit.trim()||undefined,operator,targetMin:Number(targetMin),targetMax:targetMax===''?undefined:Number(targetMax),period,aggregation,trackerId:trackerId||undefined,trackerModule:'metrics',trackerName:title.trim()});
  const valid=title.trim()&&Number.isFinite(Number(targetMin))&&(operator!=='range'||Number.isFinite(Number(targetMax)))&&(measurement!=='custom'||customUnit.trim())&&startsOn>=recentGoalStart();
  return <div className="sheet-shade" onMouseDown={close}>
<section className="goal-editor-v1" onMouseDown={e=>e.stopPropagation()}>
<button className="sheet-close" onClick={close} aria-label="Close">
<X/>
</button>
<p className="eyebrow">{goal?'EDIT GOAL':'+ PLANT GOAL'}</p>
<h2>{goal?'Edit Goal':'What would you like to grow?'}</h2>
<div className="goal-form-grid">
<label className="span-2">Goal name<input autoFocus value={title} onChange={e=>setTitle(e.target.value)}/>
</label>
<label className="span-2">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Optional context"/>
</label>
{!goal&&<label className="span-2">How will this Goal be tracked?<select value={trackerId} onChange={e=>setTrackerId(e.target.value)}><option value="">Create New Log Item</option>{options.trackers.map(x=><option value={x.id} key={x.id}>Use {x.name} · {formatDisplayLabel(x.module)}</option>)}</select></label>}
<label>Area<select value={area} disabled={Boolean(selectedTracker)} onChange={e=>{setArea(e.target.value);setSubcategory('')}}>{options.areas.map(x=>
<option value={x.key} key={x.key}>{x.name}</option>)}</select>
</label>
<label>Subcategory<select value={subcategory} disabled={Boolean(selectedTracker)} onChange={e=>setSubcategory(e.target.value)}>
<option value="">None</option>{options.subcategories.filter(x=>x.area_key===area).map(x=>
<option value={x.id} key={x.id}>{x.name}</option>)}</select>
</label>
<label>Measure<select value={measurement} disabled={Boolean(selectedTracker)} onChange={e=>setMeasurement(e.target.value as MeasurementType)}>{['weight','distance','duration','money','energy','mass','percentage','volume','count','time','rating','custom'].map(x=>
<option value={x} key={x}>{formatDisplayLabel(x)}</option>)}</select>
</label>{measurement==='custom'?<label>Custom unit<input value={customUnit} onChange={e=>setCustomUnit(e.target.value)} placeholder="e.g. chapters"/>
</label>:<label>Unit<select value={unit} onChange={e=>setUnit(e.target.value)}>{units.map(x=>
<option value={x.key} key={x.key}>{x.name} ({x.symbol})</option>)}</select>
</label>}<label>Target rule<select value={operator} onChange={e=>setOperator(e.target.value as TargetOperator)}>
<option value="minimum">At least</option>
<option value="maximum">At most</option>
<option value="exact">Exactly</option>
<option value="range">Range</option>
</select>
</label>
<label>Target<input type="number" inputMode="decimal" step="any" value={targetMin} onChange={e=>setTargetMin(e.target.value)}/>
</label>{operator==='range'&&<label>Upper target<input type="number" inputMode="decimal" step="any" value={targetMax} onChange={e=>setTargetMax(e.target.value)}/>
</label>}<label>Period<select value={period} onChange={e=>setPeriod(e.target.value as GoalPeriod)}>
<option value="day">Daily</option>
<option value="week">Weekly</option>
<option value="month">Monthly</option>
<option value="total">Overall</option>
</select>
</label>
<label>Calculate using<select value={aggregation} onChange={e=>setAggregation(e.target.value as Aggregation)}>
<option value="sum">Total</option>
<option value="count">Number of records</option>
<option value="latest">Latest amount</option>
<option value="average">Average</option>
</select>
</label>
<label>Goal type<select value={kind} onChange={e=>setKind(e.target.value as GoalInput['goalKind'])}>
<option value="finite">Finite</option>
<option value="permanent">Permanent</option>
<option value="maintenance">Maintenance</option>
</select>
</label>
<label>Show on Home?<select value={priority} onChange={e=>setPriority(e.target.value as GoalInput['priority'])}>
<option value="primary">Yes</option>
<option value="secondary">No</option>
</select>
</label>
<label>Commitment<select value={negotiability} onChange={e=>setNegotiability(e.target.value as GoalInput['negotiability'])}>
<option value="negotiable">Negotiable</option>
<option value="non_negotiable">Non-Negotiable</option>
</select>
</label>
<label className="span-2 goal-start-date">Starts<div><button type="button" className={startsOn===today()?'active':''} onClick={()=>setStartsOn(today())}>Today</button><button type="button" className={startsOn===yesterday()?'active':''} onClick={()=>setStartsOn(yesterday())}>Yesterday</button><input aria-label="Select Goal start date" type="date" min={recentGoalStart()} value={startsOn} onChange={e=>setStartsOn(e.target.value)}/></div><small>Up to seven days ago</small></label>
<label>Ends<input type="date" value={endsOn} min={startsOn} onChange={e=>setEndsOn(e.target.value)} disabled={kind==='permanent'}/>
</label>
</div>{error&&<p className="goal-error">{error}</p>}<button className="save-record" disabled={!valid||saving} onClick={async()=>{setSaving(true);setError('');try{goal?await updateGoal(goal,input()):await createGoal(input());saved();}catch(e){setError(e instanceof Error?e.message:'Unable to save Goal')}finally{setSaving(false)}}}>{saving?'Saving…':goal?'Save Goal changes':'Add Goal'}</button>
</section>
</div>;
}

function MetadataEditor({goal,options,close,saved}:{goal:GoalBundle;options:Options;close:()=>void;saved:()=>void}){const[title,setTitle]=useState(goal.title),[description,setDescription]=useState(goal.description??''),[area,setArea]=useState(goal.area_key),[subcategory,setSubcategory]=useState(goal.subcategory_id??''),[priority,setPriority]=useState(goal.presentation_priority),[error,setError]=useState(''),[busy,setBusy]=useState(false);return <div className="sheet-shade" onMouseDown={close}>
<section className="goal-editor-v1" onMouseDown={e=>e.stopPropagation()}>
<button className="sheet-close" onClick={close} aria-label="Close">
<X/>
</button>
<p className="eyebrow">EDIT GOAL</p>
<h2>Update how this Goal is presented.</h2>
<div className="goal-form-grid">
<label className="span-2">Goal name<input autoFocus value={title} onChange={e=>setTitle(e.target.value)}/>
</label>
<label className="span-2">Description<textarea value={description} onChange={e=>setDescription(e.target.value)}/>
</label>
<label>Area<select value={area} onChange={e=>{setArea(e.target.value);setSubcategory('')}}>{options.areas.map(x=>
<option value={x.key} key={x.key}>{x.name}</option>)}</select>
</label>
<label>Subcategory<select value={subcategory} onChange={e=>setSubcategory(e.target.value)}>
<option value="">None</option>{options.subcategories.filter(x=>x.area_key===area).map(x=>
<option value={x.id} key={x.id}>{x.name}</option>)}</select>
</label>
<label>Show on Home?<select value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}>
<option value="primary">Yes</option>
<option value="secondary">No</option>
</select>
</label>
</div>{error&&<p className="goal-error">{error}</p>}<button className="save-record" disabled={!title.trim()||busy} onClick={async()=>{setBusy(true);try{await updateGoalMetadata(goal,{title,description,areaKey:area,subcategoryId:subcategory||undefined,priority});saved()}catch(e){setError(e instanceof Error?e.message:'Unable to edit Goal')}finally{setBusy(false)}}}>{busy?'Saving…':'Save Goal details'}</button>
</section>
</div>}

function PruneEditor({goal,options,close,saved}:{goal:GoalBundle;options:Options;close:()=>void;saved:()=>void}){const rule=goal.rule!,unit=options.units.find(x=>x.key===rule.unit_key)?.symbol??rule.custom_unit??'',[operator,setOperator]=useState<TargetOperator>(rule.target_operator),[targetMin,setTargetMin]=useState(String(rule.target_min)),[targetMax,setTargetMax]=useState(String(rule.target_max??'')),[period,setPeriod]=useState<GoalPeriod>(rule.period),[aggregation,setAggregation]=useState<Aggregation>(rule.aggregation),[error,setError]=useState(''),[busy,setBusy]=useState(false);const valid=Number.isFinite(Number(targetMin))&&(operator!=='range'||Number.isFinite(Number(targetMax)));return <div className="sheet-shade" onMouseDown={close}>
<section className="goal-editor-v1" onMouseDown={e=>e.stopPropagation()}>
<button className="sheet-close" onClick={close} aria-label="Close">
<X/>
</button>
<p className="eyebrow">PRUNE GOAL</p>
<h2>Change the expectation going forward.</h2>
<p>The previous rule remains attached to the history it governed.</p>
<section className="goal-rule-live">
<span>CURRENT RULE</span>
<b>{targetLabel(rule,unit)}</b>
</section>
<div className="goal-form-grid">
<label>Target rule<select value={operator} onChange={e=>setOperator(e.target.value as TargetOperator)}>
<option value="minimum">At least</option>
<option value="maximum">At most</option>
<option value="exact">Exactly</option>
<option value="range">Range</option>
</select>
</label>
<label>Target<input type="number" inputMode="decimal" step="any" value={targetMin} onChange={e=>setTargetMin(e.target.value)}/>
</label>{operator==='range'&&<label>Upper target<input type="number" inputMode="decimal" step="any" value={targetMax} onChange={e=>setTargetMax(e.target.value)}/>
</label>}<label>Period<select value={period} onChange={e=>setPeriod(e.target.value as GoalPeriod)}>
<option value="day">Daily</option>
<option value="week">Weekly</option>
<option value="month">Monthly</option>
<option value="total">Overall</option>
</select>
</label>
<label>Calculate using<select value={aggregation} onChange={e=>setAggregation(e.target.value as Aggregation)}>
<option value="sum">Total</option>
<option value="count">Number of records</option>
<option value="latest">Latest reading</option>
<option value="average">Average</option>
</select>
</label>
</div>{error&&<p className="goal-error">{error}</p>}<button className="save-record" disabled={!valid||busy} onClick={async()=>{setBusy(true);try{await pruneGoal(goal,{operator,targetMin:Number(targetMin),targetMax:targetMax===''?undefined:Number(targetMax),period,aggregation});saved()}catch(e){setError(e instanceof Error?e.message:'Unable to Prune Goal')}finally{setBusy(false)}}}>{busy?'Pruning…':'Confirm prospective Prune'}</button>
</section>
</div>}

function Detail({goal,options,close,changed,openLog}:{goal:GoalBundle;options:Options;close:()=>void;changed:()=>void;openLog?:(module:string)=>void}){
  const[editing,setEditing]=useState<'details'|'prune'|null>(null),[value,setValue]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const[correcting,setCorrecting]=useState<RecordRow|null>(null),[correctedValue,setCorrectedValue]=useState(''),[correctedNote,setCorrectedNote]=useState('');
  const unit=options.units.find(x=>x.key===goal.rule?.unit_key)?.symbol??goal.rule?.custom_unit??'';
  const progress=goal.rule?goalProgress(goal.rule,goal.records,new Date(),1,goal.starts_on,goal.ends_on):{actual:0,percent:0};
  const act=async(fn:()=>Promise<unknown>)=>{setBusy(true);setError('');try{await fn();changed();close();}catch(e){setError(e instanceof Error?e.message:'Unable to update Goal')}finally{setBusy(false)}};
  if(editing==='details')return <Editor options={options} goal={goal} close={()=>setEditing(null)} saved={()=>{setEditing(null);changed();close()}}/>;
  if(editing==='prune')return <PruneEditor options={options} goal={goal} close={()=>setEditing(null)} saved={()=>{setEditing(null);changed();close()}}/>;
  return <div className="sheet-shade" onMouseDown={close}>
<section className="goal-detail-v1" onMouseDown={e=>e.stopPropagation()}>
<button className="sheet-close" onClick={close} aria-label="Close">
<X/>
</button>
<p className="eyebrow">{formatDisplayLabel(goal.area_key)} · {formatDisplayLabel(goal.status)} Goal</p>
<h1>{goal.title}</h1>{goal.description&&<p>{goal.description}</p>}{goal.tracker&&<section className="goal-tracked-by"><span>Tracked by</span><b>{goal.tracker.name}</b>{openLog&&<button onClick={()=>openLog(goal.tracker!.module)}>Log {goal.tracker.name}</button>}</section>}<div className="goal-live-progress">
<div>
<b>{Math.round(progress.percent)}%</b>
<span>Current progress</span>
</div>
<div>
<b>{progress.actual.toLocaleString()} {unit}</b>
<span>Recorded this {formatDisplayLabel(goal.rule?.period)}</span>
</div>
</div>{goal.rule&&<section className="goal-rule-live">
<span>CURRENT RULE</span>
<b>{targetLabel(goal.rule,unit)}</b>
<small>Effective from {new Date(goal.rule.effective_from+'T12:00').toLocaleDateString()}</small>
</section>}{goal.status==='active'&&<section className="goal-contribute">
<h3>Log a real contribution</h3>
<div>
<input type="number" inputMode="decimal" step="any" value={value} onChange={e=>setValue(e.target.value)} placeholder={`Value ${unit}`}/>
<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note"/>
<button disabled={busy||!Number.isFinite(Number(value))||value==='' } onClick={()=>act(()=>addGoalRecord(goal,Number(value),note))}>
<Plus/> Log</button>
</div>
</section>}<section className="goal-record-list">
<h3>Contribution history</h3>{goal.records.slice().sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at)).map(r=>
<div key={r.id}>{correcting?.id===r.id?<div className="record-correction">
<input type="number" inputMode="decimal" step="any" value={correctedValue} onChange={e=>setCorrectedValue(e.target.value)}/>
<input value={correctedNote} onChange={e=>setCorrectedNote(e.target.value)}/>
<button disabled={busy||correctedValue===''} onClick={()=>act(()=>updateGoalRecord(r,Number(correctedValue),correctedNote))}>Save</button>
<button onClick={()=>setCorrecting(null)}>Cancel</button>
</div>:<>
<span>
<b>{r.value} {unit}</b>
<small>{r.note||'Contribution'}{r.corrected_at?' · corrected':''}</small>
</span>
<time>{new Date(r.occurred_at).toLocaleString()}</time>
<span className="record-buttons">
<button onClick={()=>{setCorrecting(r);setCorrectedValue(String(r.value));setCorrectedNote(r.note??'')}}>Correct</button>
<button className="danger" onClick={()=>{if(confirm('Remove this contribution from progress?'))act(()=>deleteGoalRecord(r))}}>Remove</button>
</span>
</>}</div>)}{!goal.records.length&&<p>No contributions yet.</p>}</section>{goal.ruleHistory.length>1&&<section className="goal-record-list">
<h3>Rule history</h3>{goal.ruleHistory.map(rule=>
<div key={rule.id}>
<span>
<b>{targetLabel(rule,options.units.find(x=>x.key===rule.unit_key)?.symbol??rule.custom_unit??'')}</b>
<small>{rule.effective_to?'Previous rule':'Current rule'}</small>
</span>
<time>{rule.effective_from} → {rule.effective_to??'now'}</time>
</div>)}</section>}{goal.events.length>0&&<section className="goal-record-list growth-rings">
<h3>Growth Rings</h3>{goal.events.map(event=>
<div key={event.id}>
<span>
<b>{formatDisplayLabel(event.event_type)}</b>
</span>
<time>{new Date(event.occurred_at).toLocaleString()}</time>
</div>)}</section>}{error&&<p className="goal-error">{error}</p>}<div className="goal-actions">
<button onClick={() => setEditing('details')}>Edit Goal</button>{goal.status==='active'&&goal.rule&&<button onClick={() => setEditing('prune')}>Prune Goal</button>}{goal.status==='active'&&<button onClick={()=>act(()=>setGoalStatus(goal,'dormant'))}>
<Pause/> Make Dormant</button>}{goal.status==='dormant'&&<button onClick={()=>act(()=>setGoalStatus(goal,'active'))}>
<Play/> Awaken</button>}{!['completed','archived'].includes(goal.status)&&<button onClick={()=>act(()=>setGoalStatus(goal,'completed'))}>
<Check/> Complete</button>}{!['ended','archived'].includes(goal.status)&&<button onClick={()=>act(()=>setGoalStatus(goal,'ended'))}>
<Square/> End</button>}{!goal.records.length&&<button className="danger" onClick={()=>{if(confirm('Delete this empty Goal permanently?'))act(()=>deleteEmptyGoal(goal))}}>
<Trash2/> Delete</button>}</div>
</section>
</div>;
}

export default function GoalsModule({onFirstSetupComplete,initialTrackerId='',onInitialTrackerHandled,openLog}:{onFirstSetupComplete?:()=>Promise<void>|void;initialTrackerId?:string;onInitialTrackerHandled?:()=>void;openLog?:(module:string)=>void}={}){
  const[sessionChecked,setSessionChecked]=useState(false),[signedIn,setSignedIn]=useState(false),[goals,setGoals]=useState<GoalBundle[]>([]),[options,setOptions]=useState<Options>({areas:[],units:[],subcategories:[],trackers:[]}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[creating,setCreating]=useState(Boolean(initialTrackerId)),[selected,setSelected]=useState<GoalBundle|null>(null),[filter,setFilter]=useState<'primary'|'secondary'|'dormant'|'completed'|'ended'>('primary'),[view,setView]=useState<'goals'|'groves'>('goals');
  const load=async()=>{setLoading(true);setError('');try{const[o,g]=await Promise.all([loadGoalOptions(),listGoals()]);setOptions(o);setGoals(g);setSignedIn(true);}catch(e){setError(e instanceof Error?e.message:'Unable to load Goals')}finally{setLoading(false);setSessionChecked(true)}};
  useEffect(()=>{supabase.auth.getSession().then(x=>{if(x.data.session)load();else{setSessionChecked(true);setLoading(false)}});const{data}=supabase.auth.onAuthStateChange((_e,s)=>{setSignedIn(Boolean(s));if(s)load()});return()=>data.subscription.unsubscribe();},[]);
  const visible=useMemo(()=>goals.filter(g=>filter==='primary'||filter==='secondary'?g.status==='active'&&g.presentation_priority===filter:g.status===filter),[goals,filter]);
  if(!sessionChecked||loading)return <div className="page-wrap goals-loading">Loading Goals…</div>;
  if(!signedIn)return <div className="page-wrap">
<SignIn onDone={load}/>
</div>;
  return <div className="page-wrap">
<header className="page-head">
<div>
<p className="eyebrow">GOALS</p>
<h1>What you’re growing.</h1>
</div>{view==='goals'&&<button className="soft-button" onClick={()=>setCreating(true)}>
<Plus size={17}/> Plant Goal</button>}</header>{error&&<p className="goal-error">{error}</p>}<div className="goals-view-switch">
<button className={view==='goals'?'active':''} onClick={()=>setView('goals')}>Goals</button>
<button className={view==='groves'?'active':''} onClick={()=>setView('groves')}>Groves</button>
</div>{view==='groves'?<GrovesPanel goals={goals}/>:<>
<div className="goal-tabs goal-tabs-primary">{(['primary','secondary'] as const).map(x=>
<button className={filter===x?'active':''} onClick={()=>setFilter(x)} key={x}>{formatDisplayLabel(x)}</button>)}</div>
<div className="goal-tabs goal-tabs-secondary">{(['dormant','completed','ended'] as const).map(x=>
<button className={filter===x?'active':''} onClick={()=>setFilter(x)} key={x}>{formatDisplayLabel(x,{dormant:'Dormant Woods'})}</button>)}</div>
<div className="goals-list">{visible.map((goal,i)=>{const unit=options.units.find(x=>x.key===goal.rule?.unit_key)?.symbol??goal.rule?.custom_unit??'';const progress=goal.rule?goalProgress(goal.rule,goal.records,new Date(),1,goal.starts_on,goal.ends_on):{actual:0,percent:0};return <article className="goal-card" key={goal.id} onClick={()=>setSelected(goal)}>
<div className={`tree-token tree-${i%3}`}>
<i/>
<b/>
</div>
<div className="goal-info">
<span>{options.areas.find(x=>x.key===goal.area_key)?.name??formatDisplayLabel(goal.area_key)} · {formatDisplayLabel(goal.negotiability)}</span>
<h2>{goal.title}</h2>
<p>{goal.rule?targetLabel(goal.rule,unit):'No active rule'}</p>
<div className="goal-metrics">
<span>
<b>{Math.round(progress.percent)}%</b> current period</span>
<span>
<b>{progress.actual.toLocaleString()} {unit}</b> recorded</span>
<span>
<b>{formatDisplayLabel(goal.goal_kind)}</b> Goal</span>
</div>
<div className="goal-progress">
<i style={{width:`${progress.percent}%`}}/>
</div>
</div>
<button className="goal-open">
<ChevronRight/>
</button>
</article>})}{!visible.length&&<div className="empty-state">
<Leaf/>
<h2>No {formatDisplayLabel(filter,{dormant:'Dormant Woods'})} Goals</h2>
<p>{filter==='primary'?'Choose “Show on Home” when planting or editing a Goal.':'Nothing is stored here yet.'}</p>
</div>}</div>
</>}{creating&&<Editor options={options} initialTrackerId={initialTrackerId} first={!goals.length} close={()=>{setCreating(false);onInitialTrackerHandled?.()}} saved={async()=>{const first=!goals.length;setCreating(false);onInitialTrackerHandled?.();if(first&&onFirstSetupComplete)await onFirstSetupComplete();else await load()}}/>}{selected&&<Detail goal={selected} options={options} close={()=>setSelected(null)} changed={load} openLog={openLog}/>}</div>;
}
