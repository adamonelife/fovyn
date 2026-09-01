import {useState} from 'react';
import HistoryModule from './HistoryModule';
import ReviewsModule from './ReviewsModule';
import {PageContainer,PageHeader,PageTabs} from './ui';

type View='calendar'|'timeline'|'reviews';

export default function HistoryHub(){
  const[view,setView]=useState<View>('calendar');
  const[range,setRange]=useState(30);
  return <PageContainer className="history-shell">
    <PageHeader eyebrow="HISTORY" title="The shape of your days." action={
      <select className="history-range" value={range} onChange={event=>setRange(Number(event.target.value))} aria-label="History date range">
        <option value={7}>Last 7 Days</option>
        <option value={30}>Last 30 Days</option>
        <option value={90}>Last 90 Days</option>
        <option value={0}>All History</option>
      </select>
    }/>
    <PageTabs>{(['calendar','timeline','reviews'] as View[]).map(item=><button type="button" className={view===item?'active':''} onClick={()=>setView(item)} key={item}>{item[0].toUpperCase()+item.slice(1)}</button>)}</PageTabs>
    {view==='reviews'?<ReviewsModule/>:<HistoryModule range={range} mode={view}/>}
  </PageContainer>;
}
