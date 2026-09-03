import{createContext,useContext,useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent,type ReactNode}from'react';
import type{ForestAsset}from'./forestAssets';
import{clampForestPoint,environmentPointToViewport,viewportPointToEnvironment,type ForestFit,type ForestPoint,type ForestViewport}from'./forestProjection';

type SceneContextValue={view:ForestViewport;project:(point:ForestPoint)=>ForestPoint;unproject:(point:ForestPoint)=>ForestPoint};
const SceneContext=createContext<SceneContextValue|null>(null);
export function useForestProjection(){const value=useContext(SceneContext);if(!value)throw new Error('Forest layers must render inside ForestEnvironmentScene');return value}

export function ForestEnvironmentScene({asset,fit='cover',positionX=.5,positionY=.5,overlay,children,className='',style,onPoint}:{asset:ForestAsset;fit?:ForestFit;positionX?:number;positionY?:number;overlay?:string;children:ReactNode;className?:string;style?:CSSProperties;onPoint?:(point:ForestPoint,event:ReactPointerEvent)=>void}){
  const ref=useRef<HTMLDivElement>(null),[size,setSize]=useState({width:1,height:1});
  useEffect(()=>{const node=ref.current;if(!node)return;const update=()=>setSize({width:node.clientWidth||1,height:node.clientHeight||1});update();const observer=new ResizeObserver(update);observer.observe(node);return()=>observer.disconnect()},[]);
  const view=useMemo<ForestViewport>(()=>({sourceWidth:asset.width,sourceHeight:asset.height,viewportWidth:size.width,viewportHeight:size.height,fit,positionX,positionY}),[asset.width,asset.height,size,fit,positionX,positionY]);
  const value=useMemo<SceneContextValue>(()=>({view,project:point=>environmentPointToViewport(point,view),unproject:point=>clampForestPoint(viewportPointToEnvironment(point,view))}),[view]);
  return <SceneContext.Provider value={value}><div ref={ref} className={`forest-environment-scene ${className}`} style={style} onPointerDown={event=>{if(!onPoint||event.target!==event.currentTarget)return;const box=event.currentTarget.getBoundingClientRect();onPoint(value.unproject({x:event.clientX-box.left,y:event.clientY-box.top}),event)}}><img className="forest-environment-background" src={asset.url} alt="" style={{objectFit:fit,objectPosition:`${positionX*100}% ${positionY*100}%`}} draggable={false}/>{overlay&&<span className="forest-environment-overlay" style={{background:overlay}}/>}{children}</div></SceneContext.Provider>;
}
