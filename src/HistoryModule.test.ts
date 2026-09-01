import{describe,expect,it}from'vitest';
import{calendarMonthGrid,canBackdateHistory}from'./HistoryModule';

describe('History calendar',()=>{
  it('builds a stable six-week Monday-first month grid',()=>{
    const grid=calendarMonthGrid(new Date(2026,8,1));
    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({key:'2026-08-31',day:31,currentMonth:false});
    expect(grid.filter(day=>day.currentMonth)).toHaveLength(30);
    expect(grid.at(-1)?.key).toBe('2026-10-11');
  });

  it('allows Log for today and the previous seven days only',()=>{
    expect(canBackdateHistory('2026-09-10','2026-09-10')).toBe(true);
    expect(canBackdateHistory('2026-09-03','2026-09-10')).toBe(true);
    expect(canBackdateHistory('2026-09-02','2026-09-10')).toBe(false);
    expect(canBackdateHistory('2026-09-11','2026-09-10')).toBe(false);
  });
});
