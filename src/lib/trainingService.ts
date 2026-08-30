import { appendRows, readSheet, sheetName } from "@/lib/googleSheets";
import { buildWorkout, calculateTarget, latestForExercise } from "@/lib/gymEngine";
import { normalizeSheetDate, parseExercises, parseLog, parseRules, parseTemplates } from "@/lib/parsers";
import type { CardioEntry, SaveWorkoutPayload } from "@/types/training";

function safeNumber(value: number | null | undefined): number | string {
  return value ?? "";
}

export async function loadWorkout(workoutType: string, variant: string) {
  const [exerciseRows, templateRows, logRows, ruleRows] = await Promise.all([
    readSheet(`${sheetName("SHEET_EXERCISES", "Exercise Library")}!A:Z`),
    readSheet(`${sheetName("SHEET_TEMPLATES", "Workout Templates")}!A:Z`),
    readSheet(`${sheetName("SHEET_LOG", "Workout Log")}!A:Z`),
    readSheet(`${sheetName("SHEET_RULES", "Rules")}!A:Z`),
  ]);

  const exercises = parseExercises(exerciseRows).filter((exercise) => exercise.active);
  const templates = parseTemplates(templateRows);
  const logs = parseLog(logRows);
  const rules = parseRules(ruleRows);
  const rulesByExercise = new Map(rules.map((rule) => [rule.exerciseId, rule]));
  const workout = buildWorkout(workoutType, variant, templates, exercises, logs, rules);
  const exerciseSnapshots = Object.fromEntries(exercises.map((exercise) => {
    const last = latestForExercise(logs, exercise.exerciseId);
    const rule = rulesByExercise.get(exercise.exerciseId) ?? null;
    return [exercise.exerciseId, { last, rule, target: calculateTarget(exercise, last, rule) }];
  }));

  return { workoutType, variant, exercises: workout, exerciseLibrary: exercises, exerciseSnapshots };
}

async function nextNumericId(tab: string): Promise<string> {
  const rows = await readSheet(`${tab}!A:A`);
  const ids = rows.slice(1).map((row) => Number(row[0])).filter(Number.isFinite);
  return String((ids.length ? Math.max(...ids) : 0) + 1);
}

export async function saveWorkout(payload: SaveWorkoutPayload): Promise<string> {
  if (!payload.workoutType || !payload.variant || !payload.date || !payload.exercises?.length) {
    throw new Error("Missing workout details");
  }

  const sessionsTab = sheetName("SHEET_SESSIONS", "Sessions");
  const logTab = sheetName("SHEET_LOG", "Workout Log");
  const sessionId = await nextNumericId(sessionsTab);

  // Keep the legacy sheet write shape intact until the verified Supabase cutover.
  await appendRows(`${sessionsTab}!A:J`, [[
    sessionId, payload.date, payload.workoutType, payload.variant,
    safeNumber(payload.bodyweightKg), safeNumber(payload.durationMin),
    safeNumber(payload.watchCalories), safeNumber(payload.energy),
    safeNumber(payload.sleepHours), payload.notes || "",
  ]]);

  const logRows = payload.exercises.map((exercise) => {
    const sets = [...exercise.sets, ...Array.from({ length: 4 }, () => ({ kg: "", value: null }))].slice(0, 4);
    return [
      sessionId, payload.date, payload.workoutType, payload.variant, exercise.order,
      exercise.slotName, exercise.exerciseId, exercise.exerciseName,
      sets[0].kg, safeNumber(sets[0].value), sets[1].kg, safeNumber(sets[1].value),
      sets[2].kg, safeNumber(sets[2].value), sets[3].kg, safeNumber(sets[3].value),
      safeNumber(exercise.rpe), exercise.notes || "",
    ];
  });
  await appendRows(`${logTab}!A:R`, logRows);
  return sessionId;
}

export async function listCardio(): Promise<CardioEntry[]> {
  const tab = sheetName("SHEET_CARDIO", "Cardio Log");
  const rows = await readSheet(`${tab}!A:H`);
  return rows.slice(1).filter((r) => r.some(Boolean)).map((r) => ({
    cardioId: r[0] || "",
    date: normalizeSheetDate(r[1] || ""),
    activity: r[2] || "",
    durationMin: Number(r[3] || 0),
    watchCalories: Number(r[4] || 0),
    distanceKm: r[5] ? Number(r[5]) : null,
    averageHr: r[6] ? Number(r[6]) : null,
    notes: r[7] || "",
  }));
}

export async function saveCardio(payload: CardioEntry): Promise<string> {
  if (!payload.date || !payload.activity || !payload.durationMin || !payload.watchCalories) {
    throw new Error("Date, activity, duration and calories are required");
  }
  const tab = sheetName("SHEET_CARDIO", "Cardio Log");
  const rows = await readSheet(`${tab}!A:A`);
  const ids = rows.slice(1).map((row) => Number(String(row[0] || "").replace(/\D/g, ""))).filter(Number.isFinite);
  const cardioId = `C${String((ids.length ? Math.max(...ids) : 0) + 1).padStart(4, "0")}`;
  await appendRows(`${tab}!A:H`, [[
    cardioId, payload.date, payload.activity, payload.durationMin, payload.watchCalories,
    safeNumber(payload.distanceKm), safeNumber(payload.averageHr), payload.notes || "",
  ]]);
  return cardioId;
}
