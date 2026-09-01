import {describe,expect,it} from 'vitest';
import {friendlyAuthError,generatePassword,passwordIsValid,passwordPolicy} from './authValidation';

describe('Fovyn sign-up validation',()=>{
  it('requires the complete password policy',()=>{
    expect(passwordIsValid('Strong1!')).toBe(true);
    expect(passwordIsValid('strong1!')).toBe(false);
    expect(passwordIsValid('StrongPassword!')).toBe(false);
    expect(passwordIsValid('Strong12')).toBe(false);
  });

  it('generates 100 passwords that use only allowed characters and pass the production validator',()=>{
    const allowed=[passwordPolicy.lowercase,passwordPolicy.uppercase,passwordPolicy.numbers,passwordPolicy.symbols].join('');
    for(let count=0;count<100;count+=1){
      const password=generatePassword();
      expect(password.length).toBeGreaterThanOrEqual(passwordPolicy.minimumLength);
      expect([...password].every(character=>allowed.includes(character))).toBe(true);
      expect([...password].some(character=>passwordPolicy.lowercase.includes(character))).toBe(true);
      expect([...password].some(character=>passwordPolicy.uppercase.includes(character))).toBe(true);
      expect([...password].some(character=>passwordPolicy.numbers.includes(character))).toBe(true);
      expect([...password].some(character=>passwordPolicy.symbols.includes(character))).toBe(true);
      expect(passwordIsValid(password)).toBe(true);
    }
  });

  it('does not expose raw authentication errors',()=>{
    expect(friendlyAuthError('Invalid login credentials')).toBe('The email or password is incorrect.');
    expect(friendlyAuthError('Database error saving new user')).toBe('We could not complete that request. Please try again.');
  });
});
