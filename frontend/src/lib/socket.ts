import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(userId: number, username: string, displayName: string, squadIds: number[]) {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.on("connect", () => {
      s.emit("register", {
        user_id: userId,
        username,
        display_name: displayName,
        squad_ids: squadIds,
      });
    });
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
