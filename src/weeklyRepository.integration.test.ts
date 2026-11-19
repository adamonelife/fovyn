import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
describe.skipIf(!process.env.FOVYN_PGLITE_MODULE_PATH)('weekly database migration',()=>{
 it('enforces ownership and context and round-trips reading, edits, and goal versions',async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.FOVYN_PGLITE_MODULE_PATH!).href);const db=new PGlite();
 await db.exec(readFileSync('scripts/planning-test-schema.sql','utf8'));await db.exec(readFileSync('supabase/migrations/20261119020000_weekly_reading.sql','utf8'));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 async function scoped(owner:string,ctx:string,sql:string){await db.exec('begin;set local role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.headers',$2,true)",[owner,JSON.stringify({'x-fovyn-data-context':ctx})]);const r=await db.query(sql);await db.exec('commit');return r.rows}catch(e){await db.exec('rollback');throw e}}
 const book=(await scoped(a,'real',"insert into reading_books(title,author,status) values('Synthetic title','Sample author','reading') returning id"))[0] as {id:string};
 const entry=(await scoped(a,'real',`insert into weekly_activity_entries(category_key,amount,occurred_at,book_id,medium) values('reading',30,now(),'${book.id}','reading') returning id`))[0] as {id:string};
 expect(await scoped(b,'real','select * from weekly_activity_entries')).toHaveLength(0);
 expect(await scoped(a,'test','select * from weekly_activity_entries')).toHaveLength(0);
 await expect(scoped(b,'real',`insert into weekly_activity_entries(category_key,amount,occurred_at,book_id,medium) values('reading',30,now(),'${book.id}','reading')`)).rejects.toThrow();
 await scoped(a,'real',`update weekly_activity_entries set amount=45 where id='${entry.id}'`);
 expect(await scoped(a,'real',`select amount::int from weekly_activity_entries where id='${entry.id}'`)).toEqual([{amount:45}]);
 await scoped(a,'real',"insert into weekly_goal_versions(effective_week,categories) values(date_trunc('week',now() at time zone 'Asia/Makassar')::date+7,'[]')");
 await expect(scoped(a,'real',"insert into weekly_goal_versions(effective_week,categories) values(date_trunc('week',now() at time zone 'Asia/Makassar')::date,'[]')")).rejects.toThrow();
 await scoped(a,'real',`update weekly_activity_entries set deleted_at=now() where id='${entry.id}'`);
 expect(await scoped(a,'real','select * from weekly_activity_entries where deleted_at is null')).toHaveLength(0);
 await db.close();
 },30000);
});
