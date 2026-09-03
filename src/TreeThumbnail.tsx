import {useEffect,useRef,useState} from 'react';
import {TreePine} from 'lucide-react';
import {forestAssetFallback,getForestAsset,retryForestImage,type ForestAsset} from './forestAssets';
import {goalTreeIdentity,treeLevelLabel} from './forestGoalState';

export default function TreeThumbnail({stage,assetKey,species,className=''}:{stage:number;assetKey?:string;species?:string;className?:string}){
  const identity=goalTreeIdentity(stage),key=assetKey??identity.assetKey,[asset,setAsset]=useState<ForestAsset|null>(()=>forestAssetFallback(key)),[failed,setFailed]=useState(false);
  const retryAttempt=useRef(0);
  useEffect(()=>{let current=true;retryAttempt.current=0;setFailed(false);setAsset(forestAssetFallback(key));getForestAsset(key).then(value=>{if(current&&value)setAsset(value)}).catch(()=>{if(current)setFailed(true)});return()=>{current=false}},[key]);
  const label=`${treeLevelLabel(identity.stage,false)}, Goal Tree`;
  return <span className={`goal-tree-thumbnail ${className}`} role="img" aria-label={label}>{asset&&!failed?<img src={asset.url} alt="" loading="lazy" decoding="async" onError={event=>{if(retryForestImage(event.currentTarget,asset,retryAttempt.current)){retryAttempt.current+=1;return}console.warn('Goal Tree thumbnail failed to load',{assetKey:key,stage:identity.stage});setFailed(true)}}/>:<TreePine aria-hidden="true"/>}</span>;
}
