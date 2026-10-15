/* 화면 공통 부품: 필터 판정, 배지, 북마크 버튼, 퀴즈, 설정 패널 */
(function (SB) {
  const { esc, LEVELS, MARKETS, HORIZONS, TIMEFRAMES, HORIZON_TF } = SB.u;
  const store = SB.store;

  const f = {
    marketOK(item) { const m = store.prefs.market; return m === 'ALL' || !item.mk || item.mk.includes(m); },
    levelOK(item) { return (item.lv || 1) <= store.prefs.level; },
    horizonOK(item) { return !item.hz || item.hz.includes(store.prefs.horizon); },
  };

  function levelChip(lv) { return `<span class="chip lv${lv}" title="처음 배우는 수준">${LEVELS[lv]}</span>`; }
  function reviewChip(status) {
    const r = SB.meta.REVIEW[status] || SB.meta.REVIEW['ai-draft'];
    return `<span class="chip ${r.cls}" title="${esc(r.desc)}">${esc(r.label)}</span>`;
  }
  function marketChips(mk) {
    if (!mk) return '';
    return mk.map((m) => `<span class="chip">${m === 'KR' ? '한국' : '미국'}</span>`).join('');
  }
  function horizonChip(item) {
    return f.horizonOK(item) ? `<span class="chip match" title="선택한 투자 기간과 관련">${esc(HORIZONS[store.prefs.horizon].name)} 관련</span>` : '';
  }
  function starBtn(type, id) {
    const on = store.isBookmarked(type, id);
    return `<button type="button" class="star" data-star="${type}:${id}" aria-pressed="${on}">${on ? '★ 북마크됨' : '☆ 북마크'}</button>`;
  }
  function bindStars(root) {
    root.querySelectorAll('[data-star]').forEach((b) => {
      b.addEventListener('click', () => {
        const [type, id] = b.dataset.star.split(':');
        const on = store.toggleBookmark(type, id);
        b.setAttribute('aria-pressed', on);
        b.textContent = on ? '★ 북마크됨' : '☆ 북마크';
        SB.u.toast(on ? '북마크에 추가했습니다' : '북마크에서 뺐습니다');
      });
    });
  }

  function termLink(id) {
    const t = SB.content.termById[id];
    return t ? `<a href="#/terms/${t.id}">${esc(t.ko)}</a>` : '';
  }
  function patternLink(id) {
    const p = SB.content.patternById[id];
    return p ? `<a href="#/patterns/${p.id}">${esc(p.ko)}</a>` : '';
  }
  function sourcesBlock(keys, status, reviewedAt) {
    const items = (keys || []).map((k) => SB.meta.SOURCES[k]).filter(Boolean);
    const r = SB.meta.REVIEW[status] || SB.meta.REVIEW['ai-draft'];
    return `<div class="panel small">
      <div class="row"><strong>출처·검토</strong>${reviewChip(status)}<span class="muted">작성·확인일 ${esc(reviewedAt || SB.meta.CONTENT_DATE)}</span></div>
      <p class="muted">${esc(r.desc)}</p>
      <ul class="stack" style="margin:0;padding-left:1.1em">${items.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)} <span class="muted">— ${esc(s.note)}</span></li>`).join('')}</ul>
    </div>`;
  }

  /* 퀴즈 하나 */
  function quiz(el, qid, q, onDone) {
    const prev = store.data.quiz[qid];
    el.innerHTML = `<div class="quiz panel">
      <div class="row"><span class="eyebrow">퀴즈</span>${prev ? `<span class="chip ${prev.ok ? 'reviewed' : 'draft'}">${prev.ok ? '지난번 정답' : '지난번 오답'}</span>` : ''}</div>
      <p class="q">${esc(q.q)}</p>
      <div class="opts">${q.o.map((o, i) => `<button type="button" data-i="${i}">${String.fromCharCode(9312 + i)} ${esc(o)}</button>`).join('')}</div>
      <p class="why" hidden></p>
    </div>`;
    const why = el.querySelector('.why');
    el.querySelectorAll('.opts button').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.i;
      const ok = i === q.a;
      el.querySelectorAll('.opts button').forEach((x) => {
        x.disabled = true;
        if (+x.dataset.i === q.a) x.dataset.state = 'right';
        else if (+x.dataset.i === i) x.dataset.state = 'wrong';
      });
      why.hidden = false;
      why.innerHTML = `<strong>${ok ? '정답입니다.' : '오답입니다. 오답 노트에 저장했습니다.'}</strong> ${esc(q.why)}`;
      store.recordQuiz(qid, ok);
      if (onDone) onDone(ok);
    }));
  }

  /* 모든 퀴즈 문제 목록 */
  function allQuestions() {
    const out = [];
    SB.content.TERMS.forEach((t) => out.push({ qid: 'term:' + t.id, q: t.q, src: { type: 'term', id: t.id, title: t.ko }, lv: t.lv, mk: t.mk, hz: t.hz }));
    SB.content.PATTERNS.forEach((p) => out.push({ qid: 'pattern:' + p.id, q: p.quiz, src: { type: 'pattern', id: p.id, title: p.ko }, lv: p.lv, mk: ['KR', 'US'], hz: p.hz }));
    return out;
  }

  /* 상단 설정 요약 */
  function renderPrefbar() {
    const p = store.prefs;
    const bar = document.getElementById('prefbar');
    const tf = TIMEFRAMES[p.tf];
    bar.innerHTML = `
      <button type="button" data-open="level">수준 <b>${LEVELS[p.level]}</b></button>
      <button type="button" data-open="market">시장 <b>${MARKETS[p.market]}</b></button>
      <button type="button" data-open="horizon">기간 <b>${HORIZONS[p.horizon].name}</b></button>
      <button type="button" data-open="tf">봉 <b>${tf.name}${tf.supported ? '' : ' (미지원)'}</b></button>`;
    bar.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => openPrefs(b.dataset.open)));
  }

  function prefsForm(idPrefix) {
    const p = store.prefs;
    const radio = (name, val, label, sub, checked) => {
      const id = `${idPrefix}-${name}-${val}`;
      return `<input type="radio" name="${idPrefix}-${name}" id="${id}" value="${val}" ${checked ? 'checked' : ''}><label for="${id}">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</label>`;
    };
    return `<div class="setup">
      <fieldset id="${idPrefix}-level-fs"><legend>학습 수준</legend><div class="seg">
        ${radio('level', 1, '초급', '용어·거래·캔들·기초 위험', p.level === 1)}
        ${radio('level', 2, '중급', '추세·거래량·지표·기업 분석', p.level === 2)}
        ${radio('level', 3, '고급', '검증·불확실성·전략 평가', p.level === 3)}
      </div></fieldset>
      <fieldset id="${idPrefix}-market-fs"><legend>시장</legend><div class="seg">
        ${radio('market', 'ALL', '한국·미국 모두', '차이를 나란히 비교', p.market === 'ALL')}
        ${radio('market', 'KR', '한국', '원화·DART', p.market === 'KR')}
        ${radio('market', 'US', '미국', '달러·EDGAR', p.market === 'US')}
      </div></fieldset>
      <fieldset id="${idPrefix}-horizon-fs"><legend>투자 기간 <span class="muted small">(이 서비스의 학습용 분류)</span></legend><div class="seg">
        ${Object.entries(HORIZONS).map(([k, v]) => radio('horizon', k, v.name, v.hint, p.horizon === k)).join('')}
      </div></fieldset>
      <fieldset id="${idPrefix}-tf-fs"><legend>차트 봉 주기 <span class="muted small">(투자 기간과 따로 선택)</span></legend><div class="seg">
        ${Object.entries(TIMEFRAMES).map(([k, v]) => radio('tf', k, v.name, v.supported ? '' : '데이터 미연결', p.tf === k)).join('')}
      </div></fieldset>
      <p class="small muted" id="${idPrefix}-hint"></p>
    </div>`;
  }
  function bindPrefsForm(root, idPrefix, after) {
    const hint = root.querySelector(`#${idPrefix}-hint`);
    const update = () => {
      const p = store.prefs;
      const suggested = HORIZON_TF[p.horizon].map((k) => TIMEFRAMES[k].name).join('·');
      let msg = `학습 안내: "${HORIZONS[p.horizon].name}" 기간은 흔히 ${suggested}을 함께 봅니다. 규칙이 아니라 출발점입니다.`;
      if (p.tf === 'm') msg += ' 분봉 데이터는 연결되지 않아 차트는 개념 설명용 가상 데이터로만 보여줍니다.';
      if (p.horizon === 'day') msg += ' 당일 매매는 교육 콘텐츠만 제공하며, 분봉 분석 기능은 아직 지원하지 않습니다.';
      hint.textContent = msg;
    };
    root.querySelectorAll(`input[name^="${idPrefix}-"]`).forEach((inp) => inp.addEventListener('change', () => {
      const key = inp.name.slice(idPrefix.length + 1);
      const val = key === 'level' ? +inp.value : inp.value;
      store.setPref(key, val);
      update();
      renderPrefbar();
      if (after) after(key);
    }));
    update();
  }

  function openPrefs(focusKey) {
    const panel = document.getElementById('prefsPanel');
    const btn = document.getElementById('prefsBtn');
    if (!panel.hidden && !focusKey) { closePrefs(); return; }
    panel.innerHTML = `<div class="page" style="gap:12px">${prefsForm('pp')}<div class="row"><button class="btn primary" type="button" id="ppClose">적용하고 닫기</button><span class="small muted">선택은 이 기기에 저장되고 모든 화면에 바로 반영됩니다.</span></div></div>`;
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    bindPrefsForm(panel, 'pp', () => SB.app.rerender());
    panel.querySelector('#ppClose').addEventListener('click', closePrefs);
    const target = focusKey && panel.querySelector(`input[name="pp-${focusKey}"]:checked`);
    (target || panel.querySelector('input')).focus();
  }
  function closePrefs() {
    const panel = document.getElementById('prefsPanel');
    panel.hidden = true;
    document.getElementById('prefsBtn').setAttribute('aria-expanded', 'false');
  }

  function contextLine() {
    const p = store.prefs;
    return `<p class="small muted">현재 설정: ${LEVELS[p.level]} · ${MARKETS[p.market]} · ${HORIZONS[p.horizon].name} · ${TIMEFRAMES[p.tf].name}</p>`;
  }

  /* 시장별 차이 블록 */
  function marketDiff(item) {
    if (!item.kr && !item.us) return '';
    const m = store.prefs.market;
    const blocks = [];
    if ((m === 'ALL' || m === 'KR') && item.kr) blocks.push(`<div><span class="flag">한국</span><p>${esc(item.kr)}</p></div>`);
    if ((m === 'ALL' || m === 'US') && item.us) blocks.push(`<div><span class="flag">미국</span><p>${esc(item.us)}</p></div>`);
    if (!blocks.length) return '';
    return `<section class="section"><h3>시장별 차이</h3><div class="compare">${blocks.join('')}</div>
      <p class="small muted">제도·세율·시간은 바뀔 수 있습니다. 숫자는 작성일 기준 예시이며 공식 출처에서 확인하세요.</p></section>`;
  }

  SB.view = SB.view || {};
  SB.ui = { f, levelChip, reviewChip, marketChips, horizonChip, starBtn, bindStars, termLink, patternLink, sourcesBlock, quiz, allQuestions, renderPrefbar, prefsForm, bindPrefsForm, openPrefs, closePrefs, contextLine, marketDiff };
})(window.SB);
