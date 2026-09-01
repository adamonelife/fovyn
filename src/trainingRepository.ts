// Supabase's generated runtime checks are performed after every query via fail().
// @ts-nocheck
import { supabase } from "./supabase";
import {
  buildWorkout,
  type Exercise,
  type ExerciseRule,
  type LoggedExercise,
  type SetPerformance,
  type TemplateSlot,
} from "./trainingEngine";

const fail = (label: string, error: { message: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message}`);
};
export async function requireOwner() {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in to load Training");
  return data.user.id;
}
export async function listTemplates() {
  const owner = await requireOwner();
  const { data, error } = await supabase!
    .from("training_templates")
    .select("workout_type,variant")
    .eq("owner_id", owner)
    .order("workout_type")
    .order("variant");
  fail("Templates", error);
  return (data ?? []).map((x) => ({
    type: x.workout_type as string,
    variant: x.variant as string,
  }));
}
export async function loadWorkout(
  type: string,
  variant: string,
  manual = false,
) {
  const owner = await requireOwner();
  const [ex, ru, se] = await Promise.all([
    supabase!
      .from("training_exercises")
      .select("*")
      .eq("owner_id", owner)
      .eq("active", true),
    supabase!
      .from("training_rules")
      .select("*")
      .eq("owner_id", owner)
      .eq("active", true),
    supabase!
      .from("training_sessions")
      .select("id,legacy_session_id,performed_on")
      .eq("owner_id", owner),
  ]);
  fail("Exercises", ex.error);
  fail("Rules", ru.error);
  fail("Sessions", se.error);
  const exercises: Exercise[] = (ex.data ?? []).map((r) => ({
    exerciseId: r.exercise_key,
    exerciseName: r.name,
    group: r.muscle_group,
    equipment: r.equipment ?? "",
    defaultSets: r.default_sets,
    minReps: r.min_target === null ? null : Number(r.min_target),
    maxReps: r.max_target === null ? null : Number(r.max_target),
    incrementKg: Number(r.increment_kg),
    progressionType: r.progression_type,
    active: r.active,
    trackingType: r.measurement_type,
  }));
  const idToKey = new Map((ex.data ?? []).map((r) => [r.id, r.exercise_key]));
  const rules: ExerciseRule[] = (ru.data ?? []).map((r) => ({
    ruleId: r.rule_key,
    exerciseId: idToKey.get(r.exercise_id) ?? "",
    ruleType: r.rule_type,
    condition: r.condition_text ?? "",
    action: r.action_text ?? "",
    active: r.active,
  }));
  const sessionIds = (se.data ?? []).map((x) => x.id);
  let logs: LoggedExercise[] = [];
  if (sessionIds.length) {
    const le = await supabase!
      .from("training_session_exercises")
      .select("id,session_id,exercise_id")
      .in("session_id", sessionIds);
    fail("History", le.error);
    const sets = le.data?.length
      ? await supabase!
          .from("training_sets")
          .select("*")
          .in(
            "session_exercise_id",
            le.data.map((x) => x.id),
          )
          .order("set_number")
      : { data: [], error: null };
    fail("Sets", sets.error);
    const sessionById = new Map((se.data ?? []).map((x) => [x.id, x]));
    logs = (le.data ?? [])
      .map((row) => {
        const session = sessionById.get(row.session_id);
        return {
          sessionId: String(session?.legacy_session_id ?? session?.id ?? ""),
          date: session?.performed_on ?? "",
          exerciseId: idToKey.get(row.exercise_id) ?? "",
          sets: (sets.data ?? [])
            .filter((s) => s.session_exercise_id === row.id)
            .map((s) => ({
              kg:
                s.load_label === "BW"
                  ? "0"
                  : s.load_kg === null
                    ? ""
                    : String(s.load_kg),
              value: s.target_value === null ? null : Number(s.target_value),
            })),
        };
      })
      .filter((x) => x.exerciseId);
  }
  if (manual) return { exercises, items: [], rules, logs };
  const template = await supabase!
    .from("training_templates")
    .select("id")
    .eq("owner_id", owner)
    .eq("workout_type", type)
    .eq("variant", variant)
    .single();
  fail("Template", template.error);
  const slots = await supabase!
    .from("training_template_slots")
    .select("*")
    .eq("template_id", template.data.id)
    .order("position");
  fail("Template exercises", slots.error);
  const mapped: TemplateSlot[] = (slots.data ?? []).map((r) => ({
    workoutType: type,
    variant,
    order: r.position,
    slotName: r.slot_name,
    group: r.muscle_group,
    defaultExerciseId: idToKey.get(r.default_exercise_id) ?? "",
    required: r.required,
  }));
  return {
    exercises,
    rules,
    logs,
    items: buildWorkout(type, variant, mapped, exercises, logs, rules),
  };
}

export type WorkoutSave = {
  date: string;
  type: string;
  variant: string;
  duration?: number;
  bodyweight?: number;
  calories?: number;
  energy?: number;
  sleep?: number;
  notes?: string;
  sessionType?:'normal'|'light'|'rehab';
  items: Array<{
    exerciseId: string;
    exerciseName: string;
    slotName: string;
    sets: SetPerformance[];
    rpe?: number;
    notes?: string;
  }>;
};
export function missingWorkoutExerciseKeys(payload:WorkoutSave,available:string[]){const known=new Set(available);return[...new Set(payload.items.map(item=>item.exerciseId).filter(key=>!known.has(key)))]}
export async function saveWorkout(payload: WorkoutSave) {
  const owner = await requireOwner();
  const ids = await supabase!
    .from("training_exercises")
    .select("id,exercise_key")
    .eq("owner_id", owner)
    .in(
      "exercise_key",
      payload.items.map((x) => x.exerciseId),
    );
  fail("Exercise lookup", ids.error);
  const missing=missingWorkoutExerciseKeys(payload,(ids.data??[]).map(x=>x.exercise_key));
  if(missing.length)throw new Error(`Workout not saved: ${missing.length} exercise${missing.length===1?' is':'s are'} no longer available.`);
  const byKey = new Map((ids.data ?? []).map((x) => [x.exercise_key, x.id]));
  const session = await supabase!
    .from("training_sessions")
    .insert({
      owner_id: owner,
      performed_on: payload.date,
      workout_type: payload.type,
      variant: payload.variant,
      bodyweight_kg: payload.bodyweight ?? null,
      duration_min: payload.duration ?? null,
      watch_calories: payload.calories ?? null,
      energy: payload.energy ?? null,
      sleep_hours: payload.sleep ?? null,
      notes: payload.notes ?? "",
      session_type:payload.sessionType??'normal',
      source_payload: { source: "unified_forbair_v1" },
    })
    .select("id")
    .single();
  fail("Save session", session.error);
  try{
    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      const row = await supabase!
        .from("training_session_exercises")
        .insert({
          session_id: session.data.id,
          exercise_id: byKey.get(item.exerciseId),
          position: i + 1,
          slot_name: item.slotName,
          exercise_name_snapshot: item.exerciseName,
          rpe: item.rpe ?? null,
          notes: item.notes ?? "",
          source_payload: { source: "unified_forbair_v1" },
        })
        .select("id")
        .single();
      fail(`Save ${item.exerciseName}`, row.error);
      const sets = item.sets.map((s, n) => ({
        session_exercise_id: row.data.id,
        set_number: n + 1,
        load_kg: Number.isFinite(Number(s.kg)) ? Number(s.kg) : null,
        load_label: s.kg.toUpperCase() === "BW" ? "BW" : null,
        target_value: s.value,
      }));
      if (sets.length)
        fail(
          "Save sets",
          (await supabase!.from("training_sets").insert(sets)).error,
        );
    }
  }catch(reason){
    const cleanup=await supabase!.from("training_sessions").delete().eq("id",session.data.id).eq("owner_id",owner);
    if(cleanup.error)throw new Error('Workout save was interrupted and needs attention before retrying.');
    throw reason;
  }
  return session.data.id;
}

export type TrainingSessionType='normal'|'light'|'rehab';
export type TrainingSessionExercise={id:string;exerciseId:string;name:string;slot:string;position:number;rpe:number|null;notes:string|null;sets:Array<{set_number:number;load_kg:number|null;load_label:string|null;target_value:number|null}>};
export type TrainingSessionDetail={id:string;performed_on:string;workout_type:string;variant:string;session_type:TrainingSessionType;bodyweight_kg:number|null;duration_min:number|null;watch_calories:number|null;energy:number|null;sleep_hours:number|null;notes:string|null;corrected:boolean;exercises:TrainingSessionExercise[]};
export type TrainingSessionCorrection=Pick<TrainingSessionDetail,'performed_on'|'workout_type'|'variant'|'session_type'|'bodyweight_kg'|'duration_min'|'watch_calories'|'energy'|'sleep_hours'|'notes'>;
export function validateTrainingSessionCorrection(input:TrainingSessionCorrection){
  if(!input.performed_on)throw new Error('Choose the workout date.');
  if(!input.workout_type.trim())throw new Error('Workout type is required.');
  if(!input.variant.trim())throw new Error('Variant is required.');
  if(!['normal','light','rehab'].includes(input.session_type))throw new Error('Choose a valid session type.');
  for(const[label,value]of[['Bodyweight',input.bodyweight_kg],['Duration',input.duration_min],['Calories',input.watch_calories],['Energy',input.energy],['Sleep',input.sleep_hours]]as const)if(value!==null&&(!Number.isFinite(value)||value<0))throw new Error(`${label} cannot be negative.`);
}
export function validateTrainingSessionExercises(exercises:TrainingSessionExercise[]){
  if(!exercises.length)throw new Error('A Training session needs at least one exercise.');
  for(const exercise of exercises)for(const set of exercise.sets){if(set.load_kg!==null&&(!Number.isFinite(set.load_kg)||set.load_kg<0))throw new Error(`${exercise.name} has an invalid load.`);if(set.target_value!==null&&(!Number.isFinite(set.target_value)||set.target_value<0))throw new Error(`${exercise.name} has an invalid set value.`)}
}
export async function loadTrainingSession(id:string):Promise<TrainingSessionDetail>{
  const owner=await requireOwner();
  const session=await supabase!.from('training_sessions').select('id,performed_on,workout_type,variant,session_type,bodyweight_kg,duration_min,watch_calories,energy,sleep_hours,notes,source_payload').eq('id',id).eq('owner_id',owner).single();fail('Training session',session.error);
  const exercises=await supabase!.from('training_session_exercises').select('id,exercise_id,position,slot_name,exercise_name_snapshot,rpe,notes').eq('session_id',id).order('position');fail('Session exercises',exercises.error);
  const sets=exercises.data?.length?await supabase!.from('training_sets').select('session_exercise_id,set_number,load_kg,load_label,target_value').in('session_exercise_id',exercises.data.map(row=>row.id)).order('set_number'):{data:[],error:null};fail('Session sets',sets.error);
  const row=session.data,source=row.source_payload as Record<string,unknown>|null;
  return{id:row.id,performed_on:row.performed_on,workout_type:row.workout_type,variant:row.variant,session_type:row.session_type as TrainingSessionType,bodyweight_kg:row.bodyweight_kg==null?null:Number(row.bodyweight_kg),duration_min:row.duration_min==null?null:Number(row.duration_min),watch_calories:row.watch_calories==null?null:Number(row.watch_calories),energy:row.energy==null?null:Number(row.energy),sleep_hours:row.sleep_hours==null?null:Number(row.sleep_hours),notes:row.notes,corrected:Boolean(source?.corrected_at),exercises:(exercises.data??[]).map(item=>({id:item.id,exerciseId:item.exercise_id,name:item.exercise_name_snapshot,slot:item.slot_name,position:item.position,rpe:item.rpe==null?null:Number(item.rpe),notes:item.notes,sets:(sets.data??[]).filter(set=>set.session_exercise_id===item.id).map(set=>({set_number:set.set_number,load_kg:set.load_kg==null?null:Number(set.load_kg),load_label:set.load_label,target_value:set.target_value==null?null:Number(set.target_value)}))}))};
}
export async function correctTrainingSession(id:string,input:TrainingSessionCorrection,exercises:TrainingSessionExercise[]){
  validateTrainingSessionCorrection(input);validateTrainingSessionExercises(exercises);
  const result=await supabase!.rpc('correct_training_session',{p_session_id:id,p_session:input,p_exercises:exercises.map(exercise=>({exercise_id:exercise.exerciseId,name:exercise.name,slot:exercise.slot,position:exercise.position,rpe:exercise.rpe,notes:exercise.notes,sets:exercise.sets}))});fail('Correct Training session',result.error);
}
