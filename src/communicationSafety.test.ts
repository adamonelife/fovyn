import {describe,expect,it} from 'vitest';
import {canSendProductCommunication} from './communicationSafety';

describe('shared-backend communication safety',()=>{
  it('allows Development product messages only to explicit test recipients in Test Mode',()=>{
    expect(canSendProductCommunication({environment:'development',isTest:true,audience:'test_recipient'})).toBe(true);
    expect(canSendProductCommunication({environment:'development',isTest:false,audience:'alpha_user'})).toBe(false);
    expect(canSendProductCommunication({environment:'development',isTest:true,audience:'alpha_user'})).toBe(false);
  });
  it('keeps Alpha product messages out of Test Mode',()=>{
    expect(canSendProductCommunication({environment:'alpha',isTest:false,audience:'authenticated_user'})).toBe(true);
    expect(canSendProductCommunication({environment:'alpha',isTest:true,audience:'test_recipient'})).toBe(false);
  });
});
