# PROGRESS

## 현재 상태

문서 체계(AGENT.md/CLAUDE.md/docs/ADR), `httpClient` 공통 에러 처리
(`http-client-error-handling`), GitHub 이슈/PR 템플릿(`github-issue-pr-templates`), Vitest 테스트
러너(`testing-setup`), GitHub Actions CI(`ci-pipeline`), `inventory-dashboard-data`,
`zod-response-validation`, `auth-login-ui-mock-backend`에 이어 `remove-catalog-feature`,
`generalize-msw-mocks`, `warehouse-floor-plan-dashboard`, `inventory-location-panel-cleanup`,
`inventory-location-table-alignment`, `warehouse-capacity-md-zone-mock`,
`warehouse-location-pillar`까지 완료했다. 남은 상태:

- **새 F Zone(MD 상품)은 아직 프런트 mock 레이어에만 존재한다.** `inventorySchemas`의
  `zoneCodeSchema`/`zoneCodeLabels`는 F를 인식하지만, 실제 dozy-wms-api
  `/api/inventories/zone-summary`는 여전히 A~E(합계 850)만 반환한다 — `InventoryPage`의 "Zone별
  요약" 카드(실 API 연동)는 F를 보여주지 않고, Dashboard/평면도/Location별 재고(전부 mock)만
  F Zone·확대된 총 용량(5,000)을 보여준다. 실제로 F Zone을 운영하려면 dozy-wms-api DB에 Zone(F)
  생성 + API 응답 반영이 먼저 필요함 — 사용자가 이미 이 결정을 알고 "프런트 mock만 우선 갱신"으로
  범위를 좁힌 상태라 지금 당장 막힌 건 아님

- 창고 평면도(`WarehouseFloorPlan.tsx`)와 Dashboard의 Zone별 재고 현황 카드는 아직 전용 mock
  데이터(`warehouseMockData.ts`)를 쓴다. `InventoryPage`의 "Zone별 요약"처럼 실 zone-summary
  API로 옮기는 작업은 아직 없음

- dozy-wms-api CORS는 해결된 상태다(2026-10-01 세션에서 프리플라이트 OK 확인). 아래 로그인 항목의 dozy-auth도
  허용 origin 설정(`AUTH_CORS_ALLOWED_ORIGINS`)이 필요하다
- **로그인은 dozy-auth 실서비스로 연동했다**(`auth-real-login`). internal realm 이메일+비밀번호 로그인,
  access token은 메모리에만 보관하고 앱 시작 시 refresh 쿠키(`dozy_refresh`)로 복원한다(dozy-auth ADR-0014).
  업무 API가 401 `UNAUTHENTICATED`를 주면 `httpClient`가 토큰을 갱신하고 한 번 재시도하며, 갱신까지
  실패하면 로그아웃 상태로 돌아간다. auth의 role은 `roleMapping.ts` 한 곳에서 액터 모드·Permission으로
  변환한다 — 이 파일의 role 이름(`wms:warehouse_manager` 등)은 임시로 정한 것이라 운영 role 정의와 맞춰야 한다.
  dozy-auth가 시드하는 role은 `auth:owner`/`auth:admin`뿐이다. 창고 범위(`AccessScope.warehouseIds`)는
  auth에 창고 개념이 없어 `VITE_WAREHOUSE_IDS`로 임시 지정한다. MSW 핸들러는 비어 있다
- Catalog 화면은 완전히 제거했다. **`catalog-crud`도 그에 따라 목록에서 제거** — CatalogPage가
  가리키던 완제품(아메리카노 등) 상품 마스터는 dozy-wms-api의 `/api/products`(원부자재)와는 다른
  별도 catalog MSA에서 처리될 예정이며 아직 미구현 상태라, 연동할 API가 없는 미완성 화면을 계속
  띄워두는 대신 지우고 나중에 API가 준비되면 화면부터 새로 만들기로 했다. `permissions.ts`의
  `catalogRead`/`catalogWrite`, `AppLayout`의 "상품 관리" 메뉴, `product` 모델
  (`productSchemas`/`useActiveProducts`)도 함께 제거. 같은 맥락에서 대응 화면이 없던
  `usersManage` 권한과 "사용자·권한" 메뉴도 정리(계정 관리 화면은 이후 직원 관리·role 관리 등 `auth-*` 화면으로
  나눠 구현했다)
- Inventory/Dashboard는 dozy-wms-api 실 API(zone-summary/warehouses/products)로 연동 완료.
  `AccessScope.warehouseIds`를 `string[]`(슬러그) → `number[]`(dozy-wms-api Long id)로 변경했고,
  mock 값은 로컬 dev DB에 실제 등록한 창고 id를 가리킨다 — 다른 개발 DB에서는 이 값을 맞춰야 함
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

