import {describe,it,expect} from 'vitest';
import {applyOptimisticStatus,snapshotStatus,statusActions,statusPatch,statusConfirmed,type StatusSnapshot} from './readingStatus';
describe('one-tap Reading status',()=>{
 const base={id:'book-1',title:'Synthetic',status:'want' as const,status_revision:0,ownership:'owned',series_name:'Series',series_order:1};
 it('offers appropriate actions for every status',()=>{
  expect(statusActions(base).map(x=>x.next)).toEqual(['reading','completed']);
  expect(statusActions({...base,status:'reading'}).map(x=>x.next)).toEqual(['completed','paused']);
  expect(statusActions({...base,status:'paused'}).map(x=>x.next)).toEqual(['reading','completed','want']);
  expect(statusActions({...base,status:'unspecified'}).map(x=>x.next)).toEqual(['want','reading','completed']);
  expect(statusActions({...base,status:'completed',status_before_completion:'paused'})).toEqual([{label:'Return to paused',next:'paused'}]);
 });
 it('finishes from TBR in one tap and records the Bali date',()=>{
  const patch=statusPatch(base,'completed','2026-11-19');
  expect(patch).toEqual({status:'completed',completion_date:'2026-11-19',status_before_completion:'want'});
  const next=applyOptimisticStatus(base,patch);
  expect(next).toMatchObject({status:'completed',id:'book-1',ownership:'owned',series_name:'Series',status_revision:1});
  expect(statusConfirmed(next,patch,0)).toBe(true);
 });
 it('undo restores exactly the previous metadata, including a historical completed book with no date',()=>{
  const old:StatusSnapshot={status:'completed',completion_date:null,status_before_completion:null,status_revision:8};
  const reopened=applyOptimisticStatus(old,statusPatch(old,'want'));
  expect(reopened).toMatchObject({status:'want',completion_date:null,status_revision:9});
  const restored=applyOptimisticStatus(reopened,snapshotStatus(old));
  expect(restored).toMatchObject({status:'completed',completion_date:null,status_revision:10});
 });
 it('rejects stale or failed optimistic confirmation and can restore a prior snapshot',()=>{
  const patch=statusPatch(base,'completed','2026-11-19');
  expect(statusConfirmed(base,patch,0)).toBe(false);
  expect(statusConfirmed({...applyOptimisticStatus(base,patch),status_revision:3},patch,0)).toBe(false);
  const recovered={...applyOptimisticStatus(base,patch),...snapshotStatus(base),status_revision:0};
  expect(recovered).toMatchObject({status:'want',completion_date:null,status_revision:0,ownership:'owned'});
 });
});
