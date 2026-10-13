# PROGRESS

## 현재 상태

`feature_list.json`의 항목은 모두 완료했고 남은 `pending`은 없다. 콘솔은 로그인 후 **업무 모드(액터 모드)** 를 고르는 구조이며, 로그인·계정 관리는 dozy-auth 실서비스로,
창고 업무는 dozy-wms-api 실 API로 연동되어 있다(테스트 513개, CI는 PR마다 lint·typecheck·build·commitlint·test+coverage).

### 구현 현황

| 모드 | 화면 | 연동 |
|---|---|---|
| 공통 | 로그인(원래 화면 복귀), 초대 수락 `/invitation`, 비밀번호 찾기·재설정 `/password/*`, 내 계정 `/account`(조회·비밀번호 변경), owner 양도 수락 `/owner-transfer` | dozy-auth 실 API |
| 계정 관리자 | 직원 관리 `/employees`(목록·상세·추가(초대)·정보 수정·정지/해제/비활성화·재설정 메일·role 부여/회수), role·서비스 `/roles`, 시스템 클라이언트 `/system-clients`, owner 양도 `/owner`, 감사 로그 `/audit-logs`(owner 전용) | dozy-auth 실 API |
| 창고 관리자 | 입고·출고·폐기·반품 작업 큐와 이력(`/inbounds` `/outbounds` `/disposals` `/returns`), 재고 현황, 창고 평면도, 대시보드 | dozy-wms-api 실 API (재고 요약 일부·평면도·대시보드 카드는 mock) |
| 본사 재고 담당자 | 대시보드, 재고 현황, 창고 평면도 | 위와 같음 |
| MD | 모드 홈 골격만 | 별도 catalog MSA가 미구현이라 화면 없음 (Catalog 화면은 제거함) |

- **인증·권한 구조**: access token은 메모리에만 두고 앱 시작 시 refresh 쿠키(`dozy_refresh`)로 복원한다(dozy-auth ADR-0014). 업무 API가 401 `UNAUTHENTICATED`를 주면
  `httpClient`가 토큰을 갱신해 한 번 재시도하고 갱신까지 실패하면 로그아웃한다. dozy-auth의 role은 `roleMapping.ts` 한 곳에서 액터 모드·Permission으로 변환한다.
  owner 전용 기능은 `account.manage`(`auth:owner`에만 매핑), 프런트 권한 체크는 UX용이며 최종 판단은 서버다.
- **dozy-auth 연동 화면의 공통 규칙**: 에러는 `code`로만 분기하고 안내 문구는 콘솔이 정한다(`adminErrors.ts` 등). 1회용 secret·토큰은 화면 state에만 두고 캐시에 남기지 않는다.
  관리 API의 보호 규칙(owner·admin 보호 등)은 화면에서 버튼 비활성화로 미리 반영하되 서버 응답(`PROTECTED_ACCOUNT` 등)도 안내한다.

### 알려진 한계·미해결

- **role 이름은 임시값이다.** `roleMapping.ts`의 `wms:warehouse_manager`·`wms:hq_inventory_manager`·`catalog:merchandiser`는 운영 role 정의와 맞춰야 한다. dozy-auth가 시드하는 role은
  `auth:owner`/`auth:admin`뿐이라 나머지는 `/roles`에서 등록해야 한다.
- **창고 범위(`AccessScope.warehouseIds`)는 환경 변수로 대체한다.** auth에는 창고 개념이 없고 담당 창고·창고 목록 API도 없어 창고 관련 모드를 가진 사용자에게 `VITE_WAREHOUSE_IDS`를 준다.
- **dozy-wms-api는 아직 토큰을 검증하지 않는다**(dozy-wms-api ADR-0010의 `CurrentAccessScopeProvider`·`warehouseIds` 교차검증은 인증 연동 때 처리 예정). WMS는 inventory 분리 작업 중이라 WMS 쪽 연동은 건드리지 않는다.
- **일부 창고 데이터는 프런트 mock이다.** 창고 평면도(`WarehouseFloorPlan.tsx`)·대시보드 Zone 카드(`warehouseMockData.ts`)와 `InventoryPage`의 Location별 재고는 mock이다. 새 F Zone(MD 상품)도 이 mock 레이어에만 있고
  실제 `zone-summary`는 A~E만 돌려준다 — 운영하려면 dozy-wms-api에 Zone(F)을 먼저 만들어야 한다.
- **직원의 본인 정보(이름·전화번호·주소) 수정은 의도적으로 제외했다.** 관리자가 직원 관리 화면에서 고친다.
- **role이 없는 직원**은 로그인하면 `/access-denied`로 이동한다(모드가 하나도 없음). owner 양도 수락 화면(`/owner-transfer`)은 콘솔 셸 밖이라 role이 없어도 열 수 있다.
- **owner 양도**: dozy-auth에 진행 중인 양도 조회 API가 없어 요청 후 상태는 볼 수 없다(취소 버튼은 항상 보인다).
- dozy-auth 관리 API의 `VALIDATION_FAILED`는 원인(기간·UUID·형식)을 구분하지 않아 화면은 한 문구로 안내한다.

### 개발 환경

- **dozy-wms-api**: `http://localhost:8080`(`VITE_API_BASE_URL`). 로컬 DB에 창고·Zone·작업구역(입고·출고·반품·폐기 처리장)·상품이 시드되어 있어야 하고 창고 id를 `VITE_WAREHOUSE_IDS`에 넣는다.
- **dozy-auth**: Docker가 필요하다. 8080 충돌을 피해 `SERVER_PORT=8081 AUTH_ISSUER_BASE_URL=http://localhost:8081 AUTH_CORS_ALLOWED_ORIGINS=http://localhost:5173 AUTH_APP_URL_INTERNAL=http://localhost:5173
  ./gradlew :auth-server:bootRun --args='--spring.profiles.active=local'`(dozy-auth 저장소에서)로 띄우고 콘솔 `.env`에 `VITE_AUTH_BASE_URL=http://localhost:8081`을 둔다.
  첫 기동 때 owner 초대 메일이 Mailpit(`http://localhost:8025`)으로 가며, 링크가 콘솔의 `/invitation`을 연다. 처음에는 role이 `auth:owner`/`auth:admin`뿐이라 업무 role을 `/roles`에서 등록하고
  직원을 초대해 부여해야 창고 모드 등을 쓸 수 있다.
- MSW 핸들러는 비어 있다(`src/mocks/handlers.ts`). 백엔드 계약이 없는 API가 생기면 거기에 추가한다.
- UI 확인은 `npm run dev`(5173)와 위 서버들로 한다. 헤드리스 브라우저(Playwright)로도 확인할 수 있고 MSW 서비스 워커가 필요하지 않다.

### 컨벤션

- 이슈/PR은 `.github/ISSUE_TEMPLATE`·`.github/PULL_REQUEST_TEMPLATE.md` 구조를 따르고 라벨과 네이티브 Issue Type을 맞춘다(`docs/git-workflow.md`). 커밋은 Conventional Commits 7개 타입만(`commitlint.config.mjs`).
- 테스트는 Vitest + Testing Library로 소스 파일 옆에 co-location(`*.test.ts(x)`)한다. `vite.config.ts`의 `test.coverage.exclude`는 `app/**`, `mocks/**`, `pages/access-denied` 등 로직 없는 파일만 뺀다.
- 권한 정의는 `docs/permission-policy-checklist.md`, 구조는 `docs/architecture-checklist.md`를 따른다.

## 세션 로그

### 2026-10-13 (직원·role 관리 화면 개선)

- `fix/employee-add-wording` 브랜치. 이슈 없이 진행한 직원 관리 탭의 화면 개선
- **문구:** "직원 초대"를 **"직원 추가"**로 바꿨다(제출 버튼은 "직원 추가하기"). 계정 상태 "초대 대기", "초대 재발송"·"초대 취소", 감사 로그의 `EMPLOYEE_INVITED`("직원 초대")는 실제 초대 메일 절차를 가리키므로 그대로 둔다.
  dozy-auth에는 관리자가 비밀번호를 정해 직원을 만드는 기능이 없어(PWD-05) 추가는 항상 초대 방식이다
- **페이지네이션:** 서버 페이지네이션(`GET /admin/employees?page&size`)을 5명씩(`PAGE_SIZE`) 요청하고, 총 페이지가 2 이상일 때 이전/다음이 나온다. 필터·검색을 바꾸면 1페이지로 돌아가고,
  현재 페이지가 마지막 페이지를 넘으면(예: 활성 필터에서 마지막 페이지의 직원을 정지) 마지막 페이지로 되돌린다
- **고정 크기 카드:** 목록·상세 카드를 고정 높이(680px, `employee-workspace`, 화면 너비 1101px 이상)로 두어 내용 양에 따라 카드 크기와 이전/다음 버튼 위치가 바뀌지 않는다.
  목록은 항목 높이를 92px로 일정하게 맞춰(긴 이메일은 한 줄 말줄임, 전체는 title) 5명이 스크롤 없이 들어가고, 상세 카드는 내용이 넘칠 때만 카드 안에서 스크롤한다. 좁은 화면에서는 내용에 맞춘다. 다른 화면의 목록·상세(`inbound-workspace`)는 그대로다
- **직원 상세 구성:** 헤더(EMPLOYEE 라벨·이름·상태 배지)만 카드 가장자리에 붙이고 나머지는 `employee-detail-body`로 감싸 좌우 18px 들여 쓴다. 항상 있는 정보(이메일·전화번호·주소·등록일)는 "기본 정보" 아래에,
  "부여된 role"은 진한 섹션 제목(15px, 800)과 두 섹션 사이의 얇은 구분선으로 나눈다. role 추가 선택 상자는 380px로 좁혔다(system client 카드는 기존 폭)
- **상태 안내 박스:** 상태에 따라 나타나는 정보는 헤더 아래 별도 박스로 보여준다 — 유효한 초대 대기는 한 줄의 작은 노란 박스(라벨 "초대 만료" + 날짜, 헤더 배지가 상태를 알려 주므로 제목 없음),
  만료된 초대와 로그인 잠금은 풀폭·두 줄의 빨간 박스로 강조한다. 활성 직원에게는 박스가 없다
- **비활성화 사유는 툴팁:** "~할 수 없습니다" 류 사유를 본문 문장으로 늘어놓지 않는다. role 추가 행·role 회수 ×·작업 버튼은 상태와 관계없이 항상 같은 자리에 두고, 불가하면 비활성화하면서
  공용 `shared/ui/Tooltip`(호버·키보드 포커스, Esc 닫기, aria-describedby)으로 사유를 보여준다. 비활성화된 계정도 정보 수정 버튼이 비활성으로 남고 툴팁이 이유를 알려 준다
- **직원 추가·정보 수정은 모달:** 공용 `shared/ui/Modal`(Esc·× 로 닫고, 배경 클릭으로는 닫히지 않아 입력을 잃지 않으며, 포커스를 모달 안에 가두고 닫으면 원래 요소로 복원, `body`에 포털로 그림)을 쓴다.
  인라인 폼은 열 때 아래 목록과 이전/다음 버튼을 밀어내 고정 레이아웃과 충돌했다. 추가에 성공하면 모달을 닫고 필터를 풀어 새 직원을 선택하며, 성공 안내는 공용 토스트(아래 "성공 안내 토스트")로 보여준다.
  서버 에러(중복 이메일 등)는 모달 안에 보여준다
- **직원 추가는 2단계:** 1) 기본 정보(이메일·이름·전화번호·주소) → "다음", 2) 함께 부여할 role(선택) → "직원 추가하기". 현재 단계는 제목 오른쪽("직원 추가 | 1 / 2 기본 정보", Modal의 `titleAddon`)에 보여준다.
  "이전"으로 돌아가도 입력·선택은 유지되고, 1단계의 Enter는 추가가 아니라 다음 단계로 이동한다. role은 서비스별 그룹(WMS·CATALOG 등) 아래에 묶어 보여준다(system role 제외)
- **입력 검증:** 플레이스홀더로 형식 예시를 주고, 오류("이메일을 입력하세요." / "올바른 이메일 형식으로 입력하세요. (예: …)" / "이름을 입력하세요.")는 필드를 벗어날 때나 "다음"을 눌렀을 때 필드 아래 빨간 문구와 `aria-invalid`로 보여준다
  (입력 중에는 띄우지 않고 고치면 바로 사라짐). "다음"은 비활성으로 막지 않고 누르면 틀린 필드로 포커스를 옮긴다. 오류 문구 자리는 모든 필드 아래에 항상 확보해 오류가 뜨고 사라져도 모달 크기가 변하지 않는다.
  검사는 `inviteValidation.ts`이며 최종 판단은 서버가 한다
