import { useEffect, useRef, useState } from 'react';
import { areaFor, taskState, type Action, type Goal, type Milestone, type Plan, type Scope, type Task, type TaskStatus } from './planning';
export type Edit = { kind: 'goal'; value?: Goal } | { kind: 'milestone'; value?: Milestone } | { kind: 'task'; value?: Task };
export function PlanEditor({ edit, plan, scope, today, save, close, error, busy }: { edit: Edit; plan: Plan; scope: Scope; today: string; save: (a: Action) => Promise<boolean>; close: () => void; error: string; busy: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(edit.value?.title ?? '');
  const firstGoal = edit.kind === 'goal' ? edit.value?.id : edit.value?.goal_id;
  const [goalId, setGoalId] = useState(firstGoal ?? plan.goals[0]?.id ?? '');
  const [milestoneId, setMilestoneId] = useState(edit.kind === 'task' ? edit.value?.milestone_id ?? '' : '');
  const [due] = useState(edit.kind === 'goal' ? edit.value?.ends_on ?? plan.settings.target_on : edit.value?.due_on ?? '');
  const [starts] = useState(edit.kind === 'goal' ? edit.value?.starts_on ?? plan.settings.starts_on : today);
  const [description, setDescription] = useState(edit.kind === 'goal' ? edit.value?.description ?? '' : '');
  const [area, setArea] = useState(edit.kind === 'goal' && edit.value ? areaFor(plan, edit.value.id) : plan.settings.areas[0]?.key ?? 'health');
  const [status, setStatus] = useState<TaskStatus>(edit.kind === 'task' ? edit.value?.status ?? 'todo' : 'todo');
  const [blocked, setBlocked] = useState(edit.kind === 'task' ? edit.value?.blocked_reason ?? '' : '');
  const [scheduled, setScheduled] = useState(edit.kind === 'task' ? edit.value?.scheduled_on ?? '' : '');
  const [time, setTime] = useState(edit.kind === 'task' ? edit.value?.scheduled_time ?? '' : '');
  const [focus, setFocus] = useState(edit.kind === 'task' && edit.value?.focus_on === today);
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const dueValue = String(form.get('due_on') ?? '');
    const startValue = String(form.get('starts_on') ?? starts);
    const scheduledValue = String(form.get('scheduled_on') ?? '');
    const timeValue = String(form.get('scheduled_time') ?? '');
    const owned = { id: edit.value?.id ?? crypto.randomUUID(), owner_id: scope.ownerId, is_test: scope.isTest, updated_at: edit.value?.updated_at };
    let action: Action;
    if (edit.kind === 'goal') action = { type: 'goal', value: { ...owned, title: title.trim(), description, area_key: plan.settings.areas.find(a => a.key === area)?.source_area_key ?? area, starts_on: startValue, ends_on: dueValue || null }, focusArea: area };
    else if (edit.kind === 'milestone') action = { type: 'milestone', value: { ...owned, goal_id: goalId, title: title.trim(), due_on: dueValue || null, completed_at: edit.value?.completed_at ?? null } };
    else action = { type: 'task', value: taskState({ ...owned, goal_id: goalId, milestone_id: milestoneId || null, title: title.trim(), due_on: dueValue || null, scheduled_on: scheduledValue || null, scheduled_time: scheduledValue ? timeValue || null : null, focus_on: focus ? today : null, status, blocked_reason: blocked.trim(), completed_at: edit.value?.completed_at ?? null }, status) };
    if (await save(action)) close();
  }
  return <dialog className="adam-dialog planning-dialog" ref={dialog} aria-labelledby="plan-editor-title" onCancel={close}><form onSubmit={submit}>
    <fieldset className="planning-save-boundary" disabled={busy}><h2 id="plan-editor-title">{edit.value ? 'Edit' : 'Add'} {edit.kind}</h2>
    <label>Title<input autoFocus required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label>
    {edit.kind !== 'goal' ? <label>Goal<select required value={goalId} onChange={e => { setGoalId(e.target.value); setMilestoneId(''); }}>{plan.goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label> : <><label>Area<select value={area} onChange={e => setArea(e.target.value)}>{plan.settings.areas.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</select></label><label>Target / outcome<textarea value={description} onChange={e => setDescription(e.target.value)} /></label><label>Start date<input type="date" name="starts_on" required defaultValue={starts} /></label></>}
    <label>{edit.kind === 'goal' ? 'Target date' : 'Due date'}<input type="date" name="due_on" defaultValue={due} /></label>
    {edit.kind === 'task' && <><label>Milestone<select value={milestoneId} onChange={e => setMilestoneId(e.target.value)}><option value="">No milestone</option>{plan.milestones.filter(x => x.goal_id === goalId).map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label><label>Status<select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>{['todo', 'doing', 'blocked', 'done', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}</select></label>{status === 'blocked' && <label>What is blocking it?<input required value={blocked} onChange={e => setBlocked(e.target.value)} /></label>}<div className="planning-form-grid"><label>Scheduled day<input type="date" name="scheduled_on" defaultValue={scheduled} onInput={e => setScheduled(e.currentTarget.value)} onChange={e => { setScheduled(e.target.value); if (!e.target.value) setTime(''); }} /></label><label>Time<input type="time" name="scheduled_time" disabled={!scheduled} defaultValue={time} /></label></div><label className="adam-switch"><input type="checkbox" checked={focus} onChange={e => setFocus(e.target.checked)} /> Prioritise today</label></>}
    <p className="planning-error" role="alert">{error}</p><p className="adam-muted">Changes are saved to your account after confirmation.</p><div className="planning-actions"><button className="adam-primary" type="submit">Save {edit.kind}</button><button className="adam-link" type="button" onClick={close}>Cancel</button></div></fieldset>
  </form></dialog>;
}
