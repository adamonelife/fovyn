import{describe,expect,it}from'vitest';
import i18n,{formatLocalNumber,localeCodeForPreference}from'./i18n';

describe('Fovyn localisation foundation',()=>{
  it('uses canonical English Auth copy through semantic keys',()=>{
    expect(i18n.t('auth.accountCreated.title')).toBe('Account creation successful');
    expect(i18n.t('auth.accountCreated.continue')).toBe('Continue to Fovyn');
  });
  it('interpolates safely and uses locale-aware number formatting',()=>{
    expect(i18n.t('auth.signUp.confirmation',{email:'person@example.com'})).toContain('person@example.com');
    expect(formatLocalNumber(1234.5)).toBe('1,234.5');
  });
  it('keeps unsupported preferences on the complete English locale',()=>{
    expect(localeCodeForPreference('English')).toBe('en');
    expect(localeCodeForPreference('Bahasa Indonesia')).toBe('en');
  });
});
