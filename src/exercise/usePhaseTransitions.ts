import { useEffect, useRef, type Dispatch } from 'react'
import { centsDistance, midiToHz } from '../audio/cents'
import type { ExercisePhase, ExerciseAction } from './types'

/**
 * Bridges real-time pitch readings to discrete exercise phase transitions.
 * Dispatches ROOT_MATCHED or CHORD_LOCKED when the user sustains pitch
 * within threshold for the required duration.
 */
export function usePhaseTransitions(
  phase: ExercisePhase,
  pitch: number | null,
  dispatch: Dispatch<ExerciseAction>,
): void {
  const sustainStartRef = useRef<number | null>(null)
  const prevPhaseTypeRef = useRef(phase.type)

  useEffect(() => {
    // Reset tracking when phase changes
    if (prevPhaseTypeRef.current !== phase.type) {
      sustainStartRef.current = null
      prevPhaseTypeRef.current = phase.type
    }

    if (phase.type === 'match-root') {
      const { referenceTone, matchThresholdCents, matchSustainMs } = phase.config
      const referenceHz = midiToHz(referenceTone.pitchOffset)

      if (pitch === null) {
        sustainStartRef.current = null
        return
      }

      const distance = Math.abs(centsDistance(pitch, referenceHz))
      if (distance > matchThresholdCents) {
        sustainStartRef.current = null
        return
      }

      if (sustainStartRef.current === null) {
        sustainStartRef.current = Date.now()
        return
      }

      if (Date.now() - sustainStartRef.current >= matchSustainMs) {
        dispatch({ type: 'ROOT_MATCHED', timestamp: Date.now() })
      }
    } else if (phase.type === 'adjust-chord') {
      const { targetNote, adjustThresholdCents, adjustSustainMs } = phase.config
      const targetHz = midiToHz(targetNote)

      if (pitch === null) {
        sustainStartRef.current = null
        return
      }

      const distance = Math.abs(centsDistance(pitch, targetHz))
      if (distance > adjustThresholdCents) {
        sustainStartRef.current = null
        return
      }

      if (sustainStartRef.current === null) {
        sustainStartRef.current = Date.now()
        return
      }

      if (Date.now() - sustainStartRef.current >= adjustSustainMs) {
        dispatch({ type: 'CHORD_LOCKED', timestamp: Date.now() })
      }
    }
  }, [pitch, phase, dispatch])
}
