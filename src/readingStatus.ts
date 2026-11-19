import {baliDate} from './weeklyDomain';
export type ReadingStatus='reading'|'want'|'completed'|'paused'|'unspecified';
export type StatusSnapshot={status:ReadingStatus;completion_date?:string|null;status_before_completion?:Exclude<ReadingStatus,'completed'>|null;status_revision?:number};
export type StatusPatch={status:ReadingStatus;completion_date:string|null;status_before_completion:Exclude<ReadingStatus,'completed'>|null};
export type StatusAction={label:string;next:ReadingStatus;primary?:boolean};
export const snapshotStatus=(book:StatusSnapshot):StatusPatch=>({status:book.status,completion_date:book.completion_date??null,status_before_completion:book.status_before_completion??null});
export function statusPatch(book:StatusSnapshot,next:ReadingStatus,day=baliDate()):StatusPatch{
 if(next===book.status)return snapshotStatus(book);
 if(next==='completed')return{status:next,completion_date:day,status_before_completion:book.status as Exclude<ReadingStatus,'completed'>};
 return{status:next,completion_date:null,status_before_completion:null};
}
export function statusActions(book:StatusSnapshot):StatusAction[]{
 switch(book.status){
  case 'want':return [{label:'Start reading',next:'reading'},{label:'Finished',next:'completed',primary:true}];
  case 'reading':return [{label:'Finished',next:'completed',primary:true},{label:'Pause',next:'paused'}];
  case 'paused':return [{label:'Resume',next:'reading'},{label:'Finished',next:'completed',primary:true},{label:'Move to TBR',next:'want'}];
  case 'unspecified':return [{label:'Add to TBR',next:'want'},{label:'Start reading',next:'reading'},{label:'Finished',next:'completed',primary:true}];
  case 'completed':{const next=book.status_before_completion??'want';const label=next==='reading'?'Return to reading':next==='paused'?'Return to paused':next==='unspecified'?'Revert to unknown':'Move to TBR';return[{label,next}]}
 }
}
export const applyOptimisticStatus=<T extends StatusSnapshot>(book:T,patch:StatusPatch):T=>({...book,...patch,status_revision:(book.status_revision??0)+1});

export const statusConfirmed=(current:StatusSnapshot,patch:StatusPatch,priorRevision:number)=>current.status===patch.status&&(current.completion_date??null)===patch.completion_date&&(current.status_before_completion??null)===patch.status_before_completion&&current.status_revision===priorRevision+1;
