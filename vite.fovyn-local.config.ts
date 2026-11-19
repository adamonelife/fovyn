import {defineConfig} from 'vite';
import {readFileSync} from 'node:fs';
// Development-only overrides: ignore shared .env files and use loopback services.
export default defineConfig(({command})=>{
 if(command!=='serve')throw new Error('Integrated local preview is development-only; use the normal build for compile checks.');
 const local=JSON.parse(readFileSync(new URL('../phase1/integrated-tools/local-services.json',import.meta.url),'utf8'));
 return {envDir:false,define:{'import.meta.env.VITE_FOVYN_ENVIRONMENT':JSON.stringify('development'),'import.meta.env.VITE_FOVYN_LOCAL_PREVIEW':JSON.stringify('true'),'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:4178/__supabase'),'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify(local.anonKey)},
 plugins:[{name:'one-fovyn-preview',configureServer(server){server.middlewares.use((req,res,next)=>{
 if(req.url?.startsWith('/adam-local.html')){res.statusCode=302;res.setHeader('Location','/');res.end();return;}
 if(req.url?.startsWith('/api/fx')){res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'External FX is disabled in the disposable local preview. Native account balances remain available.'}));return;}
 next();
 });}}],
 server:{host:'127.0.0.1',port:4178,strictPort:true,proxy:{'/__supabase/auth/v1':{target:'http://127.0.0.1:55440',rewrite:path=>path.replace(/^\/__supabase\/auth\/v1/,'')},'/__supabase/rest/v1':{target:'http://127.0.0.1:55441',rewrite:path=>path.replace(/^\/__supabase\/rest\/v1/,'')}}}};
});
