import { useEffect, useState, type FormEvent } from "react";
import { Apple, Archive, ChevronRight, Plus, Trash2, X } from "lucide-react";
import {
  archiveItem,
  entryPersistenceId,
  loadNutrition,
  parseMacroInput,
  removeEntry,
  removeTarget,
  saveEntry,
  saveItem,
  saveTarget,
  zeroMacros,
  type EntryInput,
  type Macros,
  type NutritionData,
  type NutritionEntry,
  type NutritionItem,
  type NutritionTarget,
} from "./nutritionRepository";
import { formatDisplayLabel } from "./displayLabels";
import { LogEmptyState, LogItemCard, LogSection } from "./ui";

type View = "today" | "meals" | "saved" | "history" | "targets";
type MealType = EntryInput["mealType"];
const mealTypes: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "custom",
];
const nutrientLabels: Record<keyof Macros, string> = {
  calories: "Calories",
  protein_g: "Protein",
  carbs_g: "Carbohydrates",
  fat_g: "Fat",
  fibre_g: "Fibre",
};
const local = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shiftDate = (date: string, days: number) => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return dayKey(next);
};
const decimal = (value: number) => Number(value.toFixed(1));
export const nutritionTotals = (entries: NutritionEntry[]) =>
  entries.reduce((all, entry) => {
    for (const key of Object.keys(all) as (keyof Macros)[])
      all[key] = decimal(all[key] + Number(entry[key]));
    return all;
  }, zeroMacros());
const macroLine = (value: Macros) =>
  `${decimal(value.calories)} kcal · P ${decimal(value.protein_g)}g · C ${decimal(value.carbs_g)}g · F ${decimal(value.fat_g)}g · Fibre ${decimal(value.fibre_g)}g`;

function MacroField({
  name,
  label,
  value,
  set,
}: {
  name: keyof Macros;
  label: string;
  value: number;
  set: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value === 0 ? "" : String(value));
  return (
    <label>
      {label}
      {name !== "calories" ? " (g)" : ""}
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        placeholder={`Enter ${label.toLowerCase()}`}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (event.target.value !== "")
            set(parseMacroInput(event.target.value));
        }}
        onBlur={() => {
          if (draft !== "") {
            const parsed = parseMacroInput(draft);
            setDraft(String(parsed));
            set(parsed);
          }
        }}
      />
    </label>
  );
}
function MacroFields({
  value,
  set,
}: {
  value: Macros;
  set: (value: Macros) => void;
}) {
  return (
    <div className="nutrition-macros">
      {(Object.keys(nutrientLabels) as (keyof Macros)[]).map((key) => (
        <MacroField
          key={key}
          name={key}
          label={nutrientLabels[key]}
          value={value[key]}
          set={(next) => set({ ...value, [key]: next })}
        />
      ))}
    </div>
  );
}

