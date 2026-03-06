"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getMoodCheckins, saveMoodCheckin, addXP, getSimulatedNow } from "@/lib/storage";
import { MOOD_CONFIG, MoodType } from "@/lib/constants";
import { XP_REWARDS } from "@/lib/xp";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";

export default function MoodCheckin() {
  const [recentMood, setRecentMood] = useState<MoodType | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const checkins = getMoodCheckins();
    if (checkins.length > 0) {
      const last = checkins[checkins.length - 1];
      const hoursSince =
        (getSimulatedNow().getTime() - new Date(last.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 4) {
        setRecentMood(last.mood);
      }
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedMood) return;
    saveMoodCheckin({
      id: crypto.randomUUID(),
      mood: selectedMood,
      note,
      timestamp: getSimulatedNow().toISOString(),
    });
    addXP(XP_REWARDS.MOOD_CHECKIN);
    setSaved(true);
    setRecentMood(selectedMood);
  }, [selectedMood, note]);

  const moods = Object.entries(MOOD_CONFIG) as [MoodType, (typeof MOOD_CONFIG)[MoodType]][];

  if (recentMood && !saved) {
    const config = MOOD_CONFIG[recentMood];
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-sky-400" /> Mood
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.emoji}</span>
            <span className={`text-sm ${config.color}`}>
              Feeling {config.label.toLowerCase()}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="h-4 w-4 text-sky-400" /> How are you feeling?
        </CardTitle>
      </CardHeader>
      <CardContent>
        {saved ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-2"
          >
            <span className="text-3xl">{selectedMood && MOOD_CONFIG[selectedMood].emoji}</span>
            <p className="text-xs text-sky-400 mt-1">Mood logged +{XP_REWARDS.MOOD_CHECKIN} XP</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-around">
              {moods.map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedMood(key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    selectedMood === key
                      ? "bg-slate-700 scale-110"
                      : "hover:bg-slate-700/50"
                  }`}
                >
                  <span className="text-2xl">{config.emoji}</span>
                  <span className={`text-[10px] ${config.color}`}>{config.label}</span>
                </button>
              ))}
            </div>
            {selectedMood && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="space-y-2"
              >
                <Textarea
                  placeholder="Any thoughts? (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
                <Button size="sm" onClick={handleSave} className="w-full">
                  Save Mood
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