`feature_list.json`에 남은 `pending` 항목은 없다. dozy-auth 연동 화면(로그인, 직원·role·audience·system client 관리, 감사 로그, 초대·비밀번호 복구, 내 계정, owner 양도)은 모두 구현했다.
dozy-wms-api는 inventory 분리 작업 중이라 WMS 쪽 연동은 건드리지 않는다.

## 세션 로그

### 2026-10-13 (owner 양도 화면)

- 이슈 #63, `feat/auth-owner-transfer` 브랜치에서 `auth-owner-transfer` 구현. 이로써 `feature_list.json`의 pending 작업이 모두 끝났다
- `/owner`(`account.manage`, owner 전용): 양도 전 영향 안내(나는 role 없는 직원이 되고 모든 세션 폐기, 대상이 본인으로 로그인해 수락해야 함, 수락 전 취소 가능, 진행 중 양도는 하나),
  활성 직원 중 대상 선택(본인 제외, 검색, 50명 제한 안내), 확인 모달을 거친 양도 요청(`202`, 만료 시각 안내), 양도 취소(확인 모달, 진행 중인 양도가 없으면 `NOT_FOUND` 안내).
  dozy-auth에는 진행 중인 양도를 조회하는 API가 없어 상태는 보여주지 못한다
- `/owner-transfer?token=`(수락): `RequireAuth`만 필요한 **콘솔 셸 밖의 독립 화면**이다. 대상 직원이 아직 role·업무 모드가 없을 수 있고(모드 선택 모달이 막으므로) 서버가 대상 본인인지 확인한다.
  대상이 아닌 계정은 `FORBIDDEN` 안내와 "다른 계정으로 로그인", 만료·사용·취소된 링크는 `VERIFICATION_EXPIRED` 안내. 수락하면 토큰을 갱신(`refreshAccessToken`)하고 내 정보를 다시 불러와 새 owner 권한을 바로 반영한다
- 로그인이 필요한 화면에서 넘어온 사용자는 로그인한 뒤 원래 화면(쿼리 포함)으로 돌아간다(`LoginPage`가 `location.state.from`을 복원). 이전에는 항상 `/`로 갔다
- 검증: build/lint/test(513) 통과. 실서버(dozy-auth)에 대해 헤드리스 Chrome으로 owner: 대상 목록(본인 제외) → 요청(202) → 중복 요청 `INVALID_STATE`(409) 안내 → 취소(204) → 다시 취소 `NOT_FOUND`(404) 안내 →
  새 요청 → 비로그인 상태로 링크 접속 시 로그인 후 수락 화면으로 복귀 → 취소된 링크는 만료 안내(410) → 다른 직원(admin) 계정은 `FORBIDDEN`(403) 안내 → 대상 본인이 수락(204) →
  새 owner가 계정 관리자 모드를 쓸 수 있고 → 같은 링크 재사용은 만료 안내(410) → 이전 owner는 새로고침하면 로그인 화면(세션 폐기) → 새 owner가 다시 `owner@`로 양도해 owner를 원래대로 복구하고
  role 없는 이전 owner도 수락 화면을 열 수 있음을 확인
- 알려진 한계: 요청 후 진행 중인 양도 상태(대상·만료)는 화면을 벗어나면 보이지 않는다(조회 API 없음). 로컬 DB의 owner는 확인 후 `owner@dozycoffee.local`로 복구해 두었다

### 2026-10-12 (system client 관리 화면)

- 이슈 #61, `feat/auth-system-clients` 브랜치에서 system client 화면 구현. `auth-system-client-owner-audit`를 쪼개 system client는 `auth-system-clients`로 완료하고
  남은 owner 양도는 `auth-owner-transfer`로 이름을 바꿔 pending으로 남겼다
- `/system-clients`(계정 관리자 모드, `account.read`/`account.write`): 목록(clientId·이름·상태·role·secret 발급 시각, 폐기된 client는 `deleted-{id}`로 표시), 등록
  (clientId `^svc-[a-z][a-z0-9]*(-[a-z0-9]+)*$`·100자 검증, 이름, system role을 뺀 일반 role 선택), secret 재발급, role 부여·회수(일반 role만), 폐기(사유 입력 모달, 되돌릴 수 없음 안내)
- **secret은 한 번만 보여준다**(CLI-02): 등록·재발급 응답의 secret을 `SecretReveal`(읽기 전용 입력·복사 버튼·"안전한 곳에 저장했습니다" 확인 후에만 닫기)로 보여주고,
  mutation은 `gcTime: 0`으로 결과를 캐시에 남기지 않으며 호출한 쪽 콜백에서 페이지 state로만 넘긴다. 새로고침하거나 화면을 떠나면 사라진다
