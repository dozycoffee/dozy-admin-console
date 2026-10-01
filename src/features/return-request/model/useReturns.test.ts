import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import type { ReturnRequest } from './returnSchemas'
import { paginateReturns, useCompleteReturn, useRegisterReturn, useReturnItems, useReturns, useStartReturnInspecting } from './useReturns'

const returnRequest = (returnRequestId: number, status: ReturnRequest['status'], warehouseId = 543): ReturnRequest => ({ returnRequestId, warehouseId, status })

afterEach(() => vi.restoreAllMocks())

describe('paginateReturns', () => {
  const all = [returnRequest(1, 'COMPLETED'), returnRequest(2, 'RECEIVED'), returnRequest(3, 'INSPECTING'), returnRequest(4, 'COMPLETED'), returnRequest(5, 'RECEIVED', 999)]

  it('AccessScope 밖 창고는 제외하고 상태별 건수를 센다', () => {
    const result = paginateReturns(all, [543], [], 1, 10)
    expect(result.total).toBe(4)
    expect(result.statusCounts).toEqual({ RECEIVED: 1, INSPECTING: 1, COMPLETED: 2 })
  })

  it('상태 필터와 최신순 정렬, 페이지 분할을 적용한다', () => {
    expect(paginateReturns(all, [543], ['COMPLETED'], 1, 1).items.map((item) => item.returnRequestId)).toEqual([4])
    expect(paginateReturns(all, [543], ['COMPLETED'], 2, 1).items.map((item) => item.returnRequestId)).toEqual([1])
  })
})

describe('useReturns', () => {
  it('GET /api/return-requests 한 번으로 목록을 받아 클라이언트에서 가공한다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: [returnRequest(1, 'RECEIVED'), returnRequest(2, 'COMPLETED')] })
    const { result } = renderHook(() => useReturns([543], ['RECEIVED'], 1, 4), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(getSpy).toHaveBeenCalledWith('/api/return-requests')
    expect(result.current.data?.items).toHaveLength(1)
  })
})

describe('useReturnItems', () => {
  it('품목에 상품명을 합쳐 돌려준다', async () => {
    vi.spyOn(httpClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/return-items') return { data: [{ returnItemId: 7, returnRequestId: 1, productId: 2, expectedQuantity: 10, actualQuantity: null, inspectionResult: 'PENDING', quantityDiscrepancy: null }] }
      return { data: [{ productId: 2, productCode: 'BEAN-1', productName: '에티오피아', category: 'BEAN', unit: 'ea', shelfLifeDays: null, productStatus: 'ACTIVE' }] }
    })
    const { result } = renderHook(() => useReturnItems(1), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data?.[0]?.productName).toBe('에티오피아'))
    expect(result.current.data?.[0]).toMatchObject({ productCode: 'BEAN-1', inspectionResult: 'PENDING' })
  })
})

describe('반품 상태 전이 mutation', () => {
  it('등록은 POST /api/return-requests를 호출한다', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({ data: returnRequest(1, 'RECEIVED') })
    const { result } = renderHook(() => useRegisterReturn(), { wrapper: createQueryClientWrapper() })
    const body = { warehouseId: 543, items: [{ productId: 2, expectedQuantity: 5 }] }
    result.current.mutate(body)
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/api/return-requests', body))
  })

  it('검수 시작은 PATCH /start-inspecting을 호출한다', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: returnRequest(1, 'INSPECTING') })
    const { result } = renderHook(() => useStartReturnInspecting(), { wrapper: createQueryClientWrapper() })
    result.current.mutate(1)
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith('/api/return-requests/1/start-inspecting'))
  })

  it('완료는 Lot 배정을 담아 PATCH /complete를 호출한다', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: returnRequest(1, 'COMPLETED') })
    const { result } = renderHook(() => useCompleteReturn(), { wrapper: createQueryClientWrapper() })
    const body = { lotAssignments: [{ returnItemId: 7, lotNumber: 'LOT-R1' }] }
    result.current.mutate({ returnRequestId: 1, body })
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith('/api/return-requests/1/complete', body))
  })
})
