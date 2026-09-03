import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  ChevronRight,
  Leaf,
  Plus,
  Target,
  X,
} from "lucide-react";
import {
  completeOnboarding,
  expectedToday,
  loadHome,
  saveRoundup,
  type HabitResolution,
  type HomeData,
} from "./homeRepository";
import { fovynDateKey, watchFovynDay } from "./fovynDate";
import { FunctionalIcon } from "./functionalIcons";
import ForestHero from "./ForestHero";
const climateLabel = (value: string) => value[0].toUpperCase() + value.slice(1);
function Onboarding({
  choose,
}: {
  choose: (destination: "Goals" | "Log") => void;
}) {
  const [choice, setChoice] = useState<"Goals" | "Log">();
  return (
    <section className="onboarding">
      <Leaf />
      <p className="eyebrow">WELCOME TO FOVYN</p>
      <h1>Grow More Good Days.</h1>
      <div>
        <button
          className={choice === "Goals" ? "active" : ""}
          onClick={() => setChoice("Goals")}
        >
          <Target />
          <b>Plant a Goal</b>
          <small>
            Create your first Goal. It begins as a Seed and defaults to Primary.
          </small>
        </button>
        <button
          className={choice === "Log" ? "active" : ""}
          onClick={() => setChoice("Log")}
        >
          <Activity />
          <b>Log Something</b>
          <small>
            Configure or record the first real thing you want Fovyn to remember.
          </small>
        </button>
      </div>
      <button
        className="onboarding-next"
        disabled={!choice}
        onClick={() => choice && choose(choice)}
      >
        Continue <ChevronRight />
      </button>
    </section>
  );
}
function Roundup({
  date,
  items,
  close,
  saved,
}: {
  date: string;
  items: HomeData["unresolvedHabits"];
  close: () => void;
  saved: () => void;
}) {
  const [mood, setMood] = useState<"bad" | "ok" | "great">("ok"),
    [note, setNote] = useState(""),
    [resolutions, setResolutions] = useState<Record<string, HabitResolution>>(
      {},
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const resolve = (
    habitId: string,
    status: HabitResolution["status"],
    value: number | null = null,
  ) =>
    setResolutions({ ...resolutions, [habitId]: { habitId, status, value } });
  return (
    <div className="sheet-shade" onMouseDown={close}>
      <section
        className="roundup-sheet"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="sheet-close" onClick={close} aria-label="Close">
          <X />
        </button>
        <p className="eyebrow">
          FINISH{" "}
          {new Date(`${date}T12:00:00`)
            .toLocaleDateString(undefined, { weekday: "long" })
            .toUpperCase()}
        </p>
        <h2>How was that day?</h2>
        <div className="day-options">
          {(["bad", "ok", "great"] as const).map((value) => (
            <button
              className={mood === value ? "active" : ""}
              onClick={() => setMood(value)}
              key={value}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        {items.length > 0 && (
          <section className="roundup-unresolved">
            <h3>Unresolved expected items</h3>
            <p>Resolve the items you can confirm.</p>
            {items.map((item) => (
              <div key={item.id}>
                <span>
                  <b>{item.name}</b>
                  <small>
                    {item.tracking_type === "check"
                      ? "Expected"
                      : `${item.target_value} ${item.unit ?? ""}`}
                  </small>
                </span>
                <div>
                  {item.tracking_type !== "check" && (
                    <input
                      type="number"
                      inputMode="decimal"
                      aria-label={`${item.name} value`}
                      onChange={(e) =>
                        resolve(
                          item.id,
                          "complete",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  )}
                  <button
                    className={
                      resolutions[item.id]?.status === "complete"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      resolve(
                        item.id,
                        "complete",
                        item.tracking_type === "check"
                          ? 1
                          : (resolutions[item.id]?.value ?? null),
                      )
                    }
                  >
                    Done
                  </button>
                  <button
                    className={
                      resolutions[item.id]?.status === "failed" ? "active" : ""
                    }
                    onClick={() => resolve(item.id, "failed")}
                  >
                    Missed
                  </button>
                  <button
                    className={
                      resolutions[item.id]?.status === "skipped" ? "active" : ""
                    }
                    onClick={() => resolve(item.id, "skipped")}
                  >
                    N/A
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}
        <label>
          Anything worth remembering?
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
          />
        </label>
        {error && <p className="goal-error">{error}</p>}
        <button
          className="save-record"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await saveRoundup(date, mood, note, Object.values(resolutions));
              saved();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to finish day");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Finish day"}
        </button>
      </section>
    </div>
  );
}
export default function HomeModule({
  navigate,
  beginOnboarding = navigate,
  openForest,
  openRoutines,
  openTracker,
  openHabit,
}: {
  navigate: (page: "Log" | "Goals" | "Account") => void;
  beginOnboarding?: (page: "Log" | "Goals") => void;
  openForest: () => void;
  openRoutines: () => void;
  openTracker: (module: string, name: string) => void;
  openHabit: (habitId: string) => void;
}) {
  const [data, setData] = useState<HomeData>(),
    [error, setError] = useState(""),
    [roundup, setRoundup] = useState(false);
  const load = () =>
    loadHome()
      .then(async (result) => {
        if (
          !result.profile.onboarding_completed_at &&
          (result.goals.length > 0 ||
            result.habits.length > 0 ||
            result.configuredCount > 0 ||
            result.recentCount > 0)
        ) {
          await completeOnboarding();
          result.profile.onboarding_completed_at = new Date().toISOString();
        }
        setData(result);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load Home"),
      );
  useEffect(() => {
    load();
  }, []);
  useEffect(
    () =>
      data
        ? watchFovynDay(
            data.profile.timezone,
            fovynDateKey(data.profile.timezone),
            () => load(),
          )
        : undefined,
    [data?.profile.timezone],
  );
  const day = data ? fovynDateKey(data.profile.timezone) : undefined,
    due = useMemo(
      () => data?.habits.filter((x) => expectedToday(x, day)) ?? [],
      [data, day],
    );
  const trackerDue = data?.trackers ?? [],
    moneyDue = data?.moneyExpected ?? [],
    complete =
      due.filter((x) => x.status === "complete").length +
      trackerDue.filter((x) => x.recorded).length,
    missed = due.filter((x) => x.status === "failed").length,
    remaining =
      due.filter((x) => !x.status).length +
      trackerDue.filter((x) => !x.recorded).length +
      moneyDue.length,
    activeGoals = data?.goals.filter((x) => x.status === "active") ?? [];
  if (error) return <div className="page-wrap home-loading">{error}</div>;
  if (!data) return <div className="page-wrap home-loading">Loading Home…</div>;
  if (!data.profile.onboarding_completed_at)
    return (
      <div className="page-wrap">
        <Onboarding choose={beginOnboarding} />
      </div>
    );
  const name = data.profile.first_name || data.profile.display_name;
  return (
    <div className="home-live">
      <header className="top">
        <div>
          <p className="eyebrow">HOME</p>
          <h1>
            {name
              ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${name}.`
              : "Grow More Good Days."}
          </h1>
        </div>
        <button className="soft-button" onClick={() => navigate("Log")}>
          <Plus /> Log
        </button>
      </header>
      <button className="climate-strip" onClick={() => navigate("Account")}>
        <span>CURRENT CLIMATE</span>
        <b>{climateLabel(data.profile.current_climate || "normal")}</b>
        <ChevronRight />
      </button>
      {data.unresolvedRoundupDate && (
        <section className="unresolved-roundup">
          <div>
            <span>FINISH YESTERDAY</span>
            <b>
              {data.unresolvedHabits.length
                ? `${data.unresolvedHabits.length} expected item${data.unresolvedHabits.length === 1 ? "" : "s"} unresolved.`
                : "A Daily Rating is available."}
            </b>
          </div>
          <button onClick={() => setRoundup(true)}>
            Finish yesterday <ChevronRight />
          </button>
        </section>
      )}
      <ForestHero
        goals={data.goals}
        currentClearing={data.currentClearing}
        onViewGoal={openForest}
        onLog={() => navigate("Log")}
      />
      {data.clearingReviewPending && (
        <section className="clearing-home review">
          <div>
            <span>CLEARING REVIEW</span>
            <b>{data.clearingReviewPending.name} has ended.</b>
            <small>Choose what returns to normal.</small>
          </div>
          <button onClick={() => navigate("Account")}>
            Review <ChevronRight />
          </button>
        </section>
      )}
      {data.currentClearing && (
        <section className="clearing-home current">
          <div>
            <span>CURRENT CLEARING</span>
            <b>{data.currentClearing.name}</b>
            <small>
              {data.currentClearing.focusedGoals.length
                ? "Focused: " + data.currentClearing.focusedGoals.join(", ")
                : "A deliberate temporary focus."}
            </small>
            {data.currentClearing.intention && (
              <p>{data.currentClearing.intention}</p>
            )}
          </div>
          <button onClick={() => navigate("Account")}>
            Manage <ChevronRight />
          </button>
        </section>
      )}
      <section className="home-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">TODAY</p>
            <h2>What matters today?</h2>
          </div>
          <span className="today-facts">
            {complete} done · {remaining} remaining
          </span>
        </div>
        {data.routines.length > 0 && (
          <div className="home-routines">
            {data.routines.map((r) => {
              const done = r.actions.filter((x) => x.done).length;
              return (
                <button onClick={openRoutines} key={r.id}>
                  <span>{(r.daypart ?? "Routine").toUpperCase()}</span>
                  <b>{r.name}</b>
                  <small>
                    {done} of {r.actions.length} recorded
                  </small>
                  <ChevronRight />
                </button>
              );
            })}
          </div>
        )}
        {trackerDue.length > 0 && (
          <div className="home-dayparts">
            {(["morning", "day", "evening"] as const).map((part) => {
              const items = trackerDue.filter(
                (item) => (item.daypart ?? "day") === part,
              );
              return items.length ? (
                <section key={part}>
                  <span>{part.toUpperCase()}</span>
                  {items.map((item) => (
                    <button
                      onClick={() => openTracker(item.module, item.name)}
                      key={item.id}
                    >
                      <span
                        className={`today-state ${item.recorded ? "complete" : "missing"}`}
                      >
                        <FunctionalIcon iconKey={item.icon_key} size="small" />
                        {item.recorded ? <Check /> : null}
                      </span>
                      <b>{item.name}</b>
                      <small>
                        {item.specific_time?.slice(0, 5) ??
                          (item.recorded ? "Done" : "Log")}
                      </small>
                    </button>
                  ))}
                </section>
              ) : null;
            })}
          </div>
        )}
        <div className="today-groups">
          <article>
            <span>EXPECTED TODAY</span>
            <h3>
              {due.length + trackerDue.length + moneyDue.length
                ? `${due.length + trackerDue.length + moneyDue.length} expected`
                : "Nothing scheduled"}
            </h3>
            {due.length + moneyDue.length ? (
              <div className="today-items">
                {due.slice(0, 5).map((item) => (
                  <button onClick={() => openHabit(item.id)} key={item.id}>
                    <span className={`today-state ${item.status ?? "missing"}`}>
                      {item.status === "complete" ? <Check /> : null}
                    </span>
                    <b>{item.name}</b>
                    <small>
                      {item.status === "skipped"
                        ? "N/A"
                        : item.status === "failed"
                          ? "Missed"
                          : item.status === "complete"
                            ? "Done"
                            : "Log"}
                    </small>
                  </button>
                ))}
                {moneyDue.slice(0, 5).map((item) => (
                  <button
                    onClick={() => openTracker("money", item.name)}
                    key={item.id}
                  >
                    <span className="today-state missing">
                      <FunctionalIcon iconKey="money" size="small" />
                    </span>
                    <b>{item.name}</b>
                    <small>
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: item.currency,
                      }).format(item.amount)}{" "}
                      · Log
                    </small>
                  </button>
                ))}
              </div>
            ) : null}
            <button onClick={() => navigate("Log")}>
              Open Log <ChevronRight />
            </button>
          </article>
          <article>
            <span>NEEDS ATTENTION</span>
            <h3>
              {missed
                ? `${missed} recorded as Missed`
                : "Nothing needs attention"}
            </h3>
            {missed && <p>Review it if the record is incorrect.</p>}
          </article>
        </div>
      </section>
      <section className="home-section upcoming">
        <p className="eyebrow">UPCOMING</p>
        <h2>
          {activeGoals.length
            ? `${activeGoals.length} active Goal${activeGoals.length === 1 ? "" : "s"} continue beyond today.`
            : "No active Goals"}
        </h2>
        <button onClick={() => navigate("Goals")}>
          {activeGoals.length ? "View Goals" : "Plant a Goal"} <ChevronRight />
        </button>
      </section>
      {data.recentCount > 0 && (
        <section className="home-insight">
          <Leaf />
          <div>
            <span>RECENT ACTIVITY</span>
            <b>
              {data.recentCount} record{data.recentCount === 1 ? "" : "s"} added
              in the last 24 hours.
            </b>
          </div>
        </section>
      )}
      {roundup && data.unresolvedRoundupDate && (
        <Roundup
          date={data.unresolvedRoundupDate}
          items={data.unresolvedHabits}
          close={() => setRoundup(false)}
          saved={() => {
            setRoundup(false);
            setData({
              ...data,
              unresolvedRoundupDate: null,
              unresolvedHabits: [],
            });
          }}
        />
      )}
      <button className="home-log" onClick={() => navigate("Log")}>
        <Plus /> Log
      </button>
    </div>
  );
}
