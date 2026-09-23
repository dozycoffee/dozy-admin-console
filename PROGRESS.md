# PROGRESS

## 현재 상태

문서 체계(AGENT.md/CLAUDE.md/docs/ADR), `httpClient` 공통 에러 처리
(`http-client-error-handling`), GitHub 이슈/PR 템플릿(`github-issue-pr-templates`), Vitest 테스트
러너(`testing-setup`), GitHub Actions CI(`ci-pipeline`), `inventory-dashboard-data`,
`zod-response-validation`, `auth-login-ui-mock-backend`에 이어 `remove-catalog-feature`,
`generalize-msw-mocks`, `warehouse-floor-plan-dashboard`, `inventory-location-panel-cleanup`까지
완료했다. 남은 상태:

- 창고 평면도(`WarehouseFloorPlan.tsx`)와 Dashboard의 Zone별 재고 현황 카드는 아직 전용 mock
  데이터(`warehouseMockData.ts`)를 쓴다. `InventoryPage`의 "Zone별 요약"처럼 실 zone-summary
  API로 옮기는 작업은 아직 없음

- **중요 — dozy-wms-api에 CORS 설정이 없다.** 이번 세션에서 처음으로 실제 브라우저로 화면을
  띄워봤는데(이전 세션들은 curl로만 API 응답을 검증), 프런트(5173)에서 백엔드(8080)로 보내는
  실제 요청이 전부 CORS로 막혀 `net::ERR_FAILED`가 난다(`OPTIONS` 프리플라이트 응답에
  `Access-Control-Allow-Origin` 자체가 없음을 확인). `inventory-dashboard-data`도 이 문제 때문에
  실제로는 브라우저에서 정상 동작하지 않는 상태 — 그동안 curl 기반 검증만으로 "완료"라고
  판단한 게 이 결함을 놓친 원인이다. dozy-wms-api에 Spring WebFlux CORS 설정(프런트 origin 허용)
  추가가 필요하며, 프런트 쪽 수정 사항은 없다
- 로그인은 MSW로 `POST /api/auth/login`/`GET /api/auth/me`를 목킹해 실제 로그인
  UI(`LoginPage`)·세션 상태(`AuthProvider`)·인증 가드(`RequireAuth`)·로그아웃까지 완성했다.
  데모 계정은 `dozy`/`dozy1234`. dozy-wms-api ADR-0010과 동일하게 "포트 + mock 어댑터" 패턴이라,
  실제 인증 서비스가 준비되면 `authApi.ts`의 두 함수만 실제 API로 교체하면 된다. **의도적 보류** —
  인증(JWT/JWKS 등 실제 연동)은 별도 MSA로 분리될 예정이며 우선순위가 가장 낮아, 해당 서비스가
  준비되기 전까지 `auth-real-login`(mock 어댑터 교체)/`users-permission-management-page`는
  착수하지 않는다 (`feature_list.json` 참고)
- Catalog 화면은 완전히 제거했다. **`catalog-crud`도 그에 따라 목록에서 제거** — CatalogPage가
  가리키던 완제품(아메리카노 등) 상품 마스터는 dozy-wms-api의 `/api/products`(원부자재)와는 다른
  별도 catalog MSA에서 처리될 예정이며 아직 미구현 상태라, 연동할 API가 없는 미완성 화면을 계속
  띄워두는 대신 지우고 나중에 API가 준비되면 화면부터 새로 만들기로 했다. `permissions.ts`의
  `catalogRead`/`catalogWrite`, `AppLayout`의 "상품 관리" 메뉴, `product` 모델
  (`productSchemas`/`useActiveProducts`)도 함께 제거. 같은 맥락에서 대응 화면이 없던
  `usersManage` 권한과 "사용자·권한" 메뉴도 정리(실제 화면은 `users-permission-management-page`
  착수 시 다시 추가 필요)
- Inventory/Dashboard는 dozy-wms-api 실 API(zone-summary/warehouses/products)로 연동 완료.
  `AccessScope.warehouseIds`를 `string[]`(슬러그) → `number[]`(dozy-wms-api Long id)로 변경했고,
  mock 값은 로컬 dev DB에 실제 등록한 창고 id를 가리킨다 — 다른 개발 DB에서는 이 값을 맞춰야 함
