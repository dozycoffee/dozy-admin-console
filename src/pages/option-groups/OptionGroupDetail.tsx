import { useState, type ReactNode } from 'react'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import { selectionTypeLabels, type OptionGroup } from '../../features/catalog/model/catalogSchemas'
import { formatPrice } from '../../features/catalog/model/formatPrice'
import { useDeleteOptionGroup } from '../../features/catalog/model/useOptionGroupMutations'
import { Modal } from '../../shared/ui/Modal'
import { Tooltip } from '../../shared/ui/Tooltip'
import { useToast } from '../../shared/ui/toastContext'
import { OptionGroupForm } from '../../features/catalog/ui/OptionGroupForm'

export type PendingConfirm = { title: string; description: string; confirmLabel: string; run: () => void }

type Props = {
  group: OptionGroup
  writable: boolean
  confirm: (pending: PendingConfirm) => void
  /** 옵션 그룹을 삭제했을 때 부른다. 선택을 풀고 목록으로 돌아가는 일은 화면이 한다. */
  onDeleted: () => void
}

const NO_WRITE_REASON = '옵션 그룹을 변경할 권한이 없습니다.'

/** 옵션 그룹 상세와 변경·삭제. 삭제는 연결한 상품이 있으면 서버가 거부한다(어떤 상품이 연결했는지는 알 수 없다). */
export function OptionGroupDetail({ group, writable, confirm, onDeleted }: Props) {
  const { notify } = useToast()
  const remove = useDeleteOptionGroup()
  const [editOpen, setEditOpen] = useState(false)
  const reason = writable ? (remove.isPending ? '처리 중입니다.' : null) : NO_WRITE_REASON
  const gate = (button: ReactNode) => <Tooltip content={reason}>{button}</Tooltip>

  return <section className="panel inbound-detail-panel">
    <div className="panel-heading inbound-detail-heading">
      <div><p className="eyebrow">OPTION GROUP</p><h2>{group.name}</h2></div>
      <div className="detail-actions">
        {gate(<button type="button" className="inbound-action-button compact employee-secondary" disabled={reason !== null} onClick={() => { remove.reset(); setEditOpen(true) }}>변경</button>)}
        {gate(<button type="button" className="inbound-action-button compact employee-danger" disabled={reason !== null} onClick={() => confirm({
          title: `"${group.name}" 옵션 그룹을 삭제할까요?`,
          description: '이 옵션 그룹을 연결한 상품이 있으면 삭제할 수 없습니다. 삭제하면 되돌릴 수 없습니다.',
          confirmLabel: '삭제',
          run: () => { remove.reset(); remove.mutate(group.id, { onSuccess: () => { notify(`"${group.name}" 옵션 그룹을 삭제했습니다.`); onDeleted() } }) },
        })}>삭제</button>)}
      </div>
    </div>
    <div className="employee-detail-body">
      {remove.isError && <p className="inbound-error" role="alert">{toCatalogErrorMessage(remove.error)}</p>}
      <h3 className="employee-section-title">기본 정보</h3>
      <dl className="employee-fields">
        <div><dt>선택 방식</dt><dd>{selectionTypeLabels[group.selectionType]}</dd></div>
        <div><dt>필수 여부</dt><dd>{group.required ? '필수 선택' : '선택 사항'}</dd></div>
      </dl>
      <h3 className="employee-section-title">옵션 ({group.options.length}개)</h3>
      <table className="option-table">
        <thead><tr><th>순서</th><th>옵션 키</th><th>이름</th><th>가격</th></tr></thead>
        <tbody>
          {group.options.map((option, index) => <tr key={option.optionKey}>
            <td>{index + 1}</td><td><code>{option.optionKey}</code></td><td>{option.name}</td><td>{formatPrice(option.price)}</td>
          </tr>)}
        </tbody>
      </table>
      <p className="product-version">버전 {group.version}</p>
    </div>

    <Modal open={editOpen} title={`옵션 그룹 변경 · ${group.name}`} className="option-form-modal" onClose={() => setEditOpen(false)}>
      <OptionGroupForm
        group={group}
        onDone={() => { setEditOpen(false); notify('옵션 그룹을 저장했습니다.') }}
        onCancel={() => setEditOpen(false)}
        onConflict={() => { setEditOpen(false); notify('다른 사용자가 먼저 수정했습니다. 최신 내용을 불러왔으니 확인한 뒤 다시 수정해 주세요.', 'error') }}
      />
    </Modal>
  </section>
}
