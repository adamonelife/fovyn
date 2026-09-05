import {describe,expect,it} from 'vitest';
import {isSafeTelemetryProperties} from './analyticsRepository';

describe('analytics privacy boundary',()=>{
  it('allows stable non-sensitive dimensions',()=>{
    expect(isSafeTelemetryProperties({area_key:'health',entry_point:'home'})).toBe(true);
  });
  it.each(['amount','balance','note','content','goal_name','cycle_detail','symptom','sexual_activity','pregnancy_result','health_value'])('rejects sensitive property %s',(key)=>{
    expect(isSafeTelemetryProperties({[key]:'private'})).toBe(false);
  });
});
