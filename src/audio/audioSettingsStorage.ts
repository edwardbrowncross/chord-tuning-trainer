import type { AudioSettings } from './AudioProvider'

const STORAGE_KEY = 'tuning-trainer:audio-settings'

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  vocalTractSize: 0.3,
  stereo: true,
  pitchOffset: 0,
}

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_AUDIO_SETTINGS
    return { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_AUDIO_SETTINGS
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
