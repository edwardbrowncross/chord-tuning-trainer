import type { Exercise, ExerciseResult } from '../../exercise/state/types'
export type { ExerciseResult } from '../../exercise/state/types'
import type { Part } from '../../types'
import type { ModuleSpecification } from '../../data/types'

export type LevelProgress = {
  exerciseIndex: number
  exercises: Exercise[]
  results: ExerciseResult[]
}

export type ProgressPhase =
  | { type: 'module-select' }
  | { type: 'level-ready'; moduleIndex: number; levelIndex: number; level: LevelProgress }
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
  | { type: 'SELECT_MODULE'; moduleIndex: number; levelIndex?: number }
  | { type: 'START_LEVEL' }
  | { type: 'EXERCISE_COMPLETED'; result: ExerciseResult }
  | { type: 'NEXT_LEVEL' }
  | { type: 'BACK_TO_MODULES' }
  | { type: 'SET_PART'; part: Part }
