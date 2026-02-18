import { Macleod } from 'pitchfinder'

export interface PitchDetectorOptions {
  probabilityThreshold?: number
  bufferSize?: number
}

export interface PitchDetectorSnapshot {
  isRunning: boolean
  pitch: number | null
}

const initialSnapshot: PitchDetectorSnapshot = { isRunning: false, pitch: null }

export class PitchDetector {
  private readonly ctx: AudioContext
  private readonly probabilityThreshold: number
  private readonly bufferSize: number

  private snapshot: PitchDetectorSnapshot = initialSnapshot
  private listeners = new Set<() => void>()

  private rafId = 0
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null

  constructor(ctx: AudioContext, options: PitchDetectorOptions = {}) {
    this.ctx = ctx
    this.probabilityThreshold = options.probabilityThreshold ?? 0.3
    this.bufferSize = options.bufferSize ?? 1024
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): PitchDetectorSnapshot => {
    return this.snapshot
  }

  async start(): Promise<void> {
    if (this.analyser) return

    const detectPitch = Macleod({
      sampleRate: this.ctx.sampleRate,
      bufferSize: this.bufferSize,
    })

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false },
    })
    const source = this.ctx.createMediaStreamSource(stream)
    const analyser = this.ctx.createAnalyser()
    analyser.fftSize = this.bufferSize
    source.connect(analyser)

    this.analyser = analyser
    this.stream = stream
    this.setSnapshot({ isRunning: true, pitch: null })

    const buffer = new Float32Array(analyser.fftSize)

    const loop = () => {
      analyser.getFloatTimeDomainData(buffer)
      const result = detectPitch(buffer)

      let newPitch: number | null
      if (result.probability > this.probabilityThreshold && result.freq < 1e3 && result.freq > 20) {
        newPitch = result.freq
      } else {
        newPitch = null
      }

      this.setSnapshot({ isRunning: true, pitch: newPitch })

      this.rafId = requestAnimationFrame(loop)
    }

    loop()
  }

  stop(): void {
    if (!this.analyser) return
    cancelAnimationFrame(this.rafId)
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.analyser = null
    this.setSnapshot({ isRunning: false, pitch: null })
  }

  private setSnapshot(next: PitchDetectorSnapshot): void {
    this.snapshot = next
    for (const listener of this.listeners) {
      listener()
    }
  }
}
