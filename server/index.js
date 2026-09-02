export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/fx") {
      const base = (url.searchParams.get("base") || "").toUpperCase();
      const symbols = (url.searchParams.get("symbols") || "").toUpperCase();
      if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}(,[A-Z]{3})*$/.test(symbols))
        return Response.json({ error: "Invalid currency request" }, { status: 400 });
      try {
        const upstream = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${symbols}`, { cf: { cacheTtl: 3600, cacheEverything: true } });
        if (!upstream.ok) throw new Error("FX provider unavailable");
        const data = await upstream.json();
        return Response.json({ rates: data.rates, fetchedAt: new Date().toISOString(), rateDate: data.date, provider: "Frankfurter" }, { headers: { "Cache-Control": "public, max-age=3600" } });
      } catch {
        return Response.json({ error: "FX unavailable" }, { status: 503 });
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
