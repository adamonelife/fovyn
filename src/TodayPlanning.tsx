import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { planRepository } from './adam/planRepository';
import type { Plan, Scope, Task } from './adam/planning';

// A projection of canonical tasks, not another schedule or persistence engine.
export function dailyPlanTasks(tasks: Task[], today: string) {
  return tasks.filter(task => !['done', 'cancelled'].includes(task.status) &&
    (task.focus_on === today || task.scheduled_on === today || Boolean(task.due_on && task.due_on <= today)))
    .sort((a, b) => Number(b.focus_on === today) - Number(a.focus_on === today) ||
      (a.due_on ?? '9999').localeCompare(b.due_on ?? '9999') || a.title.localeCompare(b.title));
}

export default function TodayPlanning({ ownerId, isTest, today, openPlan }: Scope & { today: string; openPlan: () => void }) {
  const [plan, setPlan] = useState<Plan>();
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setPlan(undefined); setError('');
    planRepository(supabase, { ownerId, isTest }).load()
      .then(value => { if (active) setPlan(value); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load planning tasks.'); });
    return () => { active = false; };
  }, [ownerId, isTest, today, reload]);
  const tasks = plan ? dailyPlanTasks(plan.tasks, today) : [];
  return <section className="home-section" aria-label="Today’s planning tasks">
    <div className="section-title"><div><p className="eyebrow">{plan?.settings.programme_name ?? 'MY PLAN'}</p><h2>Today’s tasks</h2></div><button className="soft-button" onClick={openPlan}>Open Plan</button></div>
    {error ? <p role="alert">Planning tasks unavailable: {error} <button className="soft-button" onClick={() => setReload(n => n + 1)}>Retry planning</button></p> : !plan ? <p role="status">Loading planning tasks…</p> : <>
      <p>{tasks.length} open task{tasks.length === 1 ? '' : 's'} prioritised, scheduled or due today.</p>
      <div className="home-routines home-plan-tasks">{tasks.slice(0, 5).map(task => <button key={task.id} onClick={openPlan}>
        <span>{task.status === 'blocked' ? 'BLOCKED' : task.due_on && task.due_on < today ? 'OVERDUE' : task.focus_on === today ? 'PRIORITY' : 'TODAY'}</span><b>{task.title}</b>
        <small>{plan.goals.find(goal => goal.id === task.goal_id)?.title}{task.due_on ? ` · Due ${task.due_on}` : ''}{task.scheduled_on === today && task.scheduled_time ? ` · ${task.scheduled_time}` : ''}{task.status === 'blocked' ? ` · ${task.blocked_reason}` : ''}</small>
      </button>)}</div>
      {!tasks.length && <p>No open planning tasks for today. Your goals, milestones and other tasks are in Plan.</p>}
      {tasks.length > 5 && <p>Showing 5 of {tasks.length}. Open Plan to view and edit all tasks.</p>}
    </>}
  </section>;
}
