create table public.recovery_programmes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  programme_key text not null,
  name text not null,
  description text not null default '',
  primary_region text not null,
  secondary_regions text[] not null default '{}',
  safety_notes text,
  contraindications text,
  professional_instructions text,
  user_created boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (owner_id, programme_key)
);

create table public.recovery_stages (
  id uuid primary key default gen_random_uuid(),
  stage_number smallint not null unique check (stage_number between 1 and 5),
  stage_key text not null unique,
  name text not null,
  purpose text not null,
  implemented boolean not null default true
);

create table public.recovery_exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  exercise_key text not null,
  name text not null,
  regions text[] not null default '{}',
  exercise_types text[] not null default '{}',
  equipment text[] not null default '{}',
  goal_tags text[] not null default '{}',
  unilateral boolean not null default false,
  default_prescription text,
  default_sets smallint check (default_sets is null or default_sets > 0),
  default_reps numeric check (default_reps is null or default_reps >= 0),
  default_duration_seconds integer check (default_duration_seconds is null or default_duration_seconds >= 0),
  default_rest_seconds integer check (default_rest_seconds is null or default_rest_seconds >= 0),
  instructions text,
  progression_notes text,
  stop_criteria text,
  user_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (owner_id, exercise_key)
);

create table public.recovery_programme_exercises (
  programme_id uuid not null references public.recovery_programmes(id) on delete cascade,
  stage_id uuid not null references public.recovery_stages(id) on delete cascade,
  exercise_id uuid not null references public.recovery_exercises(id) on delete cascade,
  position smallint not null check (position > 0),
  prescription_override text,
  safety_notes text,
  primary key (programme_id, stage_id, exercise_id)
);

create table public.recovery_enrolments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  programme_id uuid not null references public.recovery_programmes(id) on delete cascade,
  current_stage_id uuid not null references public.recovery_stages(id),
  status text not null default 'active' check (status in ('active','completed','archived')),
  prescribed_by text check (prescribed_by is null or prescribed_by in ('self','physiotherapist','doctor','coach','sports_therapist','other')),
  professional_name text,
  professional_prescribed boolean not null default false,
  date_started date not null default current_date,
  date_completed date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, programme_id)
);

alter table public.training_sessions
  add column recovery_enrolment_id uuid references public.recovery_enrolments(id) on delete set null,
  add column recovery_stage_id uuid references public.recovery_stages(id) on delete set null;

create table public.recovery_session_responses (
  session_id uuid primary key references public.training_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  symptom_response text check (symptom_response is null or symptom_response in ('better','no_change','slightly_worse','significantly_worse')),
  pain_before smallint check (pain_before between 0 and 10),
  pain_after smallint check (pain_after between 0 and 10),
  stiffness_before smallint check (stiffness_before between 0 and 10),
  stiffness_after smallint check (stiffness_after between 0 and 10),
  delayed_response text check (delayed_response is null or delayed_response in ('fine_later','mild_delayed','significant_delayed')),
  delayed_pain smallint check (delayed_pain between 0 and 10),
  delayed_stiffness smallint check (delayed_stiffness between 0 and 10),
  notes text,
  stop_criteria_reported text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recovery_side_performance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_exercise_id uuid not null references public.training_session_exercises(id) on delete cascade,
  side text not null check (side in ('left','right')),
  set_number smallint not null check (set_number > 0),
  load_kg numeric check (load_kg is null or load_kg >= 0),
  reps numeric check (reps is null or reps >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  rpe numeric check (rpe is null or rpe between 0 and 10),
  unique (session_exercise_id, side, set_number)
);

create table public.recovery_stage_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  enrolment_id uuid not null references public.recovery_enrolments(id) on delete cascade,
  from_stage_id uuid references public.recovery_stages(id),
  to_stage_id uuid not null references public.recovery_stages(id),
  changed_at timestamptz not null default now(),
  recommendation_source text,
  notes text
);

