/* 차트 패턴 도감: 목록 + 상세(성공·실패 비교, 조건, 무효화, 시나리오, 통계 상태) */
(function (SB) {
  const { esc, LEVELS, TIMEFRAMES } = SB.u;
  const store = SB.store;

  /* 패턴 정의(수준 단위) → 현재 시장·봉 주기의 가상 가격 데이터와 주석 */
  function build(spec) {
    const s = SB.synth.series({
      anchors: spec.anchors, n: spec.n, seed: spec.seed, volume: spec.volume, overrides: spec.overrides,
      market: store.prefs.market, tf: store.prefs.tf,
    });
    const ann = (spec.ann || []).map((a) => {
      const o = Object.assign({}, a);
      if (a.t === 'h') o.price = s.toPrice(a.lv);
      if (a.t === 'seg') { o.a = [a.a[0], s.toPrice(a.a[1])]; o.b = [a.b[0], s.toPrice(a.b[1])]; }
      return o;
    });
    return { bars: s.bars, meta: s.meta, ann, ma: spec.ma };
  }

  function spark(spec) {
    const s = SB.synth.series({ anchors: spec.anchors, n: spec.n, seed: spec.seed, market: 'ALL', tf: 'D' });
    const cs = s.bars.map((b) => b.c);
    const lo = Math.min(...cs), hi = Math.max(...cs);
    const pts = cs.map((c, i) => `${(i / (cs.length - 1) * 118 + 1).toFixed(1)},${(34 - (c - lo) / (hi - lo || 1) * 30).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 120 36" width="120" height="36" aria-hidden="true"><polyline points="${pts}" style="fill:none;stroke:var(--ink);stroke-width:1.5"/></svg>`;
  }

  function list(main) {
    const ui = SB.ui;
    const P = SB.content.PATTERNS;
    main.innerHTML = `<div class="page">
      <div class="section-head"><div><span class="eyebrow">차트 도감</span><h1>패턴·상황 ${P.length}개</h1></div>${ui.contextLine()}</div>
      <p class="lead">배우는 순서대로 정렬했습니다. 모든 그림은 설명용 가상 데이터이며, 각 패턴은 성공 사례와 실패 사례를 나란히 보여줍니다.</p>
      <div class="list">${P.map((p, i) => `<a class="list-item" href="#/patterns/${p.id}">
        <span class="t">${i + 1}. ${esc(p.ko)} <small>${esc(p.kind)}</small></span>
        <span>${spark(p.charts.success)}</span>
        <span class="d">${esc(p.summary)}</span>
        <span class="tags">${ui.levelChip(p.lv)}${p.lv > store.prefs.level ? '<span class="chip">현재 수준보다 높음</span>' : ''}${ui.horizonChip(p)}<span class="chip unverified">통계 미검증</span>${store.isViewed('pattern', p.id) ? '<span class="chip">읽음</span>' : ''}${store.isBookmarked('pattern', p.id) ? '<span class="chip match">★</span>' : ''}</span>
      </a>`).join('')}</div>
      <section class="panel"><h3>관련 지표 학습</h3><p class="small muted">패턴 판단을 보조할 때 자주 쓰는 지표입니다. 지표도 가격에서 계산한 값이라 새로운 정보를 더하지는 않습니다.</p>
        <div class="row">${['ma', 'rsi', 'macd', 'bollinger'].map((id) => `<a class="chip" href="#/terms/${id}">${esc(SB.content.termById[id].ko)}</a>`).join('')}</div></section>
    </div>`;
    return { title: '차트 도감' };
  }

  function detail(main, id) {
    const ui = SB.ui;
    const p = SB.content.patternById[id];
    if (!p) { main.innerHTML = '<div class="page"><p>패턴을 찾을 수 없습니다. <a href="#/patterns">차트 도감으로</a></p></div>'; return { title: '없음' }; }
    const lv = store.prefs.level;
    const tf = store.prefs.tf;
    const idx = SB.content.PATTERNS.indexOf(p);
    const prev = SB.content.PATTERNS[idx - 1], next = SB.content.PATTERNS[idx + 1];
    const li = (arr) => `<ul class="stack" style="margin:0;padding-left:1.1em">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    main.innerHTML = `<div class="page">
      <nav class="small"><a href="#/patterns">차트 도감</a> · ${idx + 1} / ${SB.content.PATTERNS.length}</nav>
      <header class="stack">
        <div class="row">${ui.levelChip(p.lv)}<span class="chip">${esc(p.kind)}</span>${ui.horizonChip(p)}${ui.reviewChip(p.status)}</div>
        <h1>${esc(p.ko)}</h1>
        <p class="muted mono">${esc(p.en)}</p>
        <p class="lead">${esc(p.summary)}</p>
        <div class="row">${ui.starBtn('pattern', p.id)}</div>
      </header>
      ${tf === 'm' ? '<div class="notice warn">분봉 데이터는 연결되지 않았습니다. 아래 차트는 분봉 모양을 흉내 낸 설명용 가상 데이터입니다.</div>' : ''}
      ${store.prefs.horizon === 'day' && !p.hz.includes('day') ? '<div class="notice">이 패턴은 보통 당일 매매보다 긴 기간에서 설명됩니다. 당일 매매에 적용하려면 분봉 데이터와 별도 검증이 필요합니다.</div>' : ''}
      <section class="section">
        <div class="section-head"><h2>모양: 성공 사례와 실패 사례</h2><span class="small muted">봉 주기 ${esc(TIMEFRAMES[tf].name)} · 설정에서 바꾸면 그림이 다시 만들어집니다</span></div>
        <div class="notice synthetic small">두 그림 모두 모양을 설명하려고 직접 만든 가상 데이터입니다. 여기서 성공·실패가 몇 번 나왔는지는 실제 시장 통계가 아닙니다.</div>
        <div class="compare-charts">
          <div class="stack"><div id="chS"></div><p><strong>성공 사례:</strong> ${esc(p.successText)}</p></div>
          <div class="stack"><div id="chF"></div><p><strong>실패 사례:</strong> ${esc(p.failureText)}</p></div>
        </div>
      </section>
      <section class="section"><h2>수준별 설명</h2>
        <div class="panel"><span class="eyebrow">초급</span><p>${esc(p.levelNotes[1])}</p></div>
        <details class="more" ${lv >= 2 ? 'open' : ''}><summary>중급 설명</summary><div><p>${esc(p.levelNotes[2])}</p></div></details>
        <details class="more" ${lv >= 3 ? 'open' : ''}><summary>고급 설명</summary><div><p>${esc(p.levelNotes[3])}</p></div></details>
      </section>
      <section class="grid-2">
        <div class="panel"><h3>형성 조건</h3>${li(p.conditions)}</div>
        <div class="panel"><h3>확인할 위치</h3>${li(p.where)}</div>
      </section>
      <section class="compare">
        <div><span class="flag">형성 중</span><p>${esc(p.forming)}</p></div>
        <div><span class="flag">확인됨</span><p>${esc(p.confirmed)}</p></div>
      </section>
      <section class="panel"><h3>일반적인 해석</h3><p>${esc(p.interpretation)}</p><p class="small"><strong>이 해석에 필요한 조건</strong></p>${li(p.needs)}</section>
      <section class="section"><h3>추가로 확인할 점</h3>
        <div class="compare">
          <div><span class="flag">거래량</span><p>${esc(p.extra.volume)}</p></div>
          <div><span class="flag">추세</span><p>${esc(p.extra.trend)}</p></div>
          <div><span class="flag">시장 환경</span><p>${esc(p.extra.market)}</p></div>
        </div>
      </section>
      <section class="notice bad"><strong>해석이 무효가 되는 조건</strong>${li(p.invalid)}</section>
      <section class="panel"><h3>학습용 진입·청산·위험 관리 시나리오</h3>
        <p class="small muted">실제 매매 권유가 아니라 판단 과정을 연습하기 위한 가정입니다.</p>
        <dl class="kv">
          <dt>진입</dt><dd>${esc(p.scenario.entry)}</dd>
          <dt>손절</dt><dd>${esc(p.scenario.stop)}</dd>
          <dt>목표</dt><dd>${esc(p.scenario.target)}</dd>
          <dt>비중</dt><dd>${esc(p.scenario.sizing)} — <a href="#/risk#sizing">투자 비중 계산기</a></dd>
          <dt>메모</dt><dd>${esc(p.scenario.note)}</dd>
        </dl>
      </section>
      <section class="panel">
        <div class="row"><h3>수익·손실 통계</h3><span class="chip unverified">통계 미검증</span></div>
        <p>${esc(p.stats.reason)}</p>
        <p class="small"><strong>검증할 판정 규칙(초안):</strong> ${esc(p.stats.rule)}</p>
        <p class="small muted">이 패턴의 "성공 확률"을 숫자로 보여주지 않는 이유와 검증 방법은 <a href="#/stats">검증·통계</a>에서 볼 수 있습니다.</p>
      </section>
      <section class="section"><h3>관련 용어·지표</h3><div class="row">
        ${p.terms.concat(p.indicators.filter((x) => !p.terms.includes(x))).map((tid) => { const t = SB.content.termById[tid]; return t ? `<a class="chip" href="#/terms/${t.id}">${esc(t.ko)}</a>` : ''; }).join('')}
        ${SB.content.PRACTICE.filter((q) => q.patterns.includes(p.id)).map((q) => `<a class="chip match" href="#/practice/${q.id}">연습: ${esc(q.title)}</a>`).join('')}
      </div></section>
      <div id="patQuiz"></div>
      ${ui.sourcesBlock(['textbook'], p.status, p.reviewedAt)}
      <nav class="row" style="justify-content:space-between">
        ${prev ? `<a class="btn" href="#/patterns/${prev.id}">← ${esc(prev.ko)}</a>` : '<span></span>'}
        ${next ? `<a class="btn" href="#/patterns/${next.id}">${esc(next.ko)} →</a>` : ''}
      </nav>
    </div>`;
    const s = build(p.charts.success), fl = build(p.charts.failure);
    SB.chart.mount(main.querySelector('#chS'), { bars: s.bars, meta: s.meta, annotations: s.ann, ma: s.ma, title: '성공 사례' });
    SB.chart.mount(main.querySelector('#chF'), { bars: fl.bars, meta: fl.meta, annotations: fl.ann, ma: fl.ma, title: '실패 사례' });
    ui.bindStars(main);
    ui.quiz(main.querySelector('#patQuiz'), 'pattern:' + p.id, p.quiz);
    store.markViewed('pattern', p.id);
    return { title: p.ko };
  }

  SB.view.patterns = (main, id) => id ? detail(main, id) : list(main);
  SB.view.patternBuild = build;
})(window.SB);
