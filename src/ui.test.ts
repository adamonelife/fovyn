import{describe,expect,it}from'vitest';import{isDatedLogView,type LogViewSelection}from'./ui';

describe('shared Log view selection',()=>{it.each<LogViewSelection>(['today','yesterday','date'])('treats %s as a date view',view=>expect(isDatedLogView(view)).toBe(true));it.each<LogViewSelection>(['paused','archived'])('treats %s as a lifecycle view without an active date',view=>expect(isDatedLogView(view)).toBe(false))});
