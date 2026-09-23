# AGENT.md

이 문서는 이 레포에서 작업하는 모든 AI 코딩 에이전트(Claude Code, Cursor 등)를 위한 공통 소스
오브 트루스다. 도구별로 특별히 필요한 보충 사항은 각 도구 전용 파일(예: `CLAUDE.md`)에 따로 둔다.

## Project Overview

DOZY COFFEE 본사와 창고 운영을 위한 통합 관리자 콘솔이다. 로그인한 사용자는 계정 관리자, MD,
창고 관리자, 본사 재고 담당자 등의 액터 모드 중 하나를 명시적으로 선택해 해당 업무 콘솔에
진입한다. 복수 모드를 가진 사용자는 콘솔에서 모드 선택 화면으로 돌아가 전환할 수 있다.

| 분류 | 기술 |
|---|---|
| Language | TypeScript |
| UI | React 19 |
| Build | Vite |
| Routing | React Router 7 |
| Server State | TanStack Query 5 |
| HTTP Client | Axios |
| Validation | Zod |
| Lint | oxlint |

## 아키텍처 원칙

### 폴더 구조

```text
src/
├── app/                 # 앱 초기화 — Provider 조합, Router 정의
│   ├── providers/
│   └── router/
├── features/            # 여러 화면에서 재사용하는 사용자 단위 기능 (예: auth)
│   └── <feature>/
│       ├── model/       # 상태, hook, 타입
│       └── ui/          # 해당 기능 전용 컴포넌트
├── pages/                # 라우트 단위 화면. 폴더당 라우트 1개
│   └── <route>/
├── shared/               # 특정 기능에 속하지 않는 공통 자산
│   ├── api/              # httpClient 등 API 클라이언트
│   └── ui/               # 공통 레이아웃/UI 컴포넌트
└── main.tsx
```

레이어 배치 기준:

- 라우트에 직접 매핑되는 화면 → `pages/`. 그 화면 전용 하위 컴포넌트도 같은 폴더 안에 둔다.
- 2개 이상의 `pages/`가 공유하는 로직·컴포넌트(로그인 상태, 권한 체크 등) → `features/`
- 특정 도메인 지식 없이 재사용 가능한 것(HTTP 클라이언트, 레이아웃 셸) → `shared/`
- 새 코드가 어디에 속하는지 애매하면 `docs/architecture-checklist.md`를 확인한다.

### 권한 모델 — ActorMode + Permission + AccessScope

권한은 다음 세 축으로 구분한다.

- `ActorMode`: 사용자가 현재 수행하는 업무 역할이자 콘솔 경계. 로그인 후 명시적으로 선택하며,
  사용자에게 할당되지 않은 모드는 선택 화면에 잠금 상태로 노출하고 진입은 차단한다.
- `Permission` (`src/features/auth/model/permissions.ts`): 기능 단위 허용 여부. `<도메인>.<read|write|manage>`
  네이밍을 따른다 (예: `catalog.write`).
- `AccessScope`: 데이터 범위 제한(현재는 `warehouseIds`). 같은 Permission을 가져도 조회·수정 가능한
  데이터 범위는 AccessScope로 좁혀진다.

액터 모드별 콘솔은 메뉴와 대시보드 구성이 달라질 수 있지만, 공통 기능을 모드별로 복제하지 않는다.
공통 페이지와 도메인 로직은 재사용하고 모드 설정을 통해 노출 범위를 구성한다.

적용 컴포넌트:

- `RequireActorMode` — 콘솔 진입 전 모드 선택 여부와 사용자 할당 여부를 검사하고, 특정 화면을 사용할
  수 있는 모드 범위도 제한
- `RequirePermission` — 페이지(라우트) 단위 접근 제한. 불허 시 `/access-denied`로 리다이렉트
- `PermissionGate` — 버튼 등 화면 내 기능 단위 접근 제한. 불허 시 `fallback` 렌더링
- `AccessDeniedPage` — 필요한 권한과 요청 경로 안내

