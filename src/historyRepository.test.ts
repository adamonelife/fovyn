import {describe,expect,it} from 'vitest';
import {deduplicateHistoryItems,historyDeleteTarget,historyKindForModule,streakForDates,type HistoryItem} from './historyRepository';

describe('history streak',()=>{
  const today=new Date('2026-08-31T12:00:00Z');
  it('counts a streak through today',()=>expect(streakForDates(['2026-08-31','2026-08-30','2026-08-29'],today)).toBe(3));
  it('allows today to be unfinished',()=>expect(streakForDates(['2026-08-30','2026-08-29'],today)).toBe(2));
  it('stops at the first gap',()=>expect(streakForDates(['2026-08-31','2026-08-29'],today)).toBe(1));
});
describe('History module grouping',()=>{it.each([['social','social'],['alcohol','alcohol'],['medication','recovery'],['metrics','record']])('maps %s records to %s',(module,kind)=>expect(historyKindForModule(module)).toBe(kind))});
describe('History canonical deletion targets',()=>{it.each([['record','tracking_records'],['nutrition','nutrition_entries'],['activity','cardio_entries'],['habit','habit_entries'],['note','notes'],['training','training_sessions']])('maps %s to %s',(kind,table)=>expect(historyDeleteTarget(kind as Parameters<typeof historyDeleteTarget>[0])).toBe(table))});
describe('History canonical facts',()=>{
  const item=(id:string,kind:HistoryItem['kind'],canonicalId:string,title='No Alcohol',goals:string[]=[]):HistoryItem=>({id,canonicalId,kind,title,detail:'1 count',occurredAt:'2026-09-02T08:00:00Z',corrected:false,goalNames:goals});
  it('renders one specialist occurrence and merges derived Goal relationships',()=>expect(deduplicateHistoryItems([item('metric','record','fact-1','No Alcohol',['September Goal']),item('alcohol','alcohol','fact-1')])).toEqual([expect.objectContaining({id:'alcohol',kind:'alcohol',goalNames:['September Goal']})]));
  it('preserves genuinely separate facts even when their display names match',()=>expect(deduplicateHistoryItems([item('one','alcohol','fact-1'),item('two','alcohol','fact-2')])).toHaveLength(2));
});
