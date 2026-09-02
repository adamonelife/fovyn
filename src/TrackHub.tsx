import {useEffect,useState} from 'react';
import AllLogModule from './AllLogModule';
import ActivityModule from './ActivityModule';
import AlcoholModule from './AlcoholModule';
import HabitsModule from './HabitsModule';
import HobbiesModule from './HobbiesModule';
import MetricsModule from './MetricsModule';
import MoneyModule from './MoneyModule';
import NotesModule from './NotesModule';
import NutritionModule from './NutritionModule';
import RecoveryModule from './RecoveryModule';
import RoutinesModule from './RoutinesModule';
import SleepModule from './SleepModule';
import SocialModule from './SocialModule';
import TrackModule from './TrackModule';
import WorkoutModule from './WorkoutModule';
import LogShell,{type LogView}from'./LogShell';

export default function TrackHub({onFirstSetupComplete,initialView='all',quickLogSignal=0}:{onFirstSetupComplete?:()=>Promise<void>|void;initialView?:'all'|'routines';quickLogSignal?:number}={}){
  const[view,setView]=useState<LogView>(onFirstSetupComplete?'manage':initialView);
  const[workout,setWorkout]=useState(false);
  const[query,setQuery]=useState('');
  useEffect(()=>{if(quickLogSignal>0){setView('all');setQuery('')}},[quickLogSignal]);
  const content=view==='habits'?<HabitsModule query={query}/>:view==='routines'?<RoutinesModule query={query}/>:view==='metrics'?<MetricsModule query={query}/>:view==='activity'?<ActivityModule query={query} manage={()=>setView('manage')}/>:view==='nutrition'?<NutritionModule query={query}/>:view==='money'?<MoneyModule query={query}/>:view==='hobbies'?<HobbiesModule query={query}/>:view==='social'?<SocialModule query={query} manage={()=>setView('manage')}/>:view==='alcohol'?<AlcoholModule query={query} manage={()=>setView('manage')}/>:view==='sleep'?<SleepModule query={query}/>:view==='recovery'?<RecoveryModule query={query} manage={()=>setView('manage')}/>:view==='notes'?<NotesModule query={query}/>:<div className="manage-shell"><TrackModule onFirstSetupComplete={onFirstSetupComplete} onRoutines={()=>setView('routines')}/></div>;
  return <>
    <LogShell view={view} select={next=>{setView(next);setQuery('')}} openTraining={()=>setWorkout(true)} query={query} setQuery={setQuery}>{view==='all'?<AllLogModule manage={()=>setView('manage')} query={query} quickLogSignal={quickLogSignal}/>:content}</LogShell>
    {workout&&<WorkoutModule close={()=>setWorkout(false)} onSaved={()=>setWorkout(false)}/>}
  </>;
}
