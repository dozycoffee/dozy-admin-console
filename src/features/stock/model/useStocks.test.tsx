import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { inventoryHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { toStockQueryParams, useStockHistories, useStocks } from './useStocks'

afterEach(() => vi.restoreAllMocks())

const stockItem = {
  inventoryId: 500, warehouseId: 10, productId: 100, lotId: 7, lotNumber: 'LOT-A', manufactureDate: '2026-09-01', expirationDate: '2027-01-01', lotStatus: 'NORMAL', qualityStatus: 'NORMAL',
  quantity: 10, reservedQuantity: 4, availableQuantity: 6, allocationHold: true, holdReason: '피킹 불가', heldAt: '2026-10-14T09:00:00', createdAt: '2026-10-14T09:00:00', updatedAt: '2026-10-14T09:00:00',
}

describe('toStockQueryParams', () => {
  it('비어 있는 조건은 빼고 false인 할당 보류는 남긴다', () => {
    expect(toStockQueryParams({ page: 0, size: 20 })).toEqual({ page: 0, size: 20 })
    expect(toStockQueryParams({ warehouseId: 10, productId: 100, qualityStatus: 'DEFECTIVE', lotStatus: 'EXPIRED', allocationHold: false, page: 1, size: 20 }))
      .toEqual({ warehouseId: 10, productId: 100, qualityStatus: 'DEFECTIVE', lotStatus: 'EXPIRED', allocationHold: false, page: 1, size: 20 })
  })
})

describe('useStocks', () => {
  it('조건을 쿼리로 보내고 응답을 zod로 검증한다', async () => {
    const getSpy = vi.spyOn(inventoryHttpClient, 'get').mockResolvedValue({ data: { items: [stockItem], page: 0, size: 20, totalElements: 1, totalPages: 1 } })

    const { result } = renderHook(() => useStocks({ lotStatus: 'EXPIRED', page: 0, size: 20 }), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/api/v1/inventories', { params: { lotStatus: 'EXPIRED', page: 0, size: 20 } })
    expect(result.current.data?.items[0]).toMatchObject({ inventoryId: 500, availableQuantity: 6, allocationHold: true })
  })

  it('enabled가 false이면 요청하지 않는다', () => {
    const getSpy = vi.spyOn(inventoryHttpClient, 'get')

    renderHook(() => useStocks({ page: 0, size: 20 }, { enabled: false }), { wrapper: createQueryClientWrapper() })

    expect(getSpy).not.toHaveBeenCalled()
  })
})

describe('useStockHistories', () => {
  it('재고 행의 이력을 페이지로 조회한다', async () => {
    const history = { inventoryHistoryId: 1, historyType: 'INBOUND', quantityChange: 10, quantityAfter: 10, referenceType: 'INBOUND_ITEM', referenceId: 3, idempotencyKey: 'k', requesterService: 'svc', createdAt: '2026-10-14T09:00:00' }
    const getSpy = vi.spyOn(inventoryHttpClient, 'get').mockResolvedValue({ data: { items: [history], page: 1, size: 10, totalElements: 11, totalPages: 2 } })

    const { result } = renderHook(() => useStockHistories(500, 1, 10), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/api/v1/inventories/500/histories', { params: { page: 1, size: 10 } })
    expect(result.current.data?.totalPages).toBe(2)
  })

  it('재고 행을 정하지 않으면 요청하지 않는다', () => {
    const getSpy = vi.spyOn(inventoryHttpClient, 'get')

    renderHook(() => useStockHistories(null, 0, 10), { wrapper: createQueryClientWrapper() })

    expect(getSpy).not.toHaveBeenCalled()
  })
})
