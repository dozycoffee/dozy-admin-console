import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useZoneInventorySummary } from './useZoneInventorySummary'

const validSummary = {
  zoneId: 1,
  zoneCode: 'A',
  warehouseId: 1,
  maxCapacity: 180,
  usedCapacity: 90,
  usageRate: 0.5,
  quantityByQualityStatus: { NORMAL: 90 },
}

describe('useZoneInventorySummary', () => {
  it('warehouseIds를 쿼리 파라미터로 요청하고 응답을 zod로 검증해 반환한다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: [validSummary] })

    const { result } = renderHook(() => useZoneInventorySummary([1]), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getSpy).toHaveBeenCalledWith('/api/inventories/zone-summary', { params: { warehouseIds: [1] } })
    expect(result.current.data).toEqual([validSummary])
  })

  it('서버 응답이 스키마와 다르면 에러 상태가 된다', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({ data: [{ zoneId: 1 }] })

    const { result } = renderHook(() => useZoneInventorySummary([1]), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
