import { NextRequest, NextResponse } from "next/server";
import { listCardio, loadWorkout, saveCardio, saveWorkout } from "@/lib/trainingService";
import type { CardioEntry, SaveWorkoutPayload } from "@/types/training";

export const runtime = "nodejs";

function accessToken(request: NextRequest): string {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

function failure(error: unknown, fallback: string, status = 500) {
  console.error(error);
  const message = error instanceof Error ? error.message : fallback;
  const responseStatus = message.includes("sign in") || message.includes("session has expired") ? 401 : status;
  return NextResponse.json({ error: message }, { status: responseStatus });
}

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action") || "workout";
    if (action === "cardio") return NextResponse.json({ entries: await listCardio(accessToken(request)) });
    if (action !== "workout") return failure(new Error("Unknown action"), "Unknown action", 400);
    return NextResponse.json(await loadWorkout(
      accessToken(request),
      request.nextUrl.searchParams.get("type") || "Pull",
      request.nextUrl.searchParams.get("variant") || "A",
    ));
  } catch (error) {
    return failure(error, "Unable to load training data");
  }
}

export async function POST(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action");
    if (action === "save-workout") {
      const sessionId = await saveWorkout(accessToken(request), await request.json() as SaveWorkoutPayload);
      return NextResponse.json({ ok: true, sessionId });
    }
    if (action === "cardio") {
      const cardioId = await saveCardio(accessToken(request), await request.json() as CardioEntry);
      return NextResponse.json({ ok: true, cardioId });
    }
    return failure(new Error("Unknown action"), "Unknown action", 400);
  } catch (error) {
    return failure(error, "Unable to save training data");
  }
}
