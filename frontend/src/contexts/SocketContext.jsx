import { createContext, useEffect } from "react";
import { connectSocket, disconnectSocket, getSocket, syncSocketAuth } from "../socket/socketClient";
import { useAuth } from "../hooks/useAuth";
import { getStoredToken } from "../utils/storage";

const SocketContext = createContext(null);

function SocketProvider({ children }) {
  const { user } = useAuth();
  const socket = getSocket();

  useEffect(() => {
    syncSocketAuth(getStoredToken());
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, [socket, user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export { SocketContext, SocketProvider };
