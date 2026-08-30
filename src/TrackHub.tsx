import {useState} from 'react';
import AllLogModule from './AllLogModule';
import HabitsModule from './HabitsModule';
import MetricsModule from './MetricsModule';
import NotesModule from './NotesModule';
import TrackModule from './TrackModule';
import WorkoutModule from './WorkoutModule';

type View='all'|'habits'|'metrics'|'notes'|'manage';
export default function TrackHub(){const[view,setView]=useState<View>('all'),[workout,setWorkout]=useState(false);return <><div className="track-hub-switch"><button className={view==='all'?'active':''} onClick={()=>setView('all')}>All</button><button className={view==='habits'?'active':''} onClick={()=>setView('habits')}>Habits</button><button className={view==='metrics'?'active':''} onClick={()=>setView('metrics')}>Metrics</button><button className={view==='notes'?'active':''} onClick={()=>setView('notes')}>Notes</button><button onClick={()=>setWorkout(true)}>Training</button><button className={view==='manage'?'active':''} onClick={()=>setView('manage')}>+ Add & Manage</button></div>{view==='all'?<AllLogModule/>:view==='habits'?<HabitsModule/>:view==='metrics'?<MetricsModule/>:view==='notes'?<NotesModule/>:<TrackModule/>}{workout&&<WorkoutModule close={()=>setWorkout(false)} onSaved={()=>setWorkout(false)}/>}</>}
