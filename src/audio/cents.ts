/**
 * Returns the distance in cents between two frequencies.
 * Positive means f1 is sharp of f2, negative means flat.
 */
export function centsDistance(f1: number, f2: number): number {
  return 1200 * Math.log2(f1 / f2)
}

/** Converts a MIDI note number (possibly fractional) to frequency in Hz. */
export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}
