import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePhaseTransitions } from './usePhaseTransitions'
import type { Exercise, ExercisePhase, ExerciseAction } from './types'
import type { PerceptualParams } from 'cantor-digitalis'

const stubVoice: PerceptualParams = {
  pitch: 0, pitchOffset: 69, vocalEffort: 0.7, vowelHeight: 0.5,
  vowelBackness: 0.5, tenseness: 0.5, breathiness: 0, roughness: 0,
  vocalTractSize: 0.3, isFalsetto: false,
}

const testConfig: Exercise = {
  referenceTone: stubVoice,
  targetNote: 69, // A4 = 440Hz
  chordVoices: [stubVoice, stubVoice, stubVoice],
  matchThresholdCents: 50,
  matchSustainMs: 500,
  adjustThresholdCents: 15,
  adjustSustainMs: 2000,
  starThresholds: [3000, 8000],
}

/** Frequency at exact cents offset from A4 (440Hz) */
const hzAtCents = (cents: number) => 440 * 2 ** (cents / 1200)

/**
 * Shallow-copy the phase to create a new object reference, triggering useEffect
 * without resetting progress (phase.type stays the same string).
 */
const tick = <T extends ExercisePhase>(phase: T): T => ({ ...phase })

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

// Progress speed depends on distance from target:
//   In range:  speed = 2 * (1 - absCents / threshold)
//              → 2.0x at dead center, 1.0x at half-threshold, ~0 at edge
//   Out of range: decayRate = min(1, (absCents - threshold) / threshold)
//              → slow decay just outside, capped at 1.0x for far out

