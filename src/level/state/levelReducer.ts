import { generateExercises } from '../../exercise/state/exerciseGenerator'
import type { LevelSpecification } from '../../data/types'
import type { Part } from '../../types'
import type { LevelState, LevelAction } from './types'

export function createLevelState(levelSpec: LevelSpecification, part: Part): LevelState {
  return {
    phase: 'ready',
    exercises: generateExercises(levelSpec, part),
    exerciseIndex: 0,
    results: [],
  }
}

export function levelReducer(state: LevelState, action: LevelAction): LevelState {
  switch (action.type) {
    case 'START': {
      if (state.phase !== 'ready') return state
      return { ...state, phase: 'active' }
    }

    case 'EXERCISE_COMPLETED': {
      if (state.phase !== 'active') return state
      const results = [...state.results, action.result]
      const nextIndex = state.exerciseIndex + 1

      if (nextIndex >= state.exercises.length) {
        return { ...state, phase: 'complete', results }
      }

      return { ...state, exerciseIndex: nextIndex, results }
    }

    case 'RETRY': {
      return {
        phase: 'ready',
        exercises: action.exercises,
        exerciseIndex: 0,
        results: [],
      }
    }
  }
}
