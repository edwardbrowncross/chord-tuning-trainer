import type { PerceptualParams } from 'cantor-digitalis'

/** Default voice template */
export function makeVoice(pitchOffset: number, overrides?: Partial<PerceptualParams>): PerceptualParams {
  const isFalsetto = pitchOffset >= 52
  return {
    pitch: 0,
    pitchOffset,
    vocalEffort: isFalsetto ? 0.6 : 0.5,
    vowelHeight: 0.95,
    vowelBackness: 0.2,
    tenseness: isFalsetto ? 0.65 : 0.3,
    breathiness: 0,
    roughness: 0,
    vocalTractSize: 0.28,
    isFalsetto,
    ...overrides,
  }
}
