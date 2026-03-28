export interface CoverTheme {
  primary: string;
  secondary: string;
  glow: string;
  shadow: string;
}

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const toRgb = (channels: [number, number, number]) =>
  `rgb(${clampChannel(channels[0])}, ${clampChannel(channels[1])}, ${clampChannel(channels[2])})`;

const mix = (base: [number, number, number], target: [number, number, number], amount: number): [number, number, number] => [
  base[0] + (target[0] - base[0]) * amount,
  base[1] + (target[1] - base[1]) * amount,
  base[2] + (target[2] - base[2]) * amount
];

const luminance = ([red, green, blue]: [number, number, number]) =>
  0.2126 * red + 0.7152 * green + 0.0722 * blue;

const fallbackTheme: CoverTheme = {
  primary: "rgb(108, 78, 216)",
  secondary: "rgb(46, 28, 94)",
  glow: "rgba(152, 106, 255, 0.34)",
  shadow: "rgba(18, 10, 34, 0.92)"
};

const toTheme = (dominant: [number, number, number]): CoverTheme => {
  const boosted = luminance(dominant) < 88 ? mix(dominant, [220, 210, 255], 0.24) : mix(dominant, [20, 16, 34], 0.18);
  const secondary = mix(boosted, [18, 10, 38], 0.68);
  const glow = mix(boosted, [185, 120, 255], 0.2);

  return {
    primary: toRgb(boosted),
    secondary: toRgb(secondary),
    glow: `rgba(${clampChannel(glow[0])}, ${clampChannel(glow[1])}, ${clampChannel(glow[2])}, 0.34)`,
    shadow: `rgba(${clampChannel(secondary[0] * 0.42)}, ${clampChannel(secondary[1] * 0.4)}, ${clampChannel(secondary[2] * 0.62)}, 0.94)`
  };
};

export const extractCoverTheme = async (coverUrl: string): Promise<CoverTheme> => {
  if (typeof window === "undefined") {
    return fallbackTheme;
  }

  return new Promise<CoverTheme>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          resolve(fallbackTheme);
          return;
        }

        const sampleWidth = 48;
        const sampleHeight = 48;
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;
        context.drawImage(image, 0, 0, sampleWidth, sampleHeight);

        const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);
        let red = 0;
        let green = 0;
        let blue = 0;
        let weightSum = 0;

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3] ?? 0;
          if (alpha < 24) {
            continue;
          }

          const pixel: [number, number, number] = [
            data[index] ?? 0,
            data[index + 1] ?? 0,
            data[index + 2] ?? 0
          ];
          const weight = Math.max(0.35, Math.min(1.8, luminance(pixel) / 140));
          red += pixel[0] * weight;
          green += pixel[1] * weight;
          blue += pixel[2] * weight;
          weightSum += weight;
        }

        if (weightSum === 0) {
          resolve(fallbackTheme);
          return;
        }

        resolve(
          toTheme([
            red / weightSum,
            green / weightSum,
            blue / weightSum
          ])
        );
      } catch {
        resolve(fallbackTheme);
      }
    };
    image.onerror = () => resolve(fallbackTheme);
    image.src = coverUrl;
  });
};

export const getFallbackCoverTheme = () => fallbackTheme;
