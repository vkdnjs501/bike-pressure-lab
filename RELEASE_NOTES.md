# Beta 4.3.0 — Pressure input reliability

Fix stale tire-width overrides that could produce misleading pressure recommendations after changing tire sizes. The selected size now resets previous width measurements, while the applied-width display shows front and rear inputs explicitly. Remove the Billy Bonkers product description and preserve preset restoration and product pressure limits.

Commit: Fix tire-width overrides and streamline pressure setup

## 재현 및 수정

- 빌리봉커 선택으로 설정된 고급 폭 50mm가 28C 규격 선택 후에도 우선하던 오류를 수정했습니다.
- 규격 또는 규격 체계를 직접 변경하면 기본/앞/뒤 실측 폭을 해제합니다. 빌리봉커 2.00인치는 ETRTO 공칭 50mm를 적용합니다(실측값을 의미하지 않습니다).
- 프리셋 불러오기는 저장된 실측값을 그대로 복원합니다. 사용자가 이후 규격을 변경할 때만 해제합니다.
- 계산 적용 폭에 앞/뒤 실측값도 표시합니다. 빌리봉커 제품 소개 문단은 제거하고 계산 결과의 허용 압력 안내는 유지합니다.

## 계산 검토

로드 · 700C · Schwalbe One · 일반도로 · 건조 · 서울 · 9월 · 78+0+12=90kg · 림 폭/MAX 미입력:

| 계산 적용 폭 | 앞 PSI | 뒤 PSI |
| --- | ---: | ---: |
| 이전 50mm가 남은 경우 | 58.5 | 63.5 |
| 정상 28mm | 93.5 | 101.0 |

28mm 기존 모델의 보정 전 기준은 6.7bar(97.175 PSI)입니다. 차종·케이싱·앞뒤 배분·온도 보정 후 위 결과가 나옵니다. 총중량은 몸무게+장비+자전거를 한 번만 합산합니다. 앱은 20℃ 주입 압력이 주행 기준 기온에서 변하는 값으로 온도를 계산하며, 9월 기온은 앱의 기존 광역 프로필 22.8℃입니다.

사용자 비교 사이트 AthletePath는 별도 계산 모델입니다. 공개 참조표의 28mm/85kg 뒷압은 93 PSI, 95kg은 98 PSI로, 이 사이 선형 보간은 약 95.5 PSI입니다. 이는 직접 폼 실행 결과가 아닌 참조표 비교입니다. 약 86/95 PSI를 유일한 정상값으로 단정하거나 계수를 역산해 맞추지 않았습니다. 이번 수정은 재현된 입력 우선순위 결함을 해결하며 기존 압력 계수는 유지합니다.

TPI/EPI를 입력하거나 수치 보정하는 기능은 현재 없습니다. 제품 선택의 기존 소규모 케이싱 계수는 제조사가 검증한 TPI 산식이 아닙니다. 림/튜브 형식과 정확한 SKU가 다르면 권장값과 허용 상한이 달라질 수 있습니다.

참고: https://www.athletepath.com/ko/cycling-tire-pressure-calculator/

제조사 압력 원칙: https://www.schwalbe.com/en/technology-faq/tire-pressure/
