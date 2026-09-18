import{describe,expect,it}from'vitest';
import{normaliseBulkDates,occurrenceForDate,occurrenceValue}from'./metricsRepository';

describe('generic occurrence values',()=>{
  it('stores factual status records with stable numeric values',()=>{
    expect(occurrenceValue('complete','')).toBe(1);
    expect(occurrenceValue('failed','9')).toBe(0);
    expect(occurrenceValue('skipped','9')).toBe(0);
  });
  it('preserves optional decimal dose or duration values',()=>expect(occurrenceValue('complete','05.5')).toBe(5.5));
  it('rejects negative values',()=>expect(()=>occurrenceValue('complete','-1')).toThrow(/zero or more/));
});
describe('bulk Metric dates',()=>{
  it('deduplicates and sorts selected dates',()=>expect(normaliseBulkDates(['2026-09-18','2026-09-16','2026-09-18'])).toEqual(['2026-09-16','2026-09-18']));
  it('keeps the selected local date and time in the canonical timestamp',()=>{const result=new Date(occurrenceForDate('2026-09-18','08:45'));expect(result.getFullYear()).toBe(2026);expect(result.getMonth()).toBe(8);expect(result.getDate()).toBe(18);expect(result.getHours()).toBe(8);expect(result.getMinutes()).toBe(45)});
});
