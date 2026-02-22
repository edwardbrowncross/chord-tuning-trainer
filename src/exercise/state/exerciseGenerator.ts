import type { PerceptualParams } from 'cantor-digitalis'
import type { AudioSettings } from '../../audio/AudioProvider'
import { getMidiChord } from '../../audio/intervals'
import { makeVoice } from '../../audio/makeVoice'
import { getPan } from '../../audio/panning'
import { englishVowelTable } from '../../audio/vowels'
import type { LevelSpecification } from '../../data/types'
import type { Part } from '../../types'
import type { Exercise } from './types'

/** MIDI note ranges per voice part — placeholder values, replace with real limits */
export const PART_RANGES: Record<Part, { min: number; max: number }> = {
  bass:  { min: 43, max: 57 },  // G2 – G3
  bari:  { min: 50, max: 62 },  // D3 – D4
  lead:  { min: 53, max: 65 },  // F3 – F4
  tenor: { min: 48, max: 72 },  // C3 – C5
}

/** Part index within a 4-voice voicing (bass=0, bari=1, lead=2, tenor=3) */
export const PART_INDEX: Record<Part, number> = {
  bass: 0,
  bari: 1,
  lead: 2,
  tenor: 3,
}

/** Reverse mapping: voicing index → Part */
const INDEX_TO_PART: Part[] = ['bass', 'bari', 'lead', 'tenor']


/** Random integer in [min, max] inclusive */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Pick a random element from an array */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const DEFAULT_MIN_OFFSET_CENTS = 15
const DEFAULT_MAX_OFFSET_CENTS = 50
const DEFAULT_STAR_THRESHOLDS: [number, number] = [3000, 8000]

/**
 * Generate an array of Exercises from an Level specification, for a voice part.
 */
export function generateExercises(level: LevelSpecification, part: Part, audioSettings?: AudioSettings): Exercise[] {
  const repeats = level.repeats ?? 1
  const partIdx = PART_INDEX[part]

  // Use getMidiChord with root=0 to find the part's semitone offset from root
  const referenceChord = getMidiChord(0, level.chordType, level.voicing)

  // Determine valid root note range so ALL four parts stay within their vocal ranges
  const pitchOffset = audioSettings?.pitchOffset ?? 0
  const parts: Part[] = ['bass', 'bari', 'lead', 'tenor']
  let minRoot = -Infinity
  let maxRoot = Infinity
  for (const p of parts) {
    const range = PART_RANGES[p]
    const offset = referenceChord[PART_INDEX[p]]
    minRoot = Math.max(minRoot, Math.ceil(range.min + pitchOffset - offset))
    maxRoot = Math.min(maxRoot, Math.floor(range.max + pitchOffset - offset))
  }

  if (minRoot > maxRoot) {
    throw new Error(
      `No valid root notes for chord type "${level.chordType}" ` +
      `and voicing "${level.voicing}". No root keeps all four parts within their vocal ranges.`
    )
  }

  // Resolve defaults and overrides
  const minOffsetCents = level.minOffsetCents ?? DEFAULT_MIN_OFFSET_CENTS
  const maxOffsetCents = level.maxOffsetCents ?? DEFAULT_MAX_OFFSET_CENTS
  const direction = level.offsetDirection ?? 'either'
  const starThresholds = level.starThresholds ?? DEFAULT_STAR_THRESHOLDS

  const configs: Exercise[] = []

  for (let i = 0; i < repeats; i++) {
    // Pick a random root note (integer MIDI) within valid range
    const root = randInt(minRoot, maxRoot)

    // Compute actual MIDI notes for all four voices using just intonation
    const chordNotes = getMidiChord(root, level.chordType, level.voicing)
    const targetNote = chordNotes[partIdx]

    // Resolve vowel for this exercise instance
    let vowelOverride: Partial<PerceptualParams> = {}
    if (level.vowel) {
      const vowelData = englishVowelTable.vowels.find(v => v.ipa === level.vowel)
      if (vowelData) {
        vowelOverride = { vowelHeight: vowelData.h, vowelBackness: vowelData.v }
      }
    } else {
      const randomVowel = pickRandom(englishVowelTable.vowels)
      vowelOverride = { vowelHeight: randomVowel.h, vowelBackness: randomVowel.v }
    }

    const tractOverride: Partial<PerceptualParams> = audioSettings !== undefined
      ? { ...vowelOverride, vocalTractSize: audioSettings.vocalTractSize }
      : vowelOverride

    // Generate the three other chord voices (all voices except the user's part)
    const chordVoices = []
    for (let j = 0; j < 4; j++) {
      if (j === partIdx) continue
      const voicePart = INDEX_TO_PART[j]
      const pan = (audioSettings?.stereo ?? true) ? getPan(part, voicePart) : 0
      chordVoices.push({ ...makeVoice(chordNotes[j], tractOverride), pan })
    }

    // Generate the offset for the starting reference tone
    const offsetCents = randInt(minOffsetCents, maxOffsetCents)
    let sign: number
    if (direction === 'up') {
      sign = 1
    } else if (direction === 'down') {
      sign = -1
    } else {
      sign = Math.random() < 0.5 ? -1 : 1
    }
    const referencePitch = targetNote + (sign * offsetCents) / 100

    const referenceTone = makeVoice(referencePitch, tractOverride)

    configs.push({
      referenceTone,
      targetNote,
      chordVoices,
      adjustThresholdCents: 10,
      adjustSustainMs: 1500,
      starThresholds,
    })
  }

  return configs
}
