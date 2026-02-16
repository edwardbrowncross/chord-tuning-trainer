import { useReducer, useEffect, useCallback } from 'react'
import { Container, Stack } from '@mantine/core'
import { useAudio, useVowelPlayer, usePitchDetector } from '../audio/AudioProvider'
import { midiToHz } from '../audio/cents'
import { exerciseReducer, initialPhase } from './exerciseReducer'
import { usePhaseTransitions } from './usePhaseTransitions'
import type { Exercise } from './types'
import type { ExerciseResult } from '../progress/types'
import { IdleView } from './views/IdleView'
import { MatchRootView } from './views/MatchRootView'
import { AdjustChordView } from './views/AdjustChordView'
import { ResultView } from './views/ResultView'

export function ExerciseScreen({
  exercises,
  exerciseIndex,
  exerciseCount,
  onComplete,
  onBack,
}: {
  exercises: Exercise[]
  exerciseIndex: number
  exerciseCount: number
  onComplete: (result: ExerciseResult) => void
  onBack: () => void
}) {
  const config = exercises[exerciseIndex]
  const [phase, dispatch] = useReducer(exerciseReducer, initialPhase)
  const { getOrCreateAudioContext } = useAudio()
  const vowelPlayer = useVowelPlayer()
  const { pitch, start, stop } = usePitchDetector({ medianCount: 15 })

  // Phase transition detection
  usePhaseTransitions(phase, pitch, dispatch)

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

  const handleStart = useCallback(() => {
    getOrCreateAudioContext()
    dispatch({ type: 'START_EXERCISE', config })
  }, [getOrCreateAudioContext, config])

  const handleRetry = useCallback(() => {
    if (phase.type === 'result') {
      dispatch({ type: 'START_EXERCISE', config: phase.config })
    }
  }, [phase])

  const handleNext = useCallback(() => {
    if (phase.type === 'result') {
      onComplete({ stars: phase.stars, durationMs: phase.durationMs })
      dispatch({ type: 'RESET' })
    }
  }, [phase, onComplete])

  return (
    <Container size="xs" py="xl" style={{ height: '100vh' }}>
      <Stack align="center" justify="center" style={{ height: '100%' }}>
        {(() => {
          switch (phase.type) {
            case 'idle':
              return (
                <IdleView
                  onStart={handleStart}
                  exerciseIndex={exerciseIndex}
                  exerciseCount={exerciseCount}
                />
              )
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
                />
              )
            case 'result':
              return (
                <ResultView
                  stars={phase.stars}
                  durationMs={phase.durationMs}
                  onRetry={handleRetry}
                  onNext={handleNext}
                  onBack={onBack}
                  exerciseIndex={exerciseIndex}
                  exerciseCount={exerciseCount}
                />
              )
          }
        })()}
      </Stack>
    </Container>
  )
}
