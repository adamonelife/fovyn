import {useEffect,useState,type CSSProperties, type ReactNode} from 'react';
import {Plus,X} from 'lucide-react';
import {forestAssetFallback,getForestAsset,type ForestAsset} from './forestAssets';
import type {ForestAssignment} from './forestLayout';

export function useForestSceneAssets(environmentKey:string,assignments:ForestAssignment[]){
  const[background,setBackground]=useState<ForestAsset|null>(),[trees,setTrees]=useState<Record<string,ForestAsset>>({});
  const signature=assignments.map(item=>item.goal.id+':'+item.goal.tree_stage).join('|');
  useEffect(()=>{let current=true;setBackground(forestAssetFallback(environmentKey));setTrees(Object.fromEntries(assignments.flatMap(item=>{const asset=forestAssetFallback(item.goal.tree_asset_key);return asset?[[item.goal.id,asset]]:[]})));Promise.allSettled([getForestAsset(environmentKey),...assignments.map(item=>getForestAsset(item.goal.tree_asset_key))]).then(results=>{if(!current)return;const scene=results[0];if(scene.status==='fulfilled'&&scene.value)setBackground(scene.value);setTrees(Object.fromEntries(assignments.flatMap((item,index)=>{const result=results[index+1],asset=result?.status==='fulfilled'&&result.value?result.value:forestAssetFallback(item.goal.tree_asset_key);return asset?[[item.goal.id,asset]]:[]})))});return()=>{current=false}},[environmentKey,signature]);
  return{background,trees};
}

export function useForestCardState(selected?:string){useEffect(()=>{document.body.classList.toggle('forest-tree-card-open',Boolean(selected));return()=>document.body.classList.remove('forest-tree-card-open')},[selected])}

export function ForestTreeLayer({assignments,trees,variant,environment,onSelect,debug=false}:{assignments:ForestAssignment[];trees:Record<string,ForestAsset>;variant:'hero'|'overview';environment:string;onSelect:(id:string)=>void;debug?:boolean}){
  const className=variant==='hero'?'production-tree':'forest-overview-tree';
  return <>{assignments.map(({goal,slot})=>{const asset=trees[goal.id]??forestAssetFallback(goal.tree_asset_key);if(!asset)throw new Error(`Missing Tree asset ${goal.tree_asset_key}`);return <button key={goal.id} data-slot-id={slot.id} className={`${className} label-${slot.labelAnchor} ${goal.health_state.toLowerCase().replaceAll(' ','-')}`} style={{left:slot.x+'%',top:slot.y+'%','--slot-x':slot.x+'%','--tree-scale':String(slot.scale*asset.default_scale),'--ground-anchor':String(asset.ground_anchor_y),'--label-offset-x':`${slot.labelOffsetX??0}px`,'--label-offset-y':`${slot.labelOffsetY??5}px`,'--z':String(slot.zIndex)} as CSSProperties} onClick={()=>onSelect(goal.id)} aria-label={goal.title+', '+goal.tree_species}><span className="tree-asset-shell"><img src={asset.url} alt=""/><i/></span><label>{goal.title}<small>{environment==='nursery'?goal.nursery_label:goal.tree_species}</small></label>{debug&&<span className="forest-tree-debug"><b>{slot.id}</b><i className="tree-ground-point"/><i className="slot-anchor-point"/><i className="anchor-link"/><em>Tree {slot.x.toFixed(1)}, {slot.y.toFixed(1)} · Slot {slot.x.toFixed(1)}, {slot.y.toFixed(1)}</em></span>}</button>})}</>;
}

export function ForestTreeCard({assignment,variant,onClose,onViewGoal,onLog,children}:{assignment:ForestAssignment;variant:'hero'|'overview';onClose:()=>void;onViewGoal:()=>void;onLog:()=>void;children?:ReactNode}){
  const{goal,slot}=assignment,base=variant==='hero'?'forest-tree-card':'forest-overview-card';
  return <article className={`${base} contextual ${slot.x>58?'opens-left':'opens-right'}`} style={{'--card-x':slot.x+'%','--card-y':slot.y+'%'} as CSSProperties}><button aria-label="Close Tree details" onClick={onClose}><X/></button><span>{goal.area_key.toUpperCase()}</span>{variant==='hero'?<h3>{goal.title}</h3>:<h2>{goal.title}</h2>}<p>{goal.tree_species} · {goal.health_state}</p>{children??<small>{Math.round(goal.growth_consistency)}% Growth Consistency</small>}<div><button onClick={onViewGoal}>View Goal</button><button onClick={onLog}><Plus/> Log</button></div></article>;
}
