import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import type { Inbound } from './inboundSchemas'
import { paginateInbounds, useCompleteInbound, useInboundItems, useInbounds, useStartInboundProcessing } from './useInbounds'

const inbound = (inboundId: number, status: Inbound['status'], warehouseId = 543): Inbound => ({ inboundId, warehouseId, expectedArrivalDate: '2026-10-02', status })

afterEach(() => vi.restoreAllMocks())

describe('paginateInbounds', () => {
  const all = [inbound(1, 'COMPLETED'), inbound(2, 'WAITING'), inbound(3, 'PROCESSING'), inbound(4, 'COMPLETED'), inbound(5, 'WAITING', 999)]

  it('AccessScope 밖 창고는 제외하고 상태별 건수를 센다', () => {
    const result = paginateInbounds(all, [543], [], 1, 10)
    expect(result.total).toBe(4)
    expect(result.statusCounts).toEqual({ EXPECTED: 0, WAITING: 1, PROCESSING: 1, COMPLETED: 2 })
  })

  it('상태 필터와 최신순 정렬, 페이지 분할을 적용한다', () => {
    const result = paginateInbounds(all, [543], ['COMPLETED'], 1, 1)
    expect(result.items.map((item) => item.inboundId)).toEqual([4])
    expect(result.total).toBe(2)
    expect(paginateInbounds(all, [543], ['COMPLETED'], 2, 1).items.map((item) => item.inboundId)).toEqual([1])
  })
})

describe('useInbounds', () => {
  it('창고·페이지 조건과 무관하게 GET /api/inbounds 한 번으로 목록을 받아 클라이언트에서 가공한다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: [inbound(1, 'WAITING'), inbound(2, 'COMPLETED')] })
    const { result } = renderHook(() => useInbounds([543], ['WAITING'], 1, 4), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(getSpy).toHaveBeenCalledWith('/api/inbounds')
    expect(result.current.data?.items).toHaveLength(1)
  })
})

describe('useInboundItems', () => {
  it('품목에 상품명과 Zone 코드를 합쳐 돌려준다', async () => {
    vi.spyOn(httpClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/inbound-items') return { data: [{ inboundItemId: 7, inboundId: 1, productId: 2, zoneId: 410, expectedQuantity: 10, actualQuantity: null, inspectionResult: 'PENDING', quantityDiscrepancy: null }] }
      if (url === '/api/products') return { data: [{ productId: 2, productCode: 'BEAN-1', productName: '에티오피아', category: 'BEAN', unit: 'ea', shelfLifeDays: null, productStatus: 'ACTIVE' }] }
      return { data: [{ zoneId: 410, zoneCode: 'A', warehouseId: 543, maxCapacity: 100, usedCapacity: 0, usageRate: 0, quantityByQualityStatus: {} }] }
    })
    const { result } = renderHook(() => useInboundItems(1, [543]), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data?.[0]?.zoneCode).toBe('A'))
    expect(result.current.data?.[0]).toMatchObject({ productName: '에티오피아', productCode: 'BEAN-1' })
  })
})

describe('입고 상태 전이 mutation', () => {
  it('처리 시작은 PATCH /processing을 호출한다', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: inbound(1, 'PROCESSING') })
    const { result } = renderHook(() => useStartInboundProcessing(), { wrapper: createQueryClientWrapper() })
    result.current.mutate(1)
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith('/api/inbounds/1/processing'))
  })

  it('완료는 Lot 배정을 담아 PATCH /complete를 호출한다', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: inbound(1, 'COMPLETED') })
    const { result } = renderHook(() => useCompleteInbound(), { wrapper: createQueryClientWrapper() })
    const body = { lotAssignments: [{ inboundItemId: 7, lotNumber: 'LOT-1' }] }
    result.current.mutate({ inboundId: 1, body })
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith('/api/inbounds/1/complete', body))
  })
})
