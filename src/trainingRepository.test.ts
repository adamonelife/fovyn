import{describe,expect,it}from'vitest';
import{missingWorkoutExerciseKeys,type WorkoutSave}from'./trainingRepository';

const workout=(keys:string[]):WorkoutSave=>({date:'2026-09-01',type:'Pull',variant:'A',items:keys.map(exerciseId=>({exerciseId,exerciseName:exerciseId,slotName:'Test',sets:[]}))});
describe('recoverable workout saves',()=>{
  it('detects unavailable exercises before creating a session',()=>expect(missingWorkoutExerciseKeys(workout(['VP001','MISSING','MISSING']),['VP001'])).toEqual(['MISSING']));
  it('allows a workout when every exercise is available',()=>expect(missingWorkoutExerciseKeys(workout(['VP001']),['VP001'])).toEqual([]));
});
