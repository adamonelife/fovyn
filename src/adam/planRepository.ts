import type { SupabaseClient } from '@supabase/supabase-js';
import { applyAction, dashboardSections, optionalModules, validatePlan, type Action, type Plan, type Scope, type Settings } from './planning';

const defaultAreas = [
  { key: 'health', source_area_key: 'health', label: 'Health' },
  { key: 'mind', source_area_key: 'mind', label: 'Mind' },
  { key: 'self', source_area_key: 'self', label: 'Self' },
  { key: 'people', source_area_key: 'people', label: 'People' },
  { key: 'work', source_area_key: 'work', label: 'Work' },
  { key: 'wealth', source_area_key: 'wealth', label: 'Wealth' },
];
type StoredSettings = Omit<Settings, 'areas' | 'goal_areas'> & { area_preferences: { areas?: Settings['areas']; goal_areas?: Settings['goal_areas'] } };
type Snapshot = Omit<Plan, 'settings'> & { settings: StoredSettings | null };
export function decodePlan(raw: Snapshot, scope: Scope): Plan {
  const stored = raw.settings;
  const today = new Date().toISOString().slice(0, 10);
  const plan: Plan = { ...raw, settings: {
    owner_id: stored?.owner_id ?? scope.ownerId, is_test: stored?.is_test ?? scope.isTest,
    updated_at: stored?.updated_at,
    programme_name: stored?.programme_name ?? 'My programme', starts_on: stored?.starts_on ?? today, target_on: stored?.target_on ?? today,
    preferred_modules: stored?.preferred_modules ?? [...optionalModules], dashboard_sections: stored?.dashboard_sections ?? [...dashboardSections],
    areas: stored?.area_preferences?.areas ?? structuredClone(defaultAreas), goal_areas: stored?.area_preferences?.goal_areas ?? {},
  } };
  validatePlan(plan, scope);
  return plan;
}
function fail(error: { message: string; code?: string } | null) {
  if (error) throw new Error(error.code === '23505' ? 'This record already exists. Reload to check whether your last save succeeded.' : error.message);
}
// Uses the existing authenticated Supabase client; never a service-role client.
// The local review entry injects a loopback-only disposable PostgreSQL harness.
export function planRepository(client: SupabaseClient, scope: Scope) {
  async function verifyViewer() {
    const { data, error } = await client.auth.getUser();
    fail(error);
    if (data.user?.id !== scope.ownerId) throw new Error('Your account changed. Sign in and reload your plan.');
  }
  return {
    async load(): Promise<Plan> {
      await verifyViewer();
      const { data, error } = await client.rpc('load_my_plan'); fail(error);
      const plan = decodePlan(data, scope);
      await verifyViewer();
      return plan;
    },
    async save(current: Plan, action: Action): Promise<Plan> {
      applyAction(current, action, scope); // Validate without optimistic UI replacement.
      await verifyViewer();
      const { data, error } = await client.rpc('save_plan_action', {
        p_kind: action.type, p_value: action.value, p_expected: action.value.updated_at ?? null,
        p_focus_area: action.type === 'goal' ? action.focusArea ?? null : null,
        p_settings_expected: current.settings.updated_at ?? null,
      }); fail(error);
      const plan = decodePlan(data, scope);
      await verifyViewer();
      return plan;
    },
  };
}
