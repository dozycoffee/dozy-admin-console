# 아키텍처 체크리스트

## 목적과 사용법

새 화면이나 기능을 구현하기 전, 또는 리팩토링을 시작하기 전에 훑어보는 체크리스트다. 규칙의
"왜"가 궁금하면 [docs/adr/](adr/README.md)를 본다. 구조 원칙 자체는 [AGENT.md](../AGENT.md)에
있고, 이 문서는 그 원칙을 실제 코드에 적용할 때 놓치기 쉬운 점검 항목만 모은다.

## 폴더 배치

- [ ] 라우트에 직접 매핑되는 화면인가? → `pages/<route>/`
- [ ] 2개 이상의 페이지가 공유하는 로직/컴포넌트인가? → `features/<feature>/`
- [ ] 특정 도메인 지식 없이 재사용 가능한 것(HTTP 클라이언트, 공통 레이아웃)인가? → `shared/`
- [ ] `features/<feature>/` 안에서도 상태·hook·타입은 `model/`, 컴포넌트는 `ui/`로 나뉘어 있는가?
- [ ] 페이지 전용 하위 컴포넌트를 `shared/ui/`에 끼워넣지 않았는가? (재사용되기 전까지는 해당
      페이지 폴더 안에 둔다)

## 권한 (Permission / AccessScope)

- [ ] 새 라우트를 추가했다면 `RequirePermission`으로 감쌌는가?
- [ ] 새 버튼/기능 중 조회 이상의 권한이 필요한 것이 있다면 `PermissionGate`로 감쌌는가?
- [ ] 새 Permission을 추가했다면 `permissions.ts`에 `<도메인>.<read|write|manage>` 네이밍으로
      등록했는가?
- [ ] `AppLayout`의 `navigation` 배열과 `AppRouter`의 라우트가 1:1로 대응하는가? (메뉴만 있고
      라우트가 없거나, 그 반대인 상태로 남기지 않는다)
- [ ] 서버 API에도 동일한 Permission/AccessScope 검증이 있는지 확인했는가? (프런트 체크만으로
      "권한 처리 완료"라 간주하지 않는다 — [AGENT.md](../AGENT.md) 권한 모델 절 참고)
- [ ] 화면·기능의 권한 요구사항을 정의/변경했다면
      [docs/permission-policy-checklist.md](permission-policy-checklist.md)에도 반영했는가?

## 서버 상태 (TanStack Query)

- [ ] `useEffect` + `fetch`/axios 직접 호출 대신 TanStack Query(`useQuery`/`useMutation`)를
      사용했는가?
- [ ] Query key가 `['<도메인>', '<하위 리소스>', ...params]` 형태로 일관되게 구성되어 있는가?
- [ ] mutation 이후 필요한 query key만 정확히 invalidate했는가? (`queryClient.invalidateQueries()`를
      인자 없이 호출해 전체를 무효화하지 않는다)
- [ ] 클라이언트 전용 UI 상태(모달, 탭 선택 등)를 TanStack Query에 넣지 않았는가?

## API 연동

- [ ] 요청이 `src/shared/api/httpClient.ts`의 axios 인스턴스를 통해 나가는가? (컴포넌트/hook에서
      axios를 새로 생성하지 않는다)
- [ ] URL을 하드코딩하지 않고 `VITE_API_BASE_URL` 기반 baseURL을 사용했는가?
- [ ] API 응답을 Zod 스키마로 파싱했는가? 스키마는 해당 기능의 `model/`에 두었는가?
- [ ] 에러 응답 처리가 화면마다 제각각이 아니라 공통 패턴을 따르는가?

## 네이밍/스타일

- [ ] 컴포넌트 파일은 PascalCase, 그 외는 camelCase를 따르는가?
- [ ] `oxlint`(`npm run lint`)를 통과하는가?
- [ ] 조건부로 export되는 상수 등이 `react/only-export-components` 규칙과 충돌하지 않는가?
