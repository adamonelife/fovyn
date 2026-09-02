import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteHistoryItem,
  loadHistory,
  type HistoryData,
  type HistoryItem,
} from "./historyRepository";
import TrainingHistorySheet from "./TrainingHistorySheet";
import { LogEmptyState } from "./ui";
import { FunctionalIcon } from "./functionalIcons";
import { shiftDateKey, watchFovynDay } from "./fovynDate";

export type CalendarCell = { key: string; day: number; currentMonth: boolean };
export function calendarMonthGrid(month: Date): CalendarCell[] {
  const year = month.getFullYear(),
    monthIndex = month.getMonth(),
    first = new Date(year, monthIndex, 1),
    offset = (first.getDay() + 6) % 7,
    start = new Date(year, monthIndex, 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      day: date.getDate(),
      currentMonth: date.getMonth() === monthIndex,
    };
  });
}
const dayGroups: [HistoryItem["kind"][], string][] = [
  [["record"], "Body & Metrics"],
  [["sleep"], "Sleep"],
  [["nutrition"], "Nutrition"],
  [["activity"], "Activity"],
  [["training"], "Training"],
  [["habit"], "Habits & Routines"],
  [["money"], "Money"],
  [["hobby"], "Hobbies"],
  [["social"], "Social"],
  [["alcohol"], "Alcohol"],
  [["recovery"], "Supplements & Recovery"],
  [["note"], "Notes"],
];
const shiftMonth = (month: Date, amount: number) =>
  new Date(month.getFullYear(), month.getMonth() + amount, 1);
const itemDate = (item: HistoryItem) =>
  item.dateKey ?? item.occurredAt.slice(0, 10);
export const canBackdateHistory = (key: string, today: string) => {
  const current = new Date(`${today}T12:00:00`),
    day = new Date(`${key}T12:00:00`),
    difference = Math.round((current.getTime() - day.getTime()) / 86400000);
  return difference >= 0 && difference <= 7;
};

