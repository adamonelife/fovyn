import {useEffect,useState} from 'react';
import {Plus,X} from 'lucide-react';
import {archiveGym,listGymEquipment,loadGymContext,saveGym,saveGymEquipment,type GymEquipment,type GymProfile} from './gymRepository';

export default function GymManager({close}:{close:()=>void}){
 const [gyms,setGyms]=useState<GymProfile[]>([]),[selected,setSelected]=useState(''),[equipment,setEquipment]=useState<GymEquipment[]>([]);
 const [name,setName]=useState(''),[notes,setNotes]=useState(''),[equipmentName,setEquipmentName]=useState(''),[error,setError]=useState('');
 const refresh=async()=>{const x=await loadGymContext();setGyms(x.gyms);setSelected(s=>s||x.selectedGymId||x.gyms[0]?.id||'')};
 useEffect(()=>{refresh().catch(e=>setError(e.message))},[]);
 useEffect(()=>{if(selected)listGymEquipment(selected).then(setEquipment).catch(e=>setError(e.message))},[selected]);
 return <div className="library-modal gym-manager"><section><header><div><p className="eyebrow">TRAINING SETTINGS</p><h2>Gyms & equipment</h2></div><button onClick={close} aria-label="Close gym settings"><X/></button></header>
 {error&&<p className="workout-error">{error}</p>}
 <label>Gym<select value={selected} onChange={e=>setSelected(e.target.value)}>{gyms.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
 <div className="gym-editor"><input value={name} onChange={e=>setName(e.target.value)} placeholder="New gym name"/><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes"/><button className="soft-button" disabled={!name.trim()} onClick={async()=>{try{await saveGym({name,notes});setName('');setNotes('');await refresh()}catch(e:any){setError(e.message)}}}><Plus/> Add gym</button></div>
 {selected&&<><h3>Available equipment</h3><div className="gym-equipment-add"><input value={equipmentName} onChange={e=>setEquipmentName(e.target.value)} placeholder="e.g. Cable station"/><button className="soft-button" disabled={!equipmentName.trim()} onClick={async()=>{try{await saveGymEquipment({gymId:selected,name:equipmentName});setEquipmentName('');setEquipment(await listGymEquipment(selected))}catch(e:any){setError(e.message)}}}>Add</button></div><div className="gym-equipment-list">{equipment.map(x=><span key={x.id}>{x.name}</span>)}</div></>}
 {selected&&gyms.length>1&&<button className="danger-link" onClick={async()=>{await archiveGym(selected);setSelected('');await refresh()}}>Archive selected gym</button>}
 </section></div>
}