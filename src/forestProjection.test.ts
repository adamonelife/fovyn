import{describe,expect,it}from'vitest';
import{environmentPointToViewport,viewportPointToEnvironment,type ForestViewport}from'./forestProjection';

describe('Forest environment projection',()=>{
  const source={sourceWidth:1536,sourceHeight:1024,fit:'cover' as const,positionX:.5,positionY:.5};
  it.each([[1280,720],[1024,768],[430,520],[390,500],[375,480],[360,460],[320,440]])('keeps a source feature attached at %sx%s',(viewportWidth,viewportHeight)=>{
    const view:ForestViewport={...source,viewportWidth,viewportHeight};
    const point={x:.329,y:.557},screen=environmentPointToViewport(point,view);
    expect(viewportPointToEnvironment(screen,view).x).toBeCloseTo(point.x,8);
    expect(viewportPointToEnvironment(screen,view).y).toBeCloseTo(point.y,8);
  });
  it('accounts for cover crop rather than treating source coordinates as viewport percentages',()=>{
    const screen=environmentPointToViewport({x:0,y:.5},{...source,viewportWidth:320,viewportHeight:440});
    expect(screen.x).toBeLessThan(0);expect(screen.y).toBeCloseTo(220);
  });
  it('keeps projection and inverse projection aligned at a calibrated zoom',()=>{
    const view:ForestViewport={...source,viewportWidth:390,viewportHeight:500,positionX:.3,positionY:.65,zoom:1.55};
    const point={x:.72,y:.61},screen=environmentPointToViewport(point,view);
    expect(viewportPointToEnvironment(screen,view).x).toBeCloseTo(point.x,8);
    expect(viewportPointToEnvironment(screen,view).y).toBeCloseTo(point.y,8);
  });
});