- `AppLayout`의 `/users` 메뉴는 대응 라우트/화면이 아직 없음 (위 인증 보류와 연결됨)
- 이슈/PR은 `.github/ISSUE_TEMPLATE`(feature/bug/refactor)·`.github/PULL_REQUEST_TEMPLATE.md`
  구조를 따르고, 라벨과 GitHub 네이티브 Issue Type(Feature/Bug/Task)을 맞춰 붙인다
  (`docs/git-workflow.md` "이슈/PR 템플릿·라벨·타입" 절 참고)
- 테스트는 Vitest + Testing Library, 소스 파일 옆에 co-location(`*.test.ts(x)`)하는 컨벤션.
  `vite.config.ts`의 `test.coverage.exclude`에서 `pages/catalog`, `pages/access-denied`만 제외
  (로직 없는 정적 화면) — `pages/inventory`, `pages/dashboard`는 실 API 연동으로 로직이 생겨
  커버리지 집계 대상에 포함시킴
- `.github/workflows/ci.yml`에서 PR/main push마다 lint·typecheck·build·commitlint·
  test+coverage를 병렬 job으로 검증. 커밋 메시지는 `commitlint.config.mjs`로 7개 타입
  (feat/fix/refactor/test/docs/chore/perf)만 허용

다음에 손댈 것은 `feature_list.json`의 `pending` 항목 중 의존성 없는 게 더 이상 없다 —
`catalog-crud`/`auth-real-login`/`users-permission-management-page`는 모두 외부 서비스(별도 MSA)
준비를 기다려야 하는 보류 상태다. 백엔드 쪽 진행 상황을 확인해서 보류가 풀리면 그때 착수한다.
그 전에 **dozy-wms-api CORS 설정 추가가 선행되어야** `inventory-dashboard-data`를 포함한 모든
실 API 연동 화면이 브라우저에서 정상 동작한다.

## 세션 로그

### 2026-09-23 (재고 현황 Location 패널 정리 - 적재 현황 탭 통합)

- 이슈(inventory-location-panel-cleanup) 생성, `fix/inventory-location-panel-cleanup` 브랜치에서
  작업 (warehouse-floor-plan-dashboard 위에서 진행)
- 검토 결과 `/inventory/capacity`(`InventoryCapacityPage`)가 재고 현황 페이지의 "Zone별 요약"과
  거의 같은 정보(Zone별 용량/사용률/품질 breakdown)를 중복해서 보여주고 있었음. 유일하게 겹치지
  않던 "작업 처리장 Capacity" 섹션만 `InventoryPage`의 Location별 재고 위쪽으로 옮기고,
  `InventoryCapacityPage`와 그 라우트(`/inventory/capacity`)·메뉴("적재 현황")·전용 CSS
  (`capacity-summary-grid`/`capacity-detail-panel`/`capacity-table`/`capacity-row`)는 제거
- `npm run build`/`npm run lint`/`vitest run`(49개) 통과 확인

### 2026-09-23 (창고 평면도 아이소메트릭 뷰 + Dashboard 개편)

- 이슈(warehouse-floor-plan-dashboard) 생성, `feat/warehouse-floor-plan-dashboard` 브랜치에서
  작업 (generalize-msw-mocks 위에서 진행)
- `WarehouseFloorPlan.tsx` 신규 — usage 비율(`used/capacity`)에 비례해 박스 높이가 변하는 3D
  아이소메트릭 SVG 뷰. hover/click 시 tooltip으로 Location 상세(용량/사용률/품질/냉장 여부) 표시,
  pinch-zoom·pan 지원. `warehouseMockData.ts`(Zone 집계 mock)를 `/warehouse-map`
  페이지(`WarehouseMapPage.tsx`)에서 사용
- `DashboardPage.tsx` 전면 개편 — 업무 대기 카드(`work-grid`), Zone별 재고 현황 카드
  (`dashboard-zone-grid`, `warehouseMockData` 기반), 알림/최근 활동 2단 레이아웃 추가
