import type { LevelSpecification } from '../data/types'
import type { Part } from '../types'
import type { ExerciseResult } from '../exercise/state/types'
import { ExerciseScreen } from '../exercise/ExerciseScreen'
import { LevelReadyView } from './views/LevelReadyView'
import { LevelCompleteView } from './views/LevelCompleteView'
import { ExerciseDots } from './components/ExerciseDots'
import { useLevelState } from './state/useLevelState'

export function LevelScreen({
  levelSpec,
  part,
  chordTypeName,
  levelIndex,
  hasNextLevel,
  onLevelComplete,
  onNextLevel,
  onRetry,
  onQuit,
}: {
  levelSpec: LevelSpecification
  part: Part
  chordTypeName: string
  levelIndex: number
  hasNextLevel: boolean
  onLevelComplete: (results: ExerciseResult[]) => void
  onNextLevel: () => void
  onRetry?: () => void
  onQuit: () => void
}) {
  const {
    state,
    handleStart,
    handleExerciseComplete,
    handleRetry,
    setCurrentResult,
    dotsResults,
  } = useLevelState({ levelSpec, part, onLevelComplete })

  switch (state.phase) {
    case 'ready':
      return (
        <LevelReadyView
          chordTypeName={chordTypeName}
          chordType={levelSpec.chordType}
          voicing={levelSpec.voicing}
          part={part}
          onStart={handleStart}
        />
      )

    case 'active':
      return (
        <>
          <ExerciseScreen
            exercises={state.exercises}
            exerciseIndex={state.exerciseIndex}
            exerciseCount={state.exercises.length}
            onComplete={handleExerciseComplete}
            onChordMatched={setCurrentResult}
          />
          <ExerciseDots
            count={state.exercises.length}
            currentIndex={state.exerciseIndex}
            results={dotsResults}
          />
        </>
      )

    case 'complete':
      return (
        <LevelCompleteView
          results={state.results}
          levelIndex={levelIndex}
          hasNextLevel={hasNextLevel}
          onNextLevel={onNextLevel}
          onRetry={onRetry ?? handleRetry}
          onCompleteModule={onQuit}
          onQuit={onQuit}
        />
      )
  }
}
