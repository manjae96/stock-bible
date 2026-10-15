/* 종목 탐구: 2단계 실제 데이터 연결 전 상태를 정직하게 표시 */
(function (SB) {
  const { esc } = SB.u;
  const STATUS = { connected: ['연결됨', 'real'], disconnected: ['미연결', 'offline'], unsupported: ['미지원', 'offline'] };

  function render(main) {
    const P = SB.providers.list;
    main.innerHTML = `<div class="page">
      <div class="section-head"><div><span class="eyebrow">종목 탐구 · 2단계 준비 중</span><h1>실제 종목 데이터</h1></div>${SB.ui.contextLine()}</div>
      <div class="notice warn"><strong>아직 실제 데이터가 연결되지 않았습니다</strong>
        <span>공개 표시·저장·통계 가공·재배포 권한을 확인한 데이터만 연결합니다. 확인 전에는 가짜 시세나 분석 결과로 이 화면을 채우지 않습니다.</span></div>
      <form class="panel" onsubmit="return false">
        <div class="field"><label for="exSearch">종목 검색</label><input id="exSearch" disabled placeholder="2단계에서 열립니다 (예: 005930, AAPL)"><span class="hint">검색 기능은 데이터 공급자 연결 후 활성화됩니다.</span></div>
      </form>
      <section class="section"><h2>데이터 공급자 상태</h2>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>데이터</th><th>상태</th><th>막힌 이유 또는 메모</th></tr></thead><tbody>
          ${Object.values(P).map((p) => { const s = STATUS[p.status]; return `<tr><td>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>` : esc(p.name)}<br><span class="small muted">${esc(p.kind)}</span></td><td><span class="chip ${s[1]}">${s[0]}</span></td><td class="small">${esc(p.blocker || p.note || '')}${p.candidates ? `<br>후보: ${esc(p.candidates.join(', '))}` : ''}</td></tr>`; }).join('')}
        </tbody></table></div>
      </section>
      <section class="panel"><h2>실제 차트를 연결하면 표시할 항목</h2>
        <p>실제 데이터 차트는 아래 항목이 모두 채워져야 그려지도록 코드에 막아 두었습니다. 하나라도 빠지면 차트 대신 안내가 나옵니다.</p>
        <dl class="kv">${[['종목', '예: 종목코드와 이름'], ['시장', '한국(코스피·코스닥) 또는 미국(거래소)'], ['통화', '원 또는 달러'], ['봉 주기', '일봉·주봉·월봉'], ['기간', '시작일~종료일'], ['데이터 출처', '공급자 이름과 이용 조건 링크'], ['기준 시점', '마지막 갱신 시각'], ['가격 조정', '수정주가 기준, 배당 반영 여부']].map(([k, v]) => `<dt>${k}</dt><dd class="muted">${v}</dd>`).join('')}</dl>
      </section>
      <section class="panel"><h2>단계별 계획</h2>
        <ol class="stack" style="margin:0;padding-left:1.2em">
          <li><strong>2단계</strong> — 이용이 허용된 주가 데이터, 종목 검색, 과거 일·주·월봉 차트, OpenDART·SEC EDGAR 공시·재무 연결 (서버 중계로 API 키 보호)</li>
          <li><strong>3단계</strong> — 검증 가능한 패턴 통계(검증·통계 화면의 엔진 사용), 기간별 비교, 개인 학습 기록 확장</li>
          <li><strong>이후 검토</strong> — 차트 이미지 업로드 분석. 이미지에서 알 수 없는 가격·기간·거래량을 추측하거나 근거 없는 확률을 출력하지 않는 조건으로만 도입</li>
        </ol>
        <p class="small muted">자세한 비용과 이용 조건은 <a href="#/sources">데이터·출처</a> 화면에 정리했습니다.</p>
      </section>
    </div>`;
    return { title: '종목 탐구' };
  }
  SB.view.explore = render;
})(window.SB);
