export const ENERGY_CONFIG = {
  deep: {
    color: "#EF4444",
    bg: "bg-red-500/20",
    text: "text-red-400",
    label: "Deep Focus",
    emoji: "🔴",
  },
  medium: {
    color: "#F59E0B",
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    label: "Medium Focus",
    emoji: "🟡",
  },
  light: {
    color: "#10B981",
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    label: "Light",
    emoji: "🟢",
  },
  creative: {
    color: "#8B5CF6",
    bg: "bg-violet-500/20",
    text: "text-violet-400",
    label: "Creative",
    emoji: "🟣",
  },
} as const;

export type EnergyTag = keyof typeof ENERGY_CONFIG;

export const MOOD_CONFIG = {
  sunny: { emoji: "☀️", label: "Great", color: "text-yellow-400" },
  partly_cloudy: { emoji: "⛅", label: "Okay", color: "text-gray-400" },
  rainy: { emoji: "🌧️", label: "Struggling", color: "text-blue-400" },
  stormy: { emoji: "⛈️", label: "Need support", color: "text-indigo-400" },
} as const;

export type MoodType = keyof typeof MOOD_CONFIG;

export const TIMER_DURATIONS: Record<number, { focus: number; break: number }> = {
  5: { focus: 50, break: 10 },
  4: { focus: 40, break: 8 },
  3: { focus: 30, break: 7 },
  2: { focus: 20, break: 5 },
  1: { focus: 10, break: 5 },
};

export const ENERGY_LEVEL_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Peak",
};
