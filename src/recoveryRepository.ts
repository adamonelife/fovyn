import { goalOwner, type UnitRow } from "./goalsRepository";
import { loadTrackers, type Tracker } from "./trackerRepository";
import { supabase } from "./supabase";

export type TrackerCategoryRecord = {
  id: string;
  tracker_id: string;
  value: number;
  occurred_at: string;
  note: string | null;
  corrected_at: string | null;
  occurrence_status: "complete" | "failed" | "skipped" | null;
};
export type TrackerCategoryData = {
  trackers: Tracker[];
  records: TrackerCategoryRecord[];
  units: UnitRow[];
};
export type TrackerCategory = "medication" | "social" | "alcohol";
export type RecoveryRecord = TrackerCategoryRecord;
export type RecoveryData = TrackerCategoryData;
const fail = (label: string, error: { message: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message}`);
};
export const filterCategoryTrackers = (
  trackers: Tracker[],
  module: TrackerCategory,
) =>
  trackers.filter(
    (tracker) => tracker.module === module && tracker.status !== "archived",
  );
export const filterRecoveryTrackers = (trackers: Tracker[]) =>
  filterCategoryTrackers(trackers, "medication");

export async function loadTrackerCategory(
  module: TrackerCategory,
  label: string,
): Promise<TrackerCategoryData> {
  const owner = await goalOwner();
  const [{ trackers, options }, records] = await Promise.all([
    loadTrackers(),
    supabase
      .from("tracking_records")
      .select(
        "id,tracker_id,value,occurred_at,note,corrected_at,occurrence_status",
      )
      .eq("owner_id", owner.id)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(200),
  ]);
  fail(`${label} records`, records.error);
  const available = filterCategoryTrackers(trackers, module);
  const ids = new Set(available.map((tracker) => tracker.id));
  return {
    trackers: available,
    records: (records.data ?? []).filter((record) =>
      ids.has(record.tracker_id),
    ) as TrackerCategoryRecord[],
    units: options.units,
  };
}

export const loadRecovery = () =>
  loadTrackerCategory("medication", "Supplements & Recovery");
export async function correctTrackerCategoryRecord(
  record: TrackerCategoryRecord,
  input: {
    value: number;
    occurredAt: string;
    note: string;
    occurrenceStatus: TrackerCategoryRecord["occurrence_status"];
  },
) {
  const owner = await goalOwner();
  const result = await supabase
    .from("tracking_records")
    .update({
      value: input.value,
      occurred_at: input.occurredAt,
      note: input.note.trim() || null,
      occurrence_status: input.occurrenceStatus,
      corrected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id)
    .eq("owner_id", owner.id)
    .is("deleted_at", null)
    .select("id")
    .single();
  fail("Update entry", result.error);
}
