/* 위험 관리: 강의 + 계산기 (손익비, 투자 비중, 비용, 분산, 낙폭·연속 손실, 환율) */
(function (SB) {
  const { esc, fmt } = SB.u;

  const num = (main, id) => parseFloat(main.querySelector('#' + id).value);
  const field = (id, label, val, hint) => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="number" inputmode="decimal" step="any" value="${val}">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;

  /* 승률 p로 n번 거래할 때 k연패 이상이 한 번이라도 나올 확률 (거래 독립 가정, 동적 계획법) */
  function probRun(n, k, p) {
    const q = 1 - p; // 한 번 질 확률
    // dp[j] = 현재 연패 길이가 j이고 아직 k연패가 없었던 확률
    let dp = new Array(k).fill(0); dp[0] = 1;
    for (let t = 0; t < n; t++) {
      const nd = new Array(k).fill(0);
      for (let j = 0; j < k; j++) {
        nd[0] += dp[j] * p;
        if (j + 1 < k) nd[j + 1] += dp[j] * q;
      }
      dp = nd;
    }
    return 1 - dp.reduce((a, b) => a + b, 0);
  }

  function render(main) {
    const ui = SB.ui;
    const us = SB.store.prefs.market === 'US';
    main.innerHTML = `<div class="page">
      <div class="section-head"><div><span class="eyebrow">위험 관리</span><h1>손익비 · 투자 비중 · 분산 · 비용</h1></div>${ui.contextLine()}</div>
      <p class="lead">모든 계산기는 입력한 숫자로만 계산합니다. 세율·수수료는 바뀔 수 있어 기본값을 0이나 예시로 두었으니 최신 값을 직접 넣으세요.</p>

      <section class="panel" id="rr">
        <h2>손익비와 손익분기 승률</h2>
        <div class="grid-3">${field('rr-entry', '진입가', us ? 50 : 10000)}${field('rr-target', '목표가', us ? 55 : 11000)}${field('rr-stop', '손절가', us ? 47.5 : 9500)}${field('rr-cost', '왕복 비용 (%)', 0.3, '수수료+세금+스프레드 추정')}</div>
        <div id="rr-out" aria-live="polite"></div>
      </section>

      <section class="panel" id="sizing">
        <h2>투자 비중 계산기</h2>
        <div class="grid-3">${field('ps-acct', '계좌 금액', us ? 10000 : 10000000)}${field('ps-risk', '1회 허용 손실 (계좌 대비 %)', 1)}${field('ps-entry', '진입가', us ? 50 : 10000)}${field('ps-stop', '손절가', us ? 47.5 : 9500)}${field('ps-gap', '갭 위험 가정 (손절가 아래 추가 %)', 3, '손절가보다 더 낮게 체결될 가능성')}</div>
        <div id="ps-out" aria-live="polite"></div>
      </section>

      <section class="panel" id="cost">
        <h2>거래비용 계산기</h2>
        <div class="grid-3">${field('c-comm', '수수료 (편도, %)', 0.015)}${field('c-tax', '매도 세금 (%) — 최신 세율 입력', 0, '세율은 정책에 따라 바뀝니다')}${field('c-spread', '스프레드·슬리피지 (왕복, %)', 0.2)}${field('c-fx', '환전 비용 (왕복, %)', us ? 0.5 : 0, '해외 주식일 때')}${field('c-trades', '연간 왕복 횟수', 24)}${field('c-gross', '1회 평균 매매 수익률 (%)', 1)}</div>
        <div id="c-out" aria-live="polite"></div>
      </section>

      <section class="panel" id="div">
        <h2>분산 효과 계산기 (두 자산)</h2>
        <div class="grid-3">${field('d-w', '자산 A 비중 (%)', 50)}${field('d-s1', '자산 A 변동성 (연, %)', 30)}${field('d-s2', '자산 B 변동성 (연, %)', 30)}</div>
        <div class="field"><label for="d-rho">상관관계: <output id="d-rho-v">0.0</output></label><input id="d-rho" type="range" min="-1" max="1" step="0.1" value="0"></div>
        <div id="d-out" aria-live="polite"></div>
      </section>

      <section class="panel" id="dd">
        <h2>낙폭 회복과 연속 손실</h2>
        <div class="grid-3">${field('dd-loss', '손실률 (%)', 30)}${field('dd-p', '승률 (%)', 45)}${field('dd-n', '거래 횟수', 50)}${field('dd-k', '연패 길이', 5)}</div>
        <div id="dd-out" aria-live="polite"></div>
        <p class="small muted">연속 손실 확률은 거래가 서로 독립이라는 가정의 계산입니다. 실제로는 시장 국면에 따라 손실이 몰려 올 수 있습니다.</p>
      </section>

      <section class="panel" id="fx">
        <h2>환율 효과 분리 (미국 주식, 원화 기준)</h2>
        <div class="grid-3">${field('fx-buy', '매수가 (달러)', 100)}${field('fx-sell', '현재가 (달러)', 110)}${field('fx-r0', '매수 시 환율 (원/달러)', 1350)}${field('fx-r1', '현재 환율 (원/달러)', 1300)}</div>
        <div id="fx-out" aria-live="polite"></div>
        <p class="small muted">기본값은 계산 예시이며 실제 환율이 아닙니다.</p>
      </section>

      ${SB.view.lessonsHTML('risk')}
    </div>`;
    SB.view.afterLessons(main, 'risk');

    const kv = (rows) => `<dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd class="num">${v}</dd>`).join('')}</dl>`;
    const calcRR = () => {
      const e = num(main, 'rr-entry'), t = num(main, 'rr-target'), s = num(main, 'rr-stop'), c = num(main, 'rr-cost') / 100;
      const out = main.querySelector('#rr-out');
      if (!(t > e && s < e)) { out.innerHTML = '<p class="notice bad">매수 기준으로 목표가는 진입가보다 높고, 손절가는 낮아야 합니다.</p>'; return; }
      const win = t / e - 1 - c, loss = 1 - s / e + c;
      const rr = (t - e) / (e - s), rrNet = win / loss;
      out.innerHTML = kv([
        ['손익비 (비용 전)', fmt.n(rr, 2) + ' 배'],
        ['손익분기 승률 (비용 전)', fmt.pct(1 / (1 + rr))],
        ['비용 반영 이익 / 손실', fmt.spct(win, 2) + ' / ' + fmt.spct(-loss, 2)],
        ['손익분기 승률 (비용 반영)', win > 0 ? fmt.pct(loss / (win + loss)) : '이익이 비용보다 작음'],
      ]) + '<p class="small muted">손익분기 승률은 목표가와 손절가 중 하나에 반드시 닿는다는 단순 가정입니다.</p>';
    };
    const calcPS = () => {
      const a = num(main, 'ps-acct'), r = num(main, 'ps-risk') / 100, e = num(main, 'ps-entry'), s = num(main, 'ps-stop'), g = num(main, 'ps-gap') / 100;
      const out = main.querySelector('#ps-out');
      if (!(e > s && a > 0 && r > 0)) { out.innerHTML = '<p class="notice bad">손절가는 진입가보다 낮고, 계좌와 허용 손실은 0보다 커야 합니다.</p>'; return; }
      const qty = Math.floor(a * r / (e - s));
      const cap = qty * e;
      const gapLoss = qty * (e - s * (1 - g));
      out.innerHTML = kv([
        ['최대 수량', fmt.n(qty) + ' 주'],
        ['투자금', fmt.n(cap, us ? 2 : 0) + ` (계좌의 ${fmt.pct(cap / a)})`],
        ['계획 손실 (손절 체결 시)', fmt.n(qty * (e - s), us ? 2 : 0) + ` (${fmt.pct(qty * (e - s) / a, 2)})`],
        ['갭 가정 시 손실', fmt.n(gapLoss, us ? 2 : 0) + ` (${fmt.pct(gapLoss / a, 2)})`],
      ]) + (cap > a ? '<p class="notice warn">계산된 투자금이 계좌보다 큽니다. 손절 폭이 너무 좁거나 허용 손실이 큽니다.</p>' : '');
    };
    const calcCost = () => {
      const rt = num(main, 'c-comm') * 2 + num(main, 'c-tax') + num(main, 'c-spread') + num(main, 'c-fx');
      const n = num(main, 'c-trades'), g = num(main, 'c-gross');
      main.querySelector('#c-out').innerHTML = kv([
        ['왕복 비용', rt.toFixed(3) + '%'],
        ['1회 비용 차감 수익률', (g - rt).toFixed(3) + '%'],
        ['연간 비용 합계 (단순 합)', (rt * n).toFixed(2) + '%'],
      ]);
    };
    const calcDiv = () => {
      const w = num(main, 'd-w') / 100, s1 = num(main, 'd-s1') / 100, s2 = num(main, 'd-s2') / 100, rho = +main.querySelector('#d-rho').value;
      main.querySelector('#d-rho-v').textContent = rho.toFixed(1);
      const v = Math.sqrt(Math.max(0, w * w * s1 * s1 + (1 - w) * (1 - w) * s2 * s2 + 2 * w * (1 - w) * rho * s1 * s2));
      const naive = w * s1 + (1 - w) * s2;
      main.querySelector('#d-out').innerHTML = kv([
        ['포트폴리오 변동성', fmt.pct(v)],
        ['단순 가중평균 (상관 1일 때)', fmt.pct(naive)],
        ['분산으로 줄어든 폭', fmt.pct(naive - v)],
      ]);
    };
    const calcDD = () => {
      const L = num(main, 'dd-loss') / 100, p = num(main, 'dd-p') / 100, n = Math.round(num(main, 'dd-n')), k = Math.round(num(main, 'dd-k'));
      const out = main.querySelector('#dd-out');
      if (!(L > 0 && L < 1 && p >= 0 && p <= 1 && n > 0 && k > 0 && n <= 2000)) { out.innerHTML = '<p class="notice bad">손실률은 0~100% 사이, 승률은 0~100%, 횟수는 1~2,000이어야 합니다.</p>'; return; }
      out.innerHTML = kv([
        ['회복에 필요한 수익률', fmt.spct(1 / (1 - L) - 1)],
        [`${n}번 중 ${k}연패 이상이 한 번이라도 나올 확률`, fmt.pct(probRun(n, k, p))],
      ]);
    };
    const calcFX = () => {
      const b = num(main, 'fx-buy'), s = num(main, 'fx-sell'), r0 = num(main, 'fx-r0'), r1 = num(main, 'fx-r1');
      const usd = s / b - 1, fx = r1 / r0 - 1, krw = (1 + usd) * (1 + fx) - 1;
      main.querySelector('#fx-out').innerHTML = kv([
        ['달러 기준 수익률', fmt.spct(usd)],
        ['환율 변화', fmt.spct(fx)],
        ['원화 기준 수익률', fmt.spct(krw)],
        ['교차 효과', fmt.spct(krw - usd - fx, 2)],
      ]);
    };
    const binds = [['rr-', calcRR], ['ps-', calcPS], ['c-', calcCost], ['d-', calcDiv], ['dd-', calcDD], ['fx-', calcFX]];
    binds.forEach(([pre, fn]) => { main.querySelectorAll(`input[id^="${pre}"]`).forEach((i) => i.addEventListener('input', fn)); fn(); });
    return { title: '위험 관리' };
  }

  SB.view.risk = render;
  SB.view.probRun = probRun;
})(window.SB);
