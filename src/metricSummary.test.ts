import { describe, expect, it } from "vitest";
import { defaultMetricSummary, metricSummary, metricSummaryContext } from "./metricSummary";
import type { MetricRecord } from "./metricsRepository";

const record = (id: string, value: number, date: string): MetricRecord => ({
  id,
  tracker_id: "tracker",
  value,
  unit_key: "count",
  custom_unit: null,
  currency: null,
  occurred_at: `${date}T08:00:00Z`,
  note: null,
  corrected_at: null,
  deleted_at: null,
  occurrence_status: null,
});

const records = [record("a", 82.65, "2026-08-31"), record("b", 82.2, "2026-09-01"), record("c", 81.95, "2026-09-02")];

describe("metricSummary", () => {
  it("uses the latest occurrence for latest-value Metrics", () => expect(metricSummary(records, "latest", "total", "2026-09-02")).toBe(81.95));
  it("totals only the configured current period", () => expect(metricSummary(records, "sum", "month", "2026-09-02")).toBeCloseTo(164.15));
  it("supports explicitly configured average, minimum and maximum summaries", () => {
    expect(metricSummary(records, "average", "total", "2026-09-02")).toBeCloseTo(82.2666667);
    expect(metricSummary(records, "minimum", "total", "2026-09-02")).toBe(81.95);
    expect(metricSummary(records, "maximum", "total", "2026-09-02")).toBe(82.65);
  });
  it("recalculates immediately when the latest record is removed", () => expect(metricSummary(records.slice(0, 2), "latest", "total", "2026-09-02")).toBe(82.2));
  it("defaults additive facts to a weekly sum", () => {
    expect(defaultMetricSummary("count")).toEqual({ mode: "sum", period: "week" });
    expect(defaultMetricSummary("duration")).toEqual({ mode: "sum", period: "week" });
    expect(defaultMetricSummary("distance")).toEqual({ mode: "sum", period: "week" });
  });
  it("defaults point-in-time measurements to latest", () => {
    expect(defaultMetricSummary("weight")).toEqual({ mode: "latest", period: "total" });
    expect(defaultMetricSummary("percentage")).toEqual({ mode: "latest", period: "total" });
  });
  it("labels summaries with their actual context", () => {
    expect(metricSummaryContext("sum", "week")).toBe("This Week");
    expect(metricSummaryContext("sum", "total")).toBe("All Time");
    expect(metricSummaryContext("latest", "week")).toBe("Latest");
  });
  it("uses occurrence date in the profile timezone for period membership", () => {
    const nearMidnight = [record("late", 1, "2026-09-01")];
    nearMidnight[0].occurred_at = "2026-09-01T23:30:00Z";
    expect(metricSummary(nearMidnight, "sum", "day", "2026-09-02", 1, "Asia/Makassar")).toBe(1);
  });
});
