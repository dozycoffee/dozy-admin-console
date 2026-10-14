import { useState } from 'react'
import { permissions } from '../../features/auth/model/permissions'
import { useAuth } from '../../features/auth/model/useAuth'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { CategoriesPanel } from './CategoriesPanel'
import { GroupsPanel } from './GroupsPanel'
import { TagsPanel } from './TagsPanel'
import type { PendingConfirm } from './taxonomyShared'

type TabId = 'categories' | 'tags' | 'groups'
const tabs: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'categories', label: '카테고리' },
  { id: 'tags', label: '태그' },
  { id: 'groups', label: '상품 그룹' },
]

/** MD가 상품 분류(카테고리·태그·상품 그룹)를 관리하는 화면. 변경은 `catalog.write`가 있을 때만 할 수 있다. */
export function TaxonomyPage() {
  const { can } = useAuth()
  const writable = can(permissions.catalogWrite)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [active, select] = useState<TabId>('categories')

  return <>
    <header className="page-header inbound-page-header">
      <div><p>MERCHANDISING</p><h1>분류 관리</h1></div>
    </header>
    <div className="taxonomy-tabs" role="tablist" aria-label="분류 종류">
      {tabs.map((tab) => <button type="button" key={tab.id} role="tab" id={`taxonomy-tab-${tab.id}`} aria-selected={active === tab.id} aria-controls={`taxonomy-panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1} className={`taxonomy-tab${active === tab.id ? ' active' : ''}`} onClick={() => select(tab.id)}>{tab.label}</button>)}
    </div>
    <div role="tabpanel" id={`taxonomy-panel-${active}`} aria-labelledby={`taxonomy-tab-${active}`}>
      {active === 'categories' && <CategoriesPanel writable={writable} confirm={setPendingConfirm} />}
      {active === 'tags' && <TagsPanel writable={writable} confirm={setPendingConfirm} />}
      {active === 'groups' && <GroupsPanel writable={writable} confirm={setPendingConfirm} />}
    </div>
    <ConfirmModal open={pendingConfirm !== null} title={pendingConfirm?.title ?? ''} description={pendingConfirm?.description} confirmLabel={pendingConfirm?.confirmLabel} onCancel={() => setPendingConfirm(null)} onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null) }} />
  </>
}
