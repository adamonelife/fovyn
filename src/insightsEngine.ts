import type{HistoryItem}from'./historyRepository';
import{formatDisplayLabel}from'./displayLabels';

export type Insight={key:string;eyebrow:string;title:string;detail:string};

export function deriveInsights(items:HistoryItem[]):Insight[]{
  if(!items.length)return[];
  const dates=new Set(items.map(item=>item.occurredAt.slice(0,10))),counts=new Map<string,number>();
  for(const item of items)counts.set(item.kind,(counts.get(item.kind)??0)+1);
  const [mostKind,mostCount]=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
  const insights:Insight[]=[
    {key:'days-present',eyebrow:'DAYS PRESENT',title:`${dates.size} day${dates.size===1?'':'s'} recorded`,detail:`Based on ${items.length} entr${items.length===1?'y':'ies'} in this period.`},
    {key:'most-recorded',eyebrow:'MOST RECORDED',title:formatDisplayLabel(mostKind),detail:`${mostCount} entr${mostCount===1?'y':'ies'} across ${dates.size} recorded day${dates.size===1?'':'s'}.`}
  ];
  const sleeps=items.filter(item=>item.kind==='sleep').map(item=>Number.parseFloat(item.detail)).filter(Number.isFinite);
  if(sleeps.length)insights.push({key:'sleep-average',eyebrow:'SLEEP AVERAGE',title:`${(sleeps.reduce((sum,value)=>sum+value,0)/sleeps.length).toFixed(1)} hours`,detail:`Calculated from ${sleeps.length} sleep entr${sleeps.length===1?'y':'ies'}.`});
  const habits=items.filter(item=>item.kind==='habit'&&item.detail!=='N/A'),completed=habits.filter(item=>item.detail.toLowerCase().startsWith('complete')).length;
  if(habits.length)insights.push({key:'habit-resolution',eyebrow:'HABIT FOLLOW-THROUGH',title:`${Math.round(completed/habits.length*100)}% completed`,detail:`Based on ${habits.length} resolved Habit entr${habits.length===1?'y':'ies'}; N/A and missing are excluded.`});
  return insights;
}
