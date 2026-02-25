import { describe, it, expect, vi, beforeEach } from 'vitest'
import { moduleReducer, createInitialState } from './moduleReducer'
import type { ModuleState } from './types'
import type { ModuleSpecification } from '../../data/types'

vi.mock('../../exercise/state/exerciseGenerator', () => ({
  generateExercises: vi.fn(() => []),
  PART_INDEX: { bass: 0, bari: 1, lead: 2, tenor: 3 },
}))

const testModules: ModuleSpecification[] = [
  {
    name: 'Major Triads',
    slug: 'major-triads',
    description: 'Practice major triads',
    difficulty: 'beginner',
    levels: [
      { chordType: 'major', voicing: '1513', partwiseEaseOfTuning: [1, 1, 1, 1], repeats: 3 },
      { chordType: 'major', voicing: '1351', partwiseEaseOfTuning: [2, 2, 2, 2], repeats: 3 },
    ],
  },
  {
    name: 'Minor Triads',
    slug: 'minor-triads',
    description: 'Practice minor triads',
    difficulty: 'beginner',
    levels: [
      { chordType: 'minor', voicing: '1513', partwiseEaseOfTuning: [1, 1, 1, 1], repeats: 2 },
    ],
  },
]

const threeStarResult = { stars: 3 as const, durationMs: 2000, meanOffsetCents: 0 }
const oneStarResult = { stars: 1 as const, durationMs: 10000, meanOffsetCents: 0 }

describe('createInitialState', () => {
  it('starts in module-select phase', () => {
    const state = createInitialState(testModules, 'lead')
    expect(state.phase).toEqual({ type: 'module-select' })
  })

  it('initializes moduleScores with nulls matching module/level structure', () => {
    const state = createInitialState(testModules, 'lead')
    expect(state.moduleScores).toEqual([
      [null, null],
      [null],
    ])
  })

  it('stores modules and part', () => {
    const state = createInitialState(testModules, 'bass')
    expect(state.modules).not.toBe(testModules)
    expect(state.modules.length).toBe(testModules.length)
    expect(state.part).toBe('bass')
  })

  it('sorts levels by partwiseEaseOfTuning descending for the selected part', () => {
    const state = createInitialState(testModules, 'lead')
    expect(state.modules[0].levels[0].voicing).toBe('1351')
    expect(state.modules[0].levels[1].voicing).toBe('1513')
  })
})

