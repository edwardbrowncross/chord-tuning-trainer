import type { ChordType } from '../audio/intervals'
import type { EnglishVowel } from '../audio/vowels'

export type ModuleSpecification = {
  name: string
  description: string
  levels: LevelSpecification[]
}

// The specification for generating a random exercise (or sequence thereof).
export type LevelSpecification = {
  level: number
  chordType: ChordType
  voicing: string
  partwiseDifficulty: [number, number, number, number] // bass, bari, lead, tenor

  vowel?: EnglishVowel
  minOffsetCents?: number
  maxOffsetCents?: number
  offsetDirection?: 'up' | 'down' | 'either'
  starThresholds?: [number, number]
  repeats?: number
}
