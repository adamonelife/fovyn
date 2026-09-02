import { useEffect, useMemo, useState } from "react";
import { Activity, Edit3, Plus, Trash2, X } from "lucide-react";
import {
  addMetricRecord,
  correctMetricRecord,
  loadMetrics,
  removeMetricRecord,
  type MetricData,
  type MetricRecord,
} from "./metricsRepository";
import type { Tracker } from "./trackerRepository";
import { LogDatePicker } from "./ui";
import { shiftDateKey } from "./fovynDate";

const localDateTime = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
const displayAmount = (record: MetricRecord, unit: string) =>
  `${record.value.toLocaleString()}${unit ? ` ${unit}` : ""}`;

function Recorder({
  tracker,
  record,
  unit,
  currency,
  close,
  saved,
}: {
  tracker: Tracker;
  record?: MetricRecord;
  unit: string;
  currency: string;
  close: () => void;
  saved: () => void;
}) {
  const [value, setValue] = useState(String(record?.value ?? "")),
    [occurred, setOccurred] = useState(
      record ? localDateTime(new Date(record.occurred_at)) : localDateTime(),
    ),
    [note, setNote] = useState(record?.note ?? ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const today = localDateTime().slice(0, 10),
    selectedDate = occurred.slice(0, 10),
    amountLabel = tracker.measurement_type === "weight" ? "Weight" : "Amount";
  return (
    <div className="sheet-shade" onMouseDown={close}>
      <section
        className="metric-recorder"
        role="dialog"
        aria-modal="true"
        aria-labelledby="metric-recorder-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="sheet-close"
          onClick={close}
          aria-label="Close"
        >
          <X />
        </button>
        <p className="eyebrow">{record ? "EDIT METRIC ENTRY" : "LOG METRIC"}</p>
        <h2 id="metric-recorder-title">{tracker.name}</h2>
        <LogDatePicker
          selectedDate={selectedDate}
          today={today}
          minDate={shiftDateKey(today, -7)}
          maxDate={today}
          existingDates={tracker.recordDates ?? []}
          onSelect={(date) =>
            setOccurred(`${date}T${occurred.slice(11) || "12:00"}`)
          }
        />
        {!record && tracker.recordDates?.includes(selectedDate) && (
          <p className="log-date-note">
            An entry already exists on this date. Saving will add another.
          </p>
        )}
        <label>
          {amountLabel}
          <div className="metric-value">
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              step="any"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <span>
              {tracker.measurement_type === "money" ? currency : unit}
            </span>
          </div>
        </label>
        <label>
          When
          <input
            type="datetime-local"
            value={occurred}
            onChange={(event) => setOccurred(event.target.value)}
          />
        </label>
        <label>
          Optional note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error && <p className="goal-error">{error}</p>}
        <button
          type="button"
          className="save-record"
          disabled={busy || value === "" || !Number.isFinite(Number(value))}
          onClick={async () => {
            setBusy(true);
            try {
              record
                ? await correctMetricRecord(
                    record,
                    Number(value),
                    new Date(occurred).toISOString(),
                    note,
                  )
                : await addMetricRecord(
                    tracker,
                    Number(value),
                    new Date(occurred).toISOString(),
                    note,
                    currency,
                  );
              saved();
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "Unable to save Metric entry",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : record ? "Save changes" : "Log amount"}
        </button>
      </section>
    </div>
  );
}

function DeleteEntry({
  record,
  unit,
  close,
  deleted,
}: {
  record: MetricRecord;
  unit: string;
  close: () => void;
  deleted: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="sheet-shade metric-delete-shade" onMouseDown={close}>
      <section
        className="metric-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="metric-delete-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="metric-delete-title">Delete this entry?</h2>
        <p>
          {new Date(record.occurred_at).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        <b>{displayAmount(record, unit)}</b>
        {error && <p className="goal-error">{error}</p>}
        <footer>
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await deleted();
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Unable to delete Metric entry",
                );
                setBusy(false);
              }
            }}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function MetricsModule({
  query = "",
  initialEntryId,
}: {
  query?: string;
  initialEntryId?: string;
}) {
  const [data, setData] = useState<MetricData>({
      trackers: [],
      records: [],
      units: [],
      goalNames: {},
    }),
    [selected, setSelected] = useState<Tracker>(),
    [editing, setEditing] = useState<MetricRecord>(),
    [deleting, setDeleting] = useState<{
      tracker: Tracker;
      record: MetricRecord;
    }>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    currency = "USD";
  const load = async () => {
    setLoading(true);
    try {
      const next = await loadMetrics();
      setData(next);
      if (initialEntryId) {
        const record = next.records.find((item) => item.id === initialEntryId),
          tracker =
            record &&
            next.trackers.find((item) => item.id === record.tracker_id);
        if (record && tracker) {
          setSelected(tracker);
          setEditing(record);
        }
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load Metrics",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const series = useMemo(
    () =>
      data.trackers
        .filter((tracker) =>
          tracker.name.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .map((tracker) => ({
          tracker,
          records: data.records.filter(
            (record) => record.tracker_id === tracker.id,
          ),
        })),
    [data, query],
  );
  const unit = (tracker: Tracker) =>
    data.units.find((value) => value.key === tracker.unit_key)?.symbol ??
    tracker.custom_unit ??
    "";
  if (loading)
    return <div className="page-wrap tracker-loading">Loading Metrics…</div>;
  return (
    <div className="page-wrap metrics-v1">
      <header className="page-head">
        <div>
          <p className="eyebrow">METRICS</p>
          <h1>Metrics</h1>
        </div>
      </header>
      {error && <p className="goal-error">{error}</p>}
      <div className="metric-grid">
        {series.map(({ tracker, records }) => (
          <article key={tracker.id}>
            <header>
              <span>
                <Activity />
              </span>
              <div>
                <small>{tracker.measurement_type}</small>
                <h2>{tracker.name}</h2>
              </div>
              <button type="button" onClick={() => setSelected(tracker)}>
                <Plus /> Log
              </button>
            </header>
            {data.goalNames[tracker.id]?.length ? (
              <p className="metric-goals">
                Feeds {data.goalNames[tracker.id].join(", ")}
              </p>
            ) : (
              <p className="metric-goals">Independent metric</p>
            )}
            <div className="metric-latest">
              <b>
                {records[0] ? displayAmount(records[0], unit(tracker)) : "—"}
              </b>
              <span>
                {records[0]
                  ? new Date(records[0].occurred_at).toLocaleString()
                  : "No entries yet"}
              </span>
            </div>
            <div className="metric-history">
              {records.map((record) => (
                <article key={record.id}>
                  <button
                    type="button"
                    className="metric-entry-main"
                    onClick={() => {
                      setSelected(tracker);
                      setEditing(record);
                    }}
                  >
                    <span>
                      <b>{displayAmount(record, unit(tracker))}</b>
                      {record.note && <small>{record.note}</small>}
                      {record.corrected_at && <small>Corrected</small>}
                    </span>
                    <time>
                      {new Date(record.occurred_at).toLocaleDateString()}
                    </time>
                  </button>
                  <div className="metric-entry-actions">
                    <button
                      type="button"
                      aria-label={`Edit ${displayAmount(record, unit(tracker))} from ${new Date(record.occurred_at).toLocaleDateString()}`}
                      onClick={() => {
                        setSelected(tracker);
                        setEditing(record);
                      }}
                    >
                      <Edit3 />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${displayAmount(record, unit(tracker))} from ${new Date(record.occurred_at).toLocaleDateString()}`}
                      onClick={() => setDeleting({ tracker, record })}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
        {!series.length && (
          <div className="empty-state">
            <Activity />
            <h2>No Metric trackers yet</h2>
            <p>Add one under + Add & Manage, choosing the Metrics module.</p>
          </div>
        )}
      </div>
      {selected && (
        <Recorder
          tracker={selected}
          record={editing}
          unit={unit(selected)}
          currency={currency}
          close={() => {
            setSelected(undefined);
            setEditing(undefined);
          }}
          saved={() => {
            setSelected(undefined);
            setEditing(undefined);
            load();
          }}
        />
      )}
      {deleting && (
        <DeleteEntry
          record={deleting.record}
          unit={unit(deleting.tracker)}
          close={() => setDeleting(undefined)}
          deleted={async () => {
            await removeMetricRecord(deleting.record);
            setDeleting(undefined);
            await load();
          }}
        />
      )}
    </div>
  );
}
