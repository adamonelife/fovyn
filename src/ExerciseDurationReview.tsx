import{useState}from'react';
import{Clock3,Save}from'lucide-react';
import{saveExerciseActiveDuration,type HealthExercise}from'./healthRepository';

function label(item:HealthExercise){return item.title||item.exercise_label||'Exercise'}
function minutes(value:number|null|undefined){return Math.max(0,Number(value??0))}
function Editor({item,onSaved}:{item:HealthExercise;onSaved:()=>Promise<void>}){
 const[value,setValue]=useState(minutes(item.active_duration_minutes||item.duration_minutes).toFixed(2));
 const[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async()=>{const n=Number(value);if(!Number.isFinite(n)||n<=0||n>Number(item.duration_minutes)+0.01){setError('Active time must be positive and no longer than elapsed time.');return}setBusy(true);setError('');try{await saveExerciseActiveDuration(item.id,n);await onSaved()}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 return <article className="exercise-duration-row"><div><strong>{label(item)}</strong><small>{Math.round(minutes(item.active_duration_minutes||item.duration_minutes))} active · {Math.round(Number(item.duration_minutes))} elapsed minutes · {item.active_duration_source==='manual'?'corrected manually':item.active_duration_source==='health_connect'?'pause data from Health Connect':'no pause data supplied'}</small></div><div className="exercise-duration-editor"><label>Active minutes<input type="number" inputMode="decimal" min="0.01" max={item.duration_minutes} step="0.01" value={value} onChange={e=>setValue(e.target.value)} aria-label={`Active minutes for ${label(item)}`}/></label><button className="save-record" disabled={busy} onClick={()=>void save()}><Save size={16}/>{busy?'Saving…':'Save'}</button></div>{error&&<small role="alert" className="goal-error">{error}</small>}</article>
}
export default function ExerciseDurationReview({items,onSaved}:{items:HealthExercise[];onSaved:()=>Promise<void>}){
 if(!items.length)return null;
 return <details className="exercise-duration-review"><summary><Clock3 size={17}/> Exercise duration corrections</summary><p>Elapsed time preserves the Health Connect session. Active time excludes pauses and controls exercise minutes and cycling-equivalent steps.</p><div>{items.map(item=><Editor key={item.id} item={item} onSaved={onSaved}/>)}</div></details>
}
