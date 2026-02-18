import { useMemo, useState } from 'react'
import { Container, NativeSelect, Stack } from '@mantine/core'
import { useAudio } from '../audio/AudioProvider'
import type { Part } from '../types'
import type { ExerciseResult } from './state/types'
import { ExerciseScreen } from '../exercise/ExerciseScreen'
import { ModuleSelectView } from './views/ModuleSelectView'
import { LevelCompleteView } from './views/LevelCompleteView'
import { Breadcrumb } from './components/Breadcrumb'
import { LevelReadyView } from './views/LevelReadyView'
import { ExerciseDots } from './components/ExerciseDots'
import { useProgressState } from './state/useProgressState'

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
  const [currentResult, setCurrentResult] = useState<ExerciseResult | null>(null)

  const handleStartLevel = () => {
    getOrCreateAudioContext()
    startLevel()
  }

  const { phase } = state
  const dotsResults = useMemo(() => {
    const levelResults = phase.type === 'level-active' ? phase.level.results : []
    return currentResult ? [...levelResults, currentResult] : levelResults
  }, [phase, currentResult])

  switch (phase.type) {
    case 'module-select':
      return (
        <Container size="md" py="xl" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
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
            <LevelReadyView
              chordTypeName={mod.name}
              chordType={mod.levels[phase.levelIndex].chordType}
              voicing={mod.levels[phase.levelIndex].voicing}
              part={state.part}
              onStart={handleStartLevel}
            />
          ) : phase.type === 'level-active' ? (
            <>
              <ExerciseScreen
                key={`${phase.moduleIndex}-${phase.levelIndex}`}
                exercises={phase.level.exercises}
                exerciseIndex={phase.level.exerciseIndex}
                exerciseCount={phase.level.exercises.length}
                onComplete={handleExerciseComplete}
                onChordMatched={setCurrentResult}
              />
              <ExerciseDots
                count={phase.level.exercises.length}
                currentIndex={phase.level.exerciseIndex}
                results={dotsResults}
              />
            </>
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
