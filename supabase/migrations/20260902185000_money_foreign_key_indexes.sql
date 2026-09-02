create index if not exists money_transactions_account_owner_fk_idx
  on public.money_transactions(account_id, owner_id);
create index if not exists money_transactions_destination_owner_fk_idx
  on public.money_transactions(destination_account_id, owner_id)
  where destination_account_id is not null;
create index if not exists money_recurring_account_owner_fk_idx
  on public.money_recurring_items(account_id, owner_id);
create index if not exists money_recurring_category_owner_fk_idx
  on public.money_recurring_items(category_id, owner_id);
