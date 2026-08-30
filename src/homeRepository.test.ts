import {describe,expect,it} from 'vitest';
import {expectedToday,type HomeHabit} from './homeRepository';

const habit=(frequency_type:HomeHabit['frequency_type'],days_of_week:number[]=[]):HomeHabit=>({id:'h',name:'Habit',status:null,frequency_type,days_of_week});

describe('Today surfacing',()=>{
  const monday=new Date('2026-08-31T12:00:00Z');
  it('surfaces daily and explicitly scheduled items',()=>{
    expect(expectedToday(habit('daily'),monday)).toBe(true);
    expect(expectedToday(habit('specific_days',[1,3]),monday)).toBe(true);
  });
  it('keeps available and unscheduled items out of Today',()=>{
    expect(expectedToday(habit('specific_days',[2]),monday)).toBe(false);
    expect(expectedToday(habit('times_per_week'),monday)).toBe(false);
    expect(expectedToday(habit(null),monday)).toBe(false);
  });
});
