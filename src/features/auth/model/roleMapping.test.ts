import { describe, expect, it } from 'vitest'
import { actorModeIds } from './actorModes'
import { permissions } from './permissions'
import { buildCurrentUser, parseWarehouseIds } from './roleMapping'

const base = { principalId: '0199a3c4-7b2e-7c1a-9f3d-2b6e8a1c4d5f', name: '김도윤' }

describe('parseWarehouseIds', () => {
  it('쉼표로 구분한 창고 id를 숫자 배열로 바꾼다', () => {
    expect(parseWarehouseIds('1, 2,3')).toEqual([1, 2, 3])
  })

  it('값이 없거나 숫자가 아닌 항목은 버린다', () => {
    expect(parseWarehouseIds(undefined)).toEqual([])
    expect(parseWarehouseIds('')).toEqual([])
    expect(parseWarehouseIds('1,abc,,-2,3')).toEqual([1, 3])
  })
})

describe('buildCurrentUser', () => {
  it('auth 관리 role은 계정 관리자 모드와 대시보드 권한만 준다', () => {
    const user = buildCurrentUser({ ...base, roles: ['auth:admin'] }, [1])

    expect(user.id).toBe(base.principalId)
    expect(user.name).toBe('김도윤')
    expect(user.actorModes).toEqual([actorModeIds.accountAdministrator])
    expect(user.permissions).toEqual([permissions.dashboardRead])
    expect(user.scope.warehouseIds).toEqual([])
  })

  it('창고 관리자 role은 입출고·폐기 권한과 환경 설정의 창고 범위를 준다', () => {
    const user = buildCurrentUser({ ...base, roles: ['wms:warehouse_manager'] }, [1, 2])

    expect(user.actorModes).toEqual([actorModeIds.warehouseManager])
    expect(user.permissions).toEqual(
      expect.arrayContaining([permissions.inboundWrite, permissions.outboundWrite, permissions.disposalWrite, permissions.inventoryRead]),
    )
    expect(user.scope.warehouseIds).toEqual([1, 2])
  })

  it('본사 재고 담당자 role은 재고 조회만 허용한다', () => {
    const user = buildCurrentUser({ ...base, roles: ['wms:hq_inventory_manager'] }, [1])

    expect(user.actorModes).toEqual([actorModeIds.headquartersInventoryManager])
    expect(user.permissions).toEqual([permissions.dashboardRead, permissions.inventoryRead])
    expect(user.scope.warehouseIds).toEqual([1])
  })

  it('여러 role의 모드와 권한을 합치고 중복을 제거하며 모드는 레지스트리 순서를 따른다', () => {
    const user = buildCurrentUser({ ...base, roles: ['wms:hq_inventory_manager', 'auth:owner', 'wms:warehouse_manager'] }, [1])

    expect(user.actorModes).toEqual([
      actorModeIds.accountAdministrator,
      actorModeIds.warehouseManager,
      actorModeIds.headquartersInventoryManager,
    ])
    expect(new Set(user.permissions).size).toBe(user.permissions.length)
  })

  it('매핑에 없는 role이나 role이 없는 직원은 어떤 모드와 권한도 갖지 못한다', () => {
    const user = buildCurrentUser({ ...base, roles: ['store:unknown', 'wms:inbound_manager'] }, [1])

    expect(user.actorModes).toEqual([])
    expect(user.permissions).toEqual([])
    expect(user.scope.warehouseIds).toEqual([])
    expect(buildCurrentUser({ ...base, roles: [] }, [1]).actorModes).toEqual([])
  })

  it('환경 설정 배열을 복사해 넘겨 호출 간에 공유하지 않는다', () => {
    const warehouseIds = [1]
    const user = buildCurrentUser({ ...base, roles: ['wms:warehouse_manager'] }, warehouseIds)

    expect(user.scope.warehouseIds).not.toBe(warehouseIds)
  })
})
