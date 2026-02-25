import { useCallback, useState } from 'react'
import { Anchor, Button, Group, Modal, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { IconHeadphones, IconLeaf } from '@tabler/icons-react'
import type { Part } from '../../types'
import type { AudioSettings } from '../../audio/AudioProvider'
import { trackEvent } from '../../analytics'

type VoiceType = 'mens' | 'womens'

function getWelcomeSettings(part: Part, voiceType: VoiceType): Partial<AudioSettings> {
  const isMens = voiceType === 'mens'
  const isHighPart = part === 'lead' || part === 'tenor'
  return {
    pitchOffset: isMens ? 0 : 8,
    vocalTractSize: isMens
      ? (isHighPart ? 0.28 : 0.22)   // tenor or bass
      : (isHighPart ? 0.40 : 0.34),  // soprano or alto
  }
}

const PART_OPTIONS: { value: Part; label: string; colour: string }[] = [
  { value: 'bass', label: 'Bass', colour: 'blue' },
  { value: 'bari', label: 'Baritone', colour: 'red' },
  { value: 'lead', label: 'Lead', colour: 'green' },
  { value: 'tenor', label: 'Tenor', colour: 'yellow' },
]

interface WelcomeModalProps {
  onSelectPart: (part: Part, settings: Partial<AudioSettings>) => void
}

export function WelcomeModal({ onSelectPart }: WelcomeModalProps) {
  const [voiceType, setVoiceType] = useState<VoiceType>('mens')

  const handleSelectPart = useCallback((part: Part) => {
    trackEvent(`welcome/part-selected/${voiceType}/${part}`)
    onSelectPart(part, getWelcomeSettings(part, voiceType))
  }, [voiceType, onSelectPart])

  return (
    <Modal opened withCloseButton={false} onClose={() => { }} centered title={<Title order={3}>Welcome to Tuning Training</Title>}>
      <Stack gap={6} mb="xl">
        <Text>You will need:</Text>
        <Group gap={6} ml="md">
          <IconHeadphones size={16} color='grey' />
          <Text size="sm">Headphones</Text>
        </Group>
        <Group gap={6} ml="md">
          <IconLeaf size={16} color='grey' />
          <Text size="sm">A quiet space</Text>
        </Group>
      </Stack>
      <Text mb="md">Select your voice part to get started.</Text>
      <SimpleGrid cols={2}>
        {PART_OPTIONS.map(({ value, label, colour }) => (
          <Button key={value} variant="outline" color={colour} onClick={() => handleSelectPart(value)}>
            {label}
          </Button>
        ))}
      </SimpleGrid>
      <Text size="xs" c="dimmed" ta="center" mt="md">
        Singing <Text span td="underline">{voiceType === 'mens' ? "men's" : "women's"}</Text> barbershop{' '}
        <Anchor
          size="xs"
          onClick={() => setVoiceType(v => v === 'mens' ? 'womens' : 'mens')}
          style={{ cursor: 'pointer' }}
        >
          (change)
        </Anchor>
      </Text>
    </Modal>
  )
}
