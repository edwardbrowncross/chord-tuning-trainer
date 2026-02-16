import { Button, Stack, Text, Title } from '@mantine/core'

export function IdleView({
  onStart,
  exerciseIndex,
  exerciseCount,
}: {
  onStart: () => void
  exerciseIndex: number
  exerciseCount: number
}) {
  return (
    <Stack align="center" gap="lg">
      <Title order={2}>Barbershop Tuning Trainer</Title>
      <Text c="dimmed">Match the reference tone, then tune the chord.</Text>
      <Text size="sm" c="dimmed">
        Exercise {exerciseIndex + 1} of {exerciseCount}
      </Text>
      <Button size="lg" onClick={onStart}>
        Start Exercise
      </Button>
    </Stack>
  )
}
