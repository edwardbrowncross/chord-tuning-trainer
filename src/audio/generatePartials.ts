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
 */
export function generatePartials(
  synthParams: SynthParams,
  maxFrequency: number = 6000,
): PartialsResult {
  const f0 = synthParams.f0;

  const partialsCount = Math.floor(maxFrequency / f0);

  const frequencies = Array.from(
    { length: partialsCount },
    (_, i) => f0 * (i + 1),
  );

  const amplitudes = Voice.getFrequencyResponse(frequencies, synthParams);

  const real = new Float32Array(partialsCount);
  const imag = new Float32Array(partialsCount);

  for (let i = 0; i < partialsCount; i++) {
    real[i] = 0.1 * (amplitudes[i] * 64) / partialsCount;
  }

  return { real, imag };
}
