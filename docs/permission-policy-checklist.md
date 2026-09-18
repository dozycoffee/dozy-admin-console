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
| `catalog.read` | 상품 목록 조회 | `/catalog` |
| `catalog.write` | 상품 등록/수정 | `/catalog` 내 등록 버튼 |
| `inventory.read` | 재고·창고 현황 조회 | `/inventory` |
| `inventory.write` | 재고 조정 등 쓰기 동작 | 미구현 — 재고 쓰기 화면 추가 시 적용 |
| `users.manage` | 사용자·권한 관리 | `/users` — 메뉴만 존재, 라우트/화면 미구현
  (`feature_list.json`의 `users-permission-management-page`) |

새 Permission을 추가하면 이 표도 함께 갱신한다.

## 신규 Permission 추가 시 확인

- [ ] `src/features/auth/model/permissions.ts`의 `permissions` 객체에 `<도메인>.<read|write|manage>`
      형식으로 추가했는가?
- [ ] 위 표에 추가했는가?
- [ ] Mock 사용자(`AuthProvider`의 `mockUser`)에도 테스트에 필요한 권한을 반영했는가? (실제 로그인
      연동 전까지는 여기서 접근 가능 범위가 결정된다)
- [ ] API 서버 쪽에도 대응하는 권한 검증이 있는지 확인했는가, 혹은 별도 이슈로 추적하고 있는가?

## 참고

AccessScope는 현재 `warehouseIds` 하나뿐이다. 매장 단위 스코프 등 새로운 축이 필요해지면 구조
변경 근거를 [docs/adr/](adr/README.md)에 남긴다 — 여러 화면의 데이터 필터링 방식에 영향을 주는
되돌리기 번거로운 변경이기 때문이다.
