/* 기기 내 저장소 (localStorage)
   - 학습 설정, 북마크, 학습 기록, 퀴즈 결과, 연습실 기록을 이 브라우저에만 저장한다.
   - 여러 기기 동기화는 아직 없다. 백업 파일 내보내기·가져오기로 옮길 수 있다.
   - 저장이 막힌 환경(사생활 보호 창 등)에서는 메모리에만 두고 화면에 알린다. */
(function (SB) {
  const KEY = 'sb:v1';
  const SCHEMA = 1;
  const defaults = () => ({
    schema: SCHEMA,
    prefs: { level: 1, market: 'ALL', horizon: 'swing', tf: 'D', annot: true },
    bookmarks: {},   // "term:per" -> 저장 시각
    viewed: {},      // "term:per" -> 마지막 열람 시각
    quiz: {},        // 문제 id -> { ok, tries, ts }
    practice: [],    // 연습실 기록
    last: null,      // { route, title, ts } 이어서 공부하기
  });

  let data = defaults();
  let persistent = true;
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const d = defaults();
        data = Object.assign(d, parsed, { prefs: Object.assign(d.prefs, parsed.prefs || {}) });
      }
      localStorage.setItem(KEY + ':probe', '1');
      localStorage.removeItem(KEY + ':probe');
    } catch (e) {
      persistent = false;
    }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); persistent = true; }
    catch (e) { persistent = false; }
    listeners.forEach((fn) => { try { fn(data); } catch (e) { /* 무시 */ } });
  }

  const store = {
    get data() { return data; },
    get prefs() { return data.prefs; },
    get persistent() { return persistent; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    setPref(k, v) { data.prefs[k] = v; save(); },
    key(type, id) { return type + ':' + id; },
    isBookmarked(type, id) { return !!data.bookmarks[type + ':' + id]; },
    toggleBookmark(type, id) {
      const k = type + ':' + id;
      if (data.bookmarks[k]) delete data.bookmarks[k]; else data.bookmarks[k] = Date.now();
      save();
      return !!data.bookmarks[k];
    },
    markViewed(type, id) { data.viewed[type + ':' + id] = Date.now(); save(); },
    isViewed(type, id) { return !!data.viewed[type + ':' + id]; },
    recordQuiz(qid, ok) {
      const prev = data.quiz[qid] || { tries: 0 };
      data.quiz[qid] = { ok, tries: prev.tries + 1, ts: Date.now(), everWrong: prev.everWrong || !ok };
      save();
    },
    addPractice(rec) { data.practice.unshift(rec); data.practice = data.practice.slice(0, 200); save(); },
    setLast(route, title) { data.last = { route, title, ts: Date.now() }; save(); },
    exportJSON() { return JSON.stringify(Object.assign({ exportedAt: new Date().toISOString(), app: '주식 투자 바이블' }, data), null, 2); },
    importJSON(text) {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.prefs) throw new Error('주식 투자 바이블 백업 파일이 아닙니다.');
      const d = defaults();
      data = Object.assign(d, parsed, { prefs: Object.assign(d.prefs, parsed.prefs) });
      delete data.exportedAt; delete data.app;
      save();
    },
    reset() { data = defaults(); save(); },
  };
  load();
  SB.store = store;
})(window.SB);
