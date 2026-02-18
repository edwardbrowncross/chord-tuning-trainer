import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { PerceptualParams } from 'cantor-digitalis'
import type { Exercise } from './types'

const mockStart = vi.fn()
const mockStop = vi.fn()
const mockPlay = vi.fn()
const mockVowelStop = vi.fn()

vi.mock('../../audio/AudioProvider', () => ({
  useVowelPlayer: () => ({
    play: mockPlay,
    stop: mockVowelStop,
  }),
  usePitchDetector: () => ({
    pitch: null,
    start: mockStart,
    stop: mockStop,
    isRunning: false,
  }),
}))

// Must import after mocks are set up
const { useExerciseState } = await import('./useExerciseState')

const stubVoice: PerceptualParams = {
  pitch: 0, pitchOffset: 69, vocalEffort: 0.7, vowelHeight: 0.5,
  vowelBackness: 0.5, tenseness: 0.5, breathiness: 0, roughness: 0,
  vocalTractSize: 0.3, isFalsetto: false,
}

const testConfig: Exercise = {
  referenceTone: stubVoice,
  targetNote: 69,
  chordVoices: [stubVoice, stubVoice, stubVoice],
  matchThresholdCents: 50,
  matchSustainMs: 500,
  adjustThresholdCents: 15,
  adjustSustainMs: 2000,
  starThresholds: [3000, 8000],
}

const exercises = [testConfig, { ...testConfig, targetNote: 71 }]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useExerciseState', () => {
  it('auto-starts exercise on mount (transitions from idle to match-root)', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useExerciseState(exercises, 0, onComplete),
    )

    expect(result.current.phase.type).toBe('match-root')
  })

  it('plays reference tone in match-root phase', () => {
    const onComplete = vi.fn()
    renderHook(() => useExerciseState(exercises, 0, onComplete))

    expect(mockPlay).toHaveBeenCalledWith(testConfig.referenceTone, { rampTime: 0.3 })
  })

  it('starts pitch detector in match-root phase', () => {
    const onComplete = vi.fn()
    renderHook(() => useExerciseState(exercises, 0, onComplete))

    expect(mockStart).toHaveBeenCalled()
  })

  it('handleRetry does nothing when not in result phase', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useExerciseState(exercises, 0, onComplete),
    )

    // Phase is match-root, retry should be a no-op
    act(() => {
      result.current.handleRetry()
    })

    expect(result.current.phase.type).toBe('match-root')
  })

  it('handleNext does nothing when not in result phase', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useExerciseState(exercises, 0, onComplete),
    )

    act(() => {
      result.current.handleNext()
    })

    expect(onComplete).not.toHaveBeenCalled()
  })

  it('reports null to onChordMatched when not in result phase', () => {
    const onComplete = vi.fn()
    const onChordMatched = vi.fn()
    renderHook(() =>
      useExerciseState(exercises, 0, onComplete, onChordMatched),
    )

    // In match-root phase, should report null
    expect(onChordMatched).toHaveBeenCalledWith(null)
  })

  it('exposes pitch and sustainProgress', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useExerciseState(exercises, 0, onComplete),
    )

    expect(result.current.pitch).toBeNull()
    expect(result.current.sustainProgress).toBe(0)
  })

  it('uses the correct exercise config based on exerciseIndex', () => {
    const onComplete = vi.fn()
    const { result: result0 } = renderHook(() =>
      useExerciseState(exercises, 0, onComplete),
    )

    expect(result0.current.phase.type).toBe('match-root')
    if (result0.current.phase.type === 'match-root') {
      expect(result0.current.phase.config.targetNote).toBe(69)
    }

    // A fresh mount with index 1 picks up the second exercise
    // (In production, ExerciseScreen is remounted via key prop)
    const { result: result1 } = renderHook(() =>
      useExerciseState(exercises, 1, onComplete),
    )

    expect(result1.current.phase.type).toBe('match-root')
    if (result1.current.phase.type === 'match-root') {
      expect(result1.current.phase.config.targetNote).toBe(71)
    }
  })
})
