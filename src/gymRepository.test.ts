import {describe,expect,it} from 'vitest';
import {exerciseSearchText,rankExercise} from './gymRepository';
const base={exerciseName:'Incline Machine Press',variationLabel:'Single-Arm Machine',familyName:'Incline Chest Press',equipment:'Machine',aliases:['1 hand incline press'],movementFamilyId:'family-a'};
describe('gym exercise selection',()=>{
 it('matches common aliases without AI',()=>expect(exerciseSearchText(base)).toContain('1 hand incline press'));
 it('prioritises the intended movement family',()=>expect(rankExercise(base,{familyId:'family-a'})).toBeGreaterThan(rankExercise({...base,movementFamilyId:'other'},{familyId:'family-a'})));
 it('prioritises available and preferred gym variations',()=>expect(rankExercise({...base,gymAvailable:true,gymPreferred:true},{familyId:'family-a'})).toBe(160));
 it('does not merge progression identities',()=>expect({...base,exerciseId:'machine'}.exerciseId).not.toBe({...base,exerciseId:'dumbbell'}.exerciseId));
});