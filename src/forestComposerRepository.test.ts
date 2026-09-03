import{describe,expect,it}from'vitest';
import{alignForestSlotsAcrossMiddle,mergeForestSlotLayers}from'./forestComposerRepository';
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
});
