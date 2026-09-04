import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./index.js";

const request = new Request("https://fovyn.test/api/fx?base=IDR&symbols=GBP");
const env = {
  SUPABASE_URL: "https://database.test",
  SUPABASE_SECRET_KEY: "secret",
};

afterEach(() => vi.unstubAllGlobals());

describe("Money FX API", () => {
  it("uses Frankfurter v2 and stores a fresh quote", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(
        Response.json([
          { date: "2026-09-04", base: "IDR", quote: "GBP", rate: 0.000042 },
        ]),
      )
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetch);

    const response = await handler.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      rates: { GBP: 0.000042 },
      provider: "Frankfurter v2",
      cacheState: "fresh",
    });
    expect(fetch.mock.calls[1][0]).toContain("api.frankfurter.dev/v2/rates");
    expect(fetch.mock.calls[2][0]).toContain("money_fx_rates");
  });

  it("falls back to a recent cached quote when the provider fails", async () => {
    const fetchedAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json([
          {
            base_currency: "IDR",
            quote_currency: "GBP",
            rate: 0.000041,
            provider: "Frankfurter v2",
            fetched_at: fetchedAt,
          },
        ]),
      )
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetch);

    const response = await handler.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      rates: { GBP: 0.000041 },
      cacheState: "stale",
    });
  });

  it("reports unavailability when neither provider nor cache can convert", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetch);

    const response = await handler.fetch(request, env);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("no recent cached rate"),
    });
  });
});
