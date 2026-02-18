import { useCallback } from 'react'
import { Button, Container, Modal, NativeSelect, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import type { Part } from '../types'
import type { ExerciseResult } from '../exercise/state/types'
import { ModuleSelectView } from './views/ModuleSelectView'
import { Breadcrumb } from './components/Breadcrumb'
import { LevelScreen } from '../level/LevelScreen'
import { useModuleState } from './state/useModuleState'
import { useNavigation } from './state/useNavigation'

const PART_OPTIONS: { value: Part; label: string, colour: string }[] = [
  { value: 'bass', label: 'Bass', colour: 'blue' },
  { value: 'bari', label: 'Baritone', colour: 'red' },
  { value: 'lead', label: 'Lead', colour: 'green' },
  { value: 'tenor', label: 'Tenor', colour: 'yellow' },
]

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

  if (state.part == null) {
    return (
      <Modal opened withCloseButton={false} onClose={() => {}} centered title={<Title order={3}>Welcome</Title>}>
        <Text mb="md">Select your voice part to get started.</Text>
        <SimpleGrid cols={2}>
          {PART_OPTIONS.map(({ value, label, colour }) => (
            <Button key={value} variant="outline" color={colour} onClick={() => handleSetPart(value)}>
              {label}
            </Button>
          ))}
        </SimpleGrid>
      </Modal>
    )
  }

  switch (phase.type) {
    case 'module-select':
      return (
        <Container size="md" py="xl" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <NativeSelect
            label="Voice part"
            value={state.part}
            onChange={(e) => handleSetPart(e.currentTarget.value as Part)}
            data={PART_OPTIONS}
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
