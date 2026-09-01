export function fovynDateKey(timeZone:string,instant=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant);
 const value=(type:Intl.DateTimeFormatPartTypes)=>parts.find(x=>x.type===type)?.value;
 return`${value('year')}-${value('month')}-${value('day')}`;
}
export function shiftDateKey(date:string,days:number){const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10)}
export function dateWeekday(date:string){return new Date(`${date}T12:00:00Z`).getUTCDay()}
function zoneOffset(instant:Date,timeZone:string){const parts=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(instant),value=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find(x=>x.type===type)?.value);return Date.UTC(value('year'),value('month')-1,value('day'),value('hour'),value('minute'),value('second'))-instant.getTime()}
export function fovynDateInstant(date:string,timeZone:string,hour=0){const[y,m,d]=date.split('-').map(Number),target=Date.UTC(y,m-1,d,hour),first=new Date(target-zoneOffset(new Date(target),timeZone));return new Date(target-zoneOffset(first,timeZone))}
export function fovynDateRange(date:string,timeZone:string){return{start:fovynDateInstant(date,timeZone),end:fovynDateInstant(shiftDateKey(date,1),timeZone)}}
export function watchFovynDay(timeZone:string,current:string,onChange:(date:string)=>void,intervalMs=30000){let date=current;const check=()=>{const next=fovynDateKey(timeZone);if(next!==date){date=next;onChange(next)}};const timer=window.setInterval(check,intervalMs);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);return()=>{window.clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check)}}
