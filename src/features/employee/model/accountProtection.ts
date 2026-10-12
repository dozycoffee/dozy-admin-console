export type ProtectedAction = 'edit' | 'invitation' | 'suspend' | 'reactivate' | 'deactivate' | 'password-reset'

const OWNER_ROLE = 'auth:owner'
const ADMIN_ROLE = 'auth:admin'

/**
 * 대상 직원에게 이 작업을 할 수 없는 이유를 돌려준다(할 수 있으면 null).
 * dozy-auth의 보호 규칙을 화면에서 미리 반영하는 것이며 최종 판단은 서버(`PROTECTED_ACCOUNT`)가 한다.
 *
 * - GOV-03: owner 계정은 누구도 정지·비활성화할 수 없다(먼저 양도해야 한다)
 * - GOV-02: admin은 owner·admin 계정을 변경할 수 없다. owner만 가능하다
 *
 * @param isOwner 로그인한 사용자가 owner인지(`account.manage` 권한 보유 여부)
 */
export function blockedReason(action: ProtectedAction, targetRoles: readonly string[], isOwner: boolean): string | null {
  const targetIsOwner = targetRoles.includes(OWNER_ROLE)
  if (targetIsOwner && (action === 'suspend' || action === 'deactivate')) {
    return 'owner 계정은 정지·비활성화할 수 없습니다. 먼저 owner를 양도해야 합니다.'
  }
  if (!isOwner && (targetIsOwner || targetRoles.includes(ADMIN_ROLE))) {
    return 'owner·admin 계정은 owner만 변경할 수 있습니다.'
  }
  return null
}
