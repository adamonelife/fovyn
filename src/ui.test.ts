import{describe,expect,it}from'vitest';import{isDatedLogView,logDateRange,type LogViewSelection}from'./ui';

describe('shared Log view selection',()=>{it.each<LogViewSelection>(['today','yesterday','date'])('treats %s as a date view',view=>expect(isDatedLogView(view)).toBe(true));it.each<LogViewSelection>(['paused','archived'])('treats %s as a lifecycle view without an active date',view=>expect(isDatedLogView(view)).toBe(false))});
describe('item Log date picker',()=>{it('builds an inclusive date range',()=>expect(logDateRange('2026-08-29','2026-09-01')).toEqual(['2026-08-29','2026-08-30','2026-08-31','2026-09-01']))});
