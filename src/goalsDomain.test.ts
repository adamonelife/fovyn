import {describe, expect, it} from 'vitest';
import {aggregateRecords, goalProgress, progressFor, type GoalRule} from './goalsDomain';

const rule: GoalRule = {id:'r',measurement_type:'mass',unit_key:'g',custom_unit:null,target_operator:'minimum',target_min:160,target_max:null,period:'day',aggregation:'sum',effective_from:'2026-08-30',effective_to:null};

describe('Goal progress', () => {
  it('derives progress from numeric records', () => expect(goalProgress(rule,[{value:155,occurred_at:'2026-08-30T10:00:00Z'}],new Date('2026-08-30T12:00:00Z')).percent).toBeCloseTo(96.875));
  it('recalculates when a corrected value changes', () => expect(goalProgress(rule,[{value:165,occurred_at:'2026-08-30T10:00:00Z'}],new Date('2026-08-30T12:00:00Z')).percent).toBe(100));
  it('keeps old periods out of daily totals', () => expect(aggregateRecords(rule,[{value:155,occurred_at:'2026-08-29T10:00:00Z'}],new Date('2026-08-30T12:00:00Z'))).toBe(0));
  it('supports maximum and range rules mathematically', () => {
    expect(progressFor({...rule,target_operator:'maximum',target_min:2},3)).toBeCloseTo(66.666,2);
    expect(progressFor({...rule,target_operator:'range',target_min:7,target_max:9},8)).toBe(100);
  });
});
