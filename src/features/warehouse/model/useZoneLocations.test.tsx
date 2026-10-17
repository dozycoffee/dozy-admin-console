import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useZoneLocations } from './useZoneLocations'

const location = (locationId: number, zoneId: number) => ({ locationId, zoneId, locationCode: `A-0${locationId}`, maxCapacity: 100, usedCapacity: 10, locationStatus: 'AVAILABLE' })

afterEach(() => vi.restoreAllMocks())

describe('useZoneLocations', () => {
  it('Zone마다 Location을 조회해 합친다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockImplementation(async (url: string) => ({ data: url === '/api/zones/1/locations' ? [location(1, 1)] : [location(2, 2), location(3, 2)] }))
    const { result } = renderHook(() => useZoneLocations([1, 2]), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data).toHaveLength(3))
    expect(getSpy).toHaveBeenCalledWith('/api/zones/1/locations')
    expect(getSpy).toHaveBeenCalledWith('/api/zones/2/locations')
    expect(result.current.isLoading).toBe(false)
  })

  it('한 Zone이 실패하면 오류로 알린다', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValue(new Error('실패'))
    const { result } = renderHook(() => useZoneLocations([1]), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
