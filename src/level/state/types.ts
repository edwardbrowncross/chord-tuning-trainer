import type { Exercise, ExerciseResult } from '../../exercise/state/types'
export type { ExerciseResult } from '../../exercise/state/types'

export type LevelPhase = 'ready' | 'active' | 'complete'

export type LevelState = {
  phase: LevelPhase
  exercises: Exercise[]
  exerciseIndex: number
  results: ExerciseResult[]
}

export type LevelAction =
  | { type: 'START' }
  | { type: 'EXERCISE_COMPLETED'; result: ExerciseResult }
  | { type: 'RETRY'; exercises: Exercise[] }