describe('moduleReducer', () => {
  let initialState: ModuleState

  beforeEach(() => {
    initialState = createInitialState(testModules, 'lead')
  })

  describe('SELECT_MODULE', () => {
    it('transitions from module-select to module-active at level 0', () => {
      const next = moduleReducer(initialState, { type: 'SELECT_MODULE', moduleIndex: 0 })
      expect(next.phase).toEqual({ type: 'module-active', moduleIndex: 0, levelIndex: 0, retryCount: 0 })
    })

    it('allows jumping to a different module from module-active phase', () => {
      const activeState: ModuleState = {
        ...initialState,
        phase: { type: 'module-active', moduleIndex: 0, levelIndex: 0, retryCount: 0 },
      }
      const next = moduleReducer(activeState, { type: 'SELECT_MODULE', moduleIndex: 1 })
      expect(next.phase).toEqual({ type: 'module-active', moduleIndex: 1, levelIndex: 0, retryCount: 0 })
    })

    it('accepts an optional levelIndex', () => {
      const next = moduleReducer(initialState, { type: 'SELECT_MODULE', moduleIndex: 0, levelIndex: 1 })
      expect(next.phase).toEqual({ type: 'module-active', moduleIndex: 0, levelIndex: 1, retryCount: 0 })
    })

    it('increments retryCount when selecting the same module and level', () => {
      const activeState: ModuleState = {
        ...initialState,
        phase: { type: 'module-active', moduleIndex: 0, levelIndex: 1, retryCount: 2 },
      }
      const next = moduleReducer(activeState, { type: 'SELECT_MODULE', moduleIndex: 0, levelIndex: 1 })
      expect(next.phase).toEqual({ type: 'module-active', moduleIndex: 0, levelIndex: 1, retryCount: 3 })
    })

    it('is a no-op for invalid level index', () => {
      const next = moduleReducer(initialState, { type: 'SELECT_MODULE', moduleIndex: 0, levelIndex: 99 })
      expect(next).toBe(initialState)
    })

    it('is a no-op for invalid module index', () => {
      const next = moduleReducer(initialState, { type: 'SELECT_MODULE', moduleIndex: 99 })
      expect(next).toBe(initialState)
    })
  })

  describe('LEVEL_COMPLETED', () => {
    it('updates moduleScores with sum of stars', () => {
      const next = moduleReducer(initialState, {
        type: 'LEVEL_COMPLETED',
        results: [threeStarResult, oneStarResult, threeStarResult],
        moduleIndex: 0,
        levelIndex: 0,
      })
      expect(next.moduleScores[0][0]).toBe(7)
    })

    it('keeps higher existing score when new score is lower', () => {
      const state: ModuleState = {
        ...initialState,
        moduleScores: [[7, null], [null]],
      }
      const next = moduleReducer(state, {
        type: 'LEVEL_COMPLETED',
        results: [oneStarResult, oneStarResult, oneStarResult],
        moduleIndex: 0,
        levelIndex: 0,
      })
      expect(next.moduleScores[0][0]).toBe(7)
    })

    it('updates score when new score is higher', () => {
      const state: ModuleState = {
        ...initialState,
        moduleScores: [[1, null], [null]],
      }
      const next = moduleReducer(state, {
        type: 'LEVEL_COMPLETED',
        results: [threeStarResult, threeStarResult, threeStarResult],
        moduleIndex: 0,
        levelIndex: 0,
      })
      expect(next.moduleScores[0][0]).toBe(9)
    })
  })

  describe('NEXT_LEVEL', () => {
    it('advances to next level within the module', () => {
      const state: ModuleState = {
        ...initialState,
        phase: { type: 'module-active', moduleIndex: 0, levelIndex: 0, retryCount: 0 },
      }
      const next = moduleReducer(state, { type: 'NEXT_LEVEL' })
      expect(next.phase).toEqual({ type: 'module-active', moduleIndex: 0, levelIndex: 1, retryCount: 0 })
    })

    it('returns to module-select when no more levels', () => {
      const state: ModuleState = {
        ...initialState,
        phase: { type: 'module-active', moduleIndex: 0, levelIndex: 1, retryCount: 0 },
      }
      const next = moduleReducer(state, { type: 'NEXT_LEVEL' })
      expect(next.phase).toEqual({ type: 'module-select' })
    })

    it('returns to module-select when single-level module is complete', () => {
      const state: ModuleState = {
        ...initialState,
        phase: { type: 'module-active', moduleIndex: 1, levelIndex: 0, retryCount: 0 },
      }
      const next = moduleReducer(state, { type: 'NEXT_LEVEL' })
      expect(next.phase).toEqual({ type: 'module-select' })
    })

    it('is a no-op when not in module-active phase', () => {
      const next = moduleReducer(initialState, { type: 'NEXT_LEVEL' })
      expect(next).toBe(initialState)
    })
  })

  describe('BACK_TO_MODULES', () => {
    it('returns to module-select from module-active', () => {
      const state: ModuleState = {
        ...initialState,
        phase: { type: 'module-active', moduleIndex: 0, levelIndex: 0, retryCount: 0 },
      }
      const next = moduleReducer(state, { type: 'BACK_TO_MODULES' })
      expect(next.phase).toEqual({ type: 'module-select' })
    })

    it('is a no-op from module-select', () => {
      const next = moduleReducer(initialState, { type: 'BACK_TO_MODULES' })
      expect(next.phase).toEqual({ type: 'module-select' })
    })
  })

  describe('SET_PART', () => {
    it('changes the part from module-select', () => {
      const next = moduleReducer(initialState, { type: 'SET_PART', part: 'bass', scores: [[null, null], [null]] })
      expect(next.part).toBe('bass')
    })

    it('resets scores when changing part without saved scores', () => {
      const state: ModuleState = {
        ...initialState,
        moduleScores: initialState.moduleScores.map(row => row.map(() => 5)),
      }
      const next = moduleReducer(state, { type: 'SET_PART', part: 'bass', scores: [[null, null], [null]] })
      expect(next.part).toBe('bass')
      expect(next.moduleScores.every(row => row.every(s => s === null))).toBe(true)
    })

    it('uses provided scores when changing part', () => {
      const scores: (number | null)[][] = [[7, null], [5]]
      const next = moduleReducer(initialState, { type: 'SET_PART', part: 'bass', scores })
      expect(next.part).toBe('bass')
      expect(next.moduleScores).toEqual([[7, null], [5]])
    })

    it('reinitializes when setting the same part', () => {
      const next = moduleReducer(initialState, { type: 'SET_PART', part: 'lead', scores: [[null, null], [null]] })
      expect(next).not.toBe(initialState)
      expect(next.part).toBe('lead')
    })

    it('is a no-op when not in module-select phase', () => {
      const state: ModuleState = {
        ...initialState,
        phase: { type: 'module-active', moduleIndex: 0, levelIndex: 0, retryCount: 0 },
      }
      const next = moduleReducer(state, { type: 'SET_PART', part: 'bass', scores: [[null, null], [null]] })
      expect(next).toBe(state)
    })
  })
})
