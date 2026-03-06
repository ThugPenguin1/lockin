"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTasks, getProfile, updateTask, getEnergyCheckins, getSimulatedNow } from "@/lib/storage";
import { getRecommendedTask } from "@/lib/algorithm";
import { getEnergyPatterns } from "@/lib/energyAnalysis";
import { ENERGY_CONFIG, ENERGY_LEVEL_LABELS } from "@/lib/constants";
import type { Task } from "@/lib/types";
import { Target, RefreshCw, Play, Plus, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function TheOneThing() {
  const [task, setTask] = useState<Task | null | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [energy, setEnergy] = useState(3);

  const load = useCallback(() => {
    const profile = getProfile();
    const tasks = getTasks();
    const checkins = getEnergyCheckins();
    const patterns = getEnergyPatterns(checkins);
    const currentHour = getSimulatedNow().getHours();
    setEnergy(profile.currentEnergy);
    const result = getRecommendedTask(tasks, profile.currentEnergy, patterns, currentHour);
    if (result) {
      setTask(result.task);
      setReason(result.reason);
    } else {
      setTask(null);
      setReason("");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSkip = useCallback(() => {
    if (!task) return;
    updateTask(task.id, { skipCount: task.skipCount + 1 });
    load();
  }, [task, load]);

  if (task === undefined) return null;

  if (task === null) {
    return (
      <Card className="border-dashed border-slate-600">
        <CardContent className="p-6 text-center">
          <Plus className="h-8 w-8 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 mb-3">Add your first task to get started</p>
          <Link href="/dashboard/tasks">
            <Button size="sm">Add Task</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const config = ENERGY_CONFIG[task.energyTag];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={task.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Card className="border-sky-500/30 bg-gradient-to-br from-slate-800/80 to-slate-800/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Target className="h-3 w-3 text-sky-400" />
              Based on your energy ({ENERGY_LEVEL_LABELS[energy]}):
            </div>
            <h3 className="text-xl font-semibold text-slate-50 mb-3">{task.title}</h3>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className={`${config.bg} ${config.text}`}>
                {config.emoji} {config.label}
              </Badge>
              <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>
                {task.priority}
              </Badge>
              {task.dueDate && (
                <Badge variant="outline" className="text-xs">
                  Due {new Date(task.dueDate).toLocaleDateString()}
                </Badge>
              )}
            </div>

            {reason && (
              <div className="flex gap-2 items-start mb-4 p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/10">
                <Lightbulb className="h-3.5 w-3.5 text-sky-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-400 italic leading-relaxed">{reason}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Link href={`/dashboard/focus?taskId=${task.id}`}>
                <Button size="sm" className="gap-1">
                  <Play className="h-3 w-3" /> Start Focus
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={handleSkip} className="gap-1">
                <RefreshCw className="h-3 w-3" /> Not this one
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
