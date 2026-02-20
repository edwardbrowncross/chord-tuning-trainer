import { describe, it, expect, vi, beforeEach } from 'vitest'
import { levelReducer, createLevelState } from './levelReducer'
import type { LevelState } from './types'
import type { Exercise } from '../../exercise/state/types'
import type { PerceptualParams } from 'cantor-digitalis'

vi.mock('../../exercise/state/exerciseGenerator', () => ({
  generateExercises: vi.fn(() => [stubExercise, stubExercise, stubExercise]),
  PART_INDEX: { bass: 0, bari: 1, lead: 2, tenor: 3 },
}))

import { generateExercises } from '../../exercise/state/exerciseGenerator'
const mockGenerateExercises = vi.mocked(generateExercises)

const stubVoice: PerceptualParams = {
  pitch: 0, pitchOffset: 50, vocalEffort: 0.7, vowelHeight: 0.5,
  vowelBackness: 0.5, tenseness: 0.5, breathiness: 0, roughness: 0,
  vocalTractSize: 0.28, isFalsetto: false,
}

const stubExercise: Exercise = {
  referenceTone: stubVoice,
  targetNote: 50,
  chordVoices: [stubVoice, stubVoice, stubVoice],
  matchThresholdCents: 20,
  matchSustainMs: 1000,
  adjustThresholdCents: 10,
  adjustSustainMs: 1500,
  starThresholds: [3000, 8000],
}

const threeStarResult = { stars: 3 as const, durationMs: 2000, meanOffsetCents: 0 }
const twoStarResult = { stars: 2 as const, durationMs: 5000, meanOffsetCents: 0 }

const testLevelSpec = {
  chordType: 'major' as const,
  voicing: '1513',
  partwiseEaseOfTuning: [1, 1, 1, 1] as [number, number, number, number],
  repeats: 3,
}

describe('createLevelState', () => {
  beforeEach(() => {
    mockGenerateExercises.mockReturnValue([stubExercise, stubExercise, stubExercise])
  })

  it('creates a ready state with exercises', () => {
    const state = createLevelState(testLevelSpec, 'lead')
    expect(state.phase).toBe('ready')
    expect(state.exerciseIndex).toBe(0)
    expect(state.results).toEqual([])
    expect(state.exercises.length).toBe(3)
  })

  it('calls generateExercises with levelSpec and part', () => {
    createLevelState(testLevelSpec, 'bass')
    expect(mockGenerateExercises).toHaveBeenCalledWith(testLevelSpec, 'bass', undefined)
  })
})

describe('levelReducer', () => {
  let readyState: LevelState
  let activeState: LevelState

  beforeEach(() => {
    readyState = {
      phase: 'ready',
      exercises: [stubExercise, stubExercise, stubExercise],
      exerciseIndex: 0,
      results: [],
    }
    activeState = { ...readyState, phase: 'active' }
  })

  describe('START', () => {
    it('transitions from ready to active', () => {
      const next = levelReducer(readyState, { type: 'START' })
      expect(next.phase).toBe('active')
    })

    it('is a no-op when not in ready phase', () => {
      const next = levelReducer(activeState, { type: 'START' })
      expect(next).toBe(activeState)
    })
  })

  describe('EXERCISE_COMPLETED', () => {
    it('advances exerciseIndex and appends result when more exercises remain', () => {
      const next = levelReducer(activeState, { type: 'EXERCISE_COMPLETED', result: threeStarResult })
      expect(next.phase).toBe('active')
      expect(next.exerciseIndex).toBe(1)
      expect(next.results).toEqual([threeStarResult])
    })

    it('transitions to complete when all exercises are done', () => {
      const state: LevelState = {
        ...activeState,
        exerciseIndex: 2,
        results: [threeStarResult, twoStarResult],
      }
      const next = levelReducer(state, { type: 'EXERCISE_COMPLETED', result: threeStarResult })
      expect(next.phase).toBe('complete')
      expect(next.results).toEqual([threeStarResult, twoStarResult, threeStarResult])
    })

    it('is a no-op when not in active phase', () => {
      const next = levelReducer(readyState, { type: 'EXERCISE_COMPLETED', result: threeStarResult })
      expect(next).toBe(readyState)
    })
  })

  describe('RETRY', () => {
    it('resets to ready with new exercises', () => {
      const newExercises = [stubExercise, stubExercise]
      const state: LevelState = {
        phase: 'complete',
        exercises: [stubExercise, stubExercise, stubExercise],
        exerciseIndex: 2,
        results: [threeStarResult, twoStarResult, threeStarResult],
      }
      const next = levelReducer(state, { type: 'RETRY', exercises: newExercises })
      expect(next.phase).toBe('ready')
      expect(next.exerciseIndex).toBe(0)
      expect(next.results).toEqual([])
      expect(next.exercises).toBe(newExercises)
    })
  })
})
