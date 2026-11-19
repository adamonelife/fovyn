create table public.nutrition_planned_meals (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 is_test boolean not null default false,
 meal_date date not null check(extract(isodow from meal_date) between 1 and 5),
 meal_type text not null check(meal_type in ('lunch','dinner')),
 name text not null check(length(trim(name)) between 1 and 300),
 calories numeric not null check(calories between 0 and 10000),
 protein_g numeric not null check(protein_g between 0 and 1000),
 carbs_g numeric not null check(carbs_g between 0 and 1000),
 fat_g numeric not null check(fat_g between 0 and 1000),
 portion text not null default '',
 skipped boolean not null default false,
 unique(owner_id,is_test,meal_date,meal_type)
);
alter table public.nutrition_planned_meals enable row level security;
grant select,insert,update on public.nutrition_planned_meals to authenticated;
create policy planned_meals_own on public.nutrition_planned_meals for all to authenticated using(owner_id=(select auth.uid()) and is_test=(private.active_data_context()='test')) with check(owner_id=(select auth.uid()) and is_test=(private.active_data_context()='test'));
create function public.nutrition_plan_action(p_id uuid,p_action text) returns void language plpgsql security invoker set search_path='' as $$
declare m public.nutrition_planned_meals%rowtype;
begin
 select * into m from public.nutrition_planned_meals where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Meal not found'; end if;
 if p_action='eat' then
 if m.meal_date > (now() at time zone 'Asia/Makassar')::date then raise exception 'Cannot confirm a future meal'; end if;
 insert into public.nutrition_entries(id,owner_id,is_test,entry_kind,name,meal_type,calories,protein_g,carbs_g,fat_g,occurred_at,notes) values(m.id,m.owner_id,m.is_test,'meal_plan',m.name,m.meal_type,m.calories,m.protein_g,m.carbs_g,m.fat_g,(m.meal_date + case when m.meal_type='lunch' then time '12:00' else time '18:00' end) at time zone 'Asia/Makassar',nullif(m.portion,'')) on conflict(id) do update set deleted_at=null,updated_at=now() where nutrition_entries.owner_id=m.owner_id and nutrition_entries.is_test=m.is_test and nutrition_entries.deleted_at is not null;
 update public.nutrition_planned_meals set skipped=false where id=m.id;
 elsif p_action='undo' then
 update public.nutrition_entries set deleted_at=now(),updated_at=now() where id=m.id and owner_id=m.owner_id and is_test=m.is_test and deleted_at is null;
 update public.nutrition_planned_meals set skipped=false where id=m.id;
 elsif p_action='skip' then
 if exists(select 1 from public.nutrition_entries where id=m.id and deleted_at is null) then raise exception 'Undo eaten first'; end if;
 update public.nutrition_planned_meals set skipped=true where id=m.id;
 else raise exception 'Invalid action'; end if;
end $$;
revoke execute on function public.nutrition_plan_action(uuid,text) from public,anon;
grant execute on function public.nutrition_plan_action(uuid,text) to authenticated;