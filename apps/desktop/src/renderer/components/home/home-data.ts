export const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const heatmapRows = ["00", "04", "08", "12", "16", "20", "24"] as const;

export const listeningHeatmap = [
  [0.08, 0.12, 0.22, 0.14, 0.18, 0.12, 0.26],
  [0.24, 0.16, 0.42, 0.2, 0.34, 0.16, 0.46],
  [0.36, 0.28, 0.58, 0.3, 0.52, 0.24, 0.62],
  [0.3, 0.42, 0.72, 0.38, 0.76, 0.34, 0.82],
  [0.12, 0.18, 0.56, 0.26, 0.54, 0.16, 0.68],
  [0.52, 0.16, 0.44, 0.2, 0.32, 0.14, 0.5],
  [0.72, 0.12, 0.28, 0.1, 0.2, 0.08, 0.36]
] as const;

export const listeningTrendRanges = ["7D", "30D", "Year"] as const;

export const listeningTrendSeries = {
  "7D": [
    { label: "Mon", hours: 2.4 },
    { label: "Tue", hours: 2.6 },
    { label: "Wed", hours: 2.1 },
    { label: "Thu", hours: 4.2 },
    { label: "Fri", hours: 3.1 },
    { label: "Sat", hours: 1.9 },
    { label: "Sun", hours: 5.1 }
  ],
  "30D": [
    { label: "W1", hours: 13.2 },
    { label: "W2", hours: 15.4 },
    { label: "W3", hours: 12.8 },
    { label: "W4", hours: 18.6 }
  ],
  Year: [
    { label: "Jan", hours: 42 },
    { label: "Feb", hours: 38 },
    { label: "Mar", hours: 46 },
    { label: "Apr", hours: 52 },
    { label: "May", hours: 49 },
    { label: "Jun", hours: 61 },
    { label: "Jul", hours: 58 },
    { label: "Aug", hours: 66 },
    { label: "Sep", hours: 63 },
    { label: "Oct", hours: 71 },
    { label: "Nov", hours: 69 },
    { label: "Dec", hours: 78 }
  ]
} as const;

export const annualGoal = {
  progress: 62,
  currentHours: 186,
  targetHours: 300,
  note: "You are 24 hours ahead of your 2023 pace."
} as const;

export const listeningMetrics = [
  {
    label: "Peak Listening",
    value: "19:00 - 23:00",
    accent: "82%",
    trend: [42, 38, 46, 51, 58, 62, 59]
  },
  {
    label: "Consecutive Days",
    value: "14 Days",
    accent: "Focus",
    trend: [18, 22, 26, 25, 31, 35, 39]
  },
  {
    label: "Monthly Growth",
    value: "+12%",
    accent: "Momentum",
    trend: [22, 24, 23, 26, 31, 34, 37]
  }
] as const;

export const audioQualityData = [
  { name: "FLAC / APE", value: 60 },
  { name: "MP3", value: 25 },
  { name: "Hi-Res", value: 15 }
] as const;

export const musicEraData = [
  { era: "80s", count: 12 },
  { era: "90s", count: 18 },
  { era: "00s", count: 24 },
  { era: "10s", count: 36 },
  { era: "20s", count: 54 }
] as const;

export const songLengthData = [
  { bucket: "< 1 min", detail: "Shorts", value: 12 },
  { bucket: "3 - 5 min", detail: "Standard", value: 74 },
  { bucket: "10 min +", detail: "Epics", value: 14 }
] as const;
