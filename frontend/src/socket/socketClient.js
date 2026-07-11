import { io } from "socket.io-client";
import { resolveSocketUrl } from "../utils/apiUrls";
import { getStoredToken } from "../utils/storage";

let socketInstance = null;

function ensureSocket() {
  if (!socketInstance) {
    socketInstance = io(resolveSocketUrl(), {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  return socketInstance;
}

function getSocket() {
  const socket = ensureSocket();
  syncSocketAuth(getStoredToken());
  return socket;
}

function syncSocketAuth(token) {
  const socket = ensureSocket();

  socket.auth = token ? { token } : {};
}

function connectSocket() {
  ensureSocket().connect();
}

function disconnectSocket() {
  ensureSocket().disconnect();
}

export { connectSocket, disconnectSocket, getSocket, syncSocketAuth };