function EntryEditor({
  data,
  entry,
  initialMeal,
  initialDate,
  close,
  saved,
}: {
  data: NutritionData;
  entry?: NutritionEntry;
  initialMeal?: MealType;
  initialDate?: string;
  close: () => void;
  saved: () => void;
}) {
  const [source, setSource] = useState(entry?.source_item_id ?? ""),
    [kind, setKind] = useState<EntryInput["entryKind"]>(
      entry?.entry_kind ?? "food",
    ),
    [name, setName] = useState(entry?.name ?? ""),
    [meal, setMeal] = useState<MealType>(
      entry?.meal_type ?? initialMeal ?? "snack",
    ),
    [custom, setCustom] = useState(entry?.custom_meal ?? ""),
    [macros, setMacros] = useState<Macros>(
      entry
        ? {
            calories: entry.calories,
            protein_g: entry.protein_g,
            carbs_g: entry.carbs_g,
            fat_g: entry.fat_g,
            fibre_g: entry.fibre_g,
          }
        : zeroMacros(),
    ),
    [healthy, setHealthy] = useState<"" | "yes" | "no">(
      entry?.healthy == null ? "" : entry.healthy ? "yes" : "no",
    ),
    [occurred, setOccurred] = useState(
      local(
        entry
          ? new Date(entry.occurred_at)
          : initialDate
            ? new Date(`${initialDate}T12:00:00`)
            : new Date(),
      ),
    ),
    [notes, setNotes] = useState(entry?.notes ?? ""),
    [goalIds, setGoalIds] = useState(entry?.goalIds ?? []),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const choose = (id: string) => {
    setSource(id);
    const item = data.items.find((candidate) => candidate.id === id);
    if (item) {
      setName(item.name);
      setKind(item.kind);
      setMacros({
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fibre_g: item.fibre_g,
      });
      setHealthy(item.healthy == null ? "" : item.healthy ? "yes" : "no");
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveEntry(
        {
          sourceItemId: source || null,
          entryKind: kind,
          name,
          mealType: meal,
          customMeal: custom,
          healthy: healthy === "" ? null : healthy === "yes",
          occurredAt: occurred,
          notes,
          goalIds,
          ...macros,
        },
        entryPersistenceId(entry),
      );
      saved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="sheet-shade nutrition-shade" onMouseDown={close}>
      <form
        className="nutrition-editor"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nutrition-log-title"
      >
        <button type="button" className="sheet-close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">{entry?.id ? "CORRECT" : "LOG"} NUTRITION</p>
        <h2 id="nutrition-log-title">What did you have?</h2>
        <label>
          Use a Food or Saved Meal
          <select
            value={source}
            onChange={(event) => choose(event.target.value)}
          >
            <option value="">Manual entry</option>
            {data.items.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name} · {formatDisplayLabel(item.kind)}
              </option>
            ))}
          </select>
        </label>
        <div className="nutrition-grid">
          <label>
            Entry type
            <select
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as EntryInput["entryKind"])
              }
            >
              <option value="food">Individual Food</option>
              <option value="saved_meal">Saved Meal</option>
              <option value="manual_macros">Manual Macros</option>
              <option value="meal_plan">Meal Plan Entry</option>
            </select>
          </label>
          <label>
            Meal
            <select
              value={meal}
              onChange={(event) => setMeal(event.target.value as MealType)}
            >
              {mealTypes.map((value) => (
                <option value={value} key={value}>
                  {formatDisplayLabel(value)}
                </option>
              ))}
            </select>
          </label>
          {meal === "custom" && (
            <label>
              Custom meal
              <input
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
              />
            </label>
          )}
          <label>
            Name
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Classification
            <select
              value={healthy}
              onChange={(event) =>
                setHealthy(event.target.value as typeof healthy)
              }
            >
              <option value="">Not Classified</option>
              <option value="yes">Healthy</option>
              <option value="no">Not Healthy</option>
            </select>
          </label>
          <label>
            When
            <input
              type="datetime-local"
              min={`${shiftDate(dayKey(), -7)}T00:00`}
              max={`${dayKey()}T23:59`}
              value={occurred}
              onChange={(event) => setOccurred(event.target.value)}
            />
          </label>
        </div>
        <MacroFields value={macros} set={setMacros} />
        <label>
          Notes (optional)
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        {data.goals.length > 0 && (
          <fieldset>
            <legend>Count this toward</legend>
            {data.goals.map((goal) => (
              <label key={goal.id}>
                <input
                  type="checkbox"
                  checked={goalIds.includes(goal.id)}
                  onChange={() =>
                    setGoalIds(
                      goalIds.includes(goal.id)
                        ? goalIds.filter((id) => id !== goal.id)
                        : [...goalIds, goal.id],
                    )
                  }
                />
                {goal.title}
              </label>
            ))}
          </fieldset>
        )}
        {error && <p className="goal-error">{error}</p>}
        <button className="save-record" disabled={busy || !name.trim()}>
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

