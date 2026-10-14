import { useState, type ReactNode } from 'react'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import { selectionTypeLabels, type OptionGroup, type Product } from '../../features/catalog/model/catalogSchemas'
import { formatPrice } from '../../features/catalog/model/formatPrice'
import { useClearOptionOverride, useLinkOptionGroup, useReorderOptionGroups, useSetOptionOverride, useUnlinkOptionGroup } from '../../features/catalog/model/useProductOptionMutations'
import { ApiError } from '../../shared/api/ApiError'
import { Tooltip } from '../../shared/ui/Tooltip'
import { useToast } from '../../shared/ui/toastContext'
import { EffectiveOptionsPreview } from './EffectiveOptionsPreview'
import { OptionOverrideModal, type OverrideChoice } from './OptionOverrideModal'
import { NO_WRITE_REASON } from './productShared'

type PendingConfirm = { title: string; description: string; confirmLabel: string; run: () => void }
type OverrideTarget = { group: OptionGroup; option: OptionGroup['options'][number] }

type Props = {
  product: Product
  /** 모든 옵션 그룹(이름·옵션 구성을 붙이고 연결할 그룹을 고르는 데 쓴다). 아직 못 받았으면 빈 배열이다. */
  optionGroups: readonly OptionGroup[]
  writable: boolean
  confirm: (pending: PendingConfirm) => void
}

const overrideLabel = (override: Product['optionGroups'][number]['overrides'][number] | undefined) =>
  override === undefined ? '기본' : override.type === 'EXCLUDE' ? '제외' : `가격 변경 ${formatPrice(override.price ?? 0)}`

/**
 * 상품의 옵션 그룹 연결·노출 순서·옵션 예외(요구사항 1.9). 모두 상품 버전(`If-Match`)이 필요하고 변경할 때마다 버전이 오르므로,
 * 변경과 상품 재조회가 끝날 때까지 모든 버튼을 막아 연속 클릭이 낡은 버전으로 나가지 않게 한다.
 * 연결을 해제하면 그 연결의 예외도 함께 삭제되어 복원되지 않는다.
 */
