import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { inventoryHttpClient } from '../../../shared/api/httpClient'
import { toReconciliationQueryParams, useApproveReconciliation, useReconciliationProposals, useRejectReconciliation } from './useReconciliations'

afterEach(() => vi.restoreAllMocks())

const proposal = {
  stockAdjustmentId: 31, warehouseId: 10, reconciliationRunId: 4, status: 'PENDING', productId: 100, lotId: 7, lotNumber: 'LOT-A', qualityStatus: 'NORMAL',
  inventoryQuantity: 10, wmsQuantity: 8, quantityChange: -2, requiresAdmin: false, inventoryId: 500, approvedBy: null, approvedAt: null,
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return { wrapper, invalidate }
}

describe('toReconciliationQueryParams', () => {
  it('비어 있는 조건은 빼고 페이지만 담는다', () => {
    expect(toReconciliationQueryParams({ status: '', page: 0, size: 20 })).toEqual({ page: 0, size: 20 })
  })

  it('창고와 상태를 담는다', () => {
    expect(toReconciliationQueryParams({ warehouseId: 10, status: 'PENDING', page: 1, size: 20 })).toEqual({ warehouseId: 10, status: 'PENDING', page: 1, size: 20 })
  })
})

describe('useReconciliationProposals', () => {
  it('보정안 목록 API를 조건과 함께 호출하고 응답을 zod로 검증한다', async () => {
    const get = vi.spyOn(inventoryHttpClient, 'get').mockResolvedValue({ data: { items: [proposal], page: 0, size: 20, totalElements: 1, totalPages: 1 } })
    const { wrapper } = setup()

    const { result } = renderHook(() => useReconciliationProposals({ status: 'PENDING', page: 0, size: 20 }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledWith('/api/v1/reconciliations/proposals', { params: { status: 'PENDING', page: 0, size: 20 } })
    expect(result.current.data?.items[0].quantityChange).toBe(-2)
  })
})

describe('useApproveReconciliation', () => {
  it('승인하고 보정안 목록과 재고 현황을 다시 받는다', async () => {
    const post = vi.spyOn(inventoryHttpClient, 'post').mockResolvedValue({ data: { ...proposal, status: 'APPLIED' } })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useApproveReconciliation(), { wrapper })

    await act(() => result.current.mutateAsync(31))

    expect(post).toHaveBeenCalledWith('/api/v1/reconciliations/proposals/31/approval')
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reconciliations'] }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['stock'] })
  })

  it('수량이 바뀌어 409가 와도 갱신된 보정안을 보도록 목록을 다시 받는다(재고 현황은 그대로)', async () => {
    vi.spyOn(inventoryHttpClient, 'post').mockRejectedValue(new Error('conflict'))
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useApproveReconciliation(), { wrapper })

    await act(async () => { await result.current.mutateAsync(31).catch(() => {}) })

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reconciliations'] }))
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['stock'] })
  })
})

describe('useRejectReconciliation', () => {
  it('거절하고 보정안 목록만 다시 받는다', async () => {
    const post = vi.spyOn(inventoryHttpClient, 'post').mockResolvedValue({ data: { ...proposal, status: 'REJECTED' } })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useRejectReconciliation(), { wrapper })

    await act(() => result.current.mutateAsync(31))

    expect(post).toHaveBeenCalledWith('/api/v1/reconciliations/proposals/31/rejection')
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reconciliations'] }))
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['stock'] })
  })
})
