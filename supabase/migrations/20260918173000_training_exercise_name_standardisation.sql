-- Canonical movement identity is shared reference data. User Exercise Profiles,
-- aliases, equipment settings and history remain private owned records.
create table if not exists public.training_canonical_movements (
  movement_key text primary key check (movement_key ~ '^[a-z0-9_]+$'),
  canonical_name text not null unique,
  primary_muscle_group text not null,
  search_terms text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.training_canonical_movements enable row level security;
drop policy if exists training_canonical_movements_read on public.training_canonical_movements;
create policy training_canonical_movements_read on public.training_canonical_movements
  for select to authenticated using (true);
revoke all on public.training_canonical_movements from anon;
grant select on public.training_canonical_movements to authenticated;

insert into public.training_canonical_movements(movement_key,canonical_name,primary_muscle_group,search_terms) values
('ab_crunch','Ab Crunch','core',array['abdominal crunch']),
('back_extension','Back Extension','back',array['hyperextension']),
('barbell_incline_bench_press','Barbell Incline Bench Press','chest',array['incline press','bb incline press']),
('barbell_shrug','Barbell Shrug','back',array['shrug']),
('bulgarian_split_squat','Bulgarian Split Squat','quadriceps',array['bulgarian squat','rear foot elevated split squat']),
('cable_face_pull','Cable Face Pull','shoulders',array['face pull','facepull']),
('cable_fly','Cable Fly','chest',array['cable chest fly']),
('cable_lateral_raise','Cable Lateral Raise','shoulders',array['lateral raise']),
('cable_row','Cable Row','back',array['seated cable row']),
('calf_raise','Calf Raise','calves',array['standing calf raise']),
('chest_fly_machine','Chest Fly Machine','chest',array['pec deck','fly machine']),
('chin_up','Chin-Up','back',array['chinup']),
('cossack_squat','Cossack Squat','quadriceps',array['cossak squat']),
('cycling','Cycling','cardio',array['bike','exercise bike']),
('decline_chest_press_machine','Decline Chest Press Machine','chest',array['decline press machine']),
('dips','Dips','chest',array['chest dips']),
('dumbbell_floor_press','Dumbbell Floor Press','chest',array['db floor press']),
('dumbbell_shrug','Dumbbell Shrug','back',array['db shrug']),
('farmers_carry','Farmer Carry','full_body',array['farmers walk','farmer walk']),
('hack_squat','Hack Squat','quadriceps',array['hack squat machine']),
('hamstring_curl','Hamstring Curl','hamstrings',array['leg curl','ham curl']),
('hip_abduction','Hip Abduction','glutes',array['hip abduction machine']),
('hip_adduction','Hip Adduction','glutes',array['hip adduction machine']),
('hip_thrust','Hip Thrust','glutes',array['glute thrust']),
('incline_dumbbell_curl','Incline Dumbbell Curl','biceps',array['incline curl']),
('lat_pulldown','Lat Pulldown','back',array['pulldown']),
('leg_press','Leg Press','quadriceps',array['leg press machine']),
('leg_raise','Leg Raise','core',array['hanging leg raise']),
('machine_chest_press','Machine Chest Press','chest',array['chest press machine']),
('overhead_triceps_extension','Overhead Triceps Extension','triceps',array['triceps overhead extension']),
('plank','Plank','core',array['front plank']),
('preacher_curl','Preacher Curl','biceps',array['preacher']),
('pull_up','Pull-Up','back',array['pullup']),
('reverse_grip_lat_pulldown','Reverse-Grip Lat Pulldown','back',array['reverse pulldown']),
('rope_hammer_curl','Rope Hammer Curl','biceps',array['cable hammer curl']),
('shoulder_press','Shoulder Press','shoulders',array['overhead press','machine shoulder press']),
('straight_arm_pulldown','Straight-Arm Pulldown','back',array['straight arm cable pulldown']),
('step_up','Step-Up','quadriceps',array['step ups']),
('triceps_pushdown','Triceps Pushdown','triceps',array['tricep pushdown','cable pushdown']),
('walking_lunge','Walking Lunge','quadriceps',array['walking lunges']),
('wide_grip_lat_pulldown','Wide-Grip Lat Pulldown','back',array['wide pulldown']),
('woodchop','Cable Woodchop','core',array['woodchopper','woodchooper'])
on conflict (movement_key) do update set
  canonical_name=excluded.canonical_name,
  primary_muscle_group=excluded.primary_muscle_group,
  search_terms=excluded.search_terms,
  updated_at=now();

alter table public.training_exercises
  add column if not exists canonical_movement_key text references public.training_canonical_movements(movement_key),
  add column if not exists exercise_alias text,
  add column if not exists name_standardisation_status text not null default 'review_required';

alter table public.training_exercises drop constraint if exists training_exercises_name_standardisation_status_check;
alter table public.training_exercises add constraint training_exercises_name_standardisation_status_check
  check (name_standardisation_status in ('matched','review_required','custom'));
create index if not exists training_exercises_canonical_movement_idx
  on public.training_exercises(canonical_movement_key) where canonical_movement_key is not null;

-- Only explicit, high-confidence legacy keys are linked automatically. The
-- original private shorthand is retained as the alias and `name` is untouched.
with matches(exercise_key,movement_key) as (values
('CR004','ab_crunch'),('BX001','back_extension'),('IP001','barbell_incline_bench_press'),('IP002','barbell_incline_bench_press'),
('SR001','barbell_shrug'),('SQ002','bulgarian_split_squat'),('FP001','cable_face_pull'),('LR001','cable_lateral_raise'),('LR002','cable_lateral_raise'),
('CA001','calf_raise'),('CA002','calf_raise'),('FY001','chest_fly_machine'),('FY004','chest_fly_machine'),('VP003','chin_up'),('SQ003','cossack_squat'),
('EB001','cycling'),('DC001','decline_chest_press_machine'),('DC002','dips'),('FL002','dumbbell_floor_press'),('SR002','dumbbell_shrug'),
('CY001','farmers_carry'),('SQ001','hack_squat'),('HS001','hamstring_curl'),('HP001','hip_abduction'),('HP002','hip_adduction'),('HH001','hip_thrust'),
('BI002','incline_dumbbell_curl'),('VP004','lat_pulldown'),('LP001','leg_press'),('CR003','leg_raise'),('FL001','machine_chest_press'),
('CR001','plank'),('BI001','preacher_curl'),('VP001','pull_up'),('LI002','reverse_grip_lat_pulldown'),('BI003','rope_hammer_curl'),
('SH001','shoulder_press'),('SH002','shoulder_press'),('LI001','straight_arm_pulldown'),('SL002','step_up'),('TC001','triceps_pushdown'),
('TC003','triceps_pushdown'),('SL001','walking_lunge'),('VP002','wide_grip_lat_pulldown'),('CR002','woodchop')
)
update public.training_exercises e set
  canonical_movement_key=m.movement_key,
  exercise_alias=e.name,
  name_standardisation_status='matched',
  updated_at=now()
from matches m where e.exercise_key=m.exercise_key and e.canonical_movement_key is null;

comment on table public.training_canonical_movements is 'Shared, expandable canonical movement dictionary. Contains no private user aliases.';
comment on column public.training_exercises.exercise_alias is 'Private user-facing alias retained separately from canonical movement identity.';
