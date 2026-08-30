import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildWorkout, calculateTarget, latestForExercise } from "@/lib/gymEngine";
import type { CardioEntry, Exercise, ExerciseRule, LoggedExercise, ProgressionType, RuleType, SaveWorkoutPayload, TrackingType, WorkoutTemplateRow } from "@/types/training";

function configuredClient(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured for this deployment.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
}

async function authenticated(accessToken: string) {
  if (!accessToken) throw new Error("Please sign in to use FORBAIR.");
  const supabase = configuredClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Your session has expired. Please sign in again.");
  return { supabase, ownerId: data.user.id };
}

function fail(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function loadWorkout(accessToken: string, workoutType: string, variant: string) {
  const { supabase, ownerId } = await authenticated(accessToken);
  const [exerciseResult, ruleResult, templateResult, sessionResult] = await Promise.all([
    supabase.from("training_exercises").select("id,exercise_key,name,muscle_group,equipment,default_sets,min_target,max_target,increment_kg,measurement_type,progression_type,active").eq("owner_id", ownerId),
    supabase.from("training_rules").select("rule_key,exercise_id,rule_type,condition_text,action_text,active").eq("owner_id", ownerId).eq("active", true),
    supabase.from("training_templates").select("id,workout_type,variant").eq("owner_id", ownerId).eq("workout_type", workoutType).eq("variant", variant).maybeSingle(),
    supabase.from("training_sessions").select("id,legacy_session_id,performed_on,workout_type,variant").eq("owner_id", ownerId),
  ]);
  fail("Exercises", exerciseResult.error); fail("Rules", ruleResult.error); fail("Template", templateResult.error); fail("Sessions", sessionResult.error);

  const exerciseRows = exerciseResult.data ?? [];
  const exerciseKeyById = new Map(exerciseRows.map((row) => [row.id, row.exercise_key]));
  const exercises: Exercise[] = exerciseRows.map((row) => ({ exerciseId: row.exercise_key, exerciseName: row.name, group: row.muscle_group, equipment: row.equipment ?? "", defaultSets: row.default_sets, minReps: row.min_target === null ? null : Number(row.min_target), maxReps: row.max_target === null ? null : Number(row.max_target), incrementKg: Number(row.increment_kg), progressionType: row.progression_type as ProgressionType, active: row.active, trackingType: row.measurement_type as TrackingType }));
  const rules: ExerciseRule[] = (ruleResult.data ?? []).map((row) => ({ ruleId: row.rule_key, exerciseId: exerciseKeyById.get(row.exercise_id) ?? "", ruleType: row.rule_type as RuleType, condition: row.condition_text ?? "", action: row.action_text ?? "", active: row.active })).filter((row) => row.exerciseId);

  let templates: WorkoutTemplateRow[] = [];
  if (templateResult.data) {
    const slotResult = await supabase.from("training_template_slots").select("position,slot_name,muscle_group,default_exercise_id,required").eq("template_id", templateResult.data.id).order("position");
    fail("Template slots", slotResult.error);
    templates = (slotResult.data ?? []).map((row) => ({ workoutType, variant, order: row.position, slotName: row.slot_name, group: row.muscle_group, defaultExerciseId: exerciseKeyById.get(row.default_exercise_id) ?? "", required: row.required })).filter((row) => row.defaultExerciseId);
  }

  const sessions = sessionResult.data ?? [];
  const sessionById = new Map(sessions.map((row) => [row.id, row]));
  const sessionIds = sessions.map((row) => row.id);
  let logs: LoggedExercise[] = [];
  if (sessionIds.length) {
    const logResult = await supabase.from("training_session_exercises").select("id,session_id,exercise_id,position,slot_name,exercise_name_snapshot,rpe,notes").in("session_id", sessionIds);
    fail("Workout history", logResult.error);
    const logData = logResult.data ?? [];
    const setResult = logData.length ? await supabase.from("training_sets").select("session_exercise_id,set_number,load_kg,load_label,target_value").in("session_exercise_id", logData.map((row) => row.id)).order("set_number") : { data: [], error: null };
    fail("Workout sets", setResult.error);
    const setsByExercise = new Map<string, Array<{ set_number: number; load_kg: number | null; load_label: string | null; target_value: number | null }>>();
    for (const row of setResult.data ?? []) setsByExercise.set(row.session_exercise_id, [...(setsByExercise.get(row.session_exercise_id) ?? []), row]);
    logs = logData.map((row) => {
      const session = sessionById.get(row.session_id)!;
      return { sessionId: String(session.legacy_session_id ?? session.id), date: session.performed_on, workoutType: session.workout_type, variant: session.variant, order: row.position, slotName: row.slot_name ?? "", exerciseId: exerciseKeyById.get(row.exercise_id) ?? "", exerciseName: row.exercise_name_snapshot, sets: (setsByExercise.get(row.id) ?? []).map((set) => ({ kg: set.load_label === "BW" ? "BW" : set.load_kg === null ? "" : String(set.load_kg), value: set.target_value === null ? null : Number(set.target_value) })), rpe: row.rpe === null ? null : Number(row.rpe), notes: row.notes ?? "" };
    }).filter((row) => row.exerciseId);
  }

  const activeExercises = exercises.filter((exercise) => exercise.active);
  const rulesByExercise = new Map(rules.map((rule) => [rule.exerciseId, rule]));
  const workout = buildWorkout(workoutType, variant, templates, activeExercises, logs, rules);
  const exerciseSnapshots = Object.fromEntries(activeExercises.map((exercise) => { const last = latestForExercise(logs, exercise.exerciseId); const rule = rulesByExercise.get(exercise.exerciseId) ?? null; return [exercise.exerciseId, { last, rule, target: calculateTarget(exercise, last, rule) }]; }));
  return { workoutType, variant, exercises: workout, exerciseLibrary: activeExercises, exerciseSnapshots };
}

export async function saveWorkout(accessToken: string, payload: SaveWorkoutPayload): Promise<string> {
  if (!payload.workoutType || !payload.variant || !payload.date || !payload.exercises?.length) throw new Error("Missing workout details");
  const { supabase, ownerId } = await authenticated(accessToken);
  const latestResult = await supabase.from("training_sessions").select("legacy_session_id").eq("owner_id", ownerId).not("legacy_session_id", "is", null).order("legacy_session_id", { ascending: false }).limit(1).maybeSingle();
  fail("Session number", latestResult.error);
  const legacySessionId = Number(latestResult.data?.legacy_session_id ?? 0) + 1;
  const sessionResult = await supabase.from("training_sessions").insert({ owner_id: ownerId, legacy_session_id: legacySessionId, performed_on: payload.date, workout_type: payload.workoutType, variant: payload.variant, bodyweight_kg: payload.bodyweightKg ?? null, duration_min: payload.durationMin ?? null, watch_calories: payload.watchCalories ?? null, energy: payload.energy ?? null, sleep_hours: payload.sleepHours ?? null, notes: payload.notes ?? "", source_payload: { source: "forbair_app" } }).select("id").single();
  fail("Save session", sessionResult.error);
  if (!sessionResult.data) throw new Error("Save session: no session was returned.");
  const savedSessionId = sessionResult.data.id;
  try {
    const keys = [...new Set(payload.exercises.map((item) => item.exerciseId))];
    const exerciseResult = await supabase.from("training_exercises").select("id,exercise_key").eq("owner_id", ownerId).in("exercise_key", keys);
    fail("Exercise lookup", exerciseResult.error);
    const ids = new Map((exerciseResult.data ?? []).map((row) => [row.exercise_key, row.id]));
    if (ids.size !== keys.length) throw new Error("One or more exercises are missing from your library.");
    for (const item of payload.exercises) {
      const itemResult = await supabase.from("training_session_exercises").insert({ session_id: savedSessionId, exercise_id: ids.get(item.exerciseId), position: item.order, slot_name: item.slotName, exercise_name_snapshot: item.exerciseName, rpe: item.rpe ?? null, notes: item.notes ?? "", source_payload: { source: "forbair_app" } }).select("id").single();
      fail(`Save ${item.exerciseName}`, itemResult.error);
      if (!itemResult.data) throw new Error(`Save ${item.exerciseName}: no exercise was returned.`);
      const savedExerciseId = itemResult.data.id;
      const sets = item.sets.map((set, index) => { const bodyweight = set.kg.trim().toUpperCase() === "BW"; const parsedLoad = Number(set.kg); return { session_exercise_id: savedExerciseId, set_number: index + 1, load_kg: bodyweight ? 0 : Number.isFinite(parsedLoad) ? parsedLoad : null, load_label: bodyweight ? "BW" : null, target_value: set.value }; }).filter((set) => set.load_kg !== null || set.target_value !== null);
      if (sets.length) fail(`Save sets for ${item.exerciseName}`, (await supabase.from("training_sets").insert(sets)).error);
    }
  } catch (error) {
    await supabase.from("training_sessions").delete().eq("id", savedSessionId);
    throw error;
  }
  return String(legacySessionId);
}

export async function listCardio(accessToken: string): Promise<CardioEntry[]> {
  const { supabase, ownerId } = await authenticated(accessToken);
  const result = await supabase.from("cardio_entries").select("legacy_cardio_id,performed_on,activity,duration_min,watch_calories,distance_km,average_hr,notes").eq("owner_id", ownerId).order("performed_on", { ascending: false });
  fail("Cardio history", result.error);
  return (result.data ?? []).map((row) => ({ cardioId: row.legacy_cardio_id ?? "", date: row.performed_on, activity: row.activity, durationMin: Number(row.duration_min), watchCalories: Number(row.watch_calories ?? 0), distanceKm: row.distance_km === null ? null : Number(row.distance_km), averageHr: row.average_hr === null ? null : Number(row.average_hr), notes: row.notes ?? "" }));
}

export async function saveCardio(accessToken: string, payload: CardioEntry): Promise<string> {
  if (!payload.date || !payload.activity || !payload.durationMin || !payload.watchCalories) throw new Error("Date, activity, duration and calories are required");
  const { supabase, ownerId } = await authenticated(accessToken);
  const result = await supabase.from("cardio_entries").select("legacy_cardio_id").eq("owner_id", ownerId).not("legacy_cardio_id", "is", null);
  fail("Cardio number", result.error);
  const maxId = Math.max(0, ...(result.data ?? []).map((row) => Number(String(row.legacy_cardio_id).replace(/\D/g, ""))).filter(Number.isFinite));
  const cardioId = `C${String(maxId + 1).padStart(4, "0")}`;
  fail("Save cardio", (await supabase.from("cardio_entries").insert({ owner_id: ownerId, legacy_cardio_id: cardioId, performed_on: payload.date, activity: payload.activity, duration_min: payload.durationMin, watch_calories: payload.watchCalories, distance_km: payload.distanceKm ?? null, average_hr: payload.averageHr ?? null, notes: payload.notes ?? "", source_payload: { source: "forbair_app" } })).error);
  return cardioId;
}
