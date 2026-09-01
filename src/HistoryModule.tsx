import {useEffect,useMemo,useState} from 'react';
import {Activity,CalendarDays,Check,ChevronLeft,ChevronRight,Plus,X} from 'lucide-react';
import {loadHistory,type HistoryData} from './historyRepository';
import TrainingHistorySheet from './TrainingHistorySheet';
import {LogEmptyState} from './ui';

export type CalendarCell={key:string;day:number;currentMonth:boolean};
export function calendarMonthGrid(month:Date):CalendarCell[]{
  const year=month.getFullYear(),monthIndex=month.getMonth(),first=new Date(year,monthIndex,1),offset=(first.getDay()+6)%7,start=new Date(year,monthIndex,1-offset);
  return Array.from({length:42},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+index);return{key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,day:date.getDate(),currentMonth:date.getMonth()===monthIndex}});
}
const dayGroups:[HistoryData['items'][number]['kind'][],string][]=[[['record'],'Body & Metrics'],[['sleep'],'Sleep'],[['nutrition'],'Nutrition'],[['activity'],'Activity'],[['training'],'Training'],[['habit'],'Habits & Routines'],[['money'],'Money'],[['hobby'],'Hobbies'],[['note'],'Notes']];
const shiftMonth=(month:Date,amount:number)=>new Date(month.getFullYear(),month.getMonth()+amount,1);
const todayKey=()=>{const date=new Date();return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`};
export const canBackdateHistory=(key:string,today=todayKey())=>{const current=new Date(`${today}T12:00:00`),day=new Date(`${key}T12:00:00`),difference=Math.round((current.getTime()-day.getTime())/86400000);return difference>=0&&difference<=7};

export default function HistoryModule({range=30,mode='calendar',openLog}:{range?:number;mode?:'calendar'|'timeline';openLog:()=>void}){
  const[data,setData]=useState<HistoryData>();
  const[error,setError]=useState('');
  const[selectedTraining,setSelectedTraining]=useState<string>();
  const[month,setMonth]=useState(()=>{const date=new Date();return new Date(date.getFullYear(),date.getMonth(),1)});
  const[selectedDay,setSelectedDay]=useState<string>();
  const reload=()=>{setData(undefined);setError('');loadHistory(mode==='calendar'?0:range).then(setData).catch(reason=>setError(reason instanceof Error?reason.message:'Unable to load History'))};
  useEffect(reload,[range,mode]);
  const visible=useMemo(()=>data?.items.filter(item=>mode==='calendar'||item.corrected||item.goalNames.length>0)??[],[data,mode]);
  const groups=useMemo(()=>visible.reduce<Record<string,HistoryData['items']>>((all,item)=>{const day=item.occurredAt.slice(0,10);(all[day]??=[]).push(item);return all},{}),[visible]);
  if(error)return <div className="history-loading">{error}</div>;
  if(!data)return <div className="history-loading">Loading History…</div>;
  if(mode==='calendar'){
    const cells=calendarMonthGrid(month),recordedDays=new Set(data.items.map(item=>item.occurredAt.slice(0,10))),selectedItems=selectedDay?data.items.filter(item=>item.occurredAt.slice(0,10)===selectedDay):[];
    return <div className="history-calendar"><header className="calendar-toolbar"><button aria-label="Previous month" onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronLeft/></button><h2>{month.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h2><button aria-label="Next month" onClick={()=>setMonth(shiftMonth(month,1))}><ChevronRight/></button></header><div className="calendar-weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span key={day}>{day}</span>)}</div><div className="calendar-month-grid">{cells.map(cell=><button className={`${cell.currentMonth?'':'outside'} ${cell.key===todayKey()?'today':''} ${cell.key===selectedDay?'selected':''}`} aria-label={new Date(`${cell.key}T12:00:00`).toLocaleDateString()} onClick={()=>{setSelectedDay(cell.key);if(!cell.currentMonth)setMonth(new Date(`${cell.key}T12:00:00`))}} key={cell.key}><b>{cell.day}</b>{recordedDays.has(cell.key)&&<i aria-label="Recorded information"/>}</button>)}</div>{selectedDay&&<section className="calendar-day-view" aria-label="Day View"><header><div><p className="eyebrow">DAY VIEW</p><h2>{new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h2></div><div>{canBackdateHistory(selectedDay)&&<button className="soft-button" onClick={openLog}><Plus/> Log</button>}<button className="calendar-day-close" aria-label="Close Day View" onClick={()=>setSelectedDay(undefined)}><X/></button></div></header>{dayGroups.map(([kinds,label])=>{const items=selectedItems.filter(item=>kinds.includes(item.kind));return items.length?<section key={label}><h3>{label}</h3>{items.map(item=><button className="calendar-record" onClick={()=>item.kind==='training'?setSelectedTraining(item.id):openLog()} key={`${item.kind}-${item.id}`}><span className={`record-icon ${item.kind}`}><Activity/></span><span><b>{item.title}</b><small>{item.detail}{item.corrected?' · Corrected':''}</small></span><time>{new Date(item.occurredAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</time><ChevronRight/></button>)}</section>:null})}{!selectedItems.length&&<LogEmptyState icon={<CalendarDays/>} title="No records for this day" detail={canBackdateHistory(selectedDay)?'You can add a factual record using Log.':'Nothing was recorded.'}/>}</section>}{selectedTraining&&<TrainingHistorySheet id={selectedTraining} close={()=>setSelectedTraining(undefined)} saved={()=>{setSelectedTraining(undefined);reload()}}/>}</div>;
  }
  return <div className={`history-content history-${mode}`}>
    <section className="history-facts" aria-label="History facts"><div><b>{data.items.length}</b><span>Entries</span></div><div><b>{data.contributions}</b><span>Goal Contributions</span></div></section>
    <div className="timeline">{Object.entries(groups).map(([date,items])=><section className="day-group" key={date}>
      <header><div><b>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:'long'})}</b><span>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})}</span></div></header>
      {items.map(item=><article className={`history-row ${item.kind==='training'?'history-openable':''}`} onClick={()=>item.kind==='training'&&setSelectedTraining(item.id)} key={`${item.kind}-${item.id}`}><span className={`record-icon ${item.kind}`}><Activity/></span><div><b>{item.title}</b><small>{item.detail}{item.corrected?' · Corrected':''}</small></div><div className="linked-goals">{item.goalNames.map(goal=><span key={goal}>{goal}</span>)}</div><time>{item.kind==='training'?'Open':new Date(item.occurredAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</time></article>)}
    </section>)}
    {!visible.length&&<LogEmptyState icon={<Check/>} title="No meaningful changes in this period"/>}
    </div>{selectedTraining&&<TrainingHistorySheet id={selectedTraining} close={()=>setSelectedTraining(undefined)} saved={()=>{setSelectedTraining(undefined);reload()}}/>}
  </div>;
}
