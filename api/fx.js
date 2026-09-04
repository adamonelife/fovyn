import worker from "../server/index.js";

function requestHeaders(headers) {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value))
      value.forEach((item) => result.append(name, item));
    else if (value != null) result.set(name, String(value));
  }
  return result;
}

export default async function handler(request, response) {
  const startedAt = Date.now();
  const host = request.headers.host || "fovyn.local";
  const url = new URL(request.url, `https://${host}`);
  const base = url.searchParams.get("base")?.toUpperCase() || null;
  const symbols = url.searchParams.get("symbols")?.toUpperCase() || null;

  console.info("[money-fx] request", { base, symbols });

  try {
    const result = await worker.fetch(
      new Request(url, {
        method: request.method,
        headers: requestHeaders(request.headers),
      }),
      {
        SUPABASE_URL:
          process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SECRET_KEY:
          process.env.SUPABASE_SECRET_KEY ??
          process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    );
    const body = await result.text();
    result.headers.forEach((value, name) => response.setHeader(name, value));
    console.info("[money-fx] response", {
      base,
      symbols,
      status: result.status,
      durationMs: Date.now() - startedAt,
    });
    response.status(result.status).send(body);
  } catch (error) {
    console.error("[money-fx] unhandled", {
      base,
      symbols,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    response.status(500).json({
      error: "The exchange-rate service could not complete the request.",
      errorCode: "CONVERSION_ERROR",
    });
  }
}
