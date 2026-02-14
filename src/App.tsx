import { useCallback } from 'react'
import { Button, Text, Stack, Container } from '@mantine/core'
import { usePitch } from './hooks/usePitch'
import { useLastValue } from './hooks/useLastValue'

function App() {
  const { isRunning, start, stop, pitch } = usePitch({ medianCount: 5 })
  const lastPitch = useLastValue(pitch)

  const toggle = useCallback(() => {
    if (isRunning) {
      stop()
    } else {
      start()
    }
  }, [isRunning, start, stop])

  return (
    <Container size="xs" py="xl" style={{ height: '100vh' }}>
      <Stack align="center" gap="lg" style={{ height: '100%' }}>
        <Button onClick={toggle}>
          {isRunning ? 'Stop' : 'Start'} Listening
        </Button>
        <Text size="xl" fw={700}>
          {isRunning
            ? pitch != null
              ? `${pitch.toFixed(1)} Hz`
              : 'No pitch detected'
            : 'Click start to begin'}
        </Text>
        <div
          style={{
            width: 40,
            height: lastPitch != null ? `${lastPitch}px` : 0,
            backgroundColor: '#228be6',
            borderRadius: 6,
          }}
        />
      </Stack>
    </Container>
  )
}

export default App
