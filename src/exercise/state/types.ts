import type { PerceptualParams } from 'cantor-digitalis'

export type ExerciseResult = { stars: 1 | 2 | 3; durationMs: number; meanOffsetCents: number }

// --- Exercise Configuration ---
// A single exercise config, with all parameters fully specified, to be delivered to the user
export type Exercise = {
  /** Single voice for match-root playback (the note the user will sing) */
  referenceTone: PerceptualParams
  /** MIDI note number for the user's destination pitch in the chord */
  targetNote: number
  /** The other 3 chord voices (played during adjust-chord) */
  chordVoices: PerceptualParams[]
  /** How close (cents) the user must be to pass match-root */
  matchThresholdCents: number
  /** How long (ms) the user must sustain within threshold for match-root */
  matchSustainMs: number
  /** How close (cents) the user must be to pass adjust-chord */
  adjustThresholdCents: number
  /** How long (ms) the user must sustain within threshold for adjust-chord */
  adjustSustainMs: number
  /** Star rating time thresholds in ms: [3-star cutoff, 2-star cutoff] */
  starThresholds: [number, number]
}

// --- Phases of a single exercise (discriminated union) ---

export type IdlePhase = {
  type: 'idle'
}

export type MatchRootPhase = {
  type: 'match-root'
  config: Exercise
}

export type AdjustChordPhase = {
  type: 'adjust-chord'
  config: Exercise
  startedAt: number
}

export type ResultPhase = {
  type: 'result'
  config: Exercise
  durationMs: number
  stars: 1 | 2 | 3
  meanOffsetCents: number
}

export type ExercisePhase =
  | IdlePhase
  | MatchRootPhase
  | AdjustChordPhase
  | ResultPhase

// --- Actions ---

export type ExerciseAction =
  | { type: 'START_EXERCISE'; config: Exercise }
  | { type: 'ROOT_MATCHED'; timestamp: number }
  | { type: 'CHORD_LOCKED'; timestamp: number; meanOffsetCents: number }
  | { type: 'RESET' }
