import { useReducer, useCallback } from 'react'
import { Button, Container, Stack, Text, Title } from '@mantine/core'
import { allModules } from '../modules'
import { useAudio } from '../audio/AudioProvider'
import { ExerciseScreen } from '../exercise/ExerciseScreen'
import { progressReducer, createInitialState } from './progressReducer'
import { ModuleSelectView } from './views/ModuleSelectView'
import { LevelCompleteView } from './views/LevelCompleteView'
import { Breadcrumb } from './views/Breadcrumb'
import type { ExerciseResult } from './types'

export function ProgressScreen() {
  const [state, dispatch] = useReducer(
    progressReducer,
    { modules: allModules, part: 'lead' as const },
    ({ modules, part }) => createInitialState(modules, part),
  )
  const { getOrCreateAudioContext } = useAudio()

  const handleSelectModule = useCallback((moduleIndex: number) => {
    dispatch({ type: 'SELECT_MODULE', moduleIndex })
  }, [])

  const handleSelectLevel = useCallback((moduleIndex: number, levelIndex: number) => {
    dispatch({ type: 'SELECT_MODULE', moduleIndex, levelIndex })
  }, [])

  const handleStartLevel = useCallback(() => {
    getOrCreateAudioContext()
    dispatch({ type: 'START_LEVEL' })
  }, [getOrCreateAudioContext])

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
              onSelectLevel={handleSelectLevel}
            />
          </Stack>
        </Container>
      )

    case 'level-ready':
    case 'level-active':
    case 'level-complete': {
      const mod = state.modules[phase.moduleIndex]
      return (
        <Container size="xs" py="xl" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Breadcrumb
            moduleName={mod.name}
            levels={mod.levels}
            currentLevelIndex={phase.levelIndex}
            levelScores={state.moduleScores[phase.moduleIndex]}
            onBackToModules={handleBack}
            onSelectLevel={(li) => handleSelectLevel(phase.moduleIndex, li)}
          />
          {phase.type === 'level-ready' ? (
            <Stack align="center" justify="center" style={{ flex: 1 }}>
              <Title order={2}>Ready?</Title>
              <Text c="dimmed">Match the reference tone, then tune the chord.</Text>
              <Button size="lg" onClick={handleStartLevel}>
                Start Level
              </Button>
            </Stack>
          ) : phase.type === 'level-active' ? (
            <ExerciseScreen
              key={`${phase.moduleIndex}-${phase.levelIndex}`}
              exercises={phase.level.exercises}
              exerciseIndex={phase.level.exerciseIndex}
              exerciseCount={phase.level.exercises.length}
              results={phase.level.results}
              onComplete={handleExerciseComplete}
            />
          ) : (
            <LevelCompleteView
              results={phase.results}
              levelIndex={phase.levelIndex}
              hasNextLevel={phase.levelIndex + 1 < mod.levels.length}
              onNextLevel={handleNextLevel}
              onRetry={() => handleSelectLevel(phase.moduleIndex, phase.levelIndex)}
              onCompleteModule={handleBack}
            />
          )}
        </Container>
      )
    }
  }
}
