export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/fx") {
      const base = (url.searchParams.get("base") || "").toUpperCase();
      const symbols = (url.searchParams.get("symbols") || "").toUpperCase();
      if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}(,[A-Z]{3})*$/.test(symbols))
        return Response.json(
          {
            error: "Invalid currency request",
            errorCode: "INVALID_ACCOUNT_CURRENCY",
          },
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
      let cached = [],
        cacheError = null;
      if (supabaseHeaders) {
        try {
          const cacheResponse = await fetch(
            `${env.SUPABASE_URL}/rest/v1/money_fx_rates?base_currency=eq.${base}&quote_currency=in.(${symbols})&select=base_currency,quote_currency,rate,provider,fetched_at`,
            { headers: supabaseHeaders },
          );
          if (cacheResponse.ok) cached = await cacheResponse.json();
          else cacheError = `Cache read returned ${cacheResponse.status}`;
        } catch (error) {
          cacheError = error instanceof Error ? error.message : String(error);
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
            cacheError,
          },
          { headers: { "Cache-Control": "private, max-age=3600" } },
        );
      }
      try {
        const upstream = await fetch(
          `https://api.frankfurter.dev/v2/rates?base=${base}&quotes=${symbols}`,
          { cf: { cacheTtl: 3600, cacheEverything: true } },
        );
        if (!upstream.ok)
          throw new Error(`Provider returned HTTP ${upstream.status}`);
        const data = await upstream.json(),
          rates = Object.fromEntries(
            data.map((row) => [row.quote, Number(row.rate)]),
          ),
          missing = requested.filter(
            (code) => !Number.isFinite(rates[code]) || rates[code] <= 0,
          );
        if (missing.length)
          throw new Error(`Provider omitted: ${missing.join(",")}`);
        const fetchedAt = new Date().toISOString();
        let cacheStored = false;
        if (supabaseHeaders) {
          const rows = requested.flatMap((code) => [
            {
              base_currency: base,
              quote_currency: code,
              rate: rates[code],
              provider: "Frankfurter v2",
              fetched_at: fetchedAt,
            },
            {
              base_currency: code,
              quote_currency: base,
              rate: 1 / rates[code],
              provider: "Frankfurter v2",
              fetched_at: fetchedAt,
            },
          ]);
          try {
            const cacheWrite = await fetch(
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
            cacheStored = cacheWrite.ok;
            if (!cacheWrite.ok)
              cacheError = `Cache write returned ${cacheWrite.status}`;
          } catch (error) {
            cacheError = error instanceof Error ? error.message : String(error);
          }
        } else {
          cacheError = "Supabase cache environment is not configured";
        }
        return Response.json(
          {
            rates,
            fetchedAt,
            rateDate: data[0]?.date,
            provider: "Frankfurter v2",
            cacheState: "fresh",
            cacheStored,
            cacheError,
          },
          { headers: { "Cache-Control": "private, max-age=3600" } },
        );
      } catch (error) {
        const providerError =
          error instanceof Error ? error.message : String(error);
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
              cacheError,
              providerError,
            },
            { headers: { "Cache-Control": "private, max-age=900" } },
          );
        }
        return Response.json(
          {
            error:
              "Exchange rates are temporarily unavailable and no recent cached rate exists.",
            errorCode: "PROVIDER_FAILURE",
            provider: "Frankfurter v2",
            cacheState: "failed",
            cacheError,
            providerError,
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
