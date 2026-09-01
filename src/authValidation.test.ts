import {describe,expect,it} from 'vitest';
import {friendlyAuthError,passwordIsValid} from './authValidation';

describe('Fovyn sign-up validation',()=>{
  it('requires the complete password policy',()=>{
    expect(passwordIsValid('Strong1!')).toBe(true);
    expect(passwordIsValid('strong1!')).toBe(false);
    expect(passwordIsValid('StrongPassword!')).toBe(false);
    expect(passwordIsValid('Strong12')).toBe(false);
  });

  it('does not expose raw authentication errors',()=>{
    expect(friendlyAuthError('Invalid login credentials')).toBe('The email or password is incorrect.');
    expect(friendlyAuthError('Database error saving new user')).toBe('We could not complete that request. Please try again.');
  });
});
