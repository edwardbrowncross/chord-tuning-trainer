import { useReducer, useEffect, useCallback, useMemo } from 'react'
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
import { ExerciseDots } from './views/ExerciseDots'

export function ExerciseScreen({
  exercises,
  exerciseIndex,
  exerciseCount,
  results,
  onComplete,
}: {
  exercises: Exercise[]
  exerciseIndex: number
  exerciseCount: number
  results: ExerciseResult[]
  onComplete: (result: ExerciseResult) => void
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

  // Pitch detector lifecycle
  useEffect(() => {
    if (phase.type === 'match-root') {
      start()
    } else if (phase.type === 'idle') {
      stop()
    }
  }, [phase.type, start, stop])

  const dotsResults = useMemo(() => {
    if (phase.type === 'result') {
      return [...results, { stars: phase.stars, durationMs: phase.durationMs }]
    }
    return results
  }, [phase, results])

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
      <ExerciseDots
        count={exerciseCount}
        currentIndex={exerciseIndex}
        results={dotsResults}
      />
    </>
  )
}
