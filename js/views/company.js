/* 기업 분석 기초: 강의 + 가상 기업 지표 계산기 + 공시 데이터 연결 상태 */
(function (SB) {
  const { esc, fmt, LEVELS } = SB.u;
  const store = SB.store;

  function lessonsHTML(area) {
    const ui = SB.ui;
    const { f } = ui;
    const lv = store.prefs.level;
    const all = SB.content.LESSONS.filter((l) => l.area === area && f.marketOK(l));
    const sorted = all.slice().sort((a, b) => (f.horizonOK(b) - f.horizonOK(a)) || (a.lv - b.lv));
    return sorted.map((l) => `<article class="panel" id="${l.id}">
      <div class="row">${ui.levelChip(l.lv)}${ui.horizonChip(l)}${ui.reviewChip(l.status)}${ui.starBtn('lesson', l.id)}</div>
      <h2>${esc(l.title)}</h2>
      ${l.lv > lv ? `<p class="small muted">${LEVELS[l.lv]} 내용입니다. 핵심만 먼저 읽어도 좋습니다.</p>` : ''}
      <p class="lead">${esc(l.intro)}</p>
      <ul class="stack" style="margin:0;padding-left:1.1em">${l.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      ${l.deeper ? Object.entries(l.deeper).map(([n, txt]) => `<details class="more" ${lv >= +n ? 'open' : ''}><summary>${LEVELS[n]} 설명</summary><div><p>${esc(txt)}</p></div></details>`).join('') : ''}
      ${ui.marketDiff(l)}
      ${l.check ? `<div class="notice"><strong>직접 해보기</strong><ul class="stack" style="margin:0;padding-left:1.1em">${l.check.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
      <div class="row small">관련 용어: ${l.terms.map((t) => ui.termLink(t)).join(' · ')}</div>
    </article>`).join('');
  }
  function afterLessons(main, area) {
    SB.ui.bindStars(main);
    SB.content.LESSONS.filter((l) => l.area === area).forEach((l) => store.markViewed('lesson', l.id));
  }

  function render(main) {
    const ui = SB.ui;
    const pv = SB.providers.list;
    main.innerHTML = `<div class="page">
      <div class="section-head"><div><span class="eyebrow">기업 분석 기초</span><h1>실적·재무·공시 읽기</h1></div>${ui.contextLine()}</div>
      <div class="notice warn"><strong>실제 공시·재무 데이터 미연결</strong>
        <span>${esc(pv.opendart.name)}: ${esc(pv.opendart.blocker)}. ${esc(pv.edgar.name)}: ${esc(pv.edgar.blocker)}. 지금은 원문 사이트에서 직접 확인하는 방법을 배웁니다: <a href="https://dart.fss.or.kr/" target="_blank" rel="noopener">DART</a> · <a href="https://www.sec.gov/edgar/search/" target="_blank" rel="noopener">EDGAR 검색</a></span></div>
      ${lessonsHTML('company')}
      <section class="panel" id="valcalc">
        <div class="row"><h2>지표 연결 계산기</h2><span class="chip synthetic">가상 기업 예시</span></div>
        <p class="small muted">숫자를 바꿔 PER·PBR·ROE가 어떻게 함께 움직이는지 보세요. 기본값은 지어낸 회사의 예시입니다.</p>
        <div class="grid-3">
          <div class="field"><label for="v-price">주가</label><input id="v-price" type="number" inputmode="decimal" value="30000"></div>
          <div class="field"><label for="v-shares">발행 주식 수</label><input id="v-shares" type="number" inputmode="numeric" value="10000000"></div>
          <div class="field"><label for="v-ni">연간 순이익</label><input id="v-ni" type="number" inputmode="decimal" value="20000000000"></div>
          <div class="field"><label for="v-eq">자본총계</label><input id="v-eq" type="number" inputmode="decimal" value="150000000000"></div>
          <div class="field"><label for="v-debt">부채총계</label><input id="v-debt" type="number" inputmode="decimal" value="120000000000"></div>
        </div>
        <div class="table-wrap"><table class="tbl" style="min-width:0"><tbody id="v-out"></tbody></table></div>
        <p class="small muted">확인식: PBR = PER × ROE (같은 기간의 이익과 자본을 쓸 때). 단순화를 위해 기말 자본을 사용했습니다.</p>
      </section>
    </div>`;
    afterLessons(main, 'company');
    const ids = ['price', 'shares', 'ni', 'eq', 'debt'];
    const calc = () => {
      const v = Object.fromEntries(ids.map((k) => [k, parseFloat(main.querySelector('#v-' + k).value)]));
      const mc = v.price * v.shares, eps = v.ni / v.shares, per = v.ni > 0 ? v.price / eps : null;
      const pbr = v.eq > 0 ? mc / v.eq : null, roe = v.eq > 0 ? v.ni / v.eq : null, dr = v.eq > 0 ? v.debt / v.eq : null;
      const row = (k, val, note) => `<tr><th scope="row">${k}</th><td class="n">${val}</td><td class="small muted">${note}</td></tr>`;
      main.querySelector('#v-out').innerHTML =
        row('시가총액', fmt.n(mc), '주가 × 주식 수') +
        row('EPS', fmt.n(eps, 0), '순이익 ÷ 주식 수') +
        row('PER', per == null ? '계산 불가' : fmt.n(per, 1) + '배', v.ni > 0 ? '주가 ÷ EPS' : '적자면 의미 없음') +
        row('PBR', pbr == null ? '계산 불가' : fmt.n(pbr, 2) + '배', '시가총액 ÷ 자본') +
        row('ROE', roe == null ? '계산 불가' : fmt.pct(roe, 1), '순이익 ÷ 자본') +
        row('PER × ROE', per != null && roe != null ? fmt.n(per * roe, 2) + '배' : '—', 'PBR과 같아야 함') +
        row('부채비율', dr == null ? '계산 불가' : fmt.pct(dr, 0), '부채 ÷ 자본');
    };
    ids.forEach((k) => main.querySelector('#v-' + k).addEventListener('input', calc));
    calc();
    return { title: '기업 분석 기초' };
  }

  SB.view.company = render;
  SB.view.lessonsHTML = lessonsHTML;
  SB.view.afterLessons = afterLessons;
})(window.SB);
