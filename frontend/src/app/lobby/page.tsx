"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, LogOut, Plus, Users, Copy, Check, Settings,
  TrendingUp, Clock, Flame, ChevronRight, Eye, Loader2,
  Info, X, Brain, Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { squadAPI, sessionAPI, analyticsAPI } from "@/lib/api";
import { connectSocket, getSocket } from "@/lib/socket";
import { useHydration } from "@/hooks/useHydration";
import { toast } from "sonner";

export default function LobbyPage() {
  const router = useRouter();
  const hydrated = useHydration();
  const {
    token, user, squads, setSquads, setActiveSession,
    logout, addSquad,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [activeSessions, setActiveSessions] = useState<Record<number, any[]>>({});
  const [dashboard, setDashboard] = useState<any>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [joiningSession, setJoiningSession] = useState<number | null>(null);
  const [startingSession, setStartingSession] = useState<number | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [squadData, dashData] = await Promise.all([
        squadAPI.getMySquads(token),
        analyticsAPI.getDashboard(token).catch(() => null),
      ]);
      setSquads(squadData);
      setDashboard(dashData);

      const sessionMap: Record<number, any[]> = {};
      await Promise.all(
        squadData.map(async (squad: any) => {
          try {
            const sessions = await sessionAPI.getActiveSessions(token, squad.id);
            sessionMap[squad.id] = sessions;
          } catch {
            sessionMap[squad.id] = [];
          }
        })
      );
      setActiveSessions(sessionMap);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, setSquads]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !user) {
      router.push("/auth");
      return;
    }
    loadData();
  }, [hydrated, token, user, router, loadData]);

  useEffect(() => {
    if (!user || squads.length === 0) return;
    const socket = connectSocket(
      user.id,
      user.username,
      user.display_name,
      squads.map((s) => s.id)
    );

    socket.on("new_session", () => loadData());
    socket.on("participant_joined", () => loadData());
    socket.on("participant_left", () => loadData());
    socket.on("member_online", () => loadData());
    socket.on("member_offline", () => loadData());

    return () => {
      socket.off("new_session");
      socket.off("participant_joined");
      socket.off("participant_left");
      socket.off("member_online");
      socket.off("member_offline");
    };
  }, [user, squads, loadData]);

  const handleStartSession = async (squadId: number) => {
    if (!token) return;
    setStartingSession(squadId);
    try {
      const session = await sessionAPI.create(token, { squad_id: squadId });
      setActiveSession(session);
      getSocket().emit("session_started", {
        session_id: session.id,
        squad_id: squadId,
      });
      getSocket().emit("join_focus_session", {
        session_id: session.id,
        squad_id: squadId,
      });
      router.push(`/session?id=${session.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setStartingSession(null);
    }
  };

  const handleJoinSession = async (sessionId: number, squadId: number) => {
    if (!token) return;
    setJoiningSession(sessionId);
    try {
      await sessionAPI.join(token, sessionId);
      const session = await sessionAPI.getSession(token, sessionId);
      setActiveSession(session);
      getSocket().emit("join_focus_session", {
        session_id: sessionId,
        squad_id: squadId,
      });
      router.push(`/session?id=${sessionId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setJoiningSession(null);
    }
  };

  const handleJoinSquad = async () => {
    if (!token || !joinCode.trim()) return;
    try {
      const squad = await squadAPI.join(token, joinCode.trim());
      addSquad(squad);
      setShowJoinModal(false);
      setJoinCode("");
      toast.success(`Joined ${squad.name}!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalActiveMembers = Object.values(activeSessions).reduce(
    (acc, sessions) => acc + sessions.reduce((a, s) =>
      a + s.participants.filter((p: any) => p.is_active && p.user.id !== user?.id).length,
    0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-lockin-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-lockin-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lockin-bg">
      <nav className="sticky top-0 z-50 glass">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">LockIn</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAbout(true)}
              className="p-2 rounded-lg hover:bg-lockin-card transition-colors text-lockin-text-muted hover:text-white"
              title="About LockIn"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="p-2 rounded-lg hover:bg-lockin-card transition-colors text-lockin-text-muted hover:text-white"
              title="Join squad"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="p-2 rounded-lg hover:bg-lockin-card transition-colors text-lockin-text-muted hover:text-white"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* FOMO Banner */}
        {totalActiveMembers > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="gradient-primary rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {totalActiveMembers} {totalActiveMembers === 1 ? "friend is" : "friends are"} locked in right now
                </p>
                <p className="text-sm text-white/70">Don&apos;t get left behind!</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </motion.div>
        )}

        {/* Stats Bar */}
        {dashboard && (
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-lockin-primary-light">{dashboard.total_focus_hours}h</div>
              <div className="text-xs text-lockin-text-muted mt-1">Total Focus</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-lockin-secondary">{dashboard.current_streak}</div>
              <div className="text-xs text-lockin-text-muted mt-1">Day Streak</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-lockin-accent">{dashboard.avg_focus_score}%</div>
              <div className="text-xs text-lockin-text-muted mt-1">Avg Score</div>
            </div>
          </div>
        )}

        {/* Squad List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Your Squads</h2>
            <button
              onClick={() => router.push("/onboarding")}
              className="text-sm text-lockin-primary-light hover:text-lockin-primary flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Squad
            </button>
          </div>

          {squads.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Users className="w-12 h-12 text-lockin-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No squads yet</h3>
              <p className="text-lockin-text-muted text-sm mb-6">Create a squad or join one with an invite code</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push("/onboarding")}
                  className="px-4 py-2 gradient-primary rounded-lg text-white text-sm font-medium"
                >
                  Create Squad
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2 glass rounded-lg text-sm font-medium"
                >
                  Join Squad
                </button>
              </div>
            </div>
          ) : (
            squads.map((squad) => (
              <motion.div
                key={squad.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-lockin-bg flex items-center justify-center text-xl">
                        {squad.avatar_emoji}
                      </div>
                      <div>
                        <h3 className="font-semibold">{squad.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-lockin-text-muted">
                          <Users className="w-3.5 h-3.5" />
                          {squad.members.length} members
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyCode(squad.invite_code)}
                        className="flex items-center gap-1 px-2 py-1 text-xs glass rounded-lg text-lockin-text-muted hover:text-white transition-colors"
                        title="Copy invite code"
                      >
                        {copiedCode === squad.invite_code ? (
                          <Check className="w-3 h-3 text-lockin-success" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {squad.invite_code}
                      </button>
                    </div>
                  </div>

                  {/* Members Status */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {squad.members.map((member) => {
                      const isInSession = activeSessions[squad.id]?.some((s) =>
                        s.participants.some((p: any) => p.user.id === member.id && p.is_active)
                      );
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lockin-bg text-sm"
                        >
                          <div className={`w-2 h-2 rounded-full ${isInSession ? "bg-lockin-success animate-pulse" : "bg-lockin-text-muted/30"}`} />
                          <span className={isInSession ? "text-white" : "text-lockin-text-muted"}>
                            {member.display_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Sessions */}
                  {activeSessions[squad.id]?.map((session) => (
                    <div key={session.id} className="bg-lockin-bg rounded-xl p-4 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-lockin-success animate-pulse" />
                          <span className="text-sm font-medium">Active Session</span>
                          <span className="text-xs text-lockin-text-muted">
                            {session.participants.filter((p: any) => p.is_active).length} studying
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {session.participants
                          .filter((p: any) => p.is_active)
                          .map((p: any) => (
                            <div
                              key={p.user.id}
                              className="flex items-center gap-2 px-3 py-2 glass rounded-lg"
                            >
                              <div className="w-6 h-6 rounded-full gradient-success flex items-center justify-center text-xs font-bold">
                                {p.user.display_name[0]}
                              </div>
                              <div>
                                <div className="text-xs font-medium">{p.user.display_name}</div>
                                <div className={`text-xs ${
                                  p.status_label === "On fire" ? "text-lockin-accent" :
                                  p.status_label === "Focused" ? "text-lockin-success" :
                                  "text-lockin-warning"
                                }`}>
                                  {p.status_label}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                      <button
                        onClick={() => handleJoinSession(session.id, squad.id)}
                        disabled={joiningSession === session.id}
                        className="w-full py-2.5 gradient-success rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {joiningSession === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            Join Session
                          </>
                        )}
                      </button>
                    </div>
                  ))}

                  {/* Start Session Button */}
                  {(!activeSessions[squad.id] || activeSessions[squad.id].length === 0) && (
                    <button
                      onClick={() => handleStartSession(squad.id)}
                      disabled={startingSession === squad.id}
                      className="w-full py-3 gradient-primary rounded-xl text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 animate-glow"
                    >
                      {startingSession === squad.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          Lock In Now
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

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
                  <strong className="text-lockin-text">LockIn</strong> is an AI-powered social study platform where friend groups commit to focus sessions together. We weaponize FOMO to turn procrastination into productivity.
                </p>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-lockin-text-muted">How It Works</h3>
                  <div className="bg-lockin-bg rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white">1</div>
                    <div>
                      <p className="text-sm font-medium">Create or Join a Squad</p>
                      <p className="text-xs text-lockin-text-muted mt-0.5">Invite your study friends with a simple code.</p>
                    </div>
                  </div>
                  <div className="bg-lockin-bg rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 gradient-success rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white">2</div>
                    <div>
                      <p className="text-sm font-medium">Lock In Together</p>
                      <p className="text-xs text-lockin-text-muted mt-0.5">See when friends are studying. One tap to join. Zero coordination friction.</p>
                    </div>
                  </div>
                  <div className="bg-lockin-bg rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 gradient-accent rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white">3</div>
                    <div>
                      <p className="text-sm font-medium">AI Keeps You Focused</p>
                      <p className="text-xs text-lockin-text-muted mt-0.5">On-device attention tracking detects when you drift. Smart nudges pull you back.</p>
                    </div>
                  </div>
                  <div className="bg-lockin-bg rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 bg-lockin-card rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-lockin-primary-light">4</div>
                    <div>
                      <p className="text-sm font-medium">Track & Improve</p>
                      <p className="text-xs text-lockin-text-muted mt-0.5">ML finds your optimal study partners, times, and group sizes.</p>
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
                    <strong>Edge AI:</strong> MediaPipe Face Mesh for gaze tracking. <strong>NLP:</strong> MiniMax M2.5 for contextual nudges. <strong>ML:</strong> scikit-learn for productivity pattern analysis. All camera processing runs in-browser via WebAssembly.
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

      {/* Join Squad Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={() => setShowJoinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 w-full max-w-sm"
            >
              <h2 className="text-lg font-bold mb-4">Join a Squad</h2>
              <p className="text-sm text-lockin-text-muted mb-4">Enter the invite code from your friend</p>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-lockin-bg border border-lockin-border rounded-xl text-lockin-text placeholder-lockin-text-muted/50 focus-ring font-mono uppercase tracking-wider text-center text-lg mb-4"
                placeholder="INVITE CODE"
                maxLength={8}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2.5 glass rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinSquad}
                  className="flex-1 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold"
                >
                  Join
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