- `AppLayout.tsx` 개편 — 사이드바 collapse 토글, 로고 이미지, 메뉴 아이콘(`NavIcon`), 활성 메뉴
  슬라이더 애니메이션, 로그아웃 시 `ConfirmModal`(신규 공용 컴포넌트)로 확인 단계 추가. 메뉴를
  대시보드/재고 현황/창고 평면도/적재 현황으로 재편
- `InventoryCapacityPage.tsx`(`/inventory/capacity`) 신규 — 보관 Zone별 상세 + 작업 처리장
  Capacity를 보여주는 별도 탭. **재고 현황 페이지의 "Zone별 요약"과 겹치는 정보라 후속 정리
  필요 사항으로 남김**
- **작업 중 발견한 실수**: 여러 파일을 브랜치별로 되돌리는 과정에서 `AppLayout.test.tsx`의
  최종 버전 내용을 스냅샷 없이 `git checkout HEAD --`로 덮어써서 원문을 복구하지 못했다(한 번도
  커밋된 적 없는 내용이라 git에도, VSCode 로컬 히스토리에도 기록이 없었음). 실제 동작(사이드바
  collapse, 로그아웃 확인 모달 등)은 코드에 그대로 남아있어서, 그 동작을 검증하는 테스트를 새로
  작성해 커버리지 공백만 없앴다 — 원본 테스트 코드의 정확한 문구는 유실됨
- `npm run build`/`npm run lint`/`vitest run`(49개) 통과 확인. 브라우저 도구가 없어 시각적 확인은
  못 함

### 2026-09-23 (MSW mock 구조 일반화)

- 이슈(generalize-msw-mocks) 생성, `chore/generalize-msw-mocks` 브랜치에서 작업 (remove-catalog-feature 위에서 진행 — handlers.ts의 mockUser.permissions가 그 작업에서 제거된 catalogRead를 참조하고 있었음)
- `mocks/handlers.ts`: 인증 전용이던 `authHandlers`를 `mockHandlers`로 이름 변경하고, `GET /api/warehouses/:warehouseId`, `GET /api/inventories/zone-summary` mock 핸들러 추가 (창고/Zone 요약 mock 데이터 포함)
- `mocks/browser.ts`: `authHandlers` → `mockHandlers` import 갱신
- `main.tsx`: MSW 워커 `onUnhandledRequest`를 `'bypass'`(인증 외 요청은 실 백엔드로 통과)에서 `'error'`(BFF 계약이 확정되기 전까지 정의 안 된 `/api/*` 요청은 실패시켜 누락을 바로 드러냄)로 변경
- **주의** — 이 zone-summary mock 핸들러는 `*/api/inventories/zone-summary`처럼 호스트에 상관없이 경로만으로 매칭돼서, 실 백엔드(dozy-wms-api)로 가는 같은 경로 요청도 가로챌 수 있다. `inventory-dashboard-data`가 실 API 연동을 완료했다고 기록돼 있는 것과 이 mock 핸들러가 실제로 언제/어떤 조건에서 상호작용하는지는 이번 작업에서 확인하지 못했다 — 다음에 이 영역을 만지게 되면 짚어볼 것

### 2026-09-23 (Catalog 기능 제거)

- 이슈(remove-catalog-feature) 생성, `chore/remove-catalog-feature` 브랜치에서 작업
- `CatalogPage.tsx`, `features/product`(productSchemas/useActiveProducts, 실 API가 아직 없어
  단 한 번도 실제로 연동된 적 없는 모델) 삭제
- `permissions.ts`에서 `catalogRead`/`catalogWrite`/`usersManage` 제거 — 대응 화면이 없거나
  (usersManage) API가 없는(catalog) permission을 남겨두지 않기로 함
- `AppRouter.tsx`에서 `/catalog` 라우트, `AppLayout.tsx`에서 "상품 관리"·"사용자·권한" 메뉴 제거
- `mocks/handlers.ts`의 데모 계정(`mockUser`) permissions 목록에서도 `catalogRead` 제거
- 관련 테스트(`authSchemas.test.ts`, `PermissionGate.test.tsx`, `RequirePermission.test.tsx`)를
  남아있는 `inventory.read`/`inventory.write` permission 기준으로 갱신
