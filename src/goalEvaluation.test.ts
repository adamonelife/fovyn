import{describe,expect,it}from'vitest';
import{anchoredPeriod,decideGoalEvaluation}from'./goalEvaluation';

describe('event-driven Goal evaluation',()=>{
  it('locks minimum success as soon as the target is reached',()=>expect(decideGoalEvaluation('minimum',5,5,null,false)).toEqual({state:'success',conclusive:true}));
  it('keeps a limit open until close but fails as soon as it is exceeded',()=>{expect(decideGoalEvaluation('maximum',6,10,null,false).state).toBe('open');expect(decideGoalEvaluation('maximum',11,10,null,false).state).toBe('failed');expect(decideGoalEvaluation('maximum',6,10,null,true).state).toBe('success')});
  it('does not treat exactly as at least',()=>{expect(decideGoalEvaluation('exact',5,5,null,false).state).toBe('open');expect(decideGoalEvaluation('exact',6,5,null,false).state).toBe('failed');expect(decideGoalEvaluation('exact',5,5,null,true).state).toBe('success')});
  it('waits for period close while an additive range can still change',()=>{expect(decideGoalEvaluation('range',8,7,9,false).state).toBe('open');expect(decideGoalEvaluation('range',10,7,9,false).state).toBe('failed');expect(decideGoalEvaluation('range',8,7,9,true).state).toBe('success')});
  it('anchors a seven-day period to a Wednesday Goal start',()=>expect(anchoredPeriod('2026-09-02','2026-09-07',7)).toEqual({start:'2026-09-02',end:'2026-09-08'}));
});
