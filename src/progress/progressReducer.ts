import { generateExercises } from '../exercise/exerciseGenerator'
import type { Part } from '../exercise/types'
import type { ModuleSpecification } from '../modules/types'
import type { ProgressState, ProgressAction } from './types'

export function createInitialState(modules: ModuleSpecification[], part: Part): ProgressState {
  return {
    phase: { type: 'module-select' },
    modules,
    part,
    moduleScores: modules.map(m => m.levels.map(() => null)),
  }
}

export function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'SELECT_MODULE': {
      const mod = state.modules[action.moduleIndex]
      if (!mod) return state
      const levelIndex = action.levelIndex ?? 0
      const levelSpec = mod.levels[levelIndex]
      if (!levelSpec) return state
      const exercises = generateExercises(levelSpec, state.part)
      return {
        ...state,
        phase: {
          type: 'level-ready',
          moduleIndex: action.moduleIndex,
          levelIndex,
          level: { exerciseIndex: 0, exercises, results: [] },
        },
      }
    }

    case 'START_LEVEL': {
      if (state.phase.type !== 'level-ready') return state
      return {
        ...state,
        phase: { ...state.phase, type: 'level-active' },
      }
    }

    case 'EXERCISE_COMPLETED': {
      if (state.phase.type !== 'level-active') return state
      const { moduleIndex, levelIndex, level } = state.phase
      const results = [...level.results, action.result]
      const nextIndex = level.exerciseIndex + 1

      if (nextIndex >= level.exercises.length) {
        // All exercises done — compute level score (sum of stars across exercises)
        const levelScore = results.reduce((sum, r) => sum + r.stars, 0)
        const newScores = state.moduleScores.map(row => [...row])
        const prev = newScores[moduleIndex][levelIndex]
        if (prev === null || levelScore > prev) {
          newScores[moduleIndex][levelIndex] = levelScore
        }
        return {
          ...state,
          moduleScores: newScores,
          phase: { type: 'level-complete', moduleIndex, levelIndex, results },
        }
      }

      return {
        ...state,
        phase: {
          ...state.phase,
          level: { ...level, exerciseIndex: nextIndex, results },
        },
      }
    }

    case 'NEXT_LEVEL': {
      if (state.phase.type !== 'level-complete') return state
      const { moduleIndex, levelIndex } = state.phase
      const mod = state.modules[moduleIndex]
      const nextLevelIndex = levelIndex + 1

      if (nextLevelIndex >= mod.levels.length) {
        // No more levels in this module
        return { ...state, phase: { type: 'module-select' } }
      }

      const exercises = generateExercises(mod.levels[nextLevelIndex], state.part)
      return {
        ...state,
        phase: {
          type: 'level-ready',
          moduleIndex,
          levelIndex: nextLevelIndex,
          level: { exerciseIndex: 0, exercises, results: [] },
        },
      }
    }

    case 'BACK_TO_MODULES':
      return { ...state, phase: { type: 'module-select' } }

    case 'SET_PART': {
      if (state.phase.type !== 'module-select') return state
      return { ...state, part: action.part }
    }
  }
}
