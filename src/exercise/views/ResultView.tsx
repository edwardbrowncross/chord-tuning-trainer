import { Button, Group, Stack, Text } from '@mantine/core'
import { IconStar, IconStarFilled } from '@tabler/icons-react'

export function ResultView({
  stars,
  durationMs,
  onRetry,
  onReset,
}: {
  stars: 1 | 2 | 3
  durationMs: number
  onRetry: () => void
  onReset: () => void
}) {
  const seconds = (durationMs / 1000).toFixed(1)
  const message = stars === 3 ? 'Perfect!' : stars === 2 ? 'Good job!' : 'Completed!'

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
      <Group>
        <Button onClick={onRetry}>Try Again</Button>
        <Button variant="outline" onClick={onReset}>Back</Button>
      </Group>
    </Stack>
  )
}
