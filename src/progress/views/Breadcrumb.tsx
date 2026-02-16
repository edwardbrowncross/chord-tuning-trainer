import { Breadcrumbs, Menu, UnstyledButton, Text, Group } from '@mantine/core'
import { IconChevronDown, IconStarFilled } from '@tabler/icons-react'
import type { LevelSpecification } from '../../modules/types'

export function Breadcrumb({
  moduleName,
  levels,
  currentLevelIndex,
  levelScores,
  onBackToModules,
  onSelectLevel,
}: {
  moduleName: string
  levels: LevelSpecification[]
  currentLevelIndex: number
  levelScores: (number | null)[]
  onBackToModules: () => void
  onSelectLevel: (levelIndex: number) => void
}) {
  return (
    <Group justify="center">
    <Breadcrumbs>
      <UnstyledButton onClick={onBackToModules}>
        <Text size="lg" c="blue">{moduleName}</Text>
      </UnstyledButton>
      <Menu position="bottom-end">
        <Menu.Target>
          <UnstyledButton>
            <Group gap={4}>
              <Text size="md">
                <strong>Level {currentLevelIndex + 1}</strong> ({levels[currentLevelIndex].voicing})
              </Text>
              <IconChevronDown size={14} />
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          {levels.map((level, i) => {
            const maxStars = (level.repeats ?? 1) * 3
            const score = levelScores[i]
            return (
              <Menu.Item
                key={i}
                onClick={() => onSelectLevel(i)}
                bg={i === currentLevelIndex ? 'var(--mantine-color-blue-light)' : undefined}
              >
                <Group justify="space-between" gap="lg">
                  <Text size="sm">
                    <strong>Level {i + 1}</strong> ({level.voicing})
                  </Text>
                  <Group gap={4}>
                    <Text size="xs" c="dimmed">
                      {score !== null ? `${score}/${maxStars}` : '—'}
                    </Text>
                    <IconStarFilled size={12} color="gold" />
                  </Group>
                </Group>
              </Menu.Item>
            )
          })}
        </Menu.Dropdown>
      </Menu>
    </Breadcrumbs>
    </Group>
  )
}
