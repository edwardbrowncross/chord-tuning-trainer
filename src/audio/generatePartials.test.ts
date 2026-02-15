import { describe, it, expect, vi } from "vitest";
import {
  generateSynthParams,
  type PerceptualParams,
  type SynthParams,
} from "cantor-digitalis";
import { generatePartials } from "./generatePartials";

const defaultPerceptualParams: PerceptualParams = {
  pitch: 0.5,
  pitchOffset: 60,
  vocalEffort: 0.7,
  vowelHeight: 0.5,
  vowelBackness: 0.5,
  tenseness: 0.5,
  breathiness: 0.02,
  roughness: 0.01,
  vocalTractSize: 0.3,
  isFalsetto: false,
};

const defaultSynthParams: SynthParams =
  generateSynthParams(defaultPerceptualParams);

describe("generatePartials", () => {
  it("passes frequencies that are multiples of f0 to getFrequencyResponse", async () => {
    const { Voice } = await import("cantor-digitalis");
    const spy = vi.spyOn(Voice, "getFrequencyResponse");

    const partialsCount = 8;
    generatePartials(defaultSynthParams, partialsCount);

    const f0 = defaultSynthParams.f0;

    expect(spy).toHaveBeenCalledOnce();
    const frequencies = spy.mock.calls[0][0];
    expect(frequencies).toHaveLength(partialsCount);
    for (let i = 0; i < partialsCount; i++) {
      expect(frequencies[i]).toBeCloseTo(f0 * (i + 1));
    }

    spy.mockRestore();
  });

  it("returns arrays of the requested length", () => {
    const { real, imag } = generatePartials(defaultSynthParams, 16);
    expect(real).toHaveLength(16);
    expect(imag).toHaveLength(16);
  });

  it("returns all zeros for imag", () => {
    const { imag } = generatePartials(defaultSynthParams, 16);
    expect(imag.every((v) => v === 0)).toBe(true);
  });

  it("returns real values that are not all zero", () => {
    const { real } = generatePartials(defaultSynthParams, 16);
    expect(real.some((v) => v !== 0)).toBe(true);
  });
});
