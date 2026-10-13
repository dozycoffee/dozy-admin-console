import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXIT_DURATION_MS, usePresence } from './usePresence'

function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query }))
}

describe('usePresence', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('열려 있으면 보이고 닫히는 중이 아니다', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => usePresence(true))

    expect(result.current).toEqual({ visible: true, closing: false })
  })

  it('닫으면 애니메이션이 끝날 때까지 보이면서 닫히는 중이다', () => {
    stubMatchMedia(false)
    const { result, rerender } = renderHook(({ open }) => usePresence(open), { initialProps: { open: true } })

    rerender({ open: false })
    expect(result.current).toEqual({ visible: true, closing: true })

    act(() => { vi.advanceTimersByTime(EXIT_DURATION_MS - 10) })
    expect(result.current.visible).toBe(true)
    act(() => { vi.advanceTimersByTime(20) })
    expect(result.current).toEqual({ visible: false, closing: false })
  })

  it('닫히는 도중 다시 열면 닫히는 중이 풀리고 계속 보인다', () => {
    stubMatchMedia(false)
    const { result, rerender } = renderHook(({ open }) => usePresence(open), { initialProps: { open: true } })
    rerender({ open: false })

    rerender({ open: true })
    act(() => { vi.advanceTimersByTime(EXIT_DURATION_MS * 2) })

    expect(result.current).toEqual({ visible: true, closing: false })
  })

  it('"동작 줄이기"를 켰다면 닫는 즉시 사라진다', () => {
    stubMatchMedia(true)
    const { result, rerender } = renderHook(({ open }) => usePresence(open), { initialProps: { open: true } })

    rerender({ open: false })

    expect(result.current).toEqual({ visible: false, closing: false })
  })

  it('애니메이션을 지원하지 않는 환경(matchMedia 없음)에서도 닫는 즉시 사라진다', () => {
    const { result, rerender } = renderHook(({ open }) => usePresence(open), { initialProps: { open: true } })

    rerender({ open: false })

    expect(result.current.visible).toBe(false)
  })

  it('처음부터 닫혀 있으면 닫히는 애니메이션을 만들지 않는다', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => usePresence(false))

    expect(result.current).toEqual({ visible: false, closing: false })
  })
})
