/* 출처·검토 상태·수정 이력
   콘텐츠의 검토 상태:
   - 'ai-draft'  : AI가 작성한 초안. 사람이 검토하기 전.
   - 'reviewed'  : 사람이 출처와 대조해 검토 완료. reviewedBy, reviewedAt을 함께 적는다.
   지금 들어 있는 콘텐츠는 모두 'ai-draft'다. 검토를 마치면 각 항목의 status를 바꾼다. */
(function (SB) {
  const SOURCES = {
    krx: { name: '한국거래소(KRX)', url: 'https://www.krx.co.kr/', note: '거래 제도(가격제한폭, 매매 시간, 호가단위)의 공식 안내처' },
    krxData: { name: 'KRX 정보데이터시스템', url: 'https://data.krx.co.kr/', note: '시세·지수 통계. 웹 내려받기는 무료, 실시간·대량·상업 이용은 별도 계약' },
    dart: { name: '금융감독원 전자공시(DART)', url: 'https://dart.fss.or.kr/', note: '한국 공시 원문' },
    opendart: { name: 'OpenDART', url: 'https://opendart.fss.or.kr/', note: '한국 공시·재무 API. 무료 인증키(1인 1키, 공개 금지)' },
    edgar: { name: 'SEC EDGAR', url: 'https://www.sec.gov/os/accessing-edgar-data', note: '미국 공시. 무료, User-Agent 필수, 초당 10회 이하' },
    investor: { name: 'Investor.gov 용어 사전 (미국 SEC)', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary', note: '미국 투자자 교육 용어 설명' },
    finra: { name: 'FINRA 투자자 안내', url: 'https://www.finra.org/investors', note: '미국 주문 방식·거래 비용 안내' },
    kofia: { name: '금융투자협회', url: 'https://www.kofia.or.kr/', note: '한국 투자자 교육·수수료 비교' },
    nts: { name: '국세청', url: 'https://www.nts.go.kr/', note: '주식 관련 세금은 이곳과 증권사 안내에서 최신 기준 확인' },
    fsc: { name: '금융위원회', url: 'https://www.fsc.go.kr/', note: '공매도 등 제도 변경 발표' },
    textbook: { name: '일반 금융·통계 교재 수준의 개념', url: '', note: '특정 출처에 의존하지 않는 정의. 검토 시 교재와 대조 필요' },
  };

  const CHANGELOG = [
    { date: '2026-10-15', version: '0.1.0', note: '1단계 첫 버전: 용어 50개, 차트 패턴 10개, 연습 문제 8개, 퀴즈, 북마크, 학습 기록, PWA. 모든 콘텐츠 AI 초안 상태.' },
  ];

  const REVIEW = {
    'ai-draft': { label: 'AI 초안 · 검토 전', cls: 'draft', desc: 'AI가 작성한 초안입니다. 사람이 출처와 대조해 검토하기 전이므로 틀린 부분이 있을 수 있습니다.' },
    reviewed: { label: '검토 완료', cls: 'reviewed', desc: '사람이 출처와 대조해 검토했습니다.' },
  };

  const CONTENT_DATE = '2026-10-15';

  SB.meta = { SOURCES, CHANGELOG, REVIEW, CONTENT_DATE };
})(window.SB);
