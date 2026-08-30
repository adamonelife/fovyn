export type ForbairMode='Standard'|'Recovery'|'Holiday';
export type GoalSet={id:string;name:string;goalIds:string[];startsOn:string;endsOn?:string;status:'active'|'planned'|'completed'};
export type Review={id:string;period:'weekly'|'monthly';startsOn:string;endsOn:string;wins:string[];friction:string[];nextFocus:string};
export const goalSets:GoalSet[]=[{id:'set-autumn',name:'Autumn foundations',goalIds:['goal_move_2026','goal_read_2026','goal_language_2026'],startsOn:'2026-08-24',endsOn:'2026-11-30',status:'active'}];
export const reviews:Review[]=[{id:'review-w35',period:'weekly',startsOn:'2026-08-24',endsOn:'2026-08-30',wins:['Movement stayed consistent','Reading returned to the evening'],friction:['Language practice was easy to postpone'],nextFocus:'Make language practice smaller and earlier.'}];
export function modeExpectationMultiplier(mode:ForbairMode){return mode==='Recovery'?.5:mode==='Holiday'?.25:1}
export function exportPayload(data:Record<string,unknown>){return JSON.stringify({format:'FORBAIR_V1_EXPORT',exportedAt:new Date().toISOString(),...data},null,2)}
