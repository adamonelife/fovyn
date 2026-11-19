import{describe,expect,it}from'vitest';
import{cyclingDistanceLabel,cyclingDistanceNeeded,validCyclingDistance}from'./cyclingDistance';
describe('cycling distance workflow',()=>{
 it('flags stationary and general cycling without distance',()=>{expect(cyclingDistanceNeeded(9,true,null)).toBe(true);expect(cyclingDistanceNeeded(8,true,null)).toBe(true)});
 it('ignores non-cycling and sessions with distance',()=>{expect(cyclingDistanceNeeded(79,false,null)).toBe(false);expect(cyclingDistanceNeeded(9,true,12.4)).toBe(false)});
 it('validates decimal kilometres',()=>{expect(validCyclingDistance('12.45')).toBe(true);expect(validCyclingDistance('')).toBe(false);expect(validCyclingDistance('-1')).toBe(false)});
 it('uses the authoritative stationary type',()=>{expect(cyclingDistanceLabel(9,'Cycling')).toBe('Stationary cycling');expect(cyclingDistanceLabel(8,'Cycling')).toBe('Cycling')});
});
