create index if not exists habit_schedules_habit_owner_idx on public.habit_schedules(habit_id, owner_id);
create index if not exists habit_entries_habit_owner_idx on public.habit_entries(habit_id, owner_id);