- 재발급은 확인 모달에서 "기존 secret 즉시 무효, 이미 발급된 토큰은 최대 10분 유효"(CLI-03)를 안내하고 `ACTIVE`일 때만 할 수 있다. 정지된 client는 재발급·role 부여 불가
- role 부여·회수·폐기는 직원과 같은 계정 API(`/admin/principals/{id}/...`)를 쓰되 `system-client` 쿼리와 role 쿼리를 갱신하는 훅을 따로 둔다. owner·admin 보호 규칙은 system client에 적용되지 않는다
- 검증: build/lint/test(482) 통과. 실서버(dozy-auth)에 대해 헤드리스 Chrome으로 owner: 등록(role 지정) → secret 표시(저장 확인 전 닫기 비활성, 복사 버튼, 클립보드 일치) →
  그 secret으로 `POST /realms/internal/token` 토큰 발급 200 → 닫으면 화면에서 secret 사라짐 → 중복 clientId 안내 → 재발급(옛 secret 401 `invalid_client`, 새 secret 200) →
  role 회수·부여 → 폐기(clientId가 `deleted-…`로 바뀌고 role 회수, 폐기된 client의 secret은 401)까지 확인
- 알려진 한계: client 정지·해제 화면은 만들지 않았다(계정 정지 API는 같다). 서비스 토큰에 어떤 `aud`가 담기는지(role의 audience)는 화면에서 보여주지 않는다
- 로컬 auth DB에는 폐기된 `svc-store` client가 남아 있다

### 2026-10-12 (감사 로그 조회 화면)

- 이슈 #59, `feat/auth-audit-logs` 브랜치에서 감사 로그 화면 구현. `auth-system-client-owner-audit`를 쪼개 감사 로그는 `auth-audit-logs`로 완료하고
  나머지(system client 관리·owner 양도)는 기존 항목에 남겼다. 직원 본인 정보 수정 제외 방침도 같은 브랜치에서 문서에 반영
- `/audit-logs`(`account.manage`, owner 전용 — `auth:owner`에만 매핑): 최신순 목록(시각·action 한글 이름+코드·행위자·대상·IP·detail 펼쳐 보기), 서버 페이지네이션(20건)
- 필터: 기간(빠른 선택 24시간·7일·30일, 직접 입력 `datetime-local`; 선택하지 않으면 서버 기본 최근 7일), 행위자 id(UUID 검증), 대상 종류·id, action 여러 개(AUD-01의 26개를
  분류별 체크박스, 쉼표로 이어 전송). 시작>종료와 90일 초과는 클라이언트에서 막고 서버 `VALIDATION_FAILED`는 조건 확인 안내로 바꾼다. 빠른 선택에 90일을 넣지 않은 것은
  서버 시각이 조금 뒤라 상한에 걸릴 수 있기 때문
- 감사 로그에는 이름·이메일이 없어(AUD-07) 행위자·대상은 `type`과 앞 8자리 id로 보이고 전체는 툴팁이다. 시스템 작업(행위자 없음)은 `-`
- 사이드바 "감사 로그" 메뉴(owner가 아니면 다른 메뉴처럼 "잠김"), 직접 URL 접근은 `RequirePermission`이 `/access-denied`로 보낸다
- 검증: build/lint/test(424) 통과. 실서버(dozy-auth)에 대해 헤드리스 Chrome으로 owner: 기본 조회(91건, 최신순) → action `role 부여·회수` 필터(9건, 쉼표 전송) → detail 펼치기
  → 최근 24시간+대상 종류 ROLE 필터 → 90일 초과 기간 안내, admin: 사이드바에 "잠김", `/audit-logs` 직접 접근은 `/access-denied`까지 확인
- 알려진 한계: 행위자·대상의 이름은 보여주지 않는다(id만). 서버 `VALIDATION_FAILED`의 정확한 원인(기간/UUID/알 수 없는 action)은 구분하지 못하고 한 문구로 안내한다

### 2026-10-12 (내 계정 화면 — 내 정보 조회·비밀번호 변경)

- 이슈 #57, `feat/auth-my-account-pages` 브랜치에서 `auth-my-account-pages` 구현
- `/account`: 로그인한 모든 사용자가 쓰는 화면이라 `RequireActorMode`·`RequirePermission` 없이 `RequireAuth` 안에만 둔다. 사이드바 사용자 이름이
  진입점(`/account` 링크). 이메일·부여된 role을 읽기 전용으로 보여준다(`GET /realms/internal/me`)
- 비밀번호 변경(`POST /realms/internal/password/change`): 현재 비밀번호와 새 비밀번호·확인(초대 수락·재설정과 같은 `NewPasswordFields`·정책 검증).
  현재 비밀번호 불일치는 401이 아니라 400 `CURRENT_PASSWORD_MISMATCH`라 로그아웃되지 않고 안내만 한다(PWD-08). 성공하면 이 기기를 뺀 다른 기기의 로그인이 해제된다고 안내
