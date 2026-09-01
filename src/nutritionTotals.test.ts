import{describe,expect,it}from'vitest';
import{nutritionTotals}from'./NutritionModule';
import type{NutritionEntry}from'./nutritionRepository';

const entry=(calories:number,protein_g:number,carbs_g:number,fat_g:number,fibre_g:number)=>({calories,protein_g,carbs_g,fat_g,fibre_g} as NutritionEntry);
describe('derived Nutrition totals',()=>{
  it('adds every entry in a meal without creating a total record',()=>expect(nutritionTotals([entry(682,57.8,72.3,18.5,5.5),entry(258,32.2,2.6,4.9,0)])).toEqual({calories:940,protein_g:90,carbs_g:74.9,fat_g:23.4,fibre_g:5.5}));
  it('counts the same consumed item more than once',()=>expect(nutritionTotals([entry(258,32.2,2.6,4.9,0),entry(258,32.2,2.6,4.9,0)])).toMatchObject({calories:516,protein_g:64.4}));
});
