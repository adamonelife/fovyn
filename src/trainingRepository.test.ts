import{describe,expect,it}from'vitest';
import{isRecordedRecoverySide,missingWorkoutExerciseKeys,validateTrainingSessionCorrection,validateTrainingSessionExercises,type TrainingSessionCorrection,type WorkoutSave}from'./trainingRepository';

const workout=(keys:string[]):WorkoutSave=>({date:'2026-09-01',type:'Pull',variant:'A',items:keys.map(exerciseId=>({exerciseId,exerciseName:exerciseId,slotName:'Test',sets:[]}))});
describe('recoverable workout saves',()=>{
  it('detects unavailable exercises before creating a session',()=>expect(missingWorkoutExerciseKeys(workout(['VP001','MISSING','MISSING']),['VP001'])).toEqual(['MISSING']));
  it('allows a workout when every exercise is available',()=>expect(missingWorkoutExerciseKeys(workout(['VP001']),['VP001'])).toEqual([]));
});
describe('Recovery side records',()=>{
  it('does not persist untouched rows whose inherited load is zero',()=>expect(isRecordedRecoverySide({load:0})).toBe(false));
  it('persists an entered rep, duration, effort, or non-zero load',()=>{
    expect(isRecordedRecoverySide({load:0,reps:8})).toBe(true);
    expect(isRecordedRecoverySide({durationSeconds:30})).toBe(true);
    expect(isRecordedRecoverySide({load:5})).toBe(true);
  });
});
const correction=(values:Partial<TrainingSessionCorrection>={}):TrainingSessionCorrection=>({performed_on:'2026-09-01',workout_type:'Pull',variant:'A',session_type:'normal',bodyweight_kg:82,duration_min:60,watch_calories:500,energy:7,sleep_hours:7.5,notes:'',...values});
describe('Training session correction',()=>{
  it('accepts valid decimal session facts',()=>expect(()=>validateTrainingSessionCorrection(correction())).not.toThrow());
  it('rejects negative numeric facts',()=>expect(()=>validateTrainingSessionCorrection(correction({sleep_hours:-1}))).toThrow('Sleep cannot be negative'));
  it('requires stable identifying labels',()=>expect(()=>validateTrainingSessionCorrection(correction({workout_type:' '}))).toThrow('Workout type is required'));
  it('accepts only locked session types',()=>expect(()=>validateTrainingSessionCorrection(correction({session_type:'intense' as 'normal'}))).toThrow('Choose a valid session type'));
  it('rejects invalid corrected set values',()=>expect(()=>validateTrainingSessionExercises([{id:'1',exerciseId:'2',name:'Pull-up',slot:'Pull',position:1,rpe:null,notes:null,sets:[{set_number:1,load_kg:-1,load_label:null,target_value:8}]}])).toThrow('invalid load'));
});
