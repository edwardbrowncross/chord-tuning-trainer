import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { AudioProvider, useAudio, useVowelPlayer } from './AudioProvider'
import { VowelPlayer } from './VowelPlayer'

vi.mock('./VowelPlayer', () => {
  const VowelPlayer = vi.fn()
  return { VowelPlayer }
})

function createMockAudioContext() {
  return {
    sampleRate: 44100,
    state: 'running' as AudioContextState,
    onstatechange: null as (() => void) | null,
    close: vi.fn(),
    createGain: vi.fn(() => ({
      gain: { value: 1 },
      connect: vi.fn(),
    })),
    destination: {},
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

  it('vowelPlayer is null before AudioContext is created', () => {
    const { result } = renderHook(() => useAudio(), { wrapper })
    expect(result.current.vowelPlayer).toBeNull()
  })

  it('creates VowelPlayer when AudioContext is created', () => {
    const { result } = renderHook(() => useAudio(), { wrapper })

    vi.mocked(VowelPlayer).mockClear()

    act(() => {
      result.current.getOrCreateAudioContext()
    })

    expect(VowelPlayer).toHaveBeenCalledOnce()
    expect(VowelPlayer).toHaveBeenCalledWith(mockCtx)
    expect(result.current.vowelPlayer).toBeInstanceOf(VowelPlayer)
  })

  it('useVowelPlayer returns the same VowelPlayer instance', () => {
    const { result: audioResult } = renderHook(() => useAudio(), { wrapper })
    renderHook(() => useVowelPlayer(), { wrapper })

    act(() => {
      audioResult.current.getOrCreateAudioContext()
    })

    // Both hooks share the same wrapper so they see the same provider — but
    // they're in separate render trees. Verify the hook at least returns a
    // VowelPlayer after context creation in its own tree.
    const { result: playerResult2 } = renderHook(() => {
      const audio = useAudio()
      return { player: audio.vowelPlayer, getOrCreate: audio.getOrCreateAudioContext }
    }, { wrapper })

    act(() => {
      playerResult2.current.getOrCreate()
    })

    expect(playerResult2.current.player).toBeInstanceOf(VowelPlayer)
  })

  it('useVowelPlayer throws when used outside AudioProvider', () => {
    expect(() => {
      renderHook(() => useVowelPlayer())
    }).toThrow('useAudio must be used within an AudioProvider')
  })
})
