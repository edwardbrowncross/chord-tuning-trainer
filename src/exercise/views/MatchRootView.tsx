import { Stack, Text } from '@mantine/core'
import { centsDistance } from '../../audio/cents'
import { PitchIndicator } from './PitchIndicator'

export function MatchRootView({
  targetHz,
  pitch,
  thresholdCents,
}: {
  targetHz: number
  pitch: number | null
  thresholdCents: number
}) {
  const centsOff = pitch !== null ? centsDistance(pitch, targetHz) : null
  const isClose = centsOff !== null && Math.abs(centsOff) <= thresholdCents

  return (
    <Stack align="center" gap="md">
      <Text size="lg" fw={600}>Match this tone</Text>
      <Text size="xl" fw={700} c={isClose ? 'green' : undefined}>
        {pitch !== null ? `${pitch.toFixed(1)} Hz` : 'Sing now...'}
      </Text>
      <Text size="sm" c="dimmed">Target: {targetHz.toFixed(1)} Hz</Text>
      <PitchIndicator centsOff={centsOff} thresholdCents={thresholdCents} />
      <Text size="md" c={isClose ? 'green' : 'red'} style={{ visibility: centsOff !== null ? 'visible' : 'hidden' }}>
        {centsOff !== null ? `${centsOff > 0 ? '+' : ''}${centsOff.toFixed(0)} cents` : '\u00A0'}
      </Text>
    </Stack>
  )
}