create index recovery_programmes_owner_idx on public.recovery_programmes(owner_id);
create index recovery_exercises_owner_idx on public.recovery_exercises(owner_id);
create index recovery_programme_exercises_stage_idx on public.recovery_programme_exercises(stage_id);
create index recovery_programme_exercises_exercise_idx on public.recovery_programme_exercises(exercise_id);
create index recovery_enrolments_owner_idx on public.recovery_enrolments(owner_id);
create index recovery_enrolments_programme_idx on public.recovery_enrolments(programme_id);
create index recovery_enrolments_current_stage_idx on public.recovery_enrolments(current_stage_id);
create index training_sessions_recovery_enrolment_idx on public.training_sessions(recovery_enrolment_id);
create index training_sessions_recovery_stage_idx on public.training_sessions(recovery_stage_id);
create index recovery_session_responses_owner_idx on public.recovery_session_responses(owner_id);
create index recovery_side_performance_owner_idx on public.recovery_side_performance(owner_id);
create index recovery_side_performance_session_exercise_idx on public.recovery_side_performance(session_exercise_id);
create index recovery_stage_history_owner_idx on public.recovery_stage_history(owner_id);
create index recovery_stage_history_enrolment_idx on public.recovery_stage_history(enrolment_id);
create index recovery_stage_history_from_stage_idx on public.recovery_stage_history(from_stage_id);
create index recovery_stage_history_to_stage_idx on public.recovery_stage_history(to_stage_id);

alter table public.recovery_programmes enable row level security;
alter table public.recovery_stages enable row level security;
alter table public.recovery_exercises enable row level security;
alter table public.recovery_programme_exercises enable row level security;
alter table public.recovery_enrolments enable row level security;
alter table public.recovery_session_responses enable row level security;
alter table public.recovery_side_performance enable row level security;
alter table public.recovery_stage_history enable row level security;

create policy "Recovery programmes readable" on public.recovery_programmes for select to authenticated using (owner_id is null or owner_id = (select auth.uid()));
create policy "Own recovery programmes insert" on public.recovery_programmes for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Own recovery programmes update" on public.recovery_programmes for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Own recovery programmes delete" on public.recovery_programmes for delete to authenticated using (owner_id = (select auth.uid()));
create policy "Recovery stages readable" on public.recovery_stages for select to authenticated using (true);
create policy "Programme exercises readable" on public.recovery_programme_exercises for select to authenticated using (exists (select 1 from public.recovery_programmes p where p.id=programme_id and (p.owner_id is null or p.owner_id=(select auth.uid()))));
create policy "Recovery exercises readable" on public.recovery_exercises for select to authenticated using (owner_id is null or owner_id = (select auth.uid()));
create policy "Own recovery exercises insert" on public.recovery_exercises for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Own recovery exercises update" on public.recovery_exercises for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Own recovery exercises delete" on public.recovery_exercises for delete to authenticated using (owner_id = (select auth.uid()));
create policy "Own recovery enrolments" on public.recovery_enrolments for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Own recovery responses" on public.recovery_session_responses for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Own recovery side performance" on public.recovery_side_performance for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Own recovery stage history" on public.recovery_stage_history for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

grant select on public.recovery_programmes, public.recovery_stages, public.recovery_exercises, public.recovery_programme_exercises to authenticated;
grant select,insert,update,delete on public.recovery_enrolments, public.recovery_session_responses, public.recovery_side_performance, public.recovery_stage_history to authenticated;
grant insert,update,delete on public.recovery_programmes, public.recovery_exercises to authenticated;

insert into public.recovery_stages(stage_number,stage_key,name,purpose,implemented) values
 (1,'settle_mobilise','Settle & Mobilise','Reduce aggravation while maintaining comfortable movement and mobility.',true),
 (2,'activate_stabilise','Activate & Stabilise','Restore muscle activation, basic control and stability.',true),
 (3,'strength_control','Strength & Control','Rebuild meaningful strength, movement quality and side-to-side control.',true),
 (4,'rebuild_return','Rebuild & Return','Progressively rebuild normal training capacity and prepare for unrestricted exercise.',true),
 (5,'return_to_sport','Return to Sport','Sport-specific capacity, movement and confidence.',false);

