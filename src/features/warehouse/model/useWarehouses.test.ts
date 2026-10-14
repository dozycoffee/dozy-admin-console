import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { ApiError } from '../../../shared/api/ApiError'
import { useWarehouseList, useWarehouses } from './useWarehouses'

const warehouse = (warehouseId: number) => ({
  warehouseId,
  warehouseName: `창고 ${warehouseId}`,
  address: '서울시 성동구',
  latitude: 37.5,
  longitude: 127.0,
  warehouseStatus: 'AVAILABLE',
})

describe('useWarehouses', () => {
  it('warehouseId 각각에 대해 병렬로 조회해 데이터를 모은다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockImplementation(async (url: string) => {
      const warehouseId = Number(url.split('/').pop())
      return { data: warehouse(warehouseId) }
    })

    const { result } = renderHook(() => useWarehouses([1, 2]), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getSpy).toHaveBeenCalledWith('/api/warehouses/1')
    expect(getSpy).toHaveBeenCalledWith('/api/warehouses/2')
    expect(result.current.data).toHaveLength(2)
    expect(result.current.isError).toBe(false)
  })

  it('warehouseIds가 비어있으면 빈 배열을 반환하고 로딩 상태가 아니다', () => {
    const { result } = renderHook(() => useWarehouses([]), { wrapper: createQueryClientWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toEqual([])
  })
})

describe('useWarehouseList', () => {
  it('창고 목록 API를 한 번 호출해 items를 돌려준다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: { items: [warehouse(1), warehouse(2)] } })

    const { result } = renderHook(() => useWarehouseList(), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledTimes(1)
    expect(getSpy).toHaveBeenCalledWith('/api/warehouses')
    expect(result.current.data?.map((item) => item.warehouseId)).toEqual([1, 2])
  })

  it('권한이 없는 등 실패해도 재시도하지 않고 오류 상태가 된다(이름은 보조 정보)', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockRejectedValue(new ApiError('forbidden', { status: 403, code: 'FORBIDDEN' }))

    const { result } = renderHook(() => useWarehouseList(), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(getSpy).toHaveBeenCalledTimes(1)
  })
})
