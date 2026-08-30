export type ModuleKey='habits'|'metrics'|'routines'|'training'|'activity'|'nutrition'|'sleep'|'money'|'hobbies'|'social'|'alcohol'|'medication'|'notes';
export type ModuleDefinition={key:ModuleKey;name:string;description:string;unit?:string;color:string};
export const modules:ModuleDefinition[]=[
 {key:'habits',name:'Habits',description:'Repeatable actions and check-ins',color:'#b8d64b'},
 {key:'metrics',name:'Metrics',description:'Measurements, values and trends',unit:'value',color:'#75a889'},
 {key:'routines',name:'Routines',description:'Grouped steps for your day',color:'#d2ad69'},
 {key:'training',name:'Training',description:'Sessions, exercises, sets and PBs',unit:'session',color:'#c97455'},
 {key:'activity',name:'Physical Activity',description:'Movement beyond structured training',unit:'minutes',color:'#7ea4a0'},
 {key:'nutrition',name:'Nutrition',description:'Meals, calories and macros',unit:'kcal',color:'#9aa75e'},
 {key:'sleep',name:'Sleep',description:'Duration, quality and recovery',unit:'hours',color:'#747eaa'},
 {key:'money',name:'Money',description:'Spending, saving and financial habits',unit:'amount',color:'#65977c'},
 {key:'hobbies',name:'Hobbies',description:'Time spent making and exploring',unit:'minutes',color:'#b7809a'},
 {key:'social',name:'Social',description:'Meaningful time and connection',color:'#c58d73'},
 {key:'alcohol',name:'Alcohol',description:'Private, factual consumption tracking',unit:'drinks',color:'#9c8177'},
 {key:'medication',name:'Supplements & Recovery',description:'Medication, supplements and recovery',color:'#84a29a'},
 {key:'notes',name:'Notes & Journal',description:'Reflections with optional Goal links',color:'#a49d7f'},
];
export type TrackingRecord={id:string;module:ModuleKey;title:string;value:string;occurredAt:string;goalIds:string[];notes?:string;correctedAt?:string};
export const starterRecords:TrackingRecord[]=[
 {id:'r1',module:'training',title:'Upper body',value:'52 minutes',occurredAt:'2026-08-29T16:30:00',goalIds:['goal_move_2026']},
 {id:'r2',module:'sleep',title:'Night sleep',value:'7h 42m · Good',occurredAt:'2026-08-30T07:15:00',goalIds:[]},
 {id:'r3',module:'nutrition',title:'Today',value:'1,840 kcal · P 132g',occurredAt:'2026-08-30T13:00:00',goalIds:[]},
];
export function migrateTrainingData(input:unknown):TrackingRecord[]{if(!Array.isArray(input))return[];return input.flatMap((row,index)=>{if(!row||typeof row!=='object')return[];const item=row as Record<string,unknown>;return [{id:String(item.id??`training-import-${index}`),module:'training' as const,title:String(item.name??item.title??'Training session'),value:String(item.summary??item.duration??'Completed'),occurredAt:String(item.occurred_at??item.date??new Date().toISOString()),goalIds:Array.isArray(item.goal_ids)?item.goal_ids.map(String):[]}]})}
