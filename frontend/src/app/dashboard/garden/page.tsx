"use client";

import { useState, useEffect, useCallback } from "react";
import GardenView from "@/components/GardenView";
import MoodCheckin from "@/components/MoodCheckin";
import BreathingExercise from "@/components/BreathingExercise";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getMoodCheckins, saveJournalEntry, addXP, getSimulatedNow } from "@/lib/storage";
import { XP_REWARDS } from "@/lib/xp";
import { MOOD_CONFIG, MoodType } from "@/lib/constants";
import { Wind, PenLine, Heart, Sparkles } from "lucide-react";

export default function GardenPage() {
  const [breathOpen, setBreathOpen] = useState(false);
  const [journal, setJournal] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [g1, setG1] = useState("");
  const [g2, setG2] = useState("");
  const [g3, setG3] = useState("");
  const [gratitudeSaved, setGratitudeSaved] = useState(false);
  const [recentMoods, setRecentMoods] = useState<{ mood: MoodType; date: string }[]>([]);

  useEffect(() => {
    const moods = getMoodCheckins().slice(-7).map((m) => ({
      mood: m.mood,
      date: new Date(m.timestamp).toLocaleDateString("en-US", { weekday: "short" }),
    }));
    setRecentMoods(moods);
  }, []);

  const saveJournal = useCallback(() => {
    if (!journal.trim()) return;
    saveJournalEntry({
      id: crypto.randomUUID(),
      type: "freewrite",
      content: journal.trim(),
      gratitude1: "",
      gratitude2: "",
      gratitude3: "",
      createdAt: getSimulatedNow().toISOString(),
    });
    addXP(XP_REWARDS.JOURNAL);
    setJournalSaved(true);
  }, [journal]);

  const saveGratitude = useCallback(() => {
    if (!g1.trim() && !g2.trim() && !g3.trim()) return;
    saveJournalEntry({
      id: crypto.randomUUID(),
      type: "gratitude",
      content: "",
      gratitude1: g1.trim(),
      gratitude2: g2.trim(),
      gratitude3: g3.trim(),
      createdAt: getSimulatedNow().toISOString(),
    });
    addXP(XP_REWARDS.JOURNAL);
    setGratitudeSaved(true);
  }, [g1, g2, g3]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-50">Mind Garden</h1>

      <GardenView />
      <MoodCheckin />

      {recentMoods.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Mood History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 overflow-x-auto pb-1">
              {recentMoods.map((m, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <span className="text-2xl">{MOOD_CONFIG[m.mood].emoji}</span>
                  <span className="text-[10px] text-slate-500">{m.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-sky-500/30 transition-colors cursor-pointer" onClick={() => setBreathOpen(true)}>
          <CardContent className="p-4 text-center">
            <Wind className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-50">Breathing</p>
            <p className="text-[10px] text-slate-500">4-7-8 technique</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <PenLine className="h-4 w-4 text-sky-400" />
              <span className="text-sm font-medium text-slate-50">Journal</span>
            </div>
            {journalSaved ? (
              <p className="text-xs text-sky-400">Saved! +{XP_REWARDS.JOURNAL} XP</p>
            ) : (
              <>
                <Textarea
                  placeholder="What's on your mind?"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  rows={3}
                  className="text-xs mb-2"
                />
                <Button size="sm" onClick={saveJournal} disabled={!journal.trim()} className="w-full">
                  Save
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-pink-400" />
              <span className="text-sm font-medium text-slate-50">Gratitude</span>
            </div>
            {gratitudeSaved ? (
              <p className="text-xs text-sky-400">Saved! +{XP_REWARDS.JOURNAL} XP</p>
            ) : (
              <div className="space-y-1.5">
                <Input placeholder="1. I'm grateful for..." value={g1} onChange={(e) => setG1(e.target.value)} className="text-xs h-8" />
                <Input placeholder="2. I'm grateful for..." value={g2} onChange={(e) => setG2(e.target.value)} className="text-xs h-8" />
                <Input placeholder="3. I'm grateful for..." value={g3} onChange={(e) => setG3(e.target.value)} className="text-xs h-8" />
                <Button size="sm" onClick={saveGratitude} disabled={!g1.trim() && !g2.trim() && !g3.trim()} className="w-full">
                  Save
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-400">
            <Sparkles className="h-4 w-4" /> What Earns XP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[
              { action: "Complete a task", xp: XP_REWARDS.TASK_COMPLETE },
              { action: "Focus session", xp: XP_REWARDS.FOCUS_SESSION },
              { action: "Study session", xp: XP_REWARDS.STUDY_SESSION },
              { action: "Journal entry", xp: XP_REWARDS.JOURNAL },
              { action: "Mood check-in", xp: XP_REWARDS.MOOD_CHECKIN },
              { action: "Energy check-in", xp: XP_REWARDS.ENERGY_CHECKIN },
              { action: "Breathing exercise", xp: XP_REWARDS.BREATHING },
              { action: "Reflex game", xp: XP_REWARDS.REFLEX_GAME },
              { action: "Daily streak bonus", xp: XP_REWARDS.STREAK_BONUS },
            ].map((item) => (
              <div
                key={item.action}
                className="flex items-center justify-between p-2 rounded bg-slate-900/50"
              >
                <span className="text-slate-400">{item.action}</span>
                <span className="text-sky-400 font-medium">+{item.xp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <BreathingExercise open={breathOpen} onClose={() => setBreathOpen(false)} />
    </div>
  );
}
