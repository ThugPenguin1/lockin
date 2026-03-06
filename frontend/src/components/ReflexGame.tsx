"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveEnergyCheckin, addXP, getSimulatedNow } from "@/lib/storage";
import { XP_REWARDS } from "@/lib/xp";
import { ENERGY_LEVEL_LABELS } from "@/lib/constants";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = "waiting" | "ready" | "go" | "too_early" | "result" | "done";

function mapReactionToEnergy(avgMs: number): number {
  if (avgMs < 250) return 5;
  if (avgMs < 320) return 4;
  if (avgMs < 400) return 3;
  if (avgMs < 500) return 2;
  return 1;
}

export default function ReflexGame({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [energy, setEnergy] = useState(3);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goTimeRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (open) {
      setPhase("waiting");
      setRound(0);
      setTimes([]);
      setCurrentTime(0);
    } else {
      cleanup();
    }
  }, [open, cleanup]);

  const startRound = useCallback(() => {
    setPhase("ready");
    const delay = 1500 + Math.random() * 2500;
    timeoutRef.current = setTimeout(() => {
      setPhase("go");
      goTimeRef.current = performance.now();
    }, delay);
  }, []);

  const handleClick = useCallback(() => {
    if (phase === "waiting") {
      startRound();
      return;
    }

    if (phase === "ready") {
      cleanup();
      setPhase("too_early");
      return;
    }

    if (phase === "go") {
      const reaction = Math.round(performance.now() - goTimeRef.current);
      setCurrentTime(reaction);
      const newTimes = [...times, reaction];
      setTimes(newTimes);
      const newRound = round + 1;
      setRound(newRound);

      if (newRound >= 5) {
        const avg = Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
        const e = mapReactionToEnergy(avg);
        setEnergy(e);

        const now = getSimulatedNow();
        saveEnergyCheckin({
          id: crypto.randomUUID(),
          level: e,
          source: "reflex",
          reactionTimeMs: avg,
          timestamp: now.toISOString(),
          hourOfDay: now.getHours(),
          lastActivity: null,
          sleepQuality: null,
        });
        addXP(XP_REWARDS.REFLEX_GAME);
        setPhase("done");
      } else {
        setPhase("result");
      }
      return;
    }

    if (phase === "too_early") {
      startRound();
      return;
    }

    if (phase === "result") {
      startRound();
      return;
    }
  }, [phase, times, round, startRound, cleanup]);

  const avg =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-sky-400" /> Reflex Energy Test
          </DialogTitle>
          <DialogDescription>
            {phase === "done"
              ? "Results are in!"
              : `Round ${Math.min(round + 1, 5)} of 5`}
          </DialogDescription>
        </DialogHeader>

        {phase === "done" ? (
          <div className="text-center space-y-4 py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-5xl"
            >
              ⚡
            </motion.div>
            <div>
              <p className="text-2xl font-bold text-slate-50">{avg}ms avg</p>
              <p className="text-sm text-sky-400 mt-1">
                Your reflexes suggest{" "}
                <span className="font-semibold">{ENERGY_LEVEL_LABELS[energy]}</span>{" "}
                energy!
              </p>
              <p className="text-xs text-slate-500 mt-1">
                +{XP_REWARDS.REFLEX_GAME} XP earned
              </p>
            </div>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <button
            onClick={handleClick}
            className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer select-none ${
              phase === "go"
                ? "bg-emerald-500"
                : phase === "too_early"
                ? "bg-amber-500"
                : phase === "result"
                ? "bg-sky-500/20"
                : phase === "ready"
                ? "bg-red-500"
                : "bg-slate-700"
            }`}
          >
            {phase === "waiting" && (
              <>
                <span className="text-3xl mb-2">🎯</span>
                <span className="text-slate-300 font-medium">Tap to start</span>
              </>
            )}
            {phase === "ready" && (
              <>
                <span className="text-3xl mb-2">🔴</span>
                <span className="text-white font-medium">Wait for green...</span>
              </>
            )}
            {phase === "go" && (
              <>
                <span className="text-3xl mb-2">🟢</span>
                <span className="text-white font-bold text-xl">TAP NOW!</span>
              </>
            )}
            {phase === "too_early" && (
              <>
                <span className="text-3xl mb-2">⚠️</span>
                <span className="text-white font-medium">Too early! Tap to retry</span>
              </>
            )}
            {phase === "result" && (
              <>
                <span className="text-3xl mb-2">⏱️</span>
                <span className="text-sky-400 font-bold text-2xl">{currentTime}ms</span>
                <span className="text-slate-400 text-sm mt-1">Tap for next round</span>
              </>
            )}
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
