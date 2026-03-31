export interface SpectrumFrame {
  bars: number[];
  energy: number;
  pulse: number;
  lowBandEnergy?: number;
  timestamp: number;
}

export interface SpectrumEngineOptions {
  barCount: number;
  minNormalized: number;
  maxNormalized: number;
  gamma: number;
  attack: number;
  release: number;
  aggregation: "peak" | "hybrid";
  spatialSmoothingStrength: number;
  highBandSmoothingBoost: number;
  maxRisePerFrame: number;
  maxFallPerFrame: number;
  highBandDamp: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clamp01 = (value: number) => clamp(value, 0, 1);

const defaultOptions: SpectrumEngineOptions = {
  barCount: 64,
  minNormalized: 0.03,
  maxNormalized: 0.98,
  gamma: 1.12,
  attack: 0.5,
  release: 0.2,
  aggregation: "hybrid",
  spatialSmoothingStrength: 0.36,
  highBandSmoothingBoost: 0.18,
  maxRisePerFrame: 0.13,
  maxFallPerFrame: 0.09,
  highBandDamp: 0.07
};

const normalizeSample = (sample: number, options: SpectrumEngineOptions) => {
  const normalized = clamp(sample / 255, 0, 1);
  const ranged = clamp(
    (normalized - options.minNormalized) / Math.max(options.maxNormalized - options.minNormalized, 1e-4),
    0,
    1
  );
  return Math.pow(ranged, options.gamma);
};

const toBucketRange = (index: number, totalBars: number, sampleLength: number) => {
  const startRatio = Math.pow(index / totalBars, 1.85);
  const endRatio = Math.pow((index + 1) / totalBars, 1.85);
  const start = Math.floor(startRatio * (sampleLength - 1));
  const end = Math.max(start + 1, Math.floor(endRatio * sampleLength));
  return [start, Math.min(sampleLength, end)] as const;
};

const KERNEL = [1, 2, 3, 2, 1] as const;
const KERNEL_RADIUS = 2;
const KERNEL_WEIGHT_SUM = KERNEL.reduce((sum, value) => sum + value, 0);

const toHybridEnergySample = (
  frequencyData: Uint8Array<ArrayBufferLike>,
  start: number,
  end: number,
  histogram: Uint16Array
) => {
  if (end <= start) {
    return 0;
  }

  histogram.fill(0);
  let peak = 0;
  let sumSquares = 0;
  const sampleCount = end - start;

  for (let cursor = start; cursor < end; cursor += 1) {
    const sample = frequencyData[cursor] ?? 0;
    peak = Math.max(peak, sample);
    sumSquares += sample * sample;
    histogram[sample] += 1;
  }

  const rms = Math.sqrt(sumSquares / Math.max(sampleCount, 1));
  const targetRank = Math.max(1, Math.ceil(sampleCount * 0.95));
  let cumulative = 0;
  let p95 = peak;
  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value] ?? 0;
    if (cumulative >= targetRank) {
      p95 = value;
      break;
    }
  }

  return 0.45 * rms + 0.25 * p95 + 0.3 * peak;
};

const applySpatialSmoothing = (bars: number[], options: SpectrumEngineOptions) => {
  if (bars.length <= 2 || options.spatialSmoothingStrength <= 0) {
    return bars;
  }

  const smoothed = bars.slice();
  const lastIndex = bars.length - 1;

  for (let index = 0; index < bars.length; index += 1) {
    let weighted = 0;
    let weights = 0;

    for (let offset = -KERNEL_RADIUS; offset <= KERNEL_RADIUS; offset += 1) {
      const kernelWeight = KERNEL[offset + KERNEL_RADIUS] ?? 0;
      const cursor = clamp(index + offset, 0, lastIndex);
      weighted += (bars[cursor] ?? 0) * kernelWeight;
      weights += kernelWeight;
    }

    const neighborhood = weighted / Math.max(weights || KERNEL_WEIGHT_SUM, 1e-6);
    const bandRatio = lastIndex <= 0 ? 0 : index / lastIndex;
    const highBandFactor = bandRatio <= 0.7 ? 0 : (bandRatio - 0.7) / 0.3;
    const blend = clamp01(
      options.spatialSmoothingStrength * (1 + options.highBandSmoothingBoost * highBandFactor)
    );

    smoothed[index] = bars[index]! * (1 - blend) + neighborhood * blend;
  }

  return smoothed;
};

