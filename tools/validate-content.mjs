// 콘텐츠·계산 검사: node tools/validate-content.mjs
// 콘텐츠 파일을 고친 뒤 실행하면 빠진 항목, 끊긴 연결, 잘못된 퀴즈 정답 번호를 찾아준다.
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {}, console, Math, Date, JSON, Object, Array, Number, String, Map, Set, Infinity, isFinite };
ctx.window.SB = {};
vm.createContext(ctx);
const files = ['js/core/util.js', 'js/core/rng.js', 'js/core/synth.js', 'js/core/stats.js', 'js/content/meta.js', 'js/content/terms.js', 'js/content/patterns.js', 'js/content/practice.js', 'js/content/lessons.js'];
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const SB = ctx.window.SB;
const C = SB.content;
const errors = [];
const warn = [];
const err = (m) => errors.push(m);

// 용어
const TERM_REQ = ['id', 'ko', 'en', 'cat', 'lv', 'mk', 'hz', 'def', 'easy', 'ex', 'check', 'limit', 'q', 'src', 'status', 'reviewedAt'];
const ids = new Set();
C.TERMS.forEach((t) => {
  TERM_REQ.forEach((k) => { if (t[k] == null || t[k] === '') err(`용어 ${t.id}: ${k} 없음`); });
  if (ids.has(t.id)) err(`용어 id 중복: ${t.id}`); ids.add(t.id);
  if (![1, 2, 3].includes(t.lv)) err(`용어 ${t.id}: lv 값 오류`);
  if (!C.CATS[t.cat]) err(`용어 ${t.id}: 분류 ${t.cat} 없음`);
  t.mk.forEach((m) => { if (!['KR', 'US'].includes(m)) err(`용어 ${t.id}: 시장 ${m}`); });
  t.hz.forEach((h) => { if (!SB.u.HORIZONS[h]) err(`용어 ${t.id}: 기간 ${h}`); });
  t.rel.forEach((r) => { if (!C.termById[r]) err(`용어 ${t.id}: 관련 용어 ${r} 없음`); });
  t.src.forEach((s) => { if (!SB.meta.SOURCES[s]) err(`용어 ${t.id}: 출처 ${s} 없음`); });
  if (!t.q.o || t.q.a < 0 || t.q.a >= t.q.o.length) err(`용어 ${t.id}: 퀴즈 정답 번호 오류`);
  if (!t.myth.length) warn.push(`용어 ${t.id}: 흔한 오해 없음`);
  if (t.rel.length === 0) warn.push(`용어 ${t.id}: 관련 용어 없음`);
});
if (C.TERMS.length !== 50) err(`용어 수 ${C.TERMS.length} (목표 50)`);

// 패턴
const PAT_REQ = ['id', 'ko', 'en', 'lv', 'kind', 'summary', 'charts', 'conditions', 'where', 'forming', 'confirmed', 'interpretation', 'needs', 'extra', 'successText', 'failureText', 'invalid', 'scenario', 'levelNotes', 'stats', 'quiz'];
C.PATTERNS.forEach((p) => {
  PAT_REQ.forEach((k) => { if (p[k] == null) err(`패턴 ${p.id}: ${k} 없음`); });
  ['success', 'failure'].forEach((k) => { if (!p.charts[k] || !p.charts[k].anchors) err(`패턴 ${p.id}: ${k} 차트 없음`); });
  [...p.terms, ...p.indicators].forEach((t) => { if (!C.termById[t]) err(`패턴 ${p.id}: 용어 ${t} 없음`); });
  if (p.stats.status !== 'unverified') warn.push(`패턴 ${p.id}: 통계 상태 ${p.stats.status} — 근거 확인`);
  if (p.quiz.a < 0 || p.quiz.a >= p.quiz.o.length) err(`패턴 ${p.id}: 퀴즈 정답 번호 오류`);
  [1, 2, 3].forEach((l) => { if (!p.levelNotes[l]) err(`패턴 ${p.id}: 수준 ${l} 설명 없음`); });
});
if (C.PATTERNS.length !== 10) err(`패턴 수 ${C.PATTERNS.length} (목표 10)`);

// 연습 문제: 의도한 결과와 실제 생성된 가상 가격의 결과가 모든 시장·봉 주기에서 맞는지
const outcomeOf = (bars, hide, th) => { const r = bars[bars.length - 1].c / bars[hide - 1].c - 1; return r > th ? 'up' : r < -th ? 'down' : 'flat'; };
C.PRACTICE.forEach((q) => {
  q.patterns.forEach((p) => { if (!C.patternById[p]) err(`연습 ${q.id}: 패턴 ${p} 없음`); });
  q.terms.forEach((t) => { if (!C.termById[t]) err(`연습 ${q.id}: 용어 ${t} 없음`); });
  if (q.random) return;
  for (const market of ['ALL', 'KR', 'US']) for (const tf of ['m', 'D', 'W', 'M']) {
    const s = SB.synth.series({ anchors: q.anchors, n: q.n, seed: q.seed, volume: q.volume, overrides: q.overrides, market, tf });
    const o = outcomeOf(s.bars, q.hide, 0.03 * SB.synth.TF_SHAPE[tf].amp);
    if (o !== q.intended) err(`연습 ${q.id} [${market}/${tf}]: 의도 ${q.intended}, 생성 결과 ${o}`);
    if (s.bars.some((b) => !(b.l <= Math.min(b.o, b.c) && b.h >= Math.max(b.o, b.c) && b.l > 0))) err(`연습 ${q.id} [${market}/${tf}]: OHLC 모순`);
  }
});

