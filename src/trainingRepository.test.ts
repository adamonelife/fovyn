import{describe,expect,it}from'vitest';
import{missingWorkoutExerciseKeys,validateTrainingSessionCorrection,type TrainingSessionCorrection,type WorkoutSave}from'./trainingRepository';

const workout=(keys:string[]):WorkoutSave=>({date:'2026-09-01',type:'Pull',variant:'A',items:keys.map(exerciseId=>({exerciseId,exerciseName:exerciseId,slotName:'Test',sets:[]}))});
describe('recoverable workout saves',()=>{
  it('detects unavailable exercises before creating a session',()=>expect(missingWorkoutExerciseKeys(workout(['VP001','MISSING','MISSING']),['VP001'])).toEqual(['MISSING']));
  it('allows a workout when every exercise is available',()=>expect(missingWorkoutExerciseKeys(workout(['VP001']),['VP001'])).toEqual([]));
});
const correction=(values:Partial<TrainingSessionCorrection>={}):TrainingSessionCorrection=>({performed_on:'2026-09-01',workout_type:'Pull',variant:'A',bodyweight_kg:82,duration_min:60,watch_calories:500,energy:7,sleep_hours:7.5,notes:'',...values});
describe('Training session correction',()=>{
  it('accepts valid decimal session facts',()=>expect(()=>validateTrainingSessionCorrection(correction())).not.toThrow());
  it('rejects negative numeric facts',()=>expect(()=>validateTrainingSessionCorrection(correction({sleep_hours:-1}))).toThrow('Sleep cannot be negative'));
  it('requires stable identifying labels',()=>expect(()=>validateTrainingSessionCorrection(correction({workout_type:' '}))).toThrow('Workout type is required'));
});
