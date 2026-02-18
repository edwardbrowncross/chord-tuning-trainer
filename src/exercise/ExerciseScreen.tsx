import { Stack } from '@mantine/core'
import { midiToHz } from '../audio/cents'
import { useExerciseState } from './state/useExerciseState'
import type { Exercise, ExerciseResult } from './state/types'
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
  const { phase, pitch, sustainProgress, handleRetry, handleNext } =
    useExerciseState(exercises, exerciseIndex, onComplete, onChordMatched)

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
