import type { Role } from '../model/roleSchemas'
import { groupByAudience } from '../model/groupRoles'

/** role 선택 상자(`<select>`)의 선택지를 서비스별 그룹(`<optgroup>`)으로 묶어 보여준다. 첫 "선택" 항목은 호출하는 쪽에서 둔다. */
export function RoleOptions({ roles }: { roles: readonly Role[] }) {
  return <>
    {groupByAudience(roles).map(([audience, groupRoles]) => (
      <optgroup key={audience} label={audience.toUpperCase()}>
        {groupRoles.map((role) => <option key={role.id} value={role.fullCode}>{role.name} ({role.fullCode})</option>)}
      </optgroup>
    ))}
  </>
}
