"use client";

import { useState, useEffect, useCallback } from "react";
import { getTasks, updateTask, deleteTask, addXP, getSimulatedNow } from "@/lib/storage";
import { XP_REWARDS } from "@/lib/xp";
import { ENERGY_CONFIG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";
import { Check, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  filter?: string;
  onEdit?: (task: Task) => void;
  refreshKey?: number;
}

export default function TaskList({ filter, onEdit, refreshKey }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(() => {
    let all = getTasks();
    if (filter && filter !== "all" && filter !== "completed") {
      all = all.filter((t) => t.energyTag === filter && !t.isCompleted);
    } else if (filter === "completed") {
      all = all.filter((t) => t.isCompleted);
    } else {
      all = all.filter((t) => !t.isCompleted);
    }
    setTasks(all);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleToggle = (task: Task) => {
    const nowComplete = !task.isCompleted;
    updateTask(task.id, {
      isCompleted: nowComplete,
      completedAt: nowComplete ? getSimulatedNow().toISOString() : null,
    });
    if (nowComplete) addXP(XP_REWARDS.TASK_COMPLETE);
    load();
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    load();
  };

  const today = getSimulatedNow();
  today.setHours(0, 0, 0, 0);

  const grouped = {
    overdue: tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < today && !t.isCompleted
    ),
    today: tasks.filter((t) => {
      if (!t.dueDate || t.isCompleted) return false;
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }),
    upcoming: tasks.filter((t) => {
      if (!t.dueDate || t.isCompleted) return false;
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      return d > today;
    }),
    someday: tasks.filter((t) => !t.dueDate && !t.isCompleted),
    completed: tasks.filter((t) => t.isCompleted),
  };

  const sections =
    filter === "completed"
      ? [{ label: "Completed", tasks: grouped.completed }]
      : [
          { label: "Overdue", tasks: grouped.overdue },
          { label: "Today", tasks: grouped.today },
          { label: "Upcoming", tasks: grouped.upcoming },
          { label: "Someday", tasks: grouped.someday },
        ];

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>No tasks here yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map(
        (section) =>
          section.tasks.length > 0 && (
            <div key={section.label}>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                {section.label} ({section.tasks.length})
              </h3>
              <AnimatePresence>
                <div className="space-y-2">
                  {section.tasks.map((task) => {
                    const config = ENERGY_CONFIG[task.energyTag];
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors group"
                      >
                        <button
                          onClick={() => handleToggle(task)}
                          className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                            task.isCompleted
                              ? "bg-sky-500 border-sky-500"
                              : "border-slate-600 hover:border-sky-400"
                          }`}
                        >
                          {task.isCompleted && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              task.isCompleted
                                ? "line-through text-slate-500"
                                : "text-slate-50"
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${config.bg} ${config.text}`}
                            >
                              {config.emoji} {config.label}
                            </Badge>
                            {task.priority === "high" && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0"
                              >
                                high
                              </Badge>
                            )}
                            {task.dueDate && (
                              <span className="text-[10px] text-slate-500">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => onEdit(task)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-400 hover:text-red-300"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </div>
          )
      )}
    </div>
  );
}
