"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import SimulationControls from "@/components/SimulationControls";
import { getProfile, saveProfile, getSimulatedNow } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const profile = getProfile();
    if (!profile.onboardingComplete) {
      setShowOnboarding(true);
    }
    setReady(true);
  }, []);

  const handleOnboard = useCallback(() => {
    if (!name.trim()) return;
    const profile = getProfile();
    profile.name = name.trim();
    profile.onboardingComplete = true;
    profile.lastActiveDate = getSimulatedNow().toISOString().split("T")[0];
    profile.streakCount = 1;
    saveProfile(profile);
    setShowOnboarding(false);
  }, [name]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-sky-500/20 flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-sky-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-50 mb-2">
                  Welcome to Circadian
                </h1>
                <p className="text-slate-400 text-sm">
                  Let&apos;s get you set up. What should we call you?
                </p>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOnboard()}
                  autoFocus
                  className="text-center"
                />
                <Button
                  onClick={handleOnboard}
                  disabled={!name.trim()}
                  className="w-full"
                >
                  Let&apos;s Go
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar />
      <main className="md:ml-60 min-h-screen pb-14">
        <div className="p-6 md:p-8 pt-16 md:pt-8">{children}</div>
      </main>
      <SimulationControls />
    </div>
  );
}
