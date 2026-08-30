import {describe,expect,it} from 'vitest';
import {canEnterArea,contributionCountsFor,eligibleDaysPresentWildlife,growthRegistry,growthStageForEligibleDays,stablePlacementSeed,treeIdForGoal} from './domain';
describe('Forest foundations',()=>{
 it('derives one stable tree identity from a goal',()=>expect(treeIdForGoal('goal_123')).toBe('tree_goal_123'));
 it('keeps nursery stages out of main Areas',()=>{expect(canEnterArea('Seed')).toBe(false);expect(canEnterArea('Sprout')).toBe(false);expect(canEnterArea('Young Plant')).toBe(false);expect(canEnterArea('Common Juniper')).toBe(true)});
 it('lets one source record contribute without duplication',()=>{const c={id:'c',date:'2026-08-30',title:'Walk',value:'20m',goalIds:['g1','g2'],source:'activity' as const};expect(contributionCountsFor(c,'g1')).toBe(true);expect(contributionCountsFor(c,'g2')).toBe(true);expect(c.id).toBe('c')});
 it('keeps the canonical final normal stage at Coast Redwood',()=>expect(growthRegistry.at(-1)).toBe('Coast Redwood'));
 it('unlocks Days Present wildlife as permanent eligibility only',()=>{expect(eligibleDaysPresentWildlife(6)).toEqual([]);expect(eligibleDaysPresentWildlife(100)).toEqual(['Orangutan','Gorilla','Forest Elephant']);expect(eligibleDaysPresentWildlife(365).at(-1)).toBe('Great White Stag')});
 it('maps eligible age to a non-regressing growth stage',()=>{expect(growthStageForEligibleDays(0)).toBe('Seed');expect(growthStageForEligibleDays(8)).toBe('Common Juniper');expect(growthStageForEligibleDays(1000)).toBe('Coast Redwood')});
 it('creates a stable placement seed',()=>expect(stablePlacementSeed('tree_goal_1')).toBe(stablePlacementSeed('tree_goal_1')));
});
