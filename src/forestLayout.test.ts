import {describe,expect,it} from 'vitest';
import {canonicalNurseryGoals,forestAssignmentDebug,forestAssignments,forestEnvironmentSlots,nurseryAssignments,nurserySlots} from './forestLayout';

const goal=(id:string,stage:number,status='active')=>({id,tree_stage:stage,status} as never);

describe('canonical Nursery layout',()=>{
  it('has one unique slot for every visible Nursery bed',()=>{
    expect(nurserySlots).toHaveLength(7);
    expect(new Set(nurserySlots.map(slot=>slot.id)).size).toBe(7);
  });

  it('uses one canonical Tree filter',()=>{
    const goals=[goal('a',1),goal('b',3),goal('c',4),goal('d',2,'dormant'),goal('e',2,'completed')];
    expect(canonicalNurseryGoals(goals).map(item=>item.id)).toEqual(['a','b']);
  });

  it('assigns five Trees to five stable distinct beds',()=>{
    const goals=['a','b','c','d','e'].map(id=>goal(id,2));
    const first=nurseryAssignments(goals),again=nurseryAssignments([...goals].reverse());
    expect(first).toHaveLength(5);
    expect(first.map(item=>item.goal.id)).toEqual(again.map(item=>item.goal.id));
    expect(new Set(first.map(item=>item.slot.id)).size).toBe(5);
    expect(first.every(item=>item.page===0)).toBe(true);
    expect(forestAssignmentDebug('nursery',first).every(item=>item.visibility&&item.anchor_x>=0&&item.anchor_y>=0)).toBe(true);
  });

  it('paginates only after every visible bed is occupied',()=>{
    const assignments=nurseryAssignments(Array.from({length:8},(_,index)=>goal(String(index),1)));
    expect(assignments.filter(item=>item.page===0)).toHaveLength(7);
    expect(assignments.filter(item=>item.page===1)).toHaveLength(1);
    for(const page of new Set(assignments.map(item=>item.page))){
      const pageAssignments=assignments.filter(item=>item.page===page);
      expect(new Set(pageAssignments.map(item=>item.slot.id)).size).toBe(pageAssignments.length);
    }
  });

  it('uses the shared collision-free engine in every production environment',()=>{
    const environments=['clearing','health','mind','self','people','work','wealth','dormant-woods','heartwood'];
    for(const environment of environments){
      const capacity=forestEnvironmentSlots[environment].length;
      const assignments=forestAssignments(environment,Array.from({length:capacity},(_,index)=>goal(`${environment}-${index}`,8)));
      expect(new Set(assignments.map(item=>item.slot.id)).size).toBe(capacity);
      expect(assignments.every(item=>item.page===0)).toBe(true);
    }
  });

  it('keeps shared placement stable through refresh-order changes',()=>{
    const goals=['one','two','three'].map(id=>goal(id,12));
    expect(forestAssignments('heartwood',goals).map(item=>[item.goal.id,item.slot.id])).toEqual(forestAssignments('heartwood',[...goals].reverse()).map(item=>[item.goal.id,item.slot.id]));
  });

  it('exposes auditable placement data for every assigned Tree',()=>{
    const rows=forestAssignmentDebug('nursery',nurseryAssignments([goal('audit-tree',2)]));
    expect(rows[0]).toMatchObject({goal_id:'audit-tree',tree_stage:2,environment:'nursery',visibility:true,page:0});
    expect(rows[0].slot_id).toMatch(/^nursery_slot_/);
  });
});
