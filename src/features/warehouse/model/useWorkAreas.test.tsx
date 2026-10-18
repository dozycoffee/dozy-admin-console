import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useWorkAreas } from './useWorkAreas'

const area = (areaCode: string) => ({ workAreaId: 1, warehouseId: 7, areaCode, areaName: areaCode, maxCapacity: 100, usedCapacity: 10, workAreaStatus: 'AVAILABLE' })

afterEach(() => vi.restoreAllMocks())

describe('useWorkAreas', () => {
  it('창고의 작업 처리장 네 곳을 코드별로 조회한다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockImplementation(async (url: string) => ({ data: area(url.split('/').pop() as string) }))
    const { result } = renderHook(() => useWorkAreas(7), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data).toHaveLength(4))
    expect(getSpy).toHaveBeenCalledWith('/api/warehouses/7/work-areas/INBOUND')
    expect(getSpy).toHaveBeenCalledWith('/api/warehouses/7/work-areas/DISPOSAL')
  })

  it('창고가 정해지지 않으면 조회하지 않는다', () => {
    const getSpy = vi.spyOn(httpClient, 'get')
    const { result } = renderHook(() => useWorkAreas(undefined), { wrapper: createQueryClientWrapper() })
    expect(result.current.data).toEqual([])
    expect(getSpy).not.toHaveBeenCalled()
  })

  it('조회에 실패하면 오류로 알린다', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValue(new Error('실패'))
    const { result } = renderHook(() => useWorkAreas(7), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
