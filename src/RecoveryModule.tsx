import { useEffect, useMemo, useState } from "react";
import { HeartPulse, Plus, X, type LucideIcon } from "lucide-react";
import {
  addMetricRecord,
  occurrenceValue,
  type OccurrenceStatus,
} from "./metricsRepository";
import { formatDisplayLabel } from "./displayLabels";
import {
  correctTrackerCategoryRecord,
  loadTrackerCategory,
  type TrackerCategory,
  type TrackerCategoryData,
  type TrackerCategoryRecord,
} from "./recoveryRepository";
import type { Tracker } from "./trackerRepository";
import { LogEmptyState, LogItemCard, LogSection } from "./ui";

const localNow = () => {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return now.toISOString().slice(0, 16);
};
const localNowFor=(date:Date)=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
function Recorder({
  tracker,
  record,
  unit,
  statusMode,
  close,
  saved,
}: {
  tracker: Tracker;
  record?: TrackerCategoryRecord;
  unit: string;
  statusMode: boolean;
  close: () => void;
  saved: () => void;
}) {
  const [value, setValue] = useState(String(record?.value ?? "")),
    [status, setStatus] = useState<OccurrenceStatus>(record?.occurrence_status ?? "complete"),
    [occurred, setOccurred] = useState(record ? localNowFor(new Date(record.occurred_at)) : localNow()),
    [note, setNote] = useState(record?.note ?? ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="sheet-shade" onMouseDown={close}>
      <section
        className="metric-recorder"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="sheet-close" onClick={close} aria-label="Close">
          <X />
        </button>
        <p className="eyebrow">{record ? "EDIT" : "LOG"}</p>
        <h2>{tracker.name}</h2>
        {statusMode && (
          <div
            className="occurrence-options"
            role="group"
            aria-label="What happened?"
          >
            {(["complete", "failed", "skipped"] as const).map((item) => (
              <button
                className={status === item ? "active" : ""}
                onClick={() => setStatus(item)}
                key={item}
              >
                {item === "complete"
                  ? "Done / Taken"
                  : item === "failed"
                    ? "Missed"
                    : "N/A"}
              </button>
            ))}
          </div>
        )}
        {(!statusMode || status === "complete") && (
          <label>
            {statusMode ? "Dose or duration (optional)" : "Value"}
            <div className="metric-value">
              <input
                autoFocus
                type="number"
                min="0"
                inputMode="decimal"
                step="any"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <span>{unit}</span>
            </div>
          </label>
        )}
        <label>
          When
          <input
            type="datetime-local"
            value={occurred}
            onChange={(event) => setOccurred(event.target.value)}
          />
        </label>
        <label>
          Note (optional)
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error && <p className="goal-error">{error}</p>}
        <button
          className="save-record"
          disabled={
            busy ||
            (!statusMode && (value === "" || !Number.isFinite(Number(value))))
          }
          onClick={async () => {
            setBusy(true);
            try {
              const amount=statusMode ? occurrenceValue(status, value) : Number(value),occurredAt=new Date(occurred).toISOString(),occurrenceStatus=statusMode ? status : null;
              if(record)await correctTrackerCategoryRecord(record,{value:amount,occurredAt,note,occurrenceStatus});
              else await addMetricRecord(tracker,amount,occurredAt,note,undefined,occurrenceStatus);
              saved();
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "We couldn’t save that entry. Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : record ? "Save changes" : "Log"}
        </button>
      </section>
    </div>
  );
}

export function TrackerCategoryModule({
  module,
  label,
  emptyDetail,
  Icon,
  query = "",
  initialEntryId,
  manage,
}: {
  module: TrackerCategory;
  label: string;
  emptyDetail: string;
  Icon: LucideIcon;
  query?: string;
  initialEntryId?: string;
  manage: () => void;
}) {
  const [data, setData] = useState<TrackerCategoryData>({
      trackers: [],
      records: [],
      units: [],
    }),
    [selected, setSelected] = useState<Tracker>(),
    [editing,setEditing]=useState<TrackerCategoryRecord>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const next=await loadTrackerCategory(module, label);setData(next);if(initialEntryId){const record=next.records.find(item=>item.id===initialEntryId),tracker=record&&next.trackers.find(item=>item.id===record.tracker_id);if(record&&tracker){setSelected(tracker);setEditing(record)}}
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : `Unable to load ${label}`,
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const visible = useMemo(
    () =>
      data.trackers.filter((tracker) =>
        tracker.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [data.trackers, query],
  );
  const unit = (tracker: Tracker) =>
    data.units.find((candidate) => candidate.key === tracker.unit_key)
      ?.symbol ??
    tracker.custom_unit ??
    "";
  if (loading)
    return <div className="page-wrap tracker-loading">Loading {label}…</div>;
  return (
    <div className="page-wrap recovery-v1">
      {error && <p className="goal-error">{error}</p>}
      <LogSection title="Available to log">
        {visible.map((tracker) => {
          const latest = data.records.find(
            (record) => record.tracker_id === tracker.id,
          );
          return (
            <LogItemCard
              key={tracker.id}
              icon={<Icon />}
              meta={label}
              title={tracker.name}
              detail={
                latest
                  ? `${latest.occurrence_status ? formatDisplayLabel(latest.occurrence_status) : `${latest.value} ${unit(tracker)}`} · ${new Date(latest.occurred_at).toLocaleDateString()}`
                  : `${unit(tracker) || "Value"} · Not logged yet`
              }
              action={<span className="row-log">Log</span>}
              onClick={() => setSelected(tracker)}
            />
          );
        })}
        {!visible.length && (
          <LogEmptyState
            icon={<Icon />}
            title={query ? "No matching item" : "Nothing configured yet"}
            detail={query ? undefined : emptyDetail}
          />
        )}
      </LogSection>
      <button className="log-manage" onClick={manage}>
        <Plus /> Add / Manage
      </button>
      {selected && (
        <Recorder
          tracker={selected}
          record={editing}
          unit={unit(selected)}
          statusMode={module === "medication"}
          close={() => {setSelected(undefined);setEditing(undefined)}}
          saved={() => {
            setSelected(undefined);
            setEditing(undefined);
            load();
          }}
        />
      )}
    </div>
  );
}

export default function RecoveryModule(props: {
  query?: string;
  initialEntryId?: string;
  manage: () => void;
}) {
  return (
    <TrackerCategoryModule
      {...props}
      module="medication"
      label="Supplements & Recovery"
      emptyDetail="Add a supplement, medication or recovery item under + Add & Manage."
      Icon={HeartPulse}
    />
  );
}
