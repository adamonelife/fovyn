create index if not exists training_rules_exercise_id_idx
  on public.training_rules(exercise_id);

create index if not exists session_exercises_exercise_id_idx
  on public.training_session_exercises(exercise_id);

create index if not exists template_slots_default_exercise_id_idx
  on public.training_template_slots(default_exercise_id);
