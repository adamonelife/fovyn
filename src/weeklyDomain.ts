export type WeeklyCategory = { key: string; name: string; target: number; maximum: number; unit: string; kind: 'time' | 'count' };
export const weeklyDefaults: WeeklyCategory[] = [
  {key:'gym',name:'Gym',target:4,maximum:7,unit:'sessions',kind:'count'},
  {key:'mobility',name:'Mobility / Rehab',target:7,maximum:10,unit:'sessions',kind:'count'},
  {key:'reading',name:'Reading',target:7,maximum:12,unit:'hours',kind:'time'},
  {key:'piano',name:'Piano',target:3,maximum:10,unit:'hours',kind:'time'},
  {key:'social',name:'Social',target:2,maximum:7,unit:'occasions',kind:'count'},
  {key:'ps5',name:'PS5',target:5,maximum:12,unit:'hours',kind:'time'},
  {key:'nads',name:'NADS',target:6,maximum:12,unit:'hours',kind:'time'},
];
export const baliDate=(date:Date|string=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
export function shiftDate(date:string,days:number){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export function monday(date:string){return shiftDate(date,-((new Date(`${date}T12:00:00Z`).getUTCDay()+6)%7))}
export const weekStart=(date:Date|string=new Date())=>monday(baliDate(date));
export const baliTimestamp=(date:string)=>new Date(`${date}T00:00:00+08:00`).toISOString();
export type WeeklyEntry={id:string;category_key:string;amount:number;occurred_at:string;book_id:string|null;medium:'reading'|'audiobook'|null};
export type TrainingWeekEntry={id:string;performed_on:string;session_type:string|null};
export function weeklyTotal(category:WeeklyCategory,entries:WeeklyEntry[],training:TrainingWeekEntry[],existing:WeeklyEntry[]=[]){
 const manual=entries.filter(e=>e.category_key===category.key);
 const source=training.filter(e=>category.key==='gym'?e.session_type!=='rehab':category.key==='mobility'?e.session_type==='rehab':false);
 // Workout/rehab records are authoritative. A manual session is a fallback on days without a corresponding detailed record.
 const days=new Set(source.map(e=>e.performed_on));
 const integrated=existing.filter(e=>e.category_key===category.key);
 const total=manual.filter(e=>!days.has(baliDate(e.occurred_at))).reduce((sum,e)=>sum+Number(e.amount),0)+source.length+integrated.reduce((sum,e)=>sum+Number(e.amount),0);
 return category.kind==='time'&&category.unit==='hours'?total/60:total;
}
export const presets=(category:WeeklyCategory)=>category.kind==='count'?[1]:category.key==='reading'?[15,30,45,60]:category.key==='nads'?[60,120]:[30,60];
export const displayAmount=(value:number)=>Number(value.toFixed(2)).toString();
export function metricCategory(name:string,unit:string|null){const key=name.trim().toLowerCase();return ['reading','piano','ps5','nads'].includes(key)&&['min','minute','minutes','h','hr','hours'].includes(unit??'')?key:null}
export function validateCategory(c:WeeklyCategory){if(!c.name.trim()||!c.unit.trim()||!Number.isFinite(c.target)||!Number.isFinite(c.maximum)||c.target<=0||c.maximum<c.target)throw new Error('Enter a name, unit, positive target and a display maximum at least as large as the target.');}
export type GoalVersion={effective_week:string;categories:WeeklyCategory[]};
export function categoriesForWeek(versions:GoalVersion[],week:string){return [...versions].filter(v=>v.effective_week<=week).sort((a,b)=>b.effective_week.localeCompare(a.effective_week))[0]?.categories??weeklyDefaults;}
