"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getTimeOffset,
  setTimeOffset,
  getSimulatedNow,
  getProfile,
  saveProfile,
  saveEnergyCheckin,
  saveMoodCheckin,
  saveTask,
  saveFocusSession,
} from "@/lib/storage";
import { getGardenLevel } from "@/lib/xp";
import type { Task } from "@/lib/types";
import { FastForward, RotateCcw, Database } from "lucide-react";

const HOUR = 3600000;
const DAY = 86400000;

function seedDemoData() {
  const now = getSimulatedNow();

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const dayBase = new Date(now.getTime() - dayOffset * DAY);

    const morningHour = 8 + Math.floor(Math.random() * 2);
    const afternoonHour = 13 + Math.floor(Math.random() * 2);
    const eveningHour = 19 + Math.floor(Math.random() * 2);

    const morningEnergy = 3.5 + Math.random() * 1.5;
    const afternoonEnergy = 2 + Math.random() * 1.5;
    const eveningEnergy = 2.5 + Math.random() * 1.5;

    const sleepOptions: ("bad" | "okay" | "well" | "great")[] = ["okay", "well", "well", "great", "great", "okay", "well"];
    const activities: ("just_woke_up" | "been_working" | "ate_meal")[] = ["just_woke_up", "been_working", "ate_meal"];

    [
      { hour: morningHour, energy: morningEnergy, activity: activities[0], isMorning: true },
      { hour: afternoonHour, energy: afternoonEnergy, activity: activities[2], isMorning: false },
      { hour: eveningHour, energy: eveningEnergy, activity: activities[1], isMorning: false },
    ].forEach((entry, i) => {
      const ts = new Date(dayBase);
      ts.setHours(entry.hour, Math.floor(Math.random() * 30), 0, 0);
      saveEnergyCheckin({
        id: crypto.randomUUID(),
        level: Math.round(entry.energy),
        source: "slider",
        reactionTimeMs: null,
        timestamp: ts.toISOString(),
        hourOfDay: entry.hour,
        lastActivity: entry.activity,
        sleepQuality: i === 0 ? sleepOptions[dayOffset] : null,
      });
    });

    const moods: ("sunny" | "partly_cloudy" | "rainy")[] = ["sunny", "partly_cloudy", "sunny", "sunny", "partly_cloudy", "sunny", "sunny"];
    const moodTs = new Date(dayBase);
    moodTs.setHours(9, 0, 0, 0);
    saveMoodCheckin({
      id: crypto.randomUUID(),
      mood: moods[dayOffset],
      note: "",
      timestamp: moodTs.toISOString(),
    });
  }

  const tasks: Omit<Task, "id" | "createdAt">[] = [
    { title: "Write research paper draft", description: "Complete the introduction and methodology sections", energyTag: "deep", priority: "high", dueDate: new Date(now.getTime() + DAY).toISOString().split("T")[0], estimatedMinutes: 90, isCompleted: false, completedAt: null, skipCount: 0 },
    { title: "Study for algorithms exam", description: "Review graph traversal and dynamic programming", energyTag: "deep", priority: "high", dueDate: new Date(now.getTime() + 3 * DAY).toISOString().split("T")[0], estimatedMinutes: 60, isCompleted: false, completedAt: null, skipCount: 0 },
    { title: "Review lecture notes", description: "Go through this week's CS notes", energyTag: "medium", priority: "normal", dueDate: new Date(now.getTime() + 2 * DAY).toISOString().split("T")[0], estimatedMinutes: 30, isCompleted: false, completedAt: null, skipCount: 0 },
    { title: "Reply to emails", description: "Respond to advisor and group project team", energyTag: "light", priority: "normal", dueDate: now.toISOString().split("T")[0], estimatedMinutes: 15, isCompleted: false, completedAt: null, skipCount: 0 },
    { title: "Brainstorm project ideas", description: "Generate 10 concepts for the design sprint", energyTag: "creative", priority: "normal", dueDate: new Date(now.getTime() + 4 * DAY).toISOString().split("T")[0], estimatedMinutes: 25, isCompleted: false, completedAt: null, skipCount: 0 },
  ];

  tasks.forEach((t) => {
    saveTask({
      ...t,
      id: crypto.randomUUID(),
      createdAt: new Date(now.getTime() - 5 * DAY).toISOString(),
    });
  });

  for (let i = 0; i < 3; i++) {
    const sessionDay = new Date(now.getTime() - (i + 1) * DAY);
    sessionDay.setHours(10 + i * 3, 0, 0, 0);
    saveFocusSession({
      id: crypto.randomUUID(),
      taskId: null,
      taskTitle: ["Deep reading session", "Study block", "Writing session"][i],
      durationMinutes: [40, 30, 50][i],
      energyAtStart: [4, 3, 4][i],
      completed: true,
      startedAt: sessionDay.toISOString(),
      endedAt: new Date(sessionDay.getTime() + [40, 30, 50][i] * 60000).toISOString(),
    });
  }

  const profile = getProfile();
  profile.xp = 350;
  profile.gardenLevel = getGardenLevel(350).level;
  profile.streakCount = 5;
  profile.lastActiveDate = now.toISOString().split("T")[0];
  profile.currentEnergy = 4;
  saveProfile(profile);
}

export default function SimulationControls() {
  const [simTime, setSimTime] = useState("");
  const [offset, setOffset] = useState(0);

  const refresh = useCallback(() => {
    const o = getTimeOffset();
    setOffset(o);
    setSimTime(getSimulatedNow().toLocaleString());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const addOffset = useCallback((ms: number) => {
    const newOffset = getTimeOffset() + ms;
    setTimeOffset(newOffset);
    setOffset(newOffset);
    setSimTime(new Date(Date.now() + newOffset).toLocaleString());
    window.location.reload();
  }, []);

  const resetOffset = useCallback(() => {
    setTimeOffset(0);
    setOffset(0);
    setSimTime(new Date().toLocaleString());
    window.location.reload();
  }, []);

  const handleSeed = useCallback(() => {
    seedDemoData();
    window.location.reload();
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur border-t border-slate-700 px-4 py-2">
      <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap text-xs">
        <span className="text-amber-400 font-medium flex items-center gap-1">
          <FastForward className="h-3 w-3" /> Demo Mode
        </span>
        <span className="text-slate-500">
          {offset ? simTime : "Real time"}
        </span>
        <div className="flex gap-1.5 ml-auto">
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => addOffset(2 * HOUR)}>
            +2h
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => addOffset(DAY)}>
            +1 day
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => addOffset(3 * DAY)}>
            +3 days
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-amber-400" onClick={resetOffset}>
            <RotateCcw className="h-3 w-3 mr-0.5" /> Reset
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-emerald-400" onClick={handleSeed}>
            <Database className="h-3 w-3 mr-0.5" /> Seed Data
          </Button>
        </div>
      </div>
    </div>
  );
}
