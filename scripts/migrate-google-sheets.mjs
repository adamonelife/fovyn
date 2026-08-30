import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function isoDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const serial = Number(value);
  if (!Number.isFinite(serial)) return String(value);
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000).toISOString().slice(0, 10);
}

function number(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function truthy(value) {
  return ["yes", "true", "1", "y"].includes(String(value || "").trim().toLowerCase());
}

function objects(rows) {
  const headers = (rows[0] || []).map((value) => String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  return rows.slice(1).filter((row) => row.some((value) => value !== "" && value !== null)).map((row) => {
    const item = { _row: row };
    headers.forEach((header, index) => { item[header] = row[index] ?? ""; });
    return item;
  });
}

async function main() {
  const ownerId = env("FORBAIR_OWNER_USER_ID");
  const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const auth = new google.auth.GoogleAuth({
    credentials: {
      project_id: env("GOOGLE_PROJECT_ID"),
      client_email: env("GOOGLE_CLIENT_EMAIL"),
      private_key: env("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = env("GOOGLE_SHEET_ID");
  const read = async (range) => (await sheets.spreadsheets.values.get({ spreadsheetId, range })).data.values || [];
  const [exerciseRows, ruleRows, templateRows, logRows, sessionRows, cardioRows] = await Promise.all([
    read("'Exercise Library'!A:Z"), read("Rules!A:Z"), read("'Workout Templates'!A:Z"),
    read("'Workout Log'!A:Z"), read("Sessions!A:Z"), read("'Cardio Log'!A:Z"),
  ]);

  const fail = (label, error) => { if (error) throw new Error(`${label}: ${error.message}`); };
  fail("profile", (await supabase.from("profiles").upsert({ id: ownerId }, { onConflict: "id" })).error);

  const exercises = objects(exerciseRows).map((row) => ({
    owner_id: ownerId, exercise_key: String(row.exerciseid), name: String(row.exercisename),
    muscle_group: String(row.group), equipment: String(row.equipment), default_sets: number(row.defaultsets) || 1,
    min_target: number(row.minreps), max_target: number(row.maxreps), increment_kg: number(row.incrementkg) || 0,
    measurement_type: String(row.measurementtype || row.trackingtype || "Reps"),
    progression_type: String(row.progressiontype || "Fixed"), active: truthy(row.active), source_payload: row._row,
  }));
  fail("exercises", (await supabase.from("training_exercises").upsert(exercises, { onConflict: "owner_id,exercise_key" })).error);
  const { data: exerciseData, error: exerciseReadError } = await supabase.from("training_exercises").select("id,exercise_key").eq("owner_id", ownerId);
  fail("exercise lookup", exerciseReadError);
  const exerciseIds = new Map(exerciseData.map((item) => [item.exercise_key, item.id]));

  const rules = objects(ruleRows).map((row) => ({
    owner_id: ownerId, rule_key: String(row.ruleid), exercise_id: exerciseIds.get(String(row.exerciseid)),
    rule_type: String(row.ruletype), condition_text: String(row.condition || ""), action_text: String(row.action || ""),
    active: truthy(row.active), source_payload: row._row,
  })).filter((row) => row.exercise_id);
  fail("rules", (await supabase.from("training_rules").upsert(rules, { onConflict: "owner_id,rule_key" })).error);

  const templateSource = objects(templateRows);
  const templateKeys = [...new Set(templateSource.map((row) => `${row.workouttype}\u0000${row.variant}`))];
  fail("templates", (await supabase.from("training_templates").upsert(templateKeys.map((key) => {
    const [workout_type, variant] = key.split("\u0000"); return { owner_id: ownerId, workout_type, variant };
  }), { onConflict: "owner_id,workout_type,variant" })).error);
  const { data: templateData, error: templateReadError } = await supabase.from("training_templates").select("id,workout_type,variant").eq("owner_id", ownerId);
  fail("template lookup", templateReadError);
  const templateIds = new Map(templateData.map((item) => [`${item.workout_type}\u0000${item.variant}`, item.id]));
  const seenSlots = new Set();
  const slots = templateSource.map((row) => ({
    template_id: templateIds.get(`${row.workouttype}\u0000${row.variant}`), position: number(row.order),
    slot_name: String(row.slotname), muscle_group: String(row.group), default_exercise_id: exerciseIds.get(String(row.defaultexerciseid)),
    required: truthy(row.required), source_payload: row._row,
  })).filter((row) => {
    const key = `${row.template_id}\u0000${row.position}\u0000${row.slot_name}`;
    if (!row.template_id || !row.default_exercise_id || seenSlots.has(key)) return false;
    seenSlots.add(key); return true;
  });
  fail("template slots", (await supabase.from("training_template_slots").upsert(slots, { onConflict: "template_id,position,slot_name" })).error);

  const sessionMetadata = new Map(objects(sessionRows).map((row) => [String(row.sessionid), row._row]));
  const logs = objects(logRows);
  const sessionGroups = new Map();
  for (const row of logs) {
    const key = `${row.sessionid}\u0000${isoDate(row.date)}\u0000${row.workouttype}\u0000${row.variant}`;
    if (!sessionGroups.has(key)) sessionGroups.set(key, []);
    sessionGroups.get(key).push(row);
  }
  for (const [key, rows] of sessionGroups) {
    const [legacy, performedOn, workoutType, variant] = key.split("\u0000");
    const meta = sessionMetadata.get(legacy) || [];
    const sessionRecord = {
      owner_id: ownerId, legacy_session_id: number(legacy), performed_on: performedOn,
      workout_type: workoutType, variant, bodyweight_kg: number(meta[4]), duration_min: number(meta[5]),
      watch_calories: number(meta[6]), energy: number(meta[7]), sleep_hours: number(meta[8]), notes: String(meta[9] || ""),
      source_payload: { workout_log_rows: rows.map((row) => row._row), session_row: meta },
    };
    const { data: session, error: sessionError } = await supabase.from("training_sessions").upsert(sessionRecord, {
      onConflict: "owner_id,legacy_session_id,performed_on,workout_type,variant",
    }).select("id").single();
    fail(`session ${key}`, sessionError);
    for (const row of rows) {
      const exerciseId = exerciseIds.get(String(row.exerciseid));
      if (!exerciseId) continue;
      const exerciseRecord = {
        session_id: session.id, exercise_id: exerciseId, position: number(row.order), slot_name: String(row.slotname || ""),
        exercise_name_snapshot: String(row.exercisename), rpe: number(row.rpe), notes: String(row.notes || ""), source_payload: row._row,
      };
      const { data: sessionExercise, error: sessionExerciseError } = await supabase.from("training_session_exercises").upsert(exerciseRecord, {
        onConflict: "session_id,exercise_id,position,slot_name",
      }).select("id").single();
      fail(`session exercise ${row.exerciseid}`, sessionExerciseError);
      const sets = [1, 2, 3, 4].map((setNumber) => {
        const rawLoad = row[`set${setNumber}kg`];
        const rawValue = row[`set${setNumber}reps`];
        if ((rawLoad === "" || rawLoad === undefined) && (rawValue === "" || rawValue === undefined)) return null;
        return { session_exercise_id: sessionExercise.id, set_number: setNumber, load_kg: String(rawLoad).toUpperCase() === "BW" ? 0 : number(rawLoad), load_label: String(rawLoad).toUpperCase() === "BW" ? "BW" : null, target_value: number(rawValue) };
      }).filter(Boolean);
      if (sets.length) fail(`sets ${row.exerciseid}`, (await supabase.from("training_sets").upsert(sets, { onConflict: "session_exercise_id,set_number" })).error);
    }
  }

  const cardio = objects(cardioRows).map((row) => ({
    owner_id: ownerId, legacy_cardio_id: String(row.cardioid), performed_on: isoDate(row.date), activity: String(row.activity),
    duration_min: number(row.durationmin) || 0, watch_calories: number(row.watchcalories), distance_km: number(row.distancekm),
    average_hr: number(row.averagehr), notes: String(row.notes || ""), source_payload: row._row,
  }));
  if (cardio.length) fail("cardio", (await supabase.from("cardio_entries").upsert(cardio, { onConflict: "owner_id,legacy_cardio_id,performed_on,activity" })).error);

  console.log(JSON.stringify({ exercises: exercises.length, rules: rules.length, templateSlots: slots.length, sessions: sessionGroups.size, workoutRows: logs.length, cardio: cardio.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
