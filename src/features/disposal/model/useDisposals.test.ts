import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import type { Disposal } from './disposalSchemas'
import { paginateDisposals, useApproveDisposal, useCompleteDisposal, useDisposalItems, useDisposals, useRegisterDisposal } from './useDisposals'

const disposal = (disposalId: number, status: Disposal['status'], warehouseId = 543): Disposal => ({ disposalId, warehouseId, status })

afterEach(() => vi.restoreAllMocks())

describe('paginateDisposals', () => {
  const all = [disposal(1, 'COMPLETED'), disposal(2, 'REQUESTED'), disposal(3, 'APPROVED'), disposal(4, 'COMPLETED'), disposal(5, 'REQUESTED', 999)]

  it('AccessScope 밖 창고는 제외하고 상태별 건수를 센다', () => {
    const result = paginateDisposals(all, [543], [], 1, 10)
    expect(result.total).toBe(4)
    expect(result.statusCounts).toEqual({ REQUESTED: 1, APPROVED: 1, COMPLETED: 2 })
  })

  it('상태 필터와 최신순 정렬, 페이지 분할을 적용한다', () => {
    expect(paginateDisposals(all, [543], ['COMPLETED'], 1, 1).items.map((item) => item.disposalId)).toEqual([4])
    expect(paginateDisposals(all, [543], ['COMPLETED'], 2, 1).items.map((item) => item.disposalId)).toEqual([1])
  })
})

describe('useDisposals', () => {
  it('GET /api/disposals 한 번으로 목록을 받아 클라이언트에서 가공한다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: [disposal(1, 'REQUESTED'), disposal(2, 'COMPLETED')] })
    const { result } = renderHook(() => useDisposals([543], ['REQUESTED'], 1, 4), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(getSpy).toHaveBeenCalledWith('/api/disposals')
    expect(result.current.data?.items).toHaveLength(1)
  })
})

describe('useDisposalItems', () => {
  const inventory = (qualityStatus: string) => ({ inventoryId: 9, productId: 2, lotId: 1, locationId: 1, quantity: 3, allocatedQuantity: 0, availableQuantity: 3, qualityStatus })

  it('폐기 가능 재고에 남아 있는 품목은 상품명을 붙이고, 없으면 null로 둔다', async () => {
    vi.spyOn(httpClient, 'get').mockImplementation(async (url: string, config?: { params?: unknown }) => {
      if (url === '/api/disposal-items') return { data: [{ disposalItemId: 1, disposalId: 1, inventoryId: 9, quantity: 3, reason: 'INSPECTION_DEFECT' }, { disposalItemId: 2, disposalId: 1, inventoryId: 10, quantity: 1, reason: 'OTHER' }] }
      if (url === '/api/products') return { data: [{ productId: 2, productCode: 'BEAN-1', productName: '에티오피아', category: 'BEAN', unit: 'ea', shelfLifeDays: null, productStatus: 'ACTIVE' }] }
      return { data: (config?.params as { qualityStatus?: string } | undefined)?.qualityStatus === 'DEFECTIVE' ? [inventory('DEFECTIVE')] : [] }
    })
    const { result } = renderHook(() => useDisposalItems(1, [543]), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data?.[0]?.productName).toBe('에티오피아'))
    expect(result.current.data?.[1]?.productName).toBeNull()
  })
})

describe('폐기 상태 전이 mutation', () => {
  it('등록은 POST /api/disposals를 호출한다', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({ data: disposal(1, 'REQUESTED') })
    const { result } = renderHook(() => useRegisterDisposal(), { wrapper: createQueryClientWrapper() })
    const body = { warehouseId: 543, items: [{ inventoryId: 9, quantity: 3, reason: 'OTHER' as const }] }
    result.current.mutate(body)
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/api/disposals', body))
  })

  it.each([
    ['승인', useApproveDisposal, 'approve', 'APPROVED'],
    ['완료', useCompleteDisposal, 'complete', 'COMPLETED'],
  ] as const)('%s은 PATCH /%s를 호출한다', async (_label, useHook, path, status) => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: disposal(1, status) })
    const { result } = renderHook(() => useHook(), { wrapper: createQueryClientWrapper() })
    result.current.mutate(1)
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith(`/api/disposals/1/${path}`))
  })
})
