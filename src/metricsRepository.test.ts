import{describe,expect,it}from'vitest';
import{occurrenceValue}from'./metricsRepository';

describe('generic occurrence values',()=>{
  it('stores factual status records with stable numeric values',()=>{
    expect(occurrenceValue('complete','')).toBe(1);
    expect(occurrenceValue('failed','9')).toBe(0);
    expect(occurrenceValue('skipped','9')).toBe(0);
  });
  it('preserves optional decimal dose or duration values',()=>expect(occurrenceValue('complete','05.5')).toBe(5.5));
  it('rejects negative values',()=>expect(()=>occurrenceValue('complete','-1')).toThrow(/zero or more/));
});
