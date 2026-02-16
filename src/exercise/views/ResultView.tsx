import { Button, Group, Stack, Text } from '@mantine/core'
import { IconStar, IconStarFilled } from '@tabler/icons-react'

export function ResultView({
  stars,
  durationMs,
  onRetry,
  onNext,
  onBack,
  exerciseIndex,
  exerciseCount,
}: {
  stars: 1 | 2 | 3
  durationMs: number
  onRetry: () => void
  onNext: () => void
  onBack: () => void
  exerciseIndex: number
  exerciseCount: number
}) {
  const seconds = (durationMs / 1000).toFixed(1)
  const message = stars === 3 ? 'Perfect!' : stars === 2 ? 'Good job!' : 'Completed!'
  const isLastExercise = exerciseIndex + 1 >= exerciseCount

  return (
    <Stack align="center" gap="md">
      <Text size="lg" fw={600}>{message}</Text>
      <Group gap={4}>
        {[1, 2, 3].map(i =>
          i <= stars
            ? <IconStarFilled key={i} size={40} color="gold" />
            : <IconStar key={i} size={40} color="gray" />
        )}
      </Group>
      <Text size="md" c="dimmed">{seconds}s</Text>
      <Text size="sm" c="dimmed">
        Exercise {exerciseIndex + 1} of {exerciseCount}
      </Text>
      <Group>
        <Button onClick={onRetry}>Try Again</Button>
        <Button onClick={onNext}>
          {isLastExercise ? 'Finish' : 'Next'}
        </Button>
        <Button variant="outline" onClick={onBack}>Back</Button>
      </Group>
    </Stack>
  )
}
