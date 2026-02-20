import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PerceptualParams, SynthParams } from "cantor-digitalis";
import { VowelPlayer } from "./VowelPlayer";

const defaultParams: PerceptualParams = {
  pitch: 0.5,
  pitchOffset: 60,
  vocalEffort: 0.7,
  vowelHeight: 0.5,
  vowelBackness: 0.5,
  tenseness: 0.5,
  breathiness: 0.02,
  roughness: 0.01,
  vocalTractSize: 0.28,
  isFalsetto: false,
};

const fakeSynthParams: SynthParams = {
  f0: 261.63,
  Fg: 100,
  Bg: 50,
  Ag: 1,
  Tl1: 0,
  Tl2: 0,
  An: 0,
  jitterDepth: 0,
  shimmerDepth: 0,
  formants: [],
  F_BQ: 4700,
  Q_BQ: 0.5,
};

vi.mock("cantor-digitalis", () => ({
  generateSynthParams: vi.fn(() => fakeSynthParams),
}));

vi.mock("./generatePartials", () => ({
  generatePartials: vi.fn(() => ({
    real: new Float32Array([0, 1, 0.5]),
    imag: new Float32Array([0, 0, 0]),
  })),
}));

function createMockGainNode() {
  return {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockOscillatorNode() {
  return {
    frequency: { value: 0 },
    setPeriodicWave: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  };
}

function createMockAudioContext() {
  const destination = {} as AudioDestinationNode;
  const gains: ReturnType<typeof createMockGainNode>[] = [];
  const oscillators: ReturnType<typeof createMockOscillatorNode>[] = [];

  return {
    currentTime: 0,
    destination,
    createGain: vi.fn(() => {
      const g = createMockGainNode();
      gains.push(g);
      return g;
    }),
    createOscillator: vi.fn(() => {
      const o = createMockOscillatorNode();
      oscillators.push(o);
      return o;
    }),
    createPeriodicWave: vi.fn(() => ({}) as PeriodicWave),
    // Expose for assertions
    _gains: gains,
    _oscillators: oscillators,
  };
}

type MockAudioContext = ReturnType<typeof createMockAudioContext>;

let ctx: MockAudioContext;

beforeEach(() => {
  vi.clearAllMocks();
  ctx = createMockAudioContext();
});

describe("VowelPlayer", () => {
  it("connects master gain to destination", () => {
    new VowelPlayer(ctx as unknown as AudioContext);

    expect(ctx.createGain).toHaveBeenCalledOnce();
    const masterGain = ctx._gains[0];
    expect(masterGain.connect).toHaveBeenCalledWith(ctx.destination);
  });

  it("setGain updates master gain value", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.setGain(0.5);

    const masterGain = ctx._gains[0];
    expect(masterGain.gain.value).toBe(0.5);
  });

  it("play(single) creates oscillator with correct f0 and periodic wave", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.play(defaultParams);

    expect(ctx.createOscillator).toHaveBeenCalledOnce();
    expect(ctx.createPeriodicWave).toHaveBeenCalledOnce();

    const osc = ctx._oscillators[0];
    expect(osc.setPeriodicWave).toHaveBeenCalled();
    expect(osc.frequency.value).toBe(fakeSynthParams.f0);
    expect(osc.start).toHaveBeenCalled();
  });

  it("play(single) creates gate with ramp from 0.001 to 0.2", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.play(defaultParams);

    // gains[0] is masterGain, gains[1] is the gate
    const gate = ctx._gains[1];
    expect(gate.gain.setValueAtTime).toHaveBeenCalledWith(0.001, 0);
    expect(gate.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.2,
      0.015,
    );
    expect(gate.connect).toHaveBeenCalledWith(ctx._gains[0]);
  });

  it("play(array) creates one oscillator per entry", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.play([defaultParams, defaultParams, defaultParams]);

    expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
    // 1 master gain + 3 gates
    expect(ctx.createGain).toHaveBeenCalledTimes(4);
  });

  it("stop ramps gates down and schedules oscillator stop", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.play(defaultParams);

    const gate = ctx._gains[1];
    const osc = ctx._oscillators[0];

    player.stop();

    expect(gate.gain.cancelScheduledValues).toHaveBeenCalledWith(0);
    expect(gate.gain.setValueAtTime).toHaveBeenCalledTimes(2);
    expect(gate.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.001,
      0.015,
    );
    expect(osc.stop).toHaveBeenCalledWith(0.015);
  });

  it("stop disconnects via onended", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.play(defaultParams);

    const gate = ctx._gains[1];
    const osc = ctx._oscillators[0];

    player.stop();

    expect(osc.onended).toBeTypeOf("function");
    osc.onended!();

    expect(gate.disconnect).toHaveBeenCalled();
    expect(osc.disconnect).toHaveBeenCalled();
  });

  it("stop with no voices is a no-op", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    expect(() => player.stop()).not.toThrow();
  });

  it("play respects custom rampTime for gate ramp up", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.play(defaultParams, { rampTime: 0.1 });

    const gate = ctx._gains[1];
    expect(gate.gain.setValueAtTime).toHaveBeenCalledWith(0.001, 0);
    expect(gate.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.2, 0.1);
  });

  it("play with custom rampTime also ramps down previous voices with that rampTime", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.play(defaultParams);

    const firstGate = ctx._gains[1];
    const firstOsc = ctx._oscillators[0];

    // play again with a custom rampTime — the implicit stop should use it
    player.play(defaultParams, { rampTime: 0.05 });

    expect(firstGate.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.001,
      0.05,
    );
    expect(firstOsc.stop).toHaveBeenCalledWith(0.05);
  });

  it("stop respects custom rampTime for gate ramp down and oscillator stop", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.play(defaultParams);

    const gate = ctx._gains[1];
    const osc = ctx._oscillators[0];

    player.stop({ rampTime: 0.2 });

    expect(gate.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.001, 0.2);
    expect(osc.stop).toHaveBeenCalledWith(0.2);
  });

  it("stop uses currentTime offset for ramp scheduling", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.play(defaultParams);

    // Advance the mock currentTime
    (ctx as { currentTime: number }).currentTime = 5.0;

    const gate = ctx._gains[1];
    const osc = ctx._oscillators[0];

    player.stop({ rampTime: 0.1 });

    expect(gate.gain.cancelScheduledValues).toHaveBeenCalledWith(5.0);
    expect(gate.gain.setValueAtTime).toHaveBeenLastCalledWith(
      gate.gain.value,
      5.0,
    );
    expect(gate.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.001,
      5.1,
    );
    expect(osc.stop).toHaveBeenCalledWith(5.1);
  });

  it("play after stop works fresh", () => {
    const player = new VowelPlayer(ctx as unknown as AudioContext);
    player.play(defaultParams);
    player.stop();

    // play again
    player.play(defaultParams);

    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
  });
});
