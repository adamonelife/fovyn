import {useEffect,useRef,useState,type CSSProperties, type ReactNode} from 'react';
import {Plus,X} from 'lucide-react';
import {forestAssetFallback,getForestAsset,type ForestAsset} from './forestAssets';
import {forestLabelPlacements,resolvedCardDirection,type ForestAssignment} from './forestLayout';

export function useForestSceneAssets(environmentKey:string,assignments:ForestAssignment[]){
  const[background,setBackground]=useState<ForestAsset|null>(),[trees,setTrees]=useState<Record<string,ForestAsset>>({});
  const signature=assignments.map(item=>item.goal.id+':'+item.goal.tree_stage).join('|');
  useEffect(()=>{let current=true;setBackground(forestAssetFallback(environmentKey));setTrees(Object.fromEntries(assignments.flatMap(item=>{const asset=forestAssetFallback(item.goal.tree_asset_key);return asset?[[item.goal.id,asset]]:[]})));Promise.allSettled([getForestAsset(environmentKey),...assignments.map(item=>getForestAsset(item.goal.tree_asset_key))]).then(results=>{if(!current)return;const scene=results[0];if(scene.status==='fulfilled'&&scene.value)setBackground(scene.value);setTrees(Object.fromEntries(assignments.flatMap((item,index)=>{const result=results[index+1],asset=result?.status==='fulfilled'&&result.value?result.value:forestAssetFallback(item.goal.tree_asset_key);return asset?[[item.goal.id,asset]]:[]})))});return()=>{current=false}},[environmentKey,signature]);
  return{background,trees};
}

export function useForestInteraction(){
  const[selected,setSelected]=useState<string>(),[hovered,setHovered]=useState<string>(),timer=useRef<number|undefined>(undefined);
  const cancel=()=>{if(timer.current)window.clearTimeout(timer.current)};
  const hover=(id?:string)=>{cancel();setHovered(id)};
  const leave=()=>{cancel();timer.current=window.setTimeout(()=>setHovered(undefined),140)};
  const active=selected??hovered;
  useEffect(()=>{document.body.classList.toggle('forest-tree-card-open',Boolean(active));return()=>document.body.classList.remove('forest-tree-card-open')},[active]);
  useEffect(()=>()=>cancel(),[]);
  return{active,selected,hovered,hover,leave,select:(id?:string)=>{cancel();setSelected(id);if(id)setHovered(id)},close:()=>{cancel();setSelected(undefined);setHovered(undefined)}};
}

export function ForestTreeLayer({assignments,trees,variant,onSelect,onHover,onLeave,debug=false}:{assignments:ForestAssignment[];trees:Record<string,ForestAsset>;variant:'hero'|'overview';environment:string;onSelect:(id:string)=>void;onHover?:(id:string)=>void;onLeave?:()=>void;debug?:boolean}){
  const className=variant==='hero'?'production-tree':'forest-overview-tree';
  return <>{assignments.map(({goal,slot})=>{const asset=trees[goal.id]??forestAssetFallback(goal.tree_asset_key);if(!asset)throw new Error(`Missing Tree asset ${goal.tree_asset_key}`);return <button key={goal.id} data-slot-id={slot.id} className={`${className} ${goal.health_state.toLowerCase().replaceAll(' ','-')}`} style={{left:slot.x+'%',top:slot.y+'%','--slot-x':slot.x+'%','--tree-scale':String(slot.scale*asset.default_scale),'--ground-anchor':String(asset.ground_anchor_y),'--z':String(slot.zIndex)} as CSSProperties} onMouseEnter={()=>onHover?.(goal.id)} onMouseLeave={onLeave} onFocus={()=>onHover?.(goal.id)} onBlur={onLeave} onClick={()=>onSelect(goal.id)} aria-label={goal.title+', '+goal.tree_species}><span className="tree-asset-shell"><img src={asset.url} alt=""/><i/></span>{debug&&<span className="forest-tree-debug"><b>{slot.id}</b><i className="tree-ground-point"/><i className="slot-anchor-point"/><i className="anchor-link"/><em>Tree {slot.x.toFixed(1)}, {slot.y.toFixed(1)} · Slot {slot.x.toFixed(1)}, {slot.y.toFixed(1)}</em></span>}</button>})}</>;
}

export function ForestTreeLabels({assignments,environment,onSelect,onHover,onLeave}:{assignments:ForestAssignment[];environment:string;onSelect:(id:string)=>void;onHover:(id:string)=>void;onLeave:()=>void}){
  const placements=forestLabelPlacements(assignments);
  return <>{assignments.map(({goal,slot})=>{const placement=placements.find(item=>item.goalId===goal.id)!;return <button type="button" className={`forest-tree-label label-${placement.anchor} ${goal.health_state.toLowerCase().replaceAll(' ','-')}`} style={{left:`${placement.x}%`,top:`${placement.y}%`,'--label-offset-x':`${slot.labelOffsetX??0}px`,'--label-offset-y':`${slot.labelOffsetY??0}px`} as CSSProperties} onMouseEnter={()=>onHover(goal.id)} onMouseLeave={onLeave} onFocus={()=>onHover(goal.id)} onBlur={onLeave} onClick={()=>onSelect(goal.id)} key={goal.id}><b>{goal.title}</b><small>{environment==='nursery'?goal.nursery_label:goal.tree_species}</small></button>})}</>;
}

export function ForestTreeCard({assignment,variant,onClose,onViewGoal,onLog,onMouseEnter,onMouseLeave,children}:{assignment:ForestAssignment;variant:'hero'|'overview';onClose:()=>void;onViewGoal:()=>void;onLog:()=>void;onMouseEnter?:()=>void;onMouseLeave?:()=>void;children?:ReactNode}){
  const{goal,slot}=assignment,base=variant==='hero'?'forest-tree-card':'forest-overview-card';
  return <article className={`${base} contextual card-${resolvedCardDirection(slot)}`} style={{'--card-x':slot.x+'%','--card-y':slot.y+'%'} as CSSProperties} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}><button aria-label="Close Tree details" onClick={onClose}><X/></button><span>{goal.area_key.toUpperCase()}</span>{variant==='hero'?<h3>{goal.title}</h3>:<h2>{goal.title}</h2>}<p>{goal.tree_species} · {goal.health_state}</p>{children??<small>{Math.round(goal.growth_consistency)}% Growth Consistency</small>}<div><button onClick={onViewGoal}>View Goal</button><button onClick={onLog}><Plus/> Log</button></div></article>;
}
