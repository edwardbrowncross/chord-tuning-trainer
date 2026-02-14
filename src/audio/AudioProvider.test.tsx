import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { AudioProvider, useAudio } from './AudioProvider'

function createMockAudioContext() {
  return {
    sampleRate: 44100,
    state: 'running' as AudioContextState,
    onstatechange: null as (() => void) | null,
    close: vi.fn(),
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AudioProvider, null, children)
}

describe('AudioProvider', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    mockCtx = createMockAudioContext()
    // Constructor that returns mockCtx directly (explicit return of object from constructor)
    vi.stubGlobal('AudioContext', vi.fn(function () {
      return mockCtx
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('useAudio throws when used outside AudioProvider', () => {
    expect(() => {
      renderHook(() => useAudio())
    }).toThrow('useAudio must be used within an AudioProvider')
  })

  it('starts in uninitialized state', () => {
    const { result } = renderHook(() => useAudio(), { wrapper })
    expect(result.current.state).toBe('uninitialized')
  })

  it('lazily creates AudioContext on first call to getOrCreateAudioContext', () => {
    const { result } = renderHook(() => useAudio(), { wrapper })

    expect(AudioContext).not.toHaveBeenCalled()

    let ctx: AudioContext
    act(() => {
      ctx = result.current.getOrCreateAudioContext()
    })

    expect(AudioContext).toHaveBeenCalledTimes(1)
    expect(ctx!).toBe(mockCtx)
    expect(result.current.state).toBe('running')
  })

  it('returns the same AudioContext on subsequent calls', () => {
    const { result } = renderHook(() => useAudio(), { wrapper })

    let ctx1: AudioContext
    let ctx2: AudioContext
    act(() => {
      ctx1 = result.current.getOrCreateAudioContext()
      ctx2 = result.current.getOrCreateAudioContext()
    })

    expect(ctx1!).toBe(ctx2!)
    expect(AudioContext).toHaveBeenCalledTimes(1)
  })
})