- `feature_list.json`: `catalog-crud`(보류 중이던 항목) 제거, `remove-catalog-feature` 추가 후
  `completed`로 전환. `users-permission-management-page` 설명에 메뉴가 없어졌다는 점 반영

### 2026-09-19 (로그인 UI/세션 아키텍처 — MSW mock 백엔드)

- 이슈 #13(auth-login-ui-mock-backend) 생성, `feat/auth-login-ui-mock-backend` 브랜치에서 작업
- dozy-wms-api ADR-0010("포트 + mock 어댑터")과 같은 발상을 프런트에도 적용: 실제 인증 서비스
  없이도 로그인 UI/세션 아키텍처 자체는 먼저 완성할 수 있다는 게 이번 작업의 핵심 결정
- MSW 도입 — `src/mocks/handlers.ts`에 `POST /api/auth/login`(데모 계정 dozy/dozy1234),
  `GET /api/auth/me` 목킹. `main.tsx`에서 dev 모드에서만 워커 시작(`onUnhandledRequest: 'bypass'`로
  실 백엔드 요청은 그대로 통과)
- `shared/api/authToken.ts` + `httpClient` 요청 인터셉터로 accessToken을 Authorization 헤더에 자동
  첨부
- `AuthContext`/`AuthProvider` 재작성 — `user: CurrentUser | null`, `isLoading`, `login`, `logout`.
  `/api/auth/me` 실패(토큰 만료/무효) 시 자동 로그아웃 처리
- `useCurrentUser` 추가 — `RequireAuth` 하위(인증 보장된 라우트)에서만 쓰는, user가 non-null임을
  보장하는 훅. `InventoryPage`/`DashboardPage`/`AppLayout`이 이걸로 전환
- `RequireAuth`(미인증 시 `/login` 리다이렉트) + `LoginPage` 추가, `AppRouter`에 `/login`을 공개
  라우트로, 나머지를 `RequireAuth`로 감싸도록 재구성. `AppLayout`에 로그아웃 버튼 추가
- **중요 발견**: 이번에 처음으로 이 세션의 브라우저 도구가 실제로 dev 서버(5173)에 접근 가능했다
  (이전 세션들은 접근 자체가 안 돼 curl로만 검증). 로그인/로그아웃/인증 가드는 모두 정상 동작을
  화면으로 확인했지만, 실 백엔드(dozy-wms-api, 8080) 호출은 전부 CORS로 막혀 있음을 발견 —
  `inventory-dashboard-data`가 curl 검증만으로 "완료" 처리됐던 게 이 결함을 놓친 원인. 백엔드에
  CORS 설정 추가가 필요함을 확인하고 사용자에게 전달(위 "현재 상태" 참고)
- 로컬 `.env`가 없어 `VITE_API_BASE_URL`이 비어있던 문제도 함께 발견 — `.env` 생성(미커밋),
  `.gitignore`에 `.env` 추가
- `.claude/launch.json`에 `dozy-wms-api`를 `url`만으로 attach하는 설정 추가 — 브라우저 도구가
  `preview_start`로 등록되지 않은 포트(백엔드)에는 접근하지 못한다는 것도 이번에 확인함
- `feature_list.json`의 `auth-login-ui-mock-backend`를 `completed`로, `auth-real-login`
  description을 "mock 어댑터를 실제 서비스로 교체"로 좁힘

### 2026-09-19 (재고·대시보드 실데이터 연동)

- 이슈 #10(inventory-dashboard-data), #11(zod-response-validation) 생성,
  `feat/inventory-dashboard-data` 브랜치에서 작업
- 착수 전 `catalog-crud`가 가리키는 완제품 카탈로그와 dozy-wms-api의 `/api/products`(원부자재)가
  서로 다른 서비스임을 확인 — catalog는 별도 MSA 미구현이라 이번 작업에서 제외, auth-real-login도
  인증 MSA 후순위 방침에 따라 mock 유지로 보류. 범위를 inventory/dashboard로 좁힘
