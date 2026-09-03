import{useEffect,useState}from'react';
import{supabase}from'./supabase';
import type{ForestSlot}from'./forestLayout';

type SlotRow={environment_key:string;slot_id:string;calibration_state:'draft'|'published';source_x:number;source_y:number;depth:ForestSlot['depth'];tree_scale:number;z_index:number;label_anchor:ForestSlot['labelAnchor'];label_offset_x:number;label_offset_y:number;card_direction:NonNullable<ForestSlot['preferredCardDirection']>;enabled:boolean};
const rowToSlot=(row:SlotRow):ForestSlot=>({id:row.slot_id,x:Number(row.source_x),y:Number(row.source_y),depth:row.depth,scale:Number(row.tree_scale),zIndex:row.z_index,labelAnchor:row.label_anchor,labelAnchorX:Number(row.label_offset_x),labelAnchorY:Number(row.label_offset_y),preferredCardDirection:row.card_direction,enabled:row.enabled});

export function mergeForestSlotLayers(defaults:readonly ForestSlot[],published:readonly ForestSlot[],drafts:readonly ForestSlot[]){
  const merged=new Map(defaults.map(slot=>[slot.id,{...slot}]));
  for(const slot of published)merged.set(slot.id,{...merged.get(slot.id),...slot});
  for(const slot of drafts)merged.set(slot.id,{...merged.get(slot.id),...slot});
  return[...merged.values()];
}

export async function loadForestSlots(environment:string,state:'draft'|'published'='published'){
  const{data,error}=await supabase.from('forest_environment_slots').select('environment_key,slot_id,calibration_state,source_x,source_y,depth,tree_scale,z_index,label_anchor,label_offset_x,label_offset_y,card_direction,enabled').eq('environment_key',environment).eq('calibration_state',state).order('slot_id');
  if(error){console.warn('Forest calibration unavailable',{environment,state});return[]}
  return(data as SlotRow[]).map(rowToSlot);
}

export function usePublishedForestSlots(environment:string,fallback:readonly ForestSlot[]){
  const[slots,setSlots]=useState<readonly ForestSlot[]>(fallback);
  useEffect(()=>{let current=true;setSlots(fallback);loadForestSlots(environment).then(rows=>{if(current&&rows.length)setSlots(rows)});return()=>{current=false}},[environment,fallback]);
  return slots;
}

export async function saveForestSlotDraft(environment:string,slot:ForestSlot){
  const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in to save Forest calibration.');
  const{error}=await supabase.from('forest_environment_slots').upsert({environment_key:environment,slot_id:slot.id,calibration_state:'draft',source_x:slot.x,source_y:slot.y,depth:slot.depth,tree_scale:slot.scale,z_index:slot.zIndex,label_anchor:slot.labelAnchor,label_offset_x:slot.labelAnchorX??0,label_offset_y:slot.labelAnchorY??.015,card_direction:slot.preferredCardDirection??'auto',enabled:slot.enabled!==false,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'environment_key,slot_id,calibration_state'});
  if(error)throw new Error('Forest draft could not be saved.');
}

export async function saveForestSlotsDraft(environment:string,slots:readonly ForestSlot[]){
  const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in to save Forest calibration.');
  const rows=slots.map(slot=>({environment_key:environment,slot_id:slot.id,calibration_state:'draft',source_x:slot.x,source_y:slot.y,depth:slot.depth,tree_scale:slot.scale,z_index:slot.zIndex,label_anchor:slot.labelAnchor,label_offset_x:slot.labelAnchorX??0,label_offset_y:slot.labelAnchorY??.015,card_direction:slot.preferredCardDirection??'auto',enabled:slot.enabled!==false,updated_by:user.id,updated_at:new Date().toISOString()}));
  const{error}=await supabase.from('forest_environment_slots').upsert(rows,{onConflict:'environment_key,slot_id,calibration_state'});if(error)throw new Error('Forest draft could not be saved.');
}

export async function publishForestSlots(environment:string,slots:ForestSlot[]){
  const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in to publish Forest calibration.');
  const rows=slots.map(slot=>({environment_key:environment,slot_id:slot.id,calibration_state:'published',source_x:slot.x,source_y:slot.y,depth:slot.depth,tree_scale:slot.scale,z_index:slot.zIndex,label_anchor:slot.labelAnchor,label_offset_x:slot.labelAnchorX??0,label_offset_y:slot.labelAnchorY??.015,card_direction:slot.preferredCardDirection??'auto',enabled:slot.enabled!==false,updated_by:user.id,updated_at:new Date().toISOString()}));
  const{error}=await supabase.from('forest_environment_slots').upsert(rows,{onConflict:'environment_key,slot_id,calibration_state'});if(error)throw new Error('Forest calibration could not be published.');
}
