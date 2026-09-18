# ADR (Architecture Decision Record)

이 디렉터리는 프로젝트에서 내린 **되돌리기 번거로운 결정**과 그 이유를 기록한다. `AGENT.md`가
"지금 규칙이 무엇인가"를 담는다면, ADR은 "왜 그 규칙이 됐는가·다른 대안은 무엇이었는가"를 담는다.
`docs/architecture-checklist.md`, `docs/permission-policy-checklist.md`를 감사(audit)할 때 "왜
이렇게 만들었는지"를 되짚어야 하면 여기를 먼저 본다.

## 언제 ADR을 쓰는가

- 여러 대안이 있었고, 그중 하나를 선택한 근거를 남겨야 나중에 재논의할 수 있는 결정
- 되돌리는 데 비용이 큰 결정 (권한 모델의 근본 구조, 상태 관리·검증 전략, 스타일링 방식 등)
- `AGENT.md`에 "규칙"으로만 적혀 있고 "왜"가 없는 항목을 발견했을 때 — 규칙을 옮기지 말고, 근거를
  ADR로 남긴 뒤 AGENT.md/체크리스트에서 링크

사소한 구현 선택(변수명, 특정 컴포넌트의 내부 로직)은 ADR 대상이 아니다.

## 템플릿

```markdown
# ADR-XXXX: 제목

## 상태
Proposed | Accepted | Deprecated | Superseded by ADR-YYYY

## 배경 (Context)
어떤 문제/제약 때문에 결정이 필요했는가. 고려한 대안은 무엇이었는가.

## 결정 (Decision)
무엇을 선택했는가.

## 결과 (Consequences)
이 결정으로 얻는 것과, 감수해야 하는 트레이드오프.
```

## 목록

| ID | 제목 | 상태 |
|---|---|---|
| [0001](0001-permission-accessscope-authorization-model.md) | 화면 복제 대신 Permission·AccessScope로 권한 제어 | Accepted |
| [0002](0002-tanstack-query-for-server-state.md) | 서버 상태 관리 표준으로 TanStack Query 채택 | Accepted |
| [0003](0003-zod-for-api-response-validation.md) | API 응답 검증 계층으로 Zod 채택 | Accepted |

새 ADR은 `NNNN-kebab-case-제목.md` 형식으로 추가하고, 이 표에도 반드시 등록한다.
