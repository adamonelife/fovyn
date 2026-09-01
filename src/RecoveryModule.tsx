import{useEffect,useMemo,useState}from'react';
import{HeartPulse,Plus,X,type LucideIcon}from'lucide-react';
import{addMetricRecord}from'./metricsRepository';
import{loadTrackerCategory,type TrackerCategory,type TrackerCategoryData}from'./recoveryRepository';
import type{Tracker}from'./trackerRepository';
import{LogEmptyState,LogItemCard,LogSection}from'./ui';

const localNow=()=>{const now=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return now.toISOString().slice(0,16)};
function Recorder({tracker,unit,close,saved}:{tracker:Tracker;unit:string;close:()=>void;saved:()=>void}){
  const[value,setValue]=useState(''),[occurred,setOccurred]=useState(localNow()),[note,setNote]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  return <div className="sheet-shade" onMouseDown={close}><section className="metric-recorder" onMouseDown={event=>event.stopPropagation()}><button className="sheet-close" onClick={close} aria-label="Close"><X/></button><p className="eyebrow">LOG</p><h2>{tracker.name}</h2><label>Value<div className="metric-value"><input autoFocus type="number" inputMode="decimal" step="any" value={value} onChange={event=>setValue(event.target.value)}/><span>{unit}</span></div></label><label>When<input type="datetime-local" value={occurred} onChange={event=>setOccurred(event.target.value)}/></label><label>Note (optional)<textarea value={note} onChange={event=>setNote(event.target.value)}/></label>{error&&<p className="goal-error">{error}</p>}<button className="save-record" disabled={busy||value===''||!Number.isFinite(Number(value))} onClick={async()=>{setBusy(true);try{await addMetricRecord(tracker,Number(value),new Date(occurred).toISOString(),note);saved()}catch(reason){setError(reason instanceof Error?reason.message:'We couldn’t save that entry. Please try again.')}finally{setBusy(false)}}}>{busy?'Saving…':'Log'}</button></section></div>;
}

export function TrackerCategoryModule({module,label,emptyDetail,Icon,query='',manage}:{module:TrackerCategory;label:string;emptyDetail:string;Icon:LucideIcon;query?:string;manage:()=>void}){
  const[data,setData]=useState<TrackerCategoryData>({trackers:[],records:[],units:[]}),[selected,setSelected]=useState<Tracker>(),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=async()=>{setLoading(true);try{setData(await loadTrackerCategory(module,label));setError('')}catch(reason){setError(reason instanceof Error?reason.message:`Unable to load ${label}`)}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const visible=useMemo(()=>data.trackers.filter(tracker=>tracker.name.toLowerCase().includes(query.trim().toLowerCase())),[data.trackers,query]);
  const unit=(tracker:Tracker)=>data.units.find(candidate=>candidate.key===tracker.unit_key)?.symbol??tracker.custom_unit??'';
  if(loading)return <div className="page-wrap tracker-loading">Loading {label}…</div>;
  return <div className="page-wrap recovery-v1">{error&&<p className="goal-error">{error}</p>}<LogSection title="Available to log">{visible.map(tracker=>{const latest=data.records.find(record=>record.tracker_id===tracker.id);return <LogItemCard key={tracker.id} icon={<Icon/>} meta={label} title={tracker.name} detail={latest?`${latest.value} ${unit(tracker)} · ${new Date(latest.occurred_at).toLocaleDateString()}`:`${unit(tracker)||'Value'} · Not logged yet`} action={<span className="row-log">Log</span>} onClick={()=>setSelected(tracker)}/>})}{!visible.length&&<LogEmptyState icon={<Icon/>} title={query?'No matching item':'Nothing configured yet'} detail={query?undefined:emptyDetail}/>}</LogSection><button className="log-manage" onClick={manage}><Plus/> Add / Manage</button>{selected&&<Recorder tracker={selected} unit={unit(selected)} close={()=>setSelected(undefined)} saved={()=>{setSelected(undefined);load()}}/>}</div>;
}

export default function RecoveryModule(props:{query?:string;manage:()=>void}){return <TrackerCategoryModule {...props} module="medication" label="Supplements & Recovery" emptyDetail="Add a supplement, medication or recovery item under + Add & Manage." Icon={HeartPulse}/>}
