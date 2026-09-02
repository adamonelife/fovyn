const CACHE='fovyn-v6-favicon';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/','/brand/forbair-app-icon-charcoal.png','/brand/favicon/favicon-16.png','/brand/favicon/favicon-32.png','/brand/favicon/favicon-48.png']))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(response=>response||caches.match('/'))))});
