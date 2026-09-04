import { useEffect, useMemo, useState } from "react";
import {
  ArchiveRestore,
  Check,
  ChevronDown,
  Leaf,
  LogOut,
  Plus,
} from "lucide-react";
import {
  createSubcategory,
  loadSettings,
  renameSubcategory,
  savePreferences,
  setSubcategoryArchived,
  type ProfilePreferences,
  type SettingsData,
} from "./settingsRepository";
import ClimateSettings from "./ClimateSettings";
import ClearingSettings from "./ClearingSettings";
import { supabase } from "./supabase";
import { Button } from "./ui";
import CurrencySelector from "./CurrencySelector";

export default function SettingsModule() {
  const [data, setData] = useState<SettingsData | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [area, setArea] = useState("health"),
    [name, setName] = useState(""),
    [showArchived, setShowArchived] = useState(false);
  const load = async () => {
    setError("");
    try {
      const result = await loadSettings();
      setData(result);
      setArea((x) =>
        result.areas.some((a) => a.key === x)
          ? x
          : (result.areas[0]?.key ?? "health"),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load settings");
    }
  };
  useEffect(() => {
    load();
  }, []);
  const act = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      setNotice(message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  };
  const logOut = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("We couldn't log you out. Please try again.");
      setBusy(false);
    }
  };
  const grouped = useMemo(
    () =>
      data?.units.reduce<Record<string, typeof data.units>>((all, unit) => {
        (all[unit.measurement_type] ??= []).push(unit);
        return all;
      }, {}) ?? {},
    [data],
  );
  if (!data)
    return (
      <div className="page-wrap settings-loading">
        {error || "Loading settings…"}
      </div>
    );
  const update = <K extends keyof ProfilePreferences>(
    key: K,
    value: ProfilePreferences[K],
  ) => setData({ ...data, profile: { ...data.profile, [key]: value } });
  return (
    <div className="page-wrap settings-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">ACCOUNT & SETTINGS</p>
          <h1>Account & settings</h1>
        </div>
        <button
          className="soft-button"
          disabled={busy}
          onClick={() =>
            act(() => savePreferences(data.profile), "Preferences saved")
          }
        >
          <Check size={16} /> Save changes
        </button>
      </header>
      {error && <p className="goal-error">{error}</p>}
      {notice && <p className="settings-notice">{notice}</p>}
      <section className="settings-profile">
        <div className="profile-avatar">
          {(data.profile.display_name || data.email || "F")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <h2>{data.profile.display_name || "Your profile"}</h2>
          <p>{data.email}</p>
        </div>
        <Button className="settings-log-out" disabled={busy} onClick={logOut}>
          <LogOut size={16} />
          {busy ? "Logging out…" : "Log Out"}
        </Button>
      </section>
      <section className="settings-panel">
        <p className="eyebrow">PREFERENCES</p>
        <div className="settings-grid">
          <label>
            First name
            <input
              value={data.profile.first_name ?? ""}
              onChange={(e) => update("first_name", e.target.value)}
            />
          </label>
          <label>
            Last name
            <input
              value={data.profile.last_name ?? ""}
              onChange={(e) => update("last_name", e.target.value)}
            />
          </label>
          <label>
            Display name
            <input
              value={data.profile.display_name ?? ""}
              onChange={(e) => update("display_name", e.target.value)}
            />
          </label>
          <label>
            Username
            <input
              value={data.profile.username ?? ""}
              onChange={(e) => update("username", e.target.value)}
              placeholder="unique_username"
            />
          </label>
          <label>
            Email
            <input value={data.email} disabled />
          </label>
          <label>
            Date of birth
            <input
              type="date"
              value={data.profile.date_of_birth ?? ""}
              onChange={(e) => update("date_of_birth", e.target.value)}
            />
          </label>
          <label>
            Gender
            <select
              value={data.profile.gender ?? "na"}
              onChange={(e) =>
                update("gender", e.target.value as ProfilePreferences["gender"])
              }
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="na">N/A</option>
            </select>
          </label>
          <label>
            Country
            <input
              value={data.profile.country ?? ""}
              onChange={(e) => update("country", e.target.value)}
            />
          </label>
          <label>
            Preferred language
            <input
              value={data.profile.preferred_language}
              onChange={(e) => update("preferred_language", e.target.value)}
            />
          </label>
          <label>
            Timezone
            <input
              value={data.profile.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            />
          </label>
          <label>
            Unit system
            <select
              value={data.profile.unit_system}
              onChange={(e) =>
                update(
                  "unit_system",
                  e.target.value as ProfilePreferences["unit_system"],
                )
              }
            >
              <option value="metric">Metric</option>
              <option value="imperial">Imperial</option>
            </select>
          </label>
          <CurrencySelector
            label="Main currency"
            value={data.profile.default_currency}
            onChange={(value) => update("default_currency", value)}
          />
          <label>
            Week starts
            <select
              value={data.profile.week_starts_on}
              onChange={(e) => update("week_starts_on", Number(e.target.value))}
            >
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </label>
          <label>
            Date format
            <select
              value={data.profile.date_format}
              onChange={(e) =>
                update(
                  "date_format",
                  e.target.value as ProfilePreferences["date_format"],
                )
              }
            >
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </label>
          <label>
            Time format
            <select
              value={data.profile.time_format}
              onChange={(e) =>
                update(
                  "time_format",
                  e.target.value as ProfilePreferences["time_format"],
                )
              }
            >
              <option value="24h">24 hour</option>
              <option value="12h">12 hour</option>
            </select>
          </label>
        </div>
      </section>
      <ClimateSettings />
      <ClearingSettings />
      <section className="settings-panel">
        <div className="settings-title">
          <div>
            <p className="eyebrow">CATEGORIES</p>
            <h2>Categories</h2>
          </div>
          <button
            className="text-button"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Hide" : "Show"} archived <ChevronDown size={14} />
          </button>
        </div>
        <div className="subcategory-create">
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            {data.areas.map((a) => (
              <option value={a.key} key={a.key}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New subcategory"
          />
          <button
            disabled={busy || !name.trim()}
            onClick={() =>
              act(async () => {
                await createSubcategory(area, name);
                setName("");
              }, "Subcategory added")
            }
          >
            <Plus /> Add
          </button>
        </div>
        <div className="area-grid">
          {data.areas.map((a) => (
            <article key={a.key}>
              <span className="area-number">0{a.position}</span>
              <h3>{a.name}</h3>
              {data.subcategories
                .filter(
                  (s) =>
                    s.area_key === a.key && (showArchived || !s.archived_at),
                )
                .map((s) => (
                  <div
                    className={
                      s.archived_at ? "subcategory archived" : "subcategory"
                    }
                    key={s.id}
                  >
                    <input
                      defaultValue={s.name}
                      disabled={Boolean(s.archived_at)}
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        if (next && next !== s.name)
                          act(
                            () => renameSubcategory(s.id, next),
                            "Subcategory renamed",
                          );
                      }}
                    />
                    <button
                      title={s.archived_at ? "Restore" : "Archive"}
                      onClick={() =>
                        act(
                          () => setSubcategoryArchived(s.id, !s.archived_at),
                          s.archived_at
                            ? "Subcategory restored"
                            : "Subcategory archived",
                        )
                      }
                    >
                      <ArchiveRestore />
                    </button>
                  </div>
                ))}
              {!data.subcategories.some(
                (s) => s.area_key === a.key && (showArchived || !s.archived_at),
              ) && <p>No subcategories yet.</p>}
            </article>
          ))}
        </div>
      </section>
      <section className="settings-panel">
        <p className="eyebrow">MEASUREMENT CATALOGUE</p>
        <h2>Measurement catalogue</h2>
        <div className="unit-groups">
          {Object.entries(grouped).map(([type, units]) => (
            <details key={type}>
              <summary>
                <span>{type}</span>
                <b>
                  {units.length} {units.length === 1 ? "unit" : "units"}
                </b>
              </summary>
              <div>
                {units.map((u) => (
                  <span key={u.key}>
                    {u.name} <b>{u.symbol}</b>
                    <small>{u.system}</small>
                  </span>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
      <footer className="settings-foot">
        <Leaf /> Grow More Good Days.
      </footer>
    </div>
  );
}
