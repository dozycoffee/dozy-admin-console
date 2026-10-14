import { useState } from 'react'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import type { ProductGroup } from '../../features/catalog/model/catalogSchemas'
import { removalDescription } from '../../features/catalog/model/removalDescription'
import { useCountProducts, useProductGroups } from '../../features/catalog/model/useCatalog'
import { useCreateProductGroup, useDeleteProductGroup, useRenameProductGroup } from '../../features/catalog/model/useTaxonomyMutations'
import { useToast } from '../../shared/ui/toastContext'
import { NameFormModal } from './NameFormModal'
import { RowAction } from './RowAction'
import { NO_WRITE_REASON, type PendingConfirm } from './taxonomyShared'

type Props = { writable: boolean; confirm: (pending: PendingConfirm) => void }
type Dialog = { kind: 'create' } | { kind: 'rename'; group: ProductGroup }

/**
 * 상품 그룹 관리(요구사항 1.8). 본사가 상품을 임의로 묶는 내부 관리용 분류이며 점주·손님에게는 보이지 않는다.
 * 삭제하면 서버가 그 그룹을 참조하던 모든 상품에서 자동으로 빼므로, 확인 모달에 영향을 받는 상품 수를 보여 준다.
 */
export function GroupsPanel({ writable, confirm }: Props) {
  const { notify } = useToast()
  const query = useProductGroups()
  const create = useCreateProductGroup()
  const rename = useRenameProductGroup()
  const remove = useDeleteProductGroup()
  const countProducts = useCountProducts()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [open, setOpen] = useState(false)
  const [counting, setCounting] = useState(false)
  const groups = query.data ?? []
  const busy = create.isPending || rename.isPending || remove.isPending || counting
  const reason = !writable ? NO_WRITE_REASON : busy ? '처리 중입니다.' : null

  function show(next: Dialog) {
    create.reset()
    rename.reset()
    setDialog(next)
    setOpen(true)
  }

  async function askDelete(group: ProductGroup) {
    remove.reset()
    setCounting(true)
    const count = await countProducts({ groupId: group.id }).catch(() => null)
    setCounting(false)
    confirm({
      title: `"${group.name}" 상품 그룹을 삭제할까요?`,
      description: removalDescription('이 상품 그룹에 속한', count),
      confirmLabel: '삭제',
      run: () => remove.mutate(group.id, { onSuccess: () => notify(`"${group.name}" 상품 그룹을 삭제했습니다.`) }),
    })
  }

  return <section className="panel taxonomy-panel" aria-label="상품 그룹">
    <div className="panel-heading">
      <div><p className="eyebrow">PRODUCT GROUPS</p><h2>상품 그룹</h2></div>
      {writable && <button type="button" className="inbound-action-button" aria-haspopup="dialog" disabled={busy} onClick={() => show({ kind: 'create' })}>그룹 추가</button>}
    </div>
    <p className="employee-hint taxonomy-hint">상품 관리 편의를 위해 본사가 상품을 묶는 내부용 분류입니다. 가맹점과 손님에게는 보이지 않습니다.</p>
    {query.isLoading && <p>상품 그룹을 불러오는 중입니다...</p>}
    {query.isError && <p className="inbound-error" role="alert">{toCatalogErrorMessage(query.error)}</p>}
    {remove.isError && <p className="inbound-error" role="alert">{toCatalogErrorMessage(remove.error)}</p>}
    {query.data && groups.length === 0 && <p className="inbound-empty">등록된 상품 그룹이 없습니다.</p>}
    <ul className="taxonomy-list">
      {groups.map((group) => <li key={group.id} className="taxonomy-row">
        <span className="taxonomy-name"><strong>{group.name}</strong></span>
        <span className="taxonomy-actions">
          <RowAction label="이름 변경" target={group.name} reason={reason} onClick={() => show({ kind: 'rename', group })} />
          <RowAction label="삭제" target={group.name} danger reason={reason} onClick={() => void askDelete(group)} />
        </span>
      </li>)}
    </ul>
    <NameFormModal
      open={open && dialog?.kind === 'create'}
      title="상품 그룹 추가"
      label="이름"
      placeholder="여름 시즌"
      submitLabel="추가"
      pending={create.isPending}
      error={create.error}
      onClose={() => setOpen(false)}
      onSubmit={(name) => create.mutate(name, { onSuccess: () => { setOpen(false); notify(`상품 그룹 "${name}"을 추가했습니다.`) } })}
    />
    <NameFormModal
      open={open && dialog?.kind === 'rename'}
      title={dialog?.kind === 'rename' ? `상품 그룹 이름 변경 · ${dialog.group.name}` : '상품 그룹 이름 변경'}
      label="이름"
      placeholder="상품 그룹 이름"
      initialName={dialog?.kind === 'rename' ? dialog.group.name : undefined}
      submitLabel="저장"
      hint="바꾼 이름은 바로 반영됩니다."
      pending={rename.isPending}
      error={rename.error}
      onClose={() => setOpen(false)}
      onSubmit={(name) => dialog?.kind === 'rename' && rename.mutate({ id: dialog.group.id, name }, { onSuccess: () => { setOpen(false); notify('상품 그룹 이름을 바꿨습니다.') } })}
    />
  </section>
}
