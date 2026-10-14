import { useState } from 'react'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import type { Category } from '../../features/catalog/model/catalogSchemas'
import { groupCategories } from '../../features/catalog/model/categoryLabel'
import { useCategories } from '../../features/catalog/model/useCatalog'
import { useCreateCategory, useDeleteCategory, useMoveCategory, useRenameCategory } from '../../features/catalog/model/useTaxonomyMutations'
import { FieldTip } from '../../shared/ui/FieldTip'
import { useToast } from '../../shared/ui/toastContext'
import { EditCategoryModal, type CategoryChange } from './EditCategoryModal'
import { NameFormModal } from './NameFormModal'
import { RowAction } from './RowAction'
import { NO_WRITE_REASON, type PendingConfirm } from './taxonomyShared'

type Props = { writable: boolean; confirm: (pending: PendingConfirm) => void }
type Dialog = { kind: 'create-top' } | { kind: 'create-child'; parent: Category } | { kind: 'edit'; category: Category }

const HAS_CHILDREN_REASON = '소분류가 있는 대분류는 삭제할 수 없습니다. 소분류를 먼저 삭제하거나 다른 대분류로 옮기세요.'
const TIP = '상품은 소분류 하나를 카테고리로 가집니다. 소분류가 하나도 없으면 상품을 등록할 수 없습니다. 대분류는 소분류를 묶는 용도이고, 소분류가 있는 대분류는 삭제하거나 소분류로 바꿀 수 없습니다.'

/**
 * 카테고리 관리(요구사항 1.6). 대분류와 그 아래 소분류의 2단계 계층이다. 상품은 소분류만 참조한다.
 * 소분류가 있는 대분류의 강등·삭제는 미리 막고, 상품이 참조 중인 카테고리의 삭제·승격은 서버 오류(code)로 안내한다.
 */
