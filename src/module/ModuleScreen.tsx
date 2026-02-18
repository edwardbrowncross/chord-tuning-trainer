import { useCallback } from 'react'
import { Container, NativeSelect, Stack } from '@mantine/core'
import type { Part } from '../types'
import type { ExerciseResult } from '../exercise/state/types'
import { ModuleSelectView } from './views/ModuleSelectView'
import { Breadcrumb } from './components/Breadcrumb'
import { LevelScreen } from '../level/LevelScreen'
import { useModuleState } from './state/useModuleState'
import { useNavigation } from './state/useNavigation'

export function ModuleScreen() {
  const {
    state,
    handleSelectModule,
    handleSelectLevel,
    handleLevelCompleted,
    handleNextLevel,
    handleBack,
    handleSetPart,
  } = useModuleState()

  useNavigation(state, { handleSelectModule, handleSelectLevel, handleBack })

  const { phase } = state

  // Derive module-active props (always computed, but only used in module-active phase)
  const moduleIndex = phase.type === 'module-active' ? phase.moduleIndex : 0
  const levelIndex = phase.type === 'module-active' ? phase.levelIndex : 0
  const mod = state.modules[moduleIndex]
  const levelSpec = mod?.levels[levelIndex]

  const onLevelComplete = useCallback((results: ExerciseResult[]) => {
    handleLevelCompleted(results, moduleIndex, levelIndex)
  }, [handleLevelCompleted, moduleIndex, levelIndex])

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

    case 'module-active':
      return (
        <Container size="xs" py="xl" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Breadcrumb
            moduleName={mod.name}
            levels={mod.levels}
            currentLevelIndex={levelIndex}
            levelScores={state.moduleScores[moduleIndex]}
            onBackToModules={handleBack}
            onSelectLevel={(li) => handleSelectLevel(moduleIndex, li)}
          />
          <LevelScreen
            key={`${moduleIndex}-${levelIndex}`}
            levelSpec={levelSpec}
            part={state.part}
            chordTypeName={mod.name}
            levelIndex={levelIndex}
            hasNextLevel={levelIndex + 1 < mod.levels.length}
            onLevelComplete={onLevelComplete}
            onNextLevel={handleNextLevel}
            onRetry={() => handleSelectLevel(moduleIndex, levelIndex)}
            onQuit={handleBack}
          />
        </Container>
      )
  }
}
