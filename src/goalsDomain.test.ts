import {describe, expect, it} from 'vitest';
import {aggregateRecords, convertValue, goalProgress, progressFor, type GoalRule} from './goalsDomain';

const rule: GoalRule = {id:'r',measurement_type:'mass',unit_key:'g',custom_unit:null,target_operator:'minimum',target_min:160,target_max:null,period:'day',aggregation:'sum',effective_from:'2026-08-30',effective_to:null};

describe('Goal progress', () => {
  it('derives progress from numeric records', () => expect(goalProgress(rule,[{value:155,occurred_at:'2026-08-30T10:00:00Z'}],new Date('2026-08-30T12:00:00Z')).percent).toBeCloseTo(96.875));
  it('recalculates when a corrected value changes', () => expect(goalProgress(rule,[{value:165,occurred_at:'2026-08-30T10:00:00Z'}],new Date('2026-08-30T12:00:00Z')).percent).toBe(100));
  it('keeps old periods out of daily totals', () => expect(aggregateRecords(rule,[{value:155,occurred_at:'2026-08-29T10:00:00Z'}],new Date('2026-08-30T12:00:00Z'))).toBe(0));
  it('counts existing records from the real Goal start date without inventing earlier progress',()=>{
    const total={...rule,period:'total' as const};
    const records=[{value:1,occurred_at:'2026-08-29T10:00:00Z'},{value:1,occurred_at:'2026-08-30T10:00:00Z'},{value:1,occurred_at:'2026-09-01T10:00:00Z'}];
    expect(aggregateRecords(total,records,new Date('2026-09-02T12:00:00Z'),1,'2026-08-30')).toBe(2);
  });
  it('supports maximum and range rules mathematically', () => {
    expect(progressFor({...rule,target_operator:'maximum',target_min:2},3)).toBeCloseTo(66.666,2);
    expect(progressFor({...rule,target_operator:'range',target_min:7,target_max:9},8)).toBe(100);
  });
});

describe('controlled unit conversion',()=>{
  it('converts through a shared base unit',()=>{
    expect(convertValue(5,{measurement_type:'distance',to_base_factor:1000},{measurement_type:'distance',to_base_factor:1})).toBe(5000);
    expect(convertValue(10,{measurement_type:'weight',to_base_factor:0.45359237},{measurement_type:'weight',to_base_factor:1})).toBeCloseTo(4.5359237);
  });
  it('refuses unrelated measurement types',()=>{
    expect(()=>convertValue(1,{measurement_type:'distance',to_base_factor:1},{measurement_type:'duration',to_base_factor:1})).toThrow('same thing');
  });
});
