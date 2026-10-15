/* 공통 도우미 함수 — 화면 코드에서 반복되는 작업을 모아둔 파일 */
window.SB = window.SB || {};
(function (SB) {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const LEVELS = { 1: '초급', 2: '중급', 3: '고급' };
  const MARKETS = { ALL: '한국·미국', KR: '한국', US: '미국' };
  const HORIZONS = {
    day: { name: '당일', hint: '하루 안에 사고팖' },
    swing: { name: '며칠~몇 주', hint: '단기 추세' },
    months: { name: '수개월', hint: '중기 추세·실적' },
    year: { name: '1년 이상', hint: '기업 가치·분산' },
  };
  const TIMEFRAMES = {
    m: { name: '분봉', short: '분', supported: false },
    D: { name: '일봉', short: '일', supported: true },
    W: { name: '주봉', short: '주', supported: true },
    M: { name: '월봉', short: '월', supported: true },
  };
  /* 학습용 안내: 투자 기간별로 흔히 함께 보는 봉 주기 (규칙이 아니라 출발점) */
  const HORIZON_TF = { day: ['m'], swing: ['D'], months: ['D', 'W'], year: ['W', 'M'] };

  const fmt = {
    n(v, d = 0) { if (v == null || !isFinite(v)) return '—'; return Number(v).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d }); },
    pct(v, d = 1) { if (v == null || !isFinite(v)) return '—'; return (v * 100).toFixed(d) + '%'; },
    spct(v, d = 1) { if (v == null || !isFinite(v)) return '—'; const s = (v * 100).toFixed(d); return (v > 0 ? '+' : '') + s + '%'; },
    date(ts) { try { return new Date(ts).toLocaleDateString('ko-KR'); } catch (e) { return ''; } },
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  /* 검색용 정규화: 공백·대소문자·하이픈 무시 */
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s\-·_./()]/g, ''); }

  SB.u = { esc, $, $$, fmt, toast, norm, LEVELS, MARKETS, HORIZONS, TIMEFRAMES, HORIZON_TF };
})(window.SB);
