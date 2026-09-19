# PROGRESS

## 현재 상태

문서 체계(AGENT.md/CLAUDE.md/docs/ADR), `httpClient` 공통 에러 처리
(`http-client-error-handling`), GitHub 이슈/PR 템플릿(`github-issue-pr-templates`), Vitest 테스트
러너(`testing-setup`), GitHub Actions CI(`ci-pipeline`)에 이어 `inventory-dashboard-data`와
`zod-response-validation`까지 완료했다. 남은 상태:

- 인증은 여전히 `AuthProvider`의 mock 사용자로 동작. **의도적 보류** — 인증은 별도 MSA로 분리될
  예정이며 우선순위가 가장 낮아, 해당 서비스가 준비되기 전까지 `auth-real-login`/
  `users-permission-management-page`는 착수하지 않는다 (`feature_list.json` 참고)
- Catalog는 여전히 정적 목업. **의도적 보류** — CatalogPage가 가리키는 완제품(아메리카노 등) 상품
  마스터는 dozy-wms-api의 `/api/products`(원부자재)와는 다른 별도 catalog MSA에서 처리될 예정이며
  아직 미구현이라 연동할 API가 없다
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

## 세션 로그

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
- 이 세션에서는 Claude Browser 도구가 세션 셸의 localhost에 접근하지 못해 UI를 눈으로 직접 보지
  못했다(대신 실 백엔드에 curl로 응답 스키마만 검증) — 다음 세션에서 브라우저로 실제 렌더링을
  확인할 방법이 있는지 확인하거나, 사용자에게 직접 `npm run dev`로 확인을 요청할 것