- **직원의 본인 정보(이름·전화번호·주소) 수정은 의도적으로 제외한다.** 정보 수정은 관리자가 직원 관리 화면에서 한다. 따라서 dozy-auth의
  `PATCH /realms/{realm}/me`는 쓰지 않는다(참고: 서버에도 구현되어 있지 않다). 내 계정 화면은 조회와 비밀번호 변경만 한다
- 검증: build/lint/test(389) 통과. 실서버(dozy-auth)에 대해 헤드리스 Chrome으로 두 기기(브라우저 컨텍스트)에서 로그인 → 내 계정 화면(이메일·role) →
  틀린 현재 비밀번호(400, 로그인 유지) → 변경(204) → 변경한 기기는 새로고침해도 세션 유지, 다른 기기는 새로고침하면 로그인 화면 → 새 비밀번호로 로그인 → 원래 비밀번호로 복구까지 확인
- 알려진 한계: role이 없는 직원은 로그인 후 `/access-denied`로 이동하므로 이 화면에 사이드바로 들어갈 수 없다
  (URL로 직접 접근은 가능)

### 2026-10-12 (초대 수락·비밀번호 찾기·재설정 공개 화면)

- 이슈 #55, `feat/auth-account-recovery-pages` 브랜치에서 `auth-account-recovery-pages` 구현. 비밀번호 변경은
  `auth-my-account-pages`로 분리해 등록
- 메일 링크 경로는 dozy-auth `MailRenderer`와 같다: `/invitation?token=`(초대), `/password/reset?token=`(재설정). 둘 다 `RequireAuth` 밖의
  공개 라우트이고 `/password/forgot`(비밀번호 찾기)도 공개다. `/owner-transfer?token=`은 `auth-system-client-owner-audit`에서 만든다
- 초대 수락: 토큰으로 초대를 조회(소비하지 않음)해 이름·마스킹된 이메일을 보여주고 비밀번호를 정한다. 만료·사용된 초대와 토큰 없는 접근은 같은
  만료 안내(dozy-auth는 구분해 주지 않는다). 비밀번호 찾기는 계정이 없어도 같은 성공 문구, 재설정은 토큰과 새 비밀번호
- 수락·재설정 후에는 자동 로그인하지 않고 `/login`으로 이동해 완료 안내(`location.state.notice`)를 보여준다. 로그인 화면에 "비밀번호를 잊으셨나요?" 링크 추가
- `features/account`: 비밀번호 정책(PWD-01 코드 포인트 길이 8~128, 확인 일치) 클라이언트 검증, 서버의 `VALIDATION_FAILED`(이메일과 같은 비밀번호 등)·
  `TOO_MANY_ATTEMPTS`·`VERIFICATION_EXPIRED` 안내
- 검증: build/lint/test(374) 통과. 실서버(dozy-auth)에 대해 헤드리스 Chrome으로 직원 초대 → 메일 링크 → 초대 조회(마스킹 이메일) → 확인 불일치 안내 →
  수락(204) → 로그인 안내 → 같은 링크 재사용 시 만료 안내(410) → 존재하지 않는 이메일·존재하는 이메일 모두 같은 성공 문구(202) → 메일 링크로 재설정 →
  짧은 비밀번호 안내 → 변경(204) → 옛 비밀번호 로그인 실패, 새 비밀번호 로그인 성공 → 재설정 링크 재사용 시 만료 안내까지 확인
- 알려진 한계: 링크의 토큰이 URL 쿼리에 남는다(dozy-auth VER-05는 메일 링크에 한정). 요청 제한(429)은 실서버에서 확인하지 않고 단위 테스트로만 검증했다.
  role이 없는 직원은 로그인하면 `/access-denied`로 이동한다(기존 동작)

### 2026-10-12 (직원 role 부여·회수)

- 이슈 #53, `feat/auth-employee-roles` 브랜치에서 `auth-employee-roles` 구현
- 직원 상세의 role 영역을 `EmployeeRoles`로 분리: 부여된 role 칩(× 회수), "role 추가" 선택·부여. 부여·회수 후 직원·role 쿼리를 함께 갱신해
  role 목록의 부여 인원 수도 바뀐다
- 규칙을 화면에서 미리 반영(`roleAssignment.ts`, `accountProtection.ts`의 `role` 액션): `auth:owner`는 부여·회수 대상에서 제외(양도만 가능),
  `auth:admin` 임명·해임은 owner(`account.manage`)에게만 노출하고 확인 모달에서 owner 알림 메일을 안내, 자기 자신에게 부여 불가(GOV-04),
  admin은 owner·admin 계정의 role 변경 불가(GOV-02), 정지·비활성화 직원에게 부여 불가·정지 직원 회수는 가능(GOV-07). 서버가 최종 판단하며
  `SELF_GRANT_NOT_ALLOWED` 등은 에러 문구로 안내
