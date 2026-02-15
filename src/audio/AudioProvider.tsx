import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { VowelPlayer } from './VowelPlayer'
import { PitchDetector } from './PitchDetector'
import { useMedianBuffer } from '../hooks/useMedianBuffer'

type AudioState = 'uninitialized' | 'running' | 'suspended'

interface AudioContextValue {
  getOrCreateAudioContext: () => AudioContext
  state: AudioState
  vowelPlayer: VowelPlayer | null
  pitchDetector: PitchDetector | null
  getPitchDetector: () => PitchDetector | null
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const ctxRef = useRef<AudioContext | null>(null)
  const pitchDetectorRef = useRef<PitchDetector | null>(null)
  const [state, setState] = useState<AudioState>('uninitialized')
  const [vowelPlayer, setVowelPlayer] = useState<VowelPlayer | null>(null)
  const [pitchDetector, setPitchDetector] = useState<PitchDetector | null>(null)

  const getOrCreateAudioContext = useCallback(() => {
    if (ctxRef.current) {
      return ctxRef.current
    }

    const ctx = new AudioContext()
    ctxRef.current = ctx
    setVowelPlayer(new VowelPlayer(ctx))

    const detector = new PitchDetector(ctx)
    pitchDetectorRef.current = detector
    setPitchDetector(detector)

    ctx.onstatechange = () => {
      setState(ctx.state === 'closed' ? 'uninitialized' : ctx.state as AudioState)
    }

    setState(ctx.state as AudioState)
    return ctx
  }, [])

  const getPitchDetector = useCallback(() => pitchDetectorRef.current, [])

  return (
    <AudioCtx.Provider value={{ getOrCreateAudioContext, state, vowelPlayer, pitchDetector, getPitchDetector }}>
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
  const medianBuffer = useMedianBuffer(medianCount)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!pitchDetector) return () => {}
      return pitchDetector.subscribe(() => {
        const { pitch } = pitchDetector.getSnapshot()
        if (pitch !== null) {
          medianBuffer.push(pitch)
        } else {
          medianBuffer.shift()
        }
        onStoreChange()
      })
    },
    [pitchDetector, medianBuffer],
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
    medianBuffer.clear()
  }, [getPitchDetector, medianBuffer])

  return {
    isRunning: snapshot.isRunning,
    start,
    stop,
    pitch: medianBuffer.value,
  }
}
