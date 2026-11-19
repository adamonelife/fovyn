import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ owner: 'user-a' as string | null, context: 'real' as 'real' | 'test', save: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: state.owner ? { user: { id: state.owner } } : null }, error: null }) } } }));
vi.mock('./appConfig', () => ({ appConfig: { supabaseUrl: 'https://synthetic.invalid', environment: 'development' } }));
vi.mock('./testMode', () => ({ getDataContext: () => state.context }));
vi.mock('./trainingRepository', () => ({ saveWorkout: state.save }));
import { hasUnassignedWorkoutDrafts, queueWorkout, queuedWorkouts, syncQueuedWorkouts, workoutQueueKey } from './trainingOffline';
const storage = new Map<string, string>();
const payload = { date: '2026-11-02', type: 'Pull', variant: 'A', items: [] };
beforeEach(() => { storage.clear(); state.owner = 'user-a'; state.context = 'real'; state.save.mockReset(); vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }); });
describe('private offline drafts', () => {
  it('preserves the payload under the explicit owner and environment', async () => {
    await queueWorkout(payload); expect(await queuedWorkouts()).toMatchObject([{ scope: { ownerId: 'user-a', context: 'real', environment: 'development' }, payload }]);
  });
  it('does not show or replay another account’s drafts', async () => {
    await queueWorkout(payload); state.owner = 'user-b'; expect(await queuedWorkouts()).toEqual([]); await syncQueuedWorkouts(); expect(state.save).not.toHaveBeenCalled(); state.owner = 'user-a'; expect(await queuedWorkouts()).toHaveLength(1);
  });
  it('separates real and test drafts', async () => {
    await queueWorkout(payload); state.context = 'test'; expect(await queuedWorkouts()).toEqual([]); await queueWorkout({ ...payload, variant: 'B' }); state.context = 'real'; expect((await queuedWorkouts())[0].payload.variant).toBe('A');
  });
  it('never assigns the legacy queue to the current account', async () => {
    const old = JSON.stringify([{ id: 'legacy', payload }]); storage.set('forbair-pending-workouts-v1', old); expect(hasUnassignedWorkoutDrafts()).toBe(true); expect(await queuedWorkouts()).toEqual([]); await syncQueuedWorkouts(); expect(storage.get('forbair-pending-workouts-v1')).toBe(old);
  });
  it('retains drafts and makes zero writes during concurrent or repeated sync', async () => {
    await queueWorkout(payload); await Promise.all([syncQueuedWorkouts(), syncQueuedWorkouts()]); await syncQueuedWorkouts(); expect(await queuedWorkouts()).toHaveLength(1); expect(state.save).not.toHaveBeenCalled();
  });
  it('fails closed when signed out', async () => { state.owner = null; await expect(queueWorkout(payload)).rejects.toThrow('Sign in'); expect(storage.size).toBe(0); });
  it('does not overwrite malformed or foreign-owned stored data', async () => {
    const key = workoutQueueKey({ ownerId: 'user-a', context: 'real', project: 'https://synthetic.invalid', environment: 'development' });
    storage.set(key, '{broken'); await expect(queueWorkout(payload)).rejects.toThrow('preserved'); expect(storage.get(key)).toBe('{broken');
    const foreign = JSON.stringify([{ id: 'x', scope: { ownerId: 'user-b' }, payload }]); storage.set(key, foreign); await expect(queuedWorkouts()).rejects.toThrow('ownership'); expect(storage.get(key)).toBe(foreign);
  });
});
