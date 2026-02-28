"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, ArrowRight, Copy, Check, Loader2, Camera, Shield } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { squadAPI } from "@/lib/api";
import { toast } from "sonner";

const EMOJI_OPTIONS = ["📚", "🔥", "💪", "🧠", "⚡", "🎯", "🚀", "🏆"];

export default function OnboardingPage() {
  const router = useRouter();
  const { token, addSquad } = useAppStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdSquad, setCreatedSquad] = useState<any>(null);

  const [squadForm, setSquadForm] = useState({
    name: "",
    description: "",
    avatar_emoji: "📚",
  });
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    if (!token) {
      router.push("/auth");
    }
  }, [token, router]);

  if (!token) {
    return (
      <div className="min-h-screen bg-lockin-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-lockin-primary" />
      </div>
    );
  }

  const handleCreateSquad = async () => {
    if (!squadForm.name.trim()) {
      toast.error("Give your squad a name!");
      return;
    }
    setLoading(true);
    try {
      const squad = await squadAPI.create(token, squadForm);
      setCreatedSquad(squad);
      addSquad(squad);
      setStep(2);
      toast.success("Squad created!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSquad = async () => {
    if (!joinCode.trim()) {
      toast.error("Enter an invite code!");
      return;
    }
    setLoading(true);
    try {
      const squad = await squadAPI.join(token, joinCode.trim());
      addSquad(squad);
      toast.success(`Joined ${squad.name}!`);
      router.push("/lobby");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (createdSquad) {
      navigator.clipboard.writeText(createdSquad.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Invite code copied!");
    }
  };

  const steps = [
    {
      title: "Welcome to LockIn",
      subtitle: "Let's get you set up in 30 seconds",
      content: (
        <div className="space-y-6">
          <div className="grid gap-4">
            <div className="glass rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Study with your squad</h3>
                <p className="text-sm text-lockin-text-muted">See when friends are locked in and join with one tap</p>
              </div>
            </div>
            <div className="glass rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg gradient-success flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI tracks your focus</h3>
                <p className="text-sm text-lockin-text-muted">On-device only — no video ever leaves your browser</p>
              </div>
            </div>
            <div className="glass rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">100% privacy-first</h3>
                <p className="text-sm text-lockin-text-muted">Edge computing means zero data transmitted</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setStep(1)}
            className="w-full py-3 gradient-primary rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            Let&apos;s Go
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    {
      title: "Join or Create a Squad",
      subtitle: "A squad is your study friend group",
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-lockin-text-muted uppercase tracking-wider">Create New Squad</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSquadForm({ ...squadForm, avatar_emoji: emoji })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                        squadForm.avatar_emoji === emoji
                          ? "bg-lockin-primary/20 border-2 border-lockin-primary scale-110"
                          : "bg-lockin-bg border border-lockin-border hover:border-lockin-primary/50"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={squadForm.name}
                onChange={(e) => setSquadForm({ ...squadForm, name: e.target.value })}
                className="w-full px-4 py-3 bg-lockin-bg border border-lockin-border rounded-xl text-lockin-text placeholder-lockin-text-muted/50 focus-ring"
                placeholder="Squad name (e.g. Library Grinders)"
              />
              <button
                onClick={handleCreateSquad}
                disabled={loading}
                className="w-full py-3 gradient-primary rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-4 h-4" /> Create Squad</>}
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-lockin-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-lockin-card text-lockin-text-muted">or</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-lockin-text-muted uppercase tracking-wider">Join Existing Squad</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 bg-lockin-bg border border-lockin-border rounded-xl text-lockin-text placeholder-lockin-text-muted/50 focus-ring font-mono uppercase tracking-wider"
                placeholder="INVITE CODE"
                maxLength={8}
              />
              <button
                onClick={handleJoinSquad}
                disabled={loading}
                className="px-6 py-3 gradient-success rounded-xl text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Invite Your Friends",
      subtitle: "Share this code with your study group",
      content: createdSquad && (
        <div className="space-y-6">
          <div className="glass rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">{createdSquad.avatar_emoji}</div>
            <h3 className="text-xl font-bold mb-2">{createdSquad.name}</h3>
            <p className="text-lockin-text-muted text-sm mb-6">Share this invite code</p>
            <div className="flex items-center justify-center gap-3">
              <div className="px-6 py-3 bg-lockin-bg rounded-xl font-mono text-2xl font-bold tracking-[0.3em] text-lockin-primary-light">
                {createdSquad.invite_code}
              </div>
              <button
                onClick={copyInviteCode}
                className="p-3 glass rounded-xl hover:bg-lockin-border transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-lockin-success" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            onClick={() => router.push("/lobby")}
            className="w-full py-3 gradient-primary rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            Enter the Lobby
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push("/lobby")}
            className="w-full py-2 text-lockin-text-muted text-sm hover:text-white transition-colors"
          >
            Skip for now
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-lockin-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "gradient-primary" : "bg-lockin-border"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-2xl p-8"
          >
            <h1 className="text-2xl font-bold mb-1">{steps[step].title}</h1>
            <p className="text-lockin-text-muted mb-6">{steps[step].subtitle}</p>
            {steps[step].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
