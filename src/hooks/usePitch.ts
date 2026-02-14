import { useRef, useState, useCallback } from 'react'
import { Macleod } from 'pitchfinder'
import { useMedianBuffer } from './useMedianBuffer'

interface UsePitchOptions {
  probabilityThreshold?: number
  medianCount?: number
  bufferSize?: number
  sampleRate?: number
}

interface UsePitchReturn {
  isRunning: boolean
  start: () => Promise<void>
  stop: () => void
  pitch: number | null
}

export function usePitch(options: UsePitchOptions = {}): UsePitchReturn {
  const {
    probabilityThreshold = 0.3,
    medianCount = 1,
    bufferSize = 1024,
    sampleRate = 44100,
  } = options

  const [isRunning, setIsRunning] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const pitchBuffer = useMedianBuffer(medianCount)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioContextRef.current?.close()
    audioContextRef.current = null
    streamRef.current = null
    pitchBuffer.clear()
    setIsRunning(false)
  }, [pitchBuffer])

  const start = useCallback(async () => {
    if (audioContextRef.current) return

    const detectPitch = Macleod({ sampleRate, bufferSize })

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const audioContext = new AudioContext({ sampleRate })
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = bufferSize
    source.connect(analyser)

    audioContextRef.current = audioContext
    streamRef.current = stream
    pitchBuffer.clear()
    setIsRunning(true)

    const buffer = new Float32Array(analyser.fftSize)

    const loop = () => {
      analyser.getFloatTimeDomainData(buffer)
      const result = detectPitch(buffer)

      if (result.probability > probabilityThreshold && result.freq < 1e3 && result.freq > 20) {
        pitchBuffer.push(result.freq)
      } else {
        pitchBuffer.shift()
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    loop()
  }, [sampleRate, bufferSize, probabilityThreshold, pitchBuffer])

  return { isRunning, start, stop, pitch: pitchBuffer.value }
}
