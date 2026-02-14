import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLastValue } from './useLastValue'

describe('useLastValue', () => {
  it('returns null when only null has been passed', () => {
    const { result } = renderHook(() => useLastValue<number>(null))
    expect(result.current).toBeNull()
  })

  it('returns the value when a non-null value is passed', () => {
    const { result } = renderHook(() => useLastValue(440))
    expect(result.current).toBe(440)
  })

  it('retains the last non-null value when null is passed subsequently', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number | null }) => useLastValue(value),
      { initialProps: { value: 440 as number | null } },
    )
    expect(result.current).toBe(440)

    rerender({ value: null })
    expect(result.current).toBe(440)
  })

  it('updates when a new non-null value is passed', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number | null }) => useLastValue(value),
      { initialProps: { value: 440 } },
    )

    rerender({ value: 880 })
    expect(result.current).toBe(880)
  })

  it('retains latest value through null gaps', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number | null }) => useLastValue(value),
      { initialProps: { value: 100 as number | null } },
    )

    rerender({ value: null })
    rerender({ value: 200 })
    rerender({ value: null })
    expect(result.current).toBe(200)
  })
})
