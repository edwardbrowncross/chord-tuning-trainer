import { Button, Divider, Modal, Slider, Switch, Text } from '@mantine/core'
import { useState } from 'react'
import { useAudioSettings } from '../../audio/AudioProvider'

const STORAGE_KEYS = ['tuning-trainer:audio-settings', 'tuning-trainer:part', 'tuning-trainer:scores']

const VOCAL_TRACT_SIZES = [
  { label: 'Bass', value: 0.22 },
  { label: 'Tenor', value: 0.28 },
  { label: 'Alto', value: 0.34 },
  { label: 'Soprano', value: 0.40 },
  { label: 'Child', value: 0.46 },
] as const

export function SettingsModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [audioSettings, setAudioSettings] = useAudioSettings()
  const [confirming, setConfirming] = useState(false)

  function handleDeleteAllData() {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
    setConfirming(false)
    onClose()
    window.location.reload()
  }

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

      <Text size="sm" c="dimmed" mt="md" mb="xs">Pitch offset (semitones)</Text>
      <Slider
        min={-4}
        max={8}
        step={1}
        value={audioSettings.pitchOffset}
        onChange={v => setAudioSettings(s => ({ ...s, pitchOffset: v }))}
        marks={[
          { value: -4, label: '-4' },
          { value: 0, label: '0' },
          { value: 4, label: '+4' },
          { value: 8, label: '+8' },
        ]}
        mb="xl"
      />

      <Text size="sm" c="dimmed" mt="md" mb="xs">Stereo effects</Text>
      <Switch
        label="Place voices in stereo"
        checked={audioSettings.stereo}
        onChange={e => setAudioSettings(s => ({ ...s, stereo: e.currentTarget.checked }))}
      />

      <Divider mt="xl" mb="md" />

      {confirming ? (
        <>
          <Text size="sm" mb="sm">This will delete all scores and settings. Are you sure?</Text>
          <Button.Group>
            <Button color="red" onClick={handleDeleteAllData}>Yes, delete everything</Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          </Button.Group>
        </>
      ) : (
        <Button color="red" variant="outline" onClick={() => setConfirming(true)}>
          Delete all data
        </Button>
      )}
    </Modal>
  )
}