- 변경은 직원의 다음 로그인·토큰 갱신(최대 10분)부터 반영된다고 성공 문구에 안내
- 검증: build/lint/test(332) 통과. 실서버(dozy-auth)에 대해 헤드리스 Chrome으로 owner: 창고담당에게 role 부여(204) → `auth:admin` 임명(확인
  모달, 204) → 해임(204) → role 회수(204), owner 본인 화면은 부여 불가 안내, admin: 선택지에 `auth:admin`이 없고 owner 계정은 변경 불가 안내까지 확인
- 알려진 한계: 정지 직원 회수 가능·부여 불가나 비활성화 직원 처리는 단위 테스트로 검증했고 실서버에서 실행하지 않았다. 한 번에 한 role만 부여한다
  (API는 여러 role을 한 번에 받는다)

### 2026-10-12 (role·audience 관리 화면)

- 이슈 #51, `feat/auth-role-management` 브랜치에서 `auth-role-management` 구현. 직원에게 role을 부여·회수하는 화면은
  `auth-employee-roles`로 분리해 등록
- `/roles`(계정 관리자 모드, `account.read`): audience 목록과 추가(`account.manage`, owner 전용), role 등록(audience 선택,
  code 형식 `^[a-z][a-z0-9_]*$` 검증, 이름, 설명), role 목록(audience 필터, 부여된 인원 수), 이름·설명 수정, 삭제
- 삭제는 먼저 `revokeAll=false`로 요청하고 `ROLE_IN_USE`(409)로 거부되면 영향 인원을 보여준 뒤 확인을 받아 `revokeAll=true`로
  다시 요청한다(dozy-auth 명세). system role(`auth:owner`/`auth:admin`)은 수정·삭제 버튼을 비활성화한다. role을 일괄 회수하면
  직원 role도 바뀌므로 직원 쿼리도 invalidate한다
- 에러 안내를 직원 화면과 공유하도록 `toEmployeeErrorMessage`를 `features/auth/model/adminErrors.ts`의 `toAdminErrorMessage`로
  일반화하고 `ROLE_CODE_DUPLICATED`·`AUDIENCE_CODE_DUPLICATED`·`ROLE_IN_USE` 문구를 추가
- 검증: build/lint/test(298) 통과. 실서버(dozy-auth)에 대해 헤드리스 Chrome으로 owner: role 등록 → 잘못된 code로 등록 불가 →
  중복 code 안내 → 설명 수정 → 미사용 role 삭제 → 부여된 role 삭제 시 "1명에게 부여된 role입니다" 확인 후 revokeAll 삭제 →
  system role 버튼 비활성 → audience 추가·중복 안내, admin: audience 추가 폼 없이 안내만 노출까지 확인
- 알려진 한계: role 이름이 바뀌어도 `roleMapping.ts`는 code(`{audience}:{code}`)를 기준으로 하므로 영향이 없지만, 운영 role code가
  `roleMapping.ts`의 값과 다르면 권한이 부여되지 않는다. audience는 삭제할 수 없고 code·audience는 등록 후 변경할 수 없다(dozy-auth 규칙)
- 로컬 auth DB에 audience `order`가 추가돼 있다. 테스트로 만든 role은 모두 삭제했다

### 2026-10-12 (직원 계정 상태 변경·정보 수정)

- 이슈 #49, `feat/auth-employee-account-actions` 브랜치에서 `auth-employee-account-actions` 구현
- 직원 상세(`pages/employees/EmployeeDetail.tsx`)에 상태별 작업 추가: ACTIVE는 정보 수정·재설정 메일 발송·정지·비활성화,
  SUSPENDED는 정보 수정·정지 해제·비활성화, PENDING은 정보 수정·초대 재발송·취소. DEACTIVATED는 변경 불가 안내
- 정지·비활성화는 사유 입력 모달(`ReasonModal`, 공백 불가·500자 이하), 해제·메일 발송은 확인 모달. 정보 수정은 바뀐 필드만
  PATCH로 보내고 비운 전화번호·주소는 null(삭제). 새 작업을 시작하면 이전 mutation의 에러·성공 안내를 모두 지운다
- `account.manage` Permission(owner 전용)을 `auth:owner`에만 매핑해 `blockedReason`(accountProtection.ts)으로 GOV-02·GOV-03을
  화면에서 미리 반영한다: owner 계정은 owner도 정지·비활성화 불가, admin은 owner·admin 계정의 모든 변경 불가. 서버가 최종 판단하므로
  서버의 `PROTECTED_ACCOUNT`도 에러 문구로 안내한다
- 검증: build/lint/test(247) 통과. 실서버(dozy-auth)에 대해 헤드리스 Chrome으로 owner: 정보 수정(전화번호) → 정지(사유 없이는 확인
  비활성) → 정지 해제 → 재설정 메일 발송, owner 본인 계정의 정지·비활성화 비활성, admin(`auth:admin` 직원, 초대 수락 후 로그인):
  owner 계정의 모든 작업 비활성과 안내, 일반 직원 작업은 가능까지 확인
