import { Button, Stack, Text, Title } from '@mantine/core'

export function IdleView({
  onStart,
}: {
  onStart: () => void
}) {
  return (
    <Stack align="center" gap="lg">
      <Title order={2}>Barbershop Tuning Trainer</Title>
      <Text c="dimmed">Match the reference tone, then tune the chord.</Text>
      <Button size="lg" onClick={onStart}>
        Start Exercise
      </Button>
    </Stack>
  )
}
