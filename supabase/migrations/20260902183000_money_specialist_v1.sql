-- Money Specialist V1: canonical private accounts, transactions, categories,
-- recurring expectations and FX estimates. Native monetary values remain authoritative.

create table if not exists public.money_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  account_type text not null check (account_type in ('current_account','savings','cash','e_wallet','other')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  opening_balance numeric(20,6) not null default 0,
  include_in_total boolean not null default true,
  icon_key text not null default 'money',
  status text not null default 'active' check (status in ('active','archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  check ((status = 'archived') = (archived_at is not null))
);

alter table public.money_categories
  add column if not exists category_type text not null default 'expense'
    check (category_type in ('expense','income')),
  add column if not exists icon_key text not null default 'money',
  add column if not exists is_system boolean not null default false;

alter table public.money_categories
  add constraint money_categories_id_owner_unique unique (id, owner_id);

alter table public.money_transactions
  add column if not exists account_id uuid,
  add column if not exists destination_account_id uuid,
  add column if not exists destination_amount numeric(20,6),
  add column if not exists destination_currency text,
  add column if not exists title text,
  add column if not exists client_request_id uuid;

alter table public.money_transactions drop constraint if exists money_transactions_transaction_type_check;
alter table public.money_transactions drop constraint if exists money_transactions_amount_check;
alter table public.money_transactions
  add constraint money_transactions_transaction_type_check
    check (transaction_type in ('income','expense','transfer','balance_adjustment')),
  add constraint money_transactions_amount_check
    check (
      (transaction_type = 'balance_adjustment' and amount <> 0)
      or (transaction_type <> 'balance_adjustment' and amount > 0)
    ),
  add constraint money_transactions_destination_check
    check (
      (transaction_type = 'transfer'
        and destination_account_id is not null
        and destination_amount is not null and destination_amount > 0
        and destination_currency ~ '^[A-Z]{3}$'
        and destination_account_id <> account_id)
      or
      (transaction_type <> 'transfer'
        and destination_account_id is null
        and destination_amount is null
        and destination_currency is null)
    );

alter table public.money_transactions
  add constraint money_transactions_account_owner_fkey
    foreign key (account_id, owner_id) references public.money_accounts(id, owner_id),
  add constraint money_transactions_destination_account_owner_fkey
    foreign key (destination_account_id, owner_id) references public.money_accounts(id, owner_id);

create unique index if not exists money_transactions_owner_request_unique
  on public.money_transactions(owner_id, client_request_id)
  where client_request_id is not null;
create index if not exists money_transactions_owner_account_occurred_idx
  on public.money_transactions(owner_id, account_id, occurred_at desc)
  where deleted_at is null;
create index if not exists money_transactions_owner_destination_occurred_idx
  on public.money_transactions(owner_id, destination_account_id, occurred_at desc)
  where deleted_at is null and destination_account_id is not null;
create index if not exists money_transactions_owner_type_occurred_idx
  on public.money_transactions(owner_id, transaction_type, occurred_at desc)
  where deleted_at is null;

create table if not exists public.money_recurring_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  transaction_type text not null check (transaction_type in ('income','expense')),
  amount numeric(20,6) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  account_id uuid not null,
  category_id uuid not null,
  recurrence text not null check (recurrence in ('weekly','monthly','yearly')),
  next_expected_date date not null,
  note text,
  status text not null default 'active' check (status in ('active','archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (account_id, owner_id) references public.money_accounts(id, owner_id),
  foreign key (category_id, owner_id) references public.money_categories(id, owner_id),
  check ((status = 'archived') = (archived_at is not null))
);

create table if not exists public.money_fx_rates (
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  quote_currency text not null check (quote_currency ~ '^[A-Z]{3}$'),
  rate numeric(24,10) not null check (rate > 0),
  provider text not null,
  fetched_at timestamptz not null,
  primary key (base_currency, quote_currency),
  check (base_currency <> quote_currency)
);

create index if not exists money_accounts_owner_active_idx
  on public.money_accounts(owner_id, created_at)
  where status = 'active';
create unique index if not exists money_accounts_owner_active_name_unique
  on public.money_accounts(owner_id, lower(name))
  where status = 'active';
create index if not exists money_recurring_owner_due_idx
  on public.money_recurring_items(owner_id, next_expected_date)
  where status = 'active';
create index if not exists money_categories_owner_type_active_idx
  on public.money_categories(owner_id, category_type, name)
  where archived_at is null;

create or replace function public.enforce_money_active_account_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' and (
    tg_op = 'INSERT' or old.status is distinct from 'active'
  ) then
    if (
      select count(*) from public.money_accounts
      where owner_id = new.owner_id and status = 'active'
    ) >= 3 then
      raise exception using errcode = 'P0001', message = 'money_active_account_limit';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists money_active_account_limit on public.money_accounts;
create trigger money_active_account_limit
before insert or update of status on public.money_accounts
for each row execute function public.enforce_money_active_account_limit();
revoke all on function public.enforce_money_active_account_limit() from public;

alter table public.money_accounts enable row level security;
alter table public.money_recurring_items enable row level security;
alter table public.money_fx_rates enable row level security;

create policy money_accounts_select_own on public.money_accounts for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy money_accounts_insert_own on public.money_accounts for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy money_accounts_update_own on public.money_accounts for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy money_accounts_delete_own on public.money_accounts for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy money_recurring_select_own on public.money_recurring_items for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy money_recurring_insert_own on public.money_recurring_items for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy money_recurring_update_own on public.money_recurring_items for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy money_recurring_delete_own on public.money_recurring_items for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy money_fx_rates_read on public.money_fx_rates for select to authenticated using (true);

grant select, insert, update, delete on public.money_accounts to authenticated;
grant select, insert, update, delete on public.money_recurring_items to authenticated;
grant select on public.money_fx_rates to authenticated;

comment on table public.money_accounts is 'Private user-owned Money accounts. Native balances are derived from opening balance and canonical transactions.';
comment on table public.money_transactions is 'Canonical Money facts: income, expense, transfer or explicit balance adjustment.';
comment on table public.money_fx_rates is 'Current conversion estimates only; native Money values remain authoritative.';
