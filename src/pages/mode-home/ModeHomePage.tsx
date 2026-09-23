import { actorModeIds, getActorMode } from '../../features/auth/model/actorModes'
import { useAuth } from '../../features/auth/model/useAuth'
import { DashboardPage } from '../dashboard/DashboardPage'

const modeHomeContent = {
  [actorModeIds.accountAdministrator]: {
    eyebrow: 'ACCOUNT ADMINISTRATION',
    title: '계정 관리 콘솔',
    description: '사용자 계정과 역할별 접근 권한을 관리하세요.',
    tasks: ['사용자 계정 관리', '모드 권한 할당', '접근 이력 확인'],
  },
  [actorModeIds.merchandiser]: {
    eyebrow: 'MERCHANDISING',
    title: '상품 운영 콘솔',
    description: '상품 정보와 판매 정책 및 운영 상태를 관리하세요.',
    tasks: ['상품 정보 관리', '판매 정책 설정', '상품 운영 현황'],
  },
} as const

export function ModeHomePage() {
  const { activeActorMode } = useAuth()

  if (activeActorMode === actorModeIds.warehouseManager || activeActorMode === actorModeIds.headquartersInventoryManager) {
    return <DashboardPage />
  }

  if (!activeActorMode) return null
  const mode = getActorMode(activeActorMode)
  const content = modeHomeContent[activeActorMode]

  return (
    <div>
      <header className="page-header">
        <div>
          <p>{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <span>{content.description}</span>
        </div>
      </header>
      <section className="mode-home-grid" aria-label={`${mode.label} 주요 업무`}>
        {content.tasks.map((task, index) => (
          <article key={task}>
            <span>0{index + 1}</span>
            <h2>{task}</h2>
            <p>세부 기능은 해당 업무 서비스 연동과 함께 제공됩니다.</p>
          </article>
        ))}
      </section>
    </div>
  )
}
