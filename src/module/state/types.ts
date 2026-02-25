import type { ExerciseResult } from '../../exercise/state/types'
export type { ExerciseResult } from '../../exercise/state/types'
import type { Part } from '../../types'
import type { ModuleSpecification } from '../../data/types'

export type ModulePhase =
  | { type: 'module-select' }
  | { type: 'module-active'; moduleIndex: number; levelIndex: number; retryCount: number }

export type ModuleState = {
  phase: ModulePhase
  modules: ModuleSpecification[]
  part: Part | null
  /** Best stars per [module][level], null = not yet completed */
  moduleScores: (number | null)[][]
}

export type ModuleAction =
  | { type: 'SELECT_MODULE'; moduleIndex: number; levelIndex?: number }
  | { type: 'LEVEL_COMPLETED'; results: ExerciseResult[]; moduleIndex: number; levelIndex: number }
  | { type: 'NEXT_LEVEL' }
  | { type: 'BACK_TO_MODULES' }
  | { type: 'SET_PART'; part: Part; scores: (number | null)[][] }