- 알려진 한계: 비활성화는 되돌릴 수 없어 실서버에서 실행해 보지 않았다(단위 테스트로만 검증). 직원 role 부여·회수는 `auth-employee-roles`에서 한다.
  admin 임명(`auth:admin` 부여)도 같다

### 2026-10-12 (직원 관리 화면 — 목록·상세·초대)

- 이슈 #47, `feat/auth-employee-management` 브랜치에서 `auth-employee-management` 구현
- `account.read`/`account.write` Permission을 추가하고 `auth:owner`/`auth:admin`에 매핑. 계정 관리자 모드에 `/employees`
  라우트(`RequireActorMode` + `RequirePermission`)와 "직원 관리" 사이드바 메뉴 추가
- `features/employee`: 목록(상태·role 필터, 이름·이메일 검색, 서버 페이지네이션)·상세·초대·초대 재발송·취소 훅과 Zod 스키마.
  dozy-auth는 `authHttpClient`로 호출하고 에러는 code별 안내 문구로 바꾼다(`toEmployeeErrorMessage`). `features/role`은
  초대 폼의 role 선택(`GET /admin/roles`)용 조회만 있다
- 초대 폼은 system role(`auth:owner`/`auth:admin`)을 선택지에서 뺀다 — admin 임명은 role 관리 화면에서 한다
- 검증: build/lint/test(200) 통과. 실서버(dozy-auth)에 대해 헤드리스 Chrome으로 role 2개(`wms:warehouse_manager`,
  `wms:hq_inventory_manager`) 등록 → 직원 초대(role 지정) → 중복 이메일 안내 → 초대 수락 → 그 직원으로 로그인 →
  창고 관리자 모드만 사용 가능, 사이드바에 입고·출고·폐기·반품 메뉴, `/employees` 직접 접근은 모드 가드로 차단 →
  초대 재발송(202)·취소(204, 계정은 DEACTIVATED로 익명화)까지 확인. 이전 세션에서 못 했던 창고 모드 실로그인 검증도 이로써 완료
- `.panel`에 `min-height: 180px`이 있고 `--line` CSS 변수는 정의돼 있지 않다. 새 화면에서 폼 패널은 min-height를 0으로
  덮어쓰고 테두리 색을 직접 지정했다
- 알려진 한계: 계정 정지·해제·비활성화·정보 수정·비밀번호 재설정 메일 발송은 `auth-employee-account-actions`로 분리.
  admin이 owner·admin 계정의 초대를 재발송·취소하면 서버가 `PROTECTED_ACCOUNT`로 거부하고, 화면은 버튼을 숨기지 않고
  에러 문구만 보여준다(직원 목록 응답에 등급이 없어 클라이언트가 미리 알 수 없음)

### 2026-10-12 (dozy-auth 실로그인 연동)

- 이슈 #45, `feat/auth-real-login` 브랜치에서 `auth-real-login` 구현 (PR #46)
- `authHttpClient`(`VITE_AUTH_BASE_URL`, credentials 포함) 추가. 로그인/갱신/로그아웃/`/me`는 `/realms/internal/*` 호출.
  access token을 localStorage에서 메모리로 옮겼다(새로고침 시 refresh 쿠키로 복원, `restoreSession`)
- `httpClient` 응답 인터셉터: 401 `UNAUTHENTICATED`(토큰을 보낸 요청만)면 갱신 후 한 번 재시도. 갱신은 한 번에 하나만
  보내고(교체형 refresh token), `TOKEN_ROTATED`(409)는 한 번 재시도한다
- `roleMapping.ts`: `/me`의 `roles`를 액터 모드·Permission으로 변환(`buildCurrentUser`). 매핑에 없는 role은 무시.
  창고 범위는 환경 변수로 대체. LoginPage는 이메일 입력으로 바꾸고 에러 code별 안내 문구를 콘솔이 정한다
- 로그아웃은 서버 세션을 폐기하고, 로컬 로그인 상태와 이전 사용자의 업무 데이터 캐시를 함께 지운다
- 로컬 환경: dozy-auth를 `SERVER_PORT=8081 AUTH_ISSUER_BASE_URL=http://localhost:8081
  AUTH_CORS_ALLOWED_ORIGINS=http://localhost:5173 AUTH_APP_URL_INTERNAL=http://localhost:5173`로 실행
  (`local` 프로필, Docker 필요). owner 초대 메일은 Mailpit(8025)에서 토큰을 받아 수락. 콘솔 `.env`에
  `VITE_AUTH_BASE_URL`, `VITE_WAREHOUSE_IDS` 추가(`VITE_MOCK_WAREHOUSE_ID`는 삭제)
