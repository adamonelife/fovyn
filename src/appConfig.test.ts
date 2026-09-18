import {describe,expect,it} from 'vitest';
import {readAppConfig} from './appConfig';

const valid={VITE_FOVYN_ENVIRONMENT:'development',VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'public-key'};

describe('explicit application configuration',()=>{
  it('accepts an explicit environment and public Supabase configuration',()=>{
    expect(readAppConfig(valid).environment).toBe('development');
  });
  it.each(['VITE_FOVYN_ENVIRONMENT','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'])('fails when %s is missing',(name)=>{
    expect(()=>readAppConfig({...valid,[name]:''})).toThrow(name);
  });
  it('does not infer an unknown environment as Alpha',()=>{
    expect(()=>readAppConfig({...valid,VITE_FOVYN_ENVIRONMENT:'preview'})).toThrow('must be alpha or development');
  });
});
