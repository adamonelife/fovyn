import type { Exercise, ExerciseRule, LoggedExercise, SetPerformance, WorkoutExercise, WorkoutTemplateRow } from "@/types/training";

export function latestForExercise(logs: LoggedExercise[], exerciseId: string): LoggedExercise | null {
  const matches = logs.filter((log) => log.exerciseId === exerciseId);
  if (!matches.length) return null;
  return matches.sort((a, b) => {
    const dateCompare = (b.date || "").localeCompare(a.date || "");
    if (dateCompare !== 0) return dateCompare;
    return Number(b.sessionId || 0) - Number(a.sessionId || 0);
  })[0];
}

function isBodyweightExercise(exercise: Exercise): boolean {
  return exercise.equipment === "Bodyweight" || exercise.equipment === "Pull-up Bar";
}

function activeSets(last: LoggedExercise | null, exercise: Exercise): SetPerformance[] {
  const defaultKg = isBodyweightExercise(exercise) ? "0" : "";
  if (!last) return Array.from({ length: exercise.defaultSets }, () => ({ kg: defaultKg, value: null }));
  const nonEmpty = last.sets.filter((set) => set.kg || set.value !== null);
  return nonEmpty.length ? nonEmpty.map((set) => ({ ...set, kg: set.kg || (isBodyweightExercise(exercise) ? "0" : "") })) : Array.from({ length: exercise.defaultSets }, () => ({ kg: defaultKg, value: null }));
}

function increaseWeakest(values: number[], max: number): number[] {
  const next = [...values];
  let index = 0;
  for (let i = 1; i < next.length; i += 1) if (next[i] < next[index]) index = i;
  if (next[index] < max) next[index] += 1;
  return next;
}

function ruleCapKg(rule?: ExerciseRule | null): number | null {
  if (!rule || !["HARD_CAP", "EQUIPMENT_CAP"].includes(rule.ruleType)) return null;
  const match = rule.condition.match(/(\d+(?:\.\d+)?)\s*kg/i);
  return match ? Number(match[1]) : null;
}

function ruleTargetValue(rule: ExerciseRule | null | undefined, fallback: number): number {
  if (!rule) return fallback;
  const range = rule.condition.match(/\d+\s*x\s*\d+\s*-\s*(\d+)/i);
  if (range) return Number(range[1]);
  const exact = rule.condition.match(/\d+\s*x\s*(\d+)/i);
  return exact ? Number(exact[1]) : fallback;
}

function actionIncrement(rule: ExerciseRule | null | undefined, fallback: number): number {
  const match = rule?.action.match(/add\s+(\d+(?:\.\d+)?)\s*kg/i);
  return match ? Number(match[1]) : fallback;
}

function addWeight(prior: SetPerformance[], increment: number, resetValue: number, cap: number | null): SetPerformance[] {
  return prior.map((set) => {
    const numericWeight = Number(set.kg);
    if (!Number.isFinite(numericWeight)) return { ...set, value: resetValue };
    const proposed = numericWeight + increment;
    const nextWeight = cap === null ? proposed : Math.min(proposed, cap);
    return { kg: String(nextWeight), value: resetValue };
  });
}

export function calculateTarget(exercise: Exercise, last: LoggedExercise | null, rule?: ExerciseRule | null): SetPerformance[] {
  const prior = activeSets(last, exercise);
  if (!last) return prior;

  if (rule?.ruleType === "FIXED" || rule?.ruleType === "QUALITY" || exercise.progressionType === "Fixed" || exercise.progressionType === "Quality") return prior;

  const values = prior.map((set) => set.value ?? exercise.minReps ?? 0);
  const configuredMax = exercise.maxReps ?? Math.max(...values);
  const targetMax = ruleTargetValue(rule, configuredMax);
  const completedMax = values.length > 0 && values.every((value) => value >= targetMax);

  if (rule?.ruleType === "TIME_CAP" || rule?.ruleType === "REP_CAP") {
    if (completedMax) return prior.map((set) => ({ ...set, value: Math.min(set.value ?? targetMax, targetMax) }));
    const progressed = increaseWeakest(values, targetMax);
    return prior.map((set, index) => ({ kg: set.kg, value: progressed[index] }));
  }

  const cap = ruleCapKg(rule);
  const atCap = cap !== null && prior.every((set) => Number(set.kg) >= cap);
  if (atCap) {
    if (completedMax) return prior.map((set) => ({ ...set, kg: String(cap) }));
    const progressed = increaseWeakest(values, targetMax);
    return prior.map((set, index) => ({ kg: String(cap), value: progressed[index] }));
  }

  if (completedMax && exercise.incrementKg > 0) {
    const increment = actionIncrement(rule, exercise.incrementKg);
    return addWeight(prior, increment, exercise.minReps ?? targetMax, cap);
  }

  const progressed = increaseWeakest(values, targetMax);
  return prior.map((set, index) => ({ kg: set.kg, value: progressed[index] }));
}

export function buildWorkout(
  workoutType: string,
  variant: string,
  templates: WorkoutTemplateRow[],
  exercises: Exercise[],
  logs: LoggedExercise[],
  rules: ExerciseRule[] = [],
): WorkoutExercise[] {
  const byId = new Map(exercises.map((exercise) => [exercise.exerciseId, exercise]));
  const rulesByExercise = new Map(rules.filter((rule) => rule.active).map((rule) => [rule.exerciseId, rule]));
  return templates
    .filter((row) => row.workoutType.trim() === workoutType.trim() && row.variant.trim() === variant.trim())
    .sort((a, b) => a.order - b.order)
    .map((row) => {
      const exercise = byId.get(row.defaultExerciseId);
      if (!exercise) throw new Error(`Template references missing exercise: ${row.defaultExerciseId}`);
      const last = latestForExercise(logs, exercise.exerciseId);
      const rule = rulesByExercise.get(exercise.exerciseId) ?? null;
      return {
        order: row.order,
        slotName: row.slotName,
        group: row.group,
        exercise,
        rule,
        last,
        target: calculateTarget(exercise, last, rule),
      };
    });
}
