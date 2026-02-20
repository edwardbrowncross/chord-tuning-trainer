import { describe, it, expect } from 'vitest'
import { exerciseReducer, initialPhase, calculateStars } from './exerciseReducer'
import type { Exercise, ExercisePhase } from './types'
import type { PerceptualParams } from 'cantor-digitalis'

const stubVoice: PerceptualParams = {
  pitch: 0, pitchOffset: 50, vocalEffort: 0.7, vowelHeight: 0.5,
  vowelBackness: 0.5, tenseness: 0.5, breathiness: 0, roughness: 0,
  vocalTractSize: 0.28, isFalsetto: false,
}

const testConfig: Exercise = {
  referenceTone: stubVoice,
  targetNote: 50,
  chordVoices: [stubVoice, stubVoice, stubVoice],
  matchThresholdCents: 50,
  matchSustainMs: 500,
  adjustThresholdCents: 15,
  adjustSustainMs: 2000,
  starThresholds: [3000, 8000],
}

describe('exerciseReducer', () => {
  it('starts in idle', () => {
    expect(initialPhase).toEqual({ type: 'idle' })
  })

  describe('START_EXERCISE', () => {
    it('transitions from idle to match-root', () => {
      const next = exerciseReducer(initialPhase, { type: 'START_EXERCISE', config: testConfig })
      expect(next).toEqual({ type: 'match-root', config: testConfig })
    })

    it('transitions from result to match-root', () => {
      const result: ExercisePhase = { type: 'result', config: testConfig, durationMs: 5000, stars: 2, meanOffsetCents: 0 }
      const next = exerciseReducer(result, { type: 'START_EXERCISE', config: testConfig })
      expect(next).toEqual({ type: 'match-root', config: testConfig })
    })

    it('is a no-op from match-root', () => {
      const matchRoot: ExercisePhase = { type: 'match-root', config: testConfig }
      const next = exerciseReducer(matchRoot, { type: 'START_EXERCISE', config: testConfig })
      expect(next).toBe(matchRoot)
    })

    it('is a no-op from adjust-chord', () => {
      const adjustChord: ExercisePhase = { type: 'adjust-chord', config: testConfig, startedAt: 1000 }
      const next = exerciseReducer(adjustChord, { type: 'START_EXERCISE', config: testConfig })
      expect(next).toBe(adjustChord)
    })
  })

  describe('ROOT_MATCHED', () => {
    it('transitions from match-root to adjust-chord with timestamp', () => {
      const matchRoot: ExercisePhase = { type: 'match-root', config: testConfig }
      const next = exerciseReducer(matchRoot, { type: 'ROOT_MATCHED', timestamp: 5000 })
      expect(next).toEqual({ type: 'adjust-chord', config: testConfig, startedAt: 5000 })
    })

    it('is a no-op from idle', () => {
      const next = exerciseReducer(initialPhase, { type: 'ROOT_MATCHED', timestamp: 5000 })
      expect(next).toBe(initialPhase)
    })

    it('is a no-op from adjust-chord', () => {
      const adjustChord: ExercisePhase = { type: 'adjust-chord', config: testConfig, startedAt: 1000 }
      const next = exerciseReducer(adjustChord, { type: 'ROOT_MATCHED', timestamp: 5000 })
      expect(next).toBe(adjustChord)
    })
  })

  describe('CHORD_LOCKED', () => {
    it('transitions from adjust-chord to result with correct duration', () => {
      const adjustChord: ExercisePhase = { type: 'adjust-chord', config: testConfig, startedAt: 1000 }
      const next = exerciseReducer(adjustChord, { type: 'CHORD_LOCKED', timestamp: 3500, meanOffsetCents: 1.5 })
      expect(next.type).toBe('result')
      if (next.type === 'result') {
        expect(next.durationMs).toBe(2500)
        expect(next.stars).toBe(3)
        expect(next.meanOffsetCents).toBe(1.5)
      }
    })

    it('is a no-op from idle', () => {
      const next = exerciseReducer(initialPhase, { type: 'CHORD_LOCKED', timestamp: 5000, meanOffsetCents: 0 })
      expect(next).toBe(initialPhase)
    })

    it('is a no-op from match-root', () => {
      const matchRoot: ExercisePhase = { type: 'match-root', config: testConfig }
      const next = exerciseReducer(matchRoot, { type: 'CHORD_LOCKED', timestamp: 5000, meanOffsetCents: 0 })
      expect(next).toBe(matchRoot)
    })
  })

  describe('RESET', () => {
    it('returns idle from match-root', () => {
      const matchRoot: ExercisePhase = { type: 'match-root', config: testConfig }
      expect(exerciseReducer(matchRoot, { type: 'RESET' })).toEqual(initialPhase)
    })

    it('returns idle from adjust-chord', () => {
      const adjustChord: ExercisePhase = { type: 'adjust-chord', config: testConfig, startedAt: 1000 }
      expect(exerciseReducer(adjustChord, { type: 'RESET' })).toEqual(initialPhase)
    })

    it('returns idle from result', () => {
      const result: ExercisePhase = { type: 'result', config: testConfig, durationMs: 5000, stars: 2, meanOffsetCents: 0 }
      expect(exerciseReducer(result, { type: 'RESET' })).toEqual(initialPhase)
    })

    it('returns idle from idle', () => {
      expect(exerciseReducer(initialPhase, { type: 'RESET' })).toEqual(initialPhase)
    })
  })
})

describe('calculateStars', () => {
  const thresholds: [number, number] = [3000, 8000]

  it('gives 3 stars for fast completion', () => {
    expect(calculateStars(2000, thresholds)).toBe(3)
  })

  it('gives 3 stars at exactly the 3-star boundary', () => {
    expect(calculateStars(3000, thresholds)).toBe(3)
  })

  it('gives 2 stars for medium completion', () => {
    expect(calculateStars(5000, thresholds)).toBe(2)
  })

  it('gives 2 stars at exactly the 2-star boundary', () => {
    expect(calculateStars(8000, thresholds)).toBe(2)
  })

  it('gives 1 star for slow completion', () => {
    expect(calculateStars(10000, thresholds)).toBe(1)
  })
})
