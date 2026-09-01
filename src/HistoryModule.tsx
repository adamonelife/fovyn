import {useEffect,useMemo,useState} from 'react';
import {Activity,Check} from 'lucide-react';
import {loadHistory,type HistoryData} from './historyRepository';
import {LogEmptyState} from './ui';

export default function HistoryModule({range=30,mode='calendar'}:{range?:number;mode?:'calendar'|'timeline'}){
  const[data,setData]=useState<HistoryData>();
  const[error,setError]=useState('');
  useEffect(()=>{setData(undefined);setError('');loadHistory(range).then(setData).catch(reason=>setError(reason instanceof Error?reason.message:'Unable to load History'))},[range]);
  const visible=useMemo(()=>data?.items.filter(item=>mode==='calendar'||item.corrected||item.goalNames.length>0)??[],[data,mode]);
  const groups=useMemo(()=>visible.reduce<Record<string,HistoryData['items']>>((all,item)=>{const day=item.occurredAt.slice(0,10);(all[day]??=[]).push(item);return all},{}),[visible]);
  if(error)return <div className="history-loading">{error}</div>;
  if(!data)return <div className="history-loading">Loading History…</div>;
  return <div className={`history-content history-${mode}`}>
    <section className="history-facts" aria-label="History facts"><div><b>{data.items.length}</b><span>Entries</span></div><div><b>{data.contributions}</b><span>Goal Contributions</span></div></section>
    <div className="timeline">{Object.entries(groups).map(([date,items])=><section className="day-group" key={date}>
      <header><div><b>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:'long'})}</b><span>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})}</span></div></header>
      {items.map(item=><article className="history-row" key={`${item.kind}-${item.id}`}><span className={`record-icon ${item.kind}`}><Activity/></span><div><b>{item.title}</b><small>{item.detail}{item.corrected?' · Corrected':''}</small></div><div className="linked-goals">{item.goalNames.map(goal=><span key={goal}>{goal}</span>)}</div><time>{new Date(item.occurredAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</time></article>)}
    </section>)}
    {!visible.length&&<LogEmptyState icon={<Check/>} title={mode==='timeline'?'No meaningful changes in this period':'No entries in this period'} detail={mode==='calendar'?'Records will appear here after you use Log.':undefined}/>}
    </div>
  </div>;
}
