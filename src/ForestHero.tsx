import {useMemo,useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {ForestTreeCard,ForestTreeLayer,useForestCardState,useForestSceneAssets} from './ForestSceneEngine';
import {forestAssignments,nurseryAssignments} from './forestLayout';
import type {HomeClearing,HomeGoal} from './homeRepository';

const environmentKey=(name:string)=>'forest.environment.'+(['health','mind','self','people','work','wealth'].includes(name)?'area.'+name:name.replaceAll('-','_'));

export default function ForestHero({goals,currentClearing,onViewGoal,onLog}:{goals:HomeGoal[];currentClearing:HomeClearing|null;onViewGoal:()=>void;onLog:()=>void}){
  const nursery=useMemo(()=>nurseryAssignments(goals),[goals]);
  const clearing=useMemo(()=>{const active=goals.filter(goal=>goal.status==='active'&&goal.tree_stage>=4),focused=currentClearing?active.filter(goal=>currentClearing.focusedGoalIds.includes(goal.id)):[];return(focused.length?focused:active.filter(goal=>goal.presentation_priority==='primary')).slice(0,4)},[goals,currentClearing]);
  const environment=clearing.length?'clearing':'nursery';
  const assignments=environment==='nursery'?nursery.filter(item=>item.page===0):forestAssignments('clearing',clearing).filter(item=>item.page===0);
  const{background,trees}=useForestSceneAssets(environmentKey(environment),assignments);
  const[selected,setSelected]=useState<string>();useForestCardState(selected);
  const selectedItem=assignments.find(item=>item.goal.id===selected),clearingActive=Boolean(currentClearing&&environment==='clearing');
  return <section className={'production-forest-hero forest-'+environment+(clearingActive?' current-clearing':'')} style={background?{backgroundImage:'linear-gradient(90deg,rgba(5,30,23,.66),rgba(5,30,23,.05) 55%,rgba(5,30,23,.2)),url("'+background.url+'")'}:undefined}>
    <div className="production-forest-copy"><span>{environment==='nursery'?'NURSERY':clearingActive?currentClearing?.name.toUpperCase():'THE CLEARING'}</span><h2>{environment==='nursery'?(nursery.length?nursery.length+' young Goal Tree'+(nursery.length===1?'':'s'):'Plant your first Goal'):clearingActive?assignments.length+' focused Goal'+(assignments.length===1?'':'s')+' in your Current Clearing.':assignments.length+' Primary Goal'+(assignments.length===1?'':'s')+' in focus.'}</h2>{clearingActive&&currentClearing?.intention?<small>{currentClearing.intention}</small>:null}</div>
    <div className="production-trees"><ForestTreeLayer assignments={assignments} trees={trees} variant="hero" environment={environment} onSelect={setSelected}/></div>
    {selectedItem&&<ForestTreeCard assignment={selectedItem} variant="hero" onClose={()=>setSelected(undefined)} onViewGoal={onViewGoal} onLog={onLog}/>}
    <button className="forest-overview-link" onClick={onViewGoal}>{environment==='nursery'?'View Nursery':'Forest Overview'} <ChevronRight/></button>
  </section>;
}
