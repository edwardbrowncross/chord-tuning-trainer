import { useState, useEffect } from 'react'
import { Stack, Text } from '@mantine/core'
import { centsDistance } from '../../audio/cents'
import { PitchIndicator } from './PitchIndicator'

export function AdjustChordView({
  targetHz,
  pitch,
  thresholdCents,
  startedAt,
}: {
  targetHz: number
  pitch: number | null
  thresholdCents: number
  startedAt: number
}) {
  const centsOff = pitch !== null ? centsDistance(pitch, targetHz) : null
  const isClose = centsOff !== null && Math.abs(centsOff) <= thresholdCents

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000)
    }, 100)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <Stack align="center" gap="md">
      <Text size="lg" fw={600}>Tune the chord</Text>
      <Text size="xl" fw={700} c={isClose ? 'green' : undefined}>
        {pitch !== null ? `${pitch.toFixed(1)} Hz` : 'Keep singing...'}
      </Text>
      {centsOff !== null && (
        <Text size="md" c={isClose ? 'green' : 'red'}>
          {centsOff > 0 ? '+' : ''}{centsOff.toFixed(0)} cents
        </Text>
      )}
      <PitchIndicator centsOff={centsOff} thresholdCents={thresholdCents} />
      <Text size="sm" c="dimmed">{elapsed.toFixed(1)}s</Text>
    </Stack>
  )
}
