/* 데이터 공급자 목록
   화면은 이 목록만 보고 '연결됨/미연결'을 판단한다. 2단계에서 실제 공급자를 연결할 때 이 파일의 status와
   fetch 함수만 바꾸면 되고, 화면 코드는 그대로 둔다.
   API 키는 절대 이 파일(공개 코드)에 넣지 않는다. 키가 필요한 공급자는 서버 쪽 중계(프록시)를 거친다.
   → docs/DATA_PLAN.md 참고 */
(function (SB) {
  const providers = {
    synthetic: {
      name: '설명용 가상 데이터 (직접 생성)',
      kind: '학습용 차트',
      status: 'connected',
      note: '브라우저에서 seed 값으로 만든 합성 데이터. 실제 시장 통계로 쓰지 않음.',
    },
    krPrice: {
      name: '한국 주가 (일봉·주봉·월봉)',
      kind: '주가',
      status: 'disconnected',
      candidates: ['KRX 정보데이터시스템', '증권사 Open API(개인 이용 조건 확인 필요)'],
      blocker: '공개 표시·저장·통계 가공·재배포 권한 확인 전',
    },
    usPrice: {
      name: '미국 주가 (일봉·주봉·월봉)',
      kind: '주가',
      status: 'disconnected',
      candidates: ['Alpha Vantage (무료 키: 하루 25회)', '유료 데이터 공급사'],
      blocker: '무료 공개 서비스에서 표시·재배포 가능한지 약관 확인 전',
    },
    intraday: {
      name: '분봉 (당일 매매 분석)',
      kind: '주가',
      status: 'unsupported',
      blocker: '1단계 범위 아님. 무료로 공개 표시 가능한 분봉 데이터 미확보',
    },
    opendart: {
      name: 'OpenDART (한국 공시·재무)',
      kind: '공시·재무',
      status: 'disconnected',
      blocker: '인증키를 숨길 서버 중계(프록시) 구성 전',
      url: 'https://opendart.fss.or.kr/',
    },
    edgar: {
      name: 'SEC EDGAR (미국 공시·재무)',
      kind: '공시·재무',
      status: 'disconnected',
      blocker: 'User-Agent 지정과 요청 속도 제한을 지킬 서버 중계 구성 전',
      url: 'https://www.sec.gov/os/accessing-edgar-data',
    },
  };
  function get(id) { return providers[id]; }
  function isConnected(id) { return providers[id] && providers[id].status === 'connected'; }
  /* 2단계에서 구현: 실제 공급자는 { bars, meta } 형태로 돌려주고 meta에 차트 표시 필수 항목을 채운다. */
  async function fetchBars(id) {
    const p = providers[id];
    if (!p || p.status !== 'connected' || !p.fetch) {
      const err = new Error((p ? p.name : id) + ' 데이터가 연결되지 않았습니다.');
      err.code = 'NOT_CONNECTED';
      throw err;
    }
    return p.fetch.apply(p, Array.prototype.slice.call(arguments, 1));
  }
  SB.providers = { list: providers, get, isConnected, fetchBars };
})(window.SB);
