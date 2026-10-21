import { useState } from 'react'
import { useZoneInventorySummary } from '../../inventory/model/useZoneInventorySummary'
import { zoneCodeLabels } from '../../inventory/model/inventorySchemas'
import { useRegisterStockAudit } from '../model/useStockAudits'
import { toStockAuditErrorMessage } from '../model/stockAuditErrors'

// 실사는 Zone 단위다. 등록하면 서버가 그 Zone의 Location 재고 행(수량 > 0)을 스냅샷 항목으로 만든다.
export function RegisterStockAuditForm({ warehouseIds, writable, onRegistered }: { warehouseIds: number[]; writable: boolean; onRegistered: (stockAuditId: number) => void }) {
  const zones = useZoneInventorySummary(warehouseIds)
  const register = useRegisterStockAudit()
  const [zoneId, setZoneId] = useState('')
  const zone = zones.data?.find((candidate) => candidate.zoneId === Number(zoneId))
  function submit() {
    if (!zone) return
    register.mutate({ warehouseId: zone.warehouseId, zoneId: zone.zoneId }, { onSuccess: (created) => { setZoneId(''); onRegistered((created as { stockAuditId: number }).stockAuditId) } })
  }
  return <section className="panel inbound-register">
    <div className="panel-heading"><div><p className="eyebrow">NEW STOCK AUDIT</p><h2>재고 실사 등록</h2></div></div>
    <div className="inbound-form-row">
      <label>실사 대상 Zone<select value={zoneId} disabled={!writable || register.isPending} onChange={(event) => setZoneId(event.target.value)}><option value="">선택</option>{zones.data?.map((candidate) => <option key={candidate.zoneId} value={candidate.zoneId}>{candidate.zoneCode} Zone · {zoneCodeLabels[candidate.zoneCode]} · 창고 {candidate.warehouseId}</option>)}</select></label>
    </div>
    {zones.isError && <p className="inbound-error" role="alert">Zone 목록을 불러오지 못했습니다.</p>}
    <div className="inbound-form-actions"><button type="button" className="inbound-action-button" disabled={!writable || !zone || register.isPending} onClick={submit}>실사 등록</button></div>
    {register.isError && <p className="inbound-error" role="alert">{toStockAuditErrorMessage(register.error)}</p>}
  </section>
}
