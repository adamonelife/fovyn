alter table public.reading_books
 add column if not exists ownership text not null default 'unknown' check (ownership in ('owned','not_owned','unknown')),
 add column if not exists series_name text not null default '',
 add column if not exists series_order numeric check (series_order is null or series_order>0),
 add column if not exists priority_label text not null default '',
 add column if not exists source_reference text not null default '',
 add column if not exists proposed boolean not null default false,
 add column if not exists reading_routine text not null default '',
 add column if not exists record_kind text not null default 'book' check (record_kind in ('book','collection','series_reference'));
create index if not exists reading_books_owner_series_idx on public.reading_books(owner_id,is_test,series_name,series_order) where deleted_at is null;
