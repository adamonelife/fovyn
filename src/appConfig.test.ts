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

describe('explicit disposable loopback configuration',()=>{
 const local={...valid,DEV:true,VITE_FOVYN_LOCAL_PREVIEW:'true',VITE_SUPABASE_URL:'http://127.0.0.1:4178/__supabase'};
 it('permits HTTP only for explicitly flagged local development',()=>expect(readAppConfig(local).supabaseUrl).toBe(local.VITE_SUPABASE_URL));
 it('rejects an unflagged HTTP backend',()=>expect(()=>readAppConfig({...local,VITE_FOVYN_LOCAL_PREVIEW:'false'})).toThrow('HTTPS'));
 it('rejects HTTP in a build or Alpha even with the local flag',()=>{expect(()=>readAppConfig({...local,DEV:false})).toThrow('HTTPS');expect(()=>readAppConfig({...local,VITE_FOVYN_ENVIRONMENT:'alpha'})).toThrow('HTTPS');});
 it('rejects a remote HTTP backend even with the local flag',()=>expect(()=>readAppConfig({...local,VITE_SUPABASE_URL:'http://example.supabase.co'})).toThrow('HTTPS'));
});
