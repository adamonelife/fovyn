export const CYCLING_FORMULA_VERSION='cycle-duration-intensity-v1';
export function cyclingEquivalentSteps(durationMinutes:number,activeCalories:number|null){
 if(!Number.isFinite(durationMinutes)||durationMinutes<=0)return 0;
 const minutes=Math.min(durationMinutes,180),rate=activeCalories==null?70:activeCalories/Math.max(durationMinutes,1)>=8?100:activeCalories/durationMinutes>=5?85:70;
 return Math.round(minutes*rate);
}
export function combinedActivityEquivalent(actualSteps:number,cyclingSteps:number){return Math.max(0,Math.round(actualSteps))+Math.max(0,Math.round(cyclingSteps))}
export function hours(minutes:number){return Math.round(minutes/6)/10}
export function targetProgress(value:number,target:number,maximum=target*1.3){return{done:value>=target,width:Math.min(100,Math.max(0,value/Math.max(maximum,1)*100)),marker:Math.min(100,target/Math.max(maximum,1)*100)}}
export function sleepDate(endedAt:string){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(endedAt))}
export const HEALTH_FRESH_MINUTES=45;
export function healthSyncAgeMinutes(lastSync:string|null,now=Date.now()){if(!lastSync)return Number.POSITIVE_INFINITY;return Math.max(0,(now-new Date(lastSync).getTime())/60000)}
export function healthSyncFresh(lastSync:string|null,now=Date.now()){return healthSyncAgeMinutes(lastSync,now)<=HEALTH_FRESH_MINUTES}
export function healthSyncLabel(lastSync:string|null,status:string,requestStatus?:string|null,now=Date.now()){
 if(requestStatus==='pending')return 'Sync requested — waiting for the phone';
 if(status==='error')return 'Last sync failed';
 if(!lastSync)return 'Awaiting first device sync';
 if(!healthSyncFresh(lastSync,now))return 'Potentially stale';
 if(status==='no_changes')return 'Current — no new data';
 return 'Current';
}

