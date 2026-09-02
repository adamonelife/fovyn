import type { MetricRecord } from "./metricsRepository";
import type { MeasurementType } from "./goalsDomain";
import { fovynDateKey } from "./fovynDate";

export type MetricSummaryMode = "latest" | "sum" | "average" | "minimum" | "maximum";
export type MetricSummaryPeriod = "day" | "week" | "month" | "total";
export type MetricRecordCardinality = "multiple" | "one_per_day";

const additiveMeasurementTypes = new Set<MeasurementType>([
  "count", "duration", "distance", "money", "energy", "mass", "volume",
]);

export function defaultMetricSummary(measurementType: MeasurementType): {
  mode: MetricSummaryMode;
  period: MetricSummaryPeriod;
} {
  return additiveMeasurementTypes.has(measurementType)
    ? { mode: "sum", period: "week" }
    : { mode: "latest", period: "total" };
}

export function metricSummaryContext(mode: MetricSummaryMode, period: MetricSummaryPeriod) {
  if (mode === "latest") return "Latest";
  return ({ day: "Today", week: "This Week", month: "This Month", total: "All Time" } as const)[period];
}

const startOfPeriod = (dateKey: string, period: MetricSummaryPeriod, weekStartsOn = 1) => {
  if (period === "total") return "0000-01-01";
  if (period === "day") return dateKey;
  if (period === "month") return `${dateKey.slice(0, 7)}-01`;
  const date = new Date(`${dateKey}T12:00:00`);
  const delta = (date.getDay() - weekStartsOn + 7) % 7;
  date.setDate(date.getDate() - delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function metricSummary(
  records: MetricRecord[],
  mode: MetricSummaryMode = "latest",
  period: MetricSummaryPeriod = "total",
  today = new Date().toISOString().slice(0, 10),
  weekStartsOn = 1,
  timeZone = "UTC",
) {
  const ordered = records.slice().sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  if (!ordered.length) return null;
  if (mode === "latest") return Number(ordered[0].value);
  const start = startOfPeriod(today, period, weekStartsOn);
  const eligible = ordered.filter((record) => {
    const date = fovynDateKey(timeZone, new Date(record.occurred_at));
    return date >= start && date <= today;
  });
  if (!eligible.length) return null;
  const values = eligible.map((record) => Number(record.value));
  if (mode === "sum") return values.reduce((total, value) => total + value, 0);
  if (mode === "average") return values.reduce((total, value) => total + value, 0) / values.length;
  if (mode === "minimum") return Math.min(...values);
  return Math.max(...values);
}
