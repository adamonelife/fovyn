alter table public.reading_books
 add column if not exists completion_date date,
 add column if not exists status_before_completion text check (status_before_completion is null or status_before_completion in ('reading','want','paused','unspecified')),
 add column if not exists status_revision integer not null default 0 check (status_revision >= 0);
create or replace function public.reading_book_status_revision() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
 if new.status <> 'completed' then
   new.completion_date := null;
   new.status_before_completion := null;
 end if;
 if new.status is distinct from old.status or new.completion_date is distinct from old.completion_date or new.status_before_completion is distinct from old.status_before_completion then
   new.status_revision := old.status_revision + 1;
 else
   new.status_revision := old.status_revision;
 end if;
 return new;
end;
$$;
create trigger reading_book_status_revision_trigger before update on public.reading_books for each row execute function public.reading_book_status_revision();
