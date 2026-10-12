import type { Role } from '../../role/model/roleSchemas'
import type { EmployeeStatus } from './employeeSchemas'

const OWNER_ROLE = 'auth:owner'
const ADMIN_ROLE = 'auth:admin'

/**
 * 직원에게 새로 부여할 수 있는 role 목록. 이미 가진 role은 뺀다.
 * - GOV-05: `auth:owner`는 부여 API로 다룰 수 없고(양도만 가능), `auth:admin`은 owner만 부여할 수 있다.
 *
 * @param isOwner 로그인한 사용자가 owner인지(`account.manage` 권한 보유 여부)
 */
export function assignableRoles(all: readonly Role[], held: readonly string[], isOwner: boolean): Role[] {
  return all.filter((role) => !held.includes(role.fullCode) && role.fullCode !== OWNER_ROLE && (role.fullCode !== ADMIN_ROLE || isOwner))
}

/** 이 role을 회수할 수 없는 이유(회수할 수 있으면 null). GOV-05 */
export function revokeBlockedReason(roleCode: string, isOwner: boolean): string | null {
  if (roleCode === OWNER_ROLE) return 'owner role은 회수할 수 없습니다. owner를 양도해야 합니다.'
  if (roleCode === ADMIN_ROLE && !isOwner) return 'admin 해임은 owner만 할 수 있습니다.'
  return null
}

/** 이 직원에게 role을 부여할 수 없는 이유(부여할 수 있으면 null). GOV-04, GOV-07 */
export function grantBlockedReason({ status, isSelf }: { status: EmployeeStatus; isSelf: boolean }): string | null {
  if (isSelf) return '자기 자신에게는 role을 부여할 수 없습니다.'
  if (status === 'SUSPENDED') return '정지된 직원에게는 role을 부여할 수 없습니다. 정지를 해제한 뒤 부여하세요.'
  if (status === 'DEACTIVATED') return '비활성화된 계정에는 role을 부여할 수 없습니다.'
  return null
}
