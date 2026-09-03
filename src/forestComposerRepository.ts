import{useEffect,useState}from'react';
import{supabase}from'./supabase';
import type{ForestSlot}from'./forestLayout';

type SlotRow={environment_key:string;slot_id:string;calibration_state:'draft'|'published';source_x:number;source_y:number;depth:ForestSlot['depth'];tree_scale:number;z_index:number;label_anchor:ForestSlot['labelAnchor'];label_offset_x:number;label_offset_y:number;card_direction:NonNullable<ForestSlot['preferredCardDirection']>;enabled:boolean};
export type ForestViewportProfile='desktop'|'mobile';
export type ForestViewConfig={profile:ForestViewportProfile;positionX:number;positionY:number;zoom:number;scrollable:boolean};
export const defaultForestView=(profile:ForestViewportProfile):ForestViewConfig=>({profile,positionX:.5,positionY:.5,zoom:profile==='mobile'?1.35:1,scrollable:profile==='mobile'});
const environmentProfileKey=(environment:string,profile:ForestViewportProfile)=>profile==='desktop'?environment:`${environment}@mobile`;
const rowToSlot=(row:SlotRow):ForestSlot=>({id:row.slot_id,x:Number(row.source_x),y:Number(row.source_y),depth:row.depth,scale:Number(row.tree_scale),zIndex:row.z_index,labelAnchor:row.label_anchor,labelAnchorX:Number(row.label_offset_x),labelAnchorY:Number(row.label_offset_y),preferredCardDirection:row.card_direction,enabled:row.enabled});

export function mergeForestSlotLayers(defaults:readonly ForestSlot[],published:readonly ForestSlot[],drafts:readonly ForestSlot[]){
  const merged=new Map(defaults.map(slot=>[slot.id,{...slot}]));
  for(const slot of published)merged.set(slot.id,{...merged.get(slot.id),...slot});
  for(const slot of drafts)merged.set(slot.id,{...merged.get(slot.id),...slot});
  return[...merged.values()];
}

export function alignForestSlotsAcrossMiddle(slots:readonly ForestSlot[]){
  return slots.map((slot,index)=>({...slot,x:(index+1)/(slots.length+1),y:.5}));
}

export function resetForestSlotsAcrossMiddle(slots:readonly ForestSlot[],minimum=5,environment='environment'){
  const next=slots.map(slot=>({...slot}));
  const template=next.at(-1)??{id:`${environment}_slot_01`,x:.5,y:.5,depth:'mid' as const,scale:1,zIndex:50,labelAnchor:'centre' as const};
  const prefix=template.id.match(/^(.*?)(\d+)$/)?.[1]??`${environment.replaceAll('-','_')}_slot_`;
  while(next.length<minimum){const number=String(next.length+1).padStart(2,'0');next.push({...template,id:`${prefix}${number}`,labelAnchor:'centre'})}
  return alignForestSlotsAcrossMiddle(next);
}

export async function loadForestSlots(environment:string,state:'draft'|'published'='published',profile:ForestViewportProfile='desktop'){
  const{data,error}=await supabase.from('forest_environment_slots').select('environment_key,slot_id,calibration_state,source_x,source_y,depth,tree_scale,z_index,label_anchor,label_offset_x,label_offset_y,card_direction,enabled').eq('environment_key',environmentProfileKey(environment,profile)).eq('calibration_state',state).order('slot_id');
  if(error){console.warn('Forest calibration unavailable',{environment,state});return[]}
  return(data as SlotRow[]).map(rowToSlot);
}

export async function loadForestView(environment:string,state:'draft'|'published'='published',profile:ForestViewportProfile='desktop'){
  const{data,error}=await supabase.from('forest_environment_views').select('position_x,position_y,zoom,scrollable').eq('environment_key',environment).eq('viewport_profile',profile).eq('calibration_state',state).maybeSingle();
  if(error||!data)return null;
  return{profile,positionX:Number(data.position_x),positionY:Number(data.position_y),zoom:Number(data.zoom),scrollable:Boolean(data.scrollable)};
}