insert into public.recovery_programmes(programme_key,name,description,primary_region,secondary_regions,safety_notes) values
 ('lower_back_leg','Lower Back + Leg Recovery','A staged recovery exercise programme focused on restoring comfortable movement, trunk/hip stability, lower-body activation and progressive strength before returning to normal training.','Lower Back',array['Core','Hip','Glute','Lower Body'],'This is a structured exercise library, not a diagnosis or an automatically appropriate prescription. Stop an exercise if symptoms significantly increase or new radiating pain, numbness, tingling, sudden strength loss, giving way, spreading symptoms, or loss of normal movement/control occurs.');

with seed(exercise_key,name,regions,types,equipment,goals,unilateral,prescription,stop_criteria) as (values
 ('easy_elliptical','Easy Elliptical',array['Full Body','Lower Body'],array['Cardio'],array['Elliptical'],array['Comfortable Movement','Endurance'],false,'5–20 minutes',null),
 ('easy_walking','Easy Walking',array['Full Body','Lower Body'],array['Cardio'],array['None / Bodyweight'],array['Comfortable Movement','Endurance'],false,'5–15 minutes',null),
 ('pelvic_tilts','Pelvic Tilts',array['Lower Back','Core'],array['Mobility','Activation'],array['None / Bodyweight'],array['Mobility','Core Control'],false,'2 × 10',null),
 ('cat_cow','Cat-Cow',array['Lower Back','Core'],array['Mobility'],array['None / Bodyweight'],array['Mobility','Range of Motion'],false,'2 × 8',null),
 ('supine_knee_rocks','Supine Knee Rocks',array['Lower Back','Hip'],array['Mobility'],array['None / Bodyweight'],array['Mobility','Comfortable Movement'],true,'2 × 8 per side',null),
 ('heel_slides','Heel Slides',array['Hip','Core','Lower Body'],array['Mobility','Activation'],array['None / Bodyweight'],array['Muscle Activation','Range of Motion'],true,'2 × 10 per side',null),
 ('supine_march','Supine March',array['Core','Hip'],array['Activation','Stability'],array['None / Bodyweight'],array['Muscle Activation','Core Control'],true,'2 × 8 per side',null),
 ('gentle_core_brace','Gentle Core Brace',array['Core'],array['Activation','Stability'],array['None / Bodyweight'],array['Core Control','Stability'],false,'5 × 5–10 seconds',null),
 ('ankle_pumps','Ankle Pumps',array['Calf','Ankle'],array['Mobility'],array['None / Bodyweight'],array['Comfortable Movement','Mobility'],true,'20 per side',null),
 ('seated_knee_extension_unloaded','Seated Knee Extension — Unloaded',array['Quad','Knee'],array['Activation'],array['Chair'],array['Muscle Activation','Side-to-Side Control'],true,'2 × 10 per side',null),
 ('gentle_hip_flexor_mobility','Gentle Hip-Flexor Mobility',array['Hip'],array['Mobility'],array['None / Bodyweight'],array['Mobility','Range of Motion'],true,'20–30 seconds per side',null),
 ('diaphragmatic_breathing','Diaphragmatic Breathing',array['Core'],array['Activation','Mobility'],array['None / Bodyweight'],array['Core Control','Comfortable Movement'],false,'2–3 minutes',null),
 ('glute_bridge','Glute Bridge',array['Glute','Core'],array['Activation','Strength'],array['None / Bodyweight'],array['Muscle Activation','Strength'],false,'2–3 × 10',null),
 ('bird_dog','Bird Dog',array['Core','Lower Back','Glute'],array['Stability'],array['None / Bodyweight'],array['Stability','Core Control','Side-to-Side Control'],true,'2 × 6–8 per side',null),
 ('dead_bug','Dead Bug',array['Core','Hip'],array['Stability'],array['None / Bodyweight'],array['Stability','Core Control'],true,'2 × 6–8 per side',null),
 ('bodyweight_sit_to_stand','Bodyweight Sit-to-Stand',array['Quad','Glute','Knee'],array['Strength'],array['Chair'],array['Strength','Load Tolerance'],false,'2 × 10',null),
 ('bodyweight_box_squat','Bodyweight Box Squat',array['Quad','Glute','Core'],array['Strength'],array['Chair','Box / Step'],array['Strength','Load Tolerance'],false,'2 × 10',null),
 ('low_step_up','Low Step-Up',array['Quad','Glute','Knee'],array['Strength','Stability'],array['Box / Step'],array['Unilateral Strength','Side-to-Side Control','Balance'],true,'2 × 8 per side',null),
 ('standing_hip_abduction','Standing Hip Abduction',array['Hip','Glute'],array['Activation'],array['None / Bodyweight'],array['Muscle Activation','Side-to-Side Control'],true,'2 × 10 per side',null),
 ('standing_hip_extension','Standing Hip Extension',array['Hip','Glute'],array['Activation'],array['None / Bodyweight'],array['Muscle Activation','Strength'],true,'2 × 10 per side',null),
 ('bodyweight_calf_raise','Bodyweight Calf Raise',array['Calf','Ankle'],array['Strength'],array['None / Bodyweight'],array['Strength','Endurance'],false,'2 × 12–15',null),
 ('side_lying_clamshell','Side-Lying Clamshell',array['Hip','Glute'],array['Activation'],array['None / Bodyweight'],array['Muscle Activation','Side-to-Side Control'],true,'2 × 10 per side',null),
 ('wall_push_up','Wall Push-Up',array['Upper Body','Core'],array['Strength'],array['None / Bodyweight'],array['Return to Training'],false,'2 × 10',null),
 ('supported_one_arm_dumbbell_row','Supported One-Arm Dumbbell Row',array['Upper Body','Core'],array['Strength'],array['Dumbbell','Bench','Chair'],array['Strength','Return to Training'],true,'2 × 10 per side',null),
 ('light_dumbbell_floor_press','Light Dumbbell Floor Press',array['Upper Body'],array['Strength'],array['Dumbbell'],array['Strength','Return to Training'],false,'2 × 10',null),
 ('passive_bar_hang','Passive Bar Hang',array['Upper Body','Core','Full Body'],array['Mobility'],array['Pull-Up Bar'],array['Mobility','Comfortable Movement'],false,'2 × 10–20 seconds','Only perform if hanging feels neutral or comfortable.'),
 ('goblet_squat_to_box','Goblet Squat to Box',array['Quad','Glute','Core'],array['Strength'],array['Dumbbell','Box / Step'],array['Strength','Load Tolerance'],false,'2–3 × 8–10',null),
 ('step_up','Step-Up',array['Quad','Glute','Knee'],array['Strength'],array['Box / Step'],array['Unilateral Strength','Side-to-Side Control'],true,'3 × 8 per side',null),
 ('controlled_step_down','Controlled Step-Down',array['Quad','Glute','Knee'],array['Strength','Stability'],array['Box / Step'],array['Unilateral Strength','Balance','Side-to-Side Control'],true,'2 × 8 per side',null),
 ('supported_split_squat','Supported Split Squat',array['Quad','Glute','Hip'],array['Strength'],array['Chair'],array['Unilateral Strength','Load Tolerance'],true,'2 × 8 per side',null),
 ('single_leg_glute_bridge','Single-Leg Glute Bridge',array['Glute','Core','Hip'],array['Strength','Stability'],array['None / Bodyweight'],array['Unilateral Strength','Side-to-Side Control'],true,'2 × 8 per side',null),
 ('weighted_hip_abduction','Banded or Weighted Hip Abduction',array['Hip','Glute'],array['Strength'],array['Resistance Band','Ankle Weight'],array['Strength','Side-to-Side Control'],true,'2 × 12 per side',null),
 ('weighted_hip_extension','Banded or Weighted Hip Extension',array['Hip','Glute'],array['Strength'],array['Resistance Band','Ankle Weight'],array['Strength','Side-to-Side Control'],true,'2 × 12 per side',null),
 ('seated_knee_extension_light','Seated Knee Extension — Light',array['Quad','Knee'],array['Strength'],array['Machine','Ankle Weight'],array['Strength','Side-to-Side Control'],false,'2–3 × 10',null),
 ('hamstring_curl_light','Hamstring Curl — Light',array['Hamstring','Knee'],array['Strength'],array['Machine','Resistance Band','Ankle Weight'],array['Strength'],false,'2–3 × 10',null),
 ('weighted_calf_raise','Weighted Calf Raise',array['Calf','Ankle'],array['Strength'],array['Dumbbell'],array['Strength'],false,'3 × 12',null),
 ('pallof_press','Pallof Press',array['Core'],array['Stability'],array['Cable','Resistance Band'],array['Stability','Core Control'],true,'2 × 10 per side',null),
 ('side_plank_knees','Side Plank — Knees',array['Core'],array['Stability'],array['None / Bodyweight'],array['Stability','Side-to-Side Control'],true,'2 × 15–30 seconds per side',null),
 ('full_bird_dog','Full Bird Dog',array['Core','Lower Back','Glute'],array['Stability'],array['None / Bodyweight'],array['Stability','Core Control'],true,'3 × 8 per side',null),
 ('full_dead_bug','Full Dead Bug',array['Core','Hip'],array['Stability'],array['None / Bodyweight'],array['Stability','Core Control'],true,'3 × 8 per side',null),
 ('chest_supported_row','Chest-Supported Row',array['Upper Body'],array['Strength'],array['Machine','Dumbbell'],array['Strength','Return to Training'],false,'2–3 × 10',null),
 ('machine_chest_press','Machine Chest Press',array['Upper Body'],array['Strength'],array['Machine'],array['Strength','Return to Training'],false,'2–3 × 10',null),
 ('lat_pulldown','Lat Pulldown',array['Upper Body'],array['Strength'],array['Cable','Machine'],array['Strength','Return to Training'],false,'2–3 × 10',null),
 ('goblet_squat','Goblet Squat',array['Quad','Glute','Core'],array['Strength'],array['Dumbbell'],array['Strength','Load Tolerance','Return to Training'],false,null,null),
 ('split_squat','Split Squat',array['Quad','Glute','Hip'],array['Strength'],array['None / Bodyweight'],array['Unilateral Strength','Return to Training'],true,null,null),
 ('reverse_lunge','Reverse Lunge',array['Quad','Glute','Hip'],array['Strength','Stability'],array['None / Bodyweight'],array['Strength','Balance','Return to Training'],true,null,null),
 ('lateral_lunge','Lateral Lunge',array['Hip','Quad','Glute'],array['Strength','Stability'],array['None / Bodyweight'],array['Strength','Side-to-Side Control','Return to Sport'],true,null,null),
 ('single_leg_squat_to_box','Single-Leg Squat to Box',array['Quad','Glute','Knee'],array['Strength','Stability'],array['Box / Step'],array['Unilateral Strength','Balance','Side-to-Side Control'],true,null,null),
 ('higher_step_up','Higher Step-Up',array['Quad','Glute','Knee'],array['Strength'],array['Box / Step'],array['Unilateral Strength','Load Tolerance'],true,null,null),
 ('romanian_deadlift_light','Romanian Deadlift — Light',array['Hamstring','Glute','Lower Back','Core'],array['Strength'],array['Dumbbell'],array['Strength','Load Tolerance'],false,null,null),
 ('cable_pull_through','Cable Pull-Through',array['Glute','Hamstring','Core'],array['Strength'],array['Cable'],array['Strength','Hip Hinge'],false,null,null),
 ('hip_thrust','Hip Thrust',array['Glute','Core'],array['Strength'],array['None / Bodyweight','Dumbbell','Machine'],array['Strength','Load Tolerance'],false,null,null),
 ('leg_press_controlled','Leg Press — Controlled',array['Quad','Glute','Knee'],array['Strength'],array['Machine'],array['Strength','Load Tolerance'],false,null,null),
 ('leg_extension','Leg Extension',array['Quad','Knee'],array['Strength'],array['Machine'],array['Strength'],false,null,null),
 ('hamstring_curl','Hamstring Curl',array['Hamstring','Knee'],array['Strength'],array['Machine'],array['Strength'],false,null,null),
 ('back_extension_controlled','Back Extension — Controlled',array['Lower Back','Glute','Hamstring'],array['Strength'],array['Machine','Bench'],array['Strength','Load Tolerance'],false,null,null),
 ('full_side_plank','Full Side Plank',array['Core'],array['Stability'],array['None / Bodyweight'],array['Stability','Side-to-Side Control'],true,null,null),
 ('farmer_carry_light','Farmer Carry — Light',array['Core','Full Body'],array['Strength','Stability'],array['Dumbbell'],array['Stability','Load Tolerance','Return to Training'],false,null,null),
 ('suitcase_carry_light','Suitcase Carry — Light',array['Core','Full Body'],array['Strength','Stability'],array['Dumbbell'],array['Stability','Side-to-Side Control'],true,null,null),
 ('cable_rotation_controlled','Cable Rotation — Controlled',array['Core','Hip'],array['Strength','Stability'],array['Cable'],array['Rotation Control','Return to Sport'],false,null,null),
 ('lateral_band_walk','Lateral Band Walk',array['Hip','Glute'],array['Strength','Activation'],array['Resistance Band'],array['Strength','Side-to-Side Control','Return to Sport'],false,null,null),
 ('controlled_lateral_shuffle','Controlled Lateral Shuffle',array['Full Body','Lower Body'],array['Coordination','Return to Sport'],array['None / Bodyweight'],array['Coordination','Return to Sport'],false,null,null),
 ('controlled_forward_backward_shuffle','Controlled Forward / Backward Shuffle',array['Full Body','Lower Body'],array['Coordination','Return to Sport'],array['None / Bodyweight'],array['Coordination','Return to Sport'],false,null,null)
)
insert into public.recovery_exercises(exercise_key,name,regions,exercise_types,equipment,goal_tags,unilateral,default_prescription,stop_criteria)
select * from seed;

