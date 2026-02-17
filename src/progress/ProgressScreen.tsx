import { Button, Container, NativeSelect, Stack, Text, Title } from '@mantine/core'
import { useAudio } from '../audio/AudioProvider'
import type { Part } from '../exercise/types'
import { ExerciseScreen } from '../exercise/ExerciseScreen'
import { ModuleSelectView } from './views/ModuleSelectView'
import { LevelCompleteView } from './views/LevelCompleteView'
import { Breadcrumb } from './views/Breadcrumb'
import { useProgressState } from './useProgressState'

export function ProgressScreen() {
  const {
    state,
    handleSelectModule,
    handleSelectLevel,
    handleStartLevel: startLevel,
    handleExerciseComplete,
    handleBack,
    handleNextLevel,
    handleSetPart,
  } = useProgressState()
  const { getOrCreateAudioContext } = useAudio()

  const handleStartLevel = () => {
    getOrCreateAudioContext()
    startLevel()
  }

  const { phase } = state

  switch (phase.type) {
    case 'module-select':
      return (
        <Container size="xs" py="xl" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <NativeSelect
            label="Voice part"
            value={state.part}
            onChange={(e) => handleSetPart(e.currentTarget.value as Part)}
            data={[
              { value: 'bass', label: 'Bass' },
              { value: 'bari', label: 'Baritone' },
              { value: 'lead', label: 'Lead' },
              { value: 'tenor', label: 'Tenor' },
            ]}
            style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8 }}
          />
          <Stack align="center" justify="center" style={{ flex: 1 }}>
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
              onQuit={handleBack}
            />
          )}
        </Container>
      )
    }
  }
}
