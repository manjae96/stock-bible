/* 내 학습(북마크·오답·진도·백업), 더보기 메뉴, 데이터·출처, 검색 결과 */
(function (SB) {
  const { esc, fmt, norm } = SB.u;
  const store = SB.store;

  function itemTitle(key) {
    const [type, id] = key.split(':');
    if (type === 'term') { const t = SB.content.termById[id]; return t && { title: t.ko, href: '#/terms/' + id, kind: '용어' }; }
    if (type === 'pattern') { const p = SB.content.patternById[id]; return p && { title: p.ko, href: '#/patterns/' + id, kind: '차트 도감' }; }
    if (type === 'lesson') { const l = SB.content.lessonById[id]; return l && { title: l.title, href: `#/${l.area}#${id}`, kind: l.area === 'company' ? '기업 분석' : '위험 관리' }; }
    return null;
  }

  function me(main) {
    const d = store.data;
    const bms = Object.entries(d.bookmarks).sort((a, b) => b[1] - a[1]).map(([k]) => itemTitle(k)).filter(Boolean);
    const qs = SB.ui.allQuestions();
    const wrong = qs.filter((x) => d.quiz[x.qid] && !d.quiz[x.qid].ok);
    const fixed = qs.filter((x) => d.quiz[x.qid] && d.quiz[x.qid].ok && d.quiz[x.qid].everWrong);
    const cats = SB.content.CATS;
    const catRows = Object.entries(cats).map(([k, v]) => {
      const ts = SB.content.TERMS.filter((t) => t.cat === k);
      const vv = ts.filter((t) => store.isViewed('term', t.id)).length;
      return [v, vv, ts.length];
    });
    catRows.push(['차트 도감', SB.content.PATTERNS.filter((p) => store.isViewed('pattern', p.id)).length, SB.content.PATTERNS.length]);
    catRows.push(['강의', SB.content.LESSONS.filter((l) => store.isViewed('lesson', l.id)).length, SB.content.LESSONS.length]);
    main.innerHTML = `<div class="page">
      <div><span class="eyebrow">내 학습</span><h1>북마크 · 오답 · 진도</h1></div>
      <div class="notice ${store.persistent ? '' : 'warn'}"><strong>저장 범위</strong><span>${store.persistent ? '학습 기록은 이 기기의 이 브라우저에만 저장됩니다. 다른 기기와 자동으로 동기화되지 않으며, 브라우저 데이터를 지우면 사라집니다. 아래 백업 파일로 옮길 수 있습니다.' : '이 브라우저에서는 저장이 막혀 있어 창을 닫으면 기록이 사라집니다.'}</span></div>
      <section class="section"><h2>북마크 ${bms.length}개</h2>
        ${bms.length ? `<div class="list">${bms.map((b) => `<a class="list-item" href="${b.href}"><span class="t">${esc(b.title)}</span><span class="chip">${esc(b.kind)}</span></a>`).join('')}</div>` : '<p class="muted">용어·패턴·강의 화면의 ☆ 북마크 버튼으로 추가합니다.</p>'}
      </section>
      <section class="section"><div class="section-head"><h2>오답 노트 ${wrong.length}문제</h2>${wrong.length ? '<a class="btn small" href="#/quiz">오답만 다시 풀기</a>' : ''}</div>
        ${wrong.length ? `<div class="list">${wrong.map((x) => `<a class="list-item" href="#/${x.src.type === 'term' ? 'terms' : 'patterns'}/${x.src.id}"><span class="t">${esc(x.q.q)}</span><span class="chip draft">${d.quiz[x.qid].tries}회 시도</span><span class="d">${esc(x.src.title)}</span></a>`).join('')}</div>` : '<p class="muted">틀린 문제가 없습니다.</p>'}
        ${fixed.length ? `<p class="small muted">한 번 틀렸다가 다시 맞힌 문제 ${fixed.length}개</p>` : ''}
      </section>
      <section class="section"><h2>분야별 진도</h2>
        <div class="table-wrap"><table class="tbl" style="min-width:0"><tbody>${catRows.map(([k, v, t]) => `<tr><th scope="row">${esc(k)}</th><td style="width:50%"><div class="progress"><span style="width:${t ? v / t * 100 : 0}%"></span></div></td><td class="n">${v}/${t}</td></tr>`).join('')}</tbody></table></div>
        <p class="small muted">퀴즈 ${Object.keys(d.quiz).length}문제 풀이 · 연습실 ${d.practice.length}회 · <a href="#/practice">연습 기록 보기</a></p>
      </section>
      <section class="panel"><h2>백업과 초기화</h2>
        <p class="small">다른 기기로 옮기려면 백업 내용을 복사해 그 기기의 이 화면에 붙여 넣으세요.</p>
        <div class="row"><button class="btn" type="button" id="bkShow">백업 내용 보기</button><button class="btn" type="button" id="bkCopy">백업 복사</button></div>
        <div class="field"><label for="bkText">백업 내용 (JSON)</label><textarea id="bkText" rows="5" placeholder="여기에 백업 내용을 붙여 넣고 가져오기를 누르세요"></textarea></div>
        <div class="row"><button class="btn" type="button" id="bkImport">붙여 넣은 내용 가져오기</button></div>
        <hr class="rule">
        <div class="row"><button class="btn" type="button" id="rsAsk">학습 기록 모두 지우기</button></div>
        <div class="notice bad" id="rsConfirm" hidden><span>북마크, 퀴즈 결과, 연습 기록, 설정을 모두 지웁니다. 되돌릴 수 없습니다.</span><div class="row"><button class="btn" type="button" id="rsYes">지우기</button><button class="btn ghost" type="button" id="rsNo">취소</button></div></div>
        <p class="small" id="bkMsg" role="status"></p>
      </section>
    </div>`;
    const msg = main.querySelector('#bkMsg');
    const ta = main.querySelector('#bkText');
    main.querySelector('#bkShow').addEventListener('click', () => { ta.value = store.exportJSON(); ta.focus(); ta.select(); });
    main.querySelector('#bkCopy').addEventListener('click', () => {
      ta.value = store.exportJSON();
      const done = () => { msg.textContent = '백업 내용을 복사했습니다.'; };
      try { navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); msg.textContent = '자동 복사가 막혀 있어 내용을 선택해 두었습니다. 직접 복사하세요.'; }); }
      catch (e) { ta.select(); msg.textContent = '자동 복사가 막혀 있어 내용을 선택해 두었습니다. 직접 복사하세요.'; }
    });
    main.querySelector('#bkImport').addEventListener('click', () => {
      try { store.importJSON(ta.value); msg.textContent = '백업을 가져왔습니다.'; SB.ui.renderPrefbar(); setTimeout(() => SB.app.rerender(), 600); }
      catch (e) { msg.textContent = '가져오지 못했습니다: ' + (e.message.includes('JSON') ? '백업 형식(JSON)이 올바르지 않습니다.' : e.message); }
    });
    const conf = main.querySelector('#rsConfirm');
    main.querySelector('#rsAsk').addEventListener('click', () => { conf.hidden = false; main.querySelector('#rsNo').focus(); });
    main.querySelector('#rsNo').addEventListener('click', () => { conf.hidden = true; });
    main.querySelector('#rsYes').addEventListener('click', () => { store.reset(); SB.ui.renderPrefbar(); SB.u.toast('학습 기록을 지웠습니다'); SB.app.rerender(); });
    return { title: '내 학습' };
  }

  function more(main) {
    const links = [
      ['#/quiz', '퀴즈', '현재 설정·오답·전체 범위 문제'],
      ['#/company', '기업 분석 기초', '실적·재무·공시 읽기와 지표 계산기'],
      ['#/risk', '위험 관리', '손익비·투자 비중·분산·비용 계산기'],
      ['#/stats', '검증·통계', '통계를 어떻게 계산하고 왜 아직 미검증인지'],
      ['#/explore', '종목 탐구', '실제 데이터 연결 상태 (준비 중)'],
      ['#/me', '내 학습', '북마크·오답 노트·진도·백업'],
      ['#/sources', '데이터·출처', '이용 조건·확인일·비용·수정 이력'],
    ];
    main.innerHTML = `<div class="page"><h1>더보기</h1><div class="list">${links.map(([h, t, d]) => `<a class="list-item" href="${h}"><span class="t">${t}</span><span></span><span class="d">${d}</span></a>`).join('')}</div>
      <section class="panel"><h2>학습 설정</h2>${SB.ui.prefsForm('mp')}</section></div>`;
    SB.ui.bindPrefsForm(main, 'mp');
    return { title: '더보기' };
  }

  const DATA_ROWS = [
    { name: '설명용 가상 데이터', use: '학습 차트·연습실·계산 시연', terms: '직접 생성. 제한 없음', checked: '2026-10-15', refresh: '코드 변경 시', status: '사용 중', cost: '무료' },
    { name: 'OpenDART', url: 'https://opendart.fss.or.kr/', use: '한국 공시·재무 (2단계)', terms: '무료 인증키, 1인 1키, 키 공개·대여 금지, 일일 호출 한도 있음(안내 기준 2만 건 수준, 공식 확인 필요). 재무 API는 2015년 이후 사업연도', checked: '2026-10-15', refresh: '공시 접수 시', status: '미연결', cost: '무료' },
    { name: 'SEC EDGAR', url: 'https://www.sec.gov/os/accessing-edgar-data', use: '미국 공시·재무 (2단계)', terms: '무료. 요청 헤더에 User-Agent(이름·연락처) 지정, 초당 10회 이하', checked: '2026-10-15', refresh: '공시 접수 시', status: '미연결', cost: '무료' },
    { name: 'KRX 정보데이터시스템', url: 'https://data.krx.co.kr/', use: '한국 시세 후보', terms: '웹 내려받기 무료. 실시간·대량·상업 이용은 별도 계약과 비용. 공개 서비스 재배포 가능 여부 확인 필요', checked: '2026-10-15', refresh: '일별', status: '권한 확인 전', cost: '무료~계약' },
    { name: 'Alpha Vantage', url: 'https://www.alphavantage.co/', use: '미국 시세 후보', terms: '무료 키 하루 25회·분당 5회(2차 자료 기준). 유료 월 49.99달러부터. 재배포·공개 표시 조건 약관 확인 필요', checked: '2026-10-15', refresh: '일별', status: '권한 확인 전', cost: '무료~월 49.99달러+' },
  ];
  const COSTS = [
    ['지금 (1단계)', '정적 웹 호스팅 (GitHub Pages 또는 Cloudflare Pages)', '0원', '정적 파일만 올리면 됨'],
    ['지금 (1단계)', '도메인 (선택)', '연 1~3만 원 정도', '없어도 무료 주소로 운영 가능'],
    ['2단계', '서버 중계 (API 키 보호, 요청 속도 제한)', '무료 범위에서 시작 가능', 'Cloudflare Workers 등의 무료 등급 한도 안에서. 한도는 공급사 확인'],
    ['2단계', '주가 데이터 공개 표시 권한', '0원 ~ 월 수만~수십만 원', '무료 API는 공개 재배포를 허용하지 않는 경우가 많아 유료 라이선스가 필요할 수 있음'],
    ['3단계', '상장폐지 종목 포함 과거 데이터', '유료 가능성 높음', '생존편향 없는 통계에 필요'],
    ['앱스토어 확장', 'Google Play 개발자 등록', '25달러 (1회)', 'Android 앱 출시용'],
    ['앱스토어 확장', 'Apple Developer Program', '연 99달러 (공식 확인 필요)', 'iOS 앱 출시용, 매년 갱신'],
    ['별도 확장', '사용 시마다 AI 호출', '호출량에 비례', '1단계에는 없음. 도입 시 호출 한도·기존 해설 재사용·장애 시 동작 설계'],
  ];

  function sources(main) {
    main.innerHTML = `<div class="page">
      <div><span class="eyebrow">데이터·출처</span><h1>무엇을 어디서, 어떤 조건으로</h1></div>
      <section class="section"><h2>데이터 공급원</h2>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>공급원</th><th>쓰임</th><th>이용 조건 요약</th><th>확인일</th><th>갱신</th><th>상태</th><th>비용</th></tr></thead><tbody>
          ${DATA_ROWS.map((r) => `<tr><td>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>` : esc(r.name)}</td><td>${esc(r.use)}</td><td class="small">${esc(r.terms)}</td><td class="n">${esc(r.checked)}</td><td>${esc(r.refresh)}</td><td>${esc(r.status)}</td><td>${esc(r.cost)}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="small muted">무료 API로 가져올 수 있다는 것과, 그 데이터를 무료 공개 서비스에 보여줄 수 있다는 것은 다른 문제입니다. 공개 표시·저장·통계 가공·재배포 권한을 각각 확인한 뒤 연결합니다.</p>
      </section>
      <section class="section"><h2>예상 비용</h2>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>시점</th><th>항목</th><th>비용</th><th>필요한 이유</th></tr></thead><tbody>
          ${COSTS.map((c) => `<tr><td>${esc(c[0])}</td><td>${esc(c[1])}</td><td>${esc(c[2])}</td><td class="small">${esc(c[3])}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
      <section class="section"><h2>참고 출처</h2>
        <div class="list">${Object.values(SB.meta.SOURCES).filter((s) => s.url).map((s) => `<a class="list-item" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="t">${esc(s.name)}</span><span></span><span class="d">${esc(s.note)}</span></a>`).join('')}</div>
      </section>
      <section class="panel"><h2>콘텐츠 검토 상태</h2>
        <p>현재 용어 ${SB.content.TERMS.length}개, 패턴 ${SB.content.PATTERNS.length}개, 연습 문제 ${SB.content.PRACTICE.length}개, 강의 ${SB.content.LESSONS.length}개는 모두 <span class="chip draft">AI 초안 · 검토 전</span> 상태입니다. 사람이 출처와 대조해 검토하면 항목별로 "검토 완료"로 바꿉니다.</p>
        <p class="small muted">제도·세율·매매 시간처럼 바뀌는 내용은 작성일 기준 예시로 적고 공식 출처 확인을 안내합니다.</p>
      </section>
      <section class="section"><h2>수정 이력</h2>
        <div class="table-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>날짜</th><th>버전</th><th>내용</th></tr></thead><tbody>${SB.meta.CHANGELOG.map((c) => `<tr><td>${esc(c.date)}</td><td>${esc(c.version)}</td><td>${esc(c.note)}</td></tr>`).join('')}</tbody></table></div>
      </section>
    </div>`;
    return { title: '데이터·출처' };
  }

  function search(main, q) {
    const nq = norm(q);
    const hit = (...xs) => xs.some((x) => norm(x).includes(nq));
    const terms = nq ? SB.content.TERMS.filter((t) => hit(t.ko, t.en, t.abbr, t.def)) : [];
    const pats = nq ? SB.content.PATTERNS.filter((p) => hit(p.ko, p.en, p.summary)) : [];
    const less = nq ? SB.content.LESSONS.filter((l) => hit(l.title, l.intro)) : [];
    const prac = nq ? SB.content.PRACTICE.filter((p) => hit(p.title, p.prompt)) : [];
    const total = terms.length + pats.length + less.length + prac.length;
    // 이름이 정확히 맞는 용어를 먼저
    terms.sort((a, b) => (hit(b.ko, b.abbr) && norm(b.ko + (b.abbr || '')).startsWith(nq)) - (hit(a.ko, a.abbr) && norm(a.ko + (a.abbr || '')).startsWith(nq)));
    const block = (title, arr, fn) => arr.length ? `<section class="section"><h2>${title} ${arr.length}</h2><div class="list">${arr.map(fn).join('')}</div></section>` : '';
    main.innerHTML = `<div class="page">
      <div><span class="eyebrow">검색</span><h1>"${esc(q)}" 결과 ${total}건</h1></div>
      ${total ? '' : '<p class="muted">찾는 내용이 없습니다. 한글명, 영문명, 약어(예: PER, RSI)로 검색해 보세요.</p>'}
      ${block('용어', terms, (t) => `<a class="list-item" href="#/terms/${t.id}"><span class="t">${esc(t.ko)}${t.abbr ? `<small>${esc(t.abbr)}</small>` : ''}</span><span class="chip">${esc(SB.content.CATS[t.cat])}</span><span class="d">${esc(t.def)}</span></a>`)}
      ${block('차트 도감', pats, (p) => `<a class="list-item" href="#/patterns/${p.id}"><span class="t">${esc(p.ko)}</span><span></span><span class="d">${esc(p.summary)}</span></a>`)}
      ${block('강의', less, (l) => `<a class="list-item" href="#/${l.area}#${l.id}"><span class="t">${esc(l.title)}</span><span></span><span class="d">${esc(l.intro)}</span></a>`)}
      ${block('연습 문제', prac, (p) => `<a class="list-item" href="#/practice/${p.id}"><span class="t">${esc(p.title)}</span><span></span><span class="d">${esc(p.prompt)}</span></a>`)}
    </div>`;
    return { title: '검색: ' + q, noLast: true };
  }

  SB.view.me = me;
  SB.view.more = more;
  SB.view.sources = sources;
  SB.view.search = search;
})(window.SB);
