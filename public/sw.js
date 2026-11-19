const CACHE = 'fovyn-v9-static-only';
const SHELL = ['/', '/brand/forbair-app-icon-charcoal.png', '/brand/favicon/favicon-16.png', '/brand/favicon/favicon-32.png', '/brand/favicon/favicon-48.png'];
function cacheable(request) {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === self.location.origin && !url.search &&
    !request.headers.has('authorization') &&
    (SHELL.includes(url.pathname) || /^\/assets\/[^/]+\.(?:js|css|woff2?)$/.test(url.pathname));
}
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(
  keys.filter(key => key.startsWith('fovyn-') && key !== CACHE).map(key => caches.delete(key))
)).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  // Private API/auth/Storage/FX requests are never intercepted or cached.
  if (!cacheable(event.request)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && response.type === 'basic' && !/no-store|private/i.test(response.headers.get('cache-control') || '') && !/authorization|cookie/i.test(response.headers.get('vary') || '')) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request, { cacheName: CACHE });
    if (cached) return cached;
    return new Response('Offline. Reconnect to load this resource.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }));
});
