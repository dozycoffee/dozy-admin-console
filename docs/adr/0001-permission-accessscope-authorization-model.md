# ADR-0001: 화면 복제 대신 Permission·AccessScope로 권한 제어

## 상태
Accepted

## 배경 (Context)
DOZY 어드민 콘솔은 본사 MD, 창고 운영자 등 서로 다른 역할이 상품·재고·대시보드 등 상당 부분
겹치는 화면을 사용한다. 역할이 늘어날 때마다 화면 구성이 달라지는 방식을 택하면 유지보수 비용이
역할 수에 비례해 늘어난다.

고려한 대안:
- **역할별 화면/라우트 분리**: 역할마다 별도 페이지 컴포넌트나 라우트 트리를 두는 방식. 구현은
  직관적이지만 상품 관리 같은 공통 화면이 역할 수만큼 복제되고, 화면 로직이 바뀔 때마다 모든
  복제본을 동기화해야 한다.
- **역할(Role) 기반 단일 플래그**: 사용자에게 role 하나만 부여하고 화면에서 role로 분기. 역할이
  늘어나거나 "같은 역할이라도 특정 창고만 접근" 같은 요구가 생기면 분기 조건이 빠르게 복잡해진다.

## 결정 (Decision)
화면·라우트는 공유하고, 접근 제어를 두 축으로 분리한다.

- `Permission`: 기능 단위 허용 여부(`<도메인>.<read|write|manage>`)
- `AccessScope`: 데이터 범위 제한(현재는 `warehouseIds`)

라우트 단위 제어는 `RequirePermission`, 화면 내 기능 단위 제어는 `PermissionGate`로 구현하고, 두
컴포넌트 모두 `Permission` 하나만 인자로 받는 단순한 API를 유지한다. 프런트엔드의 이 체크는 UX
목적이며, 동일한 Permission/AccessScope 검증이 API 서버에서도 반드시 이뤄져야 한다.

## 결과 (Consequences)
- 얻는 것: 새 역할이 추가돼도 화면을 새로 만들 필요 없이 Permission 조합만 정의하면 된다. 권한
  요구사항이 `permissions.ts` 한 곳과 `docs/permission-policy-checklist.md`에 모여 감사하기 쉽다.
- 감수하는 것: "이 화면이 보이려면 Permission이 필요하지만 AccessScope로 추가 필터링도 필요하다"
  같은 조합 조건을 컴포넌트마다 직접 다뤄야 한다 — AccessScope 자체를 선언적으로 강제하는 상위
  추상화는 아직 없다.
- 감사 포인트: `docs/architecture-checklist.md`, `docs/permission-policy-checklist.md`의 권한 관련
  항목이 이 결정을 근거로 한다.
