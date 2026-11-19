import { fovynDateKey } from '../fovynDate';
export type DataContext = 'real' | 'test';
export type Viewer = { ownerId: string; context: DataContext; timezone: string };
export type Scope = Viewer & { date: string };
export type Owned = { id: string; owner_id: string; is_test: boolean };
export type TodayGoal = Owned & { title: string; area: string; ends_on: string | null };
export type TodaySchedule = Owned & { title: string; date: string; time: string | null; area: string };
export type TodayRecord = Owned & { schedule_id: string | null; occurred_on: string; deleted_at: string | null };
export type TodayNutrition = Owned & { occurred_on: string; calories: number | null; protein_g: number | null; deleted_at: string | null };
// A read-only port: deliberately no RPC, insert, upsert, update or delete method.
// An eventual hosted adapter must query existing tables with RLS, date bounds,
// owner/context filters and pagination. This batch wires synthetic fixtures only.
export interface TodayReader {
  viewer(): Promise<Viewer>;
  goals(scope: Scope): Promise<TodayGoal[]>;
  schedules(scope: Scope): Promise<TodaySchedule[]>;
  records(scope: Scope): Promise<TodayRecord[]>;
  nutrition(scope: Scope): Promise<TodayNutrition[]>;
}
export function verifiedRows<T extends Owned>(rows: T[], scope: Scope): T[] {
  if (rows.some(row => row.owner_id !== scope.ownerId || row.is_test !== (scope.context === 'test'))) {
    throw new Error('This view received records from another account or data context. Nothing was displayed.');
  }
  return rows;
}
export async function loadToday(reader: TodayReader, now = new Date()) {
  const viewer = await reader.viewer();
  if (!viewer.ownerId) throw new Error('A verified viewer is required.');
  const scope = { ...viewer, date: fovynDateKey(viewer.timezone, now) };
  const [goals, schedules, records, nutrition] = await Promise.all([
    reader.goals(scope), reader.schedules(scope), reader.records(scope), reader.nutrition(scope),
  ]);
  const current = await reader.viewer();
  if (current.ownerId !== viewer.ownerId || current.context !== viewer.context || current.timezone !== viewer.timezone) throw new Error('The account or data context changed. Reload this view.');
  const liveRecords = verifiedRows(records, scope).filter(row => row.occurred_on === scope.date && !row.deleted_at);
  const meals = verifiedRows(nutrition, scope).filter(row => row.occurred_on === scope.date && !row.deleted_at);
  const sum = (key: 'calories' | 'protein_g') => meals.length && meals.every(row => row[key] !== null)
    ? meals.reduce((n, row) => n + (row[key] ?? 0), 0) : null;
  return {
    date: scope.date, timezone: scope.timezone,
    goals: verifiedRows(goals, scope),
    scheduled: verifiedRows(schedules, scope).filter(row => row.date === scope.date).map(row => ({ ...row, done: liveRecords.some(record => record.schedule_id === row.id) })),
    nutrition: { entries: meals.length, calories: sum('calories'), protein: sum('protein_g'), completeness: meals.length ? 'logged-only' as const : 'missing' as const },
  };
}
export type TodayData = Awaited<ReturnType<typeof loadToday>>;
