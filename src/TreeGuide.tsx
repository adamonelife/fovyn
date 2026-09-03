import {useEffect,useState,type CSSProperties} from 'react';
import {ChevronRight,X} from 'lucide-react';
import {forestAssetFallback,getForestAsset,type ForestAsset} from './forestAssets';
import {goalTreeIdentity,treeLevelLabel} from './forestGoalState';
import {forestTreeManifest} from './forestManifest';
import TreeThumbnail from './TreeThumbnail';
import './tree-guide.css';

export type TreeGuideGoal={title:string;tree_stage:number;tree_asset_key?:string;tree_species?:string};

export default function TreeGuide({close,goal}:{close:()=>void;goal?:TreeGuideGoal}){
  const[assets,setAssets]=useState<Record<number,ForestAsset>>(()=>Object.fromEntries(forestTreeManifest.flatMap(tree=>{const asset=forestAssetFallback(tree.assetKey);return asset?[[tree.stage,asset]]:[]})));
  useEffect(()=>{let current=true;Promise.all(forestTreeManifest.map(tree=>getForestAsset(tree.assetKey))).then(results=>{if(!current)return;setAssets(Object.fromEntries(results.flatMap((asset,index)=>asset?[[index+1,asset]]:[])))});return()=>{current=false}},[]);
  const current=goal?goalTreeIdentity(goal.tree_stage):null,next=current&&current.stage<27?goalTreeIdentity(current.stage+1):null;
  return <div className="tree-guide-shade" role="dialog" aria-modal="true" aria-label="Tree Guide" onMouseDown={close}>
    <section className="tree-guide" onMouseDown={event=>event.stopPropagation()}>
      <header><div><span>TREE GUIDE</span><h1>Your Tree growth journey.</h1></div><button onClick={close} aria-label="Close Tree Guide"><X/></button></header>
      {goal&&current&&<section className="tree-guide-current">
        <TreeThumbnail stage={current.stage} assetKey={goal.tree_asset_key} species={current.species}/>
        <div><span>YOUR TREE</span><h2>{goal.title}</h2><b>{treeLevelLabel(current.stage)}</b></div>
        {next?<div className="tree-guide-next"><span>NEXT</span><b>{treeLevelLabel(next.stage)}</b><ChevronRight/></div>:<div className="tree-guide-next"><span>CURRENT</span><b>Final Tree Level</b></div>}
      </section>}
      <section className="tree-guide-explanation"><div><span>HOW TREES GROW</span><h2>Growth is earned through eligible Goal progress and Growth Consistency.</h2></div><p>Some Goals can succeed early, while limits and avoidance Goals may need the period to finish. Growth Rings record earned progress and move the same Tree through its Levels. Trees never shrink: Dormant Trees keep their identity in Dormant Woods, and completed Goal Trees remain in Heartwood.</p></section>
      <div className="tree-guide-grid" aria-label="All 27 Tree Levels">{forestTreeManifest.map(tree=>{
        const asset=assets[tree.stage],isCurrent=current?.stage===tree.stage,isPrevious=Boolean(current&&tree.stage<current.stage),isNext=next?.stage===tree.stage;
        return <article key={tree.assetKey} className={`${isCurrent?'current ':''}${isPrevious?'reached ':''}${isNext?'next ':''}`} aria-current={isCurrent?'step':undefined}>
          <div className="tree-guide-image" style={{'--guide-scale':String(Math.max(.42,Math.min(1,tree.defaultScale/.78)))} as CSSProperties}>{asset&&<img src={asset.url} alt="" loading="lazy" decoding="async"/>}</div>
          <span>{isCurrent?'YOUR TREE':isNext?'NEXT':isPrevious?'REACHED':'LEVEL '+tree.stage}</span>
          <b>Level {tree.stage}</b><h3>{tree.canonicalName}</h3>
        </article>})}</div>
    </section>
  </div>
}
