import { describe, it, expect, vi } from 'vitest';
vi.mock('./supabase', () => ({ supabase: {} }));
import { dailyPlanTasks } from './TodayPlanning';
import { createPlan } from './adam/planFixtures';
const plan = createPlan({ ownerId: 'example', isTest: false });
const base = plan.tasks[0];
const today = '2026-11-02';
describe('Today projects existing planning tasks', () => {
  it('includes priorities, scheduled, due and overdue tasks without copying records', () => {
    const rows = [
      { ...base, id: 'due', focus_on: null, scheduled_on: null, due_on: today },
      { ...base, id: 'priority', focus_on: today, scheduled_on: null, due_on: null },
      { ...base, id: 'scheduled', focus_on: null, scheduled_on: today, due_on: null },
      { ...base, id: 'overdue', focus_on: null, scheduled_on: null, due_on: '2026-11-01' },
    ];
    const result = dailyPlanTasks(rows, today);
    expect(result.map(t => t.id)).toEqual(['priority', 'overdue', 'due', 'scheduled']);
    expect(result.find(t => t.id === 'priority')).toBe(rows[1]);
    expect(rows[0].id).toBe('due');
  });
  it('excludes finished, cancelled, future-only and unscheduled tasks', () => {
    expect(dailyPlanTasks([
      { ...base, status: 'done' }, { ...base, status: 'cancelled' },
      { ...base, focus_on: null, scheduled_on: null, due_on: '2026-11-03' },
      { ...base, focus_on: null, scheduled_on: null, due_on: null },
    ], today)).toEqual([]);
  });
  it('keeps blocked priorities visible and reflects canonical completion', () => {
    const task = { ...base, focus_on: today, status: 'blocked' as const, blocked_reason: 'Waiting' };
    expect(dailyPlanTasks([task], today)).toEqual([task]);
    expect(dailyPlanTasks([{ ...task, status: 'done' }], today)).toEqual([]);
  });
});
