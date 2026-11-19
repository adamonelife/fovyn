import{useEffect,useMemo,useState}from'react';
import{Bike,Save,X}from'lucide-react';
import{loadCyclingDistances,loadPendingCyclingDistances,saveCyclingDistance,type HealthExercise}from'./healthRepository';
import{cyclingDistanceLabel,validCyclingDistance}from'./cyclingDistance';
import'./health.css';
type Props={mode:'prompt'|'weekly';week?:string};
const dismissedKey='fovyn-cycling-distance-dismissed';
function dismissed(){try{return new Set<string>(JSON.parse(sessionStorage.getItem(dismissedKey)??'[]'))}catch{return new Set<string>()}}
function when(item:HealthExercise){return new Intl.DateTimeFormat(undefined,{timeZone:'Asia/Makassar',dateStyle:'medium'}).format(new Date(item.started_at))}
function description(item:HealthExercise){return `${cyclingDistanceLabel(item.exercise_type,item.exercise_label)} · ${Math.round(Number(item.duration_minutes))} minutes`}
function DistanceEditor({item,onSaved,compact=false}:{item:HealthExercise;onSaved:()=>Promise<void>;compact?:boolean}){
 const[value,setValue]=useState(item.distance_needs_input?'':item.distance_km?.toString()??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>setValue(item.distance_needs_input?'':item.distance_km?.toString()??''),[item.id,item.distance_needs_input,item.distance_km]);
 const save=async()=>{if(!validCyclingDistance(value)){setError('Enter the kilometres shown on the bike.');return}setBusy(true);setError('');try{await saveCyclingDistance(item.id,Number(value));await onSaved()}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 return <div className={compact?'cycling-distance-inline compact':'cycling-distance-inline'}><label>Distance (km)<input type="number" inputMode="decimal" min="0.001" max="1000" step="0.01" placeholder="Enter distance" value={value} onChange={e=>setValue(e.target.value)} aria-label={`Distance in kilometres for ${item.exercise_label}`}/></label><button className="save-record" disabled={busy||!validCyclingDistance(value)} onClick={()=>void save()}><Save size={17}/>{busy?'Saving…':'Save distance'}</button>{error&&<small role="alert" className="goal-error">{error}</small>}</div>
}
export default function CyclingDistancePrompt({mode,week}:Props){
 const[items,setItems]=useState<HealthExercise[]>([]),[loading,setLoading]=useState(true),[dismissedIds,setDismissedIds]=useState(dismissed);
 const load=async()=>{try{setItems(mode==='prompt'?await loadPendingCyclingDistances():await loadCyclingDistances(week))}finally{setLoading(false)}};
 useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener('fovyn-health-distance-saved',refresh);window.addEventListener('focus',refresh);return()=>{window.removeEventListener('fovyn-health-distance-saved',refresh);window.removeEventListener('focus',refresh)}},[mode,week]);
 const pending=useMemo(()=>items.filter(x=>x.distance_needs_input),[items]);
 if(loading||!items.length)return null;
 if(mode==='prompt'){
   const item=pending.find(x=>!dismissedIds.has(x.id));if(!item)return null;
   const notNow=()=>{const next=new Set(dismissedIds);next.add(item.id);setDismissedIds(next);sessionStorage.setItem(dismissedKey,JSON.stringify([...next]))};
   return <aside className="cycling-distance-prompt" role="region" aria-label="Cycling distance needed"><div className="cycling-distance-title"><Bike/><div><strong>Cycling workout detected</strong><small>{when(item)} · {description(item)}</small></div><button aria-label="Not now" onClick={notNow}><X/></button></div><p>How far did you cycle?</p><DistanceEditor item={item} onSaved={load} compact/><button className="cycling-not-now" onClick={notNow}>Not now</button></aside>
 }
 return <section className="cycling-distance-weekly" aria-label="Cycling distances">{pending.length>0&&<><header><Bike/><div><h2>Cycling — Distance Needed</h2><p>Add the distance shown on the bike. The imported workout stays unchanged.</p></div></header><div className="cycling-distance-list">{pending.map(item=><article key={item.id}><div><strong>{description(item)}</strong><small>{when(item)}</small></div><DistanceEditor item={item} onSaved={load}/></article>)}</div></>}{items.some(x=>!x.distance_needs_input&&x.distance_km!=null)&&<details className="cycling-distance-history"><summary>Recorded cycling distances</summary>{items.filter(x=>!x.distance_needs_input&&x.distance_km!=null).map(item=><article key={item.id}><div><strong>{description(item)}</strong><small>{when(item)} · {Number(item.distance_km).toLocaleString(undefined,{maximumFractionDigits:3})} km · {item.distance_source==='manual'?'Entered manually':'Health Connect'}</small>{item.distance_conflict_km!=null&&<small className="cycling-distance-conflict">Health Connect later reported {Number(item.distance_conflict_km)} km. Your manual value was kept.</small>}</div><DistanceEditor item={item} onSaved={load}/></article>)}</details>}</section>
}
