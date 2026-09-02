import { useEffect, useState } from "react";
import AllLogModule from "./AllLogModule";
import ActivityModule from "./ActivityModule";
import AlcoholModule from "./AlcoholModule";
import HabitsModule from "./HabitsModule";
import HobbiesModule from "./HobbiesModule";
import MetricsModule from "./MetricsModule";
import MoneyModule from "./MoneyModule";
import NotesModule from "./NotesModule";
import NutritionModule from "./NutritionModule";
import RecoveryModule from "./RecoveryModule";
import RoutinesModule from "./RoutinesModule";
import SleepModule from "./SleepModule";
import SocialModule from "./SocialModule";
import TrackModule from "./TrackModule";
import WorkoutModule from "./WorkoutModule";
import LogShell, { type LogView } from "./LogShell";
export type LogEditTarget = { view: LogView; id: string; date: string };

export default function TrackHub({
  onFirstSetupComplete,
  initialView = "all",
  quickLogSignal = 0,
  editTarget,
}: {
  onFirstSetupComplete?: () => Promise<void> | void;
  initialView?: LogView;
  quickLogSignal?: number;
  editTarget?: LogEditTarget;
} = {}) {
  const [view, setView] = useState<LogView>(
    onFirstSetupComplete ? "manage" : (editTarget?.view ?? initialView),
  );
  const [workout, setWorkout] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (quickLogSignal > 0) {
      setView("all");
      setQuery("");
    }
  }, [quickLogSignal]);
  const editId = editTarget?.view === view ? editTarget.id : undefined;
  const content =
    view === "habits" ? (
      <HabitsModule
        query={query}
        initialEntryId={editId}
        initialDate={editTarget?.date}
      />
    ) : view === "routines" ? (
      <RoutinesModule query={query} />
    ) : view === "metrics" ? (
      <MetricsModule query={query} initialEntryId={editId} />
    ) : view === "activity" ? (
      <ActivityModule
        query={query}
        initialEntryId={editId}
        manage={() => setView("manage")}
      />
    ) : view === "nutrition" ? (
      <NutritionModule query={query} initialEntryId={editId} />
    ) : view === "money" ? (
      <MoneyModule query={query} initialEntryId={editId} />
    ) : view === "hobbies" ? (
      <HobbiesModule query={query} initialEntryId={editId} />
    ) : view === "social" ? (
      <SocialModule
        query={query}
        initialEntryId={editId}
        manage={() => setView("manage")}
      />
    ) : view === "alcohol" ? (
      <AlcoholModule
        query={query}
        initialEntryId={editId}
        manage={() => setView("manage")}
      />
    ) : view === "sleep" ? (
      <SleepModule query={query} initialEntryId={editId} />
    ) : view === "recovery" ? (
      <RecoveryModule
        query={query}
        initialEntryId={editId}
        manage={() => setView("manage")}
      />
    ) : view === "notes" ? (
      <NotesModule query={query} initialEntryId={editId} />
    ) : (
      <div className="manage-shell">
        <TrackModule
          onFirstSetupComplete={onFirstSetupComplete}
          onRoutines={() => setView("routines")}
        />
      </div>
    );
  return (
    <>
      <LogShell
        view={view}
        select={(next) => {
          setView(next);
          setQuery("");
        }}
        openTraining={() => setWorkout(true)}
        query={query}
        setQuery={setQuery}
      >
        {view === "all" ? (
          <AllLogModule
            manage={() => setView("manage")}
            query={query}
            quickLogSignal={quickLogSignal}
          />
        ) : (
          content
        )}
      </LogShell>
      {workout && (
        <WorkoutModule
          close={() => setWorkout(false)}
          onSaved={() => setWorkout(false)}
        />
      )}
    </>
  );
}
