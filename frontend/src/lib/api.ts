const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";

type FetchOptions = RequestInit & { token?: string };

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${API_PREFIX}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export const authAPI = {
  register: (data: { email: string; username: string; display_name: string; password: string }) =>
    apiFetch<{ access_token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    apiFetch<{ access_token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: (token: string) =>
    apiFetch<any>("/auth/me", { token }),
};

export const squadAPI = {
  create: (token: string, data: { name: string; description?: string; avatar_emoji?: string }) =>
    apiFetch<any>("/squads/", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  getMySquads: (token: string) =>
    apiFetch<any[]>("/squads/", { token }),

  join: (token: string, invite_code: string) =>
    apiFetch<any>("/squads/join", {
      method: "POST",
      body: JSON.stringify({ invite_code }),
      token,
    }),

  getSquad: (token: string, squadId: number) =>
    apiFetch<any>(`/squads/${squadId}`, { token }),

  getMembers: (token: string, squadId: number) =>
    apiFetch<any[]>(`/squads/${squadId}/members`, { token }),
};

export const sessionAPI = {
  create: (token: string, data: { squad_id: number; session_type?: string }) =>
    apiFetch<any>("/sessions/", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  join: (token: string, sessionId: number) =>
    apiFetch<any>(`/sessions/${sessionId}/join`, {
      method: "POST",
      token,
    }),

  leave: (token: string, sessionId: number) =>
    apiFetch<any>(`/sessions/${sessionId}/leave`, {
      method: "POST",
      token,
    }),

  getSession: (token: string, sessionId: number) =>
    apiFetch<any>(`/sessions/${sessionId}`, { token }),

  getActiveSessions: (token: string, squadId: number) =>
    apiFetch<any[]>(`/sessions/squad/${squadId}/active`, { token }),

  updateAttention: (token: string, data: {
    session_id: number;
    attention_score: number;
    is_focused: boolean;
    gaze_x?: number;
    gaze_y?: number;
    head_pitch?: number;
    head_yaw?: number;
  }) =>
    apiFetch<{ focus_score: number; nudge: any | null }>("/sessions/attention", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  getSummary: (token: string, sessionId: number) =>
    apiFetch<any>(`/sessions/${sessionId}/summary`, { token }),
};

export const analyticsAPI = {
  getDashboard: (token: string) =>
    apiFetch<any>("/analytics/dashboard", { token }),

  getHistory: (token: string, limit = 20) =>
    apiFetch<any[]>(`/analytics/session-history?limit=${limit}`, { token }),
};

export const mlAPI = {
  getRecommendations: (token: string) =>
    apiFetch<any>("/ml/recommendations", { token }),

  predict: (token: string, hour: number, groupSize: number) =>
    apiFetch<any>(`/ml/predict?hour=${hour}&group_size=${groupSize}`, { token }),
};
