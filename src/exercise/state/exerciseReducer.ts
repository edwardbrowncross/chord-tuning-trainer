import type { ExercisePhase, ExerciseAction } from './types'

export const initialPhase: ExercisePhase = { type: 'idle' }

export function calculateStars(
  durationMs: number,
  thresholds: [number, number],
): 1 | 2 | 3 {
  if (durationMs <= thresholds[0]) return 3
  if (durationMs <= thresholds[1]) return 2
  return 1
}

export function exerciseReducer(
  phase: ExercisePhase,
  action: ExerciseAction,
): ExercisePhase {
  switch (action.type) {
    case 'START_EXERCISE':
      if (phase.type !== 'idle' && phase.type !== 'result') return phase
      return { type: 'match-root', config: action.config }

    case 'ROOT_MATCHED':
      if (phase.type !== 'match-root') return phase
      return {
        type: 'adjust-chord',
        config: phase.config,
        startedAt: action.timestamp,
      }

    case 'CHORD_LOCKED': {
      if (phase.type !== 'adjust-chord') return phase
      const durationMs = action.timestamp - phase.startedAt
      return {
        type: 'result',
        config: phase.config,
        durationMs,
        stars: calculateStars(durationMs, phase.config.starThresholds),
      }
    }

    case 'RESET':
      return initialPhase
  }
}
