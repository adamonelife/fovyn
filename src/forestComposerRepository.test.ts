import{describe,expect,it}from'vitest';
import{alignForestSlotsAcrossMiddle,mergeForestSlotLayers,resetForestSlotsAcrossMiddle}from'./forestComposerRepository';
import type{ForestSlot}from'./forestLayout';

const slot=(id:string,x:number):ForestSlot=>({id,x,y:.5,scale:1,depth:'mid',zIndex:1,labelAnchor:'centre'});

describe('Forest Composer draft layers',()=>{
 it('keeps every environment anchor when only one draft exists',()=>{
  const result=mergeForestSlotLayers([slot('one',.1),slot('two',.2),slot('three',.3)],[],[slot('two',.8)]);
  expect(result.map(item=>item.id)).toEqual(['one','two','three']);
  expect(result.find(item=>item.id==='two')?.x).toBe(.8);
 });

 it('layers drafts over published slots without losing defaults',()=>{
  const result=mergeForestSlotLayers([slot('one',.1),slot('two',.2)],[slot('one',.4)],[slot('two',.9)]);
  expect(result.map(item=>[item.id,item.x])).toEqual([['one',.4],['two',.9]]);
 });

 it('resets every anchor to an evenly spaced line across the middle',()=>{
  const result=alignForestSlotsAcrossMiddle([slot('one',.8),slot('two',.1),slot('three',.6)]);
  expect(result.map(item=>item.x)).toEqual([.25,.5,.75]);
  expect(result.every(item=>item.y===.5)).toBe(true);
 });

 it('creates a fifth calibration anchor before resetting a four-slot environment',()=>{
  const result=resetForestSlotsAcrossMiddle([slot('clearing_slot_01',.1),slot('clearing_slot_02',.2),slot('clearing_slot_03',.3),slot('clearing_slot_04',.4)],5,'clearing');
  expect(result).toHaveLength(5);
  expect(result.map(item=>item.id)).toEqual(['clearing_slot_01','clearing_slot_02','clearing_slot_03','clearing_slot_04','clearing_slot_05']);
  expect(result.map(item=>item.x)).toEqual([1/6,2/6,3/6,4/6,5/6]);
  expect(result.every(item=>item.y===.5)).toBe(true);
 });
});
