import { describe, it, expect, vi, beforeEach } from 'vitest'
import { progressReducer, createInitialState } from './progressReducer'
import type { ProgressState, ExerciseResult } from './types'
import type { Exercise } from '../exercise/types'
import type { ModuleSpecification } from '../modules/types'
import type { PerceptualParams } from 'cantor-digitalis'

// Mock exerciseGenerator to avoid randomness in tests
vi.mock('../exercise/exerciseGenerator', () => ({
  generateExercises: vi.fn(() => [stubExercise, stubExercise, stubExercise]),
}))

import { generateExercises } from '../exercise/exerciseGenerator'
const mockGenerateExercises = vi.mocked(generateExercises)

const stubVoice: PerceptualParams = {
  pitch: 0, pitchOffset: 50, vocalEffort: 0.7, vowelHeight: 0.5,
  vowelBackness: 0.5, tenseness: 0.5, breathiness: 0, roughness: 0,
  vocalTractSize: 0.3, isFalsetto: false,
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

const testModules: ModuleSpecification[] = [
  {
    name: 'Major Triads',
    description: 'Practice major triads',
    levels: [
      { level: 1, chordType: 'major', voicing: '1513', partwiseDifficulty: [1, 1, 1, 1], repeats: 3 },
      { level: 2, chordType: 'major', voicing: '1351', partwiseDifficulty: [2, 2, 2, 2], repeats: 3 },
    ],
  },
  {
    name: 'Minor Triads',
    description: 'Practice minor triads',
    levels: [
      { level: 1, chordType: 'minor', voicing: '1513', partwiseDifficulty: [1, 1, 1, 1], repeats: 2 },
    ],
  },
]

const threeStarResult: ExerciseResult = { stars: 3, durationMs: 2000 }
const twoStarResult: ExerciseResult = { stars: 2, durationMs: 5000 }
const oneStarResult: ExerciseResult = { stars: 1, durationMs: 10000 }

describe('createInitialState', () => {
  it('starts in module-select phase', () => {
    const state = createInitialState(testModules, 'lead')
    expect(state.phase).toEqual({ type: 'module-select' })
  })

  it('initializes moduleScores with nulls matching module/level structure', () => {
    const state = createInitialState(testModules, 'lead')
    expect(state.moduleScores).toEqual([
      [null, null],  // Major Triads: 2 levels
      [null],        // Minor Triads: 1 level
    ])
  })

  it('stores modules and part', () => {
    const state = createInitialState(testModules, 'bass')
    expect(state.modules).toBe(testModules)
    expect(state.part).toBe('bass')
  })
})

describe('progressReducer', () => {
  let initialState: ProgressState

  beforeEach(() => {
    initialState = createInitialState(testModules, 'lead')
    mockGenerateExercises.mockReturnValue([stubExercise, stubExercise, stubExercise])
  })

  describe('SELECT_MODULE', () => {
    it('transitions from module-select to level-ready at level 0', () => {
      const next = progressReducer(initialState, { type: 'SELECT_MODULE', moduleIndex: 0 })
      expect(next.phase.type).toBe('level-ready')
      if (next.phase.type === 'level-ready') {
        expect(next.phase.moduleIndex).toBe(0)
        expect(next.phase.levelIndex).toBe(0)
        expect(next.phase.level.exerciseIndex).toBe(0)
        expect(next.phase.level.results).toEqual([])
      }
    })

    it('calls generateExercises with the first level spec and part', () => {
      progressReducer(initialState, { type: 'SELECT_MODULE', moduleIndex: 0 })
      expect(mockGenerateExercises).toHaveBeenCalledWith(testModules[0].levels[0], 'lead')
    })

    it('allows jumping to a different module from level-active phase', () => {
      const activeState: ProgressState = {
        ...initialState,
        phase: {
          type: 'level-active',
          moduleIndex: 0,
          levelIndex: 0,
          level: { exerciseIndex: 0, exercises: [stubExercise], results: [] },
        },
      }
      const next = progressReducer(activeState, { type: 'SELECT_MODULE', moduleIndex: 1 })
      expect(next.phase.type).toBe('level-ready')
      if (next.phase.type === 'level-ready') {
        expect(next.phase.moduleIndex).toBe(1)
        expect(next.phase.levelIndex).toBe(0)
      }
    })

    it('accepts an optional levelIndex', () => {
      const next = progressReducer(initialState, { type: 'SELECT_MODULE', moduleIndex: 0, levelIndex: 1 })
      expect(next.phase.type).toBe('level-ready')
      if (next.phase.type === 'level-ready') {
        expect(next.phase.moduleIndex).toBe(0)
        expect(next.phase.levelIndex).toBe(1)
      }
      expect(mockGenerateExercises).toHaveBeenCalledWith(testModules[0].levels[1], 'lead')
    })

    it('is a no-op for invalid level index', () => {
      const next = progressReducer(initialState, { type: 'SELECT_MODULE', moduleIndex: 0, levelIndex: 99 })
      expect(next).toBe(initialState)
    })

    it('is a no-op for invalid module index', () => {
      const next = progressReducer(initialState, { type: 'SELECT_MODULE', moduleIndex: 99 })
      expect(next).toBe(initialState)
    })
  })

  describe('EXERCISE_COMPLETED', () => {
    it('advances exerciseIndex and appends result when more exercises remain', () => {
      const state: ProgressState = {
        ...initialState,
        phase: {
          type: 'level-active',
          moduleIndex: 0,
          levelIndex: 0,
          level: { exerciseIndex: 0, exercises: [stubExercise, stubExercise, stubExercise], results: [] },
        },
      }
      const next = progressReducer(state, { type: 'EXERCISE_COMPLETED', result: threeStarResult })
      expect(next.phase.type).toBe('level-active')
      if (next.phase.type === 'level-active') {
        expect(next.phase.level.exerciseIndex).toBe(1)
        expect(next.phase.level.results).toEqual([threeStarResult])
      }
    })

    it('transitions to level-complete when all exercises are done', () => {
      const state: ProgressState = {
        ...initialState,
        phase: {
          type: 'level-active',
          moduleIndex: 0,
          levelIndex: 0,
          level: {
            exerciseIndex: 2,
            exercises: [stubExercise, stubExercise, stubExercise],
            results: [threeStarResult, twoStarResult],
          },
        },
      }
      const next = progressReducer(state, { type: 'EXERCISE_COMPLETED', result: threeStarResult })
      expect(next.phase.type).toBe('level-complete')
      if (next.phase.type === 'level-complete') {
        expect(next.phase.results).toEqual([threeStarResult, twoStarResult, threeStarResult])
      }
    })

    it('updates moduleScores with sum of stars on level completion', () => {
      const state: ProgressState = {
        ...initialState,
        phase: {
          type: 'level-active',
          moduleIndex: 0,
          levelIndex: 0,
          level: {
            exerciseIndex: 2,
            exercises: [stubExercise, stubExercise, stubExercise],
            results: [threeStarResult, oneStarResult],
          },
        },
      }
      const next = progressReducer(state, { type: 'EXERCISE_COMPLETED', result: twoStarResult })
      // Sum of [3, 1, 2] = 6
      expect(next.moduleScores[0][0]).toBe(6)
    })

    it('keeps higher existing score when new score is lower', () => {
      const state: ProgressState = {
        ...initialState,
        moduleScores: [[7, null], [null]],
        phase: {
          type: 'level-active',
          moduleIndex: 0,
          levelIndex: 0,
          level: {
            exerciseIndex: 2,
            exercises: [stubExercise, stubExercise, stubExercise],
            results: [oneStarResult, oneStarResult],
          },
        },
      }
      const next = progressReducer(state, { type: 'EXERCISE_COMPLETED', result: oneStarResult })
      // Sum of [1,1,1] = 3, but existing score is 7, so keep 7
      expect(next.moduleScores[0][0]).toBe(7)
    })

    it('updates score when new score is higher', () => {
      const state: ProgressState = {
        ...initialState,
        moduleScores: [[1, null], [null]],
        phase: {
          type: 'level-active',
          moduleIndex: 0,
          levelIndex: 0,
          level: {
            exerciseIndex: 2,
            exercises: [stubExercise, stubExercise, stubExercise],
            results: [threeStarResult, threeStarResult],
          },
        },
      }
      const next = progressReducer(state, { type: 'EXERCISE_COMPLETED', result: threeStarResult })
      // Sum of [3,3,3] = 9, higher than existing 1
      expect(next.moduleScores[0][0]).toBe(9)
    })

    it('is a no-op when not in level-active phase', () => {
      const next = progressReducer(initialState, { type: 'EXERCISE_COMPLETED', result: threeStarResult })
      expect(next).toBe(initialState)
    })
  })

  describe('NEXT_LEVEL', () => {
    it('advances to next level within the module', () => {
      const state: ProgressState = {
        ...initialState,
        phase: {
          type: 'level-complete',
          moduleIndex: 0,
          levelIndex: 0,
          results: [threeStarResult, threeStarResult, threeStarResult],
        },
      }
      const next = progressReducer(state, { type: 'NEXT_LEVEL' })
      expect(next.phase.type).toBe('level-ready')
      if (next.phase.type === 'level-ready') {
        expect(next.phase.moduleIndex).toBe(0)
        expect(next.phase.levelIndex).toBe(1)
        expect(next.phase.level.exerciseIndex).toBe(0)
        expect(next.phase.level.results).toEqual([])
      }
      expect(mockGenerateExercises).toHaveBeenCalledWith(testModules[0].levels[1], 'lead')
    })

    it('returns to module-select when no more levels', () => {
      const state: ProgressState = {
        ...initialState,
        phase: {
          type: 'level-complete',
          moduleIndex: 0,
          levelIndex: 1,  // last level of Major Triads
          results: [threeStarResult],
        },
      }
      const next = progressReducer(state, { type: 'NEXT_LEVEL' })
      expect(next.phase).toEqual({ type: 'module-select' })
    })

    it('returns to module-select when single-level module is complete', () => {
      const state: ProgressState = {
        ...initialState,
        phase: {
          type: 'level-complete',
          moduleIndex: 1,  // Minor Triads has 1 level
          levelIndex: 0,
          results: [threeStarResult],
        },
      }
      const next = progressReducer(state, { type: 'NEXT_LEVEL' })
      expect(next.phase).toEqual({ type: 'module-select' })
    })

    it('is a no-op when not in level-complete phase', () => {
      const next = progressReducer(initialState, { type: 'NEXT_LEVEL' })
      expect(next).toBe(initialState)
    })
  })

  describe('BACK_TO_MODULES', () => {
    it('returns to module-select from level-active', () => {
      const state: ProgressState = {
        ...initialState,
        phase: {
          type: 'level-active',
          moduleIndex: 0,
          levelIndex: 0,
          level: { exerciseIndex: 0, exercises: [stubExercise], results: [] },
        },
      }
      const next = progressReducer(state, { type: 'BACK_TO_MODULES' })
      expect(next.phase).toEqual({ type: 'module-select' })
    })

    it('returns to module-select from level-complete', () => {
      const state: ProgressState = {
        ...initialState,
        phase: {
          type: 'level-complete',
          moduleIndex: 0,
          levelIndex: 0,
          results: [threeStarResult],
        },
      }
      const next = progressReducer(state, { type: 'BACK_TO_MODULES' })
      expect(next.phase).toEqual({ type: 'module-select' })
    })

    it('is a no-op from module-select', () => {
      const next = progressReducer(initialState, { type: 'BACK_TO_MODULES' })
      expect(next.phase).toEqual({ type: 'module-select' })
    })
  })

  describe('SET_PART', () => {
    it('changes the part from module-select', () => {
      const next = progressReducer(initialState, { type: 'SET_PART', part: 'bass' })
      expect(next.part).toBe('bass')
    })

    it('resets scores when changing part', () => {
      const state: ProgressState = {
        ...initialState,
        moduleScores: initialState.moduleScores.map(row => row.map(() => 5)),
      }
      const next = progressReducer(state, { type: 'SET_PART', part: 'bass' })
      expect(next.part).toBe('bass')
      expect(next.moduleScores.every(row => row.every(s => s === null))).toBe(true)
    })

    it('is a no-op when part is already selected', () => {
      const next = progressReducer(initialState, { type: 'SET_PART', part: 'lead' })
      expect(next).toBe(initialState)
    })

    it('is a no-op when not in module-select phase', () => {
      const state: ProgressState = {
        ...initialState,
        phase: {
          type: 'level-active',
          moduleIndex: 0,
          levelIndex: 0,
          level: { exerciseIndex: 0, exercises: [stubExercise], results: [] },
        },
      }
      const next = progressReducer(state, { type: 'SET_PART', part: 'bass' })
      expect(next).toBe(state)
    })
  })
})
