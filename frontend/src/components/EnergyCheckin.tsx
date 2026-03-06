"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { saveEnergyCheckin, addXP, getSimulatedNow, getEnergyCheckins } from "@/lib/storage";
import { XP_REWARDS } from "@/lib/xp";
import { ENERGY_LEVEL_LABELS } from "@/lib/constants";
import type { LastActivity, SleepQuality } from "@/lib/types";
import { Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ACTIVITIES: { value: LastActivity; label: string }[] = [
  { value: "just_woke_up", label: "Just woke up" },
  { value: "been_working", label: "Been working" },
  { value: "ate_meal", label: "Ate a meal" },
  { value: "exercised", label: "Exercised" },
  { value: "been_on_phone", label: "Been on phone" },
  { value: "just_relaxed", label: "Just relaxed" },
  { value: "other", label: "Other" },
];

const SLEEP_OPTIONS: { value: SleepQuality; label: string }[] = [
  { value: "bad", label: "Badly" },
  { value: "okay", label: "Okay" },
  { value: "well", label: "Well" },
  { value: "great", label: "Great" },
];

interface Props {
  onCheckin?: (level: number) => void;
  onOpenReflex?: () => void;
}

export default function EnergyCheckin({ onCheckin, onOpenReflex }: Props) {
  const [energy, setEnergy] = useState(3);
  const [activity, setActivity] = useState<LastActivity | null>(null);
  const [sleep, setSleep] = useState<SleepQuality | null>(null);
  const [showSleep, setShowSleep] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const now = getSimulatedNow();
    const todayStr = now.toISOString().split("T")[0];
    const checkins = getEnergyCheckins();
    const todayCheckins = checkins.filter((c) => c.timestamp.startsWith(todayStr));
    setShowSleep(todayCheckins.length === 0);
  }, []);

  const handleSave = useCallback(() => {
    const now = getSimulatedNow();
    const checkin = {
      id: crypto.randomUUID(),
      level: energy,
      source: "slider" as const,
      reactionTimeMs: null,
      timestamp: now.toISOString(),
      hourOfDay: now.getHours(),
      lastActivity: activity,
      sleepQuality: showSleep ? sleep : null,
    };
    saveEnergyCheckin(checkin);
    addXP(XP_REWARDS.ENERGY_CHECKIN);
    setSaved(true);
    onCheckin?.(energy);
  }, [energy, activity, sleep, showSleep, onCheckin]);

  const emojis = ["😴", "😐", "🙂", "😊", "🔥"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-sky-400" />
          How&apos;s your energy?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {!saved ? (
            <motion.div
              key="slider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-between text-2xl">
                {emojis.map((e, i) => (
                  <span
                    key={i}
                    className={`transition-transform ${energy === i + 1 ? "scale-125" : "opacity-40"}`}
                  >
                    {e}
                  </span>
                ))}
              </div>
              <Slider
                value={[energy]}
                onValueChange={(v) => setEnergy(v[0])}
                min={1}
                max={5}
                step={1}
              />
              <div className="text-center text-sm text-slate-400">
                {ENERGY_LEVEL_LABELS[energy]} Energy
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1.5">What did you just do?</p>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITIES.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setActivity(activity === a.value ? null : a.value)}
                      className={`px-2 py-1 rounded-md text-[11px] transition-all ${
                        activity === a.value
                          ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40"
                          : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {showSleep && (
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">How did you sleep last night?</p>
                  <div className="flex gap-1.5">
                    {SLEEP_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setSleep(sleep === s.value ? null : s.value)}
                        className={`flex-1 px-2 py-1.5 rounded-md text-[11px] transition-all ${
                          sleep === s.value
                            ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/40"
                            : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div>
                  {onOpenReflex && (
                    <button
                      onClick={onOpenReflex}
                      className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      or test your reflexes →
                    </button>
                  )}
                </div>
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3"
            >
              <span className="text-3xl">{emojis[energy - 1]}</span>
              <div>
                <Badge className="bg-sky-500/20 text-sky-400">
                  {ENERGY_LEVEL_LABELS[energy]}
                </Badge>
                <p className="text-xs text-slate-500 mt-1">Energy logged +{XP_REWARDS.ENERGY_CHECKIN} XP</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