export function usePublishedForestSlots(environment:string,fallback:readonly ForestSlot[],profile:ForestViewportProfile='desktop'){
  const[slots,setSlots]=useState<readonly ForestSlot[]>(fallback);
  useEffect(()=>{let current=true;setSlots(fallback);Promise.all([loadForestSlots(environment,'published',profile),profile==='mobile'?loadForestSlots(environment,'published','desktop'):Promise.resolve([])]).then(([rows,desktop])=>{if(current)setSlots(rows.length?rows:desktop.length?desktop:fallback)});return()=>{current=false}},[environment,fallback,profile]);
  return slots;
}

export function usePublishedForestView(environment:string,profile:ForestViewportProfile){
  const[view,setView]=useState(()=>defaultForestView(profile));
  useEffect(()=>{let current=true;setView(defaultForestView(profile));loadForestView(environment,'published',profile).then(row=>{if(current&&row)setView(row)});return()=>{current=false}},[environment,profile]);
  return view;
}

export async function saveForestSlotDraft(environment:string,slot:ForestSlot,profile:ForestViewportProfile='desktop'){
  const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in to save Forest calibration.');
  const{error}=await supabase.from('forest_environment_slots').upsert({environment_key:environmentProfileKey(environment,profile),slot_id:slot.id,calibration_state:'draft',source_x:slot.x,source_y:slot.y,depth:slot.depth,tree_scale:slot.scale,z_index:slot.zIndex,label_anchor:slot.labelAnchor,label_offset_x:slot.labelAnchorX??0,label_offset_y:slot.labelAnchorY??.015,card_direction:slot.preferredCardDirection??'auto',enabled:slot.enabled!==false,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'environment_key,slot_id,calibration_state'});
  if(error)throw new Error('Forest draft could not be saved.');
}

export async function saveForestSlotsDraft(environment:string,slots:readonly ForestSlot[],profile:ForestViewportProfile='desktop'){
  const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in to save Forest calibration.');
  const rows=slots.map(slot=>({environment_key:environmentProfileKey(environment,profile),slot_id:slot.id,calibration_state:'draft',source_x:slot.x,source_y:slot.y,depth:slot.depth,tree_scale:slot.scale,z_index:slot.zIndex,label_anchor:slot.labelAnchor,label_offset_x:slot.labelAnchorX??0,label_offset_y:slot.labelAnchorY??.015,card_direction:slot.preferredCardDirection??'auto',enabled:slot.enabled!==false,updated_by:user.id,updated_at:new Date().toISOString()}));
  const{error}=await supabase.from('forest_environment_slots').upsert(rows,{onConflict:'environment_key,slot_id,calibration_state'});if(error)throw new Error('Forest draft could not be saved.');
}

export async function publishForestSlots(environment:string,slots:ForestSlot[],profile:ForestViewportProfile='desktop'){
  const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in to publish Forest calibration.');
  const rows=slots.map(slot=>({environment_key:environmentProfileKey(environment,profile),slot_id:slot.id,calibration_state:'published',source_x:slot.x,source_y:slot.y,depth:slot.depth,tree_scale:slot.scale,z_index:slot.zIndex,label_anchor:slot.labelAnchor,label_offset_x:slot.labelAnchorX??0,label_offset_y:slot.labelAnchorY??.015,card_direction:slot.preferredCardDirection??'auto',enabled:slot.enabled!==false,updated_by:user.id,updated_at:new Date().toISOString()}));
  const{error}=await supabase.from('forest_environment_slots').upsert(rows,{onConflict:'environment_key,slot_id,calibration_state'});if(error)throw new Error('Forest calibration could not be published.');
}

export async function saveForestView(environment:string,view:ForestViewConfig,state:'draft'|'published'){
  const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in to save Forest framing.');
  const{error}=await supabase.from('forest_environment_views').upsert({environment_key:environment,viewport_profile:view.profile,calibration_state:state,position_x:view.positionX,position_y:view.positionY,zoom:view.zoom,scrollable:view.scrollable,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'environment_key,viewport_profile,calibration_state'});
  if(error)throw new Error('Forest framing could not be saved.');
}

export function useForestViewportProfile(){
  const[profile,setProfile]=useState<ForestViewportProfile>(()=>typeof matchMedia==='undefined'||!matchMedia('(max-width: 760px)').matches?'desktop':'mobile');
  useEffect(()=>{const query=matchMedia('(max-width: 760px)'),update=()=>setProfile(query.matches?'mobile':'desktop');update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
  return profile;
}
