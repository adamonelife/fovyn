alter table public.tracking_records
  add column if not exists canonical_record_id uuid;

update public.tracking_records
set canonical_record_id = id
where canonical_record_id is null;

alter table public.tracking_records
  alter column canonical_record_id set not null,
  add constraint tracking_records_id_owner_unique unique (id, owner_id),
  add constraint tracking_records_canonical_owner_fk
    foreign key (canonical_record_id, owner_id)
    references public.tracking_records (id, owner_id);

create index if not exists tracking_records_canonical_record_idx
  on public.tracking_records (owner_id, canonical_record_id)
  where deleted_at is null;

create index if not exists tracking_records_canonical_owner_fk_idx
  on public.tracking_records (canonical_record_id, owner_id);

create or replace function public.set_tracking_record_canonical_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.canonical_record_id is null then
    new.canonical_record_id := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_tracking_record_canonical_identity on public.tracking_records;
create trigger set_tracking_record_canonical_identity
before insert on public.tracking_records
for each row execute function public.set_tracking_record_canonical_identity();

comment on column public.tracking_records.canonical_record_id is
'Identity of the one real-world fact represented by this row. Multiple derived representations may share it; History renders one primary occurrence.';
