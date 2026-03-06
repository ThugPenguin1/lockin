import {
  Task,
  EnergyCheckin,
  MoodCheckin,
  FocusSession,
  StudySession,
  JournalEntry,
  UserProfile,
} from "./types";
import { getGardenLevel } from "./xp";

const PREFIX = "circadian_";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getTimeOffset(): number {
  if (!isClient()) return 0;
  try {
    const raw = localStorage.getItem(PREFIX + "time_offset");
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function setTimeOffset(ms: number): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(PREFIX + "time_offset", String(ms));
  } catch {}
}

export function getSimulatedNow(): Date {
  return new Date(Date.now() + getTimeOffset());
}

function getItem<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

function defaultProfile(): UserProfile {
  return {
    name: "",
    xp: 0,
    gardenLevel: 1,
    streakCount: 0,
    lastActiveDate: "",
    currentEnergy: 3,
    onboardingComplete: false,
  };
}

export function getProfile(): UserProfile {
  return getItem<UserProfile>("profile", defaultProfile());
}

export function saveProfile(profile: UserProfile): void {
  setItem("profile", profile);
}

export function getTasks(): Task[] {
  return getItem<Task[]>("tasks", []);
}

export function saveTask(task: Task): void {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === task.id);
  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }
  setItem("tasks", tasks);
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index >= 0) {
    tasks[index] = { ...tasks[index], ...updates };
    setItem("tasks", tasks);
  }
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter((t) => t.id !== id);
  setItem("tasks", tasks);
}

export function getEnergyCheckins(): EnergyCheckin[] {
  return getItem<EnergyCheckin[]>("energyCheckins", []);
}

export function saveEnergyCheckin(checkin: EnergyCheckin): void {
  const checkins = getEnergyCheckins();
  checkins.push(checkin);
  setItem("energyCheckins", checkins);
  const profile = getProfile();
  profile.currentEnergy = checkin.level;
  saveProfile(profile);
}

export function getMoodCheckins(): MoodCheckin[] {
  return getItem<MoodCheckin[]>("moodCheckins", []);
}

export function saveMoodCheckin(checkin: MoodCheckin): void {
  const checkins = getMoodCheckins();
  checkins.push(checkin);
  setItem("moodCheckins", checkins);
}

export function getFocusSessions(): FocusSession[] {
  return getItem<FocusSession[]>("focusSessions", []);
}

export function saveFocusSession(session: FocusSession): void {
  const sessions = getFocusSessions();
  sessions.push(session);
  setItem("focusSessions", sessions);
}

export function getStudySessions(): StudySession[] {
  return getItem<StudySession[]>("studySessions", []);
}

export function saveStudySession(session: StudySession): void {
  const sessions = getStudySessions();
  sessions.push(session);
  setItem("studySessions", sessions);
}

export function getJournalEntries(): JournalEntry[] {
  return getItem<JournalEntry[]>("journalEntries", []);
}

export function saveJournalEntry(entry: JournalEntry): void {
  const entries = getJournalEntries();
  entries.push(entry);
  setItem("journalEntries", entries);
}

export function addXP(amount: number): UserProfile {
  const profile = getProfile();
  profile.xp += amount;

  const today = getSimulatedNow().toISOString().split("T")[0];
  if (profile.lastActiveDate && profile.lastActiveDate !== today) {
    const lastDate = new Date(profile.lastActiveDate);
    const diff = Math.floor(
      (new Date(today).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) {
      profile.streakCount += 1;
    } else if (diff > 1) {
      profile.streakCount = 1;
    }
  } else if (!profile.lastActiveDate) {
    profile.streakCount = 1;
  }
  profile.lastActiveDate = today;

  const gardenInfo = getGardenLevel(profile.xp);
  profile.gardenLevel = gardenInfo.level;

  saveProfile(profile);
  return profile;
}
