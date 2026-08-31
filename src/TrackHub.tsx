import {useState} from 'react';
import AllLogModule from './AllLogModule';
import ActivityModule from './ActivityModule';
import HabitsModule from './HabitsModule';
import MetricsModule from './MetricsModule';
import MoneyModule from './MoneyModule';
import NotesModule from './NotesModule';
import NutritionModule from './NutritionModule';
import SleepModule from './SleepModule';
import TrackModule from './TrackModule';
import WorkoutModule from './WorkoutModule';

type View='all'|'habits'|'metrics'|'activity'|'nutrition'|'money'|'sleep'|'notes'|'manage';

export default function TrackHub({onFirstSetupComplete}:{onFirstSetupComplete?:()=>Promise<void>|void}={}){
  const[view,setView]=useState<View>(onFirstSetupComplete?'manage':'all');
  const[workout,setWorkout]=useState(false);
  const filters=<div className="track-hub-switch">
    <button className={view==='all'?'active':''} onClick={()=>setView('all')}>All</button>
    <button className={view==='habits'?'active':''} onClick={()=>setView('habits')}>Habits</button>
    <button className={view==='metrics'?'active':''} onClick={()=>setView('metrics')}>Metrics</button>
    <button className={view==='activity'?'active':''} onClick={()=>setView('activity')}>Activity</button>
    <button className={view==='nutrition'?'active':''} onClick={()=>setView('nutrition')}>Nutrition</button>
    <button className={view==='money'?'active':''} onClick={()=>setView('money')}>Money</button>
    <button className={view==='sleep'?'active':''} onClick={()=>setView('sleep')}>Sleep</button>
    <button className={view==='notes'?'active':''} onClick={()=>setView('notes')}>Notes</button>
    <button onClick={()=>setWorkout(true)}>Training</button>
    <button className={view==='manage'?'active':''} onClick={()=>setView('manage')}>+ Add & Manage</button>
  </div>;
  const content=view==='habits'?<HabitsModule/>:view==='metrics'?<MetricsModule/>:view==='activity'?<ActivityModule manage={()=>setView('manage')}/>:view==='nutrition'?<NutritionModule/>:view==='money'?<MoneyModule/>:view==='sleep'?<SleepModule/>:view==='notes'?<NotesModule/>:<TrackModule onFirstSetupComplete={onFirstSetupComplete}/>;
  return <>
    {view==='all'?<AllLogModule filters={filters} manage={()=>setView('manage')}/>:<>{filters}{content}</>}
    {workout&&<WorkoutModule close={()=>setWorkout(false)} onSaved={()=>setWorkout(false)}/>}
  </>;
}
