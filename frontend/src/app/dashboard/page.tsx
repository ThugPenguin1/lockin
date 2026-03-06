"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import EnergyCheckin from "@/components/EnergyCheckin";
import TheOneThing from "@/components/TheOneThing";
import QuoteCard from "@/components/QuoteCard";
import EnergyWave from "@/components/EnergyWave";
import TaskForm from "@/components/TaskForm";
import BreathingExercise from "@/components/BreathingExercise";
import ReflexGame from "@/components/ReflexGame";
import { getTasks, getEnergyCheckins, getSimulatedNow } from "@/lib/storage";
import { Plus, Brain, Wind, Zap } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [breathOpen, setBreathOpen] = useState(false);
  const [reflexOpen, setReflexOpen] = useState(false);
  const [todayStats, setTodayStats] = useState({ completed: 0, total: 0 });
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    const today = getSimulatedNow().toISOString().split("T")[0];
    const tasks = getTasks();
    const todayTasks = tasks.filter(
      (t) =>
        t.dueDate === today ||
        (t.completedAt && t.completedAt.startsWith(today))
    );
    const completed = todayTasks.filter((t) => t.isCompleted).length;
    setTodayStats({ completed, total: Math.max(todayTasks.length, completed) });

    const checkins = getEnergyCheckins();
    const todayCheckin = checkins.some((c) => c.timestamp.startsWith(today));
    setCheckedIn(todayCheckin);
  }, []);

  const handleCheckin = useCallback(() => {
    setCheckedIn(true);
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {!checkedIn && (
        <EnergyCheckin onCheckin={handleCheckin} onOpenReflex={() => setReflexOpen(true)} />
      )}

      <TheOneThing />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Today&apos;s Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-slate-50">
                {todayStats.completed}
              </span>
              <span className="text-slate-500 text-sm mb-1">
                / {todayStats.total || "—"} tasks
              </span>
            </div>
            <Progress
              value={
                todayStats.total > 0
                  ? (todayStats.completed / todayStats.total) * 100
                  : 0
              }
              className="h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Energy Trend</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <EnergyWave />
          </CardContent>
        </Card>
      </div>

      <QuoteCard />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => setTaskFormOpen(true)}
        >
          <Plus className="h-5 w-5 text-sky-400" />
          <span className="text-xs">Add Task</span>
        </Button>
        <Link href="/dashboard/study" className="contents">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <Brain className="h-5 w-5 text-violet-400" />
            <span className="text-xs">Study Mode</span>
          </Button>
        </Link>
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => setBreathOpen(true)}
        >
          <Wind className="h-5 w-5 text-emerald-400" />
          <span className="text-xs">Breathe</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => setReflexOpen(true)}
        >
          <Zap className="h-5 w-5 text-amber-400" />
          <span className="text-xs">Reflex Test</span>
        </Button>
      </div>

      <TaskForm open={taskFormOpen} onClose={() => setTaskFormOpen(false)} />
      <BreathingExercise open={breathOpen} onClose={() => setBreathOpen(false)} />
      <ReflexGame open={reflexOpen} onClose={() => setReflexOpen(false)} />
    </div>
  );
}
