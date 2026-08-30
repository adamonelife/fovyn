import {describe,expect,it} from 'vitest';
import {deriveEnvironment,environmentSessionKey,mergePermanentUnlocks,solarStateForHour,waterStageForDaysBuilt} from './forestEngine';
describe('Forest environment engine',()=>{
 it('never regresses permanent Days Present unlocks',()=>expect(mergePermanentUnlocks(['Forest Elephant'],2)).toContain('Forest Elephant'));
 it('progresses water permanently to Waterfall',()=>{expect(waterStageForDaysBuilt(0)).toBe('Spring');expect(waterStageForDaysBuilt(999)).toBe('Waterfall')});
 it('maps local hours to solar phases',()=>{expect(solarStateForHour(6)).toBe('Sunrise');expect(solarStateForHour(21)).toBe('Night')});
 it('keeps repeat openings inside one session stable',()=>{const a=new Date('2026-08-30T09:01:00');const b=new Date('2026-08-30T10:55:00');expect(environmentSessionKey('forest-a',a)).toBe(environmentSessionKey('forest-a',b));const state={forestSeed:'forest-a',daysBuilt:120,longestDaysPresent:30,permanentWildlife:[] as [],area:'Overview' as const,sessionStartedAt:a.toISOString()};expect(deriveEnvironment(state,a).sessionSeed).toBe(deriveEnvironment(state,b).sessionSeed)});
});
