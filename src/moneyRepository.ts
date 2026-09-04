import { goalOwner } from "./goalsRepository";
import { supabase } from "./supabase";
import { isCurrencyCode } from "./currencies";
const fail = (e: { message: string } | null, message: string) => {
  if (!e) return;
  console.error(message, e);
  if (e.message.includes("money_active_account_limit"))
    throw new Error("You can have up to three active Money accounts in V1.");
  throw new Error(message);
};
export type MoneyAccount = {
  id: string;
  name: string;
  account_type: "current_account" | "savings" | "cash" | "e_wallet" | "other";
  currency: string;
  opening_balance: number;
  include_in_total: boolean;
  icon_key: string;
  status: "active" | "archived";
  archived_at: string | null;
  balance: number;
};
export type MoneyCategory = {
  id: string;
  name: string;
  category_type: "expense" | "income";
  icon_key: string;
  is_system: boolean;
  archived_at: string | null;
};
export type MoneyTransaction = {
  id: string;
  transaction_type: "income" | "expense" | "transfer" | "balance_adjustment";
  amount: number;
  currency: string;
  account_id: string;
  destination_account_id: string | null;
  destination_amount: number | null;
  destination_currency: string | null;
  category_id: string | null;
  title: string | null;
  occurred_at: string;
  note: string | null;
  corrected_at: string | null;
  client_request_id: string | null;
  goalIds: string[];
};
export type MoneyRecurringItem = {
  id: string;
  name: string;
  transaction_type: "income" | "expense";
  amount: number;
  currency: string;
  account_id: string;
  category_id: string;
  recurrence: "weekly" | "monthly" | "yearly";
  next_expected_date: string;
  note: string | null;
  status: "active" | "archived";
};
export type FxQuote = {
  rate: number;
  fetchedAt: string;
  provider: string;
  cacheState: "fresh" | "cached" | "stale";
};
export type MoneyData = {
  accounts: MoneyAccount[];
  transactions: MoneyTransaction[];
  categories: MoneyCategory[];
  recurring: MoneyRecurringItem[];
  goals: { id: string; title: string }[];
  currency: string;
  fx: Record<string, FxQuote>;
  fxError: string | null;
};
export type MoneyAccountInput = Omit<
  MoneyAccount,
  "id" | "balance" | "archived_at" | "status"
>;
export type MoneyTransactionInput = Omit<
  MoneyTransaction,
  "id" | "corrected_at" | "client_request_id" | "goalIds"
> & { goalIds: string[]; clientRequestId?: string };
export type MoneyRecurringInput = Omit<MoneyRecurringItem, "id" | "status">;
const expenses = [
    ["Housing", "home"],
    ["Food & Dining", "nutrition"],
    ["Groceries", "nutrition"],
    ["Transport", "activity"],
    ["Shopping", "money"],
    ["Health & Fitness", "health"],
    ["Entertainment", "hobby"],
    ["Social", "social"],
    ["Travel", "travel"],
    ["Pets", "pet"],
    ["Bills & Utilities", "money"],
    ["Subscriptions", "routine"],
    ["Education", "reading"],
    ["Gifts", "people"],
    ["Personal Care", "self"],
    ["Family", "people"],
    ["Fees & Charges", "money"],
    ["Other", "money"],
  ] as const,
  incomes = [
    ["Salary", "money"],
    ["Freelance / Business", "work"],
    ["Bonus / Commission", "money"],
    ["Investment Income", "money"],
    ["Interest", "money"],
    ["Gift", "people"],
    ["Refund", "money"],
    ["Other Income", "money"],
  ] as const;
