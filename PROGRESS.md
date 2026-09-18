# PROGRESS

## 현재 상태

문서 체계(AGENT.md/CLAUDE.md/docs/ADR)와 작업 관리 파일(feature_list.json/PROGRESS.md)에 이어
`httpClient` 공통 에러 처리(`http-client-error-handling`)까지 완료했다. 남은 상태:

- 인증은 `AuthProvider`의 mock 사용자로 동작하며 실제 로그인 API 연동 전
- `httpClient`는 응답/에러 인터셉터로 네트워크 에러·4xx·5xx를 `ApiError`로 통일해 변환하지만,
  Zod 응답 검증 파이프라인은 아직 미연결
- Catalog/Inventory/Dashboard 페이지는 모두 정적 목업 데이터를 보여주는 화면만 구현됨
- `AppLayout`의 `/users` 메뉴는 대응 라우트/화면이 아직 없음
- 테스트 러너 미도입

다음에 손댈 것은 `feature_list.json`의 `pending` 항목 중 의존성이 없는 `testing-setup`이거나,
`http-client-error-handling`이 열어준 `zod-response-validation`/`auth-real-login`/`catalog-crud`/
`inventory-dashboard-data` 중 하나다.

## 세션 로그

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

- `http-client-error-handling` PR 정리 후, `testing-setup`이거나 `zod-response-validation` /
  `auth-real-login` / `catalog-crud` / `inventory-dashboard-data` 중 하나를 골라 이슈를 먼저
  만들고 `feat/`(또는 `chore/`) 브랜치로 착수
- 새 작업을 시작하기 전 `docs/git-workflow.md`를 다시 읽고 이슈 → 브랜치 → PR 순서를 지킬 것
- `feature_list.json`에서 해당 항목을 `in_progress`로 전환하고, 완료 시 `completed` + PROGRESS.md 갱신