- 검증: build/lint/test(146) 통과. 헤드리스 Chrome으로 실서버(auth 8081)에 대해 로그인 실패 문구, 로그인 →
  모드 선택(owner는 계정 관리자만 사용 가능) → 새로고침 후 세션 복원 → 로그아웃(서버 세션 폐기) →
  새로고침해도 로그아웃 유지까지 확인. 토큰 만료 중 자동 갱신은 단위 테스트로만 검증(10분 대기 미수행)
- 알려진 한계: 창고 관리자·본사 재고·MD 모드는 해당 role을 가진 직원이 있어야 쓸 수 있는데, dozy-auth에는
  `auth:owner`/`auth:admin`만 시드돼 있다. 해당 role 정의와 직원 초대는 직원·role 관리 화면(후속) 또는
  auth 관리 API로 만들어야 한다. 이 환경에서 창고 모드 화면은 실로그인으로 확인하지 못했다

### 2026-10-01 (창고 관리자 반품 관리)

- `/returns`(작업 큐), `/returns/history`(완료 이력) 추가. dozy-wms-api 반품 모델(`RECEIVED → INSPECTING → COMPLETED`)대로
  반품 접수 등록, 검수 시작(반품 처리장 점유), 품목별 검수(품목당 1회), Lot 확정 후 완료를 실 API로 호출
- 완료 시 정상 수량은 재고로 복귀, 불량 수량은 `RETURN_DEFECT` 폐기 요청으로 연계(폐기 관리 화면에서 처리). 완료 시 inventory·disposals 쿼리 invalidate
- 목록은 입고·출고와 같이 전체를 받아 클라이언트에서 AccessScope 필터·상태별 건수·정렬·페이지 분할(`paginateReturns`)
- `return.read`/`return.write` 권한, 창고 관리자 모드 사이드바 메뉴, 권한 문서 갱신
- 검증: build/lint/test(118) 통과, 실 백엔드로 접수→검수 시작→검수→완료(정상 5ea 재고 복귀) API 흐름 확인. 불량→폐기 연계는 입고와 같은
  서비스 패턴이라 별도 실행하지 않음. 화면(UI)은 내장 브라우저가 MSW 서비스 워커를 등록할 수 없어 직접 확인하지 못함
- 로컬 DB에 반품 처리장(RETURN) 작업구역을 추가 시드. 작업구역이 없으면 검수 시작이 `WORK_AREA_NOT_FOUND`로 실패함(메시지는 화면에 표시)
- 백엔드 관찰: `PATCH /return-items/:id/inspect`가 반품 요청 상태(INSPECTING)를 확인하지 않아 RECEIVED 상태에서도 호출된다
  (입고 검수도 동일 구조일 가능성). 화면은 INSPECTING에서만 입력 UI를 노출하므로 영향 없음

### 2026-10-01 (창고 관리자 폐기 관리)

- `/disposals`(작업 큐), `/disposals/history`(완료 이력) 추가. dozy-wms-api 폐기 모델(`REQUESTED → APPROVED → COMPLETED`)대로
  폐기 요청 등록, 승인(재고를 폐기 처리장으로 이동), 완료(재고 영구 제외)를 실 API로 호출
- 등록 대상은 불량·폐기 예정 재고(`GET /api/inventories?qualityStatus=`)뿐이며 서버 규칙상 폐기 수량은 재고 수량 전체라 입력받지 않음.
  직접 등록 사유는 `EXPIRED`/`OTHER`만 노출 — 검수·반품 불량은 입고/반품 완료가 자동으로 폐기 요청을 만든다
- 폐기 품목의 상품명은 폐기 가능 재고 목록에 남아 있는 건만 알 수 있어, 완료 건은 "재고 #id"로 표시(재고가 제외되므로)
- `disposal.read`/`disposal.write` 권한, 창고 관리자 모드 사이드바 메뉴, 권한 문서 갱신
- 검증: build/lint/test(105) 통과, 실 백엔드로 불량 입고 → 자동 폐기 요청 → 승인 → 완료(재고 제외) API 흐름 확인.
  화면(UI)은 내장 브라우저가 MSW 서비스 워커를 등록할 수 없어 직접 확인하지 못함
- 알려진 한계: NORMAL 재고를 폐기 예정으로 지정하는 액션(`mark-disposal-scheduled`)은 재고 쓰기 화면에서 제공 예정이라 아직 없음
  (유통기한 경과 재고를 폐기하려면 먼저 그 지정이 필요). 폐기 취소 API 없음

### 2026-10-01 (창고 관리자 출고 관리)

- `/outbounds`(작업 큐), `/outbounds/history`(완료 이력) 추가. dozy-wms-api 출고 모델(`REQUESTED → PICKING → INSPECTING → COMPLETED`)대로
  출고 요청 등록, 피킹 시작(FIFO 자동 점유), 검수 시작, 출고 완료를 실 API로 호출. 피킹 후 요청/피킹/부족 수량 표시