describe('usePhaseTransitions', () => {
  describe('match-root phase', () => {
    // threshold=50 cents, sustainMs=500
    const matchPhase: ExercisePhase = { type: 'match-root', config: testConfig }

    it('dispatches ROOT_MATCHED at 2x speed when dead center', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // First tick at center: delta=0, progress=0
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })

      // 200ms * speed 2 = 400 progress (< 500)
      now = 1200
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      // 50ms * 2 = 100. Total = 500 → dispatch
      now = 1250
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(dispatch).toHaveBeenCalledWith({
        type: 'ROOT_MATCHED',
        timestamp: 1250,
      })
    })

    it('accumulates at 1x speed when 25 cents from center', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // 25 cents off: speed = 2*(1-25/50) = 1.0
      const pitch25 = hzAtCents(25)
      rerender({ phase: tick(matchPhase), pitch: pitch25, dispatch })

      // 400ms * 1.0 = 400 (< 500)
      now = 1400
      rerender({ phase: tick(matchPhase), pitch: pitch25, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      // 110ms more ≈ 510 (overshoot to avoid float edge) → dispatch
      now = 1510
      rerender({ phase: tick(matchPhase), pitch: pitch25, dispatch })
      expect(dispatch).toHaveBeenCalledWith({
        type: 'ROOT_MATCHED',
        timestamp: 1510,
      })
    })

    it('barely accumulates when pitch is near threshold edge', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // 49 cents: speed = 2*(1-49/50) = 0.04
      const pitch49 = hzAtCents(49)
      rerender({ phase: tick(matchPhase), pitch: pitch49, dispatch })

      // 1000ms * 0.04 = 40 progress (far from 500)
      now = 2000
      rerender({ phase: tick(matchPhase), pitch: pitch49, dispatch })
      expect(dispatch).not.toHaveBeenCalled()
    })

    it('decrements progress when pitch goes out of range instead of resetting', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // Build 200 progress: 100ms at center, speed=2 → 200
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      now = 1100
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })

      // Far out (300Hz, decayRate=1.0) for 100ms → 200-100=100
      now = 1200
      rerender({ phase: tick(matchPhase), pitch: 300, dispatch })

      // Back at center: 150ms * 2 = 300. Total = 100+300=400 (< 500)
      now = 1350
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      // 50ms * 2 = 100. Total = 500 → dispatch
      now = 1400
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(dispatch).toHaveBeenCalledWith({
        type: 'ROOT_MATCHED',
        timestamp: 1400,
      })
    })

    it('clamps progress at zero when out of range for a long time', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // Build 200 progress: 100ms at center * speed 2
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      now = 1100
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })

      // Far out (decayRate=1.0) for 500ms → 200-500 clamped to 0
      now = 1600
      rerender({ phase: tick(matchPhase), pitch: 300, dispatch })

      // Need full 500 from zero at speed 2 → 250ms
      now = 1700
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      // delta=100 * 2 = 200

      now = 1800
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      // delta=100 * 2 = 200. Total = 400 (< 500)
      expect(dispatch).not.toHaveBeenCalled()

      now = 1850
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      // delta=50 * 2 = 100. Total = 500 → dispatch
      expect(dispatch).toHaveBeenCalled()
    })

    it('decrements progress when pitch goes null', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: matchPhase, pitch: 440, dispatch })

      // 100ms at center * speed 2 = 200
      now = 1100
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })

      // Null pitch → decayRate=1.0. 100ms → 200-100=100
      now = 1200
      rerender({ phase: tick(matchPhase), pitch: null, dispatch })

      // Back at center: 100ms * 2 = 200. Total = 100+200=300
      now = 1300
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })

      // 50ms * 2 = 100. Total = 400 (< 500)
      now = 1350
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      // 50ms * 2 = 100. Total = 500 → dispatch
      now = 1400
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(dispatch).toHaveBeenCalled()
    })

    it('decays slowly when just outside threshold', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // Build 400 progress: 200ms at center * 2 = 400
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      now = 1200
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })

      // 60 cents out: decayRate = (60-50)/50 = 0.2
      // 500ms * 0.2 = 100 decay. 400-100=300
      now = 1700
      rerender({ phase: tick(matchPhase), pitch: hzAtCents(60), dispatch })

      // Back at center: 50ms * 2 = 100. 300+100=400 (< 500)
      now = 1750
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      // 60ms * 2 = 120. 400+120=520 (overshoot to avoid float edge) → dispatch
      now = 1810
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(dispatch).toHaveBeenCalledWith({
        type: 'ROOT_MATCHED',
        timestamp: 1810,
      })
    })
  })

  describe('adjust-chord phase', () => {
    // threshold=15 cents, sustainMs=2000
    const adjustPhase: ExercisePhase = { type: 'adjust-chord', config: testConfig, startedAt: 500 }

    it('dispatches CHORD_LOCKED after sustained dead-center pitch', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: adjustPhase, pitch: null, dispatch })

      // Dead center: speed=2. Need 2000 progress → 1000ms of delta
      rerender({ phase: tick(adjustPhase), pitch: 440, dispatch })

      // 800ms * 2 = 1600 (< 2000)
      now = 1800
      rerender({ phase: tick(adjustPhase), pitch: 440, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      // 200ms * 2 = 400. Total = 2000 → dispatch
      now = 2000
      rerender({ phase: tick(adjustPhase), pitch: 440, dispatch })
      expect(dispatch).toHaveBeenCalledWith({
        type: 'CHORD_LOCKED',
        timestamp: 2000,
      })
    })

    it('accumulates at 1x speed when 7.5 cents from center', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: adjustPhase, pitch: null, dispatch })

      // 7.5 cents off: speed = 2*(1-7.5/15) = 1.0
      const pitch75 = hzAtCents(7.5)
      rerender({ phase: tick(adjustPhase), pitch: pitch75, dispatch })

      // 1800ms * 1.0 = 1800 (< 2000)
      now = 2800
      rerender({ phase: tick(adjustPhase), pitch: pitch75, dispatch })
      expect(dispatch).not.toHaveBeenCalled()

      // 200ms more = 2000 → dispatch
      now = 3000
      rerender({ phase: tick(adjustPhase), pitch: pitch75, dispatch })
      expect(dispatch).toHaveBeenCalledWith({
        type: 'CHORD_LOCKED',
        timestamp: 3000,
      })
    })

    it('decrements progress when pitch goes out of range instead of resetting', () => {
      const dispatch = vi.fn()
      const { rerender } = renderTransitions({ phase: adjustPhase, pitch: 440, dispatch })

      // 500ms at center, speed=2 → progress=1000
      now = 1500
      rerender({ phase: tick(adjustPhase), pitch: 440, dispatch })

      // 20 cents out (threshold=15): decayRate = (20-15)/15 = 1/3
      // 300ms * 1/3 = 100 decay. progress = 900
      now = 1800
      rerender({ phase: tick(adjustPhase), pitch: hzAtCents(20), dispatch })

      // Back at center: 600ms * 2 = 1200. ~900+1200 ≈ 2100 (overshoot to avoid float edge) → dispatch
      now = 2400
      rerender({ phase: tick(adjustPhase), pitch: 440, dispatch })
      expect(dispatch).toHaveBeenCalledWith({
        type: 'CHORD_LOCKED',
        timestamp: 2400,
      })
    })
  })

  describe('sustain progress return value', () => {
    it('returns 0 for idle phase', () => {
      const dispatch = vi.fn()
      const idle: ExercisePhase = { type: 'idle' }
      const { result } = renderTransitions({ phase: idle, pitch: 440, dispatch })
      expect(result.current).toBe(0)
    })

    it('returns 0 for result phase', () => {
      const dispatch = vi.fn()
      const result: ExercisePhase = { type: 'result', config: testConfig, durationMs: 5000, stars: 2 }
      const { result: hookResult } = renderTransitions({ phase: result, pitch: 440, dispatch })
      expect(hookResult.current).toBe(0)
    })

    it('returns fractional progress during match-root', () => {
      const dispatch = vi.fn()
      const matchPhase: ExercisePhase = { type: 'match-root', config: testConfig }
      const { result, rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      expect(result.current).toBe(0)

      // First in-range tick (delta=0)
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(result.current).toBe(0)

      // Dead center: speed=2. 125ms * 2 = 250 progress. 250/500 = 0.5
      now = 1125
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(result.current).toBeCloseTo(0.5)

      // 125ms * 2 = 250 more. 500/500 = 1.0
      now = 1250
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(result.current).toBe(1)
    })

    it('returns fractional progress during adjust-chord', () => {
      const dispatch = vi.fn()
      const adjustPhase: ExercisePhase = { type: 'adjust-chord', config: testConfig, startedAt: 500 }
      const { result, rerender } = renderTransitions({ phase: adjustPhase, pitch: null, dispatch })

      expect(result.current).toBe(0)

      rerender({ phase: tick(adjustPhase), pitch: 440, dispatch })
      expect(result.current).toBe(0)

      // Dead center: speed=2. 500ms * 2 = 1000. 1000/2000 = 0.5
      now = 1500
      rerender({ phase: tick(adjustPhase), pitch: 440, dispatch })
      expect(result.current).toBeCloseTo(0.5)
    })

    it('decreases progress when going out of range', () => {
      const dispatch = vi.fn()
      const matchPhase: ExercisePhase = { type: 'match-root', config: testConfig }
      const { result, rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // Build 300 progress: 150ms at center * speed 2. 300/500 = 0.6
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      now = 1150
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(result.current).toBeCloseTo(0.6)

      // Far out (300Hz, decayRate=1.0) for 100ms → 300-100=200. 200/500=0.4
      now = 1250
      rerender({ phase: tick(matchPhase), pitch: 300, dispatch })
      expect(result.current).toBeCloseTo(0.4)
    })

    it('clamps progress at 0 (never negative)', () => {
      const dispatch = vi.fn()
      const matchPhase: ExercisePhase = { type: 'match-root', config: testConfig }
      const { result, rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // Out of range for a long time
      now = 5000
      rerender({ phase: tick(matchPhase), pitch: 300, dispatch })
      expect(result.current).toBe(0)
    })

    it('clamps progress at 1 (never exceeds)', () => {
      const dispatch = vi.fn()
      const matchPhase: ExercisePhase = { type: 'match-root', config: testConfig }
      const { result, rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // Accumulate well past 500ms at speed 2
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      now = 2000
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(result.current).toBe(1)
    })

    it('resets to 0 when phase changes', () => {
      const dispatch = vi.fn()
      const matchPhase: ExercisePhase = { type: 'match-root', config: testConfig }
      const adjustPhase: ExercisePhase = { type: 'adjust-chord', config: testConfig, startedAt: 500 }

      const { result, rerender } = renderTransitions({ phase: matchPhase, pitch: null, dispatch })

      // Build up: 125ms at center * 2 = 250. 250/500 = 0.5
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      now = 1125
      rerender({ phase: tick(matchPhase), pitch: 440, dispatch })
      expect(result.current).toBeCloseTo(0.5)

      // Switch to adjust-chord — progress resets, delta=0
      now = 1200
      rerender({ phase: adjustPhase, pitch: 440, dispatch })
      expect(result.current).toBe(0)
    })
  })

  describe('phase changes', () => {
    it('resets tracking when phase changes', () => {
      const dispatch = vi.fn()
      const matchPhase: ExercisePhase = { type: 'match-root', config: testConfig }
      const adjustPhase: ExercisePhase = { type: 'adjust-chord', config: testConfig, startedAt: 500 }

      const { rerender } = renderTransitions({ phase: matchPhase, pitch: 440, dispatch })

      // Switch phase — progress resets
      now = 1200
      rerender({ phase: adjustPhase, pitch: 440, dispatch })

      // 800ms at center, speed=2 → 1600 (< 2000)
      now = 2000
      rerender({ phase: tick(adjustPhase), pitch: 440, dispatch })
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
