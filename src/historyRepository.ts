import { supabase } from "./supabase";
import { goalOwner } from "./goalsRepository";
import { formatDisplayLabel } from "./displayLabels";
import { fovynDateKey, shiftDateKey } from "./fovynDate";

const fail = (label: string, error: { message: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message}`);
};
export type HistoryItem = {
  id: string;
  kind:
    | "record"
    | "habit"
    | "note"
    | "sleep"
    | "activity"
    | "nutrition"
    | "money"
    | "hobby"
    | "training"
    | "social"
    | "alcohol"
    | "recovery";
  logView?: string;
  iconKey?: string | null;
  title: string;
  detail: string;
  occurredAt: string;
  dateKey?: string;
  corrected: boolean;
  goalNames: string[];
  nutrition?: {
    mealType: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};
export type HistoryData = {
  items: HistoryItem[];
  daysPresent: number;
  currentStreak: number;
  contributions: number;
  timezone: string;
  today: string;
};
export type PeriodicReview = {
  id: string;
  period_type: "weekly" | "monthly";
  period_start: string;
  period_end: string;
  summary: string | null;
  wins: string | null;
  friction: string | null;
  next_focus: string | null;
  updated_at: string;
};
export const historyKindForModule = (
  module: string | undefined,
): HistoryItem["kind"] =>
  module === "social"
    ? "social"
    : module === "alcohol"
      ? "alcohol"
      : module === "medication"
        ? "recovery"
        : "record";

export function streakForDates(values: string[], today = new Date()) {
  const localKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const days = new Set(values),
    cursor = new Date(`${localKey}T00:00:00Z`);
  let count = 0;
  if (!days.has(cursor.toISOString().slice(0, 10)))
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}

export async function loadHistory(days = 30): Promise<HistoryData> {
  const user = await goalOwner(),
    profile = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();
  fail("History timezone", profile.error);
  const timezone = profile.data?.timezone || "UTC",
    today = fovynDateKey(timezone),
    sinceKey = days ? shiftDateKey(today, -days) : undefined,
    since = sinceKey ? `${sinceKey}T00:00:00.000Z` : undefined;
  let recordsQuery = supabase
    .from("tracking_records")
    .select(
      "id,tracker_id,value,unit_key,custom_unit,currency,occurred_at,note,corrected_at,occurrence_status",
    )
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(500);
  let habitsQuery = supabase
    .from("habit_entries")
    .select("id,habit_id,status,value,note,entry_date,updated_at")
    .eq("owner_id", user.id)
    .order("entry_date", { ascending: false })
    .limit(500);
  if (since) {
    recordsQuery = recordsQuery.gte("occurred_at", since);
    habitsQuery = habitsQuery.gte("entry_date", since.slice(0, 10));
  }
  const [records, entries, trackers, habits, links] = await Promise.all([
    recordsQuery,
    habitsQuery,
    supabase
      .from("trackers")
      .select("id,name,module,icon_key,custom_unit")
      .eq("owner_id", user.id),
    supabase
      .from("habits")
      .select("id,name,icon_key,unit")
      .eq("owner_id", user.id),
    supabase
      .from("goal_contributions")
      .select("record_id,goals(title)")
      .eq("owner_id", user.id),
  ]);
  fail("History records", records.error);
  fail("History habits", entries.error);
  fail("History trackers", trackers.error);
  fail("History habit names", habits.error);
  fail("History Goal links", links.error);
  let notesQuery = supabase
    .from("notes")
    .select("id,title,body,occurred_at,corrected_at")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (since) notesQuery = notesQuery.gte("occurred_at", since);
  const [notes, noteLinks] = await Promise.all([
    notesQuery,
    supabase
      .from("note_goals")
      .select("note_id,goals(title)")
      .eq("owner_id", user.id),
  ]);
  fail("History Notes", notes.error);
  fail("History Note links", noteLinks.error);
  let sleepQuery = supabase
    .from("sleep_entries")
    .select("id,bedtime,wake_time,quality,waking_energy,corrected_at")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("wake_time", { ascending: false })
    .limit(500);
  if (since) sleepQuery = sleepQuery.gte("wake_time", since);
  const [sleep, sleepLinks] = await Promise.all([
    sleepQuery,
    supabase
      .from("sleep_entry_goals")
      .select("sleep_entry_id,goals(title)")
      .eq("owner_id", user.id),
  ]);
  fail("History Sleep", sleep.error);
  fail("History Sleep links", sleepLinks.error);
  let activityQuery = supabase
    .from("cardio_entries")
    .select(
      "id,activity,duration_min,distance_km,is_social,occurred_at,performed_on,corrected_at",
    )
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (since) activityQuery = activityQuery.gte("occurred_at", since);
  const [activities, activityLinks] = await Promise.all([
    activityQuery,
    supabase
      .from("cardio_entry_goals")
      .select("cardio_entry_id,goals(title)")
      .eq("owner_id", user.id),
  ]);
  fail("History Activities", activities.error);
  fail("History Activity links", activityLinks.error);
  let nutritionQuery = supabase
    .from("nutrition_entries")
    .select(
      "id,name,meal_type,calories,protein_g,carbs_g,fat_g,fibre_g,occurred_at,corrected_at",
    )
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (since) nutritionQuery = nutritionQuery.gte("occurred_at", since);
  const [nutrition, nutritionLinks] = await Promise.all([
    nutritionQuery,
    supabase
      .from("nutrition_entry_goals")
      .select("nutrition_entry_id,goals(title)")
      .eq("owner_id", user.id),
  ]);
  fail("History Nutrition", nutrition.error);
  fail("History Nutrition links", nutritionLinks.error);
  let moneyQuery = supabase
    .from("money_transactions")
    .select("id,transaction_type,amount,currency,occurred_at,note,corrected_at")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (since) moneyQuery = moneyQuery.gte("occurred_at", since);
  const [money, moneyLinks] = await Promise.all([
    moneyQuery,
    supabase
      .from("money_transaction_goals")
      .select("transaction_id,goals(title)")
      .eq("owner_id", user.id),
  ]);
  fail("History Money", money.error);
  fail("History Money links", moneyLinks.error);
  let hobbyQuery = supabase
    .from("hobby_entries")
    .select("id,hobby_id,amount,unit,occurred_at,note,corrected_at")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (since) hobbyQuery = hobbyQuery.gte("occurred_at", since);
  const [hobbyEntries, hobbies, hobbyLinks] = await Promise.all([
    hobbyQuery,
    supabase.from("hobbies").select("id,name").eq("owner_id", user.id),
    supabase
      .from("hobby_entry_goals")
      .select("entry_id,goals(title)")
      .eq("owner_id", user.id),
  ]);
  fail("History Hobbies", hobbyEntries.error);
  fail("History Hobby names", hobbies.error);
  fail("History Hobby links", hobbyLinks.error);
  let trainingQuery = supabase
    .from("training_sessions")
    .select(
      "id,performed_on,workout_type,variant,session_type,duration_min,notes,source_payload",
    )
    .eq("owner_id", user.id)
    .order("performed_on", { ascending: false })
    .limit(500);
  if (since)
    trainingQuery = trainingQuery.gte("performed_on", since.slice(0, 10));
  const training = await trainingQuery;
  fail("History Training", training.error);
  const recordItems: HistoryItem[] = (records.data ?? []).map((r) => {
    const tracker = (trackers.data ?? []).find((t) => t.id === r.tracker_id),
      goalNames = (links.data ?? [])
        .filter((x) => x.record_id === r.id)
        .flatMap((x) => {
          const goal = x.goals as unknown as { title: string } | null;
          return goal ? [goal.title] : [];
        }),
      kind = historyKindForModule(tracker?.module);
    const unit = r.currency || r.custom_unit || tracker?.custom_unit || "",
      fact = r.occurrence_status
        ? formatDisplayLabel(r.occurrence_status)
        : `${r.value}${unit ? ` ${unit}` : ""}`;
    return {
      id: r.id,
      kind,
      logView: tracker?.module,
      iconKey: tracker?.icon_key,
      title: tracker?.name || "Recorded item",
      detail: r.note ? `${fact} · ${r.note}` : fact,
      occurredAt: r.occurred_at,
      corrected: Boolean(r.corrected_at),
      goalNames,
    };
  });
  const habitItems: HistoryItem[] = (entries.data ?? []).map((e) => {
    const habit = (habits.data ?? []).find((h) => h.id === e.habit_id);
    return {
      id: e.id,
      kind: "habit",
      logView: "habits",
      iconKey: habit?.icon_key,
      title: habit?.name || "Habit",
      detail:
        e.status === "skipped" ? "N/A" : e.note || formatDisplayLabel(e.status),
      occurredAt: `${e.entry_date}T12:00:00`,
      corrected: false,
      goalNames: [],
    };
  });
  const noteItems: HistoryItem[] = (notes.data ?? []).map((n) => ({
    id: n.id,
    kind: "note",
    logView: "notes",
    title: n.title,
    detail: n.body,
    occurredAt: n.occurred_at,
    corrected: Boolean(n.corrected_at),
    goalNames: (noteLinks.data ?? [])
      .filter((x) => x.note_id === n.id)
      .flatMap((x) => {
        const goal = x.goals as unknown as { title: string } | null;
        return goal ? [goal.title] : [];
      }),
  }));
  const sleepItems: HistoryItem[] = (sleep.data ?? []).map((s) => ({
    id: s.id,
    kind: "sleep",
    logView: "sleep",
    title: "Sleep",
    detail: `${Math.round((new Date(s.wake_time).getTime() - new Date(s.bedtime).getTime()) / 36000) / 100} hours · ${formatDisplayLabel(s.quality)} · ${formatDisplayLabel(s.waking_energy)} energy`,
    occurredAt: s.wake_time,
    corrected: Boolean(s.corrected_at),
    goalNames: (sleepLinks.data ?? [])
      .filter((x) => x.sleep_entry_id === s.id)
      .flatMap((x) => {
        const goal = x.goals as unknown as { title: string } | null;
        return goal ? [goal.title] : [];
      }),
  }));
  const activityItems: HistoryItem[] = (activities.data ?? []).map((a) => ({
    id: a.id,
    kind: "activity",
    logView: "activity",
    title: a.activity,
    detail: `${a.duration_min} min${a.distance_km != null ? ` · ${a.distance_km} km` : ""}${a.is_social ? " · social" : ""}`,
    occurredAt: a.occurred_at ?? `${a.performed_on}T12:00:00`,
    corrected: Boolean(a.corrected_at),
    goalNames: (activityLinks.data ?? [])
      .filter((x) => x.cardio_entry_id === a.id)
      .flatMap((x) => {
        const goal = x.goals as unknown as { title: string } | null;
        return goal ? [goal.title] : [];
      }),
  }));
  const nutritionItems: HistoryItem[] = (nutrition.data ?? []).map((n) => ({
    id: n.id,
    kind: "nutrition",
    logView: "nutrition",
    title: n.name,
    detail: `${formatDisplayLabel(n.meal_type)} · ${n.calories} kcal · P ${n.protein_g}g · C ${n.carbs_g}g · F ${n.fat_g}g · Fibre ${n.fibre_g}g`,
    occurredAt: n.occurred_at,
    corrected: Boolean(n.corrected_at),
    nutrition: {
      mealType: formatDisplayLabel(n.meal_type),
      calories: Number(n.calories),
      protein: Number(n.protein_g),
      carbs: Number(n.carbs_g),
      fat: Number(n.fat_g),
    },
    goalNames: (nutritionLinks.data ?? [])
      .filter((x) => x.nutrition_entry_id === n.id)
      .flatMap((x) => {
        const goal = x.goals as unknown as { title: string } | null;
        return goal ? [goal.title] : [];
      }),
  }));
  const moneyItems: HistoryItem[] = (money.data ?? []).map((m) => ({
    id: m.id,
    kind: "money",
    logView: "money",
    title: `Money · ${formatDisplayLabel(m.transaction_type)}`,
    detail: m.note || `${m.currency} ${Number(m.amount).toLocaleString()}`,
    occurredAt: m.occurred_at,
    corrected: Boolean(m.corrected_at),
    goalNames: (moneyLinks.data ?? [])
      .filter((x) => x.transaction_id === m.id)
      .flatMap((x) => {
        const goal = x.goals as unknown as { title: string } | null;
        return goal ? [goal.title] : [];
      }),
  }));
  const hobbyItems: HistoryItem[] = (hobbyEntries.data ?? []).map((e) => ({
    id: e.id,
    kind: "hobby",
    logView: "hobbies",
    title:
      (hobbies.data ?? []).find((h) => h.id === e.hobby_id)?.name ??
      "Archived Hobby",
    detail:
      e.note ||
      `${e.amount == null ? "Completed" : `${Number(e.amount)} ${e.unit}`}`,
    occurredAt: e.occurred_at,
    corrected: Boolean(e.corrected_at),
    goalNames: (hobbyLinks.data ?? [])
      .filter((x) => x.entry_id === e.id)
      .flatMap((x) => {
        const goal = x.goals as unknown as { title: string } | null;
        return goal ? [goal.title] : [];
      }),
  }));
  const trainingItems: HistoryItem[] = (training.data ?? []).map((session) => {
    const source = session.source_payload as Record<string, unknown> | null,
      mode =
        session.session_type === "normal"
          ? ""
          : `${session.session_type[0].toUpperCase() + session.session_type.slice(1)} · `;
    return {
      id: session.id,
      kind: "training",
      title: `${session.workout_type} ${session.variant}`,
      detail: `${mode}${session.notes || `${session.duration_min == null ? "Workout" : `${session.duration_min} min`}`}`,
      occurredAt: `${session.performed_on}T12:00:00`,
      corrected: Boolean(source?.corrected_at),
      goalNames: [],
    };
  });
  const items = [
      ...recordItems,
      ...habitItems,
      ...noteItems,
      ...sleepItems,
      ...activityItems,
      ...nutritionItems,
      ...moneyItems,
      ...hobbyItems,
      ...trainingItems,
    ]
      .map((item) => ({
        ...item,
        dateKey: fovynDateKey(timezone, new Date(item.occurredAt)),
      }))
      .filter((item) => !sinceKey || item.dateKey >= sinceKey)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    dates = [...new Set(items.map((x) => x.dateKey))];
  return {
    items,
    daysPresent: dates.length,
    currentStreak: streakForDates(dates),
    contributions: items.filter((x) => x.goalNames.length > 0).length,
    timezone,
    today,
  };
}
const softDeleteTable: Partial<Record<HistoryItem["kind"], string>> = {
  record: "tracking_records",
  social: "tracking_records",
  alcohol: "tracking_records",
  recovery: "tracking_records",
  note: "notes",
  sleep: "sleep_entries",
  activity: "cardio_entries",
  nutrition: "nutrition_entries",
  money: "money_transactions",
  hobby: "hobby_entries",
};
export const historyDeleteTarget = (kind: HistoryItem["kind"]) =>
  softDeleteTable[kind] ??
  (kind === "habit"
    ? "habit_entries"
    : kind === "training"
      ? "training_sessions"
      : null);
export async function deleteHistoryItem(item: HistoryItem) {
  const user = await goalOwner(),
    table = softDeleteTable[item.kind];
  if (table) {
    const result = await supabase
      .from(table)
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .select("id")
      .single();
    fail("Delete History entry", result.error);
    return;
  }
  if (item.kind === "habit") {
    const result = await supabase
      .from("habit_entries")
      .delete()
      .eq("id", item.id)
      .eq("owner_id", user.id)
      .select("id")
      .single();
    fail("Delete Habit occurrence", result.error);
    return;
  }
  if (item.kind === "training") {
    const result = await supabase
      .from("training_sessions")
      .delete()
      .eq("id", item.id)
      .eq("owner_id", user.id)
      .select("id")
      .single();
    fail("Delete Training session", result.error);
    return;
  }
  throw new Error("This History event cannot be deleted.");
}
export async function loadReviews() {
  const user = await goalOwner();
  const result = await supabase
    .from("periodic_reviews")
    .select("*")
    .eq("owner_id", user.id)
    .order("period_start", { ascending: false });
  fail("Reviews", result.error);
  return (result.data ?? []) as PeriodicReview[];
}
export async function saveReview(
  input: Omit<PeriodicReview, "id" | "updated_at">,
  id?: string,
) {
  const user = await goalOwner(),
    payload = {
      ...input,
      owner_id: user.id,
      updated_at: new Date().toISOString(),
    };
  const result = id
    ? await supabase
        .from("periodic_reviews")
        .update(payload)
        .eq("id", id)
        .eq("owner_id", user.id)
    : await supabase.from("periodic_reviews").insert(payload);
  fail("Save Review", result.error);
}
export async function deleteReview(id: string) {
  const user = await goalOwner();
  fail(
    "Delete Review",
    (
      await supabase
        .from("periodic_reviews")
        .delete()
        .eq("id", id)
        .eq("owner_id", user.id)
    ).error,
  );
}
