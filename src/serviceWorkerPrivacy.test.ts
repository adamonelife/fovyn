import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const deleted = vi.fn(async () => true);
  const fetcher = vi.fn();
  const put = vi.fn();
  const cache = { put, addAll: vi.fn() };
  runInNewContext(source, { URL, Response, self: { location: { origin: 'https://app.test' }, addEventListener: (name: string, handler: any) => { handlers[name] = handler; }, clients: { claim: vi.fn() }, skipWaiting: vi.fn() }, fetch: fetcher, caches: { keys: async () => ['fovyn-v8-alpha-nursery-recovery', 'another-app-cache'], delete: deleted, open: async () => cache, match: vi.fn() } });
  return { handlers, deleted, fetcher, put };
}
describe('static-only service worker', () => {
  it.each(['https://project.supabase.co/rest/v1/profiles', 'https://app.test/api/fx', 'https://app.test/auth/callback?code=private', 'https://app.test/storage/v1/object/private/file', 'https://app.test/assets/app.js?token=private'])('never intercepts private/dynamic request %s', url => {
    const { handlers } = worker(); const respondWith = vi.fn(); handlers.fetch({ request: new Request(url), respondWith }); expect(respondWith).not.toHaveBeenCalled();
  });
  it('does not intercept even static URLs carrying authorization', () => {
    const { handlers } = worker(); const respondWith = vi.fn(); handlers.fetch({ request: new Request('https://app.test/assets/app.js', { headers: { Authorization: 'Bearer synthetic' } }), respondWith }); expect(respondWith).not.toHaveBeenCalled();
  });
  it('removes only obsolete Fovyn caches on activation', async () => {
    const { handlers, deleted } = worker(); let activation: Promise<unknown> | undefined; handlers.activate({ waitUntil: (p: Promise<unknown>) => { activation = p; } }); await activation; expect(deleted.mock.calls).toEqual([['fovyn-v8-alpha-nursery-recovery']]);
  });
  it('does not cache a private response at an otherwise cacheable path', async () => {
    const { handlers, fetcher, put } = worker(); const response = new Response('private', { headers: { 'Cache-Control': 'private, no-store' } }); Object.defineProperty(response, 'type', { value: 'basic' }); fetcher.mockResolvedValue(response); let pending: Promise<Response> | undefined; handlers.fetch({ request: new Request('https://app.test/assets/app.js'), respondWith: (p: Promise<Response>) => { pending = p; }, waitUntil: vi.fn() }); await pending; expect(put).not.toHaveBeenCalled();
  });
  it('preserves static offline assets while avoiding HTML fallbacks for scripts', async () => {
    const { handlers, fetcher } = worker(); fetcher.mockRejectedValue(new Error('offline')); let pending: Promise<Response> | undefined; handlers.fetch({ request: new Request('https://app.test/assets/missing.js'), respondWith: (p: Promise<Response>) => { pending = p; } }); expect((await pending)?.status).toBe(503);
  });
});

it('caches a successful public static asset and serves its response', async () => {
  const { handlers, fetcher, put } = worker(); const response = new Response('static javascript'); Object.defineProperty(response, 'type', { value: 'basic' }); fetcher.mockResolvedValue(response);
  let pending: Promise<Response> | undefined; const writes: Promise<unknown>[] = [];
  handlers.fetch({ request: new Request('https://app.test/assets/app.js'), respondWith: (p: Promise<Response>) => { pending = p; }, waitUntil: (p: Promise<unknown>) => writes.push(p) });
  expect(await (await pending)?.text()).toBe('static javascript'); await Promise.all(writes); expect(put).toHaveBeenCalledTimes(1);
});
