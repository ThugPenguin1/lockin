export interface Task {
  id: string;
  title: string;
  description: string;
  energyTag: "deep" | "medium" | "light" | "creative";
  priority: "high" | "normal" | "low";
  dueDate: string | null;
  estimatedMinutes: number | null;
  isCompleted: boolean;
  completedAt: string | null;
  skipCount: number;
  createdAt: string;
}

export type LastActivity = "just_woke_up" | "been_working" | "ate_meal" | "exercised" | "been_on_phone" | "just_relaxed" | "other";
export type SleepQuality = "bad" | "okay" | "well" | "great";

export interface EnergyCheckin {
  id: string;
  level: number;
  source: "slider" | "reflex";
  reactionTimeMs: number | null;
  timestamp: string;
  hourOfDay: number;
  lastActivity: LastActivity | null;
  sleepQuality: SleepQuality | null;
}

export interface MoodCheckin {
  id: string;
  mood: "sunny" | "partly_cloudy" | "rainy" | "stormy";
  note: string;
  timestamp: string;
}

export interface FocusSession {
  id: string;
  taskId: string | null;
  taskTitle: string;
  durationMinutes: number;
  energyAtStart: number;
  completed: boolean;
  startedAt: string;
  endedAt: string | null;
}

export interface StudySession {
  id: string;
  topic: string;
  notesInput: string;
  aiChallenge: string;
  userDefense: string;
  scores: {
    accuracy: number;
    completeness: number;
    evidence: number;
    overall: number;
  };
  aiFeedback: {
    strength: string;
    gap: string;
  };
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  type: "freewrite" | "gratitude";
  content: string;
  gratitude1: string;
  gratitude2: string;
  gratitude3: string;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  xp: number;
  gardenLevel: number;
  streakCount: number;
  lastActiveDate: string;
  currentEnergy: number;
  onboardingComplete: boolean;
}
