import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type AudioState = 'uninitialized' | 'running' | 'suspended'

interface AudioContextValue {
  getOrCreateAudioContext: () => AudioContext
  state: AudioState
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const ctxRef = useRef<AudioContext | null>(null)
  const [state, setState] = useState<AudioState>('uninitialized')

  const getOrCreateAudioContext = useCallback(() => {
    if (ctxRef.current) {
      return ctxRef.current
    }

    const ctx = new AudioContext()
    ctxRef.current = ctx

    ctx.onstatechange = () => {
      setState(ctx.state === 'closed' ? 'uninitialized' : ctx.state as AudioState)
    }

    setState(ctx.state as AudioState)
    return ctx
  }, [])

  return (
    <AudioCtx.Provider value={{ getOrCreateAudioContext, state }}>
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
