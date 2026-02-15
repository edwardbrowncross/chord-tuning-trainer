// Just intonation intervals in semitones (relative to root)
export const JUST_INTERVALS = {
  unison: 0,                              // 1:1
  minorSecond: 12 * Math.log2(16 / 15),   // 16:15
  majorSecond: 12 * Math.log2(9 / 8),     // 9:8
  minorThird: 12 * Math.log2(6 / 5),      // 6:5
  majorThird: 12 * Math.log2(5 / 4),      // 5:4 ≈ 3.8631
  perfectFourth: 12 * Math.log2(4 / 3),   // 4:3
  diminishedFifth: 12 * Math.log2(64 / 45), // 64:45 ≈ 6.10
  tritone: 12 * Math.log2(45 / 32),       // 45:32
  perfectFifth: 12 * Math.log2(3 / 2),    // 3:2 ≈ 7.0196
  augmentedFifth: 12 * Math.log2(25 / 16), // 25:16 ≈ 7.73
  minorSixth: 12 * Math.log2(8 / 5),      // 8:5
  majorSixth: 12 * Math.log2(5 / 3),      // 5:3
  dominantSeventh: 12 * Math.log2(7 / 4),  // 7:4
  minorSeventh: 12 * Math.log2(9 / 5),    // 9:5
  majorSeventh: 12 * Math.log2(15 / 8),   // 15:8
  diminishedSeventh: 12 * Math.log2(128 / 75), // 128:75 ≈ 9.25
  octave: 12,                             // 2:1
  majorNinth: 12 + 12 * Math.log2(9 / 8), // 9:4 (octave + major second)
}

// Chord type definitions: maps chord tone numbers to their intervals
export const CHORD_TYPES = {
  'major': {
    '1': JUST_INTERVALS.unison,
    '3': JUST_INTERVALS.majorThird,
    '5': JUST_INTERVALS.perfectFifth,
    '7': JUST_INTERVALS.majorSeventh,
    '9': JUST_INTERVALS.majorNinth,
  },
  'dominant': {
    '1': JUST_INTERVALS.unison,
    '3': JUST_INTERVALS.majorThird,
    '5': JUST_INTERVALS.perfectFifth,
    '7': JUST_INTERVALS.dominantSeventh,
    '9': JUST_INTERVALS.majorNinth,
  },
  'minor': {
    '1': JUST_INTERVALS.unison,
    '3': JUST_INTERVALS.minorThird,
    '5': JUST_INTERVALS.perfectFifth,
    '7': JUST_INTERVALS.minorSeventh,
  },
  'diminished': {
    '1': JUST_INTERVALS.unison,
    '3': JUST_INTERVALS.minorThird,
    '5': JUST_INTERVALS.diminishedFifth,
    '7': JUST_INTERVALS.diminishedSeventh,
  },
  'half-diminished': {
    '1': JUST_INTERVALS.unison,
    '3': JUST_INTERVALS.minorThird,
    '5': JUST_INTERVALS.diminishedFifth,
    '7': JUST_INTERVALS.minorSeventh,
  },
  'augmented': {
    '1': JUST_INTERVALS.unison,
    '3': JUST_INTERVALS.majorThird,
    '5': JUST_INTERVALS.augmentedFifth,
    '7': JUST_INTERVALS.minorSeventh,
  },
  'suspended': {
    '1': JUST_INTERVALS.unison,
    '4': JUST_INTERVALS.perfectFourth,
    '5': JUST_INTERVALS.perfectFifth,
  },
  'minor-sixth': {
    '1': JUST_INTERVALS.unison,
    '3': JUST_INTERVALS.minorThird,
    '5': JUST_INTERVALS.perfectFifth,
    '6': JUST_INTERVALS.majorSixth,
  },
} as const

/** Valid chord type names */
export type ChordType = keyof typeof CHORD_TYPES

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NOTE_NAME_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4, 'E#': 5,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11, 'B#': 0,
}

/**
 * Convert a note string like "C4" to its MIDI note value (equal temperament).
 * @param noteString - Note name with octave, e.g., "C4", "F#3", "Bb5"
 * @returns MIDI note number (C4 = 60)
 */
export function getMidiNote(noteString: string): number {
  const match = noteString.match(/^([A-Ga-g][#b]?)(-?\d+)$/)
  if (!match) {
    throw new Error(`Invalid note string: "${noteString}"`)
  }

  const noteName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
  const octave = parseInt(match[2], 10)

  const semitone = NOTE_NAME_TO_SEMITONE[noteName]
  if (semitone === undefined) {
    throw new Error(`Unknown note name: "${noteName}"`)
  }

  // MIDI note 0 = C-1, so C4 = 60
  return (octave + 1) * 12 + semitone
}

/**
 * Convert a MIDI note value to a note string like "C4".
 * Fractional MIDI values are rounded to the nearest semitone.
 * @param midiNote - MIDI note number (possibly fractional)
 * @returns Note string, e.g., "C4"
 */
export function midiToString(midiNote: number): string {
  const rounded = Math.round(midiNote)
  const octave = Math.floor(rounded / 12) - 1
  const semitone = ((rounded % 12) + 12) % 12 // Handle negative values
  return NOTE_NAMES[semitone] + octave
}

/**
 * Convert a root MIDI note, chord type, and voicing string to four MIDI values using just intonation.
 * The voicing string contains chord tone numbers (e.g., '1' for root, '3' for third, '5' for fifth,
 * '7' for seventh, '9' for ninth). When a tone is less than or equal to the previous tone,
 * it implies a jump to the next octave.
 *
 * @param rootMidi - Root note as a MIDI number (e.g., 48 for C3)
 * @param chordType - Chord type (e.g., "major", "minor", "dominant", "diminished")
 * @param voicing - Four-character voicing string using chord tones, e.g., "1513" (root, fifth, root, third)
 * @returns Array of four fractional MIDI values in just intonation
 *
 * @example
 * getMidiChord(48, "major", "1513") // C major: C3, G3, C4, E4
 * getMidiChord(48, "minor", "1513") // C minor: C3, G3, C4, Eb4
 * getMidiChord(48, "dominant", "1573") // C7: C3, G3, Bb3, E4
 * getMidiChord(51, "dominant", "1379") // Eb9: Eb3, Bb3, Db4, F4
 */
export function getMidiChord(
  rootMidi: number,
  chordType: ChordType,
  voicing: string
): [number, number, number, number] {
  if (voicing.length !== 4) {
    throw new Error(`Voicing must be exactly 4 characters, got "${voicing}"`)
  }

  const chordIntervals = CHORD_TYPES[chordType]
  if (!chordIntervals) {
    const availableTypes = Object.keys(CHORD_TYPES).join(', ')
    throw new Error(`Unknown chord type "${chordType}". Available types: ${availableTypes}`)
  }

  const result: number[] = []
  let currentOctaveOffset = 0

  for (let i = 0; i < 4; i++) {
    const tone = voicing[i]
    const interval = chordIntervals[tone as keyof typeof chordIntervals]

    if (interval === undefined) {
      const availableTones = Object.keys(chordIntervals).join(', ')
      throw new Error(
        `Invalid chord tone "${tone}" for ${chordType} chord. Available tones: ${availableTones}`
      )
    }

    // Check if we need to jump to next octave
    // Compare the numeric values of the tones
    if (i > 0) {
      const prevTone = parseInt(voicing[i - 1], 10)
      const currTone = parseInt(tone, 10)
      if (currTone <= prevTone) {
        currentOctaveOffset += 12
      }
    }

    result.push(rootMidi + interval + currentOctaveOffset)
  }

  return result as [number, number, number, number]
}
