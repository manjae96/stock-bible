/* 설명용 가상 데이터(합성 차트) 생성기
   - 실제 시장 가격이 아니다. 모양을 설명하기 위해 직접 만든 데이터다.
   - 이 데이터로 계산한 결과는 실제 시장의 성과 통계로 쓰지 않는다.
   - anchors: [[봉 번호, 기준 대비 수준(%)], ...] 를 이어 기본 경로를 만들고, seed로 재현 가능한 잡음을 더한다. */
(function (SB) {
  const MARKET_BASE = {
    KR: { base: 20000, currency: '가상 원', unit: '원', decimals: 0, tick: 10, volBase: 400000 },
    US: { base: 50, currency: '가상 달러', unit: '$', decimals: 2, tick: 0.01, volBase: 1800000 },
    ALL: { base: 100, currency: '가격 지수 (시작=100)', unit: 'pt', decimals: 2, tick: 0.01, volBase: 1000000 },
  };
  /* 봉 주기에 따른 가상 데이터의 성질: 길수록 한 봉의 변동 폭(amp)은 크고, 모양 대비 잡음(noise)은 작게 */
  const TF_SHAPE = {
    m: { amp: 0.3, noise: 1.35 },
    D: { amp: 1.0, noise: 0.9 },
    W: { amp: 1.7, noise: 0.7 },
    M: { amp: 2.6, noise: 0.55 },
  };

  function interp(anchors, i) {
    if (i <= anchors[0][0]) return anchors[0][1];
    for (let k = 1; k < anchors.length; k++) {
      const [x1, y1] = anchors[k];
      const [x0, y0] = anchors[k - 1];
      if (i <= x1) {
        const t = (i - x0) / (x1 - x0 || 1);
        const s = t * t * (3 - 2 * t) * 0.35 + t * 0.65; // 약간 부드러운 보간
        return y0 + (y1 - y0) * s;
      }
    }
    return anchors[anchors.length - 1][1];
  }

  function spikeAt(spikes, i) {
    let m = 1;
    (spikes || []).forEach((s) => {
      if (s.length === 2 && s[0] === i) m *= s[1];
      if (s.length === 3 && i >= s[0] && i <= s[1]) m *= s[2];
    });
    return m;
  }

  function roundTo(v, tick) { return Math.round(v / tick) * tick; }

  /* 패턴 설명용 시계열 */
  function series(opt) {
    const market = opt.market && MARKET_BASE[opt.market] ? opt.market : 'ALL';
    const mb = MARKET_BASE[market];
    const tf = TF_SHAPE[opt.tf] ? opt.tf : 'D';
    const shape = TF_SHAPE[tf];
    const r = SB.rng(opt.seed || 1);
    const n = opt.n || (opt.anchors[opt.anchors.length - 1][0] + 1);
    const noise = (opt.noise != null ? opt.noise : 1) * shape.noise;
    const toPrice = (lv) => mb.base * Math.max(0.05, 1 + (shape.amp * lv) / 100);
    const bars = [];
    let prevC = interp(opt.anchors, 0);
    let dev = 0;
    for (let i = 0; i < n; i++) {
      const p = interp(opt.anchors, i);
      dev = dev * 0.35 + r.gauss() * noise * 0.75;
      let c = p + dev;
      let o = i === 0 ? p - r.gauss() * noise * 0.4 : prevC + r.gauss() * noise * 0.3;
      let h = Math.max(o, c) + Math.abs(r.gauss()) * noise * 0.55;
      let l = Math.min(o, c) - Math.abs(r.gauss()) * noise * 0.55;
      const ov = opt.overrides && opt.overrides[i];
      if (ov) {
        if (ov.o != null) o = ov.o; if (ov.c != null) c = ov.c;
        h = ov.h != null ? ov.h : Math.max(o, c, h); l = ov.l != null ? ov.l : Math.min(o, c, l);
        h = Math.max(h, o, c); l = Math.min(l, o, c);
        dev = c - p;
      }
      const move = Math.abs(c - prevC) / (noise || 1);
      const v = mb.volBase * (0.65 + r.next() * 0.6) * (1 + 0.25 * Math.min(move, 3)) * spikeAt(opt.volume, i);
      bars.push({ i, o: toPrice(o), h: toPrice(h), l: toPrice(l), c: toPrice(c), v: Math.round(v) });
      prevC = c;
    }
    bars.forEach((b) => { ['o', 'h', 'l', 'c'].forEach((k) => { b[k] = roundTo(b[k], mb.tick); }); });
    return {
      bars,
      toPrice: (lv) => roundTo(toPrice(lv), mb.tick),
      meta: {
        synthetic: true, market, currency: mb.currency, unit: mb.unit, decimals: mb.decimals,
        tf, seed: opt.seed, source: '직접 생성한 합성 데이터', asOf: '해당 없음(가상)',
      },
    };
  }

  /* 무작위 보행 시계열 — 통계 엔진 시연, 무작위 연습 문제용
     delistBelow: 시작가 대비 이 비율 아래로 떨어지면 그 시점에서 '상장폐지'로 끝난다 */
  function randomWalk(opt) {
    const r = SB.rng(opt.seed || 7);
    const n = opt.n || 250;
    const sigma = opt.sigma != null ? opt.sigma : 0.02;
    const drift = opt.drift || 0;
    const start = opt.start || 100;
    const bars = [];
    let prev = start;
    let delisted = false;
    for (let i = 0; i < n; i++) {
      const gap = r.gauss() * sigma * 0.3;
      const o = prev * Math.exp(gap);
      const c = o * Math.exp(drift + r.gauss() * sigma * 0.95);
      const h = Math.max(o, c) * Math.exp(Math.abs(r.gauss()) * sigma * 0.5);
      const l = Math.min(o, c) * Math.exp(-Math.abs(r.gauss()) * sigma * 0.5);
      const v = Math.round(1e6 * (0.6 + r.next() * 0.8) * (1 + Math.abs(c / o - 1) / sigma * 0.3));
      bars.push({ i, o, h, l, c, v });
      prev = c;
      if (opt.delistBelow && c < start * opt.delistBelow) { delisted = true; break; }
    }
    return { bars, delisted };
  }

  SB.synth = { series, randomWalk, MARKET_BASE, TF_SHAPE, interp };
})(window.SB);
