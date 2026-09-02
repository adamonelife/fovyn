import type { MetricRecord } from "./metricsRepository";

export type MetricSummaryMode = "latest" | "sum" | "average" | "minimum" | "maximum";
export type MetricSummaryPeriod = "day" | "week" | "month" | "total";
export type MetricRecordCardinality = "multiple" | "one_per_day";

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
) {
  const ordered = records.slice().sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  if (!ordered.length) return null;
  if (mode === "latest") return Number(ordered[0].value);
  const start = startOfPeriod(today, period, weekStartsOn);
  const eligible = ordered.filter((record) => {
    const date = record.occurred_at.slice(0, 10);
    return date >= start && date <= today;
  });
  if (!eligible.length) return null;
  const values = eligible.map((record) => Number(record.value));
  if (mode === "sum") return values.reduce((total, value) => total + value, 0);
  if (mode === "average") return values.reduce((total, value) => total + value, 0) / values.length;
  if (mode === "minimum") return Math.min(...values);
  return Math.max(...values);
}
