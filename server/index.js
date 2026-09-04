export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/fx") {
      const base = (url.searchParams.get("base") || "").toUpperCase();
      const symbols = (url.searchParams.get("symbols") || "").toUpperCase();
      if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}(,[A-Z]{3})*$/.test(symbols))
        return Response.json(
          { error: "Invalid currency request" },
          { status: 400 },
        );
      const requested = symbols.split(","),
        now = Date.now(),
        day = 86400000,
        week = 7 * day;
      const supabaseHeaders =
        env.SUPABASE_URL && env.SUPABASE_SECRET_KEY
          ? {
              apikey: env.SUPABASE_SECRET_KEY,
              Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
              "Content-Type": "application/json",
            }
          : null;
      let cached = [];
      if (supabaseHeaders) {
        try {
          const cacheResponse = await fetch(
            `${env.SUPABASE_URL}/rest/v1/money_fx_rates?base_currency=eq.${base}&quote_currency=in.(${symbols})&select=base_currency,quote_currency,rate,provider,fetched_at`,
            { headers: supabaseHeaders },
          );
          if (cacheResponse.ok) cached = await cacheResponse.json();
        } catch {
          cached = [];
        }
      }
      const cacheByQuote = Object.fromEntries(
          cached.map((row) => [row.quote_currency, row]),
        ),
        fresh = requested.every(
          (code) =>
            cacheByQuote[code] &&
            now - new Date(cacheByQuote[code].fetched_at).getTime() < day,
        );
      if (fresh) {
        const newest = cached.reduce((latest, row) =>
          new Date(row.fetched_at) > new Date(latest.fetched_at) ? row : latest,
        );
        return Response.json(
          {
            rates: Object.fromEntries(
              requested.map((code) => [code, Number(cacheByQuote[code].rate)]),
            ),
            fetchedAt: newest.fetched_at,
            provider: newest.provider,
            cacheState: "cached",
          },
          { headers: { "Cache-Control": "private, max-age=3600" } },
        );
      }
      try {
        const upstream = await fetch(
          `https://api.frankfurter.dev/v2/rates?base=${base}&quotes=${symbols}`,
          { cf: { cacheTtl: 3600, cacheEverything: true } },
        );
        if (!upstream.ok) throw new Error("FX provider unavailable");
        const data = await upstream.json(),
          rates = Object.fromEntries(
            data.map((row) => [row.quote, Number(row.rate)]),
          ),
          missing = requested.filter(
            (code) => !Number.isFinite(rates[code]) || rates[code] <= 0,
          );
        if (missing.length) throw new Error("FX pair unavailable");
        const fetchedAt = new Date().toISOString();
        if (supabaseHeaders) {
          const rows = requested.map((code) => ({
            base_currency: base,
            quote_currency: code,
            rate: rates[code],
            provider: "Frankfurter v2",
            fetched_at: fetchedAt,
          }));
          try {
            await fetch(
              `${env.SUPABASE_URL}/rest/v1/money_fx_rates?on_conflict=base_currency,quote_currency`,
              {
                method: "POST",
                headers: {
                  ...supabaseHeaders,
                  Prefer: "resolution=merge-duplicates",
                },
                body: JSON.stringify(rows),
              },
            );
          } catch {
            // The live quote is still usable; the next request can retry caching.
          }
        }
        return Response.json(
          {
            rates,
            fetchedAt,
            rateDate: data[0]?.date,
            provider: "Frankfurter v2",
            cacheState: "fresh",
          },
          { headers: { "Cache-Control": "private, max-age=3600" } },
        );
      } catch {
        const usable = requested.every(
          (code) =>
            cacheByQuote[code] &&
            now - new Date(cacheByQuote[code].fetched_at).getTime() <= week,
        );
        if (usable) {
          const newest = cached.reduce((latest, row) =>
            new Date(row.fetched_at) > new Date(latest.fetched_at)
              ? row
              : latest,
          );
          return Response.json(
            {
              rates: Object.fromEntries(
                requested.map((code) => [
                  code,
                  Number(cacheByQuote[code].rate),
                ]),
              ),
              fetchedAt: newest.fetched_at,
              provider: newest.provider,
              cacheState: "stale",
            },
            { headers: { "Cache-Control": "private, max-age=900" } },
          );
        }
        return Response.json(
          {
            error:
              "Exchange rates are temporarily unavailable and no recent cached rate exists.",
          },
          { status: 503 },
        );
      }
    }
    const response = await env.ASSETS.fetch(request);
    if (
      response.status === 404 &&
      request.method === "GET" &&
      (request.headers.get("accept") || "").includes("text/html")
    ) {
      return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
    }
    return response;
  },
};
