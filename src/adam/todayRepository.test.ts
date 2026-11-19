import { describe, expect, it, vi } from 'vitest';
import { fixtureReader, previewInstant } from './fixtures';
import { loadToday, type TodayReader } from './todayRepository';
import { adamPresentation, availableWorkspaces, legacyPresentation } from './presentation';
const meal = { id: 'meal', owner_id: 'synthetic-adam', is_test: true, occurred_on: '2026-11-02', calories: 0, protein_g: null, deleted_at: null };
describe('read-only Today boundary', () => {
  it('loads through read methods only and uses the viewer’s local day', async () => {
    const data = await loadToday(fixtureReader, new Date('2026-11-01T20:00:00Z'));
    expect(data.date).toBe('2026-11-02'); expect(data.scheduled).toHaveLength(3); expect(data.nutrition).toEqual({ entries: 0, calories: null, protein: null, completeness: 'missing' });
  });
  it('distinguishes genuine zero from unknown nutrients', async () => {
    const data = await loadToday({ ...fixtureReader, nutrition: async () => [meal] }, previewInstant); expect(data.nutrition.calories).toBe(0); expect(data.nutrition.protein).toBeNull();
  });
  it.each([{ owner_id: 'another-user' }, { is_test: false }])('rejects cross-owner/context children %s', async override => {
    await expect(loadToday({ ...fixtureReader, nutrition: async () => [{ ...meal, ...override }] }, previewInstant)).rejects.toThrow('another account or data context');
  });
  it('does not count deleted or other-day records', async () => {
    const data = await loadToday({ ...fixtureReader, nutrition: async () => [{ ...meal, deleted_at: '2026-11-02T01:00Z' }, { ...meal, occurred_on: '2026-11-01' }] }, previewInstant); expect(data.nutrition.entries).toBe(0);
  });
  it('fails closed if identity or context changes while reading', async () => {
    const viewer = vi.fn().mockResolvedValueOnce({ ownerId: 'synthetic-adam', context: 'test', timezone: 'Asia/Makassar' }).mockResolvedValueOnce({ ownerId: 'synthetic-adam', context: 'real', timezone: 'Asia/Makassar' });
    await expect(loadToday({ ...fixtureReader, viewer }, previewInstant)).rejects.toThrow('changed');
  });
  it('propagates unavailable sources instead of showing zeros', async () => {
    const reader: TodayReader = { ...fixtureReader, nutrition: async () => { throw new Error('Source unavailable'); } }; await expect(loadToday(reader, previewInstant)).rejects.toThrow('Source unavailable');
  });
  it('hides archived entry points by default and restores them without changing core navigation', () => {
    expect(availableWorkspaces(adamPresentation)).not.toContain('Forest'); expect(availableWorkspaces(adamPresentation)).not.toContain('Social'); expect(availableWorkspaces(legacyPresentation)).toEqual([...availableWorkspaces(adamPresentation), 'Forest', 'Social']); expect(adamPresentation.ai).toBe(false);
  });
});
