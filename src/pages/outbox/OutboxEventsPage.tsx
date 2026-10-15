import { useState } from 'react'
import { permissions } from '../../features/auth/model/permissions'
import { PermissionGate } from '../../features/auth/ui/PermissionGate'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import { toOutboxErrorMessage } from '../../features/outbox/model/outboxErrors'
import { aggregateTypeLabels, formatPayload, labelOf, outboxStatusLabels, type OutboxEvent } from '../../features/outbox/model/outboxSchemas'
import { useOutboxEvents, useRequeueOutboxEvent } from '../../features/outbox/model/useOutboxEvents'
import { isTransientApiError } from '../../shared/api/ApiError'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/toastContext'

const PAGE_SIZE = 20

/**
 * 원자재·재고 관리 모드의 발행 실패 이벤트. Outbox 발행기가 영구 실패로 격리(DEAD)한 이벤트를 확인하고 재발행(재큐)한다(dozy-inventory-api ADR-0037).
 * 재발행 버튼은 `inventory.write`가 있을 때만 보인다.
 */
export function OutboxEventsPage() {
  const { notify } = useToast()
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<OutboxEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [pending, setPending] = useState<OutboxEvent | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const query = useOutboxEvents(page - 1, PAGE_SIZE)
  const requeue = useRequeueOutboxEvent()
  const items = query.data?.items ?? []
  const total = query.data?.totalElements ?? 0
  const totalPages = Math.max(1, query.data?.totalPages ?? 1)

  function startRequeue(event: OutboxEvent) {
    setActionError(null)
    setPending(event)
  }

  function confirmRequeue() {
    if (!pending) return
    const target = pending
    setPending(null)
    setDetailOpen(false)
    requeue.mutate(target.outboxEventId, {
      onSuccess: () => notify(`이벤트 ${target.outboxEventId}번을 발행 대기로 되돌렸습니다. 발행되면 목록에서 사라집니다.`),
      // 일시적 실패는 토스트로, 이미 처리됨(409)·없음(404) 같은 업무 오류는 화면에 남긴다.
      onError: (error) => {
        const message = toOutboxErrorMessage(error)
        if (isTransientApiError(error)) notify(message, 'error')
        else setActionError(message)
      },
    })
  }

  return <>
    <header className="page-header inbound-page-header">
      <div><p>INVENTORY MANAGEMENT</p><h1>발행 실패 이벤트</h1></div>
    </header>
    <p className="employee-hint role-intro">이벤트 발행에 영구히 실패해 격리된 Outbox 이벤트입니다. 원인(마지막 오류)을 해결한 뒤 재발행하면 발행 대기로 돌아갑니다. 재발행한 이벤트는 격리된 사이 먼저 나간 같은 키의 후속 이벤트보다 늦게 도착합니다.</p>
    <section className="panel audit-list-panel">
      <div className="panel-heading"><div><p className="eyebrow">OUTBOX</p><h2>격리된 이벤트</h2></div><small>{total}건</small></div>
      {query.isLoading && <p>이벤트를 불러오는 중입니다...</p>}
      {query.isError && <p className="inbound-error" role="alert">{toOutboxErrorMessage(query.error)}</p>}
      {actionError && <p className="inbound-error" role="alert">{actionError}</p>}
      {query.data && items.length === 0 && <p className="inbound-empty">격리된 이벤트가 없습니다.</p>}
      {items.length > 0 && <div className="audit-table-wrap">
        <table className="audit-table outbox-table">
          <thead><tr><th>ID</th><th>집계</th><th>이벤트 유형</th><th className="stock-num">시도</th><th>마지막 오류</th><th>격리 시각</th><th>처리</th></tr></thead>
          <tbody>
            {items.map((item) => <tr key={item.outboxEventId}>
              <td>{item.outboxEventId}</td>
              <td>{labelOf(aggregateTypeLabels, item.aggregateType)}<small>id {item.aggregateId}</small></td>
              <td>{item.eventType}<small>{item.partitionKey}</small></td>
              <td className="stock-num">{item.attemptCount}</td>
              {/* 오류는 칸 너비의 한 줄만 보이고 넘치면 …로 줄인다(CSS). 전체는 툴팁과 상세 모달에서 본다. */}
              <td className="outbox-error" title={item.lastError ?? undefined}>{item.lastError ?? '-'}</td>
              <td>{item.deadAt ? formatDateTime(item.deadAt) : '-'}</td>
              <td><div className="reconciliation-actions">
                <button type="button" className="audit-view" aria-label={`이벤트 ${item.outboxEventId} 상세 보기`} onClick={() => { setDetail(item); setDetailOpen(true) }}>보기</button>
                <PermissionGate permission={permissions.inventoryWrite}>
                  <button type="button" className="audit-view" disabled={requeue.isPending} aria-label={`이벤트 ${item.outboxEventId} 재발행`} onClick={() => startRequeue(item)}>재발행</button>
                </PermissionGate>
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>}
      {totalPages > 1 && <div className="inbound-pagination">
        <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
        <span>{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>다음</button>
      </div>}
    </section>
    <Modal open={detailOpen} title="이벤트 상세" className="stock-modal" onClose={() => setDetailOpen(false)} closeOnBackdrop>
      {detail && <>
        <dl className="audit-rows">
          <div><dt>이벤트 ID</dt><dd>{detail.outboxEventId}</dd></div>
          <div><dt>집계</dt><dd>{labelOf(aggregateTypeLabels, detail.aggregateType)} <small>id {detail.aggregateId}</small></dd></div>
          <div><dt>이벤트 유형</dt><dd>{detail.eventType}</dd></div>
          <div><dt>파티션 키</dt><dd>{detail.partitionKey}</dd></div>
          <div><dt>상태</dt><dd>{labelOf(outboxStatusLabels, detail.status)} <small>시도 {detail.attemptCount}회</small></dd></div>
          <div><dt>생성</dt><dd>{detail.createdAt ? formatDateTime(detail.createdAt) : '-'}</dd></div>
          <div><dt>격리</dt><dd>{detail.deadAt ? formatDateTime(detail.deadAt) : '-'}</dd></div>
        </dl>
        <h3 className="outbox-section-title">마지막 오류</h3>
        <pre className="outbox-pre">{detail.lastError ?? '없음'}</pre>
        <h3 className="outbox-section-title">payload</h3>
        <pre className="outbox-pre">{formatPayload(detail.payload)}</pre>
        <PermissionGate permission={permissions.inventoryWrite}>
          <div className="inbound-form-actions"><button type="button" className="inbound-action-button" disabled={requeue.isPending} onClick={() => startRequeue(detail)}>재발행</button></div>
        </PermissionGate>
      </>}
    </Modal>
    <ConfirmModal
      open={pending !== null}
      title="이벤트를 재발행할까요?"
      description={pending ? `이벤트 ${pending.outboxEventId}번(${pending.eventType})을 발행 대기로 되돌립니다. 재발행한 이벤트는 그 사이 먼저 나간 같은 키(${pending.partitionKey})의 후속 이벤트보다 늦게 도착합니다.` : undefined}
      confirmLabel="재발행"
      onCancel={() => setPending(null)}
      onConfirm={confirmRequeue}
    />
  </>
}
