# ADR-0002: 서버 상태 관리 표준으로 TanStack Query 채택

## 상태
Accepted

## 배경 (Context)
이 콘솔의 화면 대부분은 API에서 가져온 데이터(상품, 재고, 사용자 등)를 조회·갱신하는 것이 핵심
동작이다. 서버 데이터를 다루는 방식이 화면마다 제각각이면 로딩/에러/캐시 처리 로직이 중복되고,
같은 데이터를 여러 화면이 동시에 조회할 때 정합성을 맞추기 어렵다.

고려한 대안:
- **`useEffect` + `useState`로 직접 fetch**: 별도 라이브러리 없이 구현 가능하지만, 로딩/에러 상태,
  캐싱, 재요청 시점(포커스 복귀, 재시도) 등을 화면마다 다시 구현하게 된다.
- **Redux/Zustand 같은 전역 상태 스토어에 서버 데이터도 함께 보관**: 클라이언트 상태와 서버 상태의
  갱신 주기·소유권이 다른데도 같은 저장소로 관리하게 되어, 캐시 무효화 시점을 직접 설계해야 하는
  부담이 크다.

## 결정 (Decision)
서버에서 오는 데이터는 TanStack Query로 관리한다. `AppProviders`에서 전역 `QueryClient`를 구성하고
(`staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`), 모든 조회는 `useQuery`, 모든
변경은 `useMutation`으로 작성한다. Query key는 `['<도메인>', '<하위 리소스>', ...params]` 형태로
통일하고, mutation 이후에는 영향받는 key만 선택적으로 invalidate한다. 클라이언트 전용 UI 상태(모달
열림 여부 등)는 TanStack Query에 넣지 않고 컴포넌트 state로 유지해 두 상태의 책임을 분리한다.

## 결과 (Consequences)
- 얻는 것: 로딩/에러/재시도/캐싱이 화면마다 재구현되지 않고 일관되게 처리된다. Query key 컨벤션을
  지키면 같은 데이터를 여러 화면이 구독해도 캐시가 자동으로 공유·동기화된다.
- 감수하는 것: Query key 설계와 invalidate 범위를 잘못 잡으면 오히려 오래된 데이터가 남거나 불필요한
  재요청이 발생할 수 있다 — mutation을 추가할 때마다 어떤 key를 무효화할지 의식적으로 판단해야
  한다.
- 감사 포인트: `docs/architecture-checklist.md`의 "서버 상태" 항목이 이 결정을 근거로 한다.
