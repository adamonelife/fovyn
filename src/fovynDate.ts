export function fovynDateKey(timeZone:string,instant=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant);
 const value=(type:Intl.DateTimeFormatPartTypes)=>parts.find(x=>x.type===type)?.value;
 return`${value('year')}-${value('month')}-${value('day')}`;
}
export function shiftDateKey(date:string,days:number){const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10)}
export function dateWeekday(date:string){return new Date(`${date}T12:00:00Z`).getUTCDay()}
export function watchFovynDay(timeZone:string,current:string,onChange:(date:string)=>void,intervalMs=30000){let date=current;const check=()=>{const next=fovynDateKey(timeZone);if(next!==date){date=next;onChange(next)}};const timer=window.setInterval(check,intervalMs);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);return()=>{window.clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check)}}
