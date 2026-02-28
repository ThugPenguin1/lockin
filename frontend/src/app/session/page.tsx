"use client";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Unlock, Eye, EyeOff, MessageCircle, Flame,
  TrendingUp, Clock, Loader2, Brain, Sparkles, Info,
  CheckSquare, Square, Plus, X, ListTodo, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { sessionAPI } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getAttentionTracker, AttentionFrame } from "@/lib/attention-tracker";
import { useHydration } from "@/hooks/useHydration";
import { toast } from "sonner";

const MOCK_NUDGES = [
  { type: "social", messages: [
    "Your squad is still grinding — keep that momentum going!",
    "Everyone in your squad is locked in. You got this!",
    "Your study partners are on a roll right now. Stay with them!",
    "The squad's focus is strong today. Don't break the chain!",
  ]},
  { type: "competitive", messages: [
    "You're climbing the squad leaderboard — push for #1!",
    "Your focus score just jumped. Can you hold it above 80%?",
    "You're outpacing your average today. Keep it up!",
    "Strong performance! You're on track for a personal best.",
  ]},
  { type: "supportive", messages: [
    "Great focus streak! You've been locked in solid. Keep going.",
    "You're building real momentum. Every minute counts.",
    "Remember why you started this session. You're doing amazing.",
    "Almost at the next milestone — don't stop now!",
    "Consistency beats intensity. You're proving that right now.",
  ]},
];

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = parseInt(searchParams.get("id") || "0");

  const {
    token, user, activeSession, setActiveSession,
    currentFocusScore, setFocusScore,
    nudges, addNudge, clearNudges,
    isAttentionTrackingEnabled, setAttentionTracking,
    isCameraActive, setCameraActive,
    updateParticipant,
  } = useAppStore();

  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [currentNudge, setCurrentNudge] = useState<string>("");
  const [currentNudgeType, setCurrentNudgeType] = useState<string>("social");
  const [showAbout, setShowAbout] = useState(false);

  // To-do list state
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [showTodos, setShowTodos] = useState(true);

  const hydrated = useHydration();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<any>(null);
  const attentionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameRef = useRef<AttentionFrame | null>(null);
  const nudgeIndexRef = useRef(0);

  const loadSession = useCallback(async () => {
    if (!token || !sessionId) return;
    try {
      const session = await sessionAPI.getSession(token, sessionId);
      setActiveSession(session);
    } catch (err: any) {
      toast.error(err.message);
      router.push("/lobby");
    } finally {
      setLoading(false);
    }
  }, [token, sessionId, setActiveSession, router]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !user) {
      router.push("/auth");
      return;
    }
    loadSession();
  }, [hydrated, token, user, router, loadSession]);

  // Timer
  useEffect(() => {
    if (!activeSession) return;
    const startTime = new Date(activeSession.started_at).getTime();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  // Mock AI nudges — fire every 45-90 seconds
  useEffect(() => {
    if (!activeSession) return;

    const fireNudge = () => {
      const category = MOCK_NUDGES[nudgeIndexRef.current % MOCK_NUDGES.length];
      const msg = category.messages[Math.floor(Math.random() * category.messages.length)];
      nudgeIndexRef.current++;

      const nudge = {
        id: Date.now(),
        message: msg,
        nudge_type: category.type,
        timestamp: new Date().toISOString(),
      };
      addNudge(nudge);
      setCurrentNudge(msg);
      setCurrentNudgeType(category.type);
      setShowNudge(true);
      setTimeout(() => setShowNudge(false), 6000);
    };

    // First nudge after 30 seconds
    const firstTimeout = setTimeout(fireNudge, 30000);

    // Subsequent nudges every 45-90 seconds
    const interval = setInterval(() => {
      fireNudge();
    }, 45000 + Math.random() * 45000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, [activeSession, addNudge]);

  // Simulate focus score fluctuation
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setFocusScore((prev: number) => {
        const drift = (Math.random() - 0.4) * 8;
        return Math.max(45, Math.min(100, prev + drift));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [activeSession, setFocusScore]);

  // WebSocket listeners
  useEffect(() => {
    const socket = getSocket();

    socket.on("focus_update", (data: any) => {
      updateParticipant(data.user_id, {
        focus_score: data.focus_score,
        status_label: data.status_label,
        total_focus_seconds: data.total_focus_seconds,
      });
    });

    socket.on("nudge_received", (data: any) => {
      addNudge({
        id: Date.now(),
        message: data.message,
        nudge_type: data.nudge_type,
        timestamp: data.timestamp,
      });
      setCurrentNudge(data.message);
      setCurrentNudgeType(data.nudge_type || "social");
      setShowNudge(true);
      setTimeout(() => setShowNudge(false), 5000);
    });

    socket.on("participant_joined", () => loadSession());
    socket.on("participant_left", () => loadSession());

    return () => {
      socket.off("focus_update");
      socket.off("nudge_received");
      socket.off("participant_joined");
      socket.off("participant_left");
    };
  }, [updateParticipant, addNudge, loadSession]);

  // Attention tracking
  useEffect(() => {
    if (!isAttentionTrackingEnabled || !videoRef.current || !canvasRef.current) return;

    const tracker = getAttentionTracker();
    trackerRef.current = tracker;

    const initTracker = async () => {
      try {
        await tracker.initialize(videoRef.current!, canvasRef.current!);
        tracker.start((frame: AttentionFrame) => {
          lastFrameRef.current = frame;
          setFocusScore(Math.round(frame.attentionScore * 100));
        });
        setCameraActive(true);
      } catch (err) {
        console.error("Failed to init attention tracker:", err);
        setCameraActive(false);
      }
    };

    initTracker();

    return () => {
      tracker.stop();
      setCameraActive(false);
    };
  }, [isAttentionTrackingEnabled, setFocusScore, setCameraActive]);

  // Send attention data to server every 5 seconds
  useEffect(() => {
    if (!token || !sessionId) return;

    attentionIntervalRef.current = setInterval(async () => {
      const frame = lastFrameRef.current;
      if (!frame) return;

      try {
        const result = await sessionAPI.updateAttention(token, {
          session_id: sessionId,
          attention_score: frame.attentionScore,
          is_focused: frame.isFocused,
          gaze_x: frame.gazeX,
          gaze_y: frame.gazeY,
          head_pitch: frame.headPitch,
          head_yaw: frame.headYaw,
        });

        if (result.nudge) {
          addNudge(result.nudge);
          setCurrentNudge(result.nudge.message);
          setCurrentNudgeType(result.nudge.nudge_type || "social");
          setShowNudge(true);
          setTimeout(() => setShowNudge(false), 5000);
        }

        const socket = getSocket();
        const score = result.focus_score;
        let label = "Focused";
        if (score >= 90) label = "On fire";
        else if (score >= 70) label = "Focused";
        else if (score >= 50) label = "Drifting";
        else label = "Distracted";

        socket.emit("attention_update", {
          session_id: sessionId,
          focus_score: score,
          is_focused: frame.isFocused,
          status_label: label,
          total_focus_seconds: Math.round(elapsed * (score / 100)),
        });
      } catch (err) {
        // Silent fail
      }
    }, 5000);

    return () => {
      if (attentionIntervalRef.current) {
        clearInterval(attentionIntervalRef.current);
      }
    };
  }, [token, sessionId, elapsed, addNudge]);

  const handleLeaveSession = async () => {
    if (!token || !sessionId) return;
    setLeaving(true);
    try {
      trackerRef.current?.stop();
      setCameraActive(false);

      await sessionAPI.leave(token, sessionId);

      const socket = getSocket();
      socket.emit("leave_focus_session", {
        session_id: sessionId,
        squad_id: activeSession?.squad_id,
      });

      setActiveSession(null);
      clearNudges();
      router.push(`/summary?id=${sessionId}`);
    } catch (err: any) {
      toast.error(err.message);
      setLeaving(false);
    }
  };

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: Date.now(), text, done: false }]);
    setNewTodo("");
  };

  const toggleTodo = (id: number) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTodo = (id: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (label: string) => {
    switch (label) {
      case "On fire": return "text-lockin-accent";
      case "Focused": return "text-lockin-success";
      case "Drifting": return "text-lockin-warning";
      case "Distracted": return "text-lockin-danger";
      default: return "text-lockin-text-muted";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-emerald-500 to-cyan-500";
    if (score >= 60) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const getNudgeColor = (type: string) => {
    switch (type) {
      case "competitive": return "border-lockin-accent/30 bg-lockin-accent/5";
      case "supportive": return "border-lockin-success/30 bg-lockin-success/5";
      default: return "border-lockin-primary/30 bg-lockin-primary/5";
    }
  };

  const completedTodos = todos.filter((t) => t.done).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-lockin-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-lockin-primary" />
      </div>
    );
  }

  const participants = activeSession?.participants?.filter((p: any) => p.is_active) || [];

  return (
    <div className="min-h-screen bg-lockin-bg flex flex-col">
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="glass sticky top-0 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-lockin-success animate-pulse" />
            <span className="font-medium text-sm">Focus Session</span>
            <span className="font-mono text-lockin-primary-light font-bold">{formatTime(elapsed)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAbout(true)}
              className="p-2 rounded-lg text-lockin-text-muted hover:text-white hover:bg-lockin-card transition-colors"
              title="About LockIn"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAttentionTracking(!isAttentionTrackingEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                isCameraActive ? "text-lockin-success" : "text-lockin-text-muted"
              } hover:bg-lockin-card`}
              title={isAttentionTrackingEnabled ? "Disable attention tracking" : "Enable attention tracking"}
            >
              {isCameraActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-5">
        {/* Participant Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {participants.map((p: any) => {
            const isMe = p.user.id === user?.id;
            const score = isMe ? currentFocusScore : p.focus_score;
            const label = isMe
              ? (score >= 90 ? "On fire" : score >= 70 ? "Focused" : score >= 50 ? "Drifting" : "Distracted")
              : p.status_label;
            const participantElapsed = Math.max(0, Math.floor((Date.now() - new Date(p.joined_at).getTime()) / 1000));

            return (
              <motion.div
                key={p.user.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`glass rounded-xl p-4 text-center transition-all ${
                  isMe ? "ring-2 ring-lockin-primary/50" : ""
                }`}
              >
                <div className="relative inline-block mb-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                    score >= 70 ? "gradient-success" : score >= 50 ? "bg-lockin-warning" : "gradient-accent"
                  }`}>
                    {p.user.display_name[0]}
                  </div>
                  {label === "On fire" && (
                    <Flame className="absolute -top-1 -right-1 w-4 h-4 text-lockin-accent" />
                  )}
                </div>
                <div className="font-semibold text-sm">{isMe ? "You" : p.user.display_name}</div>
                <div className="text-xs text-lockin-text-muted font-mono">
                  {formatTime(isMe ? elapsed : participantElapsed)}
                </div>
                <div className={`text-xs font-medium mt-1 ${getStatusColor(label)}`}>
                  {label}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Focus Score Bar */}
        <div className="glass rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-lockin-text-muted" />
              <span className="text-sm font-medium">Your Focus</span>
            </div>
            <span className={`text-2xl font-mono font-black bg-gradient-to-r ${getScoreColor(currentFocusScore)} bg-clip-text text-transparent`}>
              {Math.round(currentFocusScore)}%
            </span>
          </div>
          <div className="w-full bg-lockin-bg rounded-full h-4 overflow-hidden">
            <motion.div
              className={`h-4 rounded-full bg-gradient-to-r ${getScoreColor(currentFocusScore)}`}
              animate={{ width: `${currentFocusScore}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <div className="flex items-center gap-1.5 text-xs text-lockin-text-muted">
              <Brain className="w-3 h-3" />
              <span>AI tracking active</span>
              <Sparkles className="w-3 h-3 text-lockin-primary-light" />
            </div>
            <span className="text-xs text-lockin-text-muted">{formatTime(elapsed)} elapsed</span>
          </div>
        </div>

        {/* AI Nudge Display */}
        <AnimatePresence>
          {showNudge && currentNudge && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`glass rounded-xl p-4 ${getNudgeColor(currentNudgeType)}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  currentNudgeType === "competitive" ? "gradient-accent" :
                  currentNudgeType === "supportive" ? "gradient-success" :
                  "gradient-primary"
                }`}>
                  <Brain className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-relaxed">{currentNudge}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Sparkles className="w-3 h-3 text-lockin-primary-light" />
                    <span className="text-xs text-lockin-text-muted">
                      AI Nudge &middot; {currentNudgeType}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* To-Do List */}
        <div className="glass rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTodos(!showTodos)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-lockin-card/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ListTodo className="w-4.5 h-4.5 text-lockin-primary-light" />
              <span className="font-semibold text-sm">Session To-Do</span>
              {todos.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-lockin-primary/20 text-lockin-primary-light">
                  {completedTodos}/{todos.length}
                </span>
              )}
            </div>
            {showTodos ? <ChevronUp className="w-4 h-4 text-lockin-text-muted" /> : <ChevronDown className="w-4 h-4 text-lockin-text-muted" />}
          </button>

          <AnimatePresence>
            {showTodos && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 space-y-2">
                  {/* Add todo input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTodo()}
                      className="flex-1 px-3 py-2.5 bg-lockin-bg border border-lockin-border rounded-lg text-sm text-lockin-text placeholder-lockin-text-muted/50 focus-ring"
                      placeholder="What do you need to get done?"
                    />
                    <button
                      onClick={addTodo}
                      disabled={!newTodo.trim()}
                      className="px-3 py-2.5 gradient-primary rounded-lg text-white disabled:opacity-30 transition-opacity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Todo items */}
                  {todos.length === 0 ? (
                    <p className="text-xs text-lockin-text-muted text-center py-3">
                      Add tasks to track what you&apos;re working on this session
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                      {todos.map((todo) => (
                        <motion.div
                          key={todo.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2.5 group"
                        >
                          <button
                            onClick={() => toggleTodo(todo.id)}
                            className="shrink-0 text-lockin-text-muted hover:text-lockin-primary transition-colors"
                          >
                            {todo.done ? (
                              <CheckSquare className="w-4.5 h-4.5 text-lockin-success" />
                            ) : (
                              <Square className="w-4.5 h-4.5" />
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${
                            todo.done ? "line-through text-lockin-text-muted/50" : "text-lockin-text"
                          }`}>
                            {todo.text}
                          </span>
                          <button
                            onClick={() => removeTodo(todo.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 text-lockin-text-muted hover:text-lockin-danger transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Progress bar */}
                  {todos.length > 0 && (
                    <div className="pt-2">
                      <div className="w-full bg-lockin-bg rounded-full h-1.5">
                        <div
                          className="gradient-success h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${(completedTodos / todos.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Nudges History */}
        {nudges.length > 0 && !showNudge && (
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-medium text-lockin-text-muted mb-3 flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" />
              AI Nudge History
              <Sparkles className="w-3 h-3 text-lockin-primary-light" />
            </h3>
            <div className="space-y-2">
              {nudges.slice(0, 3).map((nudge) => (
                <div key={nudge.id} className="text-sm text-lockin-text-muted bg-lockin-bg rounded-lg px-3 py-2 flex items-start gap-2">
                  <Brain className="w-3 h-3 mt-0.5 shrink-0 text-lockin-primary-light" />
                  {nudge.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="flex items-center justify-center gap-2 text-xs text-lockin-text-muted/50">
          <Eye className="w-3 h-3" />
          <span>Camera processing happens entirely on your device. No video is transmitted.</span>
        </div>
      </main>

      {/* End Session Button */}
      <div className="sticky bottom-0 glass px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleLeaveSession}
            disabled={leaving}
            className="w-full py-3.5 bg-lockin-card border border-lockin-border rounded-xl text-lockin-text font-semibold hover:bg-lockin-danger/20 hover:border-lockin-danger/50 hover:text-lockin-danger transition-all flex items-center justify-center gap-2"
          >
            {leaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                End Session
              </>
            )}
          </button>
        </div>
      </div>

      {/* About LockIn Modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
            onClick={() => setShowAbout(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto scrollbar-hide"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">About LockIn</h2>
                    <p className="text-xs text-lockin-text-muted">v1.0 &middot; Hack The East 2026</p>
                  </div>
                </div>
                <button onClick={() => setShowAbout(false)} className="p-1.5 rounded-lg hover:bg-lockin-card text-lockin-text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-lockin-text-muted leading-relaxed">
                  <strong className="text-lockin-text">LockIn</strong> is an AI-powered social study platform where friend groups commit to focus sessions together. We use on-device attention tracking and smart accountability nudges to turn procrastination into productivity.
                </p>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-lockin-text-muted">How It Works</h3>

                  <div className="bg-lockin-bg rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white">1</div>
                    <div>
                      <p className="text-sm font-medium">Create or Join a Squad</p>
                      <p className="text-xs text-lockin-text-muted mt-0.5">Invite your study friends with a simple code. Your squad is your accountability group.</p>
                    </div>
                  </div>

                  <div className="bg-lockin-bg rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 gradient-success rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white">2</div>
                    <div>
                      <p className="text-sm font-medium">Lock In Together</p>
                      <p className="text-xs text-lockin-text-muted mt-0.5">See when friends are studying in real-time. One tap to join their session. No coordination friction.</p>
                    </div>
                  </div>

                  <div className="bg-lockin-bg rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 gradient-accent rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white">3</div>
                    <div>
                      <p className="text-sm font-medium">AI Keeps You Focused</p>
                      <p className="text-xs text-lockin-text-muted mt-0.5">On-device computer vision detects when you drift. Smart nudges use your squad&apos;s status to pull you back — all processed locally, never uploaded.</p>
                    </div>
                  </div>

                  <div className="bg-lockin-bg rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 bg-lockin-card rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-lockin-primary-light">4</div>
                    <div>
                      <p className="text-sm font-medium">Track & Improve</p>
                      <p className="text-xs text-lockin-text-muted mt-0.5">ML analyzes your patterns to find optimal study partners, times, and group sizes. Session summaries show your focus score, squad ranking, and streaks.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-lockin-text-muted">AI & Privacy</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-lockin-bg rounded-xl p-3 text-center">
                      <div className="text-lg font-black text-gradient">0</div>
                      <div className="text-[10px] text-lockin-text-muted">bytes uploaded</div>
                    </div>
                    <div className="bg-lockin-bg rounded-xl p-3 text-center">
                      <div className="text-lg font-black text-gradient">100%</div>
                      <div className="text-[10px] text-lockin-text-muted">on-device AI</div>
                    </div>
                    <div className="bg-lockin-bg rounded-xl p-3 text-center">
                      <div className="text-lg font-black text-gradient">3</div>
                      <div className="text-[10px] text-lockin-text-muted">AI layers</div>
                    </div>
                  </div>
                  <p className="text-xs text-lockin-text-muted leading-relaxed">
                    LockIn uses <strong>MediaPipe Face Mesh</strong> for gaze tracking, <strong>MiniMax M2.5</strong> for contextual nudge generation, and <strong>scikit-learn</strong> for productivity pattern analysis. Camera processing runs entirely in your browser via WebAssembly.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-lockin-text-muted">Tech Stack</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ["Frontend", "Next.js + React"],
                      ["Real-time", "Socket.IO"],
                      ["Edge AI", "MediaPipe + TF.js"],
                      ["Backend", "FastAPI + PostgreSQL"],
                      ["NLP", "MiniMax M2.5"],
                      ["ML", "scikit-learn"],
                    ].map(([label, tech]) => (
                      <div key={label} className="bg-lockin-bg rounded-lg px-3 py-2">
                        <span className="text-lockin-text-muted">{label}</span>
                        <span className="text-lockin-text ml-1.5 font-medium">{tech}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-lockin-border">
                  <p className="text-xs text-center text-lockin-text-muted">
                    Built for <strong>Hack The East 2026</strong>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-lockin-bg flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-lockin-primary" /></div>}>
      <SessionContent />
    </Suspense>
  );
}
