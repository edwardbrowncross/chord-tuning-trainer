import { useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ActionIcon, Button, Container, Group, Modal, NativeSelect, SimpleGrid, Stack, Text, Title, Tooltip, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import type { Part } from '../types'
import type { ExerciseResult } from '../exercise/state/types'
import { ModuleSelectView } from './views/ModuleSelectView'
import { Breadcrumb } from './components/Breadcrumb'
import { SettingsModal } from './components/SettingsModal'
import { LevelScreen } from '../level/LevelScreen'
import { useModuleState } from './state/useModuleState'
import { useNavigation } from './state/useNavigation'
import { IconBrandGithubFilled } from '@tabler/icons-react'

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
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false)

  useNavigation(state, { handleSelectModule, handleSelectLevel, handleBack })

  const { phase } = state

  // Derive module-active props (always computed, but only used in module-active phase)
  const moduleIndex = phase.type === 'module-active' ? phase.moduleIndex : 0
  const levelIndex = phase.type === 'module-active' ? phase.levelIndex : 0
  const retryCount = phase.type === 'module-active' ? phase.retryCount : 0
  const mod = state.modules[moduleIndex]
  const levelSpec = mod?.levels[levelIndex]

  const onLevelComplete = useCallback((results: ExerciseResult[]) => {
    handleLevelCompleted(results, moduleIndex, levelIndex)
  }, [handleLevelCompleted, moduleIndex, levelIndex])

  if (state.part == null) {
    return (
      <Modal opened withCloseButton={false} onClose={() => { }} centered title={<Title order={3}>Welcome</Title>}>
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
          <Group justify="space-between" w="100%" mb="xl">
            <Tooltip label="View source on GitHub" withArrow position="right">
              <ActionIcon
                component="a"
                href="https://github.com/edwardbrowncross/chord-tuning-trainer"
                target="_blank"
                variant="filled"
                color="dark"
                size="lg"
                aria-label="View source on GitHub"
                radius="xl"
              >
                <IconBrandGithubFilled size={22} />
              </ActionIcon>
            </Tooltip>
            <NativeSelect
              label="Voice part"
              value={state.part}
              onChange={(e) => handleSetPart(e.currentTarget.value as Part)}
              data={PART_OPTIONS}
              style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8 }}
            />
          </Group>
          <Stack align="center" justify="center" style={{ flex: 1 }}>
            <ModuleSelectView
              modules={state.modules}
              moduleScores={state.moduleScores}
              onSelect={handleSelectModule}
              onSelectLevel={handleSelectLevel}
            />
          </Stack>
          <Text ta="center" py="sm">
            <UnstyledButton onClick={openSettings}>
              <Text size="sm" c="dimmed" td="underline" style={{ cursor: 'pointer' }}>Settings</Text>
            </UnstyledButton>
          </Text>
          <SettingsModal opened={settingsOpened} onClose={closeSettings} />
        </Container>
      )

    case 'module-active':
      return (
        <Container size="xs" py="xl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Breadcrumb
            moduleName={mod.name}
            levels={mod.levels}
            currentLevelIndex={levelIndex}
            levelScores={state.moduleScores[moduleIndex]}
            onBackToModules={handleBack}
            onSelectLevel={(li) => handleSelectLevel(moduleIndex, li)}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={`${moduleIndex}-${levelIndex}-${retryCount}`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <LevelScreen
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
            </motion.div>
          </AnimatePresence>
        </Container>
      )
  }
}
