/* 앱 시작점: 주소(#/...)에 따라 화면을 고르고, 검색·설정·PWA를 연결한다 */
(function (SB) {
  const main = document.getElementById('main');
  const ROUTES = {
    '': ['home', SB.view.home],
    terms: ['terms', SB.view.terms],
    patterns: ['patterns', SB.view.patterns],
    practice: ['practice', SB.view.practice],
    quiz: ['quiz', SB.view.quiz],
    company: ['company', SB.view.company],
    risk: ['risk', SB.view.risk],
    stats: ['stats', SB.view.stats],
    explore: ['explore', SB.view.explore],
    me: ['me', SB.view.me],
    more: ['more', SB.view.more],
    sources: ['sources', SB.view.sources],
    search: ['search', SB.view.search],
  };
  const MORE_GROUP = ['quiz', 'company', 'risk', 'stats', 'explore', 'me', 'more', 'sources'];

  function parse() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, anchor] = raw.split('#');
    const parts = path.split('/').map((p) => { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { section: parts[0] || '', id: parts[1] || null, anchor: anchor || null };
  }

  let lastKey = '';
  function render(force) {
    const r = parse();
    const route = ROUTES[r.section] || ROUTES[''];
    const key = r.section + '/' + (r.id || '');
    let res;
    try {
      res = route[1](main, r.id) || {};
    } catch (e) {
      console.error(e);
      main.innerHTML = `<div class="page"><div class="notice bad"><strong>화면을 그리는 중 문제가 생겼습니다.</strong><span>${SB.u.esc(e.message)}</span><a href="#/">홈으로</a></div></div>`;
      res = { title: '오류', noLast: true };
    }
    document.title = (res.title && res.title !== '홈' ? res.title + ' · ' : '') + '주식 투자 바이블';
    const navKey = route[0];
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === navKey || (a.dataset.nav === 'more' && MORE_GROUP.includes(navKey) && a.closest('.tabbar'));
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (r.id && !res.noLast && ['terms', 'patterns', 'practice'].includes(r.section)) {
      SB.store.setLast('#/' + r.section + '/' + r.id, res.title);
    }
    if (r.anchor) {
      const el = document.getElementById(r.anchor);
      if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 30);
    } else if (key !== lastKey && !force) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    lastKey = key;
  }

  SB.app = { rerender: () => render(true) };

  // 검색
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) location.hash = '#/search/' + encodeURIComponent(q);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    if (e.key === 'Escape') SB.ui.closePrefs();
  });

  document.getElementById('prefsBtn').addEventListener('click', () => SB.ui.openPrefs());
  window.addEventListener('hashchange', () => { SB.ui.closePrefs(); render(); });

  SB.ui.renderPrefbar();
  render();

  // PWA: 웹 서버(https 또는 localhost)에서 열었을 때만 서비스 워커 등록
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.SB_NO_SW) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* 미리보기 환경 등에서는 등록되지 않아도 앱은 동작 */ });
    });
  }
})(window.SB);
