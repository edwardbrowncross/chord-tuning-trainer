import { useRef, useState, useCallback } from 'react'
import { Macleod } from 'pitchfinder'
import { useMedianBuffer } from './useMedianBuffer'
import { useAudio } from '../audio/AudioProvider'

interface UsePitchOptions {
  probabilityThreshold?: number
  medianCount?: number
  bufferSize?: number
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
  } = options

  const { getOrCreateAudioContext } = useAudio()

  const [isRunning, setIsRunning] = useState(false)

  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const pitchBuffer = useMedianBuffer(medianCount)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    analyserRef.current = null
    pitchBuffer.clear()
    setIsRunning(false)
  }, [pitchBuffer])

  const start = useCallback(async () => {
    if (analyserRef.current) return

    const audioContext = getOrCreateAudioContext()
    const sampleRate = audioContext.sampleRate
    const detectPitch = Macleod({ sampleRate, bufferSize })

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = bufferSize
    source.connect(analyser)

    analyserRef.current = analyser
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
  }, [getOrCreateAudioContext, bufferSize, probabilityThreshold, pitchBuffer])

  return { isRunning, start, stop, pitch: pitchBuffer.value }
}