export function ProductOptionGroups({ product, optionGroups, writable, confirm }: Props) {
  const { notify } = useToast()
  const link = useLinkOptionGroup()
  const unlink = useUnlinkOptionGroup()
  const reorder = useReorderOptionGroups()
  const setOverride = useSetOptionOverride()
  const clearOverride = useClearOptionOverride()
  const [selectedGroup, setSelectedGroup] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  // 닫아도 대상을 비우지 않아 사라지는 애니메이션 동안 내용이 유지된다.
  const [target, setTarget] = useState<OverrideTarget | null>(null)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const mutations = [link, unlink, reorder, setOverride, clearOverride]
  const busy = mutations.some((mutation) => mutation.isPending)
  const reason = !writable ? NO_WRITE_REASON : busy ? '처리 중입니다.' : null
  const linkedIds = product.optionGroups.map((item) => item.optionGroupId)
  const unlinked = optionGroups.filter((group) => !linkedIds.includes(group.id))
  const gate = (content: string | null, button: ReactNode) => <Tooltip content={content}>{button}</Tooltip>

  /** 성공 안내와 실패 처리를 붙여 변경을 실행한다. 버전 충돌이면 최신 내용을 다시 받았다고 알리고, 그 밖의 오류는 구역 안에 보여준다(`inline`이 false면 모달이 자기 안에 보여준다). */
  function run(start: (handlers: { onSuccess: () => void; onError: (error: unknown) => void }) => void, success: string, onDone?: () => void, inline = true) {
    setError(null)
    start({
      onSuccess: () => { onDone?.(); notify(success) },
      onError: (caught) => {
        if (caught instanceof ApiError && caught.code === 'VERSION_CONFLICT') {
          onDone?.()
          notify('다른 사용자가 먼저 수정했습니다. 최신 내용을 불러왔으니 확인한 뒤 다시 시도해 주세요.', 'error')
        } else if (inline) setError(caught)
      },
    })
  }

  const base = { productId: product.id, version: product.version }

  function move(index: number, offset: -1 | 1) {
    const ids = [...linkedIds]
    ;[ids[index], ids[index + offset]] = [ids[index + offset], ids[index]]
    run((handlers) => reorder.mutate({ ...base, optionGroupIds: ids }, handlers), '옵션 그룹 순서를 바꿨습니다.')
  }

  function askUnlink(group: OptionGroup | undefined, optionGroupId: number) {
    const name = group?.name ?? `#${optionGroupId}`
    confirm({
      title: `"${name}" 옵션 그룹 연결을 해제할까요?`,
      description: '이 상품에서 이 옵션 그룹의 가격 변경·제외 예외도 함께 삭제되며, 다시 연결해도 복원되지 않습니다. 옵션 그룹 자체는 삭제되지 않습니다.',
      confirmLabel: '연결 해제',
      run: () => run((handlers) => unlink.mutate({ ...base, optionGroupId }, handlers), `"${name}" 연결을 해제했습니다.`),
    })
  }

  function submitOverride(choice: OverrideChoice) {
    if (!target) return
    const close = () => setOverrideOpen(false)
    const args = { ...base, optionGroupId: target.group.id, optionKey: target.option.optionKey }
    if (choice.kind === 'default') run((handlers) => clearOverride.mutate(args, handlers), '예외를 해제했습니다.', close, false)
    else run((handlers) => setOverride.mutate({ ...args, override: choice.override }, handlers), '예외를 저장했습니다.', close, false)
  }

  const modalError = overrideOpen ? (setOverride.error ?? clearOverride.error) : null
  const targetLink = target ? product.optionGroups.find((item) => item.optionGroupId === target.group.id) : undefined
  const targetOverride = target ? targetLink?.overrides.find((item) => item.optionKey === target.option.optionKey) : undefined

  return <>
    <h3 className="employee-section-title">옵션 그룹</h3>
    {product.optionGroups.length === 0 && <p className="employee-no-roles">연결된 옵션 그룹이 없습니다.</p>}
    <ol className="product-option-groups">
      {product.optionGroups.map((item, index) => {
        const group = optionGroups.find((candidate) => candidate.id === item.optionGroupId)
        const name = group?.name ?? `#${item.optionGroupId}`
        return <li key={item.optionGroupId} className="product-option-group">
          <div className="product-option-group-head">
            <span className="product-option-group-title"><strong>{index + 1}. {name}</strong>{group && <small>{selectionTypeLabels[group.selectionType]} · {group.required ? '필수' : '선택'}</small>}</span>
            <span className="taxonomy-actions">
              {gate(reason, <button type="button" className="taxonomy-action" aria-label={`${name} 위로`} disabled={reason !== null || index === 0} onClick={() => move(index, -1)}>↑</button>)}
              {gate(reason, <button type="button" className="taxonomy-action" aria-label={`${name} 아래로`} disabled={reason !== null || index === product.optionGroups.length - 1} onClick={() => move(index, 1)}>↓</button>)}
              {gate(reason, <button type="button" className="taxonomy-action danger" aria-label={`${name} 연결 해제`} disabled={reason !== null} onClick={() => askUnlink(group, item.optionGroupId)}>연결 해제</button>)}
            </span>
          </div>
          {group
            ? <table className="option-table">
              <thead><tr><th>옵션</th><th>기본 가격</th><th>이 상품</th><th /></tr></thead>
              <tbody>
                {group.options.map((option) => {
                  const override = item.overrides.find((candidate) => candidate.optionKey === option.optionKey)
                  return <tr key={option.optionKey} className={override?.type === 'EXCLUDE' ? 'option-excluded' : undefined}>
                    <td>{option.name} <code>{option.optionKey}</code></td>
                    <td>{formatPrice(option.price)}</td>
                    <td>{overrideLabel(override)}</td>
                    <td>{gate(reason, <button type="button" className="taxonomy-action" aria-label={`${name} ${option.name} 예외`} disabled={reason !== null} onClick={() => { setOverride.reset(); clearOverride.reset(); setError(null); setTarget({ group, option }); setOverrideOpen(true) }}>예외</button>)}</td>
                  </tr>
                })}
              </tbody>
            </table>
            : <p className="employee-hint">옵션 그룹 정보를 불러오는 중입니다...</p>}
        </li>
      })}
    </ol>
    <div className="product-option-link">
      <label>옵션 그룹 연결
        <select value={selectedGroup} disabled={reason !== null || unlinked.length === 0} onChange={(event) => setSelectedGroup(event.target.value)}>
          <option value="">{unlinked.length === 0 ? '연결할 수 있는 옵션 그룹이 없습니다' : '선택하세요'}</option>
          {unlinked.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </label>
      {gate(reason ?? (selectedGroup === '' ? '연결할 옵션 그룹을 먼저 선택하세요.' : null), <button type="button" className="inbound-action-button employee-secondary" disabled={reason !== null || selectedGroup === ''} onClick={() => {
        const optionGroupId = Number(selectedGroup)
        run((handlers) => link.mutate({ ...base, optionGroupId }, handlers), '옵션 그룹을 연결했습니다.', () => setSelectedGroup(''))
      }}>연결</button>)}
    </div>
    {error !== null && <p className="inbound-error" role="alert">{toCatalogErrorMessage(error)}</p>}

    <button type="button" className="taxonomy-action product-option-preview-toggle" aria-expanded={previewOpen} onClick={() => setPreviewOpen((value) => !value)}>{previewOpen ? '판매 옵션 미리보기 닫기' : '판매 옵션 미리보기'}</button>
    {previewOpen && <EffectiveOptionsPreview productId={product.id} />}

    {target && <OptionOverrideModal
      open={overrideOpen}
      groupName={target.group.name}
      option={target.option}
      current={targetOverride && { type: targetOverride.type, price: targetOverride.price }}
      pending={setOverride.isPending || clearOverride.isPending}
      error={modalError}
      onSubmit={submitOverride}
      onClose={() => setOverrideOpen(false)}
    />}
  </>
}