function ItemEditor({
  kind,
  item,
  close,
  saved,
}: {
  kind?: NutritionItem["kind"];
  item?: NutritionItem;
  close: () => void;
  saved: () => void;
}) {
  const resolvedKind = item?.kind ?? kind ?? "food",
    [name, setName] = useState(item?.name ?? ""),
    [macros, setMacros] = useState<Macros>(
      item
        ? {
            calories: item.calories,
            protein_g: item.protein_g,
            carbs_g: item.carbs_g,
            fat_g: item.fat_g,
            fibre_g: item.fibre_g,
          }
        : zeroMacros(),
    ),
    [healthy, setHealthy] = useState<"" | "yes" | "no">(
      item?.healthy == null ? "" : item.healthy ? "yes" : "no",
    ),
    [error, setError] = useState("");
  return (
    <div className="sheet-shade" onMouseDown={close}>
      <form
        className="nutrition-editor small"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await saveItem(
              {
                kind: resolvedKind,
                name,
                healthy: healthy === "" ? null : healthy === "yes",
                ...macros,
              },
              item?.id,
            );
            saved();
          } catch (reason) {
            setError(
              reason instanceof Error ? reason.message : "Unable to save",
            );
          }
        }}
      >
        <button type="button" className="sheet-close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">
          + ADD {resolvedKind === "food" ? "FOOD" : "SAVED MEAL"}
        </p>
        <h2>
          {item
            ? "Edit template"
            : resolvedKind === "food"
              ? "New Food"
              : "Reusable Meal"}
        </h2>
        <label>
          Name
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <MacroFields value={macros} set={setMacros} />
        <label>
          Classification
          <select
            value={healthy}
            onChange={(event) =>
              setHealthy(event.target.value as typeof healthy)
            }
          >
            <option value="">Not Classified</option>
            <option value="yes">Healthy</option>
            <option value="no">Not Healthy</option>
          </select>
        </label>
        {error && <p className="goal-error">{error}</p>}
        <button className="save-record" disabled={!name.trim()}>
          {item ? "Save Changes" : "Save"}
        </button>
      </form>
    </div>
  );
}
function Targets({
  data,
  reload,
}: {
  data: NutritionData;
  reload: () => void;
}) {
  const [editing, setEditing] = useState<keyof Macros>();
  return (
    <section>
      {(Object.keys(nutrientLabels) as (keyof Macros)[]).map((nutrient) => {
        const target = data.targets.find((item) => item.nutrient === nutrient);
        return (
          <article className="nutrition-target" key={nutrient}>
            <div>
              <b>{nutrientLabels[nutrient]}</b>
              <small>
                {target ? formatDisplayLabel(target.target_type) : "No Target"}
                {target?.minimum_value != null
                  ? ` · ${target.minimum_value}`
                  : ""}
                {target?.maximum_value != null &&
                target.maximum_value !== target.minimum_value
                  ? `–${target.maximum_value}`
                  : ""}
              </small>
            </div>
            <button onClick={() => setEditing(nutrient)}>
              {target ? "Edit" : "Set Target"}
            </button>
            {target && (
              <button onClick={() => removeTarget(nutrient).then(reload)}>
                <Trash2 />
              </button>
            )}
          </article>
        );
      })}
      {editing && (
        <TargetEditor
          nutrient={editing}
          current={data.targets.find((item) => item.nutrient === editing)}
          close={() => setEditing(undefined)}
          saved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
    </section>
  );
}
function TargetEditor({
  nutrient,
  current,
  close,
  saved,
}: {
  nutrient: keyof Macros;
  current?: NutritionTarget;
  close: () => void;
  saved: () => void;
}) {
  const [type, setType] = useState<NutritionTarget["target_type"]>(
      current?.target_type ?? "fixed",
    ),
    [min, setMin] = useState(String(current?.minimum_value ?? "")),
    [max, setMax] = useState(String(current?.maximum_value ?? "")),
    [error, setError] = useState("");
  return (
    <div className="sheet-shade" onMouseDown={close}>
      <form
        className="nutrition-editor small"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await saveTarget({
              nutrient,
              target_type: type,
              minimum_value: min === "" ? null : Number(min),
              maximum_value: max === "" ? null : Number(max),
            });
            saved();
          } catch (reason) {
            setError(
              reason instanceof Error ? reason.message : "Unable to save",
            );
          }
        }}
      >
        <button type="button" className="sheet-close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">TARGET</p>
        <h2>{nutrientLabels[nutrient]}</h2>
        <label>
          Target type
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as NutritionTarget["target_type"])
            }
          >
            {["fixed", "range", "minimum", "maximum"].map((value) => (
              <option value={value} key={value}>
                {formatDisplayLabel(value)}
              </option>
            ))}
          </select>
        </label>
        {type !== "maximum" && (
          <label>
            {type === "fixed" ? "Value" : "Minimum"}
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={min}
              onChange={(event) => setMin(event.target.value)}
            />
          </label>
        )}
        {type !== "minimum" && type !== "fixed" && (
          <label>
            Maximum
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={max}
              onChange={(event) => setMax(event.target.value)}
            />
          </label>
        )}
        {error && <p className="goal-error">{error}</p>}
        <button className="save-record">Save Target</button>
      </form>
    </div>
  );
}

