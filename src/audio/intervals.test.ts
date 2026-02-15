import { describe, it, expect } from 'vitest'
import { JUST_INTERVALS, CHORD_TYPES, getMidiNote, midiToString, getMidiChord } from './intervals'

describe('JUST_INTERVALS', () => {
  it('has unison at 0 semitones', () => {
    expect(JUST_INTERVALS.unison).toBe(0)
  })

  it('has octave at 12 semitones', () => {
    expect(JUST_INTERVALS.octave).toBe(12)
  })

  it('has major third close to but not equal to ET (≈3.86 vs 4)', () => {
    expect(JUST_INTERVALS.majorThird).toBeCloseTo(3.8631, 3)
    expect(JUST_INTERVALS.majorThird).not.toBeCloseTo(4, 1)
  })

  it('has perfect fifth close to but not equal to ET (≈7.02 vs 7)', () => {
    expect(JUST_INTERVALS.perfectFifth).toBeCloseTo(7.0196, 3)
  })

  it('has dominant seventh from 7:4 ratio (≈9.69)', () => {
    expect(JUST_INTERVALS.dominantSeventh).toBeCloseTo(12 * Math.log2(7 / 4), 10)
  })

  it('has all intervals in ascending order within an octave (excluding majorNinth)', () => {
    const withinOctave = [
      JUST_INTERVALS.unison,
      JUST_INTERVALS.minorSecond,
      JUST_INTERVALS.majorSecond,
      JUST_INTERVALS.minorThird,
      JUST_INTERVALS.majorThird,
      JUST_INTERVALS.perfectFourth,
      JUST_INTERVALS.tritone,
      JUST_INTERVALS.diminishedFifth,
      JUST_INTERVALS.perfectFifth,
      JUST_INTERVALS.augmentedFifth,
      JUST_INTERVALS.minorSixth,
      JUST_INTERVALS.majorSixth,
      JUST_INTERVALS.dominantSeventh,
      JUST_INTERVALS.minorSeventh,
      JUST_INTERVALS.majorSeventh,
      JUST_INTERVALS.octave,
    ]
    for (let i = 1; i < withinOctave.length; i++) {
      expect(withinOctave[i]).toBeGreaterThanOrEqual(withinOctave[i - 1])
    }
  })

  it('has majorNinth greater than octave', () => {
    expect(JUST_INTERVALS.majorNinth).toBeGreaterThan(12)
    expect(JUST_INTERVALS.majorNinth).toBeCloseTo(12 + JUST_INTERVALS.majorSecond, 10)
  })
})

describe('CHORD_TYPES', () => {
  it('defines major chord with correct tones', () => {
    expect(Object.keys(CHORD_TYPES.major)).toEqual(['1', '3', '5', '7', '9'])
  })

  it('defines minor chord with minor third', () => {
    expect(CHORD_TYPES.minor['3']).toBe(JUST_INTERVALS.minorThird)
  })

  it('defines dominant chord with dominant seventh', () => {
    expect(CHORD_TYPES.dominant['7']).toBe(JUST_INTERVALS.dominantSeventh)
  })

  it('defines diminished chord with diminished fifth and seventh', () => {
    expect(CHORD_TYPES.diminished['5']).toBe(JUST_INTERVALS.diminishedFifth)
    expect(CHORD_TYPES.diminished['7']).toBe(JUST_INTERVALS.diminishedSeventh)
  })

  it('defines suspended chord with perfect fourth instead of third', () => {
    expect(CHORD_TYPES.suspended).not.toHaveProperty('3')
    expect(CHORD_TYPES.suspended['4']).toBe(JUST_INTERVALS.perfectFourth)
  })

  it('all chord types have unison as root', () => {
    for (const [, intervals] of Object.entries(CHORD_TYPES)) {
      expect(intervals['1']).toBe(0)
    }
  })
})

describe('getMidiNote', () => {
  it('returns 60 for C4 (middle C)', () => {
    expect(getMidiNote('C4')).toBe(60)
  })

  it('returns 69 for A4', () => {
    expect(getMidiNote('A4')).toBe(69)
  })

  it('returns 0 for C-1', () => {
    expect(getMidiNote('C-1')).toBe(0)
  })

  it('handles sharps', () => {
    expect(getMidiNote('F#3')).toBe(54)
    expect(getMidiNote('C#4')).toBe(61)
  })

  it('handles flats', () => {
    expect(getMidiNote('Bb3')).toBe(58)
    expect(getMidiNote('Eb4')).toBe(63)
  })

  it('treats enharmonic equivalents the same', () => {
    expect(getMidiNote('C#4')).toBe(getMidiNote('Db4'))
    expect(getMidiNote('F#3')).toBe(getMidiNote('Gb3'))
  })

  it('handles lowercase note names', () => {
    expect(getMidiNote('c4')).toBe(60)
    expect(getMidiNote('a4')).toBe(69)
  })

  it('throws on invalid input', () => {
    expect(() => getMidiNote('')).toThrow('Invalid note string')
    expect(() => getMidiNote('X4')).toThrow('Invalid note string')
    expect(() => getMidiNote('C')).toThrow('Invalid note string')
  })
})

