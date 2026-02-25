import { useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ActionIcon, Container, Group, NativeSelect, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import type { Part } from '../types'
import type { ExerciseResult } from '../exercise/state/types'
import { ModuleSelectView } from './views/ModuleSelectView'
import { Breadcrumb } from './components/Breadcrumb'
import { SettingsModal } from './components/SettingsModal'
import { WelcomeModal } from './components/WelcomeModal'
import { LevelScreen } from '../level/LevelScreen'
import { useModuleState } from './state/useModuleState'
import { useNavigation } from './state/useNavigation'
import { useAudioSettings } from '../audio/AudioProvider'
import { IconBrandGithubFilled } from '@tabler/icons-react'

const PART_OPTIONS: { value: Part; label: string }[] = [
  { value: 'bass', label: 'Bass' },
  { value: 'bari', label: 'Baritone' },
  { value: 'lead', label: 'Lead' },
  { value: 'tenor', label: 'Tenor' },
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
  const [, setAudioSettings] = useAudioSettings()

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
      <WelcomeModal onSelectPart={(part, settings) => {
        setAudioSettings(prev => ({ ...prev, ...settings }))
        handleSetPart(part)
      }} />
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
                previousScore={state.moduleScores[moduleIndex][levelIndex]}
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
