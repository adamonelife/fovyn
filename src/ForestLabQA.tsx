import {useEffect,useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,Grid3X3,X} from 'lucide-react';
import {getForestAsset,type ForestAsset} from './forestAssets';
import {forestEnvironmentManifest,forestTreeManifest} from './forestManifest';

type Mode='tree'|'environment';
const environmentAssetKey=(key:string)=>`forest.environment.${key.startsWith('area-')?`area.${key.slice(5)}`:key.replaceAll('-','_')}`;

export default function ForestLabQA({close}:{close:()=>void}){
  const[mode,setMode]=useState<Mode>('tree'),[stage,setStage]=useState(1),[environment,setEnvironment]=useState('clearing');
  const[asset,setAsset]=useState<ForestAsset|null>(),[error,setError]=useState(''),[contactSheet,setContactSheet]=useState(false);
  const tree=forestTreeManifest[stage-1],environmentName=forestEnvironmentManifest.find(([key])=>key===environment)?.[1]??environment;
  const key=mode==='tree'?tree.assetKey:environmentAssetKey(environment);
  useEffect(()=>{let current=true;setAsset(undefined);setError('');getForestAsset(key).then(value=>{if(!current)return;if(!value)setError('Production asset is not ready.');setAsset(value)}).catch(()=>current&&setError('Production asset could not be loaded.'));return()=>{current=false}},[key]);
  const anchor=asset?.ground_anchor_y??tree?.groundAnchorY??1;
  const treeStyle=useMemo(()=>asset?{
    '--tree-ground':`${anchor*100}%`,
    '--tree-scale':String(asset.default_scale),
    '--tree-url':`url("${asset.url}")`,
  } as React.CSSProperties:undefined,[asset,anchor]);
  return <div className="forest-lab-qa">
    <header><div><p>AUTHORIZED QA</p><h1>Forest Lab</h1></div><div className="forest-lab-tabs"><button className={mode==='tree'?'active':''} onClick={()=>{setMode('tree');setContactSheet(false)}}>Trees</button><button className={mode==='environment'?'active':''} onClick={()=>{setMode('environment');setContactSheet(false)}}>Environments</button></div><button aria-label="Close Forest Lab" onClick={close}><X/></button></header>
    <aside>
      <p className="forest-lab-note">Production manifest preview. Overrides here never alter Goals, History or Forest state.</p>
      {mode==='tree'?<>
        <label>Tree stage<select value={stage} onChange={event=>setStage(Number(event.target.value))}>{forestTreeManifest.map(item=><option value={item.stage} key={item.stage}>{String(item.stage).padStart(2,'0')} · {item.canonicalName}</option>)}</select></label>
        <div className="forest-lab-step"><button disabled={stage===1} onClick={()=>setStage(value=>value-1)}><ChevronLeft/> Previous</button><button disabled={stage===27} onClick={()=>setStage(value=>value+1)}>Next <ChevronRight/></button></div>
        <button className="forest-lab-sheet-button" onClick={()=>setContactSheet(value=>!value)}><Grid3X3/> {contactSheet?'Single Tree':'27-Tree contact sheet'}</button>
        <dl><div><dt>Ground anchor</dt><dd>{Math.round(anchor*100)}%</dd></div><div><dt>Depth</dt><dd>{asset?.depth_preference??tree.depthPreference}</dd></div><div><dt>Source</dt><dd>{asset?.width??tree.width} × {asset?.height??tree.height}</dd></div></dl>
      </>:<label>Environment<select value={environment} onChange={event=>setEnvironment(event.target.value)}>{forestEnvironmentManifest.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>}
    </aside>
    <main className={mode==='environment'?'environment-preview':''}>
      {error&&<div className="forest-asset-error">{error}</div>}
      {asset===undefined&&!error&&<div className="forest-asset-loading">Loading production asset…</div>}
      {mode==='tree'&&asset&&!contactSheet&&<div className="tree-calibration"><div className="tree-viewport" style={treeStyle}><img src={asset.url} alt={`${tree.canonicalName} production Tree`} /><i className="ground-mask"/><span className="ground-line">GROUND</span></div><div><strong>{String(stage).padStart(2,'0')} · {tree.canonicalName}</strong><small>{asset.storage_path}</small></div></div>}
      {mode==='tree'&&contactSheet&&<TreeContactSheet/>}
      {mode==='environment'&&asset&&<figure className="environment-master"><img src={asset.url} alt={`${environmentName} production environment`}/><figcaption><strong>{environmentName}</strong><small>{asset.storage_path}</small></figcaption></figure>}
    </main>
  </div>
}

function TreeContactSheet(){
  const[assets,setAssets]=useState<Record<string,ForestAsset|null>>({});
  useEffect(()=>{let current=true;Promise.all(forestTreeManifest.map(item=>getForestAsset(item.assetKey))).then(rows=>{if(!current)return;setAssets(Object.fromEntries(rows.map((asset,index)=>[forestTreeManifest[index].assetKey,asset])))});return()=>{current=false}},[]);
  return <div className="tree-contact-sheet">{forestTreeManifest.map(item=>{const asset=assets[item.assetKey];return <article key={item.assetKey}><div style={{'--contact-anchor':`${(asset?.ground_anchor_y??item.groundAnchorY)*100}%`} as React.CSSProperties}>{asset?<img src={asset.url} alt=""/>:<span/>}<i/></div><b>{String(item.stage).padStart(2,'0')}</b><small>{item.canonicalName}</small></article>})}</div>
}