describe('midiToString', () => {
  it('returns "C4" for MIDI 60', () => {
    expect(midiToString(60)).toBe('C4')
  })

  it('returns "A4" for MIDI 69', () => {
    expect(midiToString(69)).toBe('A4')
  })

  it('returns "C-1" for MIDI 0', () => {
    expect(midiToString(0)).toBe('C-1')
  })

  it('rounds fractional MIDI values', () => {
    expect(midiToString(60.3)).toBe('C4')
    expect(midiToString(60.7)).toBe('C#4')
  })

  it('roundtrips with getMidiNote for natural notes and sharps', () => {
    for (const midi of [48, 54, 60, 66, 69, 72]) {
      expect(getMidiNote(midiToString(midi))).toBe(midi)
    }
  })
})

describe('getMidiChord', () => {
  const C3 = getMidiNote('C3') // 48
  const A3 = getMidiNote('A3') // 57

  it('returns four MIDI values', () => {
    const result = getMidiChord(C3, 'major', '1351')
    expect(result).toHaveLength(4)
  })

  it('returns root as first note for voicing starting with 1', () => {
    const [first] = getMidiChord(C3, 'major', '1351')
    expect(first).toBe(C3)
  })

  it('applies just intonation intervals (not equal temperament)', () => {
    // "1531": tone 1, tone 5, tone 3 (octave up since 3<5), tone 1 (octave up since 1<3)
    const result = getMidiChord(C3, 'major', '1531')
    const thirdInterval = result[2] - C3
    // JI major third is ~3.86 semitones, not exactly 4
    expect(thirdInterval).toBeCloseTo(12 + JUST_INTERVALS.majorThird, 5)
    expect(thirdInterval).not.toBeCloseTo(16, 1)
  })

  it('increments octave when tone number decreases', () => {
    // "1513": 1->5 (same octave), 5->1 (octave up), 1->3 (same octave)
    const result = getMidiChord(C3, 'major', '1513')
    expect(result[0]).toBeCloseTo(C3) // C3
    expect(result[1]).toBeCloseTo(C3 + JUST_INTERVALS.perfectFifth) // G3
    expect(result[2]).toBeCloseTo(C3 + 12) // C4
    expect(result[3]).toBeCloseTo(C3 + 12 + JUST_INTERVALS.majorThird) // E4
  })

  it('increments octave when tone number stays equal', () => {
    // "1155": 1->1 (octave up), 1->5 (same), 5->5 (octave up)
    const result = getMidiChord(C3, 'major', '1155')
    expect(result[0]).toBeCloseTo(C3)
    expect(result[1]).toBeCloseTo(C3 + 12)
    expect(result[2]).toBeCloseTo(C3 + 12 + JUST_INTERVALS.perfectFifth)
    expect(result[3]).toBeCloseTo(C3 + 24 + JUST_INTERVALS.perfectFifth)
  })

  it('works with minor chord', () => {
    const result = getMidiChord(A3, 'minor', '1351')
    expect(result[0]).toBeCloseTo(A3)
    expect(result[1]).toBeCloseTo(A3 + JUST_INTERVALS.minorThird)
    expect(result[2]).toBeCloseTo(A3 + JUST_INTERVALS.perfectFifth)
    expect(result[3]).toBeCloseTo(A3 + 12)
  })

  it('works with dominant chord including 7th', () => {
    // "1573": tone 1, tone 5 (5>1 same oct), tone 7 (7>5 same oct), tone 3 (3<7 octave up)
    const result = getMidiChord(C3, 'dominant', '1573')
    expect(result[0]).toBeCloseTo(C3)
    expect(result[1]).toBeCloseTo(C3 + JUST_INTERVALS.perfectFifth)
    expect(result[2]).toBeCloseTo(C3 + JUST_INTERVALS.dominantSeventh)
    expect(result[3]).toBeCloseTo(C3 + 12 + JUST_INTERVALS.majorThird)
  })

  it('throws for voicing with wrong length', () => {
    expect(() => getMidiChord(C3, 'major', '135')).toThrow('exactly 4 characters')
    expect(() => getMidiChord(C3, 'major', '13515')).toThrow('exactly 4 characters')
  })

  it('throws for unknown chord type', () => {
    // @ts-expect-error - test runtime error for invalid chord type string
    expect(() => getMidiChord(C3, 'unknown', '1351')).toThrow('Unknown chord type')
  })

  it('throws for invalid tone in voicing', () => {
    expect(() => getMidiChord(C3, 'major', '1352')).toThrow('Invalid chord tone "2"')
  })

  it('throws for tone not in chord type', () => {
    // suspended chord has no '3'
    expect(() => getMidiChord(C3, 'suspended', '1354')).toThrow('Invalid chord tone "3"')
  })
})
