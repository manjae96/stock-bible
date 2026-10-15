/* 홈: 수준·시장·기간 선택, 이어서 공부하기, 설정에 맞춘 추천 */
(function (SB) {
  const { esc, HORIZONS, LEVELS, MARKETS } = SB.u;
  const ui = () => SB.ui;
  const store = SB.store;

  function recommend() {
    const { f } = ui();
    const terms = SB.content.TERMS.filter((t) => f.levelOK(t) && f.marketOK(t) && f.horizonOK(t));
    const unseen = terms.filter((t) => !store.isViewed('term', t.id));
    const pats = SB.content.PATTERNS.filter((p) => f.levelOK(p) && f.horizonOK(p));
    const nextPat = pats.find((p) => !store.isViewed('pattern', p.id)) || pats[0];
    const lessons = SB.content.LESSONS.filter((l) => f.levelOK(l) && f.marketOK(l) && f.horizonOK(l));
    return { terms, unseen, pats, nextPat, lessons };
  }

  function progress() {
    const T = SB.content.TERMS.length, P = SB.content.PATTERNS.length, Q = ui().allQuestions().length;
    const tv = SB.content.TERMS.filter((t) => store.isViewed('term', t.id)).length;
    const pv = SB.content.PATTERNS.filter((p) => store.isViewed('pattern', p.id)).length;
    const qd = Object.values(store.data.quiz).filter((q) => q.ok).length;
    return { T, P, Q, tv, pv, qd, pr: store.data.practice.length };
  }

  function render(main) {
    const p = store.prefs;
    const last = store.data.last;
    main.innerHTML = `<div class="page">
      <section class="hero">
        <span class="eyebrow">무료 주식 학습 · 한국·미국</span>
        <h1>용어, 차트, 기업, 위험을 한 줄로 잇는 공부</h1>
        <p class="lead">차트 모양을 외우기보다, 그 판단을 뒷받침하는 근거와 반대 근거를 함께 보는 연습을 합니다.</p>
        <div class="row">
          <span class="chip synthetic">차트는 설명용 가상 데이터</span>
          <span class="chip offline">실제 시세·공시 미연결</span>
          <span class="chip unverified">패턴 통계 미검증</span>
          <span class="chip draft">콘텐츠 AI 초안 · 검토 전</span>
        </div>
      </section>

      ${last ? `<a class="tile" href="${esc(last.route)}"><span class="eyebrow">이어서 공부하기</span><span class="k">${esc(last.title)}</span><span class="v">${SB.u.fmt.date(last.ts)}에 마지막으로 본 내용</span></a>` : ''}
      ${!store.persistent ? '<div class="notice warn">이 브라우저에서는 저장이 막혀 있어 학습 기록이 창을 닫으면 사라집니다.</div>' : ''}

      <section class="panel" aria-labelledby="setupTitle">
        <div class="section-head"><h2 id="setupTitle">무엇을, 어떤 깊이로 공부할까요?</h2><span class="small muted">언제든 위쪽 설정에서 바꿀 수 있습니다</span></div>
        ${ui().prefsForm('hp')}
      </section>

      <section class="section" id="homeRec" aria-live="polite"></section>
    </div>`;
    ui().bindPrefsForm(main, 'hp', () => renderRec(main));
    renderRec(main);
  }

  function renderRec(main) {
    const r = recommend();
    const pr = progress();
    const p = store.prefs;
    const box = main.querySelector('#homeRec');
    const dayNote = p.horizon === 'day' ? `<div class="notice warn"><strong>당일 매매: 교육 콘텐츠만 제공</strong><span>분봉 데이터가 연결되지 않아 당일 매매용 차트 분석은 지원하지 않습니다. 호가·거래비용·갭·가격제한 같은 개념 학습을 우선 추천합니다.</span></div>` : '';
    const tfNote = p.tf === 'm' ? `<div class="notice warn">분봉은 데이터 미연결 상태입니다. 차트는 분봉 모양을 흉내 낸 설명용 가상 데이터로만 표시합니다.</div>` : '';
    const pick = (r.unseen.length ? r.unseen : r.terms).slice(0, 4);
    box.innerHTML = `
      <div class="section-head"><h2>지금 설정에 맞춘 학습</h2><span class="small muted">${LEVELS[p.level]} · ${MARKETS[p.market]} · ${HORIZONS[p.horizon].name}</span></div>
      ${dayNote}${tfNote}
      <div class="grid-2">
        <div class="panel">
          <div class="section-head"><h3>용어 ${r.terms.length}개가 이 설정에 해당</h3><a class="small" href="#/terms">모두 보기</a></div>
          <div class="list">${pick.map((t) => `<a class="list-item" href="#/terms/${t.id}"><span class="t">${esc(t.ko)}${t.abbr ? `<small>${esc(t.abbr)}</small>` : ''}</span>${store.isViewed('term', t.id) ? '<span class="chip">읽음</span>' : '<span class="chip match">새 용어</span>'}<span class="d">${esc(t.def)}</span></a>`).join('') || '<p class="muted">해당 용어가 없습니다. 투자 기간이나 수준을 바꿔 보세요.</p>'}</div>
        </div>
        <div class="stack">
          ${r.nextPat ? `<a class="tile" href="#/patterns/${r.nextPat.id}"><span class="eyebrow">다음 차트 패턴</span><span class="k">${esc(r.nextPat.ko)}</span><span class="v">${esc(r.nextPat.summary)}</span></a>` : ''}
          <a class="tile" href="#/practice"><span class="eyebrow">차트 연습실</span><span class="k">미래를 가린 차트로 판단 연습</span><span class="v">근거·반대 근거·판단을 바꿀 조건을 적고 결과를 공개합니다. 보류도 선택할 수 있습니다.</span></a>
          <a class="tile" href="#/quiz"><span class="eyebrow">퀴즈</span><span class="k">현재 설정 문제 풀기</span><span class="v">틀린 문제는 오답 노트에 쌓입니다.</span></a>
          ${r.lessons[0] ? `<a class="tile" href="#/${r.lessons[0].area}#${r.lessons[0].id}"><span class="eyebrow">${r.lessons[0].area === 'company' ? '기업 분석 기초' : '위험 관리'}</span><span class="k">${esc(r.lessons[0].title)}</span><span class="v">${esc(r.lessons[0].intro)}</span></a>` : ''}
        </div>
      </div>
      <div class="panel">
        <div class="section-head"><h3>내 진도</h3><a class="small" href="#/me">내 학습</a></div>
        <div class="grid-3">
          ${bar('용어', pr.tv, pr.T)}${bar('차트 패턴', pr.pv, pr.P)}${bar('퀴즈 정답', pr.qd, pr.Q)}
        </div>
        <p class="small muted">연습실 기록 ${pr.pr}건 · 학습 기록은 이 기기의 이 브라우저에만 저장됩니다.</p>
      </div>`;
  }
  function bar(label, v, t) {
    const pct = t ? Math.round(v / t * 100) : 0;
    return `<div class="stack"><div class="row" style="justify-content:space-between"><span>${label}</span><span class="num small">${v} / ${t}</span></div><div class="progress" role="progressbar" aria-label="${label} 진도" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div></div>`;
  }

  SB.view.home = (main) => { render(main); return { title: '홈' }; };
})(window.SB);
