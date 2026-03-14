const CACHE_NAME = 'noctis-hub-v2';
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (req.url.startsWith(self.location.origin)) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (e) {
      return cached || caches.match('./index.html');
    }
  })());
});

let alarms = [];
let heartbeatTs = Date.now();
let notified = new Set();

function checkAlarms() {
  const now = Date.now();
  alarms.forEach(a => {
    if (!a || a.done || !a.time) return;
    const when = new Date(a.time).getTime();
    if (!Number.isFinite(when)) return;
    if (when <= now && !notified.has(a.id)) {
      notified.add(a.id);
      self.registration.showNotification('Noctis Hub', {
        body: a.title ? `Alarma: ${a.title}` : 'Tienes una alarma pendiente',
        tag: `alarm-${a.id}`,
        renotify: true,
        icon: './icon-192.png',
        badge: './icon-192.png'
      }).catch(() => {});
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'ALARM_FIRED', alarmId: a.id, title: a.title || '' }));
      });
    }
  });
}

setInterval(() => {
  if (Date.now() - heartbeatTs < 60000) checkAlarms();
}, 15000);

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SYNC_ALARMS') {
    alarms = Array.isArray(data.alarms) ? data.alarms : [];
    checkAlarms();
  }
  if (data.type === 'HEARTBEAT') {
    heartbeatTs = Date.now();
    checkAlarms();
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clients.length) {
      const client = clients[0];
      await client.focus();
      client.navigate('./');
      return;
    }
    await self.clients.openWindow('./');
  })());
});