function MealSection({
  meal,
  entries,
  visibleEntries = entries,
  add,
  edit,
  remove,
}: {
  meal: MealType;
  entries: NutritionEntry[];
  visibleEntries?: NutritionEntry[];
  add: () => void;
  edit: (entry: NutritionEntry) => void;
  remove: (entry: NutritionEntry) => void;
}) {
  const total = nutritionTotals(entries);
  return (
    <LogSection
      title={meal === "custom" ? "Other" : formatDisplayLabel(meal)}
      action={
        <button className="nutrition-meal-add" onClick={add}>
          <Plus /> Add
        </button>
      }
    >
      <div className="nutrition-meal-list">
        {visibleEntries.map((entry) => (
          <LogItemCard
            key={entry.id}
            icon={<Apple />}
            meta={formatDisplayLabel(entry.entry_kind)}
            title={entry.name}
            detail={macroLine(entry)}
            onClick={() => edit(entry)}
          >
            <button
              className="nutrition-entry-remove"
              aria-label={`Remove ${entry.name}`}
              onClick={() => remove(entry)}
            >
              <Trash2 />
            </button>
          </LogItemCard>
        ))}
        {entries.length > 0 && (
          <div className="nutrition-meal-total">
            <span>{formatDisplayLabel(meal)} Total</span>
            <b>{macroLine(total)}</b>
          </div>
        )}
        {!entries.length && (
          <p className="nutrition-meal-empty">Nothing logged.</p>
        )}
        {entries.length > 0 && !visibleEntries.length && (
          <p className="nutrition-meal-empty">No matching entries.</p>
        )}
      </div>
    </LogSection>
  );
}

