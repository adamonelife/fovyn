import {describe,expect,it} from 'vitest';
import {validatePreferences,type ProfilePreferences} from './settingsRepository';

const valid:ProfilePreferences={first_name:null,last_name:null,display_name:null,username:'adam_1',date_of_birth:'1990-01-01',gender:'na',country:null,preferred_language:'English',timezone:'Europe/London',unit_system:'metric',default_currency:'GBP',week_starts_on:1,date_format:'DD/MM/YYYY',time_format:'24h'};

describe('account preference validation',()=>{
  it('accepts a complete valid profile',()=>expect(()=>validatePreferences(valid)).not.toThrow());
  it('rejects an invalid username',()=>expect(()=>validatePreferences({...valid,username:'a b'})).toThrow(/Username/));
  it('rejects an invalid timezone',()=>expect(()=>validatePreferences({...valid,timezone:'London'})).toThrow(/timezone/));
  it('rejects an invalid currency',()=>expect(()=>validatePreferences({...valid,default_currency:'UK'})).toThrow(/currency/));
  it('rejects a future date of birth',()=>expect(()=>validatePreferences({...valid,date_of_birth:'2999-01-01'})).toThrow(/future/));
});
