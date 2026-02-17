import { describe, it, expect } from 'vitest'
import { generateExercises, PART_RANGES, PART_INDEX } from './exerciseGenerator'
import { getMidiChord } from '../audio/intervals'
import { englishVowelTable } from '../audio/vowels'
import type { LevelSpecification } from '../modules/types'
import type { Part } from './types'

const baseLevel: LevelSpecification = {
  chordType: 'major',
  voicing: '1513',
  partwiseEaseOfTuning: [1, 1, 1, 1],
}

const allParts: Part[] = ['bass', 'bari', 'lead', 'tenor']

describe('generateExercises', () => {
  it('returns one config by default', () => {
    const configs = generateExercises(baseLevel, 'lead')
    expect(configs).toHaveLength(1)
  })

  it('returns the requested number of repeats', () => {
    const configs = generateExercises({ ...baseLevel, repeats: 5 }, 'lead')
    expect(configs).toHaveLength(5)
  })

  it('returns 1 config when repeats is undefined', () => {
    const noRepeats = { ...baseLevel }
    delete noRepeats.repeats
    const configs = generateExercises(noRepeats as LevelSpecification, 'lead')
    expect(configs).toHaveLength(1)
  })

  describe('target note placement', () => {
    it('target note falls within the part vocal range', () => {
      for (const part of allParts) {
        const range = PART_RANGES[part]
        const configs = generateExercises({ ...baseLevel, repeats: 20 }, part)
        for (const config of configs) {
          expect(config.targetNote).toBeGreaterThanOrEqual(range.min - 0.01)
          expect(config.targetNote).toBeLessThanOrEqual(range.max + 0.01)
        }
      }
    })

    it('all four chord notes fall within their respective part vocal ranges', () => {
      for (const part of allParts) {
        const partIdx = PART_INDEX[part]
        const configs = generateExercises({ ...baseLevel, repeats: 20 }, part)
        for (const config of configs) {
          // Reconstruct all 4 notes
          const allNotes = [...config.chordVoices.map(v => v.pitchOffset)]
          allNotes.splice(partIdx, 0, config.targetNote)
          // Check each voice is within its range
          for (let i = 0; i < 4; i++) {
            const voicePart = allParts[i]
            const range = PART_RANGES[voicePart]
            expect(allNotes[i]).toBeGreaterThanOrEqual(range.min - 0.01)
            expect(allNotes[i]).toBeLessThanOrEqual(range.max + 0.01)
          }
        }
      }
    })

    it('target note matches the correct voice in the generated chord', () => {
      for (const part of allParts) {
        const partIdx = PART_INDEX[part]
        const configs = generateExercises({ ...baseLevel, repeats: 10 }, part)
        for (const config of configs) {
          // Reconstruct: the target note is chordNotes[partIdx], and chord voices are the other 3
          // So all 4 notes = chordVoices + targetNote, and they should form a valid chord
          expect(config.chordVoices).toHaveLength(3)

          // The target note should correspond to the part's position in the chord
          // Verify by checking that a chord built from some root yields this target at partIdx
          const allNotes = [...config.chordVoices.map(v => v.pitchOffset)]
          allNotes.splice(partIdx, 0, config.targetNote)
          // All four notes should form a valid chord from getMidiChord
          const root = allNotes[0] - getMidiChord(0, baseLevel.chordType, baseLevel.voicing)[0]
          const expectedChord = getMidiChord(root, baseLevel.chordType, baseLevel.voicing)
          for (let i = 0; i < 4; i++) {
            expect(allNotes[i]).toBeCloseTo(expectedChord[i], 5)
          }
        }
      }
    })
  })

  describe('reference tone offset', () => {
    it('reference tone differs from target note', () => {
      const configs = generateExercises({ ...baseLevel, repeats: 10 }, 'lead')
      for (const config of configs) {
        expect(config.referenceTone.pitchOffset).not.toBeCloseTo(config.targetNote, 5)
      }
    })

    it('offset direction "up" produces reference tone above target', () => {
      const configs = generateExercises(
        { ...baseLevel, offsetDirection: 'up', repeats: 20 },
        'lead',
      )
      for (const config of configs) {
        expect(config.referenceTone.pitchOffset).toBeGreaterThan(config.targetNote)
      }
    })

    it('offset direction "down" produces reference tone below target', () => {
      const configs = generateExercises(
        { ...baseLevel, offsetDirection: 'down', repeats: 20 },
        'lead',
      )
      for (const config of configs) {
        expect(config.referenceTone.pitchOffset).toBeLessThan(config.targetNote)
      }
    })

    it('offset respects custom min/max cent bounds', () => {
      const minCents = 30
      const maxCents = 60
      const configs = generateExercises(
        { ...baseLevel, minOffsetCents: minCents, maxOffsetCents: maxCents, repeats: 50 },
        'lead',
      )
      for (const config of configs) {
        const offsetSemitones = Math.abs(config.referenceTone.pitchOffset - config.targetNote)
        const offsetCents = offsetSemitones * 100
        expect(offsetCents).toBeGreaterThanOrEqual(minCents - 0.01)
        expect(offsetCents).toBeLessThanOrEqual(maxCents + 0.01)
      }
    })
  })

  describe('vowel handling', () => {
    it('uses specified vowel coordinates when vowel is set', () => {
      const vowel = 'æ'
      const vowelData = englishVowelTable.vowels.find(v => v.ipa === vowel)!
      const configs = generateExercises({ ...baseLevel, vowel, repeats: 5 }, 'lead')
      for (const config of configs) {
        expect(config.referenceTone.vowelHeight).toBe(vowelData.h)
        expect(config.referenceTone.vowelBackness).toBe(vowelData.v)
        for (const voice of config.chordVoices) {
          expect(voice.vowelHeight).toBe(vowelData.h)
          expect(voice.vowelBackness).toBe(vowelData.v)
        }
      }
    })

    it('picks a vowel from the vowel table when vowel is not set', () => {
      const validCoords = englishVowelTable.vowels.map(v => ({ h: v.h, v: v.v }))
      const configs = generateExercises({ ...baseLevel, repeats: 10 }, 'lead')
      for (const config of configs) {
        const match = validCoords.some(
          c => c.h === config.referenceTone.vowelHeight && c.v === config.referenceTone.vowelBackness,
        )
        expect(match).toBe(true)
      }
    })

    it('all voices in a single config share the same vowel coordinates', () => {
      const configs = generateExercises({ ...baseLevel, repeats: 10 }, 'lead')
      for (const config of configs) {
        const h = config.referenceTone.vowelHeight
        const v = config.referenceTone.vowelBackness
        for (const voice of config.chordVoices) {
          expect(voice.vowelHeight).toBe(h)
          expect(voice.vowelBackness).toBe(v)
        }
      }
    })
  })

  describe('star thresholds', () => {
    it('uses provided star thresholds', () => {
      const thresholds: [number, number] = [2000, 5000]
      const [config] = generateExercises({ ...baseLevel, starThresholds: thresholds }, 'lead')
      expect(config.starThresholds).toEqual(thresholds)
    })

    it('uses default star thresholds when not specified', () => {
      const [config] = generateExercises(baseLevel, 'lead')
      // Just verify it's a 2-element tuple of positive numbers
      expect(config.starThresholds).toHaveLength(2)
      expect(config.starThresholds[0]).toBeGreaterThan(0)
      expect(config.starThresholds[1]).toBeGreaterThan(config.starThresholds[0])
    })
  })

  describe('all parts', () => {
    it('generates valid configs for every part', () => {
      for (const part of allParts) {
        const configs = generateExercises(baseLevel, part)
        expect(configs).toHaveLength(1)
        expect(configs[0].chordVoices).toHaveLength(3)
        expect(typeof configs[0].targetNote).toBe('number')
      }
    })
  })

  describe('chord types', () => {
    it('works with different chord types', () => {
      for (const chordType of ['dominant', 'minor', 'diminished'] as const) {
        const exercise: LevelSpecification = { ...baseLevel, chordType, voicing: '1351' }
        const configs = generateExercises(exercise, 'lead')
        expect(configs).toHaveLength(1)
        expect(configs[0].chordVoices).toHaveLength(3)
      }
    })
  })
})
