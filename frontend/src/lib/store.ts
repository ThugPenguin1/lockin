import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_online: boolean;
  current_session_id: number | null;
  total_focus_minutes: number;
  current_streak: number;
  longest_streak: number;
}

interface Squad {
  id: number;
  name: string;
  invite_code: string;
  owner_id: number;
  description: string;
  avatar_emoji: string;
  members: User[];
  active_session_count: number;
}

interface Participant {
  user: User;
  focus_score: number;
  total_focus_seconds: number;
  is_active: boolean;
  joined_at: string;
  status_label: string;
}

interface FocusSession {
  id: number;
  squad_id: number;
  started_by: number;
  started_at: string;
  is_active: boolean;
  session_type: string;
  participants: Participant[];
}

interface Nudge {
  id: number;
  message: string;
  nudge_type: string;
  timestamp: string;
}

interface AppState {
  token: string | null;
  user: User | null;
  squads: Squad[];
  activeSession: FocusSession | null;
  currentFocusScore: number;
  nudges: Nudge[];
  isAttentionTrackingEnabled: boolean;
  isCameraActive: boolean;

  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setSquads: (squads: Squad[]) => void;
  addSquad: (squad: Squad) => void;
  setActiveSession: (session: FocusSession | null) => void;
  updateParticipant: (userId: number, data: Partial<Participant>) => void;
  setFocusScore: (score: number) => void;
  addNudge: (nudge: Nudge) => void;
  clearNudges: () => void;
  setAttentionTracking: (enabled: boolean) => void;
  setCameraActive: (active: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      squads: [],
      activeSession: null,
      currentFocusScore: 100,
      nudges: [],
      isAttentionTrackingEnabled: true,
      isCameraActive: false,

      setAuth: (token, user) => set({ token, user }),
      logout: () => set({
        token: null,
        user: null,
        squads: [],
        activeSession: null,
        currentFocusScore: 100,
        nudges: [],
      }),
      setSquads: (squads) => set({ squads }),
      addSquad: (squad) => set((s) => ({ squads: [...s.squads, squad] })),
      setActiveSession: (session) => set({ activeSession: session }),
      updateParticipant: (userId, data) =>
        set((s) => {
          if (!s.activeSession) return s;
          const participants = s.activeSession.participants.map((p) =>
            p.user.id === userId ? { ...p, ...data } : p
          );
          return { activeSession: { ...s.activeSession, participants } };
        }),
      setFocusScore: (score) => set({ currentFocusScore: score }),
      addNudge: (nudge) => set((s) => ({ nudges: [nudge, ...s.nudges].slice(0, 10) })),
      clearNudges: () => set({ nudges: [] }),
      setAttentionTracking: (enabled) => set({ isAttentionTrackingEnabled: enabled }),
      setCameraActive: (active) => set({ isCameraActive: active }),
    }),
    {
      name: "lockin-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAttentionTrackingEnabled: state.isAttentionTrackingEnabled,
      }),
    }
  )
);
