/* 차트 연습실: 미래 구간을 가린 차트 → 판단 근거·반대 근거 기록 → 공개 → 과정과 결과를 따로 평가 */
(function (SB) {
  const { esc, fmt } = SB.u;
  const store = SB.store;
  const DECISION = { up: '오를 것 같다', down: '내릴 것 같다', hold: '판단 보류 (정보 부족)' };

  function list(main) {
    const ui = SB.ui;
    const { f } = ui;
    const hist = store.data.practice.slice(0, 6);
    const items = SB.content.PRACTICE.slice().sort((a, b) => (f.horizonOK(b) - f.horizonOK(a)) || (a.lv - b.lv));
    main.innerHTML = `<div class="page">
      <div class="section-head"><div><span class="eyebrow">차트 연습실</span><h1>가린 미래를 두고 판단하기</h1></div>${ui.contextLine()}</div>
      <p class="lead">결과를 맞히는 연습이 아니라, 근거와 반대 근거를 적고 판단을 바꿀 조건을 미리 정하는 연습입니다. 결과가 맞아도 과정이 약하면 운이었을 수 있습니다.</p>
      <div class="list">${items.map((q) => {
        const done = store.data.practice.filter((r) => r.pid === q.id).length;
        return `<a class="list-item" href="#/practice/${q.id}"><span class="t">${esc(q.title)}</span><span class="row">${done ? `<span class="chip">${done}회 풀이</span>` : ''}</span><span class="d">${esc(q.prompt)}</span><span class="tags">${ui.levelChip(q.lv)}${ui.horizonChip(q)}<span class="chip synthetic">가상 데이터</span></span></a>`;
      }).join('')}</div>
      ${hist.length ? `<section class="section"><h2>최근 기록</h2><div class="table-wrap"><table class="tbl"><thead><tr><th>날짜</th><th>문제</th><th>내 판단</th><th>공개 결과</th><th class="n">과정 점검</th></tr></thead><tbody>
        ${hist.map((r) => `<tr><td>${fmt.date(r.ts)}</td><td>${esc(r.title)}</td><td>${esc(DECISION[r.decision])}</td><td>${esc(r.outcomeLabel)} (${fmt.spct(r.ret)})</td><td class="n">${r.score}/5</td></tr>`).join('')}
      </tbody></table></div></section>` : ''}
    </div>`;
    return { title: '차트 연습실' };
  }

  function makeData(q) {
    const market = store.prefs.market;
    if (q.random) {
      const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
      const mb = SB.synth.MARKET_BASE[market];
      const sig = { m: 0.006, D: 0.018, W: 0.035, M: 0.06 }[store.prefs.tf] || 0.018;
      const rw = SB.synth.randomWalk({ n: q.n, seed, sigma: sig, start: mb.base });
      const tick = mb.tick;
      rw.bars.forEach((b) => ['o', 'h', 'l', 'c'].forEach((k) => { b[k] = Math.round(b[k] / tick) * tick; }));
      return { bars: rw.bars, meta: { synthetic: true, market, currency: mb.currency, decimals: mb.decimals, tf: store.prefs.tf, source: '무작위 보행으로 직접 생성한 합성 데이터 (seed ' + seed + ')', asOf: '해당 없음(가상)' }, ann: [], threshold: 0.03, seed };
    }
    const b = SB.view.patternBuild({ anchors: q.anchors, n: q.n, seed: q.seed, volume: q.volume, overrides: q.overrides, ann: [] });
    return { bars: b.bars, meta: b.meta, ann: [], threshold: 0.03 * SB.synth.TF_SHAPE[store.prefs.tf].amp };
  }

  function outcome(bars, hide, threshold) {
    const base = bars[hide - 1].c;
    const end = bars[bars.length - 1].c;
    let hi = -Infinity, lo = Infinity;
    for (let i = hide; i < bars.length; i++) { hi = Math.max(hi, bars[i].h); lo = Math.min(lo, bars[i].l); }
    const ret = end / base - 1;
    const label = ret > threshold ? 'up' : ret < -threshold ? 'down' : 'flat';
    return { ret, maxUp: hi / base - 1, maxDown: lo / base - 1, label, threshold };
  }
  const OUT_LABEL = { up: '상승', down: '하락', flat: '뚜렷하지 않음(옆걸음)' };

  function detail(main, id) {
    const ui = SB.ui;
    const q = SB.content.practiceById[id];
    if (!q) { main.innerHTML = '<div class="page"><p>문제를 찾을 수 없습니다. <a href="#/practice">연습실로</a></p></div>'; return { title: '없음' }; }
    const data = makeData(q);
    const patOpts = SB.content.PATTERNS.map((p) => `<option value="${esc(p.ko)}">${esc(p.ko)}</option>`).join('');
    main.innerHTML = `<div class="page">
      <nav class="small"><a href="#/practice">차트 연습실</a></nav>
      <header class="stack"><div class="row">${ui.levelChip(q.lv)}<span class="chip synthetic">설명용 가상 데이터</span>${ui.reviewChip(q.status)}</div><h1>${esc(q.title)}</h1><p class="lead">${esc(q.prompt)}</p></header>
      <div id="pChart"></div>
      <form id="pForm" class="panel" novalidate>
        <h2>내 판단 기록</h2>
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl">가려진 ${q.n - q.hide}봉 뒤 종가는?</legend>
          <div class="seg">${Object.entries(DECISION).map(([k, v]) => `<input type="radio" name="dec" id="dec-${k}" value="${k}"><label for="dec-${k}">${esc(v)}</label>`).join('')}</div>
          <span class="hint">정보가 부족하면 보류도 좋은 선택입니다. 보류는 맞고 틀림으로 평가하지 않습니다.</span>
        </fieldset>
        <div class="field"><label for="f-pattern">관찰한 패턴</label>
          <select id="f-pattern"><option value="">선택 안 함</option>${patOpts}<option value="뚜렷한 패턴 없음">뚜렷한 패턴 없음</option></select>
          <input id="f-pattern2" placeholder="직접 적기 (예: 두 번째 바닥 이후 반등 중)" aria-label="관찰한 패턴 직접 적기"></div>
        <div class="field"><label for="f-support">판단을 뒷받침하는 근거</label><textarea id="f-support" placeholder="예: 같은 가격대에서 두 번 반등"></textarea></div>
        <div class="field"><label for="f-counter">반대 근거</label><textarea id="f-counter" placeholder="예: 넥라인을 아직 넘지 못함, 거래량이 적음"></textarea></div>
        <div class="field"><label for="f-needed">추가로 필요한 정보</label><textarea id="f-needed" placeholder="예: 주봉 추세, 공시 일정, 시장 전체 흐름"></textarea></div>
        <div class="field"><label for="f-change">판단을 바꿀 조건</label><textarea id="f-change" placeholder="예: 두 번째 바닥 아래로 종가 마감하면 판단 폐기"></textarea></div>
        <p class="small" id="pErr" role="alert" hidden></p>
        <div class="row"><button class="btn primary" type="submit">기록하고 미래 구간 공개</button><span class="small muted">기록은 이 기기에 저장됩니다.</span></div>
      </form>
      <section id="pResult" class="section" hidden></section>
    </div>`;
    const chart = SB.chart.mount(main.querySelector('#pChart'), { bars: data.bars, meta: data.meta, annotations: data.ann, hideFrom: q.hide, title: '미래 구간 가림' });
    const form = main.querySelector('#pForm');
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const dec = form.querySelector('input[name="dec"]:checked');
      const err = main.querySelector('#pErr');
      if (!dec) { err.hidden = false; err.textContent = '먼저 판단(오를 것 같다 / 내릴 것 같다 / 보류)을 하나 고르세요.'; form.querySelector('#dec-up').focus(); return; }
      err.hidden = true;
      const val = (sel) => form.querySelector(sel).value.trim();
      const rec = {
        decision: dec.value,
        pattern: [val('#f-pattern'), val('#f-pattern2')].filter(Boolean).join(' / '),
        support: val('#f-support'), counter: val('#f-counter'), needed: val('#f-needed'), change: val('#f-change'),
      };
      chart.reveal();
      form.querySelectorAll('input,textarea,select,button').forEach((x) => { x.disabled = true; });
      const out = outcome(data.bars, q.hide, data.threshold);
      showResult(main, q, rec, out, data);
    });
    return { title: q.title };
  }

  function showResult(main, q, rec, out, data) {
    const checks = [
      ['관찰한 패턴을 적었다', !!rec.pattern],
      ['판단 근거를 적었다', rec.support.length >= 4],
      ['반대 근거를 적었다', rec.counter.length >= 4],
      ['추가로 필요한 정보를 적었다', rec.needed.length >= 4],
      ['판단을 바꿀 조건을 적었다', rec.change.length >= 4],
    ];
    const score = checks.filter((c) => c[1]).length;
    const strong = score >= 4;
    let verdict;
    if (rec.decision === 'hold') {
      verdict = strong
        ? '보류를 선택했고 그 이유와 필요한 정보를 적었습니다. 근거가 맞설 때의 보류는 좋은 판단 과정입니다. 결과와 비교해 점수를 매기지 않습니다.'
        : '보류를 선택했습니다. 다음에는 왜 보류했는지(반대 근거)와 무엇을 더 알아야 하는지 적어 보세요.';
    } else {
      const hit = rec.decision === out.label;
      if (strong && hit) verdict = '판단 과정이 탄탄했고 결과도 판단과 같았습니다. 그래도 한 번의 결과는 운의 영향을 받습니다. 같은 과정을 여러 번 반복한 기록으로 평가하세요.';
      else if (strong && !hit) verdict = '결과는 판단과 달랐지만 과정은 탄탄했습니다. 미리 적은 "판단을 바꿀 조건"이 공개된 구간에서 언제 발동했을지 차트에서 찾아보세요. 그 지점에서 손실을 끊을 수 있었다면 좋은 판단 과정입니다.';
      else if (!strong && hit) verdict = '결과는 판단과 같았지만 반대 근거나 무효화 조건이 부족했습니다. 이번 결과는 운의 몫이 컸을 수 있습니다.';
      else verdict = '결과도 판단과 달랐고 과정 기록도 부족했습니다. 아래 해설의 반대 근거와 판단을 바꿀 조건을 참고해 다시 풀어 보세요.';
      if (out.label === 'flat') verdict = '공개 구간은 뚜렷한 방향이 없었습니다. ' + (strong ? '과정 기록은 충분했습니다. ' : '') + '이런 경우 방향 판단보다 보류가 나았을 수 있습니다.';
    }
    const m = q.model;
    const li = (arr) => `<ul class="stack" style="margin:0;padding-left:1.1em">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    const mine = (t) => t ? esc(t) : '<span class="muted">(적지 않음)</span>';
    const box = main.querySelector('#pResult');
    box.hidden = false;
    box.innerHTML = `
      <h2>공개 결과와 해설</h2>
      <div class="grid-2">
        <div class="panel"><h3>가려졌던 구간의 결과</h3>
          <dl class="kv">
            <dt>마지막 공개 종가 대비</dt><dd class="num">${fmt.spct(out.ret, 1)} → ${esc(OUT_LABEL[out.label])}</dd>
            <dt>구간 중 최고</dt><dd class="num">${fmt.spct(out.maxUp, 1)}</dd>
            <dt>구간 중 최저</dt><dd class="num">${fmt.spct(out.maxDown, 1)}</dd>
          </dl>
          <p class="small muted">판정 기준: ±${(out.threshold * 100).toFixed(1)}% 밖이면 상승·하락, 안이면 옆걸음. 가상 데이터의 결과이며 실제 시장 통계가 아닙니다.</p>
        </div>
        <div class="panel verdict"><h3>과정 점검 ${score}/5</h3>
          <ul class="check">${checks.map((c) => `<li class="${c[1] ? '' : 'no'}">${esc(c[0])}</li>`).join('')}</ul>
          <p><strong>내 판단:</strong> ${esc(DECISION[rec.decision])}</p>
          <p>${esc(verdict)}</p>
        </div>
      </div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th style="width:22%">항목</th><th>내 기록</th><th>해설 예시</th></tr></thead><tbody>
        <tr><td>관찰한 패턴</td><td>${mine(rec.pattern)}</td><td>${esc(m.pattern)}</td></tr>
        <tr><td>판단 근거</td><td>${mine(rec.support)}</td><td>${li(m.support)}</td></tr>
        <tr><td>반대 근거</td><td>${mine(rec.counter)}</td><td>${li(m.counter)}</td></tr>
        <tr><td>추가로 필요한 정보</td><td>${mine(rec.needed)}</td><td>${li(m.needed)}</td></tr>
        <tr><td>판단을 바꿀 조건</td><td>${mine(rec.change)}</td><td>${li(m.change)}</td></tr>
      </tbody></table></div>
      <div class="notice"><strong>이 문제에서 배울 점</strong><span>${esc(q.lesson)}</span></div>
      <div class="row">
        <a class="btn primary" href="#/practice/${q.id}" data-retry>${q.random ? '새 무작위 차트로 다시' : '다시 풀기'}</a>
        <a class="btn" href="#/practice">다른 문제</a>
        ${q.patterns.map((pid) => SB.content.patternById[pid] ? `<a class="btn ghost" href="#/patterns/${pid}">도감: ${esc(SB.content.patternById[pid].ko)}</a>` : '').join('')}
      </div>`;
    box.querySelector('[data-retry]').addEventListener('click', (e) => { e.preventDefault(); SB.app.rerender(); window.scrollTo(0, 0); });
    store.addPractice({ pid: q.id, title: q.title, ts: Date.now(), decision: rec.decision, outcome: out.label, outcomeLabel: OUT_LABEL[out.label], ret: out.ret, score, tf: store.prefs.tf, market: store.prefs.market, seed: data.seed || q.seed, notes: rec });
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  SB.view.practice = (main, id) => id ? detail(main, id) : list(main);
  SB.view.practiceOutcome = outcome;
  SB.view.practiceData = makeData;
})(window.SB);
