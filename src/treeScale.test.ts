import{describe,expect,it}from'vitest';
import{canonicalTreeScales,forestTreeManifest}from'./forestManifest';

describe('canonical Tree relative scale',()=>{
 it('defines one explicit visual scale for every lifecycle stage',()=>{
  expect(canonicalTreeScales).toHaveLength(27);
  expect(forestTreeManifest.map(tree=>tree.defaultScale)).toEqual([...canonicalTreeScales]);
 });

 it('keeps early growth visibly progressive with a meaningful Tree transition',()=>{
  expect(canonicalTreeScales[0]).toBeLessThan(canonicalTreeScales[1]);
  expect(canonicalTreeScales[1]).toBeLessThan(canonicalTreeScales[2]);
  expect(canonicalTreeScales[3]-canonicalTreeScales[2]).toBeGreaterThanOrEqual(.14);
 });

 it('uses morphology rather than a linear stage multiplier',()=>{
  expect(canonicalTreeScales[7]).toBeLessThan(canonicalTreeScales[6]);
  expect(canonicalTreeScales[22]).toBeGreaterThan(canonicalTreeScales[23]);
  expect(canonicalTreeScales[26]).toBeGreaterThan(canonicalTreeScales[22]);
 });

 it('classifies height and footprint independently of source image dimensions',()=>{
  expect(forestTreeManifest[0]).toMatchObject({visualHeightClass:'seed',visualFootprintClass:'tiny'});
  expect(forestTreeManifest[2]).toMatchObject({visualHeightClass:'young_plant',visualFootprintClass:'tiny'});
  expect(forestTreeManifest[22]).toMatchObject({visualHeightClass:'giant_tree',visualFootprintClass:'monumental'});
  expect(forestTreeManifest[26]).toMatchObject({visualHeightClass:'giant_tree',visualFootprintClass:'monumental'});
 });
});
