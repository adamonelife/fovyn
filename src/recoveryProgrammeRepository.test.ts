import{describe,expect,it}from'vitest';
import{recoveryPrescriptionSetCount}from'./recoveryProgrammeRepository';

describe('Recovery prescription set count',()=>{
  it('reads an explicit sets multiplier',()=>{
    expect(recoveryPrescriptionSetCount('2 × 8 per side')).toBe(2);
    expect(recoveryPrescriptionSetCount('3 x 10')).toBe(3);
  });

  it('does not mistake repetitions or time for sets',()=>{
    expect(recoveryPrescriptionSetCount('20 per side')).toBe(1);
    expect(recoveryPrescriptionSetCount('5–20 minutes')).toBe(1);
    expect(recoveryPrescriptionSetCount(null)).toBe(1);
  });
});