export default function NutritionModule({
  query = "",
  initialEntryId,
}: {
  query?: string;
  initialEntryId?: string;
}) {
  const [data, setData] = useState<NutritionData>({
      items: [],
      entries: [],
      targets: [],
      goals: [],
    }),
    [view, setView] = useState<View>("today"),
    [selectedDate, setSelectedDate] = useState(dayKey()),
    [editing, setEditing] = useState<NutritionEntry>(),
    [addingEntry, setAddingEntry] = useState<{
      meal: MealType;
      date: string;
    }>(),
    [adding, setAdding] = useState<NutritionItem["kind"]>(),
    [editingItem, setEditingItem] = useState<NutritionItem>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const next = await loadNutrition();
      setData(next);
      if (initialEntryId)
        setEditing(next.entries.find((entry) => entry.id === initialEntryId));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load Nutrition",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const matches = (entry: NutritionEntry) =>
      `${entry.name} ${entry.meal_type} ${entry.entry_kind}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    allDayEntries = data.entries.filter(
      (entry) => entry.occurred_at.slice(0, 10) === selectedDate,
    ),
    dayEntries = allDayEntries.filter(matches),
    daily = nutritionTotals(allDayEntries),
    historyItems =
      view === "history" ? data.entries.filter(matches) : dayEntries;
  if (loading)
    return <div className="page-wrap tracker-loading">Loading Nutrition…</div>;
  return (
    <div className="page-wrap nutrition-v1">
      <header className="page-head">
        <div>
          <p className="eyebrow">NUTRITION</p>
          <h1>Nutrition</h1>
        </div>
        <button
          className="soft-button"
          onClick={() => setAddingEntry({ meal: "snack", date: selectedDate })}
        >
          <Plus /> Log Food
        </button>
      </header>
      <nav className="nutrition-tabs">
        {(["today", "meals", "saved", "history", "targets"] as View[]).map(
          (value) => (
            <button
              className={view === value ? "active" : ""}
              onClick={() => setView(value)}
              key={value}
            >
              {formatDisplayLabel(value, { saved: "Saved Meals" })}
            </button>
          ),
        )}
      </nav>
      {error && <p className="goal-error">{error}</p>}
      {view === "today" && (
        <>
          <div className="nutrition-date-controls">
            <button
              className={selectedDate === dayKey() ? "active" : ""}
              onClick={() => setSelectedDate(dayKey())}
            >
              Today
            </button>
            <button
              className={
                selectedDate === shiftDate(dayKey(), -1) ? "active" : ""
              }
              onClick={() => setSelectedDate(shiftDate(dayKey(), -1))}
            >
              Yesterday
            </button>
            <input
              type="date"
              min={shiftDate(dayKey(), -7)}
              max={dayKey()}
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
          <section className="nutrition-daily-total">
            <p className="eyebrow">DAILY TOTAL</p>
            <div>
              {(Object.keys(nutrientLabels) as (keyof Macros)[]).map((key) => (
                <span key={key}>
                  <b>
                    {Number(daily[key].toFixed(1))}
                    {key === "calories" ? "" : "g"}
                  </b>
                  <small>{nutrientLabels[key]}</small>
                </span>
              ))}
            </div>
          </section>
          {mealTypes.map((meal) => (
            <MealSection
              meal={meal}
              entries={dayEntries.filter((entry) => entry.meal_type === meal)}
              add={() => setAddingEntry({ meal, date: selectedDate })}
              edit={setEditing}
              remove={(entry) =>
                confirm(
                  "Remove this Nutrition entry from History and Goal progress?",
                ) && removeEntry(entry.id).then(load)
              }
              key={meal}
            />
          ))}
        </>
      )}
      {view === "history" && (
        <div className="nutrition-entry-list">
          {historyItems.map((entry) => (
            <article key={entry.id}>
              <button onClick={() => setEditing(entry)}>
                <span>
                  <Apple />
                </span>
                <div>
                  <small>
                    {formatDisplayLabel(entry.meal_type)} ·{" "}
                    {new Date(entry.occurred_at).toLocaleString()}
                  </small>
                  <h3>{entry.name}</h3>
                  <p>{macroLine(entry)}</p>
                </div>
                <ChevronRight />
              </button>
              <button
                onClick={() =>
                  confirm(
                    "Remove this Nutrition entry from History and Goal progress?",
                  ) && removeEntry(entry.id).then(load)
                }
              >
                <Trash2 />
              </button>
            </article>
          ))}
          {!historyItems.length && (
            <LogEmptyState icon={<Apple />} title="No Nutrition logged" />
          )}
        </div>
      )}
      {(view === "meals" || view === "saved") && (
        <section>
          <button
            className="nutrition-add-item"
            onClick={() => setAdding(view === "meals" ? "food" : "saved_meal")}
          >
            <Plus /> Add {view === "meals" ? "Food" : "Saved Meal"}
          </button>
          <div className="nutrition-library">
            {data.items
              .filter(
                (item) =>
                  item.kind === (view === "meals" ? "food" : "saved_meal"),
              )
              .map((item) => (
                <article key={item.id}>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{macroLine(item)}</p>
                  </div>
                  <button onClick={() => setEditingItem(item)}>Edit</button>
                  <button
                    onClick={() =>
                      setEditing({
                        ...item,
                        id: "",
                        source_item_id: item.id,
                        entry_kind: item.kind,
                        meal_type: "snack",
                        custom_meal: null,
                        occurred_at: new Date(
                          `${selectedDate}T12:00:00`,
                        ).toISOString(),
                        notes: null,
                        corrected_at: null,
                        goalIds: [],
                      })
                    }
                  >
                    Log
                  </button>
                  <button onClick={() => archiveItem(item.id).then(load)}>
                    <Archive />
                  </button>
                </article>
              ))}
          </div>
        </section>
      )}
      {view === "targets" && <Targets data={data} reload={load} />}{" "}
      {(editing || addingEntry) && (
        <EntryEditor
          data={data}
          entry={editing}
          initialMeal={addingEntry?.meal}
          initialDate={addingEntry?.date}
          close={() => {
            setEditing(undefined);
            setAddingEntry(undefined);
          }}
          saved={() => {
            setEditing(undefined);
            setAddingEntry(undefined);
            load();
          }}
        />
      )}
      {adding && (
        <ItemEditor
          kind={adding}
          close={() => setAdding(undefined)}
          saved={() => {
            setAdding(undefined);
            load();
          }}
        />
      )}
      {editingItem && (
        <ItemEditor
          item={editingItem}
          close={() => setEditingItem(undefined)}
          saved={() => {
            setEditingItem(undefined);
            load();
          }}
        />
      )}
    </div>
  );
}
