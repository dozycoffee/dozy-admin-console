# 권한 정책 체크리스트

## 목적과 사용법

이 콘솔은 역할별로 화면을 복제하지 않고 `Permission` + `AccessScope`로 접근을 제어한다
([AGENT.md](../AGENT.md) 권한 모델 절 참고). 도메인 비즈니스 규칙 대신 "누가 무엇을 보고 바꿀 수
있는가"가 이 프로젝트의 핵심 규칙이므로, 화면·기능을 추가하거나 변경할 때마다 이 문서로 점검한다.
`docs/architecture-checklist.md`의 권한 항목이 "구현했는가"를 확인한다면, 이 문서는 "무엇을
구현해야 하는가"를 먼저 정의하는 용도다.

## 새 화면/기능 추가 시 정의할 것

- [ ] 이 화면을 보기 위한 최소 Permission은 무엇인가? (`<도메인>.read`)
- [ ] 이 화면 안에서 조회보다 강한 동작(등록/수정/삭제/설정 변경)마다 별도 Permission이 필요한가?
      (`<도메인>.write` 또는 더 세분화된 동작 단위)
- [ ] 이 화면/동작이 특정 창고·매장 범위로 제한되어야 하는가? → `AccessScope.warehouseIds`로
      필터링되는지 확인
- [ ] 권한이 없는 사용자에게 무엇을 보여줄 것인가? — 페이지 자체 접근 불가(`RequirePermission` →
      `/access-denied`)인지, 화면은 보이되 특정 버튼만 잠그는 것(`PermissionGate`)인지 구분했는가?
- [ ] 사이드바 메뉴(`AppLayout`)에 노출할 때 잠금 상태(`잠김` 표기)가 실제 Permission 보유 여부와
      일치하는가?

## 현재 정의된 Permission 목록

| Permission | 의미 | 적용 위치 |
|---|---|---|
| `dashboard.read` | 대시보드 조회 | `/` |
| `inventory.read` | 재고·창고 현황 조회 | `/inventory` |
| `inventory.write` | 재고 조정 등 쓰기 동작 | 미구현 — 재고 쓰기 화면 추가 시 적용 |
| `inbound.read` | 입고 작업 조회 | 창고 관리자 모드의 `/inbounds`, `/inbounds/history` |
| `inbound.write` | 입고 등록, 처리 시작, 품목 검수, 입고 완료 | `/inbounds`의 등록·작업 버튼 |
| `outbound.read` | 출고 작업 조회 | 창고 관리자 모드의 `/outbounds`, `/outbounds/history` |
| `outbound.write` | 출고 요청 등록, 피킹 시작, 검수 시작, 출고 완료 | `/outbounds`의 등록·작업 버튼 |
| `disposal.read` | 폐기 작업 조회 | 창고 관리자 모드의 `/disposals`, `/disposals/history` |
| `disposal.write` | 폐기 요청 등록, 승인, 완료 | `/disposals`의 등록·작업 버튼 |
| `return.read` | 반품 작업 조회 | 창고 관리자 모드의 `/returns`, `/returns/history` |
| `return.write` | 반품 접수 등록, 검수 시작, 품목 검수, 반품 완료 | `/returns`의 등록·작업 버튼 |
| `account.read` | 직원 목록·상세 조회 | 계정 관리자 모드의 `/employees` |
| `account.write` | 직원 초대, 초대 재발송·취소, 정보 수정, 정지·해제·비활성화, 재설정 메일 발송 | `/employees`의 초대·작업 버튼 |
| `account.manage` | owner 전용 계정 관리 — owner·admin 계정 변경 (admin은 불가, GOV-02) | `/employees` 상세의 작업 버튼 (`auth:owner`에만 매핑) |

새 Permission을 추가하면 이 표도 함께 갱신한다.

## 신규 Permission 추가 시 확인

- [ ] `src/features/auth/model/permissions.ts`의 `permissions` 객체에 `<도메인>.<read|write|manage>`
      형식으로 추가했는가?
- [ ] 위 표에 추가했는가?
- [ ] `src/features/auth/model/roleMapping.ts`의 `roleGrants`에서 이 Permission을 줄 dozy-auth role을
      정했는가? (사용자의 허용 모드·Permission은 auth의 role에서 이 파일 한 곳으로 도출된다. 운영 중인 role
      이름과 같아야 부여된다)
- [ ] API 서버 쪽에도 대응하는 권한 검증이 있는지 확인했는가, 혹은 별도 이슈로 추적하고 있는가?

## 참고

AccessScope는 현재 `warehouseIds` 하나뿐이다. dozy-auth에는 창고 개념이 없고 담당 창고 API도 아직 없어,
창고 관련 모드를 가진 사용자의 `warehouseIds`는 환경 변수 `VITE_WAREHOUSE_IDS`로 임시 지정한다. 매장 단위 스코프 등 새로운 축이 필요해지면 구조
변경 근거를 [docs/adr/](adr/README.md)에 남긴다 — 여러 화면의 데이터 필터링 방식에 영향을 주는
되돌리기 번거로운 변경이기 때문이다.
