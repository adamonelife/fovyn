alter table public.trackers add column if not exists icon_key text;
alter table public.habits add column if not exists icon_key text;
alter table public.hobbies add column if not exists icon_key text;

update public.trackers set icon_key = case
  when module = 'training' then 'strength'
  when module = 'sleep' then 'sleep'
  when module = 'nutrition' then 'nutrition'
  when module = 'money' then 'money'
  when module = 'medication' then 'supplement'
  when module = 'activity' then 'activity'
  else 'metric'
end where icon_key is null;
update public.habits set icon_key = 'habit' where icon_key is null;
update public.hobbies set icon_key = 'hobby' where icon_key is null;

alter table public.trackers alter column icon_key set default 'metric';
alter table public.trackers alter column icon_key set not null;
alter table public.habits alter column icon_key set default 'habit';
alter table public.habits alter column icon_key set not null;
alter table public.hobbies alter column icon_key set default 'hobby';
alter table public.hobbies alter column icon_key set not null;

comment on column public.trackers.icon_key is 'Stable curated functional icon key used across Fovyn surfaces.';
comment on column public.habits.icon_key is 'Stable curated functional icon key used across Fovyn surfaces.';
comment on column public.hobbies.icon_key is 'Stable curated functional icon key used across Fovyn surfaces.';
