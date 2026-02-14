import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { usePitch } from './usePitch'
import { AudioProvider } from '../audio/AudioProvider'

// Controllable mock for pitchfinder
let mockDetectPitch: (buf: Float32Array) => { freq: number; probability: number }

vi.mock('pitchfinder', () => ({
  Macleod: () => (buf: Float32Array) => mockDetectPitch(buf),
}))

// --- Helpers ---

function createMockTrack() {
  return { stop: vi.fn() }
}

function createMockStream(tracks = [createMockTrack()]) {
  return { getTracks: () => tracks } as unknown as MediaStream
}

function createMockAnalyser() {
  return {
    fftSize: 0,
    connect: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
  }
}

function createMockAudioContext(analyser: ReturnType<typeof createMockAnalyser>) {
  return {
    sampleRate: 44100,
    state: 'running' as AudioContextState,
    onstatechange: null as (() => void) | null,
    createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
    createAnalyser: vi.fn(() => analyser),
    close: vi.fn(),
  }
}

let rafCallbacks: Array<FrameRequestCallback> = []
let rafIdCounter = 1

function setupGlobalMocks(mockStream: MediaStream, mockAudioCtx: ReturnType<typeof createMockAudioContext>) {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb)
    return rafIdCounter++
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    },
  })
  // Constructor that returns mockAudioCtx directly
  vi.stubGlobal('AudioContext', vi.fn(function () {
    return mockAudioCtx
  }))
}

function flushRafCallbacks(count = 1) {
  for (let i = 0; i < count; i++) {
    const cb = rafCallbacks.shift()
    cb?.(performance.now())
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AudioProvider, null, children)
}

// --- Tests ---

describe('usePitch', () => {
  let analyser: ReturnType<typeof createMockAnalyser>
  let mockStream: MediaStream
  let mockTrack: ReturnType<typeof createMockTrack>
  let mockAudioCtx: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    rafCallbacks = []
    rafIdCounter = 1
    mockDetectPitch = () => ({ freq: 440, probability: 0.95 })
    analyser = createMockAnalyser()
    mockTrack = createMockTrack()
    mockStream = createMockStream([mockTrack])
    mockAudioCtx = createMockAudioContext(analyser)
    setupGlobalMocks(mockStream, mockAudioCtx)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with isRunning false and pitch null', () => {
    const { result } = renderHook(() => usePitch(), { wrapper })
    expect(result.current.isRunning).toBe(false)
    expect(result.current.pitch).toBeNull()
  })

  it('sets isRunning to true after start', async () => {
    const { result } = renderHook(() => usePitch(), { wrapper })
    await act(async () => {
      await result.current.start()
    })
    expect(result.current.isRunning).toBe(true)
  })

  it('sets isRunning to false after stop', async () => {
    const { result } = renderHook(() => usePitch(), { wrapper })
    await act(async () => {
      await result.current.start()
    })
    act(() => result.current.stop())
    expect(result.current.isRunning).toBe(false)
  })

  it('stops media tracks on stop but does not close the shared AudioContext', async () => {
    const { result } = renderHook(() => usePitch(), { wrapper })
    await act(async () => {
      await result.current.start()
    })
    act(() => result.current.stop())

    expect(mockTrack.stop).toHaveBeenCalled()
    // Shared AudioContext should NOT be closed by usePitch
    expect(mockAudioCtx.close).not.toHaveBeenCalled()
  })

  it('is idempotent — calling start twice does not create a second analyser', async () => {
    const { result } = renderHook(() => usePitch(), { wrapper })
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      await result.current.start()
    })

    expect(mockAudioCtx.createAnalyser).toHaveBeenCalledTimes(1)
  })

  it('detects pitch from valid results', async () => {
    mockDetectPitch = () => ({ freq: 440, probability: 0.95 })

    const { result } = renderHook(() => usePitch({ medianCount: 1 }), { wrapper })
    await act(async () => {
      await result.current.start()
    })

    act(() => flushRafCallbacks(3))

    expect(result.current.pitch).toBe(440)
  })

  it('does not push when probability is below threshold', async () => {
    mockDetectPitch = () => ({ freq: 440, probability: 0.1 })

    const { result } = renderHook(
      () => usePitch({ probabilityThreshold: 0.3, medianCount: 1 }),
      { wrapper },
    )
    await act(async () => {
      await result.current.start()
    })

    act(() => flushRafCallbacks(5))

    expect(result.current.pitch).toBeNull()
  })

  it('rejects frequencies outside the 20-1000 Hz range', async () => {
    mockDetectPitch = () => ({ freq: 5000, probability: 0.95 })

    const { result } = renderHook(() => usePitch({ medianCount: 1 }), { wrapper })
    await act(async () => {
      await result.current.start()
    })

    act(() => flushRafCallbacks(3))

    expect(result.current.pitch).toBeNull()
  })
})
