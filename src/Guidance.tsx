import{useEffect,useState,type ReactNode}from'react';
import{CircleHelp,Leaf}from'lucide-react';
import{Button,IconButton,Modal}from'./ui';
import{guidanceRegistry,type GuidanceFeature}from'./guidanceRegistry';
import{finishGuidance,hasSeenGuidance,recordGuidanceEvent}from'./guidanceRepository';

export default function Guidance({feature,children}:{feature:GuidanceFeature;children:ReactNode}){
 const definition=guidanceRegistry[feature],[open,setOpen]=useState(false),[replay,setReplay]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;if(!definition.enabled)return;hasSeenGuidance(definition).then(seen=>{if(active&&!seen){setOpen(true);recordGuidanceEvent(definition,'guidance_shown')}}).catch(()=>{});return()=>{active=false}},[definition]);
 const close=async(dismissed:boolean)=>{setError('');try{if(!replay)await finishGuidance(definition,dismissed);setOpen(false);setReplay(false)}catch(reason){setError(reason instanceof Error?reason.message:"We couldn't save your Help preference.")}};
 const help=()=>{setReplay(true);setOpen(true);recordGuidanceEvent(definition,'help_reopened')};
 return <div className="guidance-host">{children}{definition.enabled&&<IconButton className="guidance-help" label={`Help with ${definition.title}`} onClick={help}><CircleHelp/></IconButton>}{open&&<Modal eyebrow="HELP" title={definition.title} close={()=>close(true)} footer={<><Button variant="text" onClick={()=>close(true)}>Dismiss</Button><Button variant="primary" onClick={()=>close(false)}>Continue</Button></>}><div className="guidance-copy"><Leaf/><p>{replay?definition.help:definition.intro}</p>{error&&<p className="goal-error">{error}</p>}</div></Modal>}</div>
}
