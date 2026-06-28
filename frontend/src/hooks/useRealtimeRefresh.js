import { useEffect } from "react";
import { realtimeEvents } from "../socket/socketEvents";
import { useSocket } from "./useSocket";

function useRealtimeRefresh(callback, events = realtimeEvents) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !callback) {
      return undefined;
    }

    events.forEach((eventName) => {
      socket.on(eventName, callback);
    });

    return () => {
      events.forEach((eventName) => {
        socket.off(eventName, callback);
      });
    };
  }, [socket, callback, events]);
}

export { useRealtimeRefresh };
