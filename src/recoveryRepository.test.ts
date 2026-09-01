import{describe,expect,it}from'vitest';
import{filterRecoveryTrackers}from'./recoveryRepository';
import type{Tracker}from'./trackerRepository';

const tracker=(module:Tracker['module'],status:Tracker['status'])=>({module,status}as Tracker);
describe('Supplements & Recovery tracker selection',()=>{
  it('includes active and paused recovery trackers but excludes unrelated and archived items',()=>expect(filterRecoveryTrackers([tracker('medication','active'),tracker('medication','paused'),tracker('medication','archived'),tracker('metrics','active')])).toHaveLength(2));
});
