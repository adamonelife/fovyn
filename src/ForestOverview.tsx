import {useEffect,useMemo,useState} from 'react';
import {ChevronLeft,X} from 'lucide-react';
import {forestEnvironmentManifest} from './forestManifest';
import {ForestTreeCard,ForestTreeLabels,ForestTreeLayer,useForestInteraction,useForestSceneAssets} from './ForestSceneEngine';
import {ForestEnvironmentScene} from './ForestEnvironmentScene';
import {forestAssignments,forestEnvironmentSlots,nurseryAssignments} from './forestLayout';
import type {HomeClearing,HomeGoal} from './homeRepository';
import {useForestViewportProfile,usePublishedForestSlots,usePublishedForestView} from './forestComposerRepository';

const assetKey=(key:string)=>'forest.environment.'+(key.startsWith('area-')?'area.'+key.slice(5):key.replaceAll('-','_'));

export default function ForestOverview({goals,currentClearing,close,onViewGoals,onLog}:{goals:HomeGoal[];currentClearing:HomeClearing|null;close:()=>void;onViewGoals:()=>void;onLog:()=>void}){
  const [environment,setEnvironment]=useState('clearing');
  const interaction=useForestInteraction();
  const [nurseryPage,setNurseryPage]=useState(0);
  const [error,setError]=useState('');
  const focusedGoalIds=currentClearing?.focusedGoalIds??[],clearingName=currentClearing?.name??'';
  const profile=useForestViewportProfile(),slots=usePublishedForestSlots(environment,forestEnvironmentSlots[environment]??[],profile),view=usePublishedForestView(environment,profile);
  const visible=useMemo(()=>{
    if(environment==='clearing'){
      const eligible=goals.filter(goal=>goal.status==='active'&&goal.tree_stage>=4);
      return focusedGoalIds.length?eligible.filter(goal=>focusedGoalIds.includes(goal.id)):eligible.filter(goal=>goal.presentation_priority==='primary');
    }
    if(environment==='nursery')return nurseryAssignments(goals,slots).map(item=>item.goal);
    if(environment==='dormant-woods')return goals.filter(goal=>goal.status==='dormant');
    if(environment==='heartwood')return goals.filter(goal=>goal.status==='completed');
    const area=environment.replace('area-','');
    return goals.filter(goal=>goal.status==='active'&&goal.tree_stage>=4&&goal.area_key.toLowerCase()===area);
  },[environment,goals,focusedGoalIds,slots]);
  const nursery=useMemo(()=>nurseryAssignments(goals,slots),[goals,slots]);
  const allAssignments=environment==='nursery'?nursery:forestAssignments(environment,visible,slots);
  const sceneAssignments=allAssignments.filter(item=>item.page===nurseryPage);
  const{background,trees}=useForestSceneAssets(assetKey(environment),sceneAssignments);
  useEffect(()=>{interaction.close();setNurseryPage(0)},[environment]);
  const selectedGoal=visible.find(goal=>goal.id===interaction.active);
  const label=environment==='clearing'&&clearingName?clearingName:forestEnvironmentManifest.find(([key])=>key===environment)?.[1]??environment;
  return <div className="forest-overview-shade" role="dialog" aria-modal="true" aria-label="Forest Overview">
    <section className="forest-overview">
      <header><button onClick={close} aria-label="Close Forest Overview"><ChevronLeft/></button><div><span>MY FOREST</span><h1>{label}</h1></div><button onClick={close} aria-label="Close"><X/></button></header>
      <nav aria-label="Forest environments">{forestEnvironmentManifest.map(([key,name])=><button key={key} className={environment===key?'active':''} onClick={()=>setEnvironment(key)}>{name}</button>)}</nav>
      <div className={'forest-overview-scene '+(environment==='nursery'?'dedicated-nursery':'')}>
        {background&&<ForestEnvironmentScene asset={background} positionX={view.positionX} positionY={view.positionY} zoom={view.zoom} scrollable={profile==='mobile'&&view.scrollable} className="forest-overview-projected-scene" overlay="linear-gradient(180deg,rgba(3,24,18,.12),rgba(3,24,18,.42))">
          <div className="forest-world-layer"><ForestTreeLayer assignments={sceneAssignments} trees={trees} variant="overview" environment={environment} onSelect={interaction.select} onHover={interaction.hover} onLeave={interaction.leave}/></div>
          <div className="forest-interaction-layer"><ForestTreeLabels assignments={sceneAssignments} environment={environment} onSelect={interaction.select} onHover={interaction.hover} onLeave={interaction.leave}/>{selectedGoal&&(()=>{const assignment=sceneAssignments.find(item=>item.goal.id===selectedGoal.id);return assignment?<ForestTreeCard assignment={assignment} variant="overview" onClose={interaction.close} onViewGoal={onViewGoals} onLog={onLog} onMouseEnter={()=>interaction.hover(selectedGoal.id)} onMouseLeave={interaction.leave}>{environment==='nursery'?<div className="nursery-progress"><b>{selectedGoal.nursery_label}</b><i><span style={{width:selectedGoal.nursery_progress+'%'}}/></i><small>{selectedGoal.nursery_next}</small></div>:undefined}</ForestTreeCard>:null})()}</div>
        </ForestEnvironmentScene>}
        <div className="forest-overview-status"><b>{visible.length}</b><span>{visible.length===1?'Goal Tree':'Goal Trees'}</span></div>
        {error&&<div className="forest-overview-empty"><h2>{error}</h2></div>}
        {!error&&visible.length===0&&<div className="forest-overview-empty"><h2>{environment==='nursery'?'No new Goal Trees':'This part of your Forest is quiet.'}</h2><button onClick={onViewGoals}>{environment==='nursery'?'Plant a Goal':'View Goals'}</button></div>}
        {allAssignments.length>slots.length&&<div className="nursery-pages"><button disabled={nurseryPage===0} onClick={()=>setNurseryPage(page=>page-1)}>Previous</button><span>{nurseryPage+1} / {Math.ceil(allAssignments.length/slots.length)}</span><button disabled={nurseryPage>=Math.max(...allAssignments.map(item=>item.page))} onClick={()=>setNurseryPage(page=>page+1)}>Next</button></div>}
      </div>
    </section>
  </div>;
}