- 유통기한 임박 재고 우선 출고 권고(`GET /api/lots/outbound-recommendations`) 패널 추가
- 목록은 입고와 같이 전체를 받아 클라이언트에서 AccessScope 필터·상태별 건수·정렬·페이지 분할(`paginateOutbounds`)
- `outbound.read`/`outbound.write` 권한, 창고 관리자 모드 사이드바 메뉴, 권한 문서 갱신
- 검증: build/lint/test(92) 통과, 실 백엔드로 등록→피킹(재고 20/요청 25 → 부족 5)→검수→완료 API 흐름 확인.
  화면(UI)은 내장 브라우저가 MSW 서비스 워커를 등록할 수 없어 직접 확인하지 못함
- 로컬 dozy-wms-api DB가 초기화되어 있어 창고(762)·Zone A~E·작업구역·상품·입고 1건을 API로 재시드함.
  `.env`의 `VITE_MOCK_WAREHOUSE_ID`를 762로 갱신(로컬 전용)
- 알려진 한계: 출고 등록 시 재고를 사전 점검하지 않아 재고 부족은 피킹 시점에야 드러남. 출고 취소 API 없음

### 2026-10-01 (입고 관리 실 API 연동)

- 입고 화면을 dozy-wms-api 모델로 재작성: 상태 `EXPECTED/WAITING/PROCESSING/COMPLETED`, 입고 등록(상품·수량·도착예정일),
  `PATCH /processing`, 품목별 `PATCH /inbound-items/:id/inspect`(품목당 1회), Lot 확정 후 `PATCH /complete`
- 백엔드에 없는 기능 제거: 승인·도착·이동·적재완료 단계, 입고 요청 수정/분할, 공급사, 공간 점검(capacityCheck),
  적재 계획. 입고 MSW handler/mock 데이터도 삭제 — 이제 mock은 인증만 남음
- `GET /api/inbounds`는 창고 필터·페이지네이션이 없어 `useInbounds`가 전체를 받아 클라이언트에서 AccessScope 필터·
  상태별 건수·정렬·페이지 분할(`paginateInbounds`). 품목은 목록 N+1을 피하려 선택한 건만 조회하고 상품명(`/api/products`)·
  Zone 코드(zone-summary)를 합침. 완료 시 `inventory` 쿼리도 invalidate
- `httpClient`가 서버 에러 코드 필드 `errorCode`도 읽도록 수정
- 검증: build/lint/test(78) 통과, 실 백엔드로 등록→처리시작→검수→완료→Zone 사용량 반영 API 흐름 확인.
  화면(UI) 확인은 못 함 — 내장 브라우저는 MSW 서비스 워커 등록 불가(로그인이 mock이라 진입 불가), Chrome 확장 미연결
- 알려진 한계: 입고처리장(INBOUND) 용량 50 초과 입고는 처리 시작에서 서버가 거부(메시지를 화면에 표시).
  목록에 품목 수는 표시하지 않음. 입고 취소 API는 백엔드에 없음

### 2026-10-01 (dozy-wms-api 실연동)

- `mocks/handlers.ts`에서 `GET /api/warehouses/:id`, `GET /api/inventories/zone-summary` mock 제거,
  `main.tsx`의 MSW를 `onUnhandledRequest: 'bypass'`로 변경 — 인증·입고만 mock, 나머지는 실제 백엔드로 전달
- mock 사용자 `warehouseIds`/mock 입고의 창고 id를 `VITE_MOCK_WAREHOUSE_ID`(기본 543)로 주입. 로컬
  dozy-wms-api DB가 비어 있어 API로 창고(543)·Zone A~E·Location을 시드함 (F Zone은 백엔드 미지원으로 500)
- 검증: 실 응답을 Zod 스키마로 파싱 성공, CORS 프리플라이트 OK, build/lint/test 통과.
  내장 브라우저 패널은 MSW 서비스 워커 등록이 막혀 화면 확인은 못 함(Chrome 확장 미연결)
- 인증은 보류 유지(mock)

> 2026-09-24 이전 기록은 [docs/progress/archive.md](docs/progress/archive.md)에 있다.

## 다음 세션에서 할 일

- 새 작업은 `feature_list.json`에 항목을 먼저 등록한다. 화면은 계정 관리자 모드에 추가하고 `permissions.ts`에 Permission을 정의한다
- `roleMapping.ts`의 role 이름(`wms:warehouse_manager`, `wms:hq_inventory_manager`, `catalog:merchandiser`)을 운영 role 정의와 맞춘다. 로컬 auth DB에는 앞의 두 role을 등록해 두었다
- 담당 창고 API가 생기면 `VITE_WAREHOUSE_IDS`를 제거하고 `AccessScope`를 실제 값으로 채운다
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
