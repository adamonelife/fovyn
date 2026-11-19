create or replace function public.nutrition_plan_action(p_id uuid,p_action text) returns void language plpgsql security invoker set search_path='' as $$
declare m public.nutrition_planned_meals%rowtype;
begin
 select * into m from public.nutrition_planned_meals where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Meal not found'; end if;
 if p_action='eat' then
 if m.meal_date > (now() at time zone 'Asia/Makassar')::date then raise exception 'Cannot confirm a future meal'; end if;
 insert into public.nutrition_entries(id,owner_id,is_test,entry_kind,name,meal_type,calories,protein_g,carbs_g,fat_g,occurred_at,notes) values(m.id,m.owner_id,m.is_test,'meal_plan',m.name,m.meal_type,m.calories,m.protein_g,m.carbs_g,m.fat_g,(m.meal_date + case when m.meal_type='lunch' then time '12:00' else time '18:00' end) at time zone 'Asia/Makassar',nullif(m.portion,'')) on conflict(id) do update set deleted_at=null,name=excluded.name,meal_type=excluded.meal_type,calories=excluded.calories,protein_g=excluded.protein_g,carbs_g=excluded.carbs_g,fat_g=excluded.fat_g,occurred_at=excluded.occurred_at,notes=excluded.notes,updated_at=now() where nutrition_entries.owner_id=m.owner_id and nutrition_entries.is_test=m.is_test and nutrition_entries.deleted_at is not null;
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
create function public.nutrition_plan_edit(p_id uuid,p_date date,p_type text,p_name text,p_calories numeric,p_protein numeric,p_carbs numeric,p_fat numeric,p_portion text) returns void language plpgsql security invoker set search_path='' as $$
declare m public.nutrition_planned_meals%rowtype;
begin
 select * into m from public.nutrition_planned_meals where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Meal not found'; end if;
 if exists(select 1 from public.nutrition_entries where id=m.id and deleted_at is null) then raise exception 'Undo eaten before replacing a planned meal'; end if;
 update public.nutrition_planned_meals set meal_date=p_date,meal_type=p_type,name=p_name,calories=p_calories,protein_g=p_protein,carbs_g=p_carbs,fat_g=p_fat,portion=p_portion where id=m.id;
end $$;
revoke execute on function public.nutrition_plan_edit(uuid,date,text,text,numeric,numeric,numeric,numeric,text) from public,anon;
grant execute on function public.nutrition_plan_edit(uuid,date,text,text,numeric,numeric,numeric,numeric,text) to authenticated;