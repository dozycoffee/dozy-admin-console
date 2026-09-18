# CLAUDE.md

이 파일은 Claude Code가 이 레포에서 작업할 때 참고하는 보충 문서다. 프로젝트 개요, 아키텍처,
컨벤션 등 본문은 도구 무관 소스 오브 트루스인 [AGENT.md](AGENT.md)에 있으니 먼저 그것을 읽는다.
이 파일은 **Claude Code에서만 필요한 사항**만 다루며, `~/.claude/CLAUDE.md`(전역 규칙: 커밋 형식,
언어, 테스트 규율 등)에 이미 있는 내용은 반복하지 않는다.

## 세션 시작 시 읽는 순서

1. [AGENT.md](AGENT.md) — 프로젝트 개요와 아키텍처 원칙
2. [docs/architecture-checklist.md](docs/architecture-checklist.md) — 코드 작성 전 구조 체크리스트
3. [feature_list.json](feature_list.json) / [PROGRESS.md](PROGRESS.md) — 지금 무엇이 진행 중이고
   무엇이 남았는지

새 화면이나 기능을 추가하는 작업이라면 [docs/permission-policy-checklist.md](docs/permission-policy-checklist.md)도
함께 확인한다. 세션 초반에 한 번 확인해두면 작업 내내 적용되는 규칙들이라 매번 다시 읽지 않아도 된다.

## 행위 직전 매번 다시 읽는 문서

브랜치 생성·커밋·이슈/PR 작성 직전에는, 세션 초반에 이미 읽었더라도 매번
[docs/git-workflow.md](docs/git-workflow.md)를 다시 읽고 따른다. 세션이 길어지면 컨텍스트가
요약되며 예전에 읽은 내용이 사라질 수 있는데, 이런 행위는 빈도가 낮고 되돌리기 번거로우므로
"세션당 1회"가 아니라 행위 시점마다 확인해 유실 위험을 없앤다.

## UI 변경 검증

전역 규칙상 프런트엔드 변경은 브라우저에서 실제로 확인해야 한다. 이 프로젝트에서는 `npm run dev`로
Vite 개발 서버를 띄우고(`.claude/launch.json`에 등록되어 있지 않다면 먼저 등록한다), 변경한 화면의
golden path와 권한 분기(허용/`PermissionGate` fallback/`RequirePermission` 리다이렉트)를 모두
눈으로 확인한다. 타입체크(`npm run build`)와 lint(`npm run lint`)는 코드 정확성만 검증하며 화면이
의도대로 보이는지는 보장하지 않는다.

## 작업 흐름

이 프로젝트는 `feature_list.json` + `PROGRESS.md` 워크플로우를 사용한다. 전역 CLAUDE.md의 Task
Workflow 절차(대기 작업 확인 → 의존성 확인 → `in_progress` 전환 → 구현·검증 → `completed` 전환 →
PROGRESS.md 갱신)를 그대로 따른다.
