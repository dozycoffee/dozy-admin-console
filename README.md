# DOZY Admin Console

DOZY COFFEE 본사와 창고 운영을 위한 통합 관리자 콘솔입니다.

## 기술 스택

- React 19 + TypeScript
- Vite
- React Router
- TanStack Query
- Axios
- Zod

## 시작하기

```bash
cp .env.example .env
npm install
npm run dev
```

## 폴더 구조

```text
src/
├── app/                 # 앱 초기화, Provider, Router
├── features/            # 권한 등 재사용 가능한 사용자 기능
├── pages/               # 라우트 단위 화면
├── shared/              # API 클라이언트, 공통 UI와 설정
└── main.tsx
```

## 권한 설계

역할별로 화면을 복제하지 않습니다. 동일한 메뉴와 화면을 사용하면서
`Permission`과 데이터 접근 범위인 `AccessScope`로 조회·수정 권한을
제어합니다.

- `RequirePermission`: 페이지 접근 제한
- `PermissionGate`: 버튼과 기능 단위 접근 제한
- `AccessDeniedPage`: 필요한 권한과 요청 경로 안내

프론트엔드의 권한 처리는 사용자 경험을 위한 것이며, 실제 API에서도
동일한 권한과 데이터 범위를 검증해야 합니다.

## 명령어

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## 문서

- [AGENT.md](AGENT.md) — 아키텍처 원칙, 폴더 구조, 권한 모델, 컨벤션
- [docs/architecture-checklist.md](docs/architecture-checklist.md) — 구조 체크리스트
- [docs/permission-policy-checklist.md](docs/permission-policy-checklist.md) — 권한 정책 체크리스트
- [docs/adr/](docs/adr/README.md) — 아키텍처 결정 기록
- [docs/git-workflow.md](docs/git-workflow.md) — 브랜치·이슈·PR 규칙
- [feature_list.json](feature_list.json) / [PROGRESS.md](PROGRESS.md) — 작업 현황
