import { Button, Group, Modal, Stack, Text } from '@mantine/core'
import { IconStarFilled } from '@tabler/icons-react'
import type { ModuleSpecification } from '../../data/types'

export function LevelSelectModal({
  opened,
  onClose,
  module: mod,
  scores,
  onSelectLevel,
}: {
  opened: boolean
  onClose: () => void
  module: ModuleSpecification | undefined
  scores: (number | null)[]
  onSelectLevel: (levelIndex: number) => void
}) {
  return (
    <Modal opened={opened} onClose={onClose} title={mod?.name} size="md">
      <Stack gap="sm">
        {mod?.levels.map((level, li) => {
          const maxStars = (level.repeats ?? 1) * 3
          const score = scores[li]
          return (
            <Group key={li} justify="space-between">
              <Group gap="sm" align="center">
                <Text size="sm" fw={500}>Level {li + 1}</Text>
                <Text size="sm" c="dimmed">({level.voicing})</Text>
                <Group gap={4} align="center">
                  <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center' }}>
                    {Array.from({ length: maxStars }, (_, i) => maxStars - 1 - i).map(i => (
                      <IconStarFilled key={i} size={12} color={i < (score ?? 0) ? "gold" : "lightgray"} style={{ marginLeft: i === 0 ? 0 : -6, filter: i < (score ?? 0) ? 'drop-shadow(0 0 0px rgba(0,0,0,0.9))' : undefined }} />
                    ))}
                  </div>
                  <Text size="xs" c="dimmed">{score ?? 0}/{maxStars}</Text>
                </Group>
              </Group>
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  onClose()
                  onSelectLevel(li)
                }}
              >
                {score ? "Retry" : "Start"}
              </Button>
            </Group>
          )
        })}
      </Stack>
    </Modal>
  )
}
