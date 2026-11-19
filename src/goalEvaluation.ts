export type GoalOperator='minimum'|'maximum'|'exact'|'range';
export type EvaluationState='open'|'success'|'failed';
export type EvaluationDecision={state:EvaluationState;conclusive:boolean};

export function decideGoalEvaluation(operator:GoalOperator,actual:number,min:number,max:number|null,periodEnded:boolean):EvaluationDecision{
  if(operator==='minimum')return actual>=min?{state:'success',conclusive:true}:periodEnded?{state:'failed',conclusive:true}:{state:'open',conclusive:false};
  if(operator==='maximum')return actual>min?{state:'failed',conclusive:true}:periodEnded?{state:'success',conclusive:true}:{state:'open',conclusive:false};
  if(operator==='exact')return actual>min?{state:'failed',conclusive:true}:periodEnded?{state:actual===min?'success':'failed',conclusive:true}:{state:'open',conclusive:false};
  if(max===null)throw new Error('Range evaluation requires an upper bound.');
  if(actual>max)return{state:'failed',conclusive:true};
  return periodEnded?{state:actual>=min?'success':'failed',conclusive:true}:{state:'open',conclusive:false};
}

export function anchoredPeriod(start:string,occurrence:string,days:number){
  if(days<1)throw new Error('Period length must be positive.');
  const day=86_400_000,startAt=Date.parse(`${start}T12:00:00Z`),occursAt=Date.parse(`${occurrence}T12:00:00Z`);
  const cycle=Math.max(0,Math.floor((occursAt-startAt)/day/days)),periodStart=new Date(startAt+cycle*days*day),periodEnd=new Date(startAt+(cycle*days+days-1)*day);
  return{start:periodStart.toISOString().slice(0,10),end:periodEnd.toISOString().slice(0,10)};
}

// Local specification of finite-goal bounds. This is not a replacement for the
// hosted SQL function and does not execute/replay historical evaluations.
export function boundedEvaluationPeriod(start: string, occurrence: string, days: number, endsOn: string | null) {
  for (const date of [start, occurrence, ...(endsOn ? [endsOn] : [])]) {
    const parsed = new Date(`${date}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Invalid goal date.');
  }
  if (!Number.isInteger(days) || days < 1) throw new Error('Period length must be a positive integer.');
  if (occurrence < start || (endsOn !== null && endsOn < start)) return null;
  const effective = endsOn !== null && occurrence > endsOn ? endsOn : occurrence;
  const bounds = anchoredPeriod(start, effective, days);
  return { start: bounds.start, end: endsOn !== null && bounds.end > endsOn ? endsOn : bounds.end };
}