// 패턴 차트 OHLC 일관성
C.PATTERNS.forEach((p) => ['success', 'failure'].forEach((k) => {
  for (const tf of ['m', 'D', 'W', 'M']) {
    const s = SB.synth.series(Object.assign({ market: 'KR', tf }, p.charts[k]));
    if (s.bars.some((b) => !(b.l <= Math.min(b.o, b.c) && b.h >= Math.max(b.o, b.c) && b.l > 0))) err(`패턴 ${p.id} ${k} [${tf}]: OHLC 모순`);
  }
}));

// 강의
C.LESSONS.forEach((l) => l.terms.forEach((t) => { if (!C.termById[t]) err(`강의 ${l.id}: 용어 ${t} 없음`); }));

// 통계 엔진 점검
const S = SB.stats;
{
  // 1) 같은 봉 동시 통과 처리
  const bars = [{ o: 100, h: 100, l: 100, c: 100 }, { o: 100, h: 100, l: 100, c: 100 }, { o: 100, h: 110, l: 90, c: 100 }, { o: 100, h: 101, l: 99, c: 100 }, { o: 100, h: 101, l: 99, c: 100 }];
  const run = (rule) => S.run([{ id: 'a', bars }], (past) => past.length - 1 === 1, { warmup: 1, hold: 3, target: 0.05, stop: 0.05, cost: 0, sameBarRule: rule }).trades[0];
  if (run('stop-first').race !== 'stop' || !run('stop-first').sameBar) err('엔진: 손절 먼저 규칙 오류');
  if (run('target-first').race !== 'target') err('엔진: 목표 먼저 규칙 오류');
  if (run('exclude').race !== 'excluded') err('엔진: 제외 규칙 오류');
  // 2) 미래 정보: 신호 함수가 받는 봉 수가 시점 + 1 인지
  let leak = false;
  S.run([{ id: 'b', bars: SB.synth.randomWalk({ n: 60, seed: 3 }).bars }], (past, i) => { if (past.length !== i + 1) leak = true; return false; }, { warmup: 5 });
  if (leak) err('엔진: 신호 함수에 미래 봉이 전달됨');
  // 3) 무작위 데이터의 결과는 비교 기준과 크게 다르지 않아야 함
  const uni = Array.from({ length: 150 }, (_, k) => { const r = SB.synth.randomWalk({ n: 250, seed: 5000 + k, sigma: 0.025, start: 100, delistBelow: 0.6 }); return { id: 'v' + k, bars: r.bars, delisted: r.delisted }; });
  const cfg = { hold: 10, target: 0.08, stop: 0.04, cost: 0.003, split: 0.6, totalLen: 250 };
  const rule = S.run(uni, S.breakoutSignal(20), cfg).trades.filter((t) => t.period === 'test');
  const base = S.run(uni, S.periodicSignal(10), cfg).trades.filter((t) => t.period === 'test');
  const a = S.summarize(rule), b = S.summarize(base);
  const ci = S.bootstrap(rule, 'posRatio', 300, 21);
  const surv = S.summarize(S.run(uni.filter((s) => !s.delisted), S.breakoutSignal(20), cfg).trades.filter((t) => t.period === 'test'));
  console.log(`[엔진 시연 값] 상장폐지 ${uni.filter((s) => s.delisted).length}개 · 규칙(검증) n=${a.n} 양수 ${(a.posRatio * 100).toFixed(1)}% 범위 ${(ci.lo * 100).toFixed(1)}~${(ci.hi * 100).toFixed(1)}% 평균 ${(a.mean * 100).toFixed(2)}% · 비교 기준 n=${b.n} 양수 ${(b.posRatio * 100).toFixed(1)}% 평균 ${(b.mean * 100).toFixed(2)}% · 상장폐지 제외 시 평균 ${(surv.mean * 100).toFixed(2)}%`);
  if (Math.abs(a.posRatio - b.posRatio) > 0.12) warn.push('엔진: 무작위 데이터에서 규칙과 비교 기준 차이가 큼 — 확인 필요');
}
// 4) 연속 손실 확률 (승률 50%, 10회 중 5연패 이상 = 112/1024)
{
  const ctx2 = { window: { SB }, document: undefined };
  const src = fs.readFileSync(path.join(root, 'js/views/risk.js'), 'utf8');
  const m = src.match(/function probRun[\s\S]*?\n  }\n/);
  const probRun = new Function(m[0] + '; return probRun;')();
  const v = probRun(10, 5, 0.5);
  if (Math.abs(v - 112 / 1024) > 1e-9) err(`연속 손실 확률 계산 오류: ${v}`);
}

console.log(`용어 ${C.TERMS.length} · 패턴 ${C.PATTERNS.length} · 연습 ${C.PRACTICE.length} · 강의 ${C.LESSONS.length} · 퀴즈 ${C.TERMS.length + C.PATTERNS.length}`);
warn.forEach((w) => console.log('주의:', w));
if (errors.length) { errors.forEach((e) => console.log('오류:', e)); process.exit(1); }
console.log('검사 통과');
