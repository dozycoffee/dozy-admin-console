import { useState, type FormEvent } from 'react'
import { permissions } from '../../features/auth/model/permissions'
import { useAuth } from '../../features/auth/model/useAuth'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import { selectionTypeLabels, type OptionGroup } from '../../features/catalog/model/catalogSchemas'
import { useOptionGroups } from '../../features/catalog/model/useCatalog'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/toastContext'
import { OptionGroupDetail, type PendingConfirm } from './OptionGroupDetail'
import { OptionGroupForm } from '../../features/catalog/ui/OptionGroupForm'

const emptyGroups: OptionGroup[] = []

/** MD가 옵션 그룹(사이즈·샷 추가처럼 상품에 연결하는 옵션 묶음)을 관리하는 화면. 변경은 `catalog.write`가 있을 때만 할 수 있다. */
export function OptionGroupsPage() {
  const { can } = useAuth()
  const writable = can(permissions.catalogWrite)
  const { notify } = useToast()
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const query = useOptionGroups(keyword)
  const groups = query.data ?? emptyGroups
  const selected = groups.find((group) => group.id === selectedId) ?? groups[0]

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setKeyword(searchInput)
    setSelectedId(null)
  }

  return <>
    <header className="page-header inbound-page-header">
      <div><p>MERCHANDISING</p><h1>옵션 그룹</h1></div>
      {writable && <button type="button" className="inbound-action-button employee-invite-toggle" aria-haspopup="dialog" onClick={() => setAddOpen(true)}>옵션 그룹 추가</button>}
    </header>
    <Modal open={addOpen} title="옵션 그룹 추가" className="option-form-modal" onClose={() => setAddOpen(false)}>
      <OptionGroupForm
        onCancel={() => setAddOpen(false)}
        // 새 그룹은 목록 맨 뒤에 오므로 검색을 풀고 그 그룹을 선택해 보여준다.
        onDone={(created) => { setAddOpen(false); notify(`옵션 그룹 "${created.name}"을 추가했습니다.`); setSearchInput(''); setKeyword(''); setSelectedId(created.id) }}
        onConflict={() => setAddOpen(false)}
      />
    </Modal>
    <form className="panel employee-filters" onSubmit={submitSearch} role="search" aria-label="옵션 그룹 검색">
      <label className="employee-filter-search">이름
        <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="옵션 그룹 이름" autoComplete="off" />
      </label>
      <button type="submit" className="inbound-action-button">검색</button>
    </form>
    {query.isLoading && <section className="panel"><p>옵션 그룹을 불러오는 중입니다...</p></section>}
    {query.isError && <section className="panel"><h2>옵션 그룹을 불러오지 못했습니다</h2><p role="alert">{toCatalogErrorMessage(query.error)}</p></section>}
    {query.data && <section className="inbound-workspace">
      <aside className="panel inbound-list-panel">
        <div className="panel-heading"><div><p className="eyebrow">OPTION GROUPS</p><h2>옵션 그룹 목록</h2></div><small>{groups.length}개</small></div>
        <div className="inbound-list">
          {groups.map((group) => <button type="button" key={group.id} className={`inbound-list-item ${selected?.id === group.id ? 'selected' : ''}`} onClick={() => setSelectedId(group.id)}>
            <strong>{group.name}</strong>
            <small>{selectionTypeLabels[group.selectionType]} · {group.required ? '필수' : '선택'} · 옵션 {group.options.length}개</small>
          </button>)}
          {groups.length === 0 && <p className="inbound-empty">{keyword === '' ? '등록된 옵션 그룹이 없습니다.' : '조건에 맞는 옵션 그룹이 없습니다.'}</p>}
        </div>
      </aside>
      {selected
        ? <OptionGroupDetail key={selected.id} group={selected} writable={writable} confirm={setPendingConfirm} onDeleted={() => setSelectedId(null)} />
        : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">OPTION GROUPS</p><h2>선택한 옵션 그룹이 없습니다</h2><span>목록에서 옵션 그룹을 선택하세요.</span></div></section>}
    </section>}
    <ConfirmModal open={pendingConfirm !== null} title={pendingConfirm?.title ?? ''} description={pendingConfirm?.description} confirmLabel={pendingConfirm?.confirmLabel} onCancel={() => setPendingConfirm(null)} onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null) }} />
  </>
}
