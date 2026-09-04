import{describe,expect,it}from'vitest';
import{guidanceRegistry,suggestionRegistry}from'./guidanceRegistry';

describe('Fovyn guidance registry',()=>{
 it('keeps every definition versioned and replayable from one source',()=>{for(const[key,item]of Object.entries(guidanceRegistry)){expect(item.featureKey).toBe(key);expect(item.version).toBeGreaterThan(0);expect(item.intro.length).toBeGreaterThan(10);expect(item.help.length).toBeGreaterThan(10)}});
 it('preserves Custom by treating suggestions as editable defaults, not records',()=>{expect(suggestionRegistry.goals[0].defaults).toMatchObject({area_key:'health',target:3,period:'week'});expect(suggestionRegistry.goals[0]).not.toHaveProperty('id')});
 it('keeps future sensitive features disabled until their implementation',()=>{expect(guidanceRegistry.cycle.enabled).toBe(false);expect(guidanceRegistry.canopy.enabled).toBe(false)});
});
