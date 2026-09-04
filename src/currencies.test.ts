import { describe, expect, it } from "vitest";
import { currencySearchText, isCurrencyCode } from "./currencies";
describe("canonical currencies", () => {
  it("finds Rupiah by country, name and code", () => {
    expect(currencySearchText("IDR")).toContain("indonesia");
    expect(currencySearchText("IDR")).toContain("rupiah");
    expect(currencySearchText("IDR")).toContain("idr");
  });
  it("rejects arbitrary text", () => {
    expect(isCurrencyCode("IDR")).toBe(true);
    expect(isCurrencyCode("IDRR")).toBe(false);
    expect(isCurrencyCode("Poundsss")).toBe(false);
  });
});