- dozy-wms-api에 창고 단위 필터링이 없던 문제(zone-summary에 warehouseId 미노출, warehouseIds
  쿼리 파라미터 없음)를 발견해 백엔드에 필요한 API 변경을 요청 → 사용자가 b8ad90c(warehouseId 노출
  + warehouseIds 필터), a3b62bf(CurrentAccessScopeProvider 포트, ADR-0010)로 구현
  - ADR-0010에 따라 `warehouseIds` 필터는 아직 서버 인가 경계가 아니라 클라이언트가 보낸 값을
    그대로 신뢰하는 조회 편의 기능 — 실제 인가는 auth-real-login 이후 과제로 남음
- `permissions.ts`의 `AccessScope.warehouseIds`를 `string[]` → `number[]`로 변경
- `features/inventory`, `features/warehouse`, `features/product`에 각각 zod 스키마 + TanStack
  Query 훅(`useZoneInventorySummary`/`useWarehouses`/`useActiveProducts`) 추가. 창고 목록 API가
  없어 `useWarehouses`는 `useQueries`로 병렬 단건 조회
- `InventoryPage`를 창고별 zone 카드 그룹핑 실 API 연동으로, `DashboardPage`를 운영 상품 수/정상
  가동 창고/평균 창고 가동률(재고 부족 카드는 임계치 API가 없어 계산 가능한 지표로 교체) 실 API
  연동으로 재작성
- `.claude/launch.json` 신규 생성(`npm run dev`, autoPort). 브라우저 도구가 세션 셸에서 띄운
  localhost에 접근 불가능한 구조라 시각적 확인은 못 했고, 대신 dozy-wms-api를 로컬에 직접 띄워
  창고/zone/상품/lot/재고를 시딩한 뒤 실제 API 응답이 zod 스키마와 정확히 일치하는지 curl로
  검증함
- `vite.config.ts` 커버리지 제외 목록에서 `pages/inventory`, `pages/dashboard` 제거(로직 생김)
- `feature_list.json`: `inventory-dashboard-data`, `zod-response-validation` → `completed`,
  `catalog-crud`/`auth-real-login`/`users-permission-management-page`에 보류 사유 기록

### 2026-09-18 (테스트 러너 + CI 파이프라인)

- 이슈 #7(testing-setup), #8(ci-pipeline) 생성, `chore/ci-pipeline` 브랜치에서 두 커밋으로 작업
- vitest, @vitest/coverage-v8, @testing-library/react, @testing-library/jest-dom, jsdom 도입.
  `vite.config.ts`에 test(jsdom, setupFiles, v8 coverage) 연결, `vitest.setup.ts`에서 jest-dom
  매처 등록 + 테스트 간 자동 cleanup(전역 `afterEach` 없이 명시적으로 등록)
  - RTL 자동 cleanup은 `test.globals: true`가 없으면 동작하지 않아 테스트 간 DOM이 누적되는
    문제를 겪음 — `vitest.setup.ts`에 `afterEach(cleanup)`을 직접 등록해 해결
- `httpClient.ts`의 `toApiError`를 export해 순수 함수로 단위 테스트
- RequirePermission/PermissionGate/AuthProvider(can())/httpClient(toApiError) 테스트 작성.
  전체 커버리지는 로직이 없는 pages/app/shared-ui를 제외하고 약 90%
- `.github/workflows/ci.yml` 작성 — lint/typecheck/build/test+coverage(커버리지 리포트를
  artifact로 업로드)/commitlint 5개 job. `commitlint.config.mjs`로 7개 커밋 타입만 허용,
  `subject-case` 룰은 한글 제목과 충돌해 비활성화
- `feature_list.json`의 `testing-setup`, 신규 `ci-pipeline`(deps: testing-setup)을 `completed`로

### 2026-09-18 (GitHub 이슈/PR 템플릿)

- `.github/ISSUE_TEMPLATE/{feature,bug,refactor}.md`, `config.yml`, `.github/PULL_REQUEST_TEMPLATE.md`,
  `.github/assets/dozycoffee_banner.png`를 원격에 반영
- 저장소에 `feature`, `refactor` 라벨 추가(`bug`는 기존 라벨 재사용)
- `docs/git-workflow.md`에 "이슈/PR 템플릿·라벨·타입" 절 추가 — 템플릿 구조·라벨·GitHub 네이티브
  Issue Type(Feature/Bug/Task) 매핑 규칙 명문화
- `feature_list.json`에 `github-issue-pr-templates` 항목 추가 후 바로 `completed`로 전환

