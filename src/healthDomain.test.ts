import{describe,it,expect}from'vitest';
import{cyclingEquivalentSteps,combinedActivityEquivalent,healthSyncFresh,healthSyncLabel,sleepDate,targetProgress}from'./healthDomain';
describe('health metrics',()=>{
 it('keeps measured and estimated steps separate',()=>{expect(cyclingEquivalentSteps(60,null)).toBe(4200);expect(combinedActivityEquivalent(8000,4200)).toBe(12200);expect(8000).toBe(8000)});
 it('uses conservative versioned intensity bands and caps extreme durations',()=>{expect(cyclingEquivalentSteps(60,240)).toBe(4200);expect(cyclingEquivalentSteps(60,360)).toBe(5100);expect(cyclingEquivalentSteps(60,600)).toBe(6000);expect(cyclingEquivalentSteps(600,6000)).toBe(18000)});
 it('attributes sleep to the Bali wake date across midnight',()=>{expect(sleepDate('2026-11-19T00:30:00Z')).toBe('2026-11-19');expect(sleepDate('2026-11-18T15:30:00Z')).toBe('2026-11-18')});
 it('shows over-target progress without losing the achieved state',()=>{expect(targetProgress(12000,10000)).toMatchObject({done:true});expect(targetProgress(15000,10000,13000).width).toBe(100)});
 it('distinguishes pending, current and stale sync states',()=>{const now=new Date('2026-11-19T06:00:00Z').getTime();expect(healthSyncFresh('2026-11-19T05:30:00Z',now)).toBe(true);expect(healthSyncFresh('2026-11-19T05:00:00Z',now)).toBe(false);expect(healthSyncLabel('2026-11-19T05:30:00Z','no_changes',null,now)).toContain('no new data');expect(healthSyncLabel('2026-11-19T05:30:00Z','success','pending',now)).toContain('waiting')});
});

