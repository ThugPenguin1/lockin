"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import type { Task } from "@/lib/types";
import { Plus } from "lucide-react";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "deep", label: "🔴 Deep" },
  { value: "medium", label: "🟡 Medium" },
  { value: "light", label: "🟢 Light" },
  { value: "creative", label: "🟣 Creative" },
  { value: "completed", label: "✓ Done" },
];

export default function TasksPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = useCallback((task: Task) => {
    setEditTask(task);
    setFormOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setFormOpen(false);
    setEditTask(null);
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-50">Tasks</h1>
        <Button onClick={() => setFormOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto gap-1">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value} className="text-xs">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {FILTERS.map((f) => (
          <TabsContent key={f.value} value={f.value}>
            <TaskList
              filter={f.value}
              onEdit={handleEdit}
              refreshKey={refreshKey}
            />
          </TabsContent>
        ))}
      </Tabs>

      <TaskForm open={formOpen} onClose={handleClose} editTask={editTask} />
    </div>
  );
}
