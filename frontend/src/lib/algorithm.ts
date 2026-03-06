import { Task } from "./types";
import { getSimulatedNow } from "./storage";
import type { EnergyPatterns } from "./energyAnalysis";

const ENERGY_TAG_MAP: Record<number, string[]> = {
  5: ["deep", "creative"],
  4: ["deep", "medium"],
  3: ["medium", "creative"],
  2: ["medium", "light"],
  1: ["light"],
};

export function getRecommendedTask(
  tasks: Task[],
  currentEnergy: number,
  patterns?: EnergyPatterns | null,
  currentHour?: number
): { task: Task; reason: string } | null {
  const incomplete = tasks.filter((t) => !t.isCompleted);
  if (incomplete.length === 0) return null;

  const energyLevel = Math.max(1, Math.min(5, Math.round(currentEnergy)));
  const compatibleTags = ENERGY_TAG_MAP[energyLevel] ?? ["light"];
  const hour = currentHour ?? getSimulatedNow().getHours();
  const today = getSimulatedNow();
  today.setHours(0, 0, 0, 0);

  const scored = incomplete.map((task) => {
    let score = 0;

    if (compatibleTags.includes(task.energyTag)) score += 50;

    if (task.priority === "high") score += 30;
    else if (task.priority === "normal") score += 15;
    else score += 5;

    if (task.dueDate) {
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) score += 40;
      else if (diffDays <= 1) score += 25;
      else if (diffDays <= 3) score += 15;
    }

    score -= task.skipCount * 5;

    if (patterns) {
      const isPeak = patterns.peakHours.includes(hour);
      const isDip = patterns.dipHours.includes(hour);
      if (isPeak && task.energyTag === "deep") score += 20;
      if (isDip && task.energyTag === "light") score += 15;
      if (patterns.currentTrend === "rising" && (task.energyTag === "deep" || task.energyTag === "medium")) score += 10;
      if (patterns.currentTrend === "falling" && task.energyTag === "deep") score -= 10;
    }

    if (task.estimatedMinutes && task.estimatedMinutes <= 30 && energyLevel <= 2) score += 10;

    return { task, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top) return null;

  const reason = buildReason(top.task, energyLevel, patterns ?? null, hour);
  return { task: top.task, reason };
}

function buildReason(task: Task, energy: number, patterns: EnergyPatterns | null, hour: number): string {
  if (!patterns || patterns.totalCheckins < 5) {
    if (energy >= 4) return "Your energy is high right now — perfect time to tackle focused work before it dips.";
    if (energy <= 2) return "Your energy is low. This lighter task is a good match — save deep work for when you recharge.";
    return "This task matches your current energy level. Knocking it out keeps your momentum going.";
  }

  const parts: string[] = [];
  const isPeak = patterns.peakHours.includes(hour);
  const isDip = patterns.dipHours.includes(hour);
  const timeLabel = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  if (isPeak && task.energyTag === "deep") {
    parts.push(`This is one of your peak energy hours (around ${hour}:00). Deep focus tasks like this are best done now.`);
  } else if (isDip && task.energyTag === "light") {
    const peakStr = patterns.peakHours.slice(0, 2).map(h => `${h}:00`).join(" & ");
    parts.push(`Your energy usually dips around this ${timeLabel} hour. This light task fits perfectly — your peaks are around ${peakStr}.`);
  } else if (energy >= 4) {
    parts.push(`Your energy is at ${energy}/5 right now — you're in a strong zone for this kind of work.`);
  } else if (energy <= 2) {
    parts.push(`You're at ${energy}/5 energy. This manageable task keeps you productive without overloading.`);
  }

  if (patterns.currentTrend === "rising") parts.push("Your energy has been rising — good time to push forward.");
  if (patterns.currentTrend === "falling") parts.push("Your energy trend is dipping, so we picked something lighter.");

  if (patterns.sleepImpact && patterns.todaySleep) {
    const avg = patterns.sleepImpact[patterns.todaySleep];
    if (avg && avg >= 3.5) parts.push(`You slept ${patterns.todaySleep} last night, which usually means a good energy day for you.`);
  }

  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const now = getSimulatedNow();
    const diff = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) parts.push("This task is overdue — getting it done first reduces stress.");
    else if (diff <= 1) parts.push("This is due very soon — tackling it now prevents last-minute pressure.");
  }

  return parts.length > 0 ? parts.join(" ") : "This task is the best match for your current energy and schedule.";
}
