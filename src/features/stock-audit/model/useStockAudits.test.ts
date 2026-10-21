import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import type { StockAudit } from './stockAuditSchemas'
import {
  paginateStockAudits, useAssignStockAudit, useCloseStockAudit, useCompleteStockAudit, useCountStockAuditItem, useRegisterStockAudit, useStockAuditItems, useStockAudits,
} from './useStockAudits'

const audit = (stockAuditId: number, status: StockAudit['status'], warehouseId = 543): StockAudit => ({ stockAuditId, warehouseId, zoneId: 3, status, assignee: null, approvedBy: null })

afterEach(() => vi.restoreAllMocks())

describe('paginateStockAudits', () => {
  const all = [audit(1, 'CLOSED'), audit(2, 'SCHEDULED'), audit(3, 'IN_PROGRESS'), audit(4, 'CLOSED'), audit(5, 'SCHEDULED', 999)]

  it('AccessScope 밖 창고는 제외하고 상태별 건수를 센다', () => {
    const result = paginateStockAudits(all, [543], [], 1, 10)
    expect(result.total).toBe(4)
    expect(result.statusCounts).toEqual({ SCHEDULED: 1, IN_PROGRESS: 1, COMPLETED: 0, CLOSED: 2 })
  })

  it('상태 필터와 최신순 정렬, 페이지 분할을 적용한다', () => {
    expect(paginateStockAudits(all, [543], ['CLOSED'], 1, 1).items.map((item) => item.stockAuditId)).toEqual([4])
    expect(paginateStockAudits(all, [543], ['CLOSED'], 2, 1).items.map((item) => item.stockAuditId)).toEqual([1])
  })

  it('창고 범위가 비어 있으면 서버가 준 목록 전체를 쓴다', () => {
    expect(paginateStockAudits(all, [], [], 1, 10).total).toBe(5)
  })
})

describe('useStockAudits', () => {
  it('GET /api/stock-audits 한 번으로 목록을 받아 클라이언트에서 가공한다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: [audit(1, 'SCHEDULED'), audit(2, 'CLOSED')] })
    const { result } = renderHook(() => useStockAudits([543], ['SCHEDULED'], 1, 4), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(getSpy).toHaveBeenCalledWith('/api/stock-audits')
    expect(result.current.data?.items).toHaveLength(1)
  })
})

describe('useStockAuditItems', () => {
  const stock = { locationStockId: 9, warehouseId: 543, zoneId: 3, zoneCode: 'A', locationId: 1, locationCode: 'A-01', productId: 2, lotNumber: 'LOT-1', qualityStatus: 'NORMAL', quantity: 5, heldQuantity: 0, availableQuantity: 5, updatedAt: null }
  const item = (stockAuditItemId: number, locationStockId: number) => ({ stockAuditItemId, stockAuditId: 1, locationStockId, snapshotQuantity: 5, countedQuantity: null, discrepancy: null, hasUncommittedMovement: false })

  it('Location 재고 행(수량 0 포함)에서 Location·Lot·상품명을 붙이고, 없으면 null로 둔다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/stock-audit-items') return { data: [item(1, 9), item(2, 10)] }
      if (url === '/api/products') return { data: [{ productId: 2, productCode: 'BEAN-1', productName: '에티오피아', category: 'BEAN', unit: 'ea', shelfLifeDays: null, productStatus: 'ACTIVE' }] }
      return { data: { items: [stock] } }
    })
    const { result } = renderHook(() => useStockAuditItems(1, [543]), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data?.[0]?.productName).toBe('에티오피아'))
    expect(result.current.data?.[0]).toMatchObject({ locationCode: 'A-01', lotNumber: 'LOT-1' })
    expect(result.current.data?.[1]).toMatchObject({ productName: null, locationCode: null, lotNumber: null })
    expect(getSpy).toHaveBeenCalledWith('/api/stock-audit-items', { params: { stockAuditId: 1 } })
    expect(getSpy).toHaveBeenCalledWith('/api/location-stocks', { params: { warehouseIds: [543], includeEmpty: true } })
  })
})

describe('재고 실사 mutation', () => {
  it('등록은 POST /api/stock-audits를 호출한다', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({ data: audit(1, 'SCHEDULED') })
    const { result } = renderHook(() => useRegisterStockAudit(), { wrapper: createQueryClientWrapper() })
    result.current.mutate({ warehouseId: 543, zoneId: 3 })
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/api/stock-audits', { warehouseId: 543, zoneId: 3 }))
  })

  it('항목 카운트는 PATCH /api/stock-audit-items/{id}/count에 실사 수량을 보낸다', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: { stockAuditItemId: 7, stockAuditId: 1, locationStockId: 9, snapshotQuantity: 5, countedQuantity: 4, discrepancy: -1, hasUncommittedMovement: false } })
    const { result } = renderHook(() => useCountStockAuditItem(), { wrapper: createQueryClientWrapper() })
    result.current.mutate({ stockAuditItemId: 7, countedQuantity: 4 })
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith('/api/stock-audit-items/7/count', { countedQuantity: 4 }))
  })

  it.each([
    ['시작(배정)', useAssignStockAudit, 'assign', 'IN_PROGRESS'],
    ['완료', useCompleteStockAudit, 'complete', 'COMPLETED'],
    ['확정', useCloseStockAudit, 'close', 'CLOSED'],
  ] as const)('%s은 PATCH /%s를 호출한다', async (_label, useHook, path, status) => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: audit(1, status) })
    const { result } = renderHook(() => useHook(), { wrapper: createQueryClientWrapper() })
    result.current.mutate(1)
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith(`/api/stock-audits/1/${path}`))
  })
})
