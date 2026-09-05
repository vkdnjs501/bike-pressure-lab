# YEONGDEUNGPO BIKE PRESSURE LAB — Beta 4.1.3


## 파일 역할
- `index.html` — 화면 마크업
- `styles.css` — UI 스타일
- `data.js` — 자전거/타이어/노면/기후 데이터
- `engine.js` — 순수 계산 엔진 (DOM 비의존)
- `app.js` — UI 컨트롤러
- `manifest.webmanifest` — PWA 메타데이터
- `sw.js` — 오프라인 캐시
- `preview-single-file.html` — 파일을 바로 열어 보는 단일 HTML 미리보기

## 구조 원칙
`engine.js`는 HTML/DOM을 직접 참조하지 않습니다.
따라서 추후 API, 계산 이력, 관리자 화면, 서버 저장소를 붙여도 계산 엔진을 그대로 재사용할 수 있습니다.

## 개발 서버 실행
ES Module과 Service Worker는 HTTP(S) 환경이 필요합니다.

예:
`python -m http.server 8080`

브라우저:
`http://localhost:8080`

## PWA
manifest, Service Worker, iOS/PWA 아이콘 세트와 iPad/iPhone 시작 화면을 포함합니다.

## Beta 4.0.0 Pressure Model v2
기존의 28mm 로드타이어 기준 단일 거듭제곱식은 제거했습니다.

새 엔진은 Schwalbe의 공개 폭×하중 압력표를 bilinear interpolation으로 보간합니다.
휠 직경, 자전거 종류, 노면, casing, 기온은 그 뒤에 완만한 보정값으로 적용합니다.

CST 26×2.10 Wire 조합은 40–65 PSI 참조 범위를 추가로 적용합니다.
정확한 타이어 측면 표기가 있으면 사용자 입력 MAX PSI가 항상 우선합니다.

## Beta 4.0.0 UI/Reference 개선
- `나의 평균 공기압` 입력란을 제거했습니다.
- 사용자 평소 PSI는 추천 계산에 반영되는 공학적 입력값이 아니므로 혼동을 방지했습니다.
- 결과창에 `REFERENCE BASE`를 추가하여 Schwalbe 폭×하중 기준표에서 도출된 원시 PSI를 직접 표시합니다.
- 그 다음 단계의 휠/차종/타이어/노면 보정값도 별도로 표시합니다.
- 정확한 모델/사이즈별 제조사 범위를 알고 있는 조합은 자동 범위를 표시하며,
  그 외 조합은 타이어 사이드월 MIN/MAX 표기를 우선하도록 안내합니다.

## Beta 4.0.0 Climate Architecture
- 사용자 UI에는 대한민국 17개 1차 행정구역을 제공합니다.
- 내부에는 17×12 데이터를 중복 저장하지 않고 9개 KMA 광역 기후 프로필을 사용합니다.
- 서울/인천/경기는 수도권, 부산/울산/경남은 경남권처럼 공유 프로필에 매핑합니다.
- 기준연도는 2025입니다.
- 시·군·구 이하 데이터는 포함하지 않습니다.
- 기본 선택은 서울특별시입니다.


## Beta 4.1.0 PWA polish
- iOS `apple-touch-icon` 180×180 및 PWA 192/512, maskable 아이콘 추가
- iPad Pro 13형 portrait/landscape 시작 화면 추가
- 홈 화면 이름: `Bike Pressure Lab`
- theme/background color를 `#02070b` 다크 톤으로 통일
- safe-area 및 overscroll 배경 보강: iPad/iPhone 스크롤 끝에서 흰색이 비치는 현상 완화
- Service Worker를 navigation network-first + static stale-while-revalidate 방식으로 개선
- GitHub Pages 하위 경로 배포를 고려해 모든 PWA 경로를 상대경로로 유지


## Beta 4.1.1 UX polish
- 버전 배지는 `BETA 4.1.1`만 표시하고 중앙 정렬된 컴팩트 pill로 정리
- SETUP 하단 계산 버튼을 제거하고 RESULT 권장값 바로 위에 독립 액션 영역으로 이동
- 하중 표기를 `몸무게 / 추가중량 / 자전거중량`, 단위를 `Kg`로 정리
- 하중 우측 보조 문구를 `총중량 계산`으로 변경
- `기본 타이어 폭 D` → `기본 타이어 폭`, `D는 mm 기준` → `폭은 mm 기준`
- 카드·라벨·결과 영역의 세로 리듬과 모바일 여백을 소폭 다듬어 UI 균형 개선


## Beta 4.1.2 UI polish
- 상단 버전 배지는 4.1.0 계열의 우측 정렬 pill 디자인으로 복원하고 `OFFLINE HTML` 문구를 제거
- `HYBRID` → `HYBRID & CITY`, `하이브리드` → `하이브리드 & 생활형`으로 표시명 정리
- 내부 `hybrid` 키와 압력 보정 계수는 그대로 유지하여 계산 로직 무변경
- 하단 출처/계산 원칙은 기본적으로 접힌 `참조` details 영역으로 정리
- Service Worker 캐시 버전을 4.1.2로 갱신


## Beta 4.1.3 Security hardening
- GitHub Pages에서 동작 가능한 `Content-Security-Policy` 메타 정책을 추가하여 외부 스크립트/스타일/프레임/오브젝트 로드를 기본 차단합니다.
- `Referrer-Policy: no-referrer`를 메타 정책으로 적용합니다.
- 계산 입력값을 HTML 속성에만 의존하지 않고 계산 엔진에서도 범위/열거값을 다시 검증합니다.
- 계산 버튼에 300ms 클라이언트 측 연타 제한을 추가하여 매크로성 반복 클릭과 실수 연타를 완화합니다.
- Service Worker는 동일 출처 GET 요청만 처리하며, 정상(`response.ok`) same-origin 응답만 캐시에 기록합니다.
- 렌더링은 기존과 같이 `textContent` 중심이며 `eval`, `innerHTML`, `document.write`를 사용하지 않습니다.

> 한계: GitHub Pages의 정적 클라이언트 코드만으로는 DDoS, 서버 측 봇/Rate Limit, 저장소 계정 탈취를 차단할 수 없습니다. 이 버전은 브라우저/캐시/입력 경계를 강화하는 경량 하드닝입니다.