> **프런트엔드 권한 체크는 UX(잠금 표시, 리다이렉트)를 위한 것이며 보안 경계가 아니다.** 동일한
> Permission/AccessScope 검증이 API 서버에서도 반드시 이뤄져야 하고, 서버 쪽이 원본(source of
> truth)이다. 새 API를 연동할 때 서버가 이 검증을 실제로 하는지 확인 없이 프런트 체크만으로
> "권한 처리 완료"로 간주하지 않는다.

새 화면/기능을 추가할 때 권한 요구사항을 정의하는 절차는 `docs/permission-policy-checklist.md`를
따른다.

### 서버 상태 — TanStack Query

서버에서 오는 데이터는 컴포넌트 로컬 state나 `useEffect` + `fetch`로 직접 관리하지 않고 TanStack
Query로 관리한다 (`AppProviders`에서 전역 `QueryClient` 구성, `staleTime: 30_000`, `retry: 1`,
`refetchOnWindowFocus: false`).

- Query key는 `['<도메인>', '<하위 리소스>', ...params]` 형태의 배열로 구성한다 (예:
  `['catalog', 'products', { warehouseId }]`).
- mutation 이후에는 관련 query key를 명시적으로 invalidate한다. 전체 캐시를 무효화하지 않는다.
- 클라이언트 전용 UI 상태(모달 열림 여부 등)는 TanStack Query가 아니라 컴포넌트 state로 둔다.

### API 연동

- 모든 HTTP 요청은 `src/shared/api/httpClient.ts`의 axios 인스턴스를 통해 나간다. 컴포넌트나 hook에서
  axios를 직접 새로 만들지 않는다.
- Base URL은 `VITE_API_BASE_URL` 환경변수로 주입한다(`.env.example` 참고). 코드에 URL을 하드코딩하지
  않는다.
- API 응답은 Zod 스키마로 파싱해 타입과 런타임 검증을 동시에 확보한다. 스키마는 해당 기능의
  `model/` 아래 둔다. (현재 `httpClient`는 초기 골격 상태이며, 공통 에러 처리·Zod 파싱 연결은
  `feature_list.json`의 진행 중 작업이다 — 새로 API를 연동할 때 임시로 우회하지 말고 이 작업을 먼저
  완료하거나 함께 진행한다.)

### 라우팅

- 라우트 정의는 `src/app/router/AppRouter.tsx` 한 곳에 모은다.
- 권한이 필요한 라우트는 반드시 `RequirePermission`으로 감싼다.
- 새 라우트를 추가하면 `AppLayout`의 `navigation` 배열에도 함께 등록해 사이드바 메뉴와 라우트가
  어긋나지 않게 한다. (참고: 현재 `AppLayout`의 `/users` 메뉴 항목은 아직 대응 라우트가 없는 상태 —
  `feature_list.json`의 `users-permission-management-page` 작업에서 해소 예정.)

## Common Commands

```bash
npm run dev       # 개발 서버
npm run build     # 타입체크(tsc -b) 후 프로덕션 빌드
npm run lint      # oxlint
npm run preview   # 빌드 결과 프리뷰
```

테스트 러너는 아직 도입 전이다 (`feature_list.json`의 `testing-setup` 참고). 그 전까지는 기능 변경
시 최소한 `npm run build`와 `npm run lint`로 검증한다.

## Documentation

`docs/`에는 이 문서가 다루지 않는 세부 규칙과 기록이 있다.

- [docs/architecture-checklist.md](docs/architecture-checklist.md) — 새 코드를 작성하기 전에 확인하는
  구조 체크리스트
- [docs/permission-policy-checklist.md](docs/permission-policy-checklist.md) — 새 화면/기능의 권한
  요구사항을 정의·점검하는 체크리스트
- [docs/adr/](docs/adr/README.md) — 되돌리기 번거로운 결정과 그 이유
- [docs/git-workflow.md](docs/git-workflow.md) — 브랜치·이슈·PR 규칙

작업 진행 상황은 루트의 [feature_list.json](feature_list.json)과 [PROGRESS.md](PROGRESS.md)로
관리한다.
