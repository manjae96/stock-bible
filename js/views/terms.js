/* 용어 사전: 목록(분류·수준·시장·기간 필터) + 상세 */
(function (SB) {
  const { esc, LEVELS, HORIZONS } = SB.u;
  const store = SB.store;
  let catFilter = 'all';
  let hzOnly = true;

  function list(main) {
    const ui = SB.ui;
    const { f } = ui;
    const CATS = SB.content.CATS;
    const all = SB.content.TERMS.filter((t) => f.marketOK(t) && (catFilter === 'all' || t.cat === catFilter));
    const scoped = hzOnly ? all.filter(f.horizonOK) : all;
    const now = scoped.filter(f.levelOK);
    const later = scoped.filter((t) => !f.levelOK(t));
    const hiddenByMarket = SB.content.TERMS.length - SB.content.TERMS.filter(f.marketOK).length;
    const item = (t) => `<a class="list-item" href="#/terms/${t.id}">
      <span class="t">${esc(t.ko)}${t.abbr ? `<small>${esc(t.abbr)}</small>` : ''}</span>
      <span class="row">${store.isBookmarked('term', t.id) ? '<span class="chip match">★</span>' : ''}${store.isViewed('term', t.id) ? '<span class="chip">읽음</span>' : ''}</span>
      <span class="d">${esc(t.def)}</span>
      <span class="tags">${ui.levelChip(t.lv)}<span class="chip">${esc(CATS[t.cat])}</span>${ui.marketChips(t.mk)}</span>
    </a>`;
    main.innerHTML = `<div class="page">
      <div class="section-head"><div><span class="eyebrow">용어 사전</span><h1>용어 ${SB.content.TERMS.length}개</h1></div>${ui.contextLine()}</div>
      <div class="panel">
        <div class="seg" role="radiogroup" aria-label="분류">
          ${[['all', '전체']].concat(Object.entries(CATS)).map(([k, v]) => `<input type="radio" name="tcat" id="tcat-${k}" value="${k}" ${catFilter === k ? 'checked' : ''}><label for="tcat-${k}">${esc(v)}</label>`).join('')}
        </div>
        <label class="row small"><input type="checkbox" id="hzOnly" ${hzOnly ? 'checked' : ''}> 선택한 투자 기간(${esc(HORIZONS[store.prefs.horizon].name)})과 관련된 용어만</label>
        ${hiddenByMarket ? `<p class="small muted">시장 설정 때문에 ${hiddenByMarket}개 용어가 빠졌습니다.</p>` : ''}
      </div>
      <section class="section">
        <h2>${LEVELS[store.prefs.level]}까지 · ${now.length}개</h2>
        <div class="list">${now.map(item).join('') || '<p class="muted" style="padding:14px">조건에 맞는 용어가 없습니다.</p>'}</div>
      </section>
      ${later.length ? `<details class="more"><summary>다음 수준에서 배울 용어 ${later.length}개</summary><div><div class="list">${later.map(item).join('')}</div></div></details>` : ''}
    </div>`;
    main.querySelectorAll('input[name="tcat"]').forEach((r) => r.addEventListener('change', () => { catFilter = r.value; list(main); main.querySelector(`#tcat-${catFilter}`).focus(); }));
    main.querySelector('#hzOnly').addEventListener('change', (e) => { hzOnly = e.target.checked; list(main); main.querySelector('#hzOnly').focus(); });
    return { title: '용어 사전' };
  }

  function detail(main, id) {
    const ui = SB.ui;
    const t = SB.content.termById[id];
    if (!t) { main.innerHTML = '<div class="page"><p>용어를 찾을 수 없습니다. <a href="#/terms">용어 사전으로</a></p></div>'; return { title: '없음' }; }
    const lv = store.prefs.level;
    const idx = SB.content.TERMS.indexOf(t);
    const prev = SB.content.TERMS[idx - 1], next = SB.content.TERMS[idx + 1];
    const depth = (n, label, text) => text ? `<details class="more" ${lv >= n ? 'open' : ''}><summary>${label}${lv < n ? ' (현재 수준보다 깊은 설명)' : ''}</summary><div><p>${esc(text)}</p></div></details>` : '';
    const marketMismatch = store.prefs.market !== 'ALL' && !t.mk.includes(store.prefs.market);
    main.innerHTML = `<div class="page">
      <nav class="small"><a href="#/terms">용어 사전</a> · ${esc(SB.content.CATS[t.cat])}</nav>
      <header class="stack">
        <div class="row">${ui.levelChip(t.lv)}${ui.marketChips(t.mk)}${ui.horizonChip(t)}${ui.reviewChip(t.status)}</div>
        <h1>${esc(t.ko)}</h1>
        <p class="muted mono">${esc(t.en)}${t.abbr ? ' · ' + esc(t.abbr) : ''}</p>
        <div class="row">${ui.starBtn('term', t.id)}</div>
      </header>
      ${marketMismatch ? `<div class="notice">이 용어는 ${t.mk.map((m) => m === 'KR' ? '한국' : '미국').join('·')} 시장에 주로 해당합니다.</div>` : ''}
      ${t.lv > lv ? `<div class="notice warn">이 용어는 ${LEVELS[t.lv]} 내용입니다. 쉬운 설명부터 읽고, 깊은 설명은 펼쳐 보세요.</div>` : ''}
      <section class="panel"><span class="eyebrow">한 문장 정의</span><p style="font-size:1.12rem">${esc(t.def)}</p></section>
      <section class="prose"><h2>쉬운 설명</h2><p>${esc(t.easy)}</p></section>
      <section class="grid-2">
        <div class="panel"><h3>숫자 예시</h3><p>${esc(t.ex)}</p></div>
        ${t.f ? `<div class="panel"><h3>계산식과 단위</h3><div class="formula">${esc(t.f)}</div>${t.unit ? `<p class="small muted">단위: ${esc(t.unit)}</p>` : ''}</div>` : ''}
      </section>
      <section class="prose"><h2>실제로 확인하는 방법</h2><p>${esc(t.check)}</p></section>
      ${depth(2, '중급 설명', t.mid)}
      ${depth(3, '고급 설명', t.adv)}
      <section class="grid-2">
        ${t.myth.length ? `<div class="panel"><h3>흔한 오해</h3><ul class="stack" style="margin:0;padding-left:1.1em">${t.myth.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
        <div class="panel"><h3>해석의 한계</h3><p>${esc(t.limit)}</p></div>
      </section>
      ${ui.marketDiff(t)}
      <section class="section"><h3>관련 용어</h3><div class="row">${t.rel.map((r) => { const x = SB.content.termById[r]; return x ? `<a class="chip" href="#/terms/${x.id}">${esc(x.ko)}</a>` : ''; }).join('')}
        ${SB.content.PATTERNS.filter((p) => p.terms.includes(t.id)).map((p) => `<a class="chip" href="#/patterns/${p.id}">도감: ${esc(p.ko)}</a>`).join('')}</div></section>
      <div id="termQuiz"></div>
      ${ui.sourcesBlock(t.src, t.status, t.reviewedAt)}
      <nav class="row" style="justify-content:space-between">
        ${prev ? `<a class="btn" href="#/terms/${prev.id}">← ${esc(prev.ko)}</a>` : '<span></span>'}
        ${next ? `<a class="btn" href="#/terms/${next.id}">${esc(next.ko)} →</a>` : ''}
      </nav>
    </div>`;
    ui.bindStars(main);
    ui.quiz(main.querySelector('#termQuiz'), 'term:' + t.id, t.q);
    store.markViewed('term', t.id);
    return { title: t.ko };
  }

  SB.view.terms = (main, id) => id ? detail(main, id) : list(main);
})(window.SB);
