import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { VowelPlayer } from './VowelPlayer'
import { PitchDetector } from './PitchDetector'
import { useMedianBuffer } from '../hooks/useMedianBuffer'
import { loadAudioSettings, saveAudioSettings } from './audioSettingsStorage'

type AudioState = 'uninitialized' | 'running' | 'suspended'

export interface AudioSettings {
  vocalTractSize: number
  stereo: boolean
  pitchOffset: number
}

interface AudioContextValue {
  getOrCreateAudioContext: () => AudioContext
  state: AudioState
  vowelPlayer: VowelPlayer | null
  getVowelPlayer: () => VowelPlayer | null
  pitchDetector: PitchDetector | null
  getPitchDetector: () => PitchDetector | null
  audioSettings: AudioSettings
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const ctxRef = useRef<AudioContext | null>(null)
  const vowelPlayerRef = useRef<VowelPlayer | null>(null)
  const pitchDetectorRef = useRef<PitchDetector | null>(null)
  const [state, setState] = useState<AudioState>('uninitialized')
  const [vowelPlayer, setVowelPlayer] = useState<VowelPlayer | null>(null)
  const [pitchDetector, setPitchDetector] = useState<PitchDetector | null>(null)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings)

  useEffect(() => {
    saveAudioSettings(audioSettings)
  }, [audioSettings])

  const getOrCreateAudioContext = useCallback(() => {
    if (ctxRef.current) {
      return ctxRef.current
    }

    if ('audioSession' in navigator) {
      (navigator.audioSession as { type: string }).type = 'play-and-record'
    }

    const ctx = new AudioContext()
    ctxRef.current = ctx
    const player = new VowelPlayer(ctx)
    vowelPlayerRef.current = player
    setVowelPlayer(player)

    const detector = new PitchDetector(ctx)
    pitchDetectorRef.current = detector
    setPitchDetector(detector)

    ctx.onstatechange = () => {
      setState(ctx.state === 'closed' ? 'uninitialized' : ctx.state as AudioState)
    }

    setState(ctx.state as AudioState)
    return ctx
  }, [])

  const getVowelPlayer = useCallback(() => vowelPlayerRef.current, [])
  const getPitchDetector = useCallback(() => pitchDetectorRef.current, [])

  return (
    <AudioCtx.Provider value={{ getOrCreateAudioContext, state, vowelPlayer, getVowelPlayer, pitchDetector, getPitchDetector, audioSettings, setAudioSettings }}>
      {children}
    </AudioCtx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAudio(): AudioContextValue {
  const value = useContext(AudioCtx)
  if (!value) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return value
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAudioSettings(): [AudioSettings, React.Dispatch<React.SetStateAction<AudioSettings>>] {
  const { audioSettings, setAudioSettings } = useAudio()
  return [audioSettings, setAudioSettings]
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVowelPlayer(): VowelPlayer | null {
  return useAudio().vowelPlayer
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePitchDetector(options?: { medianCount?: number }): {
  isRunning: boolean
  start: () => Promise<void>
  stop: () => void
  pitch: number | null
} {
  const { getOrCreateAudioContext, pitchDetector, getPitchDetector } = useAudio()
  const medianCount = options?.medianCount ?? 1
  const { value: medianValue, push: medianPush, shift: medianShift, clear: medianClear } = useMedianBuffer(medianCount)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!pitchDetector) return () => {}
      return pitchDetector.subscribe(() => {
        const { pitch } = pitchDetector.getSnapshot()
        if (pitch !== null) {
          medianPush(pitch)
        } else {
          medianShift()
        }
        onStoreChange()
      })
    },
    [pitchDetector, medianPush, medianShift],
  )
  const defaultSnapshot = useMemo(() => ({ isRunning: false, pitch: null }), [])

  const snapshot = useSyncExternalStore(
    subscribe,
    pitchDetector?.getSnapshot ?? (() => defaultSnapshot),
  )

  const start = useCallback(async () => {
    getOrCreateAudioContext()
    const detector = getPitchDetector()
    if (detector) {
      await detector.start()
    }
  }, [getOrCreateAudioContext, getPitchDetector])

  const stop = useCallback(() => {
    getPitchDetector()?.stop()
    medianClear()
  }, [getPitchDetector, medianClear])

  return {
    isRunning: snapshot.isRunning,
    start,
    stop,
    pitch: medianValue,
  }
}
