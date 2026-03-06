"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addXP } from "@/lib/storage";
import { XP_REWARDS } from "@/lib/xp";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
}

type BreathPhase = "inhale" | "hold" | "exhale";

const PHASES: { phase: BreathPhase; duration: number; label: string }[] = [
  { phase: "inhale", duration: 4, label: "Breathe in..." },
  { phase: "hold", duration: 7, label: "Hold..." },
  { phase: "exhale", duration: 8, label: "Breathe out..." },
];

const TOTAL_CYCLES = 4;

export default function BreathingExercise({ open, onClose }: Props) {
  const [active, setActive] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [done, setDone] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (!open) {
      cleanup();
      setActive(false);
      setCycle(0);
      setPhaseIndex(0);
      setSecondsLeft(0);
      setDone(false);
    }
  }, [open, cleanup]);

  const startBreathing = useCallback(() => {
    setActive(true);
    setDone(false);
    setCycle(0);
    setPhaseIndex(0);
    setSecondsLeft(PHASES[0].duration);

    let currentCycle = 0;
    let currentPhase = 0;
    let currentSeconds = PHASES[0].duration;

    intervalRef.current = setInterval(() => {
      currentSeconds -= 1;
      setSecondsLeft(currentSeconds);

      if (currentSeconds <= 0) {
        currentPhase += 1;
        if (currentPhase >= PHASES.length) {
          currentPhase = 0;
          currentCycle += 1;
          setCycle(currentCycle);

          if (currentCycle >= TOTAL_CYCLES) {
            cleanup();
            setActive(false);
            setDone(true);
            addXP(XP_REWARDS.BREATHING);
            return;
          }
        }
        setPhaseIndex(currentPhase);
        currentSeconds = PHASES[currentPhase].duration;
        setSecondsLeft(currentSeconds);
      }
    }, 1000);
  }, [cleanup]);

  const currentPhaseInfo = PHASES[phaseIndex];
  const circleScale = currentPhaseInfo?.phase === "inhale" ? 1.4 : currentPhaseInfo?.phase === "hold" ? 1.4 : 0.8;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>4-7-8 Breathing</DialogTitle>
          <DialogDescription>
            Inhale 4s, Hold 7s, Exhale 8s
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-3"
            >
              <span className="text-5xl">🧘</span>
              <p className="text-sky-400 font-medium">Well done!</p>
              <p className="text-xs text-slate-500">+{XP_REWARDS.BREATHING} XP earned</p>
              <Button onClick={onClose}>Close</Button>
            </motion.div>
          ) : !active ? (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto">
                <span className="text-4xl">🫁</span>
              </div>
              <Button onClick={startBreathing}>Begin</Button>
            </div>
          ) : (
            <>
              <div className="text-xs text-slate-500">
                Cycle {cycle + 1} of {TOTAL_CYCLES}
              </div>
              <motion.div
                className="w-40 h-40 rounded-full bg-sky-500/30 flex items-center justify-center"
                animate={{ scale: circleScale }}
                transition={{
                  duration:
                    currentPhaseInfo.phase === "inhale"
                      ? 4
                      : currentPhaseInfo.phase === "exhale"
                      ? 8
                      : 0.3,
                  ease: "easeInOut",
                }}
              >
                <div className="text-center">
                  <p className="text-slate-50 font-medium text-sm">
                    {currentPhaseInfo.label}
                  </p>
                  <p className="text-2xl font-bold text-sky-400">{secondsLeft}</p>
                </div>
              </motion.div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  cleanup();
                  onClose();
                }}
              >
                End Early
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
