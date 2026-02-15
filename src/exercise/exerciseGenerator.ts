import type { PerceptualParams } from 'cantor-digitalis'
import { getMidiChord } from '../audio/intervals'
import { englishVowelTable } from '../audio/vowels'
import type { Exercise, ExerciseConfig, Part } from './types'

/** MIDI note ranges per voice part — placeholder values, replace with real limits */
export const PART_RANGES: Record<Part, { min: number; max: number }> = {
  bass:  { min: 36, max: 57 },  // C2 – A3
  bari:  { min: 43, max: 64 },  // G2 – E4
  lead:  { min: 48, max: 69 },  // C3 – A4
  tenor: { min: 55, max: 76 },  // G3 – E5
}

/** Part index within a 4-voice voicing (bass=0, bari=1, lead=2, tenor=3) */
export const PART_INDEX: Record<Part, number> = {
  bass: 0,
  bari: 1,
  lead: 2,
  tenor: 3,
}

/** Default voice template */
function makeVoice(pitchOffset: number, overrides?: Partial<PerceptualParams>): PerceptualParams {
  return {
    pitch: 0,
    pitchOffset,
    vocalEffort: 0.7,
    vowelHeight: 0.95,
    vowelBackness: 0.2,
    tenseness: 0.5,
    breathiness: 0,
    roughness: 0,
    vocalTractSize: 0.3,
    isFalsetto: false,
    ...overrides,
  }
}

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
 * Generate an array of ExerciseConfig from an Exercise specification and a voice part.
 */
export function generateExercises(exercise: Exercise, part: Part): ExerciseConfig[] {
  const repeats = exercise.repeats ?? 1
  const partIdx = PART_INDEX[part]
  const partRange = PART_RANGES[part]

  // Use getMidiChord with root=0 to find the part's semitone offset from root
  const referenceChord = getMidiChord(0, exercise.chordType, exercise.voicing)
  const partOffset = referenceChord[partIdx] // offset relative to root

  // Determine valid root note range so the part note stays within the singer's range
  const minRoot = Math.ceil(partRange.min - partOffset)
  const maxRoot = Math.floor(partRange.max - partOffset)

  if (minRoot > maxRoot) {
    throw new Error(
      `No valid root notes for part "${part}" with chord type "${exercise.chordType}" ` +
      `and voicing "${exercise.voicing}". Part offset ${partOffset} exceeds range.`
    )
  }

  // Resolve defaults and overrides
  const minOffsetCents = exercise.minOffsetCents ?? DEFAULT_MIN_OFFSET_CENTS
  const maxOffsetCents = exercise.maxOffsetCents ?? DEFAULT_MAX_OFFSET_CENTS
  const direction = exercise.offsetDirection ?? 'either'
  const starThresholds = exercise.starThresholds ?? DEFAULT_STAR_THRESHOLDS

  const configs: ExerciseConfig[] = []

  for (let i = 0; i < repeats; i++) {
    // Pick a random root note (integer MIDI) within valid range
    const root = randInt(minRoot, maxRoot)

    // Compute actual MIDI notes for all four voices using just intonation
    const chordNotes = getMidiChord(root, exercise.chordType, exercise.voicing)
    const targetNote = chordNotes[partIdx]

    // Resolve vowel for this exercise instance
    let vowelOverride: Partial<PerceptualParams> = {}
    if (exercise.vowel) {
      const vowelData = englishVowelTable.vowels.find(v => v.ipa === exercise.vowel)
      if (vowelData) {
        vowelOverride = { vowelHeight: vowelData.h, vowelBackness: vowelData.v }
      }
    } else {
      const randomVowel = pickRandom(englishVowelTable.vowels)
      vowelOverride = { vowelHeight: randomVowel.h, vowelBackness: randomVowel.v }
    }

    // Generate the three other chord voices (all voices except the user's part)
    const chordVoices: PerceptualParams[] = []
    for (let j = 0; j < 4; j++) {
      if (j === partIdx) continue
      chordVoices.push(makeVoice(chordNotes[j], vowelOverride))
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

    const referenceTone = makeVoice(referencePitch, vowelOverride)

    configs.push({
      referenceTone,
      targetNote,
      chordVoices,
      matchThresholdCents: 20,
      matchSustainMs: 1000,
      adjustThresholdCents: 10,
      adjustSustainMs: 1500,
      starThresholds,
    })
  }

  return configs
}
