import {describe,expect,it} from 'vitest';
import {GROVE_MEMBER_SELECT,groveErrorMessage} from './grovesRepository';

describe('Groves repository',()=>{
  it('uses the ownership-safe Goal relationship explicitly',()=>{
    expect(GROVE_MEMBER_SELECT).toContain('goals!grove_goals_owned_goal_fk');
    expect(GROVE_MEMBER_SELECT).not.toContain('goals(');
  });

  it('never exposes database relationship terminology to users',()=>{
    const message=groveErrorMessage('load');
    expect(message).toBe("We couldn't load that Grove. Please try again.");
    expect(message).not.toMatch(/PostgREST|Supabase|relationship|foreign key/i);
  });
});
