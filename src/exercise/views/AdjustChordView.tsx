import { useState, useEffect } from 'react'
import { Stack, Text } from '@mantine/core'
import { centsDistance } from '../../audio/cents'
import { PitchIndicator } from './PitchIndicator'
import { CircleIndicator } from './CircleIndicator'

export function AdjustChordView({
  targetHz,
  pitch,
  thresholdCents,
  startedAt,
  sustainProgress,
  starThresholds,
}: {
  targetHz: number
  pitch: number | null
  thresholdCents: number
  startedAt: number
  sustainProgress: number
  starThresholds: [number, number]
}) {
  const centsOff = pitch !== null ? centsDistance(pitch, targetHz) : null
  const isInRange = centsOff !== null && Math.abs(centsOff) <= thresholdCents

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000)
    }, 100)
    return () => clearInterval(id)
  }, [startedAt])

  // Show detailed pitch info after the user has passed the 1-star time threshold
  // starThresholds is [3-star cutoff, 2-star cutoff], so beyond index 1 = only 1 star possible
  const pastOneStarTime = elapsed > starThresholds[1] / 1000

  return (
    <Stack align="center" gap="md">
      <Text size="lg" fw={600}>Tune the chord</Text>
      <CircleIndicator progress={sustainProgress} isInRange={isInRange} />
      <div style={{
        opacity: pastOneStarTime ? 1 : 0,
        transition: 'opacity 500ms ease',
      }}>
        <Stack align="center" gap="xs">
          <Text size="xl" fw={700} c={isInRange ? 'green' : undefined}>
            {pitch !== null ? `${pitch.toFixed(1)} Hz` : 'Keep singing...'}
          </Text>
          <PitchIndicator centsOff={centsOff} thresholdCents={thresholdCents} />
          <Text size="md" c={isInRange ? 'green' : 'red'} style={{ visibility: centsOff !== null ? 'visible' : 'hidden' }}>
            {centsOff !== null ? `${centsOff > 0 ? '+' : ''}${centsOff.toFixed(0)} cents` : '\u00A0'}
          </Text>
        </Stack>
      </div>
      <Text size="sm" c="dimmed">{elapsed.toFixed(1)}s</Text>
    </Stack>
  )
}
