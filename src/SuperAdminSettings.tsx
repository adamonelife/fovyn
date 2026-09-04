import {useState} from 'react';
import {FlaskConical,RotateCcw,Trash2} from 'lucide-react';
import {clearTestData,getDataContext,setDataContext,type DataContext} from './testMode';
import {resetGuidance} from './guidanceRepository';

export default function SuperAdminSettings({allowed}:{allowed:boolean}){
  const[context,setContextState]=useState<DataContext>(getDataContext()),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  if(!allowed)return null;
  const toggle=()=>{const next=context==='test'?'real':'test';setDataContext(next);setContextState(next);location.reload()};
  const clear=async()=>{if(!confirm('Clear all Test data? This cannot be undone. Your real records will remain untouched.'))return;setBusy(true);setNotice('');try{await clearTestData();setNotice('Test data cleared. Your real records were not changed.')}catch(error){setNotice(error instanceof Error?error.message:'Test data could not be cleared.')}finally{setBusy(false)}};
  const resetTutorials=async()=>{setBusy(true);setNotice('');try{await resetGuidance();setNotice('All Test tutorials reset. Open a feature to preview its introduction.')}catch(error){setNotice(error instanceof Error?error.message:'Test tutorials could not be reset.')}finally{setBusy(false)}};
  return <div className="page-wrap super-admin-wrap"><section className="settings-panel super-admin-panel"><div className="settings-title"><div><p className="eyebrow">DEVELOPER</p><h2>Super Admin</h2></div><FlaskConical/></div><div className="test-mode-row"><div><b>Test Mode</b><small>Isolated QA records only</small></div><button className={context==='test'?'on':''} role="switch" aria-checked={context==='test'} onClick={toggle}><i/>{context==='test'?'On':'Off'}</button></div><p className="test-context-readout">Current data: <b>{context.toUpperCase()}</b></p>{context==='test'&&<div className="super-admin-actions"><button className="soft-button" disabled={busy} onClick={resetTutorials}><RotateCcw/> Reset All Test Tutorials</button><button className="danger-button" disabled={busy} onClick={clear}><Trash2/> {busy?'Working…':'Clear Test Data'}</button></div>}{notice&&<p className="settings-notice">{notice}</p>}</section></div>;
}
