import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LevelSpecification } from '../data/types'
import type { Part } from '../types'
import type { ExerciseResult } from '../exercise/state/types'
import { ExerciseScreen } from '../exercise/ExerciseScreen'
import { LevelReadyView } from './views/LevelReadyView'
import { LevelCompleteView } from './views/LevelCompleteView'
import { ExerciseDots } from './components/ExerciseDots'
import { useLevelState } from './state/useLevelState'

const slideTransition = {
  initial: { x: 30, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -30, opacity: 0 },
  transition: { duration: 0.15, ease: 'easeOut' as const },
}

const motionStyle = { flex: 1, display: 'flex' as const, flexDirection: 'column' as const }

export function LevelScreen({
  levelSpec,
  part,
  chordTypeName,
  levelIndex,
  hasNextLevel,
  previousScore,
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
  previousScore: number | null
  onLevelComplete: (results: ExerciseResult[]) => void
  onNextLevel: () => void
  onRetry?: () => void
  onQuit: () => void
}) {
  // Capture the score at mount time — after LEVEL_COMPLETED fires, the prop may update
  const previousScoreRef = useRef(previousScore)
  const {
    state,
    handleStart,
    handleExerciseComplete,
    handleRetry,
    setCurrentResult,
    dotsResults,
  } = useLevelState({ levelSpec, part, onLevelComplete })

  const animationKey = state.phase === 'active'
    ? `active-${state.exerciseIndex}`
    : state.phase

  const renderPhase = () => {
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
          <ExerciseScreen
            exercises={state.exercises}
            exerciseIndex={state.exerciseIndex}
            exerciseCount={state.exercises.length}
            onComplete={handleExerciseComplete}
            onChordMatched={setCurrentResult}
          />
        )

      case 'complete':
        return (
          <LevelCompleteView
            results={state.results}
            levelIndex={levelIndex}
            hasNextLevel={hasNextLevel}
            previousScore={previousScoreRef.current}
            onNextLevel={onNextLevel}
            onRetry={onRetry ?? handleRetry}
            onCompleteModule={onQuit}
            onQuit={onQuit}
          />
        )
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={animationKey} style={motionStyle} {...slideTransition}>
          {renderPhase()}
        </motion.div>
      </AnimatePresence>
      {state.phase === 'active' && (
        <ExerciseDots
          count={state.exercises.length}
          currentIndex={state.exerciseIndex}
          results={dotsResults}
        />
      )}
    </div>
  )
}
