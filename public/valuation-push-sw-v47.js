/* Khashuri Marketplace · Valuation CRM Push V47 */
'use strict';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const title = payload.title || 'Khashuri Marketplace';
  const options = {
    body: payload.body || '',
    data,
    tag: data.notification_id || payload.tag || undefined,
    renotify: false,
    requireInteraction: data.type === 'valuation_crm_lead' || data.type === 'valuation_crm_followup'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function targetUrl(data) {
  if (data && data.entity_type === 'valuation_lead' && data.entity_id) {
    return '/valuation/crm?lead=' + encodeURIComponent(data.entity_id);
  }
  if (data && String(data.type || '').startsWith('valuation_crm')) return '/valuation/crm';
  return '/';
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(targetUrl(event.notification.data || {}), self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        const current = new URL(client.url);
        if (current.origin === self.location.origin) {
          await client.focus();
          if ('navigate' in client) await client.navigate(url);
          return;
        }
      } catch (_) {}
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
