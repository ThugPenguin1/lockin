import type { EnergyCheckin, SleepQuality } from "./types";
import { getSimulatedNow } from "./storage";

export interface EnergyPatterns {
  averageEnergyByHour: Record<number, number>;
  peakHours: number[];
  dipHours: number[];
  postActivityEffect: Record<string, number>;
  sleepImpact: Record<string, number>;
  currentTrend: "rising" | "falling" | "stable";
  totalCheckins: number;
  todaySleep: SleepQuality | null;
}

export function getEnergyPatterns(checkins: EnergyCheckin[]): EnergyPatterns {
  const hourBuckets: Record<number, number[]> = {};
  const activityBuckets: Record<string, number[]> = {};
  const sleepDayEnergy: Record<string, number[]> = {};

  const now = getSimulatedNow();
  const todayStr = now.toISOString().split("T")[0];

  let todaySleep: SleepQuality | null = null;

  for (const c of checkins) {
    const hour = c.hourOfDay ?? new Date(c.timestamp).getHours();
    if (!hourBuckets[hour]) hourBuckets[hour] = [];
    hourBuckets[hour].push(c.level);

    if (c.lastActivity) {
      if (!activityBuckets[c.lastActivity]) activityBuckets[c.lastActivity] = [];
      activityBuckets[c.lastActivity].push(c.level);
    }

    if (c.sleepQuality) {
      const day = c.timestamp.split("T")[0];
      if (day === todayStr) todaySleep = c.sleepQuality;

      const dayCheckins = checkins.filter((x) => x.timestamp.startsWith(day));
      const dayAvg = dayCheckins.reduce((s, x) => s + x.level, 0) / dayCheckins.length;
      if (!sleepDayEnergy[c.sleepQuality]) sleepDayEnergy[c.sleepQuality] = [];
      sleepDayEnergy[c.sleepQuality].push(dayAvg);
    }
  }

  const averageEnergyByHour: Record<number, number> = {};
  for (const [h, vals] of Object.entries(hourBuckets)) {
    averageEnergyByHour[Number(h)] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const hourEntries = Object.entries(averageEnergyByHour)
    .map(([h, avg]) => ({ hour: Number(h), avg }));
  hourEntries.sort((a, b) => b.avg - a.avg);
  const peakHours = hourEntries.slice(0, 3).map((e) => e.hour);
  hourEntries.sort((a, b) => a.avg - b.avg);
  const dipHours = hourEntries.slice(0, 3).map((e) => e.hour);

  const postActivityEffect: Record<string, number> = {};
  for (const [act, vals] of Object.entries(activityBuckets)) {
    postActivityEffect[act] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const sleepImpact: Record<string, number> = {};
  for (const [q, vals] of Object.entries(sleepDayEnergy)) {
    sleepImpact[q] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const todayCheckins = checkins
    .filter((c) => c.timestamp.startsWith(todayStr))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const last3 = todayCheckins.slice(-3);
  let currentTrend: "rising" | "falling" | "stable" = "stable";
  if (last3.length >= 2) {
    const first = last3[0].level;
    const last = last3[last3.length - 1].level;
    if (last - first >= 1) currentTrend = "rising";
    else if (first - last >= 1) currentTrend = "falling";
  }

  return {
    averageEnergyByHour,
    peakHours,
    dipHours,
    postActivityEffect,
    sleepImpact,
    currentTrend,
    totalCheckins: checkins.length,
    todaySleep,
  };
}

export function predictCurrentEnergy(
  checkins: EnergyCheckin[]
): { predictedLevel: number; confidence: "low" | "medium" | "high"; reason: string } {
  if (checkins.length < 3) {
    return { predictedLevel: 3, confidence: "low", reason: "Not enough data yet — defaulting to moderate energy." };
  }

  const patterns = getEnergyPatterns(checkins);
  const currentHour = getSimulatedNow().getHours();
  const hourAvg = patterns.averageEnergyByHour[currentHour];

  if (!hourAvg) {
    const allAvg = checkins.reduce((s, c) => s + c.level, 0) / checkins.length;
    return {
      predictedLevel: Math.round(allAvg),
      confidence: "low",
      reason: `No data for ${currentHour}:00 yet. Using your overall average.`,
    };
  }

  let predicted = hourAvg;
  let confidence: "low" | "medium" | "high" = checkins.length >= 15 ? "high" : "medium";

  if (patterns.todaySleep) {
    const sleepAvg = patterns.sleepImpact[patterns.todaySleep];
    if (sleepAvg) {
      const overallAvg = checkins.reduce((s, c) => s + c.level, 0) / checkins.length;
      const sleepBoost = sleepAvg - overallAvg;
      predicted += sleepBoost * 0.3;
    }
  }

  predicted = Math.max(1, Math.min(5, Math.round(predicted)));

  const reason = `Based on your typical energy at ${currentHour}:00${
    patterns.todaySleep ? ` and your ${patterns.todaySleep} sleep last night` : ""
  }.`;

  return { predictedLevel: predicted, confidence, reason };
}
