# 앱스토어용 앱으로 확장하는 방법

지금의 웹앱을 그대로 감싸 iOS·Android 앱으로 만드는 방식을 전제로 설계했습니다.

## 왜 바로 확장할 수 있나

- 모든 화면이 한 페이지 안에서 `#/...` 주소로 바뀌고, 외부 서버 없이 동작한다.
- 저장은 기기 내 저장소(localStorage) 하나로 모여 있다(`js/core/store.js`). 앱에서 더 안전한 저장소로 바꿀 때 이 파일만 고치면 된다.
- 데이터 공급은 `js/providers/registry.js`로 분리되어 있어 앱과 웹이 같은 서버 중계를 쓴다.
- 하단 탭, 안전 영역(노치) 여백, 터치 확대가 이미 들어 있다.

## 순서 (Capacitor 사용 예)

1. Node.js 설치 후 이 폴더에서 `npm init -y`, `npm install @capacitor/core @capacitor/cli`
2. `npx cap init "주식 투자 바이블" com.example.stockbible --web-dir .`
3. `npm install @capacitor/android @capacitor/ios` → `npx cap add android`, `npx cap add ios`
4. Android Studio / Xcode로 열어 빌드한다(iOS는 Mac 필요).
5. 앱에서는 서비스 워커가 필요 없으므로 `window.SB_NO_SW = true`를 설정한다.

## 출시 전 확인

- 비용: Google Play 25달러(1회), Apple Developer Program 연 99달러(공식 확인 필요)
- 금융 교육 앱은 심사에서 "투자 권유가 아님" 고지와 데이터 출처 표시를 요구받을 수 있다. 이미 화면 곳곳에 학습용·가상 데이터 표시가 있다.
- 개인정보 처리방침 페이지: 지금은 기기 내 저장만 하므로 "서버로 보내는 개인정보 없음"으로 작성 가능. 동기화를 추가하면 갱신 필요.
