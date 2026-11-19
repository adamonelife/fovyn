export function validCyclingDistance(value:string|number){const n=Number(value);return Number.isFinite(n)&&n>0&&n<=1000}
export function cyclingDistanceLabel(exerciseType:number,label:string){return exerciseType===9?'Stationary cycling':label||'Cycling'}
export function cyclingDistanceNeeded(exerciseType:number,isCycling:boolean,distance:number|null){return isCycling&&(exerciseType===8||exerciseType===9)&&!(Number(distance)>0)}
