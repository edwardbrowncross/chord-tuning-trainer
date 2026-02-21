import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Group, Stack, Text, Title } from '@mantine/core'
import { useAudio, useAudioSettings } from '../../audio/AudioProvider'
import { getMidiChord } from '../../audio/intervals'
import { makeVoice } from '../../audio/makeVoice'
import { getPan } from '../../audio/panning'
import { PART_INDEX } from '../../exercise/state/exerciseGenerator'
import type { ChordType } from '../../audio/intervals'
import type { Part } from '../../types'
import { IconVolume } from '@tabler/icons-react'
import { motion } from 'framer-motion'

const TONE_NAMES: Record<string, string> = {
  '1': 'root',
  '3': 'third',
  '5': 'fifth',
  '7': 'seventh',
  '9': 'ninth',
}

const PREVIEW_ROOT = 48 // C3
const VOICE_STAGGER_MS = 500
const VOICE_RAMP_TIME = 0.1
const STOP_RAMP_TIME = 0.1

interface LevelReadyViewProps {
  chordTypeName: string
  chordType: ChordType
  voicing: string
  part: Part
  onStart: () => void
}

export function LevelReadyView({ chordTypeName, chordType, voicing, part, onStart }: LevelReadyViewProps) {
  const tone = voicing[PART_INDEX[part]]
  const toneName = TONE_NAMES[tone] ?? tone

  const { getOrCreateAudioContext, getVowelPlayer } = useAudio()
  const [audioSettings] = useAudioSettings()
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeVoices, setActiveVoices] = useState<Set<number>>(new Set())
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const stopPlayback = useCallback(() => {
    for (const id of timeoutsRef.current) clearTimeout(id)
    timeoutsRef.current = []
    getVowelPlayer()?.stop({ rampTime: STOP_RAMP_TIME })
    setIsPlaying(false)
    setActiveVoices(new Set())
  }, [getVowelPlayer])

  useEffect(() => {
    return () => {
      for (const id of timeoutsRef.current) clearTimeout(id)
      timeoutsRef.current = []
      getVowelPlayer()?.stop({ rampTime: 0.015 })
    }
  }, [getVowelPlayer])

  const handleListen = () => {
    getOrCreateAudioContext()
    const player = getVowelPlayer()
    if (!player) return

    stopPlayback()

    const chordNotes = getMidiChord(PREVIEW_ROOT, chordType, voicing)
    const partIdx = PART_INDEX[part]

    // Build voices with the user's part last and slightly louder
    // Track the original voicing index so we can animate the right digit
    const partsByIndex: Part[] = ['bass', 'bari', 'lead', 'tenor']
    const order = [
      ...chordNotes.flatMap((midi, i) => i !== partIdx ? [{ midi, isUserPart: false, voicingIdx: i }] : []),
      { midi: chordNotes[partIdx], isUserPart: true, voicingIdx: partIdx },
    ]

    setIsPlaying(true)
    setActiveVoices(new Set())
    for (let i = 0; i < order.length; i++) {
      const { midi, isUserPart, voicingIdx } = order[i]
      const pan = (isUserPart || !audioSettings.stereo) ? 0 : getPan(part, partsByIndex[voicingIdx])
      const voice = {
        ...makeVoice(midi, isUserPart
          ? { vocalEffort: part === 'tenor' ? 0.8 : 0.7, vocalTractSize: audioSettings.vocalTractSize }
          : { vocalTractSize: audioSettings.vocalTractSize }),
        pan,
      }
      const id = setTimeout(() => {
        player.addVoices(voice, { rampTime: VOICE_RAMP_TIME, totalVoiceCount: 4 })
        setActiveVoices(prev => new Set(prev).add(voicingIdx))
      }, i * VOICE_STAGGER_MS)
      timeoutsRef.current.push(id)
    }
  }

  return (
    <Stack align="center" justify="center" style={{ flex: 1 }}>
      <Title order={2}>Ready?</Title>
      <Text c="blue" ta="center">
        You'll be singing a <strong>{chordTypeName}</strong> chord in{' '}
        <strong>
          {voicing.split('').map((digit, i) => (
            <motion.span
              key={`${voicing}-${i}-${activeVoices.has(i)}`}
              initial={activeVoices.has(i) ? { scale: 1.2, y: -2, color: '#1971c2' } : false}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              style={{
                display: 'inline-block',
                width: '0.6em',
                textAlign: 'center',
                fontWeight: activeVoices.has(i) ? 800 : undefined,
                textDecoration: activeVoices.has(i) && PART_INDEX[part] === i ? 'underline' : undefined,
              }}
            >
              {digit}
            </motion.span>
          ))}
        </strong>{' '}
        voicing.
      </Text>
      <Group>
        <Text c="blue" ta="center">
          Your target note will be the <strong>{toneName}</strong>.
        </Text>
        <Button size="xs" variant="outline" leftSection={<IconVolume size={18} />}onClick={isPlaying ? stopPlayback : handleListen} style={{ width: 90 }}>
          {isPlaying ? 'Stop' : 'Listen'}
        </Button>
      </Group>
      <Text c="dimmed" ta="center">First, you'll match the reference tone, then you'll adjust to tune to the chord.</Text>
      <Group>
        <Button size="lg" onClick={onStart}>
          Start Level
        </Button>
      </Group>
    </Stack>
  )
}
