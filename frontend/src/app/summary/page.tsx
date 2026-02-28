"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trophy, Clock, TrendingUp, Flame, Target,
  MessageCircle, Users, RotateCcw, Home, Share2,
  Loader2, Award, Brain, Sparkles, ChevronUp, ChevronDown,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { sessionAPI, mlAPI } from "@/lib/api";
import { toast } from "sonner";

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = parseInt(searchParams.get("id") || "0");

  const { token, user } = useAppStore();
  const [summary, setSummary] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) {
      router.push("/auth");
      return;
    }

    const load = async () => {
      try {
        const [summaryData, recData] = await Promise.all([
          sessionAPI.getSummary(token, sessionId),
          mlAPI.getRecommendations(token).catch(() => ({ recommendations: [] })),
        ]);
        setSummary(summaryData);
        setRecommendations(recData.recommendations || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, user, sessionId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-lockin-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-lockin-primary" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-lockin-bg flex items-center justify-center flex-col gap-4">
        <p className="text-lockin-text-muted">Session not found</p>
        <button onClick={() => router.push("/lobby")} className="text-lockin-primary-light hover:underline">
          Back to Lobby
        </button>
      </div>
    );
  }

  const scoreColor =
    summary.focus_score >= 80 ? "from-emerald-500 to-cyan-500" :
    summary.focus_score >= 60 ? "from-yellow-500 to-orange-500" :
    "from-red-500 to-pink-500";

  return (
    <div className="min-h-screen bg-lockin-bg">
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block"
          >
            <div className="w-20 h-20 mx-auto gradient-primary rounded-2xl flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-black mb-2">Session Complete!</h1>
          {summary.is_personal_best && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lockin-accent/20 text-lockin-accent text-sm font-medium"
            >
              <Award className="w-4 h-4" />
              New Personal Best!
            </motion.div>
          )}
        </motion.div>

        {/* Main Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <div className="text-center mb-6">
            <div className={`text-6xl font-black bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}>
              {Math.round(summary.focus_score)}%
            </div>
            <p className="text-lockin-text-muted text-sm mt-1">Focus Score</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-lockin-bg rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-lockin-primary-light mx-auto mb-1" />
              <div className="text-xl font-bold">{summary.total_duration_minutes}m</div>
              <div className="text-xs text-lockin-text-muted">Total Time</div>
            </div>
            <div className="bg-lockin-bg rounded-xl p-4 text-center">
              <TrendingUp className="w-5 h-5 text-lockin-success mx-auto mb-1" />
              <div className="text-xl font-bold">{summary.total_focus_minutes}m</div>
              <div className="text-xs text-lockin-text-muted">Focused Time</div>
            </div>
            <div className="bg-lockin-bg rounded-xl p-4 text-center">
              <Target className="w-5 h-5 text-lockin-accent mx-auto mb-1" />
              <div className="text-xl font-bold">#{summary.squad_ranking}</div>
              <div className="text-xs text-lockin-text-muted">of {summary.squad_size} in squad</div>
            </div>
            <div className="bg-lockin-bg rounded-xl p-4 text-center">
              <MessageCircle className="w-5 h-5 text-lockin-warning mx-auto mb-1" />
              <div className="text-xl font-bold">{summary.nudges_received}</div>
              <div className="text-xs text-lockin-text-muted">Nudges ({summary.nudges_responded} responded)</div>
            </div>
          </div>
        </motion.div>

        {/* Streak */}
        {summary.streak_count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-xl p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 gradient-accent rounded-xl flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">{summary.streak_count}-day streak</div>
              <div className="text-sm text-lockin-text-muted">with your squad</div>
            </div>
          </motion.div>
        )}

        {/* AI Insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-5 border border-lockin-primary/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">AI Insight</h3>
                <Sparkles className="w-3.5 h-3.5 text-lockin-primary-light" />
              </div>
              <p className="text-sm text-lockin-text-muted leading-relaxed">{summary.ai_insight}</p>
            </div>
          </div>
        </motion.div>

        {/* ML Recommendations */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-lockin-text-muted uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Productivity Insights
            </h3>
            {recommendations.map((rec, i) => (
              <div key={i} className="glass rounded-xl p-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  rec.type === "social_boost" ? "gradient-success" :
                  rec.type === "optimal_time" ? "gradient-primary" :
                  rec.type === "best_partner" ? "gradient-accent" :
                  "bg-lockin-card"
                }`}>
                  {rec.type === "social_boost" ? <Users className="w-4 h-4 text-white" /> :
                   rec.type === "optimal_time" ? <Clock className="w-4 h-4 text-white" /> :
                   rec.type === "optimal_group_size" ? <Users className="w-4 h-4 text-white" /> :
                   <TrendingUp className="w-4 h-4 text-white" />}
                </div>
                <p className="text-sm text-lockin-text-muted">{rec.message}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Squad Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-lockin-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Squad Leaderboard
          </h3>
          <div className="space-y-3">
            {summary.participants_summary.map((p: any, i: number) => (
              <div
                key={p.user_id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  p.user_id === user?.id ? "bg-lockin-primary/10 border border-lockin-primary/20" : "bg-lockin-bg"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  i === 0 ? "gradient-primary text-white" : "bg-lockin-card text-lockin-text-muted"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{p.display_name}</div>
                  <div className="text-xs text-lockin-text-muted">{p.total_minutes}m focused</div>
                </div>
                <div className={`text-lg font-bold bg-gradient-to-r ${
                  p.focus_score >= 80 ? "from-emerald-500 to-cyan-500" :
                  p.focus_score >= 60 ? "from-yellow-500 to-orange-500" :
                  "from-red-500 to-pink-500"
                } bg-clip-text text-transparent`}>
                  {Math.round(p.focus_score)}%
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex gap-3 pb-8"
        >
          <button
            onClick={() => router.push("/lobby")}
            className="flex-1 py-3 glass rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-lockin-card transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Lobby
          </button>
          <button
            onClick={() => {
              const text = `Just completed a LockIn session! Focus score: ${Math.round(summary.focus_score)}% over ${summary.total_duration_minutes} minutes. #LockIn`;
              navigator.clipboard.writeText(text);
              toast.success("Copied to clipboard!");
            }}
            className="flex-1 py-3 gradient-primary rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Share2 className="w-4 h-4" />
            Share Results
          </button>
        </motion.div>
      </main>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-lockin-bg flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-lockin-primary" /></div>}>
      <SummaryContent />
    </Suspense>
  );
}
