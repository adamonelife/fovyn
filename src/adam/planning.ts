export type Scope = { ownerId: string; isTest: boolean };
export type Owned = { id: string; owner_id: string; is_test: boolean; updated_at?: string };
export type Goal = Owned & { title: string; description: string; area_key: string; starts_on: string; ends_on: string | null };
export type Milestone = Owned & { goal_id: string; title: string; due_on: string | null; completed_at: string | null };
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'cancelled';
export type Task = Owned & { goal_id: string; milestone_id: string | null; title: string; due_on: string | null; scheduled_on: string | null; scheduled_time: string | null; focus_on: string | null; status: TaskStatus; blocked_reason: string; completed_at: string | null };
export const optionalModules = ['Health', 'Money', 'Projects', 'Life'] as const;
export const dashboardSections = ['priorities', 'schedule', 'foundation', 'progress', 'attention'] as const;
export type Settings = { updated_at?: string; owner_id: string; is_test: boolean; programme_name: string; starts_on: string; target_on: string; preferred_modules: string[]; dashboard_sections: string[]; areas: { key: string; label: string; source_area_key: string }[]; goal_areas: Record<string, string> };
export type Plan = { settings: Settings; goals: Goal[]; milestones: Milestone[]; tasks: Task[] };
export type Action = { type: 'settings'; value: Settings } | { type: 'goal'; value: Goal; focusArea?: string } | { type: 'milestone'; value: Milestone } | { type: 'task'; value: Task };
export function validDate(value: string | null) {
  if (value === null) return;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Enter a valid calendar date.');
}
function owned(row: { owner_id: string; is_test: boolean }, scope: Scope) {
  if (row.owner_id !== scope.ownerId || row.is_test !== scope.isTest) throw new Error('This record belongs to another account or data context.');
}
function title(value: string) { if (!value.trim() || value.length > 120) throw new Error('Use a title between 1 and 120 characters.'); }
export function validatePlan(plan: Plan, scope: Scope) {
  owned(plan.settings, scope);
  const config = plan.settings;
  title(config.programme_name); validDate(config.starts_on); validDate(config.target_on);
  if (config.target_on < config.starts_on) throw new Error('Target date must be on or after the start date.');
  if (config.preferred_modules.some(x => !(optionalModules as readonly string[]).includes(x)) || config.dashboard_sections.some(x => !(dashboardSections as readonly string[]).includes(x))) throw new Error('Unknown module or dashboard section.');
  if (new Set(config.areas.map(a => a.key)).size !== config.areas.length) throw new Error('Area keys must be unique.');
  for (const [id, area] of Object.entries(config.goal_areas)) if (!plan.goals.some(g => g.id === id) || !config.areas.some(a => a.key === area)) throw new Error('Area mapping must refer to this account’s goals.');
  for (const rows of [plan.goals, plan.milestones, plan.tasks]) {
    if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('Record identities must be unique.');
    rows.forEach(row => { owned(row, scope); title(row.title); });
  }
  for (const goal of plan.goals) {
    validDate(goal.starts_on); validDate(goal.ends_on);
    if (goal.ends_on !== null && goal.ends_on < goal.starts_on) throw new Error('Goal dates are reversed.');
  }
  for (const milestone of plan.milestones) {
    const goal = plan.goals.find(x => x.id === milestone.goal_id);
    if (!goal) throw new Error('Choose an existing goal for this milestone.');
    validDate(milestone.due_on);
  }
  for (const task of plan.tasks) {
    if (!plan.goals.some(x => x.id === task.goal_id)) throw new Error('Choose an existing goal for this task.');
    if (task.milestone_id && !plan.milestones.some(x => x.id === task.milestone_id && x.goal_id === task.goal_id)) throw new Error('The milestone must belong to the task’s goal.');
    for (const value of [task.due_on, task.scheduled_on, task.focus_on]) validDate(value);
    if (task.scheduled_time && (!task.scheduled_on || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.scheduled_time))) throw new Error('A scheduled time needs a valid day and time.');
    if (!['todo', 'doing', 'blocked', 'done', 'cancelled'].includes(task.status)) throw new Error('Invalid task status.');
    if ((task.status === 'done') !== Boolean(task.completed_at)) throw new Error('Task completion state is inconsistent.');
    if (task.status === 'blocked' && !task.blocked_reason.trim()) throw new Error('Describe what is blocking the task.');
  }
}
export function applyAction(plan: Plan, action: Action, scope: Scope): Plan {
  validatePlan(plan, scope);
  owned(action.value, scope);
  const next = structuredClone(plan);
  if (action.type === 'settings') next.settings = structuredClone(action.value);
  else {
    const rows = action.type === 'goal' ? next.goals : action.type === 'task' ? next.tasks : next.milestones;
    const i = rows.findIndex(x => x.id === action.value.id);
    // Each action updates one canonical identity; views never copy records.
    if (i < 0) (rows as Owned[]).push(structuredClone(action.value));
    else (rows as Owned[])[i] = structuredClone(action.value);
  }
  if (action.type === 'goal' && action.focusArea) next.settings.goal_areas[action.value.id] = action.focusArea;
  validatePlan(next, scope);
  return next;
}
export function taskState(task: Task, status: TaskStatus, now = new Date().toISOString()): Task {
  return { ...task, status, completed_at: status === 'done' ? task.completed_at ?? now : null, focus_on: status === 'cancelled' ? null : task.focus_on };
}
export function areaFor(plan: Plan, goalId: string) {
  const goal = plan.goals.find(x => x.id === goalId);
  return plan.settings.goal_areas[goalId] ?? goal?.area_key ?? '';
}
export function goalProgress(plan: Plan, goalId: string) {
  const tasks = plan.tasks.filter(x => x.goal_id === goalId && x.status !== 'cancelled');
  const milestones = plan.milestones.filter(x => x.goal_id === goalId);
  return { done: tasks.filter(x => x.status === 'done').length, total: tasks.length, milestonesDone: milestones.filter(x => x.completed_at).length, milestonesTotal: milestones.length };
}
