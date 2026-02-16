import type { Exercise, Part } from '../exercise/types'
import type { ModuleSpecification } from '../modules/types'

export type ExerciseResult = { stars: 1 | 2 | 3; durationMs: number }

export type LevelProgress = {
  exerciseIndex: number
  exercises: Exercise[]
  results: ExerciseResult[]
}

export type ProgressPhase =
  | { type: 'module-select' }
  | { type: 'level-active'; moduleIndex: number; levelIndex: number; level: LevelProgress }
  | { type: 'level-complete'; moduleIndex: number; levelIndex: number; results: ExerciseResult[] }

export type ProgressState = {
  phase: ProgressPhase
  modules: ModuleSpecification[]
  part: Part
  /** Best stars per [module][level], null = not yet completed */
  moduleScores: (number | null)[][]
}

export type ProgressAction =
  | { type: 'SELECT_MODULE'; moduleIndex: number }
  | { type: 'EXERCISE_COMPLETED'; result: ExerciseResult }
  | { type: 'RETRY_EXERCISE' }
  | { type: 'NEXT_LEVEL' }
  | { type: 'BACK_TO_MODULES' }
  | { type: 'SET_PART'; part: Part }
