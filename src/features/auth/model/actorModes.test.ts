import { beforeEach, describe, expect, it } from 'vitest'
import { clearActiveActorMode, getActiveActorMode, setActiveActorMode } from './actorModeSession'
import { actorModeIds, actorModes, getActorMode, isActorModeId } from './actorModes'

beforeEach(() => {
  sessionStorage.clear()
})

describe('actorModes', () => {
  it('지원하는 모든 액터 모드를 고유한 id로 등록한다', () => {
    expect(actorModes).toHaveLength(4)
    expect(new Set(actorModes.map(({ id }) => id)).size).toBe(actorModes.length)
    expect(getActorMode(actorModeIds.merchandiser).label).toBe('MD (상품 담당)')
  })

  it('등록된 id만 액터 모드로 판별한다', () => {
    expect(isActorModeId(actorModeIds.warehouseManager)).toBe(true)
    expect(isActorModeId('unknown-mode')).toBe(false)
  })
})

describe('actorModeSession', () => {
  it('선택한 모드를 탭 세션에 저장하고 복원한다', () => {
    setActiveActorMode(actorModeIds.warehouseManager)

    expect(getActiveActorMode()).toBe(actorModeIds.warehouseManager)
  })

  it('등록되지 않은 저장값은 제거한다', () => {
    sessionStorage.setItem('dozy-admin-console:activeActorMode', 'removed-mode')

    expect(getActiveActorMode()).toBeNull()
    expect(sessionStorage.getItem('dozy-admin-console:activeActorMode')).toBeNull()
  })

  it('선택을 초기화한다', () => {
    setActiveActorMode(actorModeIds.accountAdministrator)
    clearActiveActorMode()

    expect(getActiveActorMode()).toBeNull()
  })
})
