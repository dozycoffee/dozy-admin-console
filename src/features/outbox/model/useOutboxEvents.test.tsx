import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { inventoryHttpClient } from '../../../shared/api/httpClient'
import { useOutboxEvents, useRequeueOutboxEvent } from './useOutboxEvents'

afterEach(() => vi.restoreAllMocks())

const event = {
  outboxEventId: 7, aggregateType: 'INVENTORY', aggregateId: 500, eventType: 'inventory.quantity.increased', partitionKey: 'inventory-500', payload: '{"a":1}',
  status: 'DEAD', attemptCount: 20, lastError: 'serialization failed', createdAt: '2026-10-15T01:00:00', deadAt: '2026-10-15T02:00:00',
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return { wrapper, invalidate }
}

describe('useOutboxEvents', () => {
  it('격리 이벤트 목록을 페이지로 조회하고 응답을 zod로 검증한다', async () => {
    const get = vi.spyOn(inventoryHttpClient, 'get').mockResolvedValue({ data: { items: [event], page: 1, size: 20, totalElements: 21, totalPages: 2 } })
    const { wrapper } = setup()

    const { result } = renderHook(() => useOutboxEvents(1, 20), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledWith('/api/v1/outbox-events', { params: { page: 1, size: 20 } })
    expect(result.current.data?.items[0].attemptCount).toBe(20)
  })

  it('필수 필드가 빠진 응답은 오류로 처리한다', async () => {
    vi.spyOn(inventoryHttpClient, 'get').mockResolvedValue({ data: { items: [{ outboxEventId: 1 }], page: 0, size: 20, totalElements: 1, totalPages: 1 } })
    const { wrapper } = setup()

    const { result } = renderHook(() => useOutboxEvents(0, 20), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('마지막 오류와 시각이 없는 이벤트도 받는다', async () => {
    vi.spyOn(inventoryHttpClient, 'get').mockResolvedValue({ data: { items: [{ ...event, lastError: null, createdAt: null, deadAt: null }], page: 0, size: 20, totalElements: 1, totalPages: 1 } })
    const { wrapper } = setup()

    const { result } = renderHook(() => useOutboxEvents(0, 20), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useRequeueOutboxEvent', () => {
  it('재큐하고 목록을 다시 받는다', async () => {
    const post = vi.spyOn(inventoryHttpClient, 'post').mockResolvedValue({ data: { ...event, status: 'PENDING', attemptCount: 0, lastError: null } })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useRequeueOutboxEvent(), { wrapper })

    await act(() => result.current.mutateAsync(7))

    expect(post).toHaveBeenCalledWith('/api/v1/outbox-events/7/requeue')
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['outbox'] }))
  })

  it('이미 처리돼 409가 와도 최신 목록을 보도록 다시 받는다', async () => {
    vi.spyOn(inventoryHttpClient, 'post').mockRejectedValue(new Error('conflict'))
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useRequeueOutboxEvent(), { wrapper })

    await act(async () => { await result.current.mutateAsync(7).catch(() => {}) })

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['outbox'] }))
  })
})
