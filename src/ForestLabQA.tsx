import {useEffect,useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,Grid3X3,X} from 'lucide-react';
import {getForestAsset,type ForestAsset} from './forestAssets';
import {forestEnvironmentManifest,forestTreeManifest} from './forestManifest';
import {forestAssignmentDebug,nurseryAssignments,nurserySlots} from './forestLayout';
import {ForestTreeCard,ForestTreeLabels,ForestTreeLayer,useForestInteraction,useForestSceneAssets} from './ForestSceneEngine';
import type {HomeGoal} from './homeRepository';
import ForestTestPresets from './ForestTestPresets';

type Mode='tree'|'environment'|'nursery-slots'|'presets';
const environmentAssetKey=(key:string)=>`forest.environment.${key.startsWith('area-')?`area.${key.slice(5)}`:key.replaceAll('-','_')}`;

export default function ForestLabQA({close}:{close:()=>void}){
  const[mode,setMode]=useState<Mode>(import.meta.env.DEV&&new URLSearchParams(location.search).get('forest-qa')==='nursery'?'nursery-slots':'tree'),[stage,setStage]=useState(1),[environment,setEnvironment]=useState('clearing');
  const[asset,setAsset]=useState<ForestAsset|null>(),[error,setError]=useState(''),[contactSheet,setContactSheet]=useState(false);
  const tree=forestTreeManifest[stage-1],environmentName=forestEnvironmentManifest.find(([key])=>key===environment)?.[1]??environment;
  const key=mode==='tree'?tree.assetKey:mode==='nursery-slots'?'forest.environment.nursery':mode==='presets'?'forest.environment.clearing':environmentAssetKey(environment);
  useEffect(()=>{let current=true;setAsset(undefined);setError('');getForestAsset(key).then(value=>{if(!current)return;if(!value)setError('Production asset is not ready.');setAsset(value)}).catch(()=>current&&setError('Production asset could not be loaded.'));return()=>{current=false}},[key]);
  const anchor=asset?.ground_anchor_y??tree?.groundAnchorY??1;
  const treeStyle=useMemo(()=>asset?{
    '--tree-ground':`${anchor*100}%`,
    '--tree-scale':String(asset.default_scale),
    '--tree-url':`url("${asset.url}")`,
  } as React.CSSProperties:undefined,[asset,anchor]);
  return <div className="forest-lab-qa">
    <header><div><p>AUTHORIZED QA</p><h1>Forest Lab</h1></div><div className="forest-lab-tabs"><button className={mode==='tree'?'active':''} onClick={()=>{setMode('tree');setContactSheet(false)}}>Trees</button><button className={mode==='environment'?'active':''} onClick={()=>{setMode('environment');setContactSheet(false)}}>Environments</button><button className={mode==='nursery-slots'?'active':''} onClick={()=>{setMode('nursery-slots');setContactSheet(false)}}>Nursery Slots</button><button className={mode==='presets'?'active':''} onClick={()=>{setMode('presets');setContactSheet(false)}}>Test Presets</button></div><button aria-label="Close Forest Lab" onClick={close}><X/></button></header>
    <aside>
      <p className="forest-lab-note">Production manifest preview. Overrides here never alter Goals, History or Forest state.</p>
      {mode==='tree'?<>
        <label>Tree stage<select value={stage} onChange={event=>setStage(Number(event.target.value))}>{forestTreeManifest.map(item=><option value={item.stage} key={item.stage}>{String(item.stage).padStart(2,'0')} · {item.canonicalName}</option>)}</select></label>
        <div className="forest-lab-step"><button disabled={stage===1} onClick={()=>setStage(value=>value-1)}><ChevronLeft/> Previous</button><button disabled={stage===27} onClick={()=>setStage(value=>value+1)}>Next <ChevronRight/></button></div>
        <button className="forest-lab-sheet-button" onClick={()=>setContactSheet(value=>!value)}><Grid3X3/> {contactSheet?'Single Tree':'27-Tree contact sheet'}</button>
        <dl><div><dt>Ground anchor</dt><dd>{Math.round(anchor*100)}%</dd></div><div><dt>Depth</dt><dd>{asset?.depth_preference??tree.depthPreference}</dd></div><div><dt>Source</dt><dd>{asset?.width??tree.width} × {asset?.height??tree.height}</dd></div></dl>
      </>:mode==='environment'?<label>Environment<select value={environment} onChange={event=>setEnvironment(event.target.value)}>{forestEnvironmentManifest.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>:mode==='nursery-slots'?<><p className="forest-lab-note">Seven deterministic planting slots calibrated to the approved Nursery beds.</p><dl>{nurserySlots.map(slot=><div key={slot.id}><dt>{slot.id}</dt><dd>{slot.x}% · {slot.y}%</dd></div>)}</dl></>:<p className="forest-lab-note">Apply isolated lifecycle, Area, stage and health states to Test Goals.</p>}
    </aside>
    <main className={mode==='environment'?'environment-preview':''}>
      {error&&<div className="forest-asset-error">{error}</div>}
      {asset===undefined&&!error&&<div className="forest-asset-loading">Loading production asset…</div>}
      {mode==='tree'&&asset&&!contactSheet&&<div className="tree-calibration"><div className="tree-viewport" style={treeStyle}><img src={asset.url} alt={`${tree.canonicalName} production Tree`} /><i className="ground-mask"/><span className="ground-line">GROUND</span></div><div><strong>{String(stage).padStart(2,'0')} · {tree.canonicalName}</strong><small>{asset.storage_path}</small></div></div>}
      {mode==='tree'&&contactSheet&&<TreeContactSheet/>}
      {mode==='environment'&&asset&&<figure className="environment-master"><img src={asset.url} alt={`${environmentName} production environment`}/><figcaption><strong>{environmentName}</strong><small>{asset.storage_path}</small></figcaption></figure>}
      {mode==='nursery-slots'&&asset&&<NurseryPlacementQA background={asset}/>}
      {mode==='presets'&&<ForestTestPresets/>}
    </main>
  </div>
}

const nurseryTestGoals:HomeGoal[]=Array.from({length:5},(_,index)=>({id:`nursery-test-${index+1}`,title:`Nursery Test ${index+1}`,status:'active',presentation_priority:index<4?'primary':'secondary',area_key:'Health',created_at:'2026-09-03T00:00:00Z',starts_on:'2026-09-03',tree_stage:(index%3)+1,tree_species:['Seed','Sprout','Young Plant'][index%3],tree_asset_key:`forest.tree.stage0${(index%3)+1}`,forest_environment:'nursery',growth_consistency:80,health_state:'Healthy',contribution_count:index%3,eligible_days:3,nursery_label:['Seed','Sprout','Young Plant'][index%3],nursery_next:'QA fixture',nursery_progress:33*(index%3)}));

function NurseryPlacementQA({background}:{background:ForestAsset}){
  const baseAssignments=useMemo(()=>nurseryAssignments(nurseryTestGoals),[]),[previewGoal,setPreviewGoal]=useState(baseAssignments[0].goal.id),[labelX,setLabelX]=useState(baseAssignments[0].slot.labelAnchorX??0),[labelY,setLabelY]=useState(baseAssignments[0].slot.labelAnchorY??1.5),[cardDirection,setCardDirection]=useState<'auto'|'left'|'right'|'above'|'below'>('auto');
  const assignments=useMemo(()=>baseAssignments.map(item=>item.goal.id===previewGoal?{...item,slot:{...item.slot,labelAnchorX:labelX,labelAnchorY:labelY,preferredCardDirection:cardDirection}}:item),[baseAssignments,previewGoal,labelX,labelY,cardDirection]);
  const{trees}=useForestSceneAssets('forest.environment.nursery',assignments),audit=forestAssignmentDebug('nursery',assignments),interaction=useForestInteraction(),selected=assignments.find(item=>item.goal.id===interaction.active);
  return <div className="nursery-placement-qa"><figure className="nursery-slot-preview"><img src={background.url} alt="Nursery planting slot calibration"/>{nurserySlots.map(slot=><div className={`nursery-slot-marker label-${slot.labelAnchor}`} key={slot.id} style={{left:`${slot.x}%`,top:`${slot.y}%`,'--slot-scale':slot.scale} as React.CSSProperties}><span className="slot-centre"/><i className="slot-ground"/><b className="slot-tree-anchor">SLOT</b><em className="slot-label-anchor">LABEL</em><strong>{slot.id}</strong></div>)}<div className="forest-world-layer"><ForestTreeLayer assignments={assignments} trees={trees} variant="overview" environment="nursery" onSelect={interaction.select} onHover={interaction.hover} onLeave={interaction.leave} debug/></div><div className="forest-interaction-layer"><ForestTreeLabels assignments={assignments} environment="nursery" onSelect={interaction.select} onHover={interaction.hover} onLeave={interaction.leave}/>{selected&&<ForestTreeCard assignment={selected} variant="overview" onClose={interaction.close} onViewGoal={()=>{}} onLog={()=>{}} onMouseEnter={()=>interaction.hover(selected.goal.id)} onMouseLeave={interaction.leave}/>}</div></figure><div className="forest-composer-preview"><label>Preview Tree<select value={previewGoal} onChange={event=>setPreviewGoal(event.target.value)}>{assignments.map(item=><option value={item.goal.id} key={item.goal.id}>{item.goal.title}</option>)}</select></label><label>Label X<input type="range" min="-12" max="12" step=".5" value={labelX} onChange={event=>setLabelX(Number(event.target.value))}/><span>{labelX}%</span></label><label>Label Y<input type="range" min="-8" max="12" step=".5" value={labelY} onChange={event=>setLabelY(Number(event.target.value))}/><span>{labelY}%</span></label><label>Card direction<select value={cardDirection} onChange={event=>setCardDirection(event.target.value as typeof cardDirection)}><option value="auto">Auto</option><option value="left">Left</option><option value="right">Right</option><option value="above">Above</option><option value="below">Below</option></select></label><div><button onClick={()=>interaction.close()}>Default label</button><button onClick={()=>interaction.select(previewGoal)}>Selected card</button></div></div><div className="nursery-placement-report"><b>5 eligible · 5 rendered · 5 unique slots · production interactions enabled</b>{audit.map(row=><code key={row.goal_id}>{row.goal_id} → {row.slot_id} · ground ({row.anchor_x}%, {row.anchor_y}%) · environment ({row.anchor_x}%, {row.anchor_y}%)</code>)}</div></div>;
}

function TreeContactSheet(){
  const[assets,setAssets]=useState<Record<string,ForestAsset|null>>({});
  useEffect(()=>{let current=true;Promise.all(forestTreeManifest.map(item=>getForestAsset(item.assetKey))).then(rows=>{if(!current)return;setAssets(Object.fromEntries(rows.map((asset,index)=>[forestTreeManifest[index].assetKey,asset])))});return()=>{current=false}},[]);
  return <div className="tree-contact-sheet">{forestTreeManifest.map(item=>{const asset=assets[item.assetKey];return <article key={item.assetKey}><div style={{'--contact-anchor':`${(asset?.ground_anchor_y??item.groundAnchorY)*100}%`} as React.CSSProperties}>{asset?<img src={asset.url} alt=""/>:<span/>}<i/></div><b>{String(item.stage).padStart(2,'0')}</b><small>{item.canonicalName}</small></article>})}</div>
}
