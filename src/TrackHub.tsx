import {useState} from 'react';
import AllLogModule from './AllLogModule';
import ActivityModule from './ActivityModule';
import HabitsModule from './HabitsModule';
import HobbiesModule from './HobbiesModule';
import MetricsModule from './MetricsModule';
import MoneyModule from './MoneyModule';
import NotesModule from './NotesModule';
import NutritionModule from './NutritionModule';
import RoutinesModule from './RoutinesModule';
import SleepModule from './SleepModule';
import TrackModule from './TrackModule';
import WorkoutModule from './WorkoutModule';

type View='all'|'habits'|'routines'|'metrics'|'activity'|'nutrition'|'money'|'hobbies'|'sleep'|'notes'|'manage';

export default function TrackHub({onFirstSetupComplete,initialView='all'}:{onFirstSetupComplete?:()=>Promise<void>|void;initialView?:'all'|'routines'}={}){
  const[view,setView]=useState<View>(onFirstSetupComplete?'manage':initialView);
  const[workout,setWorkout]=useState(false);
  const filters=<div className="track-hub-switch">
    <button className={view==='all'?'active':''} onClick={()=>setView('all')}>All</button>
    <button className={view==='habits'?'active':''} onClick={()=>setView('habits')}>Habits</button>
    <button className={view==='routines'?'active':''} onClick={()=>setView('routines')}>Routines</button>
    <button className={view==='metrics'?'active':''} onClick={()=>setView('metrics')}>Metrics</button>
    <button className={view==='activity'?'active':''} onClick={()=>setView('activity')}>Activity</button>
    <button className={view==='nutrition'?'active':''} onClick={()=>setView('nutrition')}>Nutrition</button>
    <button className={view==='money'?'active':''} onClick={()=>setView('money')}>Money</button>
    <button className={view==='hobbies'?'active':''} onClick={()=>setView('hobbies')}>Hobbies</button>
    <button className={view==='sleep'?'active':''} onClick={()=>setView('sleep')}>Sleep</button>
    <button className={view==='notes'?'active':''} onClick={()=>setView('notes')}>Notes</button>
    <button onClick={()=>setWorkout(true)}>Training</button>
    <button className={view==='manage'?'active':''} onClick={()=>setView('manage')}>+ Add & Manage</button>
  </div>;
  const content=view==='habits'?<HabitsModule/>:view==='routines'?<RoutinesModule/>:view==='metrics'?<MetricsModule/>:view==='activity'?<ActivityModule manage={()=>setView('manage')}/>:view==='nutrition'?<NutritionModule/>:view==='money'?<MoneyModule/>:view==='hobbies'?<HobbiesModule/>:view==='sleep'?<SleepModule/>:view==='notes'?<NotesModule/>:<TrackModule onFirstSetupComplete={onFirstSetupComplete} onRoutines={()=>setView('routines')}/>;
  return <>
    {view==='all'?<AllLogModule filters={filters} manage={()=>setView('manage')}/>:<>{filters}{content}</>}
    {workout&&<WorkoutModule close={()=>setWorkout(false)} onSaved={()=>setWorkout(false)}/>}
  </>;
}
