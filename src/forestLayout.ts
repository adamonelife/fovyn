import {stablePlacementSeed} from './domain';
import type {HomeGoal} from './homeRepository';
import {forestTreeManifest} from './forestManifest';

export type CardDirection='auto'|'left'|'right'|'above'|'below';
export type ForestSlot={id:string;x:number;y:number;depth:'far'|'mid'|'near';scale:number;zIndex:number;labelAnchor:'left'|'centre'|'right';labelAnchorX?:number;labelAnchorY?:number;labelOffsetX?:number;labelOffsetY?:number;preferredCardDirection?:CardDirection;enabled?:boolean};
export type ForestAssignment={goal:HomeGoal;slot:ForestSlot;page:number};
export type ForestLabelPlacement={goalId:string;x:number;y:number;anchor:ForestSlot['labelAnchor']};

// Calibrated against the seven visible planting beds in the approved Nursery master.
export const nurserySlots:readonly ForestSlot[]=[
  {id:'nursery_slot_01',x:.329,y:.557,depth:'far',scale:.52,zIndex:56,labelAnchor:'left'},
  {id:'nursery_slot_02',x:.643,y:.555,depth:'far',scale:.52,zIndex:56,labelAnchor:'right'},
  {id:'nursery_slot_03',x:.497,y:.631,depth:'mid',scale:.66,zIndex:63,labelAnchor:'centre'},
  {id:'nursery_slot_04',x:.223,y:.674,depth:'mid',scale:.68,zIndex:67,labelAnchor:'left'},
  {id:'nursery_slot_05',x:.76,y:.676,depth:'mid',scale:.68,zIndex:68,labelAnchor:'right'},
  {id:'nursery_slot_06',x:.329,y:.819,depth:'near',scale:.84,zIndex:82,labelAnchor:'left'},
  {id:'nursery_slot_07',x:.609,y:.821,depth:'near',scale:.84,zIndex:82,labelAnchor:'right'},
] as const;

const clearingSlots:readonly ForestSlot[]=[
  {id:'clearing_slot_01',x:.18,y:.73,depth:'near',scale:1,zIndex:73,labelAnchor:'left'},
  {id:'clearing_slot_02',x:.43,y:.68,depth:'mid',scale:.76,zIndex:68,labelAnchor:'centre'},
  {id:'clearing_slot_03',x:.66,y:.71,depth:'near',scale:1,zIndex:71,labelAnchor:'centre'},
  {id:'clearing_slot_04',x:.82,y:.64,depth:'far',scale:.58,zIndex:64,labelAnchor:'right'},
  {id:'clearing_slot_05',x:.52,y:.82,depth:'near',scale:.92,zIndex:82,labelAnchor:'centre'},
] as const;

const areaSlots:readonly ForestSlot[]=[
  {id:'environment_slot_01',x:.15,y:.76,depth:'near',scale:.88,zIndex:76,labelAnchor:'left'},
  {id:'environment_slot_02',x:.32,y:.69,depth:'mid',scale:.68,zIndex:69,labelAnchor:'left'},
  {id:'environment_slot_03',x:.50,y:.77,depth:'near',scale:1,zIndex:77,labelAnchor:'centre'},
  {id:'environment_slot_04',x:.68,y:.68,depth:'mid',scale:.66,zIndex:68,labelAnchor:'right'},
  {id:'environment_slot_05',x:.85,y:.75,depth:'near',scale:.84,zIndex:75,labelAnchor:'right'},
] as const;

const environmentSlots=(environment:string)=>areaSlots.map((slot,index)=>({...slot,id:`${environment}_slot_${String(index+1).padStart(2,'0')}`}));

export const mobileDiamondSlots:readonly ForestSlot[]=[
  {id:'mobile_back',x:.50,y:.35,depth:'far',scale:.62,zIndex:35,labelAnchor:'centre',labelAnchorY:.025,preferredCardDirection:'below'},
  {id:'mobile_mid_left',x:.28,y:.54,depth:'mid',scale:.78,zIndex:54,labelAnchor:'right',labelAnchorX:.025,labelAnchorY:.018,preferredCardDirection:'right'},
  {id:'mobile_mid_right',x:.72,y:.54,depth:'mid',scale:.76,zIndex:54,labelAnchor:'left',labelAnchorX:-.025,labelAnchorY:.018,preferredCardDirection:'left'},
  {id:'mobile_front',x:.50,y:.73,depth:'near',scale:.94,zIndex:73,labelAnchor:'centre',labelAnchorY:.02,preferredCardDirection:'above'},
] as const;

const primaryAreaEnvironments=new Set(['health','mind','self','people','work','wealth','area-health','area-mind','area-self','area-people','area-work','area-wealth']);
export function usesMobileDiamond(environment:string){return primaryAreaEnvironments.has(environment)||environment==='clearing'}

export const forestEnvironmentSlots:Record<string,readonly ForestSlot[]>={
  nursery:nurserySlots,clearing:clearingSlots,
  health:environmentSlots('health'),mind:environmentSlots('mind'),self:environmentSlots('self'),people:environmentSlots('people'),work:environmentSlots('work'),wealth:environmentSlots('wealth'),
  'area-health':environmentSlots('health'),'area-mind':environmentSlots('mind'),'area-self':environmentSlots('self'),'area-people':environmentSlots('people'),'area-work':environmentSlots('work'),'area-wealth':environmentSlots('wealth'),
  'dormant-woods':environmentSlots('dormant'),heartwood:environmentSlots('heartwood'),
};

