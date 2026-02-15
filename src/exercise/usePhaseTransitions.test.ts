import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePhaseTransitions } from './usePhaseTransitions'
import type { ExerciseConfig, ExercisePhase, ExerciseAction } from './types'
import type { PerceptualParams } from 'cantor-digitalis'

const stubVoice: PerceptualParams = {
  pitch: 0, pitchOffset: 69, vocalEffort: 0.7, vowelHeight: 0.5,
  vowelBackness: 0.5, tenseness: 0.5, breathiness: 0, roughness: 0,
  vocalTractSize: 0.3, isFalsetto: false,
}

const testConfig: ExerciseConfig = {
  referenceTone: stubVoice,
  targetNote: 69,
  chordVoices: [stubVoice, stubVoice, stubVoice],
  matchThresholdCents: 50,
  matchSustainMs: 500,
  adjustThresholdCents: 15,
  adjustSustainMs: 2000,
  starThresholds: [3000, 8000],
}

let now = 1000
beforeEach(() => {
  now = 1000
  vi.spyOn(Date, 'now').mockImplementation(() => now)
})

afterEach(() => {
  vi.restoreAllMocks()
})

type Props = {
  phase: ExercisePhase
  pitch: number | null
  dispatch: React.Dispatch<ExerciseAction>
}

function renderTransitions(props: Props) {
  return renderHook(
    ({ phase, pitch, dispatch }: Props) => usePhaseTransitions(phase, pitch, dispatch),
    { initialProps: props },
  )
}

describe('usePhaseTransitions', () => {
  describe('match-root phase', () => {
    const matchPhase: ExercisePhase = { type: 'match-root', config: testConfig }

    it('dispatches ROOT_MATCHED after sustained in-range pitch', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // First in-range pitch — sets sustainStart
      rerender({ phase: matchPhase, pitch: 440, dispatch })

      // Still in range, but not enough time
      now = 1200
      rerender({ phase: matchPhase, pitch: 441, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      // Enough time has passed
      now = 1600
      rerender({ phase: matchPhase, pitch: 442, dispatch })
      expect(dispatch).toHaveBeenCalledWith({
        type: 'ROOT_MATCHED',
        timestamp: 1600,
      })
    })

    it('resets timer when pitch goes out of range', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // Start sustaining
      rerender({ phase: matchPhase, pitch: 440, dispatch })

      // Go out of range
      now = 1200
      rerender({ phase: matchPhase, pitch: 300, dispatch })

      // Come back in range — timer restarts
      now = 1300
      rerender({ phase: matchPhase, pitch: 440, dispatch })

      // Not enough time from restart
      now = 1700
      rerender({ phase: matchPhase, pitch: 441, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      // Now enough time from restart (1300 + 500 = 1800)
      now = 1900
      rerender({ phase: matchPhase, pitch: 442, dispatch })
      expect(dispatch).toHaveBeenCalled()
    })

    it('resets timer when pitch goes null', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: matchPhase, pitch: 440, dispatch })

      now = 1200
      rerender({ phase: matchPhase, pitch: null, dispatch })

      now = 1300
      rerender({ phase: matchPhase, pitch: 440, dispatch })

      now = 1700
      rerender({ phase: matchPhase, pitch: 441, dispatch })
      expect(dispatch).not.toHaveBeenCalled()
    })
  })

  describe('adjust-chord phase', () => {
    const adjustPhase: ExercisePhase = { type: 'adjust-chord', config: testConfig, startedAt: 500 }

    it('dispatches CHORD_LOCKED after sustained in-range pitch', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: adjustPhase, pitch: null, dispatch })

      rerender({ phase: adjustPhase, pitch: 440, dispatch })

      now = 2500
      rerender({ phase: adjustPhase, pitch: 441, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      now = 3100
      rerender({ phase: adjustPhase, pitch: 442, dispatch })
      expect(dispatch).toHaveBeenCalledWith({
        type: 'CHORD_LOCKED',
        timestamp: 3100,
      })
    })

    it('resets timer when pitch goes out of range', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: adjustPhase, pitch: 440, dispatch })

      // Go out of range (more than 15 cents off)
      now = 1500
      const outOfRange = 440 * 2 ** (20 / 1200) // 20 cents sharp
      rerender({ phase: adjustPhase, pitch: outOfRange, dispatch })

      // Come back — timer restarts
      now = 1600
      rerender({ phase: adjustPhase, pitch: 440, dispatch })

      now = 3500
      rerender({ phase: adjustPhase, pitch: 441, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      now = 3700
      rerender({ phase: adjustPhase, pitch: 442, dispatch })
      expect(dispatch).toHaveBeenCalled()
    })
  })

  describe('phase changes', () => {
    it('resets tracking when phase changes', () => {
      const dispatch = vi.fn()
      const matchPhase: ExercisePhase = { type: 'match-root', config: testConfig }
      const adjustPhase: ExercisePhase = { type: 'adjust-chord', config: testConfig, startedAt: 500 }

      const { rerender } = renderTransitions({ phase: matchPhase, pitch: 440, dispatch })

      // Switch phase — timer should reset
      now = 1200
      rerender({ phase: adjustPhase, pitch: 440, dispatch })

      // Not enough time from phase change
      now = 2000
      rerender({ phase: adjustPhase, pitch: 441, dispatch })
      expect(dispatch).not.toHaveBeenCalled()
    })

    it('does nothing during idle phase', () => {
      const dispatch = vi.fn()
      const idle: ExercisePhase = { type: 'idle' }
      renderTransitions({ phase: idle, pitch: 440, dispatch })
      expect(dispatch).not.toHaveBeenCalled()
    })

    it('does nothing during result phase', () => {
      const dispatch = vi.fn()
      const result: ExercisePhase = { type: 'result', config: testConfig, durationMs: 5000, stars: 2 }
      renderTransitions({ phase: result, pitch: 440, dispatch })
      expect(dispatch).not.toHaveBeenCalled()
    })
  })
})