const applyTemporalSmoothing = (
  previousBars: number[],
  targetBars: number[],
  options: SpectrumEngineOptions
) => {
  const maxRise = Math.max(0, options.maxRisePerFrame);
  const maxFall = Math.max(0, options.maxFallPerFrame);

  return previousBars.map((previous, index) => {
    const target = targetBars[index] ?? 0;
    const smoothing = target >= previous ? options.attack : options.release;
    let next = previous + (target - previous) * smoothing;
    const delta = next - previous;

    if (delta > maxRise) {
      next = previous + maxRise;
    } else if (delta < -maxFall) {
      next = previous - maxFall;
    }

    if (target >= previous) {
      next = Math.min(next, target);
    } else {
      next = Math.max(next, target);
    }

    return clamp01(next);
  });
};

export class SpectrumEngine {
  private readonly options: SpectrumEngineOptions;

  private previousBars: number[];
  private readonly histogram = new Uint16Array(256);
  private previousLowBandEnergy = 0;
  private previousPulse = 0;

  constructor(options: Partial<SpectrumEngineOptions> = {}) {
    this.options = {
      ...defaultOptions,
      ...options
    };
    this.previousBars = Array.from({ length: this.options.barCount }, () => 0);
  }

  getFrame(timestamp = Date.now()): SpectrumFrame {
    const energy =
      this.previousBars.reduce((sum, value) => sum + value, 0) / Math.max(this.previousBars.length, 1);
    return {
      bars: [...this.previousBars],
      energy,
      pulse: this.previousPulse,
      lowBandEnergy: this.previousLowBandEnergy,
      timestamp
    };
  }

  reset() {
    this.previousBars = this.previousBars.map(() => 0);
    this.previousLowBandEnergy = 0;
    this.previousPulse = 0;
  }

  update(frequencyData: Uint8Array<ArrayBufferLike>, timestamp = Date.now()): SpectrumFrame {
    if (!frequencyData.length) {
      return this.getFrame(timestamp);
    }

    const rawTargets = this.previousBars.map((_, index) => {
      const [start, end] = toBucketRange(index, this.options.barCount, frequencyData.length);
      let sourceSample = 0;

      if (this.options.aggregation === "peak") {
        for (let cursor = start; cursor < end; cursor += 1) {
          sourceSample = Math.max(sourceSample, frequencyData[cursor] ?? 0);
        }
      } else {
        sourceSample = toHybridEnergySample(frequencyData, start, end, this.histogram);
      }

      const normalized = normalizeSample(sourceSample, this.options);
      const bandRatio = this.options.barCount <= 1 ? 0 : index / (this.options.barCount - 1);
      const damp = 1 - this.options.highBandDamp * bandRatio * bandRatio;
      return clamp01(normalized * damp);
    });

    const spatialBars = applySpatialSmoothing(rawTargets, this.options);
    const nextBars = applyTemporalSmoothing(this.previousBars, spatialBars, this.options);
    const lowBandCount = Math.max(6, Math.round(nextBars.length * 0.22));
    const lowBandEnergy =
      nextBars
        .slice(0, lowBandCount)
        .reduce((sum, value, index) => sum + value * (1 - index / Math.max(lowBandCount, 1) * 0.35), 0) /
      Math.max(lowBandCount, 1);
    const transient = Math.max(0, lowBandEnergy - this.previousLowBandEnergy);
    const pulseTarget = clamp01(lowBandEnergy * 0.72 + transient * 1.65);
    const pulseDelta = pulseTarget - this.previousPulse;
    const pulseSmoothing = pulseDelta >= 0 ? 0.42 : 0.12;
    const nextPulse = clamp01(this.previousPulse + pulseDelta * pulseSmoothing);

    this.previousBars = nextBars;
    this.previousLowBandEnergy = lowBandEnergy;
    this.previousPulse = nextPulse;
    const energy = nextBars.reduce((sum, value) => sum + value, 0) / Math.max(nextBars.length, 1);
    return {
      bars: [...nextBars],
      energy,
      pulse: nextPulse,
      lowBandEnergy,
      timestamp
    };
  }
}
