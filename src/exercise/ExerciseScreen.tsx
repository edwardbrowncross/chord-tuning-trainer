import { useReducer, useEffect, useCallback, useRef } from 'react'
import { Stack } from '@mantine/core'
import { useVowelPlayer, usePitchDetector } from '../audio/AudioProvider'
import { midiToHz } from '../audio/cents'
import { exerciseReducer, initialPhase } from './exerciseReducer'
import { usePhaseTransitions } from './usePhaseTransitions'
import type { Exercise } from './types'
import type { ExerciseResult } from '../progress/types'
import { MatchRootView } from './views/MatchRootView'
import { AdjustChordView } from './views/AdjustChordView'
import { ResultView } from './views/ResultView'

export function ExerciseScreen({
  exercises,
  exerciseIndex,
  exerciseCount,
  onComplete,
  onChordMatched,
}: {
  exercises: Exercise[]
  exerciseIndex: number
  exerciseCount: number
  onComplete: (result: ExerciseResult) => void
  onChordMatched?: (result: ExerciseResult | null) => void
}) {
  const config = exercises[exerciseIndex]
  const [phase, dispatch] = useReducer(exerciseReducer, initialPhase)
  const vowelPlayer = useVowelPlayer()
  const { pitch, start, stop } = usePitchDetector({ medianCount: 20 })

  // Phase transition detection
  const sustainProgress = usePhaseTransitions(phase, pitch, dispatch)

  // Auto-start: on mount and when config changes (after Next advances exerciseIndex)
  useEffect(() => {
    if (phase.type === 'idle' || phase.type === 'result') {
      dispatch({ type: 'START_EXERCISE', config })
    }
  }, [config]) // eslint-disable-line react-hooks/exhaustive-deps

  // Audio playback per phase
  useEffect(() => {
    if (!vowelPlayer) return

    switch (phase.type) {
      case 'match-root':
        vowelPlayer.play(phase.config.referenceTone, { rampTime: 0.3 })
        break
      case 'adjust-chord':
        vowelPlayer.play(phase.config.chordVoices, { rampTime: 0.5 })
        break
      case 'idle':
      case 'result':
        vowelPlayer.stop({ rampTime: 0.5 })
        break
    }
  }, [phase, vowelPlayer])

  // Stop audio on unmount (e.g. navigating away mid-exercise)
  useEffect(() => {
    return () => {
      vowelPlayer?.stop({ rampTime: 0.3 })
    }
  }, [vowelPlayer])

  // Pitch detector lifecycle
  useEffect(() => {
    if (phase.type === 'match-root') {
      start()
    } else if (phase.type === 'idle') {
      stop()
    }
  }, [phase.type, start, stop])

  // Stop pitch detector on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  // Report current result to parent for immediate dot feedback
  const onChordMatchedRef = useRef(onChordMatched)
  useEffect(() => {
    onChordMatchedRef.current = onChordMatched
  })
  useEffect(() => {
    if (phase.type === 'result') {
      onChordMatchedRef.current?.({ stars: phase.stars, durationMs: phase.durationMs })
    } else {
      onChordMatchedRef.current?.(null)
    }
  }, [phase])

  const handleRetry = useCallback(() => {
    if (phase.type === 'result') {
      dispatch({ type: 'START_EXERCISE', config: phase.config })
    }
  }, [phase])

  const handleNext = useCallback(() => {
    if (phase.type === 'result') {
      onComplete({ stars: phase.stars, durationMs: phase.durationMs })
    }
  }, [phase, onComplete])

  return (
    <>
      <Stack align="center" justify="center" style={{ flex: 1 }}>
        {(() => {
          switch (phase.type) {
            case 'idle':
              return null
            case 'match-root':
              return (
                <MatchRootView
                  targetHz={midiToHz(phase.config.referenceTone.pitchOffset)}
                  pitch={pitch}
                  thresholdCents={phase.config.matchThresholdCents}
                />
              )
            case 'adjust-chord':
              return (
                <AdjustChordView
                  targetHz={midiToHz(phase.config.targetNote)}
                  pitch={pitch}
                  thresholdCents={phase.config.adjustThresholdCents}
                  startedAt={phase.startedAt}
                  sustainProgress={sustainProgress}
                  starThresholds={phase.config.starThresholds}
                />
              )
            case 'result':
              return (
                <ResultView
                  stars={phase.stars}
                  durationMs={phase.durationMs}
                  onRetry={handleRetry}
                  onNext={handleNext}
                  exerciseIndex={exerciseIndex}
                  exerciseCount={exerciseCount}
                />
              )
          }
        })()}
      </Stack>
    </>
  )
}