- **성공 안내 토스트:** 직원 추가·초대 재발송·재설정 메일 발송·role 변경(부여/회수), role 등록·수정·삭제, 서비스 추가의 성공 안내는 화면 안의 문장이 아니라 공용 토스트(`shared/ui/ToastProvider`·`useToast().notify`)로 띄운다.
  화면 오른쪽 위에 고정돼 스크롤 위치와 무관하게 보이고 레이아웃을 밀지 않으며, 8초 뒤 자동으로 닫히고(× 로 먼저 닫기 가능) 하나만 보여 새 안내가 이전 안내를 대체한다. 실패 안내는 읽고 조치해야 하므로 기존 위치(폼 아래·모달 안)에 둔다.
  owner 양도·내 계정·system client의 성공 문구는 아직 인라인이다
- **확인 모달·토스트는 `body`에 포털로 그린다:** 라우트 전환 애니메이션(`.route-transition`)이 끝난 뒤에도 `transform`이 남아 `position: fixed`가 화면이 아니라 페이지 컨테이너 기준이 되어,
  긴 페이지에서 모달이 화면 아래쪽에 뜨고 배경이 오른쪽까지 덮이지 않는 문제가 있었다
- **role 관리(`/roles`):**
  - 화면 문구의 "audience"는 운영자가 이해하기 쉽게 **"서비스"**로 통일했다(role 등록·목록 필터·서비스 패널·감사 로그 라벨·에러 문구). `wms:warehouse_manager` 같은 role code와 API 필드명(`audience`)은 서버와 맞춰야 하므로 그대로 둔다
  - role 수정은 목록 항목이 폼으로 바뀌던 인라인 방식에서 공용 `Modal`("role 수정 · 이름")로 바꿨다. 삭제는 기존 확인 모달(`ConfirmModal`, 부여된 인원이 있으면 영향 인원을 보여주고 한 번 더 확인)을 그대로 쓴다
  - 목록 항목은 이름 옆에 role code를 작은 고정폭 칩으로, 설명을 이름 아래 작고 옅은 글씨(12.5px)로 보여준다(이전에는 `.panel p`의 14px이 code·설명 스타일을 덮어써 둘 다 크게 보였다)
  - 서비스 필터는 API를 다시 부르지 않고 화면에서 거른다(`useRoles()`로 전부 받아 둠). 필터를 바꿀 때마다 새 쿼리가 생겨 목록이 비었다가 다시 그려지며 깜빡이던 문제를 없앴고,
    바뀔 때 목록이 View Transitions(`shared/lib/withViewTransition`)로 부드럽게 나타나고 사라진다(.25s, 목록만 전환). 지원하지 않는 브라우저나 "동작 줄이기" 설정에서는 전환 없이 바로 바뀐다
  - 서비스 추가는 인라인 폼을 유지하되 "서비스 추가"를 누르면 바로 추가하지 않고 확인 모달(`"주문" 서비스를 추가할까요?` — 추가한 서비스는 삭제할 수 없고 code도 바꿀 수 없다는 경고)을 거친다
  - 서비스 추가·role 등록 폼의 code 규칙 문장은 입력칸 아래에 늘 두지 않고 code 라벨 옆 "?" 배지(`shared/ui/FieldTip`)의 툴팁으로 보여준다. code가 규칙에 어긋날 때만 입력칸 아래에 규칙을 빨간 글씨로 알린다
  - role 등록·system client 등록은 아직 인라인 패널이다(필요하면 같은 `Modal`로 바꿀 수 있다)
