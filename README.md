# YEONGDEUNGPO BIKE PRESSURE LAB — Beta 4.3.0


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


## Beta 4.1.4 — Billy Bonkers
- Added 2.00-inch width and Schwalbe Billy Bonkers 20×2.00, 50-406, Performance / ADDIX, folding, tube (11654376).
- Current official global and US product pages, checked 2026-09-06: 30–65 PSI / 2.0–4.5 bar, 67 EPI, 355 g (global page).
- Sources: https://www.schwalbe.com/en/Billy-Bonkers-11654376 and https://www.schwalbetires.com/Billy-Bonkers-11654376
- Selecting the product sets wheel 406 and nominal ETRTO width 50 mm; measured width overrides remain available. Other wheel sizes are rejected for this exact SKU.
- Fine micro teeth and closely spaced blocks support grip on dusty/sandy ground; ramps support rolling. These descriptions do not establish a numeric pressure correction: this product uses a neutral factor 1.00.
- Official PSI floor/ceiling applied after calculation; a lower user MAX is respected, a higher MAX cannot override 65 PSI. MAX below MIN blocks output. Half-PSI rounding cannot exceed a lower MAX.
- Official limits are not a manufacturer recommendation for the calculated riding setup. The general estimator does not model jumping/landing loads.
- Some older catalogues/retailers show 80 PSI: this release uses current exact-SKU official pages. Check the actual sidewall and rim.
- Existing tire calculations unchanged; cache bumped to 4.1.4.


## Beta 4.2.0 — 마이 프리셋

### 사용 방법
1. 원하는 하중·자전거 타입·타이어·휠·노면·기후·고급 값을 입력합니다.
2. 고급 설정 바로 아래의 `마이 프리셋 +`를 펼칩니다.
3. `마이 프리셋 생성`으로 현재 입력값을 담고 `자전거 이름 n`을 변경합니다.
4. `편집 완료`를 누르면 이 브라우저에 저장되고 패널이 접힙니다.
5. 이후 프리셋 이름 버튼을 누르면 모든 입력값을 복원하고 다시 계산합니다.

- 기본 상태는 0개이며 최대 9개까지 저장합니다. 기본 이름은 `마이 프리셋 1~9`입니다.
- 추가·이름 변경·값 갱신·삭제·파일 가져오기는 편집 중인 목록에 반영되고, `편집 완료`에서만 확정합니다.
- 단순히 패널을 접어도 현재 화면의 편집 내용은 남습니다. 저장하지 않고 새로고침하면 미확정 편집은 사라질 수 있습니다.
- `변경 취소`는 마지막으로 저장한 목록을 복원합니다. 계산기 입력값 자체를 되돌리지는 않습니다.
- 기존 프리셋의 수치를 바꾸려면 계산기에 새 값을 입력한 뒤 해당 프리셋의 `편집 → 현재 값으로 갱신 → 편집 완료`를 사용합니다.
- 개별 또는 전체 JSON 파일을 내보낼 수 있습니다. 자동 다운로드가 시작되지 않으면 `프리셋 파일 받기` 링크를 사용합니다.
- 가져오기는 빈 자리에 추가합니다. 9개를 초과하거나 형식·버전·입력값이 잘못된 파일은 전체를 거절하며 기존 목록을 유지합니다.
- 저장은 동일 기기·동일 브라우저·동일 사이트 주소 기준입니다. 브라우저 데이터 삭제에 대비하거나 다른 기기로 옮기려면 파일을 내보내세요.
- 저장 불가·용량 부족·다른 창의 변경 충돌 시 성공으로 표시하지 않고 편집 내용을 보존합니다.

### 화면과 배포
- 원본 상단, 계산 버튼 위치, 계산 엔진과 타이어 데이터는 Beta 4.1.4와 동일합니다. 상단에 프리셋 버튼이나 기획안 제목을 추가하지 않습니다.
- 형광초록은 펼쳐진 프리셋 영역의 작은 생성/완료 버튼에만 사용합니다.
- 서비스워커 캐시는 4.2.0으로 갱신하며 `presets.js`를 오프라인 캐시에 추가합니다. 프리셋 저장 키는 앱 버전과 독립적으로 유지합니다.
- 배포용 파일은 기존과 동일한 정적 HTML/JS입니다. GitHub에는 압축을 푼 파일을 업로드하면 됩니다. npm 설치는 사용이나 GitHub Pages 배포에 필요하지 않습니다.
- 개발/테스트 전용 Vite와 테스트 스크립트를 추가했습니다. `npm install`, `npm test`로 검증하며 `npm run standalone`으로 단일 HTML을 다시 만듭니다.
- HTTP 전용 개발 미리보기에서만 HTTPS 강제 업그레이드를 제외합니다. 배포용 index.html의 보안 정책은 유지합니다.

### 검증 기록
- 자동 테스트 14개 통과: 편집 완료 전후 저장, 재열기/복원, 빈 값 복원, 0~9개 제한, 이름 수정/삭제 취소, 값 갱신, 파일 왕복, 잘못된/큰 파일, 저장 실패, 여러 창 충돌, 텍스트 안전 출력.
- 실제 Chrome 화면에서 생성·이름 변경·편집 완료·새로고침·불러오기·파일 가져오기 검증. 빌리봉커의 앞/뒤 실측 폭과 림 폭·MAX PSI 복원 확인.
- 내보내기 데이터와 다운로드 링크는 자동 테스트로 검증했습니다. 테스트 브라우저의 다운로드 완료 이벤트는 확인되지 않아 직접 받기 링크를 함께 제공합니다. 실제 iPad Safari의 파일 저장은 베타 사용 환경에서 확인이 필요합니다.
- 실제 GitHub Pages 반영은 사용자가 업데이트 파일을 업로드한 뒤 이루어집니다.

## Beta 4.2.1 — Billy Bonkers / 영종도 소형 업데이트

- 폭 선택지에 `2.00\"`(50.8mm 공칭)을 유지하고, 빌리봉커 20×2.00 선택 시 계산에는 해당 SKU의 ETRTO `50-406` 실폭 50mm를 적용합니다. 따라서 공칭 인치값과 계산 입력값의 불일치를 제거했습니다.
- 빌리봉커를 다른 제품에서 새로 선택한 순간에만 20인치(406), 2.00\", MINI VELO가 자동 적용됩니다. 이후 사용자가 폭·휠·차종을 수정하면 같은 제품을 유지하는 동안에는 다시 덮어쓰지 않습니다. 다른 제품을 거친 뒤 빌리봉커를 재선택하면 다시 한 번 적용됩니다.
- 영종도 · 인천공항권을 지역 선택지에 추가했습니다. 기온 기준은 KMA 2025 수도권 광역 기후 프로필(서울·인천·경기와 동일한 앱 내 광역값)을 연동합니다. 영종도 단독 관측값으로 과장하지 않습니다.
- Service Worker 캐시와 화면 버전을 4.2.1로 올렸습니다.

### 확인 근거

- 슈발베의 현행 Billy Bonkers 20×2.00 SKU 11654376: ETRTO 50-406, 30–65 PSI / 2.0–4.5 bar.
- KMA 기후통계의 광역 통계는 서울·인천·경기 등 62개 지점 기반 지역 평균을 제공하며, 이 앱은 해당 광역 프로필 구조를 사용합니다: https://data.kma.go.kr/stcs/grnd/grndTaList.do

## Beta 4.3.0
규격 변경 후 남는 실측 폭 오류 수정, 계산 적용 앞/뒤 폭 표시, 빌리봉커 소개 제거. 계산 비교와 상세 변경점은 RELEASE_NOTES.md를 참고하세요.
