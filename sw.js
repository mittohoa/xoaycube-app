// Service worker của XoayCube (web): chạy được khi mất mạng.
// Có mạng → luôn lấy bản mới (rồi lưu lại); mất mạng → dùng bản đã lưu.
// Không đụng tới yêu cầu tới máy chủ dữ liệu (Supabase) và yêu cầu không phải GET.
const CACHE = 'xoaycube-v1';
const CORE = ['./', 'index.html', 'flutter_bootstrap.js', 'main.dart.js', 'manifest.json',
  'favicon.png', 'icons/Icon-192.png', 'icons/Icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k !== CACHE) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

function cacheable(url) {
  if (url.origin === self.location.origin) return true;
  // Thư viện vẽ của Flutter và phông chữ tải từ máy chủ Google.
  return url.hostname === 'www.gstatic.com' || url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'fonts.googleapis.com';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!cacheable(url)) return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (e) {
      const hit = await caches.match(req, { ignoreSearch: url.pathname.endsWith('version.json') });
      if (hit) return hit;
      // Mở app khi mất mạng: trả trang chính đã lưu.
      if (req.mode === 'navigate') {
        const home = await caches.match('index.html') || await caches.match('./');
        if (home) return home;
      }
      throw e;
    }
  })());
});