- **시스템 클라이언트(`/system-clients`):**
  - secret은 페이지 맨 위 패널 대신 **모달**로 보여준다. 닫기 버튼(×)·Esc로는 닫히지 않고(공용 `Modal`의 `dismissible={false}`), 저장했다고 확인한 뒤 아래 "닫기"로만 닫는다. 복사 성공은 토스트로 알린다
  - 클라이언트 등록은 헤더 버튼으로 패널을 펼치던 방식에서 **모달**로 바꿨다. clientId·이름은 플레이스홀더(`svc-store`, `Store 서비스`)와 필드 아래 오류 문구(blur·등록 클릭 시, 오류 자리 확보), clientId 규칙은 라벨 옆 "?" 배지 툴팁으로 안내하고,
    role 선택은 서비스별 그룹으로 묶는다(`groupByAudience`를 `features/role/model`로 옮겨 직원 추가와 공유). 등록 버튼은 비활성으로 막지 않고 누르면 틀린 필드로 포커스를 옮긴다
  - 카드는 role 추가 행·role 회수 ×·secret 재발급·폐기를 상태와 관계없이 항상 같은 자리에 두고, 불가한 이유(정지·폐기·권한 없음)는 툴팁으로 알린다(본문 안내 문장 제거). role 추가 선택지는 서비스별 `optgroup`으로 묶고(직원 상세도 동일, `RoleOptions`),
    섹션 제목·구분선·role 칩은 직원 상세와 같은 스타일이다
  - role 부여·회수("이미 발급된 토큰에는 최대 10분 뒤에 반영")와 폐기 성공은 토스트로 알린다
  - 클라이언트가 많아질 때를 위해 카드를 **펴고 접을 수 있다**. 헤더(이름·clientId·role 수·상태 배지)를 누르거나 이름 옆 화살표(`aria-expanded`)로 상세(정보·role·작업)를 펴고 접으며, 접어도 이름·clientId·role 개수·상태는 보인다. 클라이언트가 3개 이하이면 처음부터 모두 펼치고(`FEW_CLIENTS`),
    그보다 많으면 모두 접어 둔다. 2개 이상이면 목록 위에 개수와 "모두 펴기"·"모두 접기"를 둔다. 접은 사이에도 카드의 입력 상태(선택한 role 등)는 유지된다(상세를 언마운트하지 않고 `hidden`)
  - 화면 문구의 "system client"는 **"시스템 클라이언트"**(축약은 "클라이언트")로 바꿨다(메뉴·제목·버튼·안내·툴팁·감사 로그 라벨). `clientId`·`secret`·`role` 같은 기술 식별자와 API 경로·코드 식별자는 그대로 둔다. "서비스 계정"은 audience를 "서비스"로 통일해 혼동될 수 있어 쓰지 않았다
  - 폐기된 카드는 `opacity: .7` 대신 옅은 배경·글씨로 구분한다. opacity가 1 미만이면 카드가 자체 쌓임 맥락이 되어 안의 툴팁이 같이 흐려지고(배경색이 달라 보임) 다른 카드 뒤로 가려졌다
  - 폐기(사유 입력) 모달이 인라인으로 그려져 `transform` 때문에 화면이 아닌 페이지 기준 중앙에 뜨고 배경도 일부만 덮던 문제를 `body` 포털 렌더링으로 고쳤다(`ReasonModal`, 직원 상세의 정지·비활성화에도 해당)
  - 로컬 auth DB에 테스트 client(`svc-wms-sync`, `svc-store`, `svc-catalog-sync`(정지), 폐기된 client 2개)가 들어 있다
- 검증: build/lint/test(619) 통과. 실서버에서 페이지 이동(5명 단위, 필터 시 1페이지 복귀), 모달 열기·단계 이동·오류 문구·툴팁·상태 안내 박스, role 수정·삭제·서비스 추가 확인 모달·토스트·필터 전환, system client 등록 모달·secret 모달(Esc로 안 닫힘)·툴팁·토스트를 헤드리스 Chrome으로 확인.
  만료된 초대 박스는 화면으로 확인하지 못해(72시간 경과 필요) 단위 테스트로만 검증했다
- 로컬 auth DB를 초기화하고 owner 시드와 직원 12명(활성·정지·초대 대기·비활성화 혼합)을 새로 넣었다

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

- 새 작업은 `feature_list.json`에 항목을 먼저 등록하고 `docs/git-workflow.md`의 이슈 → 브랜치 → PR 순서를 지킨다(이슈는 템플릿 구조·라벨·네이티브 Issue Type까지 맞춰 작성). 작업 중에는 `in_progress`, 끝나면 `completed`로 바꾸고 PROGRESS.md를 갱신한다
- 화면은 해당 모드의 `navigationByMode`·`AppRouter`에 함께 등록하고 `permissions.ts`·권한 정책 체크리스트에 Permission을 정의한다
- `roleMapping.ts`의 role 이름을 운영 role 정의와 맞춘다. 로컬 auth DB에는 `wms:warehouse_manager`·`wms:hq_inventory_manager`를 등록해 두었다
- 담당 창고 API가 생기면 `VITE_WAREHOUSE_IDS`를 제거하고 `AccessScope`를 실제 값으로 채운다. dozy-wms-api가 토큰 검증을 붙이면 role·scope 연동을 함께 확인한다
- 창고 평면도·대시보드 Zone 카드·Location별 재고를 실 `zone-summary`/재고 API로 옮기는 작업은 아직 없다(F Zone은 dozy-wms-api에 Zone이 생긴 뒤)
- 새 API 연동에서 로직이 생기면 파일 옆에 테스트를 같이 추가한다
