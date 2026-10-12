import { z } from 'zod'

/** dozy-auth 감사 action(domain.md AUD-01). 서버가 모르는 값은 400이라 이 목록 안에서만 고른다. */
export const auditActionGroups: ReadonlyArray<{ label: string; actions: ReadonlyArray<{ code: string; label: string }> }> = [
  { label: '로그인·세션', actions: [
    { code: 'LOGIN_SUCCEEDED', label: '로그인 성공' },
    { code: 'LOGIN_FAILED', label: '로그인 실패' },
    { code: 'ACCOUNT_LOCKED', label: '계정 잠금' },
    { code: 'SESSION_REVOKED', label: '세션 폐기' },
  ] },
  { label: '비밀번호', actions: [
    { code: 'PASSWORD_CHANGED', label: '비밀번호 변경' },
    { code: 'PASSWORD_RESET', label: '비밀번호 재설정' },
    { code: 'PASSWORD_RESET_REQUESTED', label: '재설정 메일 발송(관리자)' },
  ] },
  { label: '계정', actions: [
    { code: 'EMPLOYEE_INVITED', label: '직원 초대' },
    { code: 'INVITATION_ACCEPTED', label: '초대 수락' },
    { code: 'PARTNER_SIGNED_UP', label: '파트너 가입' },
    { code: 'EMAIL_VERIFIED', label: '이메일 인증' },
    { code: 'PROFILE_UPDATED', label: '정보 수정' },
    { code: 'ACCOUNT_SUSPENDED', label: '계정 정지' },
    { code: 'ACCOUNT_REACTIVATED', label: '정지 해제' },
    { code: 'ACCOUNT_DEACTIVATED', label: '계정 비활성화' },
  ] },
  { label: 'role·audience', actions: [
    { code: 'ROLE_GRANTED', label: 'role 부여' },
    { code: 'ROLE_REVOKED', label: 'role 회수' },
    { code: 'ROLE_DEFINED', label: 'role 등록' },
    { code: 'ROLE_UPDATED', label: 'role 수정' },
    { code: 'ROLE_DELETED', label: 'role 삭제' },
    { code: 'AUDIENCE_CREATED', label: 'audience 추가' },
  ] },
  { label: 'system client·owner', actions: [
    { code: 'SYSTEM_CLIENT_REGISTERED', label: 'system client 등록' },
    { code: 'CLIENT_SECRET_ROTATED', label: 'client secret 재발급' },
    { code: 'OWNER_TRANSFER_REQUESTED', label: 'owner 양도 요청' },
    { code: 'OWNER_TRANSFER_CANCELLED', label: 'owner 양도 취소' },
    { code: 'OWNER_TRANSFERRED', label: 'owner 양도 완료' },
  ] },
]

const actionLabels = new Map(auditActionGroups.flatMap((group) => group.actions.map((action) => [action.code, action.label])))

/** 화면에 보일 action 이름. 목록에 없는 새 action은 코드를 그대로 보여준다. */
export function auditActionLabel(code: string): string {
  return actionLabels.get(code) ?? code
}

/** 대상 종류(data-model.md §3.11) */
export const auditTargetTypes = ['PRINCIPAL', 'ROLE', 'AUDIENCE', 'SESSION'] as const
export const auditTargetTypeLabels: Record<(typeof auditTargetTypes)[number], string> = {
  PRINCIPAL: '계정',
  ROLE: 'role',
  AUDIENCE: 'audience',
  SESSION: '세션',
}

// 행위자·대상은 id와 type만 담고 이름·이메일 같은 개인정보는 담지 않는다(AUD-07). 시스템 작업은 id·type이 null이다.
export const auditLogSchema = z.object({
  id: z.number(),
  occurredAt: z.string(),
  actorId: z.string().nullish(),
  actorType: z.string().nullish(),
  action: z.string(),
  targetType: z.string().nullish(),
  targetId: z.string().nullish(),
  detail: z.record(z.string(), z.unknown()).nullish(),
  ip: z.string().nullish(),
})
export type AuditLog = z.infer<typeof auditLogSchema>

export const auditLogPageSchema = z.object({
  items: z.array(auditLogSchema),
  page: z.object({ number: z.number(), size: z.number(), totalElements: z.number(), totalPages: z.number() }),
})

export type AuditLogParams = {
  /** ISO 8601. 없으면 서버 기본(최근 7일)이다. */
  from?: string
  to?: string
  actorId?: string
  targetType?: string
  targetId?: string
  actions: string[]
  /** 0부터 시작 */
  page: number
  size: number
}
