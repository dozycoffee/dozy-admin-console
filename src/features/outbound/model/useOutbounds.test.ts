import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import type { Outbound } from './outboundSchemas'
import { paginateOutbounds, useCompleteOutbound, useOutboundAllocations, useOutboundItems, useOutbounds, useReportPickingShortage, useRequestOutboundCancel, useStartOutboundInspecting, useStartOutboundPicking } from './useOutbounds'

const outbound = (outboundId: number, status: Outbound['status'], warehouseId = 543): Outbound => ({ outboundId, warehouseId, status })

afterEach(() => vi.restoreAllMocks())

describe('paginateOutbounds', () => {
  const all = [outbound(1, 'COMPLETED'), outbound(2, 'REQUESTED'), outbound(3, 'PICKING'), outbound(4, 'COMPLETED'), outbound(5, 'REQUESTED', 999), outbound(6, 'CANCEL_REQUESTED'), outbound(7, 'CANCELED')]

  it('AccessScope 밖 창고는 제외하고 상태별 건수를 센다', () => {
    const result = paginateOutbounds(all, [543], [], 1, 10)
    expect(result.total).toBe(6)
    expect(result.statusCounts).toEqual({ REQUESTED: 1, PICKING: 1, INSPECTING: 0, COMPLETED: 2, CANCEL_REQUESTED: 1, CANCELED: 1 })
  })

  it('상태 필터와 최신순 정렬, 페이지 분할을 적용한다', () => {
    expect(paginateOutbounds(all, [543], ['COMPLETED'], 1, 1).items.map((item) => item.outboundId)).toEqual([4])
    expect(paginateOutbounds(all, [543], ['COMPLETED'], 2, 1).items.map((item) => item.outboundId)).toEqual([1])
  })
})

describe('useOutbounds', () => {
  it('GET /api/outbounds 한 번으로 목록을 받아 클라이언트에서 가공한다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: [outbound(1, 'REQUESTED'), outbound(2, 'COMPLETED')] })
    const { result } = renderHook(() => useOutbounds([543], ['REQUESTED'], 1, 4), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(getSpy).toHaveBeenCalledWith('/api/outbounds')
    expect(result.current.data?.items).toHaveLength(1)
  })
})

describe('useOutboundItems', () => {
  it('품목에 상품명을 합쳐 돌려준다', async () => {
    vi.spyOn(httpClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/outbound-items') return { data: [{ outboundItemId: 7, outboundId: 1, productId: 2, requestedQuantity: 10, pickedQuantity: 8, shortageQuantity: 2 }] }
      return { data: [{ productId: 2, productCode: 'BEAN-1', productName: '에티오피아', category: 'BEAN', unit: 'ea', shelfLifeDays: null, productStatus: 'ACTIVE' }] }
    })
    const { result } = renderHook(() => useOutboundItems(1), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data?.[0]?.productName).toBe('에티오피아'))
    expect(result.current.data?.[0]).toMatchObject({ shortageQuantity: 2, productCode: 'BEAN-1' })
  })
})

describe('useOutboundAllocations', () => {
  it('출고의 피킹 계획을 outboundId로 조회한다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: [{ outboundAllocationId: 5, outboundItemId: 1, productId: 2, inventoryId: 30, lotNumber: 'LOT-1', expirationDate: null, quantity: 8, pickedQuantity: null }] })
    const { result } = renderHook(() => useOutboundAllocations(1), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(getSpy).toHaveBeenCalledWith('/api/outbound-allocations', { params: { outboundId: 1 } })
  })

  it('출고가 정해지지 않으면 조회하지 않는다', () => {
    const getSpy = vi.spyOn(httpClient, 'get')
    renderHook(() => useOutboundAllocations(undefined), { wrapper: createQueryClientWrapper() })
    expect(getSpy).not.toHaveBeenCalled()
  })
})

describe('출고 상태 전이 mutation', () => {
  it.each([
    ['피킹', useStartOutboundPicking, 'picking', 'PICKING'],
    ['검수', useStartOutboundInspecting, 'inspecting', 'INSPECTING'],
    ['완료', useCompleteOutbound, 'complete', 'COMPLETED'],
  ] as const)('%s 시작은 PATCH /%s를 호출한다', async (_label, useHook, path, status) => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: outbound(1, status) })
    const { result } = renderHook(() => useHook(), { wrapper: createQueryClientWrapper() })
    result.current.mutate(1)
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith(`/api/outbounds/${1}/${path}`))
  })

  it('취소 요청은 POST /cancel-requests를 호출하고 출고를 돌려준다', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({ data: outbound(1, 'CANCEL_REQUESTED') })
    const { result } = renderHook(() => useRequestOutboundCancel(), { wrapper: createQueryClientWrapper() })
    result.current.mutate(1)
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/api/outbounds/1/cancel-requests'))
    await waitFor(() => expect(result.current.data).toMatchObject({ status: 'CANCEL_REQUESTED' }))
  })

  it('부족 보고는 POST /reallocation에 부족 목록을 보내고 새 할당을 돌려준다', async () => {
    const allocation = { outboundAllocationId: 6, outboundItemId: 1, productId: 2, inventoryId: 31, lotNumber: 'LOT-2', expirationDate: null, quantity: 3, pickedQuantity: 3 }
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({ data: [allocation] })
    const { result } = renderHook(() => useReportPickingShortage(), { wrapper: createQueryClientWrapper() })
    result.current.mutate({ outboundId: 1, shortages: [{ outboundAllocationId: 5, shortageQuantity: 3 }] })
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/api/outbounds/1/reallocation', { shortages: [{ outboundAllocationId: 5, shortageQuantity: 3 }] }))
    await waitFor(() => expect((result.current.data as Array<{ lotNumber: string }> | undefined)?.[0]?.lotNumber).toBe('LOT-2'))
  })
})
