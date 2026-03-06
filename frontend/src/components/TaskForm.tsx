"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { saveTask, getSimulatedNow } from "@/lib/storage";
import { ENERGY_CONFIG } from "@/lib/constants";
import type { Task } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  editTask?: Task | null;
}

const ENERGY_TAGS = ["deep", "medium", "light", "creative"] as const;
const PRIORITIES = ["high", "normal", "low"] as const;

export default function TaskForm({ open, onClose, editTask }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [energyTag, setEnergyTag] = useState<Task["energyTag"]>("medium");
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description);
      setEnergyTag(editTask.energyTag);
      setPriority(editTask.priority);
      setDueDate(editTask.dueDate || "");
      setEstimatedMinutes(editTask.estimatedMinutes?.toString() || "");
    } else {
      setTitle("");
      setDescription("");
      setEnergyTag("medium");
      setPriority("normal");
      setDueDate("");
      setEstimatedMinutes("");
    }
  }, [editTask, open]);

  const handleSave = () => {
    if (!title.trim()) return;

    const task: Task = {
      id: editTask?.id || crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      energyTag,
      priority,
      dueDate: dueDate || null,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
      isCompleted: editTask?.isCompleted || false,
      completedAt: editTask?.completedAt || null,
      skipCount: editTask?.skipCount || 0,
      createdAt: editTask?.createdAt || getSimulatedNow().toISOString(),
    };

    saveTask(task);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTask ? "Edit Task" : "New Task"}</DialogTitle>
          <DialogDescription>
            {editTask ? "Update your task details." : "What do you need to get done?"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Title</label>
            <Input
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Description</label>
            <Textarea
              placeholder="Any details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Energy Tag</label>
            <div className="flex flex-wrap gap-2">
              {ENERGY_TAGS.map((tag) => {
                const config = ENERGY_CONFIG[tag];
                return (
                  <button
                    key={tag}
                    onClick={() => setEnergyTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      energyTag === tag
                        ? `${config.bg} ${config.text} ring-2 ring-current`
                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                    }`}
                  >
                    {config.emoji} {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    priority === p
                      ? p === "high"
                        ? "bg-red-500/20 text-red-400 ring-2 ring-red-400"
                        : p === "normal"
                        ? "bg-sky-500/20 text-sky-400 ring-2 ring-sky-400"
                        : "bg-slate-600 text-slate-300 ring-2 ring-slate-400"
                      : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Est. Minutes</label>
              <Input
                type="number"
                placeholder="30"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                min={1}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full" disabled={!title.trim()}>
            {editTask ? "Update Task" : "Add Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
