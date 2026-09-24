export const actorModeIds = {
  accountAdministrator: 'account-administrator',
  merchandiser: 'merchandiser',
  warehouseManager: 'warehouse-manager',
  headquartersInventoryManager: 'headquarters-inventory-manager',
} as const

export type ActorModeId = (typeof actorModeIds)[keyof typeof actorModeIds]

export type ActorMode = {
  id: ActorModeId
  label: string
  shortLabel: string
  description: string
}

/**
 * 선택 모달과 콘솔에서 함께 사용하는 액터 모드 레지스트리다.
 * 새 모드는 이 목록과 서버의 허용 모드 응답에 추가한다.
 */
export const actorModes: readonly ActorMode[] = [
  {
    id: actorModeIds.accountAdministrator,
    label: '계정 관리자',
    shortLabel: '계정 관리',
    description: '사용자 계정과 역할 및 접근 권한을 관리합니다.',
  },
  {
    id: actorModeIds.merchandiser,
    label: 'MD (상품 담당)',
    shortLabel: 'MD',
    description: '상품 정보와 판매 정책 및 운영 상태를 관리합니다.',
  },
  {
    id: actorModeIds.warehouseManager,
    label: '창고 관리자',
    shortLabel: '창고 관리',
    description: '입출고 작업과 창고 재고 및 공간을 관리합니다.',
  },
  {
    id: actorModeIds.headquartersInventoryManager,
    label: '본사 재고 담당자',
    shortLabel: '본사 재고',
    description: '전체 창고의 재고 현황과 배분을 관리합니다.',
  },
]

export function isActorModeId(value: string): value is ActorModeId {
  return actorModes.some((mode) => mode.id === value)
}

export function getActorMode(modeId: ActorModeId): ActorMode {
  const mode = actorModes.find(({ id }) => id === modeId)
  if (!mode) throw new Error(`등록되지 않은 액터 모드입니다: ${modeId}`)
  return mode
}
