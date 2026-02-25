import { Voice, type SynthParams } from "cantor-digitalis";

export type PartialsResult = {
  real: Float32Array;
  imag: Float32Array;
};

/**
 * Generates the real and imaginary coefficient arrays for use with
 * `BaseAudioContext.createPeriodicWave`. The imaginary values are all zero.
 * The real values are the amplitudes of each harmonic partial of the vocal
 * waveform, derived from the cantor-digitalis frequency response model.
 *
 * Amplitudes are L2-normalised so that waveform energy is consistent across
 * pitches (cantor-digitalis's raw output varies ~6× in magnitude from bass to
 * tenor for identical perceptual params). vocalEffort is then re-applied as an
 * explicit gain so that effort-driven loudness differences are preserved.
 */
export function generatePartials(
  synthParams: SynthParams,
  vocalEffort: number,
  maxFrequency: number = 6000,
): PartialsResult {
  const f0 = synthParams.f0;

  const partialsCount = Math.floor(maxFrequency / f0);

  const frequencies = Array.from(
    { length: partialsCount },
    (_, i) => f0 * (i + 1),
  );

  const amplitudes = Voice.getFrequencyResponse(frequencies, synthParams);

  const l2 = Math.sqrt(amplitudes.reduce((s, a) => s + a * a, 0));
  const scale = 0.4 * vocalEffort / (l2 || 1);

  const real = new Float32Array(partialsCount);
  const imag = new Float32Array(partialsCount);

  for (let i = 0; i < partialsCount; i++) {
    real[i] = amplitudes[i] * scale;
  }

  return { real, imag };
}
