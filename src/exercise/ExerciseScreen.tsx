import { useReducer, useEffect, useCallback } from 'react'
import { Container, Stack } from '@mantine/core'
import type { PerceptualParams } from 'cantor-digitalis'
import { useAudio, useVowelPlayer, usePitchDetector } from '../audio/AudioProvider'
import { midiToHz } from '../audio/cents'
import { exerciseReducer, initialPhase } from './exerciseReducer'
import { usePhaseTransitions } from './usePhaseTransitions'
import type { Exercise } from './types'
import { IdleView } from './views/IdleView'
import { MatchRootView } from './views/MatchRootView'
import { AdjustChordView } from './views/AdjustChordView'
import { ResultView } from './views/ResultView'

// Default voice template
const voice = (pitchOffset: number, overrides?: Partial<PerceptualParams>): PerceptualParams => ({
  pitch: 0,
  pitchOffset,
  vocalEffort: 0.7,
  vowelHeight: 0.95,
  vowelBackness: 0.2,
  tenseness: 0.5,
  breathiness: 0,
  roughness: 0,
  vocalTractSize: 0.3,
  isFalsetto: false,
  ...overrides,
})

// Default exercise: user sings the lead (pitchOffset 57)
// other 3 voices form the rest of the chord
const defaultConfig: Exercise = {
  referenceTone: voice(55),
  targetNote: 57,
  chordVoices: [
    voice(45),
    voice(52),
    voice(60.85, { tenseness: 0.7, isFalsetto: true }),
  ],
  matchThresholdCents: 20,
  matchSustainMs: 1000,
  adjustThresholdCents: 10,
  adjustSustainMs: 1500,
  starThresholds: [3000, 8000],
}

export function ExerciseScreen() {
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
    dispatch({ type: 'START_EXERCISE', config: defaultConfig })
  }, [getOrCreateAudioContext])

  const handleRetry = useCallback(() => {
    if (phase.type === 'result') {
      dispatch({ type: 'START_EXERCISE', config: phase.config })
    }
  }, [phase])

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return (
    <Container size="xs" py="xl" style={{ height: '100vh' }}>
      <Stack align="center" justify="center" style={{ height: '100%' }}>
        {(() => {
          switch (phase.type) {
            case 'idle':
              return <IdleView onStart={handleStart} />
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
                  onReset={handleReset}
                />
              )
          }
        })()}
      </Stack>
    </Container>
  )
}
