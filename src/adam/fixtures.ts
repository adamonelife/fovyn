import type { TodayReader } from './todayRepository';
const viewer = { ownerId: 'synthetic-adam', context: 'test' as const, timezone: 'Asia/Makassar' };
const owned = { owner_id: viewer.ownerId, is_test: true };
export const previewInstant = new Date('2026-11-02T04:00:00Z');
export const fixtureReader: TodayReader = {
  viewer: async () => ({ ...viewer }),
  goals: async () => [
    { ...owned, id: 'g-health', title: 'Build a dependable recovery routine', area: 'health', ends_on: '2027-12-31' },
    { ...owned, id: 'g-career', title: 'Develop a stronger professional portfolio', area: 'career', ends_on: '2027-12-31' },
    { ...owned, id: 'g-venture', title: 'Test one useful venture idea', area: 'ventures', ends_on: '2027-12-31' },
  ],
  schedules: async scope => [
    { ...owned, id: 's-career', title: 'Outline a portfolio case study', date: scope.date, time: '09:00', area: 'career' },
    { ...owned, id: 's-health', title: 'Follow the planned recovery session', date: scope.date, time: '17:30', area: 'health' },
    { ...owned, id: 's-life', title: 'Close the day with a short reflection', date: scope.date, time: '20:30', area: 'life' },
  ],
  records: async () => [], nutrition: async () => [],
};
