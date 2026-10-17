import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useDisposableLocationStocks, useLocationStocks } from './useLocationStocks'

const row = (locationStockId: number, qualityStatus: string) => ({ locationStockId, warehouseId: 1, zoneId: 1, zoneCode: 'A', locationId: 1, locationCode: 'A-01', productId: 2, lotNumber: 'LOT-1', qualityStatus, quantity: 3, heldQuantity: 0, availableQuantity: 3, updatedAt: null })

afterEach(() => vi.restoreAllMocks())

describe('useLocationStocks', () => {
  it('창고와 조건을 쿼리로 넘기고 items를 돌려준다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: { items: [row(1, 'NORMAL')] } })
    const { result } = renderHook(() => useLocationStocks([1], { zoneId: 5, qualityStatus: 'NORMAL' }), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(getSpy).toHaveBeenCalledWith('/api/location-stocks', { params: { warehouseIds: [1], zoneId: 5, qualityStatus: 'NORMAL' } })
  })
})

describe('useDisposableLocationStocks', () => {
  it('불량·폐기 예정을 각각 조회해 합친다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockImplementation(async (_url: string, config?: { params?: unknown }) => {
      const qualityStatus = (config?.params as { qualityStatus?: string } | undefined)?.qualityStatus ?? ''
      return { data: { items: [row(qualityStatus === 'DEFECTIVE' ? 1 : 2, qualityStatus)] } }
    })
    const { result } = renderHook(() => useDisposableLocationStocks([1]), { wrapper: createQueryClientWrapper() })
    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(result.current.data?.map((stock) => stock.locationStockId)).toEqual([1, 2])
    expect(getSpy).toHaveBeenCalledWith('/api/location-stocks', { params: { qualityStatus: 'DEFECTIVE', warehouseIds: [1] } })
    expect(getSpy).toHaveBeenCalledWith('/api/location-stocks', { params: { qualityStatus: 'DISPOSAL_SCHEDULED', warehouseIds: [1] } })
  })
})