with mapping(stage_number, exercise_keys) as (values
 (1,array['easy_elliptical','easy_walking','pelvic_tilts','cat_cow','supine_knee_rocks','heel_slides','supine_march','gentle_core_brace','ankle_pumps','seated_knee_extension_unloaded','gentle_hip_flexor_mobility','diaphragmatic_breathing']),
 (2,array['easy_elliptical','glute_bridge','bird_dog','dead_bug','bodyweight_sit_to_stand','bodyweight_box_squat','low_step_up','standing_hip_abduction','standing_hip_extension','bodyweight_calf_raise','side_lying_clamshell','wall_push_up','supported_one_arm_dumbbell_row','light_dumbbell_floor_press','passive_bar_hang']),
 (3,array['goblet_squat_to_box','step_up','controlled_step_down','supported_split_squat','single_leg_glute_bridge','weighted_hip_abduction','weighted_hip_extension','seated_knee_extension_light','hamstring_curl_light','weighted_calf_raise','pallof_press','side_plank_knees','full_bird_dog','full_dead_bug','chest_supported_row','machine_chest_press','lat_pulldown']),
 (4,array['goblet_squat','split_squat','reverse_lunge','lateral_lunge','single_leg_squat_to_box','higher_step_up','romanian_deadlift_light','cable_pull_through','hip_thrust','leg_press_controlled','leg_extension','hamstring_curl','back_extension_controlled','pallof_press','full_side_plank','farmer_carry_light','suitcase_carry_light','cable_rotation_controlled','lateral_band_walk','controlled_lateral_shuffle','controlled_forward_backward_shuffle'])
)
insert into public.recovery_programme_exercises(programme_id,stage_id,exercise_id,position)
select p.id,s.id,e.id,k.ordinality::smallint
from mapping m
cross join lateral unnest(m.exercise_keys) with ordinality k(exercise_key,ordinality)
join public.recovery_programmes p on p.programme_key='lower_back_leg' and p.owner_id is null
join public.recovery_stages s on s.stage_number=m.stage_number
join public.recovery_exercises e on e.exercise_key=k.exercise_key and e.owner_id is null;