async function ensureCategories(owner_id: string) {
  const x = await supabase
    .from("money_categories")
    .select("id")
    .eq("owner_id", owner_id)
    .limit(1);
  fail(x.error, "We couldn't load your Money categories.");
  if (x.data?.length) return;
  const rows = [
    ...expenses.map(([name, icon_key]) => ({
      owner_id,
      name,
      icon_key,
      category_type: "expense",
      is_system: true,
    })),
    ...incomes.map(([name, icon_key]) => ({
      owner_id,
      name,
      icon_key,
      category_type: "income",
      is_system: true,
    })),
  ];
  fail(
    (await supabase.from("money_categories").insert(rows)).error,
    "We couldn't prepare your Money categories.",
  );
}
export function calculateBalances(
  accounts: Omit<MoneyAccount, "balance">[],
  transactions: MoneyTransaction[],
) {
  const b = new Map(accounts.map((a) => [a.id, Number(a.opening_balance)]));
  transactions.forEach((t) => {
    const source = b.get(t.account_id) ?? 0;
    if (t.transaction_type === "income")
      b.set(t.account_id, source + Number(t.amount));
    if (t.transaction_type === "expense")
      b.set(t.account_id, source - Number(t.amount));
    if (t.transaction_type === "balance_adjustment")
      b.set(t.account_id, source + Number(t.amount));
    if (t.transaction_type === "transfer") {
      b.set(t.account_id, source - Number(t.amount));
      if (t.destination_account_id)
        b.set(
          t.destination_account_id,
          (b.get(t.destination_account_id) ?? 0) + Number(t.destination_amount),
        );
    }
  });
  return accounts.map((a) => ({ ...a, balance: b.get(a.id) ?? 0 }));
}
async function loadFx(
  base: string,
  accounts: { currency: string }[],
): Promise<{ quotes: Record<string, FxQuote>; error: string | null }> {
  const symbols = [
    ...new Set(accounts.map((a) => a.currency).filter((x) => x !== base)),
  ];
  if (!symbols.length) return { quotes: {}, error: null };
  try {
    const response = await fetch(
        `/api/fx?base=${encodeURIComponent(base)}&symbols=${symbols.join(",")}`,
      ),
      body = (await response.json()) as {
        rates?: Record<string, number>;
        fetchedAt?: string;
        provider?: string;
        cacheState?: "fresh" | "cached" | "stale";
        error?: string;
      };
    if (!response.ok)
      return {
        quotes: {},
        error: body.error ?? "Exchange rates are temporarily unavailable.",
      };
    const quotes: Record<string, FxQuote> = Object.fromEntries(
      Object.entries(body.rates ?? {}).map(([currency, rate]) => [
        currency,
        {
          rate: 1 / rate,
          fetchedAt: body.fetchedAt ?? new Date().toISOString(),
          provider: body.provider ?? "Frankfurter",
          cacheState: body.cacheState ?? "fresh",
        },
      ]),
    );
    return {
      quotes,
      error: symbols.some((symbol) => !quotes[symbol])
        ? "One or more currencies could not be converted."
        : null,
    };
  } catch {
    return { quotes: {}, error: "Exchange rates are temporarily unavailable." };
  }
}
export function convertMoney(
  amount: number,
  currency: string,
  reporting: string,
  fx: Record<string, FxQuote>,
) {
  if (currency === reporting) return amount;
  const quote = fx[currency];
  return quote ? amount * quote.rate : null;
}
export async function loadMoney(): Promise<MoneyData> {
  const u = await goalOwner();
  await ensureCategories(u.id);
  const [a, t, c, r, g, l, p] = await Promise.all([
    supabase
      .from("money_accounts")
      .select("*")
      .eq("owner_id", u.id)
      .order("created_at"),
    supabase
      .from("money_transactions")
      .select("*")
      .eq("owner_id", u.id)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(1000),
    supabase
      .from("money_categories")
      .select("*")
      .eq("owner_id", u.id)
      .order("name"),
    supabase
      .from("money_recurring_items")
      .select("*")
      .eq("owner_id", u.id)
      .order("next_expected_date"),
    supabase
      .from("goals")
      .select("id,title")
      .eq("owner_id", u.id)
      .in("status", ["active", "dormant"])
      .order("title"),
    supabase
      .from("money_transaction_goals")
      .select("transaction_id,goal_id")
      .eq("owner_id", u.id),
    supabase
      .from("profiles")
      .select("default_currency")
      .eq("id", u.id)
      .single(),
  ]);
  fail(a.error, "We couldn't load your Money accounts.");
  fail(t.error, "We couldn't load your Money history.");
  fail(c.error, "We couldn't load your Money categories.");
  fail(r.error, "We couldn't load recurring items.");
  fail(g.error, "We couldn't load your Goals.");
  fail(l.error, "We couldn't load Money Goal links.");
  fail(p.error, "We couldn't load your reporting currency.");
  const transactions = (t.data ?? []).map((x) => ({
      ...x,
      amount: Number(x.amount),
      destination_amount:
        x.destination_amount == null ? null : Number(x.destination_amount),
      goalIds: (l.data ?? [])
        .filter((y) => y.transaction_id === x.id)
        .map((y) => y.goal_id),
    })) as MoneyTransaction[],
    bare = (a.data ?? []).map((x) => ({
      ...x,
      opening_balance: Number(x.opening_balance),
    })) as Omit<MoneyAccount, "balance">[],
    accounts = calculateBalances(bare, transactions),
    currency = p.data?.default_currency ?? "USD",
    fxResult = await loadFx(currency, [
      ...accounts.filter((x) => x.status === "active" && x.include_in_total),
      ...transactions,
    ]);
  return {
    accounts,
    transactions,
    categories: (c.data ?? []) as MoneyCategory[],
    recurring: (r.data ?? []).map((x) => ({
      ...x,
      amount: Number(x.amount),
    })) as MoneyRecurringItem[],
    goals: (g.data ?? []) as { id: string; title: string }[],
    currency,
    fx: fxResult.quotes,
    fxError: fxResult.error,
  };
}
export async function saveAccount(input: MoneyAccountInput, id?: string) {
  const u = await goalOwner();
  if (!input.name.trim()) throw new Error("Enter an account name.");
  if (!isCurrencyCode(input.currency))
    throw new Error("Choose a supported currency.");
  if (id) {
    const history = await supabase
        .from("money_transactions")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", u.id)
        .eq("account_id", id)
        .is("deleted_at", null),
      existing = await supabase
        .from("money_accounts")
        .select("currency")
        .eq("id", id)
        .eq("owner_id", u.id)
        .single();
    fail(history.error, "We couldn't check that account's history.");
    fail(existing.error, "We couldn't load that account.");
    if ((history.count ?? 0) > 0 && existing.data?.currency !== input.currency)
      throw new Error(
        "Account currency cannot be changed after transactions have been recorded.",
      );
  }
  const payload = {
      owner_id: u.id,
      ...input,
      name: input.name.trim(),
      currency: input.currency.toUpperCase(),
      updated_at: new Date().toISOString(),
    },
    result = id
      ? await supabase
          .from("money_accounts")
          .update(payload)
          .eq("id", id)
          .eq("owner_id", u.id)
      : await supabase.from("money_accounts").insert(payload);
  fail(result.error, "We couldn't save that account. Please try again.");
}
export async function setAccountArchived(id: string, archived: boolean) {
  const u = await goalOwner();
  fail(
    (
      await supabase
        .from("money_accounts")
        .update({
          status: archived ? "archived" : "active",
          archived_at: archived ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("owner_id", u.id)
    ).error,
    archived
      ? "We couldn't archive that account."
      : "We couldn't reactivate that account.",
  );
}
export async function saveReportingCurrency(currency: string) {
  if (!isCurrencyCode(currency))
    throw new Error("Choose a supported reporting currency.");
  const u = await goalOwner();
  fail(
    (
      await supabase
        .from("profiles")
        .update({
          default_currency: currency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", u.id)
    ).error,
    "We couldn't update your reporting currency.",
  );
}
export async function saveCategory(
  input: Pick<MoneyCategory, "name" | "category_type" | "icon_key">,
  id?: string,
) {
  const u = await goalOwner();
  if (!input.name.trim()) throw new Error("Enter a category name.");
  const payload = {
      owner_id: u.id,
      ...input,
      name: input.name.trim(),
      updated_at: new Date().toISOString(),
    },
    result = id
      ? await supabase
          .from("money_categories")
          .update(payload)
          .eq("id", id)
          .eq("owner_id", u.id)
          .eq("is_system", false)
      : await supabase
          .from("money_categories")
          .insert({ ...payload, is_system: false });
  fail(result.error, "We couldn't save that category. Please try again.");
}
export async function setCategoryArchived(id: string, archived: boolean) {
  const u = await goalOwner();
  fail(
    (
      await supabase
        .from("money_categories")
        .update({
          archived_at: archived ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("owner_id", u.id)
        .eq("is_system", false)
    ).error,
    "We couldn't update that category.",
  );
}
export function validateMoney(
  input: Pick<MoneyTransactionInput, "amount" | "currency"> & {
    transaction_type?: MoneyTransaction["transaction_type"];
  },
) {
  if (
    !Number.isFinite(input.amount) ||
    (input.transaction_type === "balance_adjustment"
      ? input.amount === 0
      : input.amount <= 0)
  )
    throw new Error(
      input.transaction_type === "balance_adjustment"
        ? "Enter a non-zero adjustment."
        : "Enter an amount greater than zero.",
    );
  if (!isCurrencyCode(input.currency))
    throw new Error("Choose a supported currency.");
}
export async function saveMoney(input: MoneyTransactionInput, id?: string) {
  validateMoney(input);
  const u = await goalOwner(),
    payload = {
      owner_id: u.id,
      transaction_type: input.transaction_type,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      account_id: input.account_id,
      destination_account_id: input.destination_account_id,
      destination_amount: input.destination_amount,
      destination_currency: input.destination_currency?.toUpperCase() ?? null,
      category_id: input.category_id,
      title: input.title?.trim() || null,
      occurred_at: new Date(input.occurred_at).toISOString(),
      note: input.note?.trim() || null,
      updated_at: new Date().toISOString(),
      ...(id
        ? { corrected_at: new Date().toISOString() }
        : { client_request_id: input.clientRequestId ?? crypto.randomUUID() }),
    };
  let transactionId = id;
  if (id) {
    const x = await supabase
      .from("money_transactions")
      .update(payload)
      .eq("id", id)
      .eq("owner_id", u.id)
      .select("id")
      .single();
    fail(x.error, "We couldn't update that transaction. Please try again.");
  } else {
    const x = await supabase
      .from("money_transactions")
      .insert(payload)
      .select("id")
      .single();
    fail(x.error, "We couldn't save that transaction. Please try again.");
    transactionId = x.data?.id;
  }
  if (!transactionId)
    throw new Error("We couldn't save that transaction. Please try again.");
  fail(
    (
      await supabase
        .from("money_transaction_goals")
        .delete()
        .eq("transaction_id", transactionId)
        .eq("owner_id", u.id)
    ).error,
    "We couldn't update that transaction's Goal links.",
  );
  if (input.goalIds.length)
    fail(
      (
        await supabase.from("money_transaction_goals").insert(
          input.goalIds.map((goal_id) => ({
            transaction_id: transactionId,
            goal_id,
            owner_id: u.id,
          })),
        )
      ).error,
      "We couldn't update that transaction's Goal links.",
    );
}
export async function removeMoney(id: string) {
  const u = await goalOwner();
  fail(
    (
      await supabase
        .from("money_transactions")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("owner_id", u.id)
    ).error,
    "We couldn't delete that transaction. Please try again.",
  );
}
export async function saveRecurring(input: MoneyRecurringInput, id?: string) {
  const u = await goalOwner(),
    payload = {
      owner_id: u.id,
      ...input,
      name: input.name.trim(),
      updated_at: new Date().toISOString(),
    },
    result = id
      ? await supabase
          .from("money_recurring_items")
          .update(payload)
          .eq("id", id)
          .eq("owner_id", u.id)
      : await supabase.from("money_recurring_items").insert(payload);
  fail(result.error, "We couldn't save that recurring item. Please try again.");
}
export async function advanceRecurring(item: MoneyRecurringItem) {
  const u = await goalOwner(),
    next = new Date(`${item.next_expected_date}T12:00:00Z`);
  if (item.recurrence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (item.recurrence === "monthly")
    next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCFullYear(next.getUTCFullYear() + 1);
  fail(
    (
      await supabase
        .from("money_recurring_items")
        .update({
          next_expected_date: next.toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("owner_id", u.id)
    ).error,
    "We logged the transaction, but couldn't update its next expected date.",
  );
}
export async function setRecurringArchived(id: string, archived: boolean) {
  const u = await goalOwner();
  fail(
    (
      await supabase
        .from("money_recurring_items")
        .update({
          status: archived ? "archived" : "active",
          archived_at: archived ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("owner_id", u.id)
    ).error,
    "We couldn't update that recurring item.",
  );
}
