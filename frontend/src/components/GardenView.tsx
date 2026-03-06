"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getProfile } from "@/lib/storage";
import { getGardenLevel } from "@/lib/xp";
import { Flower2 } from "lucide-react";
import { motion } from "framer-motion";

const GARDEN_VISUALS: Record<number, string[]> = {
  1: ["🟫", "🟫", "🟫"],
  2: ["🟫", "🌱", "🟫"],
  3: ["🌱", "🌿", "🌱"],
  4: ["🌿", "🌸", "🌿"],
  5: ["🌸", "🌺", "🌸", "🌿"],
  6: ["🌿", "🌻", "🌸", "🌺", "🌿"],
  7: ["🌳", "🌸", "🌺", "🌻", "🌿", "🌱"],
  8: ["🌳", "🌸", "🏡", "🌺", "🌻", "🌿"],
  9: ["🌳", "🦋", "🌸", "🏡", "🌺", "🌻", "🦋", "🌿"],
  10: ["🌈", "🌳", "🦋", "🌸", "🏡", "🌺", "🌻", "🦋", "🌿", "🌈"],
};

export default function GardenView() {
  const [gardenInfo, setGardenInfo] = useState<ReturnType<typeof getGardenLevel> | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const profile = getProfile();
    setGardenInfo(getGardenLevel(profile.xp));
    setStreak(profile.streakCount);
  }, []);

  if (!gardenInfo) return null;

  const visuals = GARDEN_VISUALS[gardenInfo.level] || GARDEN_VISUALS[1];

  return (
    <Card className="border-sky-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flower2 className="h-4 w-4 text-sky-400" />
          {gardenInfo.name} — Level {gardenInfo.level}
        </CardTitle>
        <p className="text-xs text-slate-500">{gardenInfo.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-1 py-6 bg-slate-900/50 rounded-lg min-h-[100px]">
          {visuals.map((emoji, i) => (
            <motion.span
              key={i}
              className="text-3xl md:text-4xl"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, type: "spring" }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>

        <div className="space-y-1">
          <Progress value={gardenInfo.progress} className="h-2" />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{gardenInfo.currentXP} XP</span>
            <span>
              {gardenInfo.nextLevel
                ? `${gardenInfo.nextLevel.xpRequired} XP to ${gardenInfo.nextLevel.name}`
                : "Max Level!"}
            </span>
          </div>
        </div>

        {streak > 0 && (
          <div className="text-center text-sm">
            <span className="text-amber-400">🔥 {streak} day streak</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
