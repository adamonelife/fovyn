import { useEffect, useState } from "react";
import { Check, Plus, Timer, X } from "lucide-react";
import { supabase } from "./supabase";
import {
  listTemplates,
  loadWorkout,
  saveWorkout,
  type WorkoutSave,
} from "./trainingRepository";
import {
  calculateTarget,
  latestForExercise,
  recommendationLabel,
  type BuiltExercise,
  type Exercise,
  type ExerciseRule,
  type LoggedExercise,
  type SetPerformance,
} from "./trainingEngine";
import {
  queueWorkout,
  queuedWorkouts,
  syncQueuedWorkouts,
} from "./trainingOffline";
type Item = BuiltExercise & {
  sets: SetPerformance[];
  rpe: string;
  notes: string;
};
const isBodyweight = (exercise: Exercise) =>
  exercise.equipment === "Bodyweight" || exercise.equipment === "Pull-up Bar";
export default function WorkoutModule({
  close,
  onSaved,
}: {
  close: () => void;
  onSaved: (t: string, v: string) => void;
}) {
  const [session, setSession] = useState<unknown>(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    supabase?.auth.getSession().then((x) => setSession(x.data.session));
    const { data } = supabase!.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!session)
    return (
      <div className="sheet-shade">
        <section className="workout-auth">
          <button className="sheet-close" onClick={close}>
            <X />
          </button>
          <p className="eyebrow">TRAINING</p>
          <h2>Sign in to your workout library.</h2>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          {error && <p className="workout-error">{error}</p>}
          <button
            className="save-record"
            onClick={async () => {
              const { error } = await supabase!.auth.signInWithPassword({
                email,
                password,
              });
              if (error) setError(error.message);
            }}
          >
            Sign in
          </button>
        </section>
      </div>
    );
  return <Start close={close} onSaved={onSaved} />;
}
function Start(p: {
  close: () => void;
  onSaved: (t: string, v: string) => void;
}) {
  const [templates, setTemplates] = useState<
      { type: string; variant: string }[]
    >([]),
    [choice, setChoice] = useState<{
      type: string;
      variant: string;
      manual: boolean;
    }>(),
    [pending, setPending] = useState(queuedWorkouts().length);
  useEffect(() => {
    listTemplates().then(setTemplates);
    if (navigator.onLine)
      syncQueuedWorkouts().then((x) => setPending(x.remaining));
    const sync=()=>syncQueuedWorkouts().then((x)=>setPending(x.remaining));
    window.addEventListener("online",sync);
    return()=>window.removeEventListener("online",sync);
  }, []);
  if (choice) return <Editor {...choice} {...p} />;
  return (
    <div className="sheet-shade">
      <section className="workout-start">
        <button className="sheet-close" onClick={p.close}>
          <X />
        </button>
        <p className="eyebrow">START A WORKOUT</p>
        <h2>Manual or saved template?</h2>
        {pending > 0 && (
          <p className="sync-note">
            {pending} workout{pending > 1 ? "s" : ""} waiting to sync
          </p>
        )}
        <button
          className="manual-workout"
          onClick={() =>
            setChoice({ type: "Manual", variant: "Custom", manual: true })
          }
        >
          <Plus /> Manual workout
        </button>
        <p className="choice-label">SAVED TEMPLATES</p>
        <div className="template-grid">
          {templates.map((t) => (
            <button
              key={t.type + t.variant}
              onClick={() => setChoice({ ...t, manual: false })}
            >
              <span>{t.type}</span>
              <b>{t.variant}</b>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
function Editor({
  type,
  variant,
  manual,
  close,
  onSaved,
}: {
  type: string;
  variant: string;
  manual: boolean;
  close: () => void;
  onSaved: (t: string, v: string) => void;
}) {
  const [items, setItems] = useState<Item[]>([]),
    [library, setLibrary] = useState<Exercise[]>([]),
    [rules, setRules] = useState<ExerciseRule[]>([]),
    [logs, setLogs] = useState<LoggedExercise[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [add, setAdd] = useState(manual),
    [replace, setReplace] = useState<number | null>(null),
    [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [duration, setDuration] = useState(""),
    [bodyweight, setBodyweight] = useState(""),
    [energy, setEnergy] = useState(""),
    [sleep, setSleep] = useState(""),
    [calories, setCalories] = useState(""),
    [notes, setNotes] = useState(""),
    [rest, setRest] = useState(0),
    [restSeconds, setRestSeconds] = useState("90"),
    [summary, setSummary] = useState<{
      sets: number;
      volume: number;
      pbs: string[];
      offline: boolean;
    }>();
  useEffect(() => {
    try {
      const settings = JSON.parse(
        localStorage.getItem("training-settings") || "{}",
      );
      if (settings.defaultEnergy != null)
        setEnergy(String(settings.defaultEnergy));
      if (settings.defaultSleep != null)
        setSleep(String(settings.defaultSleep));
    } catch {
      // Invalid legacy preferences should not prevent a workout opening.
    }
    const cacheKey=`forbair-workout-cache:${type}:${variant}:${manual}`;
    loadWorkout(type, variant, manual)
      .then((d) => {
        localStorage.setItem(cacheKey,JSON.stringify(d));
        setLibrary(d.exercises);
        setRules(d.rules);
        setLogs(d.logs);
        setItems(
          d.items.map((x) => ({
            ...x,
            sets: x.target.map((s) => ({ ...s })),
            rpe: "",
            notes: "",
          })),
        );
      })
      .catch((e) => {
        try{
          const d=JSON.parse(localStorage.getItem(cacheKey)||"null");
          if(!d)throw e;
          setLibrary(d.exercises);
          setRules(d.rules);
          setLogs(d.logs);
          setItems(d.items.map((x:BuiltExercise)=>({...x,sets:x.target.map((s:SetPerformance)=>({...s})),rpe:"",notes:""})));
          setError("Offline copy loaded. This workout will sync when reconnected.");
        }catch{setError(e.message)}
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setRest((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(id);
  }, [rest]);
  const update = (i: number, n: number, k: "kg" | "value", v: string) =>
    setItems(
      items.map((x, a) =>
        a !== i
          ? x
          : {
              ...x,
              sets: x.sets.map((s, b) =>
                b !== n
                  ? s
                  : {
                      ...s,
                      [k]: k === "value" ? (v === "" ? null : Number(v)) : v,
                    },
              ),
            },
      ),
    );
  const choose = (e: Exercise) => {
    const last = latestForExercise(logs, e.exerciseId);
    const rule = rules.find((r) => r.exerciseId === e.exerciseId) ?? null;
    const target = calculateTarget(e, last, rule);
    const x: Item = {
      order: (replace ?? items.length) + 1,
      slotName: replace === null ? e.group : items[replace].slotName,
      group: e.group,
      exercise: e,
      rule,
      last,
      target,
      sets: target,
      rpe: "",
      notes: "",
    };
    setItems(
      replace === null
        ? [...items, x]
        : items.map((q, i) => (i === replace ? x : q)),
    );
    setAdd(false);
    setReplace(null);
  };
  const move = (i: number, d: number) => {
    const n = i + d;
    if (n < 0 || n >= items.length) return;
    const a = [...items];
    [a[i], a[n]] = [a[n], a[i]];
    setItems(a);
  };
  const payload = (): WorkoutSave => ({
    date,
    type,
    variant,
    duration: Number(duration) || undefined,
    bodyweight: Number(bodyweight) || undefined,
    calories: Number(calories) || undefined,
    energy: Number(energy) || undefined,
    sleep: Number(sleep) || undefined,
    notes,
    items: items.map((x) => ({
      exerciseId: x.exercise.exerciseId,
      exerciseName: x.exercise.exerciseName,
      slotName: x.slotName,
      sets: x.sets,
      rpe: Number(x.rpe) || undefined,
      notes: x.notes,
    })),
  });
  async function finish() {
    const sets = items.reduce((a, x) => a + x.sets.length, 0),
      bw = Number(bodyweight) || 0,
      volume = items.reduce(
        (a, x) =>
          a +
          x.sets.reduce(
            (b, s) =>
              b +
              ((Number(s.kg) || 0) +
                (isBodyweight(x.exercise) ? bw : 0)) *
                (s.value || 0),
            0,
          ),
        0,
      ),
      pbs = items
        .filter(
          (x) =>
            x.last &&
            Math.max(
              ...x.sets.map((s) => (Number(s.kg) || 0) * (s.value || 0)),
            ) >
              Math.max(
                ...x.last.sets.map((s) => (Number(s.kg) || 0) * (s.value || 0)),
              ),
        )
        .map((x) => x.exercise.exerciseName);
    try {
      if (!navigator.onLine) throw new TypeError();
      await saveWorkout(payload());
      setSummary({ sets, volume, pbs, offline: false });
    } catch (e) {
      if (!navigator.onLine || e instanceof TypeError) {
        queueWorkout(payload());
        setSummary({ sets, volume, pbs, offline: true });
      } else setError(e instanceof Error ? e.message : "Unable to save");
    }
  }
  if (loading) return <div className="workout-full">Loading workout…</div>;
  if (summary)
    return (
      <div className="workout-full">
        <section className="workout-summary">
          <p className="eyebrow">
            {summary.offline ? "SAVED ON DEVICE" : "WORKOUT SAVED"}
          </p>
          <h1>
            {type} {variant} complete
          </h1>
          <div>
            <span>
              <b>{summary.sets}</b>sets
            </span>
            <span>
              <b>{Math.round(summary.volume)}</b>volume kg
            </span>
          </div>
          {summary.pbs.length > 0 && <p>New best: {summary.pbs.join(", ")}</p>}
          <button
            className="finish-workout"
            onClick={() => {
              onSaved(
                `${type} ${variant}`,
                `${duration || "—"} min · ${items.length} exercises`,
              );
              close();
            }}
          >
            Done
          </button>
        </section>
      </div>
    );
  return (
    <div className="workout-full">
      <header>
        <div>
          <p className="eyebrow">{manual ? "MANUAL" : "RECOMMENDED"} WORKOUT</p>
          <h1>
            {type} {variant}
          </h1>
        </div>
        <button onClick={close}>
          <X />
        </button>
      </header>
      <section className="workout-session">
        {[
          ["Date", date, setDate],
          ["Bodyweight", bodyweight, setBodyweight],
          ["Energy /10", energy, setEnergy],
          ["Sleep hours", sleep, setSleep],
        ].map(([l, v, s]) => (
          <label key={String(l)}>
            {String(l)}
            <input
              value={v as string}
              type={l === "Date" ? "date" : "text"}
              onChange={(e) => (s as Function)(e.target.value)}
            />
          </label>
        ))}
      </section>
      {rest > 0 && (
        <button className="rest-floating" onClick={() => setRest(0)}>
          <Timer /> {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
        </button>
      )}
      {error && <p className="workout-error">{error}</p>}
      <section className="live-exercises">
        {items.map((x, i) => (
          <article key={x.exercise.exerciseId + i}>
            <header>
              <span>{i + 1}</span>
              <div>
                <p>{x.slotName}</p>
                <h2>{x.exercise.exerciseName}</h2>
                <small>
                  {x.exercise.group} · {x.exercise.equipment}
                </small>
              </div>
              <b className="recommendation">{recommendationLabel(x)}</b>
              <div className="exercise-controls">
                <button onClick={() => move(i, -1)}>↑</button>
                <button onClick={() => move(i, 1)}>↓</button>
                <button onClick={() => setReplace(i)}>Replace</button>
                <button
                  onClick={() => setItems(items.filter((_, n) => n !== i))}
                >
                  ×
                </button>
              </div>
            </header>
            {x.last && (
              <div className="previous">
                Previous{" "}
                {x.last.sets.map((s, n) => (
                  <b key={n}>
                    {s.kg}×{s.value}
                  </b>
                ))}
              </div>
            )}
            <div className="set-labels" aria-hidden="true">
              <span>Set</span>
              <span>Load</span>
              <span>{x.exercise.trackingType}</span>
            </div>
            {x.sets.map((s, n) => (
              <div className="live-set" key={n}>
                <b>{n + 1}</b>
                <input
                  value={s.kg}
                  placeholder={isBodyweight(x.exercise) ? "BW" : "kg"}
                  aria-label={`${x.exercise.exerciseName} set ${n + 1} load`}
                  onChange={(e) => update(i, n, "kg", e.target.value)}
                />
                <input
                  value={s.value ?? ""}
                  aria-label={`${x.exercise.exerciseName} set ${n + 1} ${x.exercise.trackingType}`}
                  onChange={(e) => update(i, n, "value", e.target.value)}
                />
              </div>
            ))}
            <div className="set-actions">
              <button
                disabled={x.sets.length <= 1}
                onClick={() =>
                  setItems(
                    items.map((a, n) =>
                      n === i ? { ...a, sets: a.sets.slice(0, -1) } : a,
                    ),
                  )
                }
              >
                − Set
              </button>
              <button
                disabled={x.sets.length >= 4}
                onClick={() =>
                  setItems(
                    items.map((a, n) =>
                      n === i
                        ? {
                            ...a,
                            sets: [
                              ...a.sets,
                              { kg: a.sets.at(-1)?.kg || "", value: null },
                            ],
                          }
                        : a,
                    ),
                  )
                }
              >
                + Set
              </button>
              <input className="rest-seconds" value={restSeconds} onChange={(e)=>setRestSeconds(e.target.value)} inputMode="numeric" aria-label="Rest seconds"/>
              <button onClick={() => setRest(Math.max(1,Number(restSeconds)||90))}>Start rest</button>
            </div>
            <details>
              <summary>RPE & notes</summary>
              <input
                value={x.rpe}
                onChange={(e) =>
                  setItems(
                    items.map((a, n) =>
                      n === i ? { ...a, rpe: e.target.value } : a,
                    ),
                  )
                }
              />
              <input
                value={x.notes}
                onChange={(e) =>
                  setItems(
                    items.map((a, n) =>
                      n === i ? { ...a, notes: e.target.value } : a,
                    ),
                  )
                }
              />
            </details>
          </article>
        ))}
      </section>
      <button className="add-from-library" onClick={() => setAdd(true)}>
        <Plus /> Add exercise
      </button>
      <section className="finish-meta">
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Duration min"
        />
        <input
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="Watch calories"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Session notes"
        />
      </section>
      <button
        className="finish-workout"
        disabled={!items.length}
        onClick={finish}
      >
        <Check /> Finish & save
      </button>
      {(add || replace !== null) && (
        <div className="library-modal">
          <section>
            <header>
              <h2>Exercise library</h2>
              <button
                onClick={() => {
                  setAdd(false);
                  setReplace(null);
                }}
              >
                <X />
              </button>
            </header>
            {library
              .filter(
                (e) => replace === null || e.group === items[replace]?.group,
              )
              .map((e) => (
                <button key={e.exerciseId} onClick={() => choose(e)}>
                  <b>{e.exerciseName}</b>
                  <small>
                    {e.group} · {e.equipment}
                  </small>
                </button>
              ))}
          </section>
        </div>
      )}
    </div>
  );
}
