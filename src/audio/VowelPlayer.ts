import {
  generateSynthParams,
  type PerceptualParams,
  type SynthOptions,
} from "cantor-digitalis";
import { generatePartials } from "./generatePartials";
import { englishVowelTable } from "./vowels";

export const defaultSynthOptions: SynthOptions = {
  vowelTable: englishVowelTable,
  harmonicCoincidenceAttenuation: true,
};

type ActiveVoice = { oscillator: OscillatorNode; gate: GainNode };

export class VowelPlayer {
  private readonly ctx: AudioContext;
  private readonly options: SynthOptions | undefined;
  private readonly masterGain: GainNode;
  private activeVoices: ActiveVoice[];

  constructor(ctx: AudioContext, options?: SynthOptions) {
    this.ctx = ctx;
    this.options = { ...defaultSynthOptions, ...options };
    this.masterGain = ctx.createGain();
    this.masterGain.connect(ctx.destination);
    this.activeVoices = [];
  }

  setGain(value: number): void {
    this.masterGain.gain.value = value;
  }

  play(params: PerceptualParams | PerceptualParams[], { rampTime = 0.015 } = {}): void {
    this.stop({ rampTime });
    const paramsArray = Array.isArray(params) ? params : [params];
    this.startVoices(paramsArray, rampTime, paramsArray.length);
  }

  addVoices(params: PerceptualParams | PerceptualParams[], { rampTime = 0.015, totalVoiceCount }: { rampTime?: number; totalVoiceCount?: number } = {}): void {
    const paramsArray = Array.isArray(params) ? params : [params];
    this.startVoices(paramsArray, rampTime, totalVoiceCount ?? paramsArray.length);
  }

  private startVoices(paramsArray: PerceptualParams[], rampTime: number, voiceCount: number): void {
    for (const p of paramsArray) {
      const synthParams = generateSynthParams(p, this.options);
      const { real, imag } = generatePartials(synthParams);

      const periodicWave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: true });
      const oscillator = this.ctx.createOscillator();
      oscillator.setPeriodicWave(periodicWave);
      oscillator.frequency.value = synthParams.f0;

      const gate = this.ctx.createGain();
      gate.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gate.gain.linearRampToValueAtTime(
        0.2 / voiceCount,
        this.ctx.currentTime + rampTime,
      );

      oscillator.connect(gate);
      gate.connect(this.masterGain);
      oscillator.start();

      this.activeVoices.push({ oscillator, gate });
    }
  }

  stop({ rampTime = 0.015 } = {}): void {
    const now = this.ctx.currentTime;

    for (const { oscillator, gate } of this.activeVoices) {
      gate.gain.cancelScheduledValues(now);
      gate.gain.setValueAtTime(gate.gain.value, now);
      gate.gain.linearRampToValueAtTime(0.001, now + rampTime);
      oscillator.stop(now + rampTime);
      oscillator.onended = () => {
        gate.disconnect();
        oscillator.disconnect();
      };
    }

    this.activeVoices = [];
  }
}
