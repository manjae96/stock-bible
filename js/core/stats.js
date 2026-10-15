/* 재현 가능한 수익·손실 통계 계산 엔진
   - AI가 확률을 만들지 않는다. 같은 데이터와 같은 규칙이면 언제나 같은 숫자가 나온다.
   - 신호 판정 함수에는 그 시점까지의 봉만 넘긴다 (미래 정보 사용 방지).
   - 진입은 신호 다음 봉 시가, 비용은 왕복 비율로 차감.
   - 같은 봉에서 목표가·손절가를 모두 지나간 경우의 처리 규칙(sameBarRule)을 결과에 함께 기록.
   - 한 종목에서 보유 중에는 새 진입을 하지 않는다 (중첩 사례 방지).
   - 불확실성 범위는 종목 단위로 다시 뽑는 부트스트랩(같은 종목 사례끼리의 의존성 반영). */
(function (SB) {
  const DEFAULTS = {
    warmup: 20, hold: 10, target: 0.08, stop: 0.04, dd: 0.05, cost: 0.003,
    sameBarRule: 'stop-first', split: 0.6, nonOverlap: true,
  };

  function run(seriesList, signal, cfgIn) {
    const cfg = Object.assign({}, DEFAULTS, cfgIn || {});
    const trades = [];
    let skippedEnd = 0;
    seriesList.forEach((s) => {
      const b = s.bars;
      const splitIdx = Math.floor((cfg.totalLen || b.length) * cfg.split);
      let nextAllowed = 0;
      for (let i = cfg.warmup; i < b.length - 1; i++) {
        if (cfg.nonOverlap && i < nextAllowed) continue;
        const past = b.slice(0, i + 1); // 이 시점까지만
        if (!signal(past, i)) continue;
        const entryIdx = i + 1;
        const entry = b[entryIdx].o;
        let exitIdx = entryIdx + cfg.hold - 1;
        let delistExit = false;
        if (exitIdx > b.length - 1) {
          if (s.delisted) { exitIdx = b.length - 1; delistExit = true; } // 상장폐지: 마지막 가격으로 청산 처리
          else { skippedEnd++; continue; } // 데이터 끝: 결과를 알 수 없어 제외
        }
        const fixedRet = b[exitIdx].c / entry - 1 - cfg.cost;
        const tgt = entry * (1 + cfg.target), stp = entry * (1 - cfg.stop), ddLv = entry * (1 - cfg.dd);
        let ddHit = false, race = 'none', sameBar = false, raceIdx = null;
        for (let k = entryIdx; k <= exitIdx; k++) {
          if (b[k].l <= ddLv) ddHit = true;
          if (race === 'none') {
            const hT = b[k].h >= tgt, hS = b[k].l <= stp;
            if (hT && hS) {
              sameBar = true; raceIdx = k;
              race = cfg.sameBarRule === 'target-first' ? 'target' : cfg.sameBarRule === 'exclude' ? 'excluded' : 'stop';
            } else if (hT) { race = 'target'; raceIdx = k; }
            else if (hS) { race = 'stop'; raceIdx = k; }
          }
        }
        trades.push({
          sid: s.id, entryIdx, exitIdx, entry, fixedRet, ddHit, race, raceIdx, sameBar, delistExit,
          period: entryIdx < splitIdx ? 'dev' : 'test',
        });
        nextAllowed = exitIdx + 1;
      }
    });
    return { trades, skippedEnd, cfg };
  }

  function median(a) {
    if (!a.length) return null;
    const s = a.slice().sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

  function summarize(trades) {
    const n = trades.length;
    if (!n) return { n: 0 };
    const r = trades.map((t) => t.fixedRet);
    const wins = r.filter((x) => x > 0), losses = r.filter((x) => x < 0);
    const decided = trades.filter((t) => t.race === 'target' || t.race === 'stop');
    // 연속 실행 최대낙폭: 진입 순서대로 매번 전액 투입한다고 가정한 누적 자산 곡선
    const seq = trades.slice().sort((a, b) => a.entryIdx - b.entryIdx || String(a.sid).localeCompare(String(b.sid)));
    let eq = 1, peak = 1, mdd = 0;
    seq.forEach((t) => { eq *= 1 + t.fixedRet; peak = Math.max(peak, eq); mdd = Math.min(mdd, eq / peak - 1); });
    return {
      n,
      posRatio: wins.length / n,
      negRatio: losses.length / n,
      mean: mean(r), median: median(r),
      avgWin: mean(wins), avgLoss: mean(losses),
      ddHitRatio: trades.filter((t) => t.ddHit).length / n,
      stopFirstRatio: decided.length ? decided.filter((t) => t.race === 'stop').length / decided.length : null,
      decided: decided.length,
      undecided: trades.filter((t) => t.race === 'none').length,
      sameBar: trades.filter((t) => t.sameBar).length,
      mdd,
      finalEquity: eq,
    };
  }

  /* 종목 단위 부트스트랩: 종목을 복원추출해 같은 종목의 사례를 함께 묶는다 */
  function bootstrap(trades, key, B, seed) {
    const bySid = new Map();
    trades.forEach((t) => { if (!bySid.has(t.sid)) bySid.set(t.sid, []); bySid.get(t.sid).push(t); });
    const groups = Array.from(bySid.values());
    if (groups.length < 5) return null;
    const r = SB.rng(seed || 99);
    const vals = [];
    for (let k = 0; k < (B || 400); k++) {
      const pick = [];
      for (let g = 0; g < groups.length; g++) pick.push.apply(pick, groups[r.int(groups.length)]);
      const s = summarize(pick);
      if (s[key] != null) vals.push(s[key]);
    }
    vals.sort((a, b) => a - b);
    return { lo: vals[Math.floor(vals.length * 0.025)], hi: vals[Math.floor(vals.length * 0.975) - 1] };
  }

  /* 예시 신호: 직전 lookback봉 최고가를 종가로 넘어서면 신호 */
  function breakoutSignal(lookback) {
    return function (past) {
      const i = past.length - 1;
      if (i < lookback) return false;
      let hi = -Infinity;
      for (let k = i - lookback; k < i; k++) hi = Math.max(hi, past[k].h);
      return past[i].c > hi;
    };
  }
  /* 비교 기준: 같은 종목·같은 기간에서 조건 없이 hold봉마다 진입 */
  function periodicSignal(every) { return (past) => (past.length - 1) % every === 0; }

  SB.stats = { run, summarize, bootstrap, breakoutSignal, periodicSignal, DEFAULTS, median, mean };
})(window.SB);
