import { afterEach, describe, expect, it, vi } from 'vitest'
import { withViewTransition } from './withViewTransition'

const doc = document as unknown as { startViewTransition?: unknown }

afterEach(() => {
  delete doc.startViewTransition
  vi.unstubAllGlobals()
})

describe('withViewTransition', () => {
  it('View Transitions를 지원하지 않으면 전환 없이 바로 바꾼다', () => {
    const update = vi.fn()

    withViewTransition(update)

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('지원하면 변경을 전환으로 감싸 한 번만 실행한다', () => {
    const update = vi.fn()
    const start = vi.fn((callback: () => void) => callback())
    doc.startViewTransition = start

    withViewTransition(update)

    expect(start).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('"동작 줄이기"를 켰다면 지원해도 전환 없이 바로 바꾼다', () => {
    const update = vi.fn()
    const start = vi.fn()
    doc.startViewTransition = start
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))

    withViewTransition(update)

    expect(start).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledTimes(1)
  })
})