### 2026-09-18 (httpClient 에러 처리)

- 이슈 #3 생성, `feat/http-client-error-handling` 브랜치에서 작업
- `src/shared/api/ApiError.ts` 추가 — `status`(null이면 네트워크 에러), `code`, `cause`를 갖는
  공통 에러 타입
- `src/shared/api/httpClient.ts`에 response 인터셉터 추가 — axios 에러를 네트워크 에러/4xx/5xx
  구분 없이 `ApiError`로 변환해 reject. 서버가 `message`/`code` 필드를 내려주면 그대로 보존하고,
  없으면 상황별 기본 메시지로 대체
- 테스트 러너가 아직 없어(`testing-setup` 참고) `npm run build`/`npm run lint`로만 검증
- `feature_list.json`의 `http-client-error-handling`을 `completed`로 전환

### 2026-09-18 (docs-foundation)

- AGENT.md 작성 — 프로젝트 개요, 폴더 구조 배치 기준, 권한 모델(Permission/AccessScope), 서버 상태
  관리(TanStack Query), API 연동 원칙, 라우팅 규칙 정리
- CLAUDE.md 작성 — AGENT.md를 가리키는 보충 문서로 구성, 세션 시작 시/행위 직전 읽을 문서 안내
- docs/architecture-checklist.md, docs/permission-policy-checklist.md 작성
- docs/adr/ 디렉터리 생성 — README(템플릿·목록) + ADR-0001(Permission/AccessScope 모델),
  ADR-0002(TanStack Query), ADR-0003(Zod 응답 검증) 작성
- docs/git-workflow.md 작성 — main 기준 feat/fix/chore 브랜치 전략, 기능 단위 이슈 작성 규칙, PR에
  이슈 연결하는 규칙 확립
- feature_list.json, PROGRESS.md 작성 — 현재 코드 상태(mock 인증, 미연결 httpClient, 목업 데이터
  화면들, 미구현 /users, 테스트 부재)를 반영한 초기 백로그 8건 등록

## 다음 세션에서 할 일

- **dozy-wms-api에 CORS 설정 추가가 최우선** — 이게 없으면 `inventory-dashboard-data`를 포함해
  실 API를 부르는 모든 화면이 브라우저에서 동작하지 않는다. 프런트 쪽에서 할 일은 없고, 백엔드에
  Spring WebFlux CORS 설정(프런트 origin 허용)만 추가하면 됨
- `feature_list.json`의 `pending` 3건(`catalog-crud`/`auth-real-login`/
  `users-permission-management-page`)은 모두 별도 MSA(카탈로그/인증) 준비를 기다리는 보류 상태 —
  해당 서비스 쪽 진행 상황을 먼저 확인한 뒤 보류가 풀리면 착수
- dozy-wms-api ADR-0010에서 "이번 범위에서 제외"로 명시한 항목들(auditorAware/
  ProductService.DELETED_BY_SYSTEM의 CurrentAccessScopeProvider 교체, warehouseIds 필터와
  AccessScope의 교차검증)은 실제 인증이 붙는 시점에 auth-real-login과 함께 처리해야 함을 기억할 것
- 새 작업을 시작하기 전 `docs/git-workflow.md`를 다시 읽고 이슈 → 브랜치 → PR 순서를 지킬 것
  (이슈는 템플릿 구조·라벨·네이티브 Issue Type까지 맞춰 작성)
- `feature_list.json`에서 해당 항목을 `in_progress`로 전환하고, 완료 시 `completed` + PROGRESS.md 갱신
- 새 API 연동 작업에서 로직이 생기면 그 파일 옆에 co-location으로 테스트를 같이 추가하고,
  필요하면 `vite.config.ts`의 `test.coverage.exclude`에서 해당 경로를 빼서 커버리지 집계에 포함
- UI를 브라우저로 검증하려면 `.claude/launch.json`의 `dozy-wms-api` 항목으로 백엔드를 먼저
  `preview_start` attach해야 한다(등록 안 된 포트는 브라우저 도구가 접근 못 함). 로컬 `.env`도
  있어야 `VITE_API_BASE_URL`이 올바르게 잡힌다
