export type MeasurementType =
  | 'weight' | 'distance' | 'duration' | 'money' | 'energy' | 'mass'
  | 'percentage' | 'volume' | 'count' | 'time' | 'rating' | 'custom';
export type TargetOperator = 'minimum' | 'maximum' | 'exact' | 'range';
export type GoalPeriod = 'day' | 'week' | 'month' | 'total';
export type Aggregation = 'sum' | 'count' | 'latest' | 'average';

export type GoalRule = {
  id: string;
  measurement_type: MeasurementType;
  unit_key: string | null;
  custom_unit: string | null;
  target_operator: TargetOperator;
  target_min: number;
  target_max: number | null;
  period: GoalPeriod;
  aggregation: Aggregation;
  effective_from: string;
  effective_to: string | null;
};

export type GoalRecord = { value: number; occurred_at: string; deleted_at?: string | null };

export function periodStart(period: GoalPeriod, now = new Date(), weekStartsOn = 1) {
  if (period === 'total') return null;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === 'day') return d;
  if (period === 'month') { d.setDate(1); return d; }
  const delta = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - delta);
  return d;
}

export function aggregateRecords(rule: GoalRule, records: GoalRecord[], now = new Date(), weekStartsOn = 1) {
  const start = periodStart(rule.period, now, weekStartsOn);
  const eligible = records
    .filter(record => !record.deleted_at)
    .filter(record => !start || new Date(record.occurred_at) >= start)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  if (!eligible.length) return 0;
  if (rule.aggregation === 'count') return eligible.length;
  if (rule.aggregation === 'latest') return Number(eligible[0].value);
  const total = eligible.reduce((sum, record) => sum + Number(record.value), 0);
  return rule.aggregation === 'average' ? total / eligible.length : total;
}

export function progressFor(rule: GoalRule, actual: number) {
  const min = Number(rule.target_min);
  const max = rule.target_max === null ? null : Number(rule.target_max);
  if (rule.target_operator === 'minimum') return min <= 0 ? 100 : Math.max(0, Math.min(100, actual / min * 100));
  if (rule.target_operator === 'maximum') return actual <= min ? 100 : Math.max(0, Math.min(100, min / actual * 100));
  if (rule.target_operator === 'range' && max !== null) {
    if (actual >= min && actual <= max) return 100;
    if (actual < min) return min <= 0 ? 0 : Math.max(0, Math.min(100, actual / min * 100));
    return Math.max(0, Math.min(100, max / actual * 100));
  }
  if (min === 0) return actual === 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (1 - Math.abs(actual - min) / Math.abs(min)) * 100));
}

export function goalProgress(rule: GoalRule, records: GoalRecord[], now = new Date(), weekStartsOn = 1) {
  const actual = aggregateRecords(rule, records, now, weekStartsOn);
  return { actual, percent: progressFor(rule, actual) };
}

export function targetLabel(rule: GoalRule, symbol: string) {
  const suffix = symbol ? ` ${symbol}` : '';
  if (rule.target_operator === 'range') return `${rule.target_min}–${rule.target_max}${suffix} / ${rule.period}`;
  const prefix = rule.target_operator === 'minimum' ? 'At least ' : rule.target_operator === 'maximum' ? 'At most ' : 'Exactly ';
  return `${prefix}${rule.target_min}${suffix} / ${rule.period}`;
}
