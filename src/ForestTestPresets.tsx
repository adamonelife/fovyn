import {useEffect,useState} from 'react';
import {supabase} from './supabase';
import {goalOwner} from './goalsRepository';
import {getDataContext} from './testMode';

type TestGoal={id:string;title:string};
const presets=[
  ['Health · Stage 18 English Oak','health',18,82,'healthy','growing'],
  ['Mind · Stage 27 Coast Redwood','mind',27,92,'thriving','growing'],
  ['Self · Stage 05 Japanese Maple','self',5,75,'healthy','growing'],
  ['People · Stage 14 Cherry Blossom','people',14,58,'needs_water','growing'],
  ['Work · Stage 24 Douglas Fir','work',24,35,'may_need_pruning','growing'],
  ['Wealth · Stage 11 Golden Ginkgo','wealth',11,88,'thriving','growing'],
  ['Nursery · Young Plant','health',3,67,'healthy','nursery'],
  ['Dormant Woods','mind',14,60,'healthy','dormant'],
  ['Heartwood','self',18,85,'thriving','completed'],
] as const;

export default function ForestTestPresets(){
  const[goals,setGoals]=useState<TestGoal[]>([]),[goalId,setGoalId]=useState(''),[notice,setNotice]=useState('');
  useEffect(()=>{if(getDataContext()!=='test')return;goalOwner().then(user=>supabase.from('goals').select('id,title').eq('owner_id',user.id).order('created_at').then(({data})=>{setGoals(data??[]);setGoalId(data?.[0]?.id??'')}))},[]);
  if(getDataContext()!=='test')return <div className="forest-preset-empty"><h2>Test context required</h2><p>Enable Test Mode in Account before creating Forest QA states.</p></div>;
  const apply=async(preset:typeof presets[number])=>{if(!goalId)return;const user=await goalOwner();const[label,area,treeStage,consistency,health,lifecycle]=preset;const{error}=await supabase.from('forest_test_overrides').upsert({owner_id:user.id,goal_id:goalId,area_key:area,tree_stage:treeStage,eligible_days:Math.max(7,treeStage*7),growth_consistency:consistency,health_state:health,lifecycle_state:lifecycle,presentation_priority:'primary',clearing_included:lifecycle==='growing',preset_key:label},{onConflict:'owner_id,goal_id'});setNotice(error?'Preset could not be applied.':`${label} applied.`)};
  return <section className="forest-test-presets"><label>Test Goal<select value={goalId} onChange={event=>setGoalId(event.target.value)}><option value="">Choose a Test Goal</option>{goals.map(goal=><option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label>{!goals.length&&<p>Create a Goal while Test Mode is on, then return here.</p>}<div>{presets.map(preset=><button disabled={!goalId} onClick={()=>void apply(preset)} key={preset[0]}><b>{preset[0]}</b><small>{preset[5]} · {preset[4].replaceAll('_',' ')}</small></button>)}</div>{notice&&<p>{notice}</p>}</section>;
}
