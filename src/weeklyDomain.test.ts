import {describe,it,expect} from 'vitest';
import {weekStart,shiftDate,weeklyDefaults,weeklyTotal,categoriesForWeek} from './weeklyDomain';
describe('weekly tracking',()=>{
 it('uses Monday at Bali midnight',()=>{expect(weekStart('2026-11-15T15:59:59Z')).toBe('2026-11-09');expect(weekStart('2026-11-15T16:00:00Z')).toBe('2026-11-16');expect(shiftDate('2026-12-28',7)).toBe('2027-01-04')});
 it('continues past target and does not count manual fallback on workout days',()=>{const gym=weeklyDefaults[0];expect(weeklyTotal(gym,[{id:'m',category_key:'gym',amount:1,occurred_at:'2026-11-16T04:00Z',book_id:null,medium:null}],Array.from({length:5},(_,i)=>({id:String(i),performed_on:'2026-11-16',session_type:'normal'})))).toBe(5)});
 it('counts reading and audio minutes together',()=>{expect(weeklyTotal(weeklyDefaults[2],[{id:'1',category_key:'reading',amount:30,occurred_at:'2026-11-16T03:00Z',book_id:null,medium:'reading'},{id:'2',category_key:'reading',amount:60,occurred_at:'2026-11-16T03:00Z',book_id:null,medium:'audiobook'}],[])).toBe(1.5)});
 it('does not rewrite previous goal weeks',()=>{const v=[{effective_week:'2026-11-23',categories:[{...weeklyDefaults[0],target:5}]}];expect(categoriesForWeek(v,'2026-11-16')[0].target).toBe(4);expect(categoriesForWeek(v,'2026-11-23')[0].target).toBe(5)});
});
