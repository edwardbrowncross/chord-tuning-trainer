import { Box, Group } from '@mantine/core'
import type { ExerciseResult } from '../state/types'

export function ExerciseDots({
  count,
  currentIndex,
  results,
}: {
  count: number
  currentIndex: number
  results: ExerciseResult[]
}) {
  return (
    <Group gap={16} justify="center">
      {Array.from({ length: count }, (_, i) => {
        const isCompleted = i < results.length
        const isCurrent = i === currentIndex
        return (
          <Box
            key={i}
            style={{
              width: isCurrent ? 24 : 16,
              height: isCurrent ? 24 : 16,
              borderRadius: '50%',
              backgroundColor: isCompleted
                ? 'var(--mantine-color-green-6)'
                : isCurrent
                  ? 'var(--mantine-color-blue-6)'
                  : 'var(--mantine-color-gray-4)',
              transition: 'all 0.2s ease',
            }}
          />
        )
      })}
    </Group>
  )
}