export function canonicalNurseryGoals(goals:HomeGoal[]){return goals.filter(goal=>goal.status==='active'&&goal.tree_stage<=3)}
export function forestSlotsForViewport(slots:readonly ForestSlot[],profile:'desktop'|'mobile',environment='nursery'){
  if(profile==='desktop')return slots;
  if(usesMobileDiamond(environment)){
    const calibrated=slots.filter(slot=>slot.id.startsWith('mobile_'));
    return calibrated.length===4?calibrated:mobileDiamondSlots;
  }
  return slots.slice(0,3);
}

const stableGoals=(goals:HomeGoal[])=>[...goals].sort((a,b)=>stablePlacementSeed(a.id)-stablePlacementSeed(b.id)||a.id.localeCompare(b.id));
const heightRank={seed:0,sprout:1,young_plant:2,small_tree:3,medium_tree:4,large_tree:5,giant_tree:6} as const;
const dominance=(goal:HomeGoal)=>{const tree=forestTreeManifest[goal.tree_stage-1];return (tree?heightRank[tree.visualHeightClass]*10+tree.defaultScale:goal.tree_stage)};
const dominantGoals=(goals:HomeGoal[])=>[...goals].sort((a,b)=>dominance(b)-dominance(a)||stablePlacementSeed(a.id)-stablePlacementSeed(b.id)||a.id.localeCompare(b.id));
function composeMobilePage(goals:HomeGoal[],slots:readonly ForestSlot[],page:number):ForestAssignment[]{
  const byId=(id:string)=>slots.find(slot=>slot.id===id)!;
  if(goals.length===1)return[{goal:goals[0],slot:{...byId('mobile_front'),x:.5,y:.61,scale:.88,id:'mobile_front'},page}];
  if(goals.length===2)return[
    {goal:goals[0],slot:{...byId('mobile_mid_left'),x:.37,y:.46},page},
    {goal:goals[1],slot:{...byId('mobile_front'),x:.61,y:.68},page},
  ];
  if(goals.length===3)return[
    {goal:goals[0],slot:byId('mobile_back'),page},
    {goal:goals[1],slot:byId('mobile_mid_left'),page},
    {goal:goals[2],slot:byId('mobile_mid_right'),page},
  ];
  return ['mobile_back','mobile_mid_left','mobile_mid_right','mobile_front'].map((id,index)=>({goal:goals[index],slot:byId(id),page}));
}

export function mobileAreaAssignments(goals:HomeGoal[],slots:readonly ForestSlot[]=mobileDiamondSlots):ForestAssignment[]{
  const ordered=dominantGoals(goals),result:ForestAssignment[]=[];
  if(ordered.length<=4)return composeMobilePage(ordered,slots,0);
  for(let start=0,page=0;start<ordered.length;start+=4,page++){
    const primary=ordered.slice(start,start+4);
    if(primary.length<4){
      const context=ordered.slice(0,4-primary.length).filter(goal=>!primary.some(item=>item.id===goal.id));
      result.push(...composeMobilePage(dominantGoals([...context,...primary]),slots,page));
    }else result.push(...composeMobilePage(primary,slots,page));
  }
  return result;
}
export function forestAssignments(environment:string,goals:HomeGoal[],configuredSlots?:readonly ForestSlot[]):ForestAssignment[]{
  const slots=(configuredSlots?.length?configuredSlots:forestEnvironmentSlots[environment]??areaSlots).filter(slot=>slot.enabled!==false);
  if(!slots.length&&goals.length)throw new Error(`No placement slots configured for ${environment}`);
  if(usesMobileDiamond(environment)&&slots.length===4&&slots.every(slot=>slot.id.startsWith('mobile_')))return mobileAreaAssignments(goals,slots);
  return stableGoals(goals).map((goal,index)=>({goal,slot:slots[index%slots.length],page:Math.floor(index/slots.length)}));
}
export function nurseryAssignments(goals:HomeGoal[],configuredSlots?:readonly ForestSlot[]){return forestAssignments('nursery',canonicalNurseryGoals(goals),configuredSlots)}
export function forestAssignmentDebug(environment:string,assignments:ForestAssignment[]){return assignments.map(({goal,slot,page})=>({goal_id:goal.id,tree_stage:goal.tree_stage,environment,slot_id:slot.id,anchor_x:slot.x,anchor_y:slot.y,scale:slot.scale,visibility:true,asset_key:goal.tree_asset_key,page}))}

export function forestLabelPlacements(assignments:ForestAssignment[]):ForestLabelPlacement[]{
  const placed:ForestLabelPlacement[]=[];
  for(const {goal,slot} of assignments){
    let x=slot.x+(slot.labelAnchorX??(slot.labelAnchor==='left'?-.03:slot.labelAnchor==='right'?.03:0)),y=slot.y+(slot.labelAnchorY??.015);
    for(let attempt=0;attempt<5&&placed.some(item=>Math.abs(item.x-x)<.16&&Math.abs(item.y-y)<.06);attempt++){
      const direction=attempt%2===0?1:-1;x=Math.max(.07,Math.min(.93,x+direction*(.05+attempt*.02)));y=Math.max(.08,Math.min(.94,y+.03));
    }
    placed.push({goalId:goal.id,x,y,anchor:slot.labelAnchor});
  }
  return placed;
}

export function resolvedCardDirection(slot:ForestSlot):Exclude<CardDirection,'auto'>{
  if(slot.preferredCardDirection&&slot.preferredCardDirection!=='auto')return slot.preferredCardDirection;
  if(slot.y>.72)return'above';if(slot.x>.62)return'left';if(slot.x<.38)return'right';return slot.y<.4?'below':'right';
}
