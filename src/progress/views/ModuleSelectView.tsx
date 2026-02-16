import { Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { IconStarFilled } from '@tabler/icons-react'
import type { ModuleSpecification } from '../../modules/types'

export function ModuleSelectView({
  modules,
  moduleScores,
  onSelect,
}: {
  modules: ModuleSpecification[]
  moduleScores: (number | null)[][]
  onSelect: (moduleIndex: number) => void
}) {
  return (
    <Stack gap="lg" w="100%">
      <Title order={2} ta="center">Choose a Module</Title>
      {modules.map((mod, mi) => (
        <Card key={mi} shadow="sm" padding="md" radius="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600}>{mod.name}</Text>
              <Group gap={4}>
                <Text size="sm" fw={500}>
                  {moduleScores[mi].reduce((sum: number, s) => sum + (s ?? 0), 0)} / {mod.levels.reduce((sum, l) => sum + (l.repeats ?? 1) * 3, 0)}
                </Text>
                <IconStarFilled size={16} color="gold" />
              </Group>
            </Group>
            <Text size="sm" c="dimmed">{mod.description}</Text>
            <Text size="xs" c="dimmed">{mod.levels.length} levels</Text>
            <Button variant="light" onClick={() => onSelect(mi)}>
              Start
            </Button>
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}
