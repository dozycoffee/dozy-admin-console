# PROGRESS

## 현재 상태

초기화 커밋(`chore: initialize admin console`) 이후, 문서 체계(AGENT.md/CLAUDE.md/docs/ADR)와
작업 관리 파일(feature_list.json/PROGRESS.md)을 막 갖췄다. 코드 자체는 여전히 초기 골격 단계다:

- 인증은 `AuthProvider`의 mock 사용자로 동작하며 실제 로그인 API 연동 전
- `httpClient`는 axios 인스턴스만 있고 공통 에러 처리/Zod 검증 파이프라인 미연결
- Catalog/Inventory/Dashboard 페이지는 모두 정적 목업 데이터를 보여주는 화면만 구현됨
- `AppLayout`의 `/users` 메뉴는 대응 라우트/화면이 아직 없음
- 테스트 러너 미도입

다음에 손댈 것은 `feature_list.json`의 `pending` 항목 중 의존성이 없는 `http-client-error-handling`,
`testing-setup`부터 시작하는 것이 자연스럽다.

## 세션 로그

### 2026-09-18

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

- `docs-foundation` 이슈/PR 정리 후, `http-client-error-handling`과 `testing-setup` 중 하나를 골라
  이슈를 먼저 만들고 `feat/`(또는 `chore/`) 브랜치로 착수
- 새 작업을 시작하기 전 `docs/git-workflow.md`를 다시 읽고 이슈 → 브랜치 → PR 순서를 지킬 것
- `feature_list.json`에서 해당 항목을 `in_progress`로 전환하고, 완료 시 `completed` + PROGRESS.md 갱신
