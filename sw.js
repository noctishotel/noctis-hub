// ══════════════════════════════════════════════════════════════
// NOCTIS HUB — Service Worker v1.0
// Maneja notificaciones de alarmas cuando la app está cerrada
// ══════════════════════════════════════════════════════════════

const SW_VERSION = 'noctis-hub-sw-v1';
const CHECK_INTERVAL_MS = 30000; // cada 30 segundos

// ── IndexedDB helpers ─────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('NoctisHubSW', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('alarms')) {
        db.createObjectStore('alarms', { keyPath: 'swKey' });
      }
      if (!db.objectStoreNames.contains('fired')) {
        db.createObjectStore('fired', { keyPath: 'key' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbClear(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Alarm checking ─────────────────────────────────────────────
async function checkAndFireAlarms() {
  let db;
  try {
    db = await openDB();
    const alarms = await dbGetAll(db, 'alarms');
    const fired  = await dbGetAll(db, 'fired');
    const firedKeys = new Set(fired.map(f => f.key));
    const now = Date.now();

    for (const alarm of alarms) {
      if (alarm.done) continue;
      if (!alarm.alarm_time) continue;

      const alarmMs = new Date(alarm.alarm_time).getTime();
      const diffMs  = alarmMs - now;
      const alarmKey = alarm.swKey; // already set as id + '-' + alarm_time

      // Fire if within next 60s or up to 2 min past
      if (diffMs <= 60000 && diffMs >= -120000 && !firedKeys.has(alarmKey)) {
        // Mark as fired
        await dbPut(db, 'fired', { key: alarmKey, ts: now });
        firedKeys.add(alarmKey);

        // Show notification
        await self.registration.showNotification('🔔 Noctis Hub — ' + alarm.title, {
          body: alarm.note || 'Alarma programada',
          icon: '/noctis-hub/icon-192.png',
          badge: '/noctis-hub/icon-192.png',
          tag: 'alarm-' + alarm.id,
          renotify: true,
          requireInteraction: true,
          data: { alarmId: alarm.id, url: self.location.origin + '/noctis-hub/' }
        });

        // Notify any open clients so they can update their UI
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.postMessage({ type: 'ALARM_FIRED', alarmId: alarm.id, title: alarm.title });
        }
      }

      // Purge fired entries older than 10 minutes to avoid growing indefinitely
      const tenMinAgo = now - 600000;
      for (const f of fired) {
        if (f.ts && f.ts < tenMinAgo) {
          await dbDelete(db, 'fired', f.key);
        }
      }
    }
  } catch (e) {
    console.error('[NoctisHubSW] checkAndFireAlarms error:', e);
  }
}

// ── Periodic alarm check via setInterval (keeps SW alive) ──────
let _intervalId = null;

function startInterval() {
  if (_intervalId) return;
  // Run immediately, then every 30s
  checkAndFireAlarms();
  _intervalId = setInterval(checkAndFireAlarms, CHECK_INTERVAL_MS);
}

// ── SW lifecycle ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.claim().then(() => {
      startInterval();
    })
  );
});

// Keep the SW alive when there are no fetch events by using the interval.
// Chrome may still terminate the SW — we restart the interval on any message.
self.addEventListener('fetch', () => {
  // Intentionally empty — we don't intercept requests.
  // Just having this listener keeps the SW registered.
});

// ── Message handling (from the main app) ───────────────────────
self.addEventListener('message', async event => {
  const { type, alarms } = event.data || {};

  // Re-start the interval on every heartbeat or update (SW may have been suspended)
  if (!_intervalId) startInterval();

  if (type === 'SYNC_ALARMS') {
    // Full sync: replace all alarms in IndexedDB
    try {
      const db = await openDB();
      await dbClear(db, 'alarms');
      for (const alarm of (alarms || [])) {
        await dbPut(db, 'alarms', {
          ...alarm,
          swKey: String(alarm.id) + '-' + alarm.alarm_time
        });
      }
    } catch (e) {
      console.error('[NoctisHubSW] SYNC_ALARMS error:', e);
    }
  }

  if (type === 'HEARTBEAT') {
    // Sent periodically by the app to keep SW alive — no action needed beyond restarting interval
    event.source && event.source.postMessage({ type: 'HEARTBEAT_ACK' });
  }
});

// ── Notification click → focus/open the app ────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.location.origin + '/noctis-hub/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('noctis-hub') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
