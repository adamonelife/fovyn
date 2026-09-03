import {stablePlacementSeed} from './domain';
import type {HomeGoal} from './homeRepository';

export type ForestSlot={id:string;x:number;y:number;depth:'far'|'mid'|'near';scale:number;zIndex:number;labelAnchor:'left'|'centre'|'right'};
export type ForestAssignment={goal:HomeGoal;slot:ForestSlot;page:number};

// Calibrated against the seven visible planting beds in the approved Nursery master.
export const nurserySlots:readonly ForestSlot[]=[
  {id:'nursery_slot_01',x:32.9,y:55.7,depth:'far',scale:.52,zIndex:56,labelAnchor:'left'},
  {id:'nursery_slot_02',x:64.3,y:55.5,depth:'far',scale:.52,zIndex:56,labelAnchor:'right'},
  {id:'nursery_slot_03',x:49.7,y:63.1,depth:'mid',scale:.66,zIndex:63,labelAnchor:'centre'},
  {id:'nursery_slot_04',x:22.3,y:67.4,depth:'mid',scale:.68,zIndex:67,labelAnchor:'left'},
  {id:'nursery_slot_05',x:76,y:67.6,depth:'mid',scale:.68,zIndex:68,labelAnchor:'right'},
  {id:'nursery_slot_06',x:32.9,y:81.9,depth:'near',scale:.84,zIndex:82,labelAnchor:'left'},
  {id:'nursery_slot_07',x:60.9,y:82.1,depth:'near',scale:.84,zIndex:82,labelAnchor:'right'},
] as const;

const clearingSlots:readonly ForestSlot[]=[
  {id:'clearing_slot_01',x:18,y:73,depth:'near',scale:1,zIndex:73,labelAnchor:'left'},
  {id:'clearing_slot_02',x:43,y:68,depth:'mid',scale:.76,zIndex:68,labelAnchor:'centre'},
  {id:'clearing_slot_03',x:66,y:71,depth:'near',scale:1,zIndex:71,labelAnchor:'centre'},
  {id:'clearing_slot_04',x:82,y:64,depth:'far',scale:.58,zIndex:64,labelAnchor:'right'},
] as const;

const areaSlots:readonly ForestSlot[]=[
  {id:'environment_slot_01',x:15,y:76,depth:'near',scale:.88,zIndex:76,labelAnchor:'left'},
  {id:'environment_slot_02',x:32,y:69,depth:'mid',scale:.68,zIndex:69,labelAnchor:'left'},
  {id:'environment_slot_03',x:50,y:77,depth:'near',scale:1,zIndex:77,labelAnchor:'centre'},
  {id:'environment_slot_04',x:68,y:68,depth:'mid',scale:.66,zIndex:68,labelAnchor:'right'},
  {id:'environment_slot_05',x:85,y:75,depth:'near',scale:.84,zIndex:75,labelAnchor:'right'},
] as const;

export const forestEnvironmentSlots:Record<string,readonly ForestSlot[]>={
  nursery:nurserySlots,clearing:clearingSlots,
  health:areaSlots,mind:areaSlots,self:areaSlots,people:areaSlots,work:areaSlots,wealth:areaSlots,
  'area-health':areaSlots,'area-mind':areaSlots,'area-self':areaSlots,'area-people':areaSlots,'area-work':areaSlots,'area-wealth':areaSlots,
  'dormant-woods':areaSlots,heartwood:areaSlots,
};

export function canonicalNurseryGoals(goals:HomeGoal[]){return goals.filter(goal=>goal.status==='active'&&goal.tree_stage<=3)}
export function forestAssignments(environment:string,goals:HomeGoal[]):ForestAssignment[]{
  const slots=forestEnvironmentSlots[environment]??areaSlots;
  return [...goals].sort((a,b)=>stablePlacementSeed(a.id)-stablePlacementSeed(b.id)||a.id.localeCompare(b.id)).map((goal,index)=>({goal,slot:slots[index%slots.length],page:Math.floor(index/slots.length)}));
}
export function nurseryAssignments(goals:HomeGoal[]){return forestAssignments('nursery',canonicalNurseryGoals(goals))}
export function forestAssignmentDebug(environment:string,assignments:ForestAssignment[]){return assignments.map(({goal,slot,page})=>({goal_id:goal.id,tree_stage:goal.tree_stage,environment,slot_id:slot.id,anchor_x:slot.x,anchor_y:slot.y,scale:slot.scale,visibility:true,asset_key:goal.tree_asset_key,page}))}
