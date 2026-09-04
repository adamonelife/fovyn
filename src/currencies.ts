export const currencyCodes = [
  "AED",
  "ARS",
  "AUD",
  "BDT",
  "BGN",
  "BHD",
  "BRL",
  "CAD",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CZK",
  "DKK",
  "DZD",
  "EGP",
  "EUR",
  "GBP",
  "GHS",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "ISK",
  "JPY",
  "KES",
  "KRW",
  "KWD",
  "MAD",
  "MXN",
  "MYR",
  "NGN",
  "NOK",
  "NZD",
  "OMR",
  "PEN",
  "PHP",
  "PKR",
  "PLN",
  "QAR",
  "RON",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "TWD",
  "UGX",
  "USD",
  "VND",
  "XAF",
  "XOF",
  "ZAR",
] as const;
export type CurrencyCode = (typeof currencyCodes)[number];
const countries: Partial<Record<CurrencyCode, string>> = {
  IDR: "Indonesia Rupiah",
  GBP: "British United Kingdom Pound",
  USD: "United States Dollar",
  SGD: "Singapore Dollar",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  NZD: "New Zealand Dollar",
};
const names = new Intl.DisplayNames(["en"], { type: "currency" });
export function isCurrencyCode(value: string): value is CurrencyCode {
  return (currencyCodes as readonly string[]).includes(value.toUpperCase());
}
export function currencyName(code: string) {
  return names.of(code) ?? code;
}
export function currencySymbol(code: string) {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? code
    );
  } catch {
    return code;
  }
}
export function currencySearchText(code: CurrencyCode) {
  return `${currencyName(code)} ${code} ${currencySymbol(code)} ${countries[code] ?? ""}`.toLowerCase();
}
export function currencyLabel(code: string) {
  return `${currencyName(code)} · ${code} · ${currencySymbol(code)}`;
}
