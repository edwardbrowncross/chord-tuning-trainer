import { useState } from 'react'
import { Button, Card, Group, Modal, SimpleGrid, Stack, Text, Title, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconStarFilled } from '@tabler/icons-react'
import type { ModuleSpecification } from '../../modules/types'

export function ModuleSelectView({
  modules,
  moduleScores,
  onSelect,
  onSelectLevel,
}: {
  modules: ModuleSpecification[]
  moduleScores: (number | null)[][]
  onSelect: (moduleIndex: number) => void
  onSelectLevel: (moduleIndex: number, levelIndex: number) => void
}) {
  const [opened, { open, close }] = useDisclosure(false)
  const [modalModuleIndex, setModalModuleIndex] = useState(0)

  const openLevelModal = (mi: number) => {
    setModalModuleIndex(mi)
    open()
  }

  const modalModule = modules[modalModuleIndex]
  const modalScores = moduleScores[modalModuleIndex]

  const difficulties = ['beginner', 'intermediate', 'advanced'] as const
  const difficultyLabels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  }

  const renderModuleCard = (mod: ModuleSpecification, mi: number) => {
    const scores = moduleScores[mi]
    const continueLevel = scores.findIndex(s => s === null)
    const allCompleted = continueLevel === -1
    const someCompleted = continueLevel > 0

    return (
      <Card key={mi} shadow="sm" padding="md" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column' }}>
        <Stack gap="xs" style={{ flex: 1 }} justify="space-between">
          <Group justify="space-between">
            <Text fw={600}>{mod.name}</Text>
            <Group gap={4}>
              <Text size="sm" fw={500}>
                {scores.reduce((sum: number, s) => sum + (s ?? 0), 0)} / {mod.levels.reduce((sum, l) => sum + (l.repeats ?? 1) * 3, 0)}
              </Text>
              <IconStarFilled size={16} color={scores.some(l => l && l > 0) ? "gold" : "lightgray"} />
            </Group>
          </Group>
          <Text size="sm" c="dimmed">{mod.description}</Text>
          <Group justify="space-between" align="center">
            <UnstyledButton onClick={() => openLevelModal(mi)}>
              <Text size="xs" c="blue" td="underline" style={{ cursor: 'pointer' }}>
                {mod.levels.length} levels
              </Text>
            </UnstyledButton>
            <Group gap="xs">
              {allCompleted ? (
                <Button onClick={() => onSelectLevel(mi, 0)}>
                  Restart
                </Button>
              ) : someCompleted ? (
                <>
                  <Button variant="outline" onClick={() => onSelectLevel(mi, 0)}>
                    Restart
                  </Button>
                  <Button onClick={() => onSelectLevel(mi, continueLevel)}>
                    Continue
                  </Button>
                </>
              ) : (
                <Button onClick={() => onSelect(mi)}>
                  Start
                </Button>
              )}
            </Group>
          </Group>
        </Stack>
      </Card>
    )
  }

  return (
    <>
      <Stack gap="lg" w="100%">
        <Title order={2} ta="center">Choose a Chord</Title>
        {difficulties.map(difficulty => {
          const modulesInCategory = modules
            .map((mod, mi) => ({ mod, mi }))
            .filter(({ mod }) => mod.difficulty === difficulty)

          if (modulesInCategory.length === 0) return null

          return (
            <Stack key={difficulty} gap="sm">
              <Title order={4}>{difficultyLabels[difficulty]}</Title>
              <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="md">
                {modulesInCategory.map(({ mod, mi }) => renderModuleCard(mod, mi))}
              </SimpleGrid>
            </Stack>
          )
        })}
      </Stack>

      <Modal opened={opened} onClose={close} title={modalModule?.name} size="md">
        <Stack gap="sm">
          {modalModule?.levels.map((level, li) => {
            const maxStars = (level.repeats ?? 1) * 3
            const score = modalScores[li]
            return (
              <Group key={li} justify="space-between">
                <Group gap="sm" align="center">
                  <Text size="sm" fw={500}>Level {li + 1}</Text>
                  <Text size="sm" c="dimmed">({level.voicing})</Text>
                  <Group gap={4} align="center">
                    <Text size="xs" c="dimmed">
                      {`${score ?? 0}/${maxStars}`}
                    </Text>
                    <IconStarFilled size={12} color={score && score > 0 ? "gold" : "lightgray"} />
                  </Group>
                </Group>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    close()
                    onSelectLevel(modalModuleIndex, li)
                  }}
                >
                  {score ? "Retry" : "Start"}
                </Button>
              </Group>
            )
          })}
        </Stack>
      </Modal>
    </>
  )
}
