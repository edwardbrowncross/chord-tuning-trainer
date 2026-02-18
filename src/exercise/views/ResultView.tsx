import { Button, Group, Stack, Text } from '@mantine/core'
import { motion, AnimatePresence } from 'framer-motion'
import { StarReveal } from '../components/StarReveal'

export function ResultView({
  stars,
  durationMs,
  onRetry,
  onNext,
  exerciseIndex,
  exerciseCount,
}: {
  stars: 1 | 2 | 3
  durationMs: number
  onRetry: () => void
  onNext: () => void
  exerciseIndex: number
  exerciseCount: number
}) {
  const seconds = (durationMs / 1000).toFixed(1)
  const message = stars === 3 ? 'Perfect!' : stars === 2 ? 'Great!' : 'Completed!'
  const isLastExercise = exerciseIndex + 1 >= exerciseCount

  return (
    <Stack align="center" gap="md">
      <AnimatePresence>
        <motion.div
          key="message"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Text size="lg" fw={600}>{message}</Text>
        </motion.div>
      </AnimatePresence>
      <StarReveal stars={stars} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 + stars * 0.2 + 0.2, duration: 0.3 }}
      >
        <Text size="md" c="dimmed">{seconds}s</Text>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 + stars * 0.2 + 0.3, duration: 0.3 }}
      >
        <Group>
          <Button variant="outline" onClick={onRetry}>Retry</Button>
          <Button onClick={onNext}>
            {isLastExercise ? 'Finish' : 'Next'}
          </Button>
        </Group>
      </motion.div>
    </Stack>
  )
}
