import { supabase } from './supabase';
import { appConfig } from './appConfig';
import { getDataContext } from './testMode';
import type { loadWorkout } from './trainingRepository';

type WorkoutData = Awaited<ReturnType<typeof loadWorkout>>;
export type WorkoutSelection = { type: string; variant: string; manual: boolean; templateId?: string; gymId?: string };
export type WorkoutCacheScope = { ownerId: string; context: string; project: string; environment: string };

export function workoutReadCacheKey(scope: WorkoutCacheScope, selection: WorkoutSelection) {
  return `fovyn-workout-read-v2:${JSON.stringify([scope.project, scope.environment, scope.ownerId, scope.context, selection.type, selection.variant, selection.manual, selection.templateId ?? null, selection.gymId ?? null])}`;
}

async function currentScope(): Promise<WorkoutCacheScope> {
  // Namespace browser copies only. Server requests still enforce authentication and RLS.
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user.id) throw new Error('Sign in to load a workout.');
  return { ownerId: data.session.user.id, context: getDataContext(), project: appConfig.supabaseUrl, environment: appConfig.environment };
}

export async function loadWorkoutWithCache(selection: WorkoutSelection, load: () => Promise<WorkoutData>, active = () => true) {
  const scope = await currentScope();
  const key = workoutReadCacheKey(scope, selection);
  const assertCurrent = async () => {
    if (!active() || workoutReadCacheKey(await currentScope(), selection) !== key || !active()) {
      throw new Error('Workout account or data context changed. Reopen the workout.');
    }
  };
  let data: WorkoutData;
  try {
    data = await load();
  } catch (error) {
    await assertCurrent();
    // Never read or assign the legacy unowned cache to a signed-in account.
    try {
      const cached = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (cached?.key !== key || !cached.data || !['exercises', 'rules', 'logs', 'items'].every(field => Array.isArray(cached.data[field]))) throw error;
      return { data: cached.data as WorkoutData, offline: true };
    } catch { throw error; }
  }
  await assertCurrent();
  // Storage full/blocked must not replace a successful online result with stale data.
  try { localStorage.setItem(key, JSON.stringify({ key, data })); } catch { /* Online data remains usable. */ }
  return { data, offline: false };
}
