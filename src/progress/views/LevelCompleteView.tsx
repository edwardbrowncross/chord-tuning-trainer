import { Button, Group, Stack, Text, Title } from '@mantine/core'
import { IconStar, IconStarFilled } from '@tabler/icons-react'
import type { ExerciseResult } from '../types'

export function LevelCompleteView({
  results,
  levelIndex,
  hasNextLevel,
  onNextLevel,
  onRetry,
  onCompleteModule,
  onQuit,
}: {
  results: ExerciseResult[]
  levelIndex: number
  hasNextLevel: boolean
  onNextLevel: () => void
  onRetry: () => void
  onCompleteModule: () => void
  onQuit: () => void
}) {
  const totalStars = results.reduce((sum, r) => sum + r.stars, 0)
  const maxStars = results.length * 3
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length

  return (
    <Stack align="center" justify="center" gap="md" style={{ flex: 1 }}>
      <Title order={3}>Level {levelIndex + 1} Complete!</Title>
      <Text size="lg" fw={500}>
        {totalStars} / {maxStars} Stars
      </Text>
      <Stack gap="xs">
        {results.map((r, i) => (
          <Group key={i} gap="sm">
            <Text size="sm" w={80}>Exercise {i + 1}</Text>
            <Group gap={2}>
              {[1, 2, 3].map(s =>
                s <= r.stars
                  ? <IconStarFilled key={s} size={18} color="gold" />
                  : <IconStar key={s} size={18} color="gray" />
              )}
            </Group>
            <Text size="sm" c="dimmed">{(r.durationMs / 1000).toFixed(1)}s</Text>
          </Group>
        ))}
      </Stack>
      <Text size="sm" c="dimmed">
        Average: {(avgDuration / 1000).toFixed(1)}s
      </Text>
      <Group>
        <Button variant="outline" onClick={onQuit}>Quit</Button>
        <Button variant="outline" onClick={onRetry}>Retry</Button>
        {hasNextLevel ? (
          <Button onClick={onNextLevel}>Next Level</Button>
        ) : (
          <Button onClick={onCompleteModule}>Complete Module</Button>
        )}
      </Group>
    </Stack>
  )
}
