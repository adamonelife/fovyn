import {useState} from 'react';
import AllLogModule from './AllLogModule';
import ActivityModule from './ActivityModule';
import HabitsModule from './HabitsModule';
import HobbiesModule from './HobbiesModule';
import MetricsModule from './MetricsModule';
import MoneyModule from './MoneyModule';
import NotesModule from './NotesModule';
import NutritionModule from './NutritionModule';
import RecoveryModule from './RecoveryModule';
import RoutinesModule from './RoutinesModule';
import SleepModule from './SleepModule';
import TrackModule from './TrackModule';
import WorkoutModule from './WorkoutModule';
import LogShell,{type LogView}from'./LogShell';

export default function TrackHub({onFirstSetupComplete,initialView='all'}:{onFirstSetupComplete?:()=>Promise<void>|void;initialView?:'all'|'routines'}={}){
  const[view,setView]=useState<LogView>(onFirstSetupComplete?'manage':initialView);
  const[workout,setWorkout]=useState(false);
  const[query,setQuery]=useState('');
  const content=view==='habits'?<HabitsModule query={query}/>:view==='routines'?<RoutinesModule query={query}/>:view==='metrics'?<MetricsModule query={query}/>:view==='activity'?<ActivityModule manage={()=>setView('manage')}/>:view==='nutrition'?<NutritionModule query={query}/>:view==='money'?<MoneyModule/>:view==='hobbies'?<HobbiesModule/>:view==='sleep'?<SleepModule/>:view==='recovery'?<RecoveryModule query={query} manage={()=>setView('manage')}/>:view==='notes'?<NotesModule/>:<div className="manage-shell"><TrackModule onFirstSetupComplete={onFirstSetupComplete} onRoutines={()=>setView('routines')}/></div>;
  return <>
    <LogShell view={view} select={next=>{setView(next);setQuery('')}} openTraining={()=>setWorkout(true)} query={query} setQuery={setQuery}>{view==='all'?<AllLogModule manage={()=>setView('manage')} query={query}/>:content}</LogShell>
    {workout&&<WorkoutModule close={()=>setWorkout(false)} onSaved={()=>setWorkout(false)}/>}
  </>;
}
