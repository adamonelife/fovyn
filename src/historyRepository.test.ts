import {describe,expect,it} from 'vitest';
import {streakForDates} from './historyRepository';

describe('history streak',()=>{
  const today=new Date('2026-08-31T12:00:00Z');
  it('counts a streak through today',()=>expect(streakForDates(['2026-08-31','2026-08-30','2026-08-29'],today)).toBe(3));
  it('allows today to be unfinished',()=>expect(streakForDates(['2026-08-30','2026-08-29'],today)).toBe(2));
  it('stops at the first gap',()=>expect(streakForDates(['2026-08-31','2026-08-29'],today)).toBe(1));
});
