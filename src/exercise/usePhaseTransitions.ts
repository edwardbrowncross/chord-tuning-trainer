import { useEffect, useRef, useState, type Dispatch } from 'react'
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
): number {
  const sustainProgressRef = useRef(0)
  const lastTickRef = useRef<number | null>(null)
  const prevPhaseTypeRef = useRef(phase.type)
  const [sustainFraction, setSustainFraction] = useState(0)

  useEffect(() => {
    // Reset tracking when phase changes
    if (prevPhaseTypeRef.current !== phase.type) {
      sustainProgressRef.current = 0
      lastTickRef.current = null
      prevPhaseTypeRef.current = phase.type
    }

    const now = Date.now()
    const delta = lastTickRef.current !== null ? now - lastTickRef.current : 0
    lastTickRef.current = now

    if (phase.type === 'match-root') {
      const { referenceTone, matchThresholdCents, matchSustainMs } = phase.config
      const referenceHz = midiToHz(referenceTone.pitchOffset)

      const absCents = pitch !== null
        ? Math.abs(centsDistance(pitch, referenceHz))
        : Infinity
      const inRange = absCents <= matchThresholdCents

      if (inRange) {
        const speed = 2 * (1 - absCents / matchThresholdCents)
        sustainProgressRef.current += delta * speed
      } else {
        const decayRate = Math.min(1, (absCents - matchThresholdCents) / matchThresholdCents)
        sustainProgressRef.current = Math.max(0, sustainProgressRef.current - delta * decayRate)
      }

      if (sustainProgressRef.current >= matchSustainMs) {
        dispatch({ type: 'ROOT_MATCHED', timestamp: now })
      }

      setSustainFraction(Math.min(1, Math.max(0, sustainProgressRef.current / matchSustainMs)))
    } else if (phase.type === 'adjust-chord') {
      const { targetNote, adjustThresholdCents, adjustSustainMs } = phase.config
      const targetHz = midiToHz(targetNote)

      const absCents = pitch !== null
        ? Math.abs(centsDistance(pitch, targetHz))
        : Infinity
      const inRange = absCents <= adjustThresholdCents

      if (inRange) {
        const speed = 2 * (1 - absCents / adjustThresholdCents)
        sustainProgressRef.current += delta * speed
      } else {
        const decayRate = Math.min(1, (absCents - adjustThresholdCents) / adjustThresholdCents)
        sustainProgressRef.current = Math.max(0, sustainProgressRef.current - delta * decayRate)
      }

      if (sustainProgressRef.current >= adjustSustainMs) {
        dispatch({ type: 'CHORD_LOCKED', timestamp: now })
      }

      setSustainFraction(Math.min(1, Math.max(0, sustainProgressRef.current / adjustSustainMs)))
    } else {
      setSustainFraction(0)
    }
  }, [pitch, phase, dispatch])

  return sustainFraction
}
