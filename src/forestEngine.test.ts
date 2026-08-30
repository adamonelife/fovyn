import {describe,expect,it} from 'vitest';
import {deriveEnvironment,eligibleActiveMilliseconds,environmentSessionKey,mergePermanentUnlocks,solarStateForHour,waterStageForDaysBuilt} from './forestEngine';
describe('Forest environment engine',()=>{
 it('never regresses permanent Days Present unlocks',()=>expect(mergePermanentUnlocks(['Forest Elephant'],2)).toContain('Forest Elephant'));
 it('progresses water permanently to Waterfall',()=>{expect(waterStageForDaysBuilt(0)).toBe('Spring');expect(waterStageForDaysBuilt(999)).toBe('Waterfall')});
 it('maps local hours to solar phases',()=>{expect(solarStateForHour(6)).toBe('Sunrise');expect(solarStateForHour(21)).toBe('Night')});
 it('keeps repeat openings inside one session stable',()=>{const a=new Date('2026-08-30T09:01:00');const b=new Date('2026-08-30T10:55:00');expect(environmentSessionKey('forest-a',a)).toBe(environmentSessionKey('forest-a',b));const state={forestSeed:'forest-a',daysBuilt:120,longestDaysPresent:30,permanentWildlife:[] as [],area:'Overview' as const,sessionStartedAt:a.toISOString()};expect(deriveEnvironment(state,a).sessionSeed).toBe(deriveEnvironment(state,b).sessionSeed)});
});
describe('Goal eligible age',()=>{
 it('subtracts closed and open dormancy',()=>{const day=86400000;expect(eligibleActiveMilliseconds('2026-01-01T00:00:00Z','2026-01-11T00:00:00Z',[{dormant_from:'2026-01-03T00:00:00Z',awakened_at:'2026-01-05T00:00:00Z'},{dormant_from:'2026-01-09T00:00:00Z',awakened_at:null}])).toBe(6*day)});
 it('never produces negative eligible time',()=>expect(eligibleActiveMilliseconds('2026-01-02T00:00:00Z','2026-01-01T00:00:00Z',[])).toBe(0));
});
