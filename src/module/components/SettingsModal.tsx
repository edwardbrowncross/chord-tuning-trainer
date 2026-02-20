import { Button, Modal, Text } from '@mantine/core'
import { useAudioSettings } from '../../audio/AudioProvider'

const VOCAL_TRACT_SIZES = [
  { label: 'Bass', value: 0.22 },
  { label: 'Tenor', value: 0.28 },
  { label: 'Alto', value: 0.34 },
  { label: 'Soprano', value: 0.40 },
  { label: 'Child', value: 0.46 },
] as const

export function SettingsModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [audioSettings, setAudioSettings] = useAudioSettings()

  return (
    <Modal opened={opened} onClose={onClose} title="Settings" centered transitionProps={{ transition: 'fade' }}>
      <Text size="sm" c="dimmed" mb="xs">Voice synthesis model</Text>
      <Button.Group>
        {VOCAL_TRACT_SIZES.map(({ label, value }) => (
          <Button
            key={label}
            variant={audioSettings.vocalTractSize === value ? 'filled' : 'outline'}
            onClick={() => setAudioSettings(s => ({ ...s, vocalTractSize: value }))}
          >
            {label}
          </Button>
        ))}
      </Button.Group>
    </Modal>
  )
}
