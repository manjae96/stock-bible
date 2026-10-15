/* 서비스 워커: 앱 파일을 저장해 두고 인터넷이 없어도 열리게 한다.
   콘텐츠나 코드를 고친 뒤 배포할 때는 VERSION 숫자를 올려야 사용자 기기에 새 버전이 반영된다. */
const VERSION = 'sb-v0.1.0';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './js/core/util.js', './js/core/store.js', './js/core/rng.js', './js/core/synth.js', './js/core/chart.js', './js/core/stats.js',
  './js/providers/registry.js',
  './js/content/meta.js', './js/content/terms.js', './js/content/patterns.js', './js/content/practice.js', './js/content/lessons.js',
  './js/views/common.js', './js/views/home.js', './js/views/terms.js', './js/views/patterns.js', './js/views/practice.js',
  './js/views/quiz.js', './js/views/company.js', './js/views/risk.js', './js/views/stats.js', './js/views/explore.js', './js/views/me.js',
  './js/app.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 글꼴(Google Fonts)은 받아본 것을 저장해 두고 재사용
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(VERSION + '-fonts').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; } catch (err) { return hit || Response.error(); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // 앱 파일: 저장본 먼저, 없으면 네트워크
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => caches.match('./index.html'))));
});
