"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getProfile, getTasks, saveFocusSession, addXP, updateTask, getSimulatedNow } from "@/lib/storage";
import { XP_REWARDS } from "@/lib/xp";
import { TIMER_DURATIONS, ENERGY_LEVEL_LABELS } from "@/lib/constants";
import { Play, Pause, Square, RotateCcw, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

type TimerState = "idle" | "running" | "paused" | "break" | "complete";

export default function FocusTimer() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [state, setState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [taskTitle, setTaskTitle] = useState("Free Focus");
  const [energy, setEnergy] = useState(3);
  const [sound, setSound] = useState("Silence");
  const [sessionSaved, setSessionSaved] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<string>("");
  const currentTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    const profile = getProfile();
    setEnergy(profile.currentEnergy);
    const duration = TIMER_DURATIONS[profile.currentEnergy] || TIMER_DURATIONS[3];
    const secs = duration.focus * 60;
    setSecondsLeft(secs);
    setTotalSeconds(secs);

    if (taskId) {
      const tasks = getTasks();
      const found = tasks.find((t) => t.id === taskId);
      if (found) {
        setTaskTitle(found.title);
        currentTaskIdRef.current = found.id;
      }
    }
  }, [taskId]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const start = useCallback(() => {
    setState("running");
    startTimeRef.current = getSimulatedNow().toISOString();
    setSessionSaved(false);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setState("complete");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
    setState("paused");
  }, [clearTimer]);

  const resume = useCallback(() => {
    setState("running");
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setState("complete");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    const duration = TIMER_DURATIONS[energy] || TIMER_DURATIONS[3];
    const secs = duration.focus * 60;
    setSecondsLeft(secs);
    setTotalSeconds(secs);
    setState("idle");
    setSessionSaved(false);
  }, [clearTimer, energy]);

  const saveSession = useCallback(() => {
    if (sessionSaved) return;
    const duration = TIMER_DURATIONS[energy] || TIMER_DURATIONS[3];
    saveFocusSession({
      id: crypto.randomUUID(),
      taskId: currentTaskIdRef.current,
      taskTitle,
      durationMinutes: duration.focus,
      energyAtStart: energy,
      completed: true,
      startedAt: startTimeRef.current,
      endedAt: getSimulatedNow().toISOString(),
    });
    addXP(XP_REWARDS.FOCUS_SESSION);
    setSessionSaved(true);
  }, [energy, taskTitle, sessionSaved]);

  useEffect(() => {
    if (state === "complete" && !sessionSaved) {
      saveSession();
    }
  }, [state, sessionSaved, saveSession]);

  const markTaskComplete = useCallback(() => {
    if (currentTaskIdRef.current) {
      updateTask(currentTaskIdRef.current, {
        isCompleted: true,
        completedAt: getSimulatedNow().toISOString(),
      });
      addXP(XP_REWARDS.TASK_COMPLETE);
    }
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const duration = TIMER_DURATIONS[energy] || TIMER_DURATIONS[3];

  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference - (progress / 100) * circumference;

  const sounds = ["Rain", "Forest", "Silence"];

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-base text-slate-400">{taskTitle}</CardTitle>
          <p className="text-xs text-slate-500">
            {duration.focus}min focus / {duration.break}min break (adapted for{" "}
            {ENERGY_LEVEL_LABELS[energy]} energy)
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="relative w-64 h-64">
            <svg className="w-64 h-64 -rotate-90" viewBox="0 0 260 260">
              <circle
                cx="130"
                cy="130"
                r="120"
                stroke="#334155"
                strokeWidth="8"
                fill="none"
              />
              <motion.circle
                cx="130"
                cy="130"
                r="120"
                stroke="#38bdf8"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 0.5, ease: "linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-mono font-bold text-slate-50">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
              <span className="text-xs text-slate-500 mt-1 capitalize">
                {state === "idle" ? "ready" : state}
              </span>
            </div>
          </div>

          {state === "complete" ? (
            <div className="text-center space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-4xl"
              >
                🎉
              </motion.div>
              <p className="text-sky-400 font-medium">
                Session complete! +{XP_REWARDS.FOCUS_SESSION} XP
              </p>
              {currentTaskIdRef.current && (
                <Button size="sm" onClick={markTaskComplete}>
                  Mark task as done
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="h-3 w-3 mr-1" /> New Session
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {state === "idle" && (
                <Button onClick={start} size="lg" className="gap-2">
                  <Play className="h-4 w-4" /> Start Focus
                </Button>
              )}
              {state === "running" && (
                <>
                  <Button onClick={pause} variant="secondary" size="lg" className="gap-2">
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                  <Button onClick={reset} variant="ghost" size="icon">
                    <Square className="h-4 w-4" />
                  </Button>
                </>
              )}
              {state === "paused" && (
                <>
                  <Button onClick={resume} size="lg" className="gap-2">
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                  <Button onClick={reset} variant="ghost" size="icon">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Volume2 className="h-3 w-3" />
            {sounds.map((s) => (
              <button
                key={s}
                onClick={() => setSound(s)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  sound === s ? "bg-slate-700 text-slate-300" : "hover:text-slate-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
