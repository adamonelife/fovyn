import type { WorkoutSave } from './trainingRepository';
import { supabase } from './supabase';
import { appConfig } from './appConfig';
import { getDataContext } from './testMode';

// Preserve the unowned v1 queue. Never infer who created those drafts.
const LEGACY_KEY = 'forbair-pending-workouts-v1';
export type QueueScope = { ownerId: string; context: 'real' | 'test'; project: string; environment: string };
export type QueuedWorkout = { id: string; queuedAt: string; scope: QueueScope; payload: WorkoutSave };
export const replayPauseReason = 'Automatic workout replay is paused until saves support safe retries. Your drafts stay on this device.';
export function workoutQueueKey(scope: QueueScope) {
  return `fovyn-workouts-v2:${encodeURIComponent(scope.project)}:${scope.environment}:${scope.ownerId}:${scope.context}`;
}
async function scope(): Promise<QueueScope> {
  // Local session identity namespaces drafts; this does not authorise a server write.
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user.id) throw new Error('Sign in before saving a workout draft on this device.');
  return { ownerId: data.session.user.id, context: getDataContext(), project: appConfig.supabaseUrl, environment: appConfig.environment };
}
function read(current: QueueScope): QueuedWorkout[] {
  const text = localStorage.getItem(workoutQueueKey(current));
  if (!text) return [];
  let rows: unknown;
  try { rows = JSON.parse(text); } catch { throw new Error('Workout drafts could not be read. The stored copy has been preserved.'); }
  if (!Array.isArray(rows)) throw new Error('Workout drafts have an unsupported format. The stored copy has been preserved.');
  if (rows.some(row => !row?.scope || workoutQueueKey(row.scope) !== workoutQueueKey(current) || typeof row.id !== 'string' || !row.payload)) {
    throw new Error('Workout draft ownership could not be verified. No drafts were replayed or changed.');
  }
  return rows;
}
export async function queuedWorkouts() { return read(await scope()); }
export async function queueWorkout(payload: WorkoutSave) {
  const current = await scope();
  const item: QueuedWorkout = { id: crypto.randomUUID(), queuedAt: new Date().toISOString(), scope: current, payload };
  localStorage.setItem(workoutQueueKey(current), JSON.stringify([...read(current), item]));
  return item;
}
export function hasUnassignedWorkoutDrafts() { return localStorage.getItem(LEGACY_KEY) !== null; }
export async function syncQueuedWorkouts() {
  // Existing saveWorkout is multi-request and has no replay idempotency key.
  // Fail closed, including concurrent online/startup handlers; never silently
  // transfer legacy drafts, delete failed saves, or retry an ambiguous write.
  return { synced: 0, remaining: (await queuedWorkouts()).length, pauseReason: replayPauseReason };
}
