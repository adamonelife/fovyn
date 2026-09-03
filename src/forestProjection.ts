export type ForestFit='cover'|'contain';
export type ForestViewport={sourceWidth:number;sourceHeight:number;viewportWidth:number;viewportHeight:number;fit:ForestFit;positionX:number;positionY:number};
export type ForestPoint={x:number;y:number};

export function environmentTransform(input:ForestViewport){
  const{sourceWidth,sourceHeight,viewportWidth,viewportHeight,fit,positionX,positionY}=input;
  const scale=(fit==='cover'?Math.max:Math.min)(viewportWidth/sourceWidth,viewportHeight/sourceHeight);
  const width=sourceWidth*scale,height=sourceHeight*scale;
  return{scale,width,height,offsetX:(viewportWidth-width)*positionX,offsetY:(viewportHeight-height)*positionY};
}

/** Environment points are normalized source-artwork coordinates, never viewport coordinates. */
export function environmentPointToViewport(point:ForestPoint,input:ForestViewport):ForestPoint{
  const t=environmentTransform(input);
  return{x:t.offsetX+point.x*t.width,y:t.offsetY+point.y*t.height};
}

export function viewportPointToEnvironment(point:ForestPoint,input:ForestViewport):ForestPoint{
  const t=environmentTransform(input);
  return{x:(point.x-t.offsetX)/t.width,y:(point.y-t.offsetY)/t.height};
}

export function clampForestPoint(point:ForestPoint):ForestPoint{return{x:Math.max(0,Math.min(1,point.x)),y:Math.max(0,Math.min(1,point.y))}}
