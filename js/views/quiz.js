/* 퀴즈: 현재 설정 / 오답만 / 전체 범위에서 문제를 골라 한 문제씩 */
(function (SB) {
  const { esc } = SB.u;
  const store = SB.store;
  let session = null;

  function pool(scope) {
    const { f } = SB.ui;
    const all = SB.ui.allQuestions();
    if (scope === 'wrong') return all.filter((x) => store.data.quiz[x.qid] && !store.data.quiz[x.qid].ok);
    if (scope === 'all') return all;
    return all.filter((x) => f.levelOK(x) && f.marketOK(x) && f.horizonOK(x));
  }
  function shuffle(a, seed) {
    const r = SB.rng(seed);
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = r.int(i + 1); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  }

  function start(main, scope, count) {
    const p = pool(scope);
    session = { scope, items: shuffle(p, Date.now() >>> 0).slice(0, count), i: 0, right: 0 };
    step(main);
  }

  function step(main) {
    const s = session;
    if (s.i >= s.items.length) {
      main.innerHTML = `<div class="page"><span class="eyebrow">퀴즈 결과</span><h1>${s.items.length}문제 중 ${s.right}문제 정답</h1>
        <p class="lead">틀린 문제는 오답 노트에 남았습니다. 해당 용어나 패턴 화면에서 설명을 다시 읽어 보세요.</p>
        <div class="row"><button class="btn primary" type="button" id="qAgain">같은 범위로 다시</button><a class="btn" href="#/me">오답 노트</a><a class="btn" href="#/quiz">범위 바꾸기</a></div></div>`;
      main.querySelector('#qAgain').addEventListener('click', () => start(main, s.scope, s.items.length));
      session = null;
      return;
    }
    const it = s.items[s.i];
    main.innerHTML = `<div class="page">
      <div class="section-head"><span class="eyebrow">퀴즈 ${s.i + 1} / ${s.items.length}</span><span class="small muted">정답 ${s.right}</span></div>
      <div class="progress"><span style="width:${(s.i / s.items.length) * 100}%"></span></div>
      <div id="qBox"></div>
      <p class="small">출처 화면: <a href="#/${it.src.type === 'term' ? 'terms' : 'patterns'}/${it.src.id}">${esc(it.src.title)}</a></p>
      <div class="row"><button class="btn primary" type="button" id="qNext" disabled>다음 문제</button></div>
    </div>`;
    const next = main.querySelector('#qNext');
    SB.ui.quiz(main.querySelector('#qBox'), it.qid, it.q, (ok) => { if (ok) s.right++; next.disabled = false; next.focus(); });
    next.addEventListener('click', () => { s.i++; step(main); });
  }

  function home(main) {
    const now = pool('current').length, wrong = pool('wrong').length, all = pool('all').length;
    main.innerHTML = `<div class="page">
      <div class="section-head"><div><span class="eyebrow">퀴즈</span><h1>개념 확인 문제</h1></div>${SB.ui.contextLine()}</div>
      <form class="panel" id="qStart">
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl">범위</legend><div class="seg">
          <input type="radio" name="qs" id="qs-current" value="current" checked ${now ? '' : 'disabled'}><label for="qs-current">현재 설정<small>${now}문제</small></label>
          <input type="radio" name="qs" id="qs-wrong" value="wrong" ${wrong ? '' : 'disabled'}><label for="qs-wrong">오답만<small>${wrong}문제</small></label>
          <input type="radio" name="qs" id="qs-all" value="all"><label for="qs-all">전체<small>${all}문제</small></label>
        </div></fieldset>
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl">문제 수</legend><div class="seg">
          <input type="radio" name="qn" id="qn-5" value="5" checked><label for="qn-5">5문제</label>
          <input type="radio" name="qn" id="qn-10" value="10"><label for="qn-10">10문제</label>
        </div></fieldset>
        <div class="row"><button class="btn primary" type="submit">시작</button></div>
      </form>
    </div>`;
    if (!now) main.querySelector('#qs-all').checked = true;
    main.querySelector('#qStart').addEventListener('submit', (e) => {
      e.preventDefault();
      const scope = main.querySelector('input[name="qs"]:checked').value;
      const n = +main.querySelector('input[name="qn"]:checked').value;
      start(main, scope, n);
    });
  }

  SB.view.quiz = (main) => { home(main); return { title: '퀴즈' }; };
})(window.SB);
