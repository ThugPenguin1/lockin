export const XP_REWARDS = {
  TASK_COMPLETE: 10,
  FOCUS_SESSION: 15,
  STUDY_SESSION: 15,
  MOOD_CHECKIN: 5,
  ENERGY_CHECKIN: 3,
  BREATHING: 5,
  JOURNAL: 10,
  REFLEX_GAME: 5,
  STREAK_BONUS: 20,
} as const;

export const GARDEN_LEVELS = [
  { level: 1, xpRequired: 0, name: "Bare Soil", description: "A patch of earth awaits" },
  { level: 2, xpRequired: 50, name: "Seedling", description: "Something is growing" },
  { level: 3, xpRequired: 120, name: "Sprout", description: "Leaves are unfurling" },
  { level: 4, xpRequired: 200, name: "First Bloom", description: "A flower appears" },
  { level: 5, xpRequired: 300, name: "Small Garden", description: "Life is flourishing" },
  { level: 6, xpRequired: 450, name: "Growing Garden", description: "A garden takes shape" },
  { level: 7, xpRequired: 600, name: "Lush Garden", description: "Beauty everywhere" },
  { level: 8, xpRequired: 800, name: "Enchanted Garden", description: "Magic in the air" },
  { level: 9, xpRequired: 1000, name: "Paradise", description: "A world of wonder" },
  { level: 10, xpRequired: 1500, name: "Eden", description: "Perfection achieved" },
] as const;

export function getGardenLevel(xp: number) {
  let current: (typeof GARDEN_LEVELS)[number] = GARDEN_LEVELS[0];
  for (const level of GARDEN_LEVELS) {
    if (xp >= level.xpRequired) {
      current = level;
    } else {
      break;
    }
  }

  const currentIndex = GARDEN_LEVELS.findIndex((l) => l.level === current.level);
  const next = GARDEN_LEVELS[currentIndex + 1];

  const progress = next
    ? ((xp - current.xpRequired) / (next.xpRequired - current.xpRequired)) * 100
    : 100;

  return {
    ...current,
    progress: Math.min(100, Math.max(0, progress)),
    nextLevel: next ?? null,
    currentXP: xp,
  };
}
