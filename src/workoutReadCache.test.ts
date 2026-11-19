import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ owner: 'a' as string | null, context: 'real', project: 'local-project', environment: 'development' }));
vi.mock('./supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: state.owner ? { user: { id: state.owner } } : null }, error: null }) } } }));
vi.mock('./appConfig', () => ({ appConfig: { get supabaseUrl() { return state.project; }, get environment() { return state.environment; } } }));
vi.mock('./testMode', () => ({ getDataContext: () => state.context }));
import { loadWorkoutWithCache } from './workoutReadCache';
const selection = { type: 'Pull', variant: 'A', manual: false, templateId: 'template-a' };
const snapshot = { exercises: [], rules: [], logs: [], items: [] };
const storage = new Map<string, string>();
const offline = async (): Promise<typeof snapshot> => { throw new Error('Network unavailable'); };
beforeEach(() => {
  storage.clear(); Object.assign(state, { owner: 'a', context: 'real', project: 'local-project', environment: 'development' });
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
});
describe('workout read-cache isolation', () => {
  it('restores only the returning account’s offline copy across A → B → A', async () => {
    await loadWorkoutWithCache(selection, async () => snapshot);
    state.owner = 'b';
    await expect(loadWorkoutWithCache(selection, offline)).rejects.toThrow('Network');
    await loadWorkoutWithCache(selection, async () => ({ ...snapshot, logs: [] }));
    expect(storage.size).toBe(2);
    state.owner = 'a';
    expect(await loadWorkoutWithCache(selection, offline)).toEqual({ data: snapshot, offline: true });
  });
  it.each(['context', 'project', 'environment'] as const)('isolates %s', async field => {
    await loadWorkoutWithCache(selection, async () => snapshot);
    state[field] = 'other';
    await expect(loadWorkoutWithCache(selection, offline)).rejects.toThrow('Network');
  });
  it.each([{ templateId: 'template-b' }, { type: 'Push' }, { variant: 'B' }, { manual: true }])('isolates workout selection %j', async change => {
    await loadWorkoutWithCache(selection, async () => snapshot);
    await expect(loadWorkoutWithCache({ ...selection, ...change }, offline)).rejects.toThrow('Network');
  });
  it('ignores and preserves legacy unowned copies', async () => {
    const key = 'forbair-workout-cache:Pull:A:false';
    const text = JSON.stringify(snapshot); storage.set(key, text);
    await expect(loadWorkoutWithCache(selection, offline)).rejects.toThrow('Network');
    expect(storage.get(key)).toBe(text); expect(storage.size).toBe(1);
  });
  it('rejects signed-out access', async () => {
    await loadWorkoutWithCache(selection, async () => snapshot); state.owner = null;
    const load = vi.fn(offline);
    await expect(loadWorkoutWithCache(selection, load)).rejects.toThrow('Sign in'); expect(load).not.toHaveBeenCalled();
  });
  it.each([true, false])('rejects in-flight account switches (online=%s)', async online => {
    await loadWorkoutWithCache(selection, async () => snapshot);
    await expect(loadWorkoutWithCache(selection, async () => { state.owner = 'b'; if (!online) return offline(); return snapshot; })).rejects.toThrow('changed');
    expect(storage.size).toBe(1);
  });
  it('rejects in-flight context switches and unmounted requests', async () => {
    await expect(loadWorkoutWithCache(selection, async () => { state.context = 'test'; return snapshot; })).rejects.toThrow('changed');
    expect(storage.size).toBe(0);
    await expect(loadWorkoutWithCache(selection, async () => snapshot, () => false)).rejects.toThrow('changed');
    expect(storage.size).toBe(0);
  });
  it('rejects malformed or mismatched scoped copies without overwriting them', async () => {
    await loadWorkoutWithCache(selection, async () => snapshot);
    const key = [...storage.keys()][0];
    for (const invalid of ['{broken', JSON.stringify({ key: 'foreign', data: snapshot }), JSON.stringify({ key, data: {} })]) {
      storage.set(key, invalid); await expect(loadWorkoutWithCache(selection, offline)).rejects.toThrow('Network'); expect(storage.get(key)).toBe(invalid);
    }
  });
  it('keeps successful online data when browser storage is blocked', async () => {
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('Quota'); } });
    expect(await loadWorkoutWithCache(selection, async () => snapshot)).toEqual({ data: snapshot, offline: false });
  });
});