export function CategoriesPanel({ writable, confirm }: Props) {
  const { notify } = useToast()
  const query = useCategories()
  const create = useCreateCategory()
  const rename = useRenameCategory()
  const move = useMoveCategory()
  const remove = useDeleteCategory()
  // 닫아도 `dialog`를 비우지 않아 사라지는 애니메이션 동안 내용이 유지된다.
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [open, setOpen] = useState(false)
  const categories = query.data ?? []
  const tree = groupCategories(categories)
  // 변경은 부모 변경과 이름 변경을 이어서 보내므로, 두 요청 사이에도 처리 중으로 본다.
  const [saving, setSaving] = useState(false)
  const busy = saving || [create, rename, move, remove].some((mutation) => mutation.isPending)

  function show(next: Dialog) {
    ;[create, rename, move, remove].forEach((mutation) => mutation.reset())
    setDialog(next)
    setOpen(true)
  }
  const close = () => setOpen(false)

  /**
   * 바뀐 값을 저장한다. 규칙 위반은 부모 변경에서 나므로 부모를 먼저 바꾸고, 성공하면 이름을 바꾼다.
   * 그래서 부모 변경이 거부되면 아무것도 바뀌지 않고, 오류는 모달 안에 보여준다.
   */
  async function save(category: Category, change: CategoryChange) {
    move.reset()
    rename.reset()
    setSaving(true)
    try {
      if (change.parentId !== undefined) await move.mutateAsync({ id: category.id, parentId: change.parentId })
      if (change.name !== undefined) await rename.mutateAsync({ id: category.id, name: change.name })
      close()
      notify(`"${change.name ?? category.name}" 카테고리를 변경했습니다.`)
    } catch {
      // 오류는 mutation 상태(move.error·rename.error)로 모달 안에 보여준다.
    } finally {
      setSaving(false)
    }
  }
  const reasonFor = (extra: string | null = null) => (!writable ? NO_WRITE_REASON : busy ? '처리 중입니다.' : extra)

  function askDelete(category: Category, isTop: boolean) {
    confirm({
      title: `"${category.name}" 카테고리를 삭제할까요?`,
      description: isTop ? '소분류가 없는 대분류만 삭제할 수 있습니다. 삭제하면 되돌릴 수 없습니다.' : '이 카테고리를 쓰는 상품이 있으면 삭제되지 않습니다. 삭제하면 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      run: () => { remove.reset(); remove.mutate(category.id, { onSuccess: () => notify(`"${category.name}" 카테고리를 삭제했습니다.`) }) },
    })
  }

  const row = (category: Category, isTop: boolean, childCount: number) => <li key={category.id} className={`taxonomy-row ${isTop ? 'top' : 'child'}`}>
    <span className="taxonomy-name">
      <strong>{category.name}</strong>
      <small>{isTop ? `대분류 · 소분류 ${childCount}개` : '소분류'}</small>
    </span>
    <span className="taxonomy-actions">
      {isTop && writable && <RowAction label="추가" target={category.name} reason={reasonFor()} onClick={() => show({ kind: 'create-child', parent: category })} />}
      <RowAction label="변경" target={category.name} reason={reasonFor()} onClick={() => show({ kind: 'edit', category })} />
      <RowAction label="삭제" target={category.name} danger reason={reasonFor(isTop && childCount > 0 ? HAS_CHILDREN_REASON : null)} onClick={() => askDelete(category, isTop)} />
    </span>
  </li>

  return <section className="panel taxonomy-panel" aria-label="카테고리">
    <div className="panel-heading">
      <div><p className="eyebrow">CATEGORIES</p><div className="taxonomy-title"><h2>카테고리</h2><FieldTip label="카테고리 안내">{TIP}</FieldTip></div></div>
      {writable && <button type="button" className="inbound-action-button compact" aria-haspopup="dialog" disabled={busy} onClick={() => show({ kind: 'create-top' })}>대분류 추가</button>}
    </div>
    {query.isLoading && <p>카테고리를 불러오는 중입니다...</p>}
    {query.isError && <p className="inbound-error" role="alert">{toCatalogErrorMessage(query.error)}</p>}
    {remove.isError && <p className="inbound-error" role="alert">{toCatalogErrorMessage(remove.error)}</p>}
    {query.data && tree.length === 0 && <p className="inbound-empty">등록된 카테고리가 없습니다.{writable ? ' 대분류를 먼저 추가하세요.' : ''}</p>}
    <ul className="taxonomy-list">
      {tree.map(({ top, children }) => <li key={top.id} className="taxonomy-group">
        <ul className="taxonomy-list">
          {row(top, true, children.length)}
          {children.map((child) => row(child, false, 0))}
        </ul>
      </li>)}
    </ul>

    <NameFormModal
      open={open && (dialog?.kind === 'create-top' || dialog?.kind === 'create-child')}
      title={dialog?.kind === 'create-child' ? `소분류 추가 · ${dialog.parent.name}` : '대분류 추가'}
      label="이름"
      placeholder={dialog?.kind === 'create-child' ? '커피' : '음료'}
      submitLabel="추가"
      hint={dialog?.kind === 'create-child' ? `"${dialog.parent.name}" 아래의 소분류로 만들어집니다.` : '대분류 아래에 소분류를 추가해야 상품에서 고를 수 있습니다.'}
      pending={create.isPending}
      error={create.error}
      onClose={close}
      onSubmit={(name) => {
        const parent = dialog?.kind === 'create-child' ? dialog.parent : null
        create.mutate({ name, parentId: parent?.id ?? null }, { onSuccess: () => { close(); notify(parent ? `"${parent.name}" 아래에 소분류 "${name}"을 추가했습니다.` : `대분류 "${name}"을 추가했습니다.`) } })
      }}
    />
    {dialog?.kind === 'edit' && <EditCategoryModal
      open={open}
      category={dialog.category}
      topLevels={categories.filter((category) => category.parentId === null && category.id !== dialog.category.id)}
      childCount={categories.filter((category) => category.parentId === dialog.category.id).length}
      pending={saving}
      error={move.error ?? rename.error}
      onClose={close}
      onSubmit={(change) => void save(dialog.category, change)}
    />}
  </section>
}
