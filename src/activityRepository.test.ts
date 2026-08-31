import {describe,expect,it} from 'vitest';
import {validateActivity,type ActivityInput} from './activityRepository';
const valid:ActivityInput={trackerId:'one',activity:'Walk',occurredAt:'2026-08-31T09:00',durationMin:30,watchCalories:100,distanceKm:3,averageHr:110,notes:'',isSocial:false,goalIds:[]};
describe('activity validation',()=>{it('accepts a typed activity',()=>expect(()=>validateActivity(valid)).not.toThrow());it('requires positive duration',()=>expect(()=>validateActivity({...valid,durationMin:0})).toThrow(/Duration/));it('rejects negative optional values',()=>expect(()=>validateActivity({...valid,distanceKm:-1})).toThrow(/Distance/));});
