import type { Plan, Scope } from './planning';
export const syntheticAccounts = [
  { id: '11111111-1111-4111-8111-111111111111', label: 'Founder example', timezone: 'Asia/Makassar' },
  { id: '22222222-2222-4222-8222-222222222222', label: 'Second user example', timezone: 'Europe/London' },
];
// Personal programme values live only in user-owned fixture configuration.
export function createPlan(scope: Scope): Plan {
  const owner = { owner_id: scope.ownerId, is_test: scope.isTest };
  const founder = scope.ownerId === syntheticAccounts[0].id;
  const names = founder ? ['Establish a consistent recovery routine', 'Build a professional portfolio', 'Reconcile personal finances', 'Validate a small venture idea', 'Make time for reading'] : ['Prepare a walking holiday', 'Develop a learning project'];
  const areaKeys = founder ? ['health', 'work', 'wealth', 'work', 'mind'] : ['health', 'mind'];
  const focusKeys = founder ? ['health', 'career', 'wealth', 'ventures', 'life'] : ['health', 'life'];
  const id = (kind: number, index: number) => `${scope.ownerId.slice(0, 8)}-0000-4000-8000-${String(kind * 100 + index).padStart(12, '0')}`;
  const goals = names.map((name, index) => ({ ...owner, id: id(1, index), title: name, description: '', area_key: areaKeys[index], starts_on: '2026-11-01', ends_on: '2027-12-31' }));
  const milestones = goals.map((g, i) => ({ ...owner, id: id(2, i), goal_id: g.id, title: ['Review the first two weeks', 'Finish a first draft', 'Confirm opening balances', 'Write the experiment brief', 'Finish the first book'][i] ?? 'Review the first step', due_on: '2026-11-15', completed_at: null }));
  const tasks = goals.map((g, i) => ({ ...owner, id: id(3, i), goal_id: g.id, milestone_id: milestones[i].id, title: ['Follow the planned recovery session', 'Outline a portfolio case study', 'Check statement opening balances', 'Draft the first project question', 'Read for twenty minutes'][i], due_on: '2026-11-02', scheduled_on: i < 2 ? '2026-11-02' : null, scheduled_time: i === 0 ? '17:30' : i === 1 ? '09:00' : null, focus_on: i < 3 ? '2026-11-02' : null, status: 'todo' as const, blocked_reason: '', completed_at: null }));
  return { settings: { ...owner, programme_name: founder ? 'Adam 2.0' : 'My next chapter', starts_on: '2026-11-01', target_on: founder ? '2027-12-31' : '2027-06-30', preferred_modules: ['Health', 'Money', 'Projects', 'Life'], dashboard_sections: ['priorities', 'schedule', 'foundation', 'progress', 'attention'], areas: [{ key: 'health', source_area_key: 'health', label: 'Health & Performance' }, { key: 'career', source_area_key: 'work', label: 'Career & Professional Development' }, { key: 'wealth', source_area_key: 'wealth', label: 'Wealth & Personal Finance' }, { key: 'ventures', source_area_key: 'work', label: 'Personal Ventures' }, { key: 'life', source_area_key: 'mind', label: 'Personal Development & Lifestyle' }], goal_areas: Object.fromEntries(goals.map((g, i) => [g.id, focusKeys[i]])) }, goals, milestones, tasks };
}
