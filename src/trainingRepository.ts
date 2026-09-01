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
