import { useState } from 'react'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import type { Tag } from '../../features/catalog/model/catalogSchemas'
import { removalDescription } from '../../features/catalog/model/removalDescription'
import { useCountProducts, useTags } from '../../features/catalog/model/useCatalog'
import { useDeleteTag, useRenameTag } from '../../features/catalog/model/useTaxonomyMutations'
import { useToast } from '../../shared/ui/toastContext'
import { NameFormModal } from './NameFormModal'
import { RowAction } from './RowAction'
import { NO_WRITE_REASON, type PendingConfirm } from './taxonomyShared'

type Props = { writable: boolean; confirm: (pending: PendingConfirm) => void }

/**
 * 태그 관리(요구사항 1.7). 태그는 상품 등록·수정 흐름에서만 만들어지므로 등록 화면은 없고 이름 변경과 삭제만 한다.
 * 삭제하면 서버가 그 태그를 쓰던 모든 상품에서 자동으로 빼므로, 확인 모달에 영향을 받는 상품 수를 보여 준다.
 */
export function TagsPanel({ writable, confirm }: Props) {
  const { notify } = useToast()
  const query = useTags()
  const rename = useRenameTag()
  const remove = useDeleteTag()
  const countProducts = useCountProducts()
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<Tag | null>(null)
  const [open, setOpen] = useState(false)
  // 삭제 확인에 쓸 상품 수를 구하는 동안 다른 작업을 막는다.
  const [counting, setCounting] = useState(false)
  const keyword = search.trim().toLowerCase()
  const tags = (query.data ?? []).filter((tag) => keyword === '' || tag.name.toLowerCase().includes(keyword))
  const busy = rename.isPending || remove.isPending || counting
  const reason = !writable ? NO_WRITE_REASON : busy ? '처리 중입니다.' : null

  async function askDelete(tag: Tag) {
    remove.reset()
    setCounting(true)
    const count = await countProducts({ tagId: tag.id }).catch(() => null)
    setCounting(false)
    confirm({
      title: `"${tag.name}" 태그를 삭제할까요?`,
      description: removalDescription('이 태그가 붙은', count),
      confirmLabel: '삭제',
      run: () => remove.mutate(tag.id, { onSuccess: () => notify(`"${tag.name}" 태그를 삭제했습니다.`) }),
    })
  }

  return <section className="panel taxonomy-panel" aria-label="태그">
    <div className="panel-heading"><div><p className="eyebrow">TAGS</p><h2>태그</h2></div><small>{query.data?.length ?? 0}개</small></div>
    <p className="employee-hint taxonomy-hint">태그는 상품 등록·수정에서 이름을 입력하면 만들어집니다. 여기서는 이름 변경과 삭제만 할 수 있습니다.</p>
    <label className="taxonomy-search">검색<input value={search} placeholder="태그 이름" onChange={(event) => setSearch(event.target.value)} autoComplete="off" /></label>
    {query.isLoading && <p>태그를 불러오는 중입니다...</p>}
    {query.isError && <p className="inbound-error" role="alert">{toCatalogErrorMessage(query.error)}</p>}
    {remove.isError && <p className="inbound-error" role="alert">{toCatalogErrorMessage(remove.error)}</p>}
    {query.data && tags.length === 0 && <p className="inbound-empty">{query.data.length === 0 ? '등록된 태그가 없습니다.' : '검색 결과가 없습니다.'}</p>}
    <ul className="taxonomy-list">
      {tags.map((tag) => <li key={tag.id} className="taxonomy-row">
        <span className="taxonomy-name"><strong>{tag.name}</strong></span>
        <span className="taxonomy-actions">
          <RowAction label="이름 변경" target={tag.name} reason={reason} onClick={() => { rename.reset(); setTarget(tag); setOpen(true) }} />
          <RowAction label="삭제" target={tag.name} danger reason={reason} onClick={() => void askDelete(tag)} />
        </span>
      </li>)}
    </ul>
    <NameFormModal
      open={open && target !== null}
      title={target ? `태그 이름 변경 · ${target.name}` : '태그 이름 변경'}
      label="이름"
      placeholder="태그 이름"
      initialName={target?.name}
      submitLabel="저장"
      hint="다른 태그와 같은 이름으로는 바꿀 수 없습니다. 바꾼 이름은 이 태그가 붙은 모든 상품에 바로 반영됩니다."
      pending={rename.isPending}
      error={rename.error}
      onClose={() => setOpen(false)}
      onSubmit={(name) => target && rename.mutate({ id: target.id, name }, { onSuccess: () => { setOpen(false); notify('태그 이름을 바꿨습니다.') } })}
    />
  </section>
}
