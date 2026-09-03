import {useEffect,useState,type CSSProperties, type ReactNode} from 'react';
import {Plus,X} from 'lucide-react';
import {getForestAsset,type ForestAsset} from './forestAssets';
import type {ForestAssignment} from './forestLayout';

export function useForestSceneAssets(environmentKey:string,assignments:ForestAssignment[]){
  const[background,setBackground]=useState<ForestAsset|null>(),[trees,setTrees]=useState<Record<string,ForestAsset>>({});
  const signature=assignments.map(item=>item.goal.id+':'+item.goal.tree_stage).join('|');
  useEffect(()=>{let current=true;Promise.all([getForestAsset(environmentKey),...assignments.map(item=>getForestAsset(item.goal.tree_asset_key))]).then(([scene,...assets])=>{if(!current)return;setBackground(scene);setTrees(Object.fromEntries(assignments.flatMap((item,index)=>assets[index]?[[item.goal.id,assets[index] as ForestAsset]]:[])))});return()=>{current=false}},[environmentKey,signature]);
  return{background,trees};
}

export function useForestCardState(selected?:string){useEffect(()=>{document.body.classList.toggle('forest-tree-card-open',Boolean(selected));return()=>document.body.classList.remove('forest-tree-card-open')},[selected])}

export function ForestTreeLayer({assignments,trees,variant,environment,onSelect}:{assignments:ForestAssignment[];trees:Record<string,ForestAsset>;variant:'hero'|'overview';environment:string;onSelect:(id:string)=>void}){
  const className=variant==='hero'?'production-tree':'forest-overview-tree';
  return <>{assignments.map(({goal,slot})=>{const asset=trees[goal.id];if(!asset)return null;return <button key={goal.id} data-slot-id={slot.id} className={`${className} label-${slot.labelAnchor} ${goal.health_state.toLowerCase().replaceAll(' ','-')}`} style={{left:slot.x+'%',top:slot.y+'%','--slot-x':slot.x+'%','--tree-scale':String(slot.scale*asset.default_scale),'--ground-anchor':String(asset.ground_anchor_y),'--z':String(slot.zIndex)} as CSSProperties} onClick={()=>onSelect(goal.id)} aria-label={goal.title+', '+goal.tree_species}><span><img src={asset.url} alt=""/><i/></span><label>{goal.title}<small>{environment==='nursery'?goal.nursery_label:goal.tree_species}</small></label></button>})}</>;
}

export function ForestTreeCard({assignment,variant,onClose,onViewGoal,onLog,children}:{assignment:ForestAssignment;variant:'hero'|'overview';onClose:()=>void;onViewGoal:()=>void;onLog:()=>void;children?:ReactNode}){
  const{goal,slot}=assignment,base=variant==='hero'?'forest-tree-card':'forest-overview-card';
  return <article className={`${base} contextual ${slot.x>58?'opens-left':'opens-right'}`} style={{'--card-x':slot.x+'%','--card-y':slot.y+'%'} as CSSProperties}><button aria-label="Close Tree details" onClick={onClose}><X/></button><span>{goal.area_key.toUpperCase()}</span>{variant==='hero'?<h3>{goal.title}</h3>:<h2>{goal.title}</h2>}<p>{goal.tree_species} · {goal.health_state}</p>{children??<small>{Math.round(goal.growth_consistency)}% Growth Consistency</small>}<div><button onClick={onViewGoal}>View Goal</button><button onClick={onLog}><Plus/> Log</button></div></article>;
}
