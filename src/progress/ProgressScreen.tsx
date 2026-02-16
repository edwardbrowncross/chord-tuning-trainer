import { useReducer, useCallback } from 'react'
import { Container, Stack } from '@mantine/core'
import { allModules } from '../modules'
import { ExerciseScreen } from '../exercise/ExerciseScreen'
import { progressReducer, createInitialState } from './progressReducer'
import { ModuleSelectView } from './views/ModuleSelectView'
import { LevelCompleteView } from './views/LevelCompleteView'
import type { ExerciseResult } from './types'

export function ProgressScreen() {
  const [state, dispatch] = useReducer(
    progressReducer,
    { modules: allModules, part: 'lead' as const },
    ({ modules, part }) => createInitialState(modules, part),
  )

  const handleSelectModule = useCallback((moduleIndex: number) => {
    dispatch({ type: 'SELECT_MODULE', moduleIndex })
  }, [])

  const handleExerciseComplete = useCallback((result: ExerciseResult) => {
    dispatch({ type: 'EXERCISE_COMPLETED', result })
  }, [])

  const handleBack = useCallback(() => {
    dispatch({ type: 'BACK_TO_MODULES' })
  }, [])

  const handleNextLevel = useCallback(() => {
    dispatch({ type: 'NEXT_LEVEL' })
  }, [])

  const { phase } = state

  switch (phase.type) {
    case 'module-select':
      return (
        <Container size="xs" py="xl" style={{ height: '100vh' }}>
          <Stack align="center" justify="center" style={{ height: '100%' }}>
            <ModuleSelectView
              modules={state.modules}
              moduleScores={state.moduleScores}
              onSelect={handleSelectModule}
            />
          </Stack>
        </Container>
      )

    case 'level-active':
      return (
        <ExerciseScreen
          exercises={phase.level.exercises}
          exerciseIndex={phase.level.exerciseIndex}
          exerciseCount={phase.level.exercises.length}
          onComplete={handleExerciseComplete}
          onBack={handleBack}
        />
      )

    case 'level-complete': {
      const mod = state.modules[phase.moduleIndex]
      const hasNextLevel = phase.levelIndex + 1 < mod.levels.length
      return (
        <Container size="xs" py="xl" style={{ height: '100vh' }}>
          <Stack align="center" justify="center" style={{ height: '100%' }}>
            <LevelCompleteView
              results={phase.results}
              levelIndex={phase.levelIndex}
              hasNextLevel={hasNextLevel}
              onNextLevel={handleNextLevel}
              onBack={handleBack}
            />
          </Stack>
        </Container>
      )
    }
  }
}