function RecordRow({
  item,
  timezone,
  open,
  remove,
}: {
  item: HistoryItem;
  timezone: string;
  open: () => void;
  remove: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <article
      className={`history-record-row ${item.kind === "training" ? "history-openable" : ""}`}
    >
      <button type="button" className="history-record-main" onClick={open}>
        <span className={`record-icon ${item.kind}`}>
          {item.iconKey ? (
            <FunctionalIcon iconKey={item.iconKey} />
          ) : (
            <Activity />
          )}
        </span>
        <span>
          <b>{item.title}</b>
          <small>
            {item.detail}
            {item.corrected ? " · Corrected" : ""}
          </small>
        </span>
        <time>
          {new Date(item.occurredAt).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone,
          })}
        </time>
      </button>
      <div className="history-row-menu">
        <button
          type="button"
          aria-label={`Manage ${item.title} entry`}
          aria-expanded={menu}
          onClick={() => setMenu((value) => !value)}
        >
          <MoreHorizontal />
        </button>
        {menu && (
          <div role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                open();
              }}
            >
              <Edit3 /> Edit
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                remove();
              }}
            >
              <Trash2 /> Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function HistoryDayView({
  date,
  today,
  timezone,
  items,
  onLog,
  onOpen,
  onDelete,
}: {
  date: string;
  today: string;
  timezone: string;
  items: HistoryItem[];
  onLog: () => void;
  onOpen: (item: HistoryItem) => void;
  onDelete: (item: HistoryItem) => void;
}) {
  const nutrition = items.filter(
      (item) => item.kind === "nutrition" && item.nutrition,
    ),
    nutritionTotal = nutrition.reduce(
      (total, item) => ({
        calories: total.calories + (item.nutrition?.calories ?? 0),
        protein: total.protein + (item.nutrition?.protein ?? 0),
        carbs: total.carbs + (item.nutrition?.carbs ?? 0),
        fat: total.fat + (item.nutrition?.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  return (
    <section className="history-day-view" aria-label="Day View">
      <header>
        <div>
          <p className="eyebrow">{date === today ? "TODAY" : "DAY VIEW"}</p>
          <h2>
            {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
          <small>
            {items.length} {items.length === 1 ? "record" : "records"}
          </small>
        </div>
        <button type="button" className="soft-button" onClick={onLog}>
          <Plus /> Log
        </button>
      </header>
      {dayGroups.map(([kinds, label]) => {
        const records = items.filter((item) => kinds.includes(item.kind));
        if (!records.length) return null;
        return (
          <section className="history-day-domain" key={label}>
            <h3>{label}</h3>
            {label === "Nutrition" && (
              <div className="history-nutrition-summary">
                <b>Daily nutrition</b>
                <span>{nutritionTotal.calories.toLocaleString()} kcal</span>
                <small>
                  P {nutritionTotal.protein.toLocaleString()} · C{" "}
                  {nutritionTotal.carbs.toLocaleString()} · F{" "}
                  {nutritionTotal.fat.toLocaleString()}
                </small>
              </div>
            )}
            {records.map((item) => (
              <RecordRow
                item={item}
                timezone={timezone}
                open={() => onOpen(item)}
                remove={() => onDelete(item)}
                key={`${item.kind}-${item.id}`}
              />
            ))}
          </section>
        );
      })}
      {!items.length && (
        <LogEmptyState
          icon={<CalendarDays />}
          title={
            date === today
              ? "Nothing recorded today yet"
              : "Nothing recorded on this date"
          }
        />
      )}
    </section>
  );
}

export default function HistoryModule({
  range = 30,
  mode = "calendar",
  openLog,
}: {
  range?: number;
  mode?: "calendar" | "timeline";
  openLog: (item?: HistoryItem) => void;
}) {
  const [data, setData] = useState<HistoryData>(),
    [error, setError] = useState(""),
    [selectedTraining, setSelectedTraining] = useState<string>(),
    [deleting, setDeleting] = useState<HistoryItem>(),
    [deletingBusy, setDeletingBusy] = useState(false),
    [month, setMonth] = useState(() => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }),
    [selectedDay, setSelectedDay] = useState<string>();
  const reload = () => {
    setError("");
    loadHistory(mode === "calendar" ? 0 : range)
      .then((result) => {
        setData(result);
        setSelectedDay((current) => current ?? result.today);
        if (!selectedDay) setMonth(new Date(`${result.today}T12:00:00`));
      })
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to load History",
        ),
      );
  };
  useEffect(reload, [range, mode]);
  useEffect(
    () =>
      data
        ? watchFovynDay(data.timezone, data.today, (next) => {
            setSelectedDay((current) =>
              current === data.today ? next : current,
            );
            reload();
          })
        : undefined,
    [data?.timezone, data?.today],
  );
  const timelineItems = useMemo(
    () =>
      data?.items.filter(
        (item) =>
          item.corrected ||
          item.goalNames.length > 0 ||
          item.kind === "training",
      ) ?? [],
    [data],
  );
  const groups = useMemo(
    () =>
      timelineItems.reduce<Record<string, HistoryItem[]>>((all, item) => {
        const day = itemDate(item);
        (all[day] ??= []).push(item);
        return all;
      }, {}),
    [timelineItems],
  );
  const openItem = (item: HistoryItem) =>
    item.kind === "training" ? setSelectedTraining(item.id) : openLog(item);
  if (error && !data) return <div className="history-loading">{error}</div>;
  if (!data) return <div className="history-loading">Loading History…</div>;
  const deleteDialog = deleting && (
    <div
      className="sheet-shade history-delete-shade"
      onMouseDown={() => !deletingBusy && setDeleting(undefined)}
    >
      <section
        className="history-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="history-delete-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="history-delete-title">Delete this entry?</h2>
        <b>{deleting.title}</b>
        <p>{deleting.detail}</p>
        <time>
          {new Date(deleting.occurredAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </time>
        <small>This will remove it from your Fovyn history.</small>
        {error && <p className="goal-error">{error}</p>}
        <footer>
          <button
            type="button"
            disabled={deletingBusy}
            onClick={() => setDeleting(undefined)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={deletingBusy}
            onClick={async () => {
              setDeletingBusy(true);
              setError("");
              try {
                await deleteHistoryItem(deleting);
                setDeleting(undefined);
                await loadHistory(mode === "calendar" ? 0 : range).then(
                  setData,
                );
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Unable to delete History entry",
                );
              } finally {
                setDeletingBusy(false);
              }
            }}
          >
            {deletingBusy ? "Deleting…" : "Delete"}
          </button>
        </footer>
      </section>
    </div>
  );
  if (mode === "calendar") {
    const date = selectedDay ?? data.today,
      cells = calendarMonthGrid(month),
      recordedDays = new Set(data.items.map((item) => itemDate(item))),
      selectedItems = data.items.filter((item) => itemDate(item) === date);
    return (
      <div className="history-calendar">
        <nav className="history-date-nav" aria-label="History date">
          <button
            type="button"
            className={date === data.today ? "active" : ""}
            onClick={() => {
              setSelectedDay(data.today);
              setMonth(new Date(`${data.today}T12:00:00`));
            }}
          >
            Today
          </button>
          <button
            type="button"
            className={date === shiftDateKey(data.today, -1) ? "active" : ""}
            onClick={() => {
              const yesterday = shiftDateKey(data.today, -1);
              setSelectedDay(yesterday);
              setMonth(new Date(`${yesterday}T12:00:00`));
            }}
          >
            Yesterday
          </button>
          <label>
            <CalendarDays />
            <span>Select Date</span>
            <input
              aria-label="Select History date"
              type="date"
              value={date}
              max={data.today}
              onChange={(event) => {
                setSelectedDay(event.target.value);
                setMonth(new Date(`${event.target.value}T12:00:00`));
              }}
            />
          </label>
        </nav>
        <div className="history-calendar-layout">
          <HistoryDayView
            date={date}
            today={data.today}
            timezone={data.timezone}
            items={selectedItems}
            onLog={openLog}
            onOpen={openItem}
            onDelete={setDeleting}
          />
          <section className="history-month">
            <header className="calendar-toolbar">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setMonth(shiftMonth(month, -1))}
              >
                <ChevronLeft />
              </button>
              <h2>
                {month.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setMonth(shiftMonth(month, 1))}
              >
                <ChevronRight />
              </button>
            </header>
            <div className="calendar-weekdays">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-month-grid">
              {cells.map((cell) => (
                <button
                  type="button"
                  className={`${cell.currentMonth ? "" : "outside"} ${cell.key === data.today ? "today" : ""} ${cell.key === date ? "selected" : ""}`}
                  aria-label={new Date(
                    `${cell.key}T12:00:00`,
                  ).toLocaleDateString()}
                  onClick={() => {
                    setSelectedDay(cell.key);
                    if (!cell.currentMonth)
                      setMonth(new Date(`${cell.key}T12:00:00`));
                  }}
                  key={cell.key}
                >
                  <b>{cell.day}</b>
                  {recordedDays.has(cell.key) && (
                    <i aria-label="Recorded information" />
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>
        {selectedTraining && (
          <TrainingHistorySheet
            id={selectedTraining}
            close={() => setSelectedTraining(undefined)}
            saved={() => {
              setSelectedTraining(undefined);
              reload();
            }}
          />
        )}
        {deleteDialog}
      </div>
    );
  }
  return (
    <div className="history-content history-timeline">
      <section className="history-facts" aria-label="History facts">
        <div>
          <b>{timelineItems.length}</b>
          <span>Meaningful Events</span>
        </div>
        <div>
          <b>{data.contributions}</b>
          <span>Goal Contributions</span>
        </div>
      </section>
      <div className="timeline">
        {Object.entries(groups).map(([date, items]) => (
          <section className="day-group" key={date}>
            <header>
              <div>
                <b>
                  {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "long",
                  })}
                </b>
                <span>
                  {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </header>
            {items.map((item) => (
              <RecordRow
                item={item}
                timezone={data.timezone}
                open={() => openItem(item)}
                remove={() => setDeleting(item)}
                key={`${item.kind}-${item.id}`}
              />
            ))}
          </section>
        ))}
        {!timelineItems.length && (
          <LogEmptyState
            icon={<Check />}
            title="No meaningful changes in this period"
          />
        )}
      </div>
      {selectedTraining && (
        <TrainingHistorySheet
          id={selectedTraining}
          close={() => setSelectedTraining(undefined)}
          saved={() => {
            setSelectedTraining(undefined);
            reload();
          }}
        />
      )}
      {deleteDialog}
    </div>
  );
}
