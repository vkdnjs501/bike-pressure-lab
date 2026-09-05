# YEONGDEUNGPO BIKE PRESSURE LAB — Beta 4.0.0
// Made by. Hyun Seock Son.

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
manifest와 Service Worker 골격은 준비했습니다.
앱 아이콘은 디자인 확정 후 추가하는 것이 좋습니다.

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

