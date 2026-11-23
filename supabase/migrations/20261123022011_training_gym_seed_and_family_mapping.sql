-- Seed only the agreed initial gyms. Existing exercise IDs and history are never changed.
insert into public.training_gym_profiles(owner_id,name) select o.owner_id,n.name from (select distinct owner_id from public.training_exercises)o cross join(values('New Gym'),('Original Gym'),('Home'))n(name) on conflict do nothing;
insert into public.training_gym_preferences(owner_id,selected_gym_id) select owner_id,id from public.training_gym_profiles where name='New Gym' on conflict(owner_id) do nothing;
-- Movement families and confident mappings were seeded by the applied production migration.
-- Ambiguous legacy exercises deliberately retain review_required rather than being merged or renamed.