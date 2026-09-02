import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bike, ChevronRight, Plus, Trash2, Users, X } from "lucide-react";
import {
  loadActivities,
  removeActivity,
  saveActivity,
  type ActivityData,
  type ActivityEntry,
} from "./activityRepository";

const local = (value: Date) =>
  new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
const numberOrNull = (value: string) => (value === "" ? null : Number(value));

function Editor({
  data,
  entry,
  close,
  saved,
}: {
  data: ActivityData;
  entry?: ActivityEntry;
  close: () => void;
  saved: () => void;
}) {
  const legacy = !entry?.tracker_id && entry?.activity,
    [trackerId, setTrackerId] = useState(entry?.tracker_id ?? ""),
    [occurred, setOccurred] = useState(
      local(entry?.occurred_at ? new Date(entry.occurred_at) : new Date()),
    ),
    [duration, setDuration] = useState(String(entry?.duration_min ?? "")),
    [distance, setDistance] = useState(
      entry?.distance_km == null ? "" : String(entry.distance_km),
    ),
    [calories, setCalories] = useState(
      entry?.watch_calories == null ? "" : String(entry.watch_calories),
    ),
    [heartRate, setHeartRate] = useState(
      entry?.average_hr == null ? "" : String(entry.average_hr),
    ),
    [notes, setNotes] = useState(entry?.notes ?? ""),
    [social, setSocial] = useState(entry?.is_social ?? false),
    [goalIds, setGoalIds] = useState(entry?.goalIds ?? []),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    first = useRef<HTMLInputElement>(null);
  const tracker = data.trackers.find((x) => x.id === trackerId),
    activity = tracker?.name || legacy || "";
  useEffect(() => {
    first.current?.focus();
    const escape = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [close]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveActivity(
        {
          trackerId: tracker?.id ?? null,
          activity,
          occurredAt: occurred,
          durationMin: Number(duration),
          distanceKm: numberOrNull(distance),
          watchCalories: numberOrNull(calories),
          averageHr: numberOrNull(heartRate),
          notes,
          isSocial: social,
          goalIds,
        },
        entry?.id,
      );
      saved();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Unable to save activity");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="sheet-shade activity-shade" onMouseDown={close}>
      <form
        className="activity-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <button
          type="button"
          className="sheet-close"
          onClick={close}
          aria-label="Close activity logger"
        >
          <X />
        </button>
        <p className="eyebrow">{entry ? "CORRECT" : "LOG"} ACTIVITY</p>
        <h2 id="activity-title">What did you do?</h2>
        <div className="activity-form-grid">
          <label className="wide">
            Activity type
            <select
              autoFocus={!entry}
              value={trackerId}
              onChange={(e) => setTrackerId(e.target.value)}
            >
              <option value="">Choose a configured type</option>
              {legacy && <option value="">{legacy} (imported)</option>}
              {data.trackers.map((x) => (
                <option value={x.id} key={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            When
            <input
              ref={first}
              type="datetime-local"
              value={occurred}
              onChange={(e) => setOccurred(e.target.value)}
            />
          </label>
          <label>
            Duration (minutes)
            <input
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
          <label>
            Distance (km, optional)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </label>
          <label>
            Active calories (optional)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </label>
          <label>
            Average heart rate (optional)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
            />
          </label>
          <label className="wide">
            Notes (optional)
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
        <label className="activity-social">
          <input
            type="checkbox"
            checked={social}
            onChange={(e) => setSocial(e.target.checked)}
          />
          <Users />
          <span>
            <b>Social activity</b>
            <small>
              Mark that this activity involved time with other people.
            </small>
          </span>
        </label>
        {data.goals.length > 0 && (
          <fieldset>
            <legend>Related Goals</legend>
            {data.goals.map((g) => (
              <label key={g.id}>
                <input
                  type="checkbox"
                  checked={goalIds.includes(g.id)}
                  onChange={() =>
                    setGoalIds(
                      goalIds.includes(g.id)
                        ? goalIds.filter((x) => x !== g.id)
                        : [...goalIds, g.id],
                    )
                  }
                />
                {g.title}
              </label>
            ))}
          </fieldset>
        )}
        {error && <p className="goal-error">{error}</p>}
        <button
          className="save-record"
          disabled={busy || !activity || !duration}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

export default function ActivityModule({
  manage,
  query = "",
  initialEntryId,
}: {
  manage: () => void;
  query?: string;
  initialEntryId?: string;
}) {
  const [data, setData] = useState<ActivityData>({
      trackers: [],
      entries: [],
      goals: [],
    }),
    [editing, setEditing] = useState<ActivityEntry | null | undefined>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const next = await loadActivities();
      setData(next);
      if (initialEntryId)
        setEditing(next.entries.find((entry) => entry.id === initialEntryId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load activities");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  if (loading)
    return <div className="page-wrap tracker-loading">Loading Activities…</div>;
  const term = query.trim().toLowerCase(),
    entries = data.entries.filter((entry) =>
      `${entry.activity} ${entry.notes ?? ""}`.toLowerCase().includes(term),
    );
  return (
    <div className="page-wrap activity-v1">
      <header className="page-head">
        <div>
          <p className="eyebrow">PHYSICAL ACTIVITY</p>
          <h1>Activity</h1>
        </div>
        <div className="activity-head-actions">
          <button className="text-button" onClick={manage}>
            <Plus /> Manage types
          </button>
          <button
            className="soft-button"
            disabled={!data.trackers.length}
            onClick={() => setEditing(null)}
          >
            <Plus /> Log activity
          </button>
        </div>
      </header>
      {error && <p className="goal-error">{error}</p>}
      {!data.trackers.length && (
        <section className="activity-setup">
          <Bike />
          <h2>Configure your first activity type</h2>
          <p>Add the activities you actually do, then logging stays fast.</p>
          <button onClick={manage}>
            <Plus /> Add activity type
          </button>
        </section>
      )}
      <div className="activity-list">
        {entries.map((entry) => (
          <article key={entry.id}>
            <button className="activity-main" onClick={() => setEditing(entry)}>
              <span>
                <Bike />
              </span>
              <div>
                <small>
                  {new Date(
                    entry.occurred_at ?? `${entry.performed_on}T12:00:00`,
                  ).toLocaleString()}
                </small>
                <h2>{entry.activity}</h2>
                <p>
                  {entry.duration_min} min
                  {entry.distance_km != null
                    ? ` · ${entry.distance_km} km`
                    : ""}
                  {entry.watch_calories != null
                    ? ` · ${entry.watch_calories} kcal`
                    : ""}
                  {entry.average_hr != null ? ` · ${entry.average_hr} bpm` : ""}
                </p>
                {entry.notes && <blockquote>{entry.notes}</blockquote>}
                {entry.is_social && (
                  <em>
                    <Users /> Social
                  </em>
                )}
                {entry.corrected_at && <em>Corrected</em>}
              </div>
              <ChevronRight />
            </button>
            <button
              className="activity-remove"
              aria-label={`Remove ${entry.activity}`}
              onClick={async () => {
                if (
                  confirm(
                    "Remove this activity from History and Goal progress?",
                  )
                ) {
                  await removeActivity(entry.id);
                  load();
                }
              }}
            >
              <Trash2 />
            </button>
          </article>
        ))}
        {!entries.length && data.trackers.length > 0 && (
          <div className="empty-state">
            <Bike />
            <h2>
              {term ? "No matching activity" : "No activity recorded yet"}
            </h2>
          </div>
        )}
      </div>
      {editing !== undefined && (
        <Editor
          data={data}
          entry={editing ?? undefined}
          close={() => setEditing(undefined)}
          saved={() => {
            setEditing(undefined);
            load();
          }}
        />
      )}
    </div>
  );
}
