# PROGRESS

## 현재 상태

문서 체계(AGENT.md/CLAUDE.md/docs/ADR), `httpClient` 공통 에러 처리
(`http-client-error-handling`), GitHub 이슈/PR 템플릿(`github-issue-pr-templates`)에 이어
Vitest 테스트 러너(`testing-setup`)와 GitHub Actions CI(`ci-pipeline`)까지 완료했다. 남은 상태:

- 인증은 `AuthProvider`의 mock 사용자로 동작하며 실제 로그인 API 연동 전
- `httpClient`는 응답/에러 인터셉터로 네트워크 에러·4xx·5xx를 `ApiError`로 통일해 변환하지만,
  Zod 응답 검증 파이프라인은 아직 미연결
- Catalog/Inventory/Dashboard 페이지는 모두 정적 목업 데이터를 보여주는 화면만 구현됨
- `AppLayout`의 `/users` 메뉴는 대응 라우트/화면이 아직 없음
- 이슈/PR은 `.github/ISSUE_TEMPLATE`(feature/bug/refactor)·`.github/PULL_REQUEST_TEMPLATE.md`
  구조를 따르고, 라벨과 GitHub 네이티브 Issue Type(Feature/Bug/Task)을 맞춰 붙인다
  (`docs/git-workflow.md` "이슈/PR 템플릿·라벨·타입" 절 참고)
- 테스트는 Vitest + Testing Library, 소스 파일 옆에 co-location(`*.test.ts(x)`)하는 컨벤션으로
  RequirePermission/PermissionGate/AuthProvider/httpClient(toApiError)에만 우선 작성됨.
  Catalog/Inventory/Dashboard 등 목업 페이지, `AppLayout`, `app/**`는 아직 로직이 없거나
  API 연동 작업과 함께 테스트하기로 미뤄서 커버리지 집계 대상에서 제외(`vite.config.ts`
  `test.coverage.exclude`)
- `.github/workflows/ci.yml`에서 PR/main push마다 lint·typecheck·build·commitlint·
  test+coverage를 병렬 job으로 검증. 커밋 메시지는 `commitlint.config.mjs`로 7개 타입
  (feat/fix/refactor/test/docs/chore/perf)만 허용

다음에 손댈 것은 `feature_list.json`의 `pending` 항목 중 `http-client-error-handling`이 열어준
`zod-response-validation`/`auth-real-login`/`catalog-crud`/
`inventory-dashboard-data` 중 하나다.

## 세션 로그

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

- `ci-pipeline` PR 정리 후, `zod-response-validation` / `auth-real-login` / `catalog-crud` /
  `inventory-dashboard-data` 중 하나를 골라 이슈를 먼저 만들고 `feat/`(또는 `chore/`) 브랜치로 착수
- 새 작업을 시작하기 전 `docs/git-workflow.md`를 다시 읽고 이슈 → 브랜치 → PR 순서를 지킬 것
  (이슈는 템플릿 구조·라벨·네이티브 Issue Type까지 맞춰 작성)
- `feature_list.json`에서 해당 항목을 `in_progress`로 전환하고, 완료 시 `completed` + PROGRESS.md 갱신
- 새 API 연동 작업에서 로직이 생기면 그 파일 옆에 co-location으로 테스트를 같이 추가하고,
  필요하면 `vite.config.ts`의 `test.coverage.exclude`에서 해당 경로를 빼서 커버리지 집계에 포함
