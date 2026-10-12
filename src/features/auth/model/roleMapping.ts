import { actorModeIds, actorModes, type ActorModeId } from './actorModes'
import { permissions, type CurrentUser, type Permission } from './permissions'

/**
 * dozy-auth는 "누구인지"와 "어떤 role을 가졌는지"만 보증하고, 그 role로 무엇을 허용할지는 각 서비스가 정한다.
 * 이 콘솔에서는 auth의 role(`{audience}:{code}`)을 액터 모드와 Permission으로 바꾸는 규칙을 이 파일 한 곳에 둔다.
 *
 * 프런트의 이 매핑은 메뉴 잠금·리다이렉트 같은 UX용이며 보안 경계가 아니다. 실제 인가는 각 API 서버가 한다.
 * role 정의 자체는 dozy-auth의 관리 화면(`POST /admin/roles`)에서 만들므로, 여기 있는 code가
 * 운영 중인 role 이름과 같아야 권한이 부여된다.
 */
type RoleGrant = {
  actorModes: readonly ActorModeId[]
  permissions: readonly Permission[]
}

const accountAdministratorGrant: RoleGrant = {
  actorModes: [actorModeIds.accountAdministrator],
  permissions: [permissions.dashboardRead],
}

export const roleGrants: Readonly<Record<string, RoleGrant>> = {
  'auth:owner': accountAdministratorGrant,
  'auth:admin': accountAdministratorGrant,
  'wms:warehouse_manager': {
    actorModes: [actorModeIds.warehouseManager],
    permissions: [
      permissions.dashboardRead,
      permissions.inventoryRead,
      permissions.inboundRead,
      permissions.inboundWrite,
      permissions.outboundRead,
      permissions.outboundWrite,
      permissions.disposalRead,
      permissions.disposalWrite,
    ],
  },
  'wms:hq_inventory_manager': {
    actorModes: [actorModeIds.headquartersInventoryManager],
    permissions: [permissions.dashboardRead, permissions.inventoryRead],
  },
  'catalog:merchandiser': {
    actorModes: [actorModeIds.merchandiser],
    permissions: [permissions.dashboardRead],
  },
}

/** 창고 데이터(AccessScope.warehouseIds)를 다루는 모드. auth에는 창고 개념이 없다. */
const warehouseScopedModes: readonly ActorModeId[] = [actorModeIds.warehouseManager, actorModeIds.headquartersInventoryManager]

/** `VITE_WAREHOUSE_IDS`(쉼표로 구분한 창고 id)를 숫자 배열로 바꾼다. 숫자가 아닌 항목은 버린다. */
export function parseWarehouseIds(raw: string | undefined): number[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^\d+$/.test(value))
    .map(Number)
}

type MeSummary = { principalId: string; name: string; roles: readonly string[] }

/**
 * auth의 `/me` 응답을 콘솔의 CurrentUser로 바꾼다.
 * 매핑에 없는 role은 무시하며, 허용 모드가 하나도 없으면 모든 모드가 잠금 상태로 보인다.
 * 창고 범위는 창고 목록·담당 창고 API가 생기기 전까지 `warehouseIds`(환경 설정)로 대신한다.
 */
export function buildCurrentUser(me: MeSummary, warehouseIds: readonly number[]): CurrentUser {
  const grants = me.roles.flatMap((role) => roleGrants[role] ?? [])
  const grantedModes = new Set(grants.flatMap((grant) => grant.actorModes))
  const grantedPermissions = new Set(grants.flatMap((grant) => grant.permissions))
  const hasWarehouseData = warehouseScopedModes.some((mode) => grantedModes.has(mode))

  return {
    id: me.principalId,
    name: me.name,
    // 모드 선택 모달의 카드 순서와 같도록 레지스트리 순서를 따른다.
    actorModes: actorModes.map(({ id }) => id).filter((id) => grantedModes.has(id)),
    permissions: Object.values(permissions).filter((permission) => grantedPermissions.has(permission)),
    scope: { warehouseIds: hasWarehouseData ? [...warehouseIds] : [] },
  }
}
