/* 검증·통계: 지표 정의, 패턴별 통계 상태(모두 미검증), 검증 원칙 처리 현황, 계산 엔진 시연(가상 데이터) */
(function (SB) {
  const { esc, fmt } = SB.u;

  const METRICS = [
    ['양수 비율', '정해진 보유 기간(H봉) 후 비용 차감 수익률이 0보다 큰 사례의 비율'],
    ['음수 비율', '같은 조건에서 비용 차감 수익률이 0보다 작은 사례의 비율 (0인 사례는 어느 쪽에도 넣지 않음)'],
    ['하락 도달 비율', '보유 중 한 번이라도 진입가 대비 정한 하락률(예: −5%)에 도달한 사례의 비율'],
    ['손절 먼저 비율', '목표가·손절가 중 하나에 닿은 사례 가운데 손절가에 먼저 닿은 비율. 같은 봉에서 둘 다 지나간 사례의 처리 규칙을 함께 표시'],
    ['평균·중앙값 수익률, 평균 이익·손실', '비용 차감 수익률의 평균과 중앙값, 이익 사례만의 평균, 손실 사례만의 평균'],
    ['연속 실행 최대낙폭', '사례를 진입 순서대로 매번 전액 실행한다고 가정한 누적 자산의 최고점 대비 최대 하락률'],
  ];

  const CHECKS = [
    ['미래 정보 사용 방지', '신호 판정 함수에는 그 시점까지의 봉만 넘기고, 진입은 다음 봉 시가로 한다.', '엔진 구현 · 가상 데이터로 시험'],
    ['생존편향 점검', '상장폐지된 종목을 포함·제외한 결과를 나란히 계산한다.', '엔진 구현 · 실제 상장폐지 종목 데이터 미확보'],
    ['성공 사례만 고르는 문제', '규칙에 맞는 모든 사례를 자동으로 센다. 사람이 사례를 고르지 않는다.', '엔진 구현'],
    ['개발 기간·검증 기간 분리', '앞 60% 기간과 뒤 40% 기간 결과를 따로 보여준다. 검증 기간을 본 뒤 규칙을 바꾸지 않는다.', '엔진 구현'],
    ['반복·중첩 사례의 의존성', '한 종목에서 보유 중에는 새로 진입하지 않고, 불확실성 범위는 종목 단위로 다시 뽑아(부트스트랩) 계산한다.', '엔진 구현'],
    ['분할·배당 가격 조정 기준', '실제 데이터 연결 시 수정주가 기준과 배당 포함 여부를 결과에 표시한다.', '미구현 · 실제 데이터 필요'],
    ['같은 봉에서 목표가·손절가 동시 통과', '기본은 손절 먼저(보수적). 목표 먼저·제외도 선택해 차이를 확인한다. 동시 통과 건수를 표시한다.', '엔진 구현'],
    ['같은 시장·기간 비교 기준', '같은 종목·같은 기간에 조건 없이 H봉마다 진입한 결과를 함께 보여준다.', '엔진 구현'],
    ['원화 기준 미국 주식 수익률', '달러 기준 수익률과 환율 효과를 나눠 표시한다.', '계산기만 구현 · 통계 미적용'],
  ];

  function universe(cfg) {
    const list = [];
    for (let k = 0; k < cfg.count; k++) {
      const rw = SB.synth.randomWalk({ n: cfg.n, seed: 5000 + k, sigma: cfg.sigma, drift: 0, start: 100, delistBelow: cfg.delistBelow });
      list.push({ id: 'v' + k, bars: rw.bars, delisted: rw.delisted });
    }
    return list;
  }

  function compute(state) {
    const uni = universe({ count: 150, n: 250, sigma: 0.025, delistBelow: 0.6 });
    const delistedN = uni.filter((s) => s.delisted).length;
    const used = state.includeDelisted ? uni : uni.filter((s) => !s.delisted);
    const cfg = { hold: state.hold, target: state.target / 100, stop: state.stop / 100, dd: state.dd / 100, cost: state.cost / 100, sameBarRule: state.sameBar, split: 0.6, totalLen: 250, warmup: 20 };
    const rule = SB.stats.run(used, SB.stats.breakoutSignal(20), cfg);
    const base = SB.stats.run(used, SB.stats.periodicSignal(state.hold), cfg);
    const dev = rule.trades.filter((t) => t.period === 'dev');
    const test = rule.trades.filter((t) => t.period === 'test');
    const baseTest = base.trades.filter((t) => t.period === 'test');
    const col = (tr, seed) => ({ s: SB.stats.summarize(tr), ciPos: SB.stats.bootstrap(tr, 'posRatio', 300, seed), ciMean: SB.stats.bootstrap(tr, 'mean', 300, seed + 1) });
    // 생존편향 비교: 반대 설정 결과
    const other = state.includeDelisted ? uni.filter((s) => !s.delisted) : uni;
    const otherTest = SB.stats.run(other, SB.stats.breakoutSignal(20), cfg).trades.filter((t) => t.period === 'test');
    return { delistedN, usedN: used.length, cols: [col(dev, 11), col(test, 21), col(baseTest, 31)], other: SB.stats.summarize(otherTest), skipped: rule.skippedEnd, cfg };
  }

  function table(res) {
    const c = res.cols;
    const ci = (x) => x ? `<br><span class="small muted">${fmt.pct(x.lo)} ~ ${fmt.pct(x.hi)}</span>` : '<br><span class="small muted">범위 계산 불가</span>';
    const cim = (x) => x ? `<br><span class="small muted">${fmt.spct(x.lo, 2)} ~ ${fmt.spct(x.hi, 2)}</span>` : '';
    const row = (label, fn) => `<tr><th scope="row">${label}</th>${c.map((x) => `<td class="n">${x.s.n ? fn(x) : '계산 불가'}</td>`).join('')}</tr>`;
    return `<div class="table-wrap"><table class="tbl">
      <thead><tr><th>지표</th><th class="n">개발 기간 (1~150봉)<br><small>규칙 적용</small></th><th class="n">검증 기간 (151~250봉)<br><small>규칙 적용</small></th><th class="n">검증 기간<br><small>비교 기준: 조건 없이 진입</small></th></tr></thead>
      <tbody>
        ${row('표본 수', (x) => fmt.n(x.s.n))}
        ${row('양수 비율 (95% 범위)', (x) => fmt.pct(x.s.posRatio) + ci(x.ciPos))}
        ${row('음수 비율', (x) => fmt.pct(x.s.negRatio))}
        ${row(`보유 중 −${res.cfg.dd * 100}% 도달 비율`, (x) => fmt.pct(x.s.ddHitRatio))}
        ${row('손절 먼저 비율', (x) => (x.s.stopFirstRatio == null ? '—' : fmt.pct(x.s.stopFirstRatio)) + `<br><span class="small muted">결정 ${x.s.decided}건 · 미도달 ${x.s.undecided}건</span>`)}
        ${row('같은 봉 동시 통과', (x) => fmt.n(x.s.sameBar) + '건')}
        ${row('평균 수익률 (95% 범위)', (x) => fmt.spct(x.s.mean, 2) + cim(x.ciMean))}
        ${row('중앙값 수익률', (x) => fmt.spct(x.s.median, 2))}
        ${row('평균 이익 / 평균 손실', (x) => fmt.spct(x.s.avgWin, 2) + ' / ' + fmt.spct(x.s.avgLoss, 2))}
        ${row('연속 실행 최대낙폭', (x) => fmt.spct(x.s.mdd, 1))}
      </tbody></table></div>`;
  }

  function render(main) {
    const ui = SB.ui;
    const state = { includeDelisted: true, sameBar: 'stop-first', cost: 0.3, hold: 10, target: 8, stop: 4, dd: 5 };
    main.innerHTML = `<div class="page">
      <div class="section-head"><div><span class="eyebrow">검증·통계</span><h1>확률은 계산한 만큼만 말한다</h1></div>${ui.contextLine()}</div>
      <p class="lead">이 서비스는 AI가 차트 모양을 보고 확률을 지어내지 않습니다. 통계는 정해진 데이터와 규칙으로 누구나 다시 계산할 수 있는 결과만 쓰고, 과거 결과를 미래의 확정 확률로 표현하지 않습니다.</p>

      <section class="section"><h2>보여줄 지표</h2>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>지표</th><th>정의</th></tr></thead><tbody>${METRICS.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>
        <p class="small muted">모든 결과에는 시장, 종목 범위, 기간, 표본 수, 패턴 판정 규칙, 진입·청산 규칙, 비용 가정, 불확실성 범위를 함께 표시합니다.</p>
      </section>

      <section class="section"><h2>패턴별 통계 상태</h2>
        <div class="notice"><strong>모든 패턴: 통계 미검증</strong><span>실제 시장 데이터(공개 이용이 허용된 주가, 상장폐지 종목 포함)가 연결되지 않아 계산할 수 없습니다. 3단계에서 아래 판정 규칙 초안으로 계산합니다.</span></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>패턴</th><th>상태</th><th>판정 규칙 초안</th></tr></thead><tbody>
          ${SB.content.PATTERNS.map((p) => `<tr><td><a href="#/patterns/${p.id}">${esc(p.ko)}</a></td><td><span class="chip unverified">통계 미검증</span></td><td class="small">${esc(p.stats.rule)}</td></tr>`).join('')}
        </tbody></table></div>
      </section>

      <section class="section"><h2>검증할 때 처리하는 것</h2>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>항목</th><th>처리 방법</th><th>현재 상태</th></tr></thead><tbody>
          ${CHECKS.map(([a, b, c]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td><td class="small">${esc(c)}</td></tr>`).join('')}
        </tbody></table></div>
      </section>

      <section class="section" id="engine">
        <h2>계산 엔진 시연</h2>
        <div class="notice synthetic"><strong>설명용 가상 데이터 — 실제 시장 통계가 아닙니다</strong>
          <span>방향성이 없는 무작위 가격 150개로 "20봉 신고가 돌파" 규칙을 계산합니다. 무작위 데이터에는 예측 가능한 패턴이 없으므로, 여기서 나오는 차이는 우연·비용·편향에서 생긴 것입니다. 엔진이 어떻게 계산하고 무엇을 표시하는지 보여주는 용도입니다.</span></div>
        <form class="panel" id="engForm">
          <div class="grid-3">
            <div class="field"><label for="e-hold">보유 기간 (봉)</label><input id="e-hold" type="number" min="2" max="40" value="10"></div>
            <div class="field"><label for="e-target">목표 (+%)</label><input id="e-target" type="number" step="0.5" min="0.5" value="8"></div>
            <div class="field"><label for="e-stop">손절 (−%)</label><input id="e-stop" type="number" step="0.5" min="0.5" value="4"></div>
            <div class="field"><label for="e-dd">하락 도달 기준 (−%)</label><input id="e-dd" type="number" step="0.5" min="0.5" value="5"></div>
            <div class="field"><label for="e-cost">왕복 비용 (%)</label><input id="e-cost" type="number" step="0.05" min="0" value="0.3"></div>
            <div class="field"><label for="e-same">같은 봉 동시 통과 처리</label><select id="e-same"><option value="stop-first">손절 먼저 (보수적)</option><option value="target-first">목표 먼저</option><option value="exclude">경쟁 집계에서 제외</option></select></div>
          </div>
          <label class="row"><input type="checkbox" id="e-delist" checked> 상장폐지된 가상 종목 포함 (끄면 생존편향이 생깁니다)</label>
          <div class="row"><button class="btn primary" type="submit">다시 계산</button><span class="small muted" id="e-status" aria-live="polite"></span></div>
        </form>
        <div id="engOut"></div>
      </section>
    </div>`;
    const form = main.querySelector('#engForm');
    const run = () => {
      state.hold = Math.max(2, Math.min(40, +form.querySelector('#e-hold').value || 10));
      state.target = +form.querySelector('#e-target').value || 8;
      state.stop = +form.querySelector('#e-stop').value || 4;
      state.dd = +form.querySelector('#e-dd').value || 5;
      state.cost = Math.max(0, +form.querySelector('#e-cost').value || 0);
      state.sameBar = form.querySelector('#e-same').value;
      state.includeDelisted = form.querySelector('#e-delist').checked;
      const st = main.querySelector('#e-status');
      st.textContent = '계산 중…';
      setTimeout(() => {
        const t0 = performance.now();
        const res = compute(state);
        const test = res.cols[1].s;
        const sameRule = { 'stop-first': '손절 먼저', 'target-first': '목표 먼저', exclude: '경쟁 집계에서 제외' }[state.sameBar];
        main.querySelector('#engOut').innerHTML = `
          <div class="panel small"><dl class="kv">
            <dt>시장</dt><dd>가상 (무작위 보행, 봉당 표준편차 2.5%, 추세 없음)</dd>
            <dt>종목 범위</dt><dd>가상 종목 150개 중 ${res.usedN}개 사용 · 상장폐지 ${res.delistedN}개 ${state.includeDelisted ? '포함' : '제외'} (가상 규칙: 시작가의 60% 아래로 떨어지면 상장폐지, 마지막 가격으로 청산 처리)</dd>
            <dt>기간</dt><dd>250봉 · 개발 1~150봉 / 검증 151~250봉 (진입 시점 기준)</dd>
            <dt>판정 규칙</dt><dd>종가가 직전 20봉 최고가를 넘으면 신호 (그 시점까지의 봉만 사용)</dd>
            <dt>진입·청산</dt><dd>신호 다음 봉 시가 진입 · ${state.hold}봉째 종가 청산 · 목표 +${state.target}% / 손절 −${state.stop}% 경쟁 별도 집계 · 같은 봉 동시 통과: ${sameRule} · 보유 중 신규 진입 없음</dd>
            <dt>비용 가정</dt><dd>왕복 ${state.cost}% 차감</dd>
            <dt>불확실성 범위</dt><dd>종목 단위 부트스트랩 300회, 2.5~97.5 백분위</dd>
            <dt>가격 조정</dt><dd>해당 없음 (분할·배당이 없는 가상 데이터)</dd>
            <dt>제외 사례</dt><dd>데이터 끝에서 보유 기간을 채우지 못한 ${res.skipped}건</dd>
          </dl></div>
          ${table(res)}
          <div class="notice"><strong>생존편향 비교 (검증 기간)</strong>
            <span>상장폐지 종목 ${state.includeDelisted ? '제외' : '포함'} 시: 표본 ${fmt.n(res.other.n)}건, 양수 비율 ${fmt.pct(res.other.posRatio)}, 평균 ${fmt.spct(res.other.mean, 2)} · 현재 설정: 양수 비율 ${fmt.pct(test.posRatio)}, 평균 ${fmt.spct(test.mean, 2)}</span></div>
          <p class="small muted">읽는 법: 규칙 결과의 범위가 비교 기준과 겹치면 규칙의 효과를 우연과 구분하기 어렵습니다. 이 결과는 가상 데이터에서 나온 것으로 어떤 실제 종목이나 패턴의 성과도 뜻하지 않습니다.</p>`;
        st.textContent = `계산 완료 (${Math.round(performance.now() - t0)}ms)`;
      }, 20);
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
    form.querySelectorAll('select, input[type="checkbox"]').forEach((i) => i.addEventListener('change', run));
    run();
    return { title: '검증·통계' };
  }

  SB.view.stats = render;
  SB.view.statsCompute = compute;
})(window.SB);
