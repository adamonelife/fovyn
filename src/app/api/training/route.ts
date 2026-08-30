import { NextRequest, NextResponse } from "next/server";
import { listCardio, loadWorkout, saveCardio, saveWorkout } from "@/lib/trainingService";
import type { CardioEntry, SaveWorkoutPayload } from "@/types/training";

export const runtime = "nodejs";

function failure(error: unknown, fallback: string, status = 500) {
  console.error(error);
  return NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action") || "workout";
    if (action === "cardio") return NextResponse.json({ entries: await listCardio() });
    if (action !== "workout") return failure(new Error("Unknown action"), "Unknown action", 400);
    return NextResponse.json(await loadWorkout(
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
      const sessionId = await saveWorkout(await request.json() as SaveWorkoutPayload);
      return NextResponse.json({ ok: true, sessionId });
    }
    if (action === "cardio") {
      const cardioId = await saveCardio(await request.json() as CardioEntry);
      return NextResponse.json({ ok: true, cardioId });
    }
    return failure(new Error("Unknown action"), "Unknown action", 400);
  } catch (error) {
    return failure(error, "Unable to save training data");
  }
}
