import { describe, expect, it } from "vitest";
import {
  calculateBalances,
  convertMoney,
  validateMoney,
  type MoneyAccount,
  type MoneyTransaction,
} from "./moneyRepository";
describe("money validation", () => {
  it("accepts ISO currency", () =>
    expect(() =>
      validateMoney({ amount: 250000, currency: "IDR" }),
    ).not.toThrow());
  it("rejects non-positive transaction amounts", () => {
    expect(() =>
      validateMoney({
        amount: -1,
        currency: "GBP",
        transaction_type: "expense",
      }),
    ).toThrow(/greater than zero/);
    expect(() =>
      validateMoney({ amount: 0, currency: "GBP", transaction_type: "income" }),
    ).toThrow(/greater than zero/);
  });
  it("allows negative but not zero balance adjustments", () => {
    expect(() =>
      validateMoney({
        amount: -10,
        currency: "GBP",
        transaction_type: "balance_adjustment",
      }),
    ).not.toThrow();
    expect(() =>
      validateMoney({
        amount: 0,
        currency: "GBP",
        transaction_type: "balance_adjustment",
      }),
    ).toThrow(/non-zero/);
  });
  it("rejects invalid currencies", () =>
    expect(() => validateMoney({ amount: 1, currency: "£" })).toThrow(
      /currency/,
    ));
});
describe("canonical Money balances", () => {
  it("counts income, expenses, transfers and adjustments without treating transfers as income", () => {
    const base = {
        include_in_total: true,
        icon_key: "money",
        status: "active" as const,
        archived_at: null,
        account_type: "current_account" as const,
      },
      accounts = [
        {
          ...base,
          id: "main",
          name: "Main",
          currency: "GBP",
          opening_balance: 1000,
        },
        {
          ...base,
          id: "savings",
          name: "Savings",
          currency: "GBP",
          opening_balance: 0,
          account_type: "savings" as const,
        },
      ] as Omit<MoneyAccount, "balance">[],
      row = {
        currency: "GBP",
        destination_currency: null,
        destination_amount: null,
        destination_account_id: null,
        category_id: null,
        title: null,
        occurred_at: "2026-09-02T10:00:00Z",
        note: null,
        corrected_at: null,
        client_request_id: null,
        goalIds: [] as string[],
      },
      transactions = [
        {
          ...row,
          id: "income",
          transaction_type: "income",
          amount: 500,
          account_id: "main",
        },
        {
          ...row,
          id: "expense",
          transaction_type: "expense",
          amount: 100,
          account_id: "main",
        },
        {
          ...row,
          id: "transfer",
          transaction_type: "transfer",
          amount: 250,
          account_id: "main",
          destination_account_id: "savings",
          destination_amount: 250,
          destination_currency: "GBP",
        },
        {
          ...row,
          id: "adjust",
          transaction_type: "balance_adjustment",
          amount: 20,
          account_id: "main",
        },
      ] as MoneyTransaction[];
    expect(
      calculateBalances(accounts, transactions).map((x) => [x.id, x.balance]),
    ).toEqual([
      ["main", 1170],
      ["savings", 250],
    ]);
  });
});

describe("Money currency conversion", () => {
  const fx = {
    GBP: {
      rate: 23809.5238095,
      fetchedAt: "2026-09-04T00:00:00.000Z",
      provider: "Frankfurter v2",
      cacheState: "fresh" as const,
    },
  };

  it("keeps native reporting-currency amounts unchanged", () => {
    expect(convertMoney(4_631_199, "IDR", "IDR", fx)).toBe(4_631_199);
  });

  it("converts foreign balances with the shared quote", () => {
    expect(convertMoney(1_282.23, "GBP", "IDR", fx)).toBeCloseTo(
      30_529_285.714,
      2,
    );
  });

  it("returns unavailable when a required quote is missing", () => {
    expect(convertMoney(100, "EUR", "IDR", fx)).toBeNull();
  });
});
