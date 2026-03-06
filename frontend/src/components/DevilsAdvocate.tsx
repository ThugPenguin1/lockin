"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveStudySession, addXP, getSimulatedNow } from "@/lib/storage";
import { XP_REWARDS } from "@/lib/xp";
import { Brain, Swords, Send, RotateCcw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Step = 1 | 2 | 3;

export default function DevilsAdvocate() {
  const [step, setStep] = useState<Step>(1);
  const [notes, setNotes] = useState("");
  const [challenge, setChallenge] = useState("");
  const [defense, setDefense] = useState("");
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<{
    accuracy: number;
    completeness: number;
    evidence: number;
    overall: number;
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    strength: string;
    gap: string;
  } | null>(null);
  const [error, setError] = useState("");

  const handleChallenge = useCallback(async () => {
    if (!notes.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "challenge", notes }),
      });
      const data = await res.json();
      setChallenge(data.challenge);
      setStep(2);
    } catch {
      setError("AI is thinking hard... try again");
    } finally {
      setLoading(false);
    }
  }, [notes]);

  const handleScore = useCallback(async () => {
    if (!defense.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "score", notes, challenge, defense }),
      });
      const data = await res.json();
      const s = {
        accuracy: data.accuracy,
        completeness: data.completeness,
        evidence: data.evidence,
        overall: data.overall,
      };
      const f = { strength: data.strength, gap: data.gap };
      setScores(s);
      setFeedback(f);
      setStep(3);

      saveStudySession({
        id: crypto.randomUUID(),
        topic: notes.slice(0, 60),
        notesInput: notes,
        aiChallenge: challenge,
        userDefense: defense,
        scores: s,
        aiFeedback: f,
        createdAt: getSimulatedNow().toISOString(),
      });
      addXP(XP_REWARDS.STUDY_SESSION);
    } catch {
      setError("AI is thinking hard... try again");
    } finally {
      setLoading(false);
    }
  }, [notes, challenge, defense]);

  const goDeeper = useCallback(async () => {
    setDefense("");
    setScores(null);
    setFeedback(null);
    setStep(2);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "challenge", notes }),
      });
      const data = await res.json();
      setChallenge(data.challenge);
    } catch {
      setError("AI is thinking hard... try again");
    } finally {
      setLoading(false);
    }
  }, [notes]);

  const resetAll = () => {
    setStep(1);
    setNotes("");
    setChallenge("");
    setDefense("");
    setScores(null);
    setFeedback(null);
    setError("");
  };

  const scoreItems = scores
    ? [
        { label: "Accuracy", value: scores.accuracy, color: "bg-sky-500" },
        { label: "Completeness", value: scores.completeness, color: "bg-emerald-500" },
        { label: "Evidence", value: scores.evidence, color: "bg-amber-500" },
        { label: "Overall", value: scores.overall, color: "bg-violet-500" },
      ]
    : [];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-sky-400" />
          Devil&apos;s Advocate
        </CardTitle>
        <p className="text-sm text-slate-400">
          Paste your notes. AI will challenge you. Defend your understanding.
        </p>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <Textarea
                placeholder="Paste your study notes here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
              />
              <Button
                onClick={handleChallenge}
                disabled={!notes.trim() || loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                Challenge Me
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm font-medium text-red-400 mb-1 flex items-center gap-1">
                  <Swords className="h-3 w-3" /> Devil&apos;s Advocate says:
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">{challenge}</p>
              </div>
              <Textarea
                placeholder="Defend your understanding..."
                value={defense}
                onChange={(e) => setDefense(e.target.value)}
                rows={4}
              />
              <Button
                onClick={handleScore}
                disabled={!defense.trim() || loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Defense
              </Button>
            </motion.div>
          )}

          {step === 3 && scores && feedback && (
            <motion.div
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="space-y-3">
                {scoreItems.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-slate-50 font-medium">{item.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${item.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs font-medium text-emerald-400 mb-1">Strength</p>
                  <p className="text-xs text-slate-300">{feedback.strength}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs font-medium text-amber-400 mb-1">Gap</p>
                  <p className="text-xs text-slate-300">{feedback.gap}</p>
                </div>
              </div>

              <p className="text-xs text-sky-400 text-center">
                +{XP_REWARDS.STUDY_SESSION} XP earned
              </p>

              <div className="flex gap-2">
                <Button onClick={goDeeper} variant="secondary" className="flex-1 gap-1">
                  <Brain className="h-3 w-3" /> Go Deeper
                </Button>
                <Button onClick={resetAll} variant="ghost" className="flex-1 gap-1">
                  <RotateCcw className="h-3 w-3" /> New Topic
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
