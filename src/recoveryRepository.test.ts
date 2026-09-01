import{describe,expect,it}from'vitest';
import{filterCategoryTrackers,filterRecoveryTrackers}from'./recoveryRepository';
import type{Tracker}from'./trackerRepository';

const tracker=(module:Tracker['module'],status:Tracker['status'])=>({module,status}as Tracker);
describe('Supplements & Recovery tracker selection',()=>{
  it('includes active and paused recovery trackers but excludes unrelated and archived items',()=>expect(filterRecoveryTrackers([tracker('medication','active'),tracker('medication','paused'),tracker('medication','archived'),tracker('metrics','active')])).toHaveLength(2));
});

describe('Social and Alcohol tracker selection',()=>{
  const trackers=[tracker('social','active'),tracker('social','paused'),tracker('social','archived'),tracker('alcohol','active'),tracker('alcohol','paused'),tracker('alcohol','archived')];
  it('keeps active and paused Social items within Social',()=>expect(filterCategoryTrackers(trackers,'social')).toEqual([trackers[0],trackers[1]]));
  it('keeps active and paused Alcohol items within Alcohol',()=>expect(filterCategoryTrackers(trackers,'alcohol')).toEqual([trackers[3],trackers[4]]));
});
