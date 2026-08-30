import {Area, DaysPresentWildlife, eligibleDaysPresentWildlife, stablePlacementSeed} from './domain';
export type WaterStage='Spring'|'Pond'|'Stream'|'Established Stream'|'Rock Pools / Cascades'|'Waterfall';
export type SolarState='Pre-dawn'|'Sunrise'|'Morning'|'Midday'|'Afternoon'|'Golden hour'|'Sunset'|'Twilight'|'Night';
export type WeatherState='Clear'|'Partly Cloudy'|'Overcast'|'Mist'|'Light Rain'|'Forest Rain'|'Heavy Rain'|'Post-Rain'|'Wind'|'Still'|'Snow'|'Storm';
export type ForestState={forestSeed:string;daysBuilt:number;longestDaysPresent:number;permanentWildlife:DaysPresentWildlife[];area:Area|'Overview';sessionStartedAt:string};
export type Environment={waterStage:WaterStage;vegetationStage:number;solarState:SolarState;weather:WeatherState;sessionSeed:number;eligibleWildlife:DaysPresentWildlife[]};
const waterStages:WaterStage[]=['Spring','Pond','Stream','Established Stream','Rock Pools / Cascades','Waterfall'];
export function waterStageForDaysBuilt(days:number){return waterStages[Math.min(waterStages.length-1,Math.floor(days/50))]}
export function vegetationStageForDaysBuilt(days:number){return Math.min(7,Math.floor(days/35))}
export function solarStateForHour(hour:number):SolarState{if(hour<5)return'Night';if(hour<6)return'Pre-dawn';if(hour<7)return'Sunrise';if(hour<11)return'Morning';if(hour<14)return'Midday';if(hour<17)return'Afternoon';if(hour<18)return'Golden hour';if(hour<19)return'Sunset';if(hour<20)return'Twilight';return'Night'}
export function mergePermanentUnlocks(existing:DaysPresentWildlife[],longestStreak:number){return [...new Set([...existing,...eligibleDaysPresentWildlife(longestStreak)])] as DaysPresentWildlife[]}
export function environmentSessionKey(userId:string,date:Date,windowHours=4){const bucket=Math.floor(date.getTime()/(windowHours*3600000));return `${userId}:${bucket}`}
export function deterministicWeather(sessionKey:string):WeatherState{const weather:WeatherState[]=['Clear','Partly Cloudy','Mist','Still','Post-Rain','Light Rain'];return weather[stablePlacementSeed(sessionKey)%weather.length]}
export function deriveEnvironment(state:ForestState,now:Date):Environment{const key=environmentSessionKey(state.forestSeed,now);return {waterStage:waterStageForDaysBuilt(state.daysBuilt),vegetationStage:vegetationStageForDaysBuilt(state.daysBuilt),solarState:solarStateForHour(now.getHours()),weather:deterministicWeather(key),sessionSeed:stablePlacementSeed(key),eligibleWildlife:mergePermanentUnlocks(state.permanentWildlife,state.longestDaysPresent)}}
export function encounterEligible(environment:Environment,species:DaysPresentWildlife,probabilityPercent:number){if(!environment.eligibleWildlife.includes(species))return false;return environment.sessionSeed%10000<probabilityPercent*100}
export type DormancyPeriod={dormant_from:string;awakened_at:string|null};
export function eligibleActiveMilliseconds(createdAt:string,asOf:string,periods:DormancyPeriod[]){const start=new Date(createdAt).getTime(),end=new Date(asOf).getTime();if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 0;const dormant=periods.reduce((total,period)=>{const from=Math.max(start,new Date(period.dormant_from).getTime()),until=Math.min(end,period.awakened_at?new Date(period.awakened_at).getTime():end);return total+Math.max(0,until-from)},0);return Math.max(0,end-start-dormant)}
