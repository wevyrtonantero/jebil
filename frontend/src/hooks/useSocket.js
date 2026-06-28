import { useContext } from "react";
import { SocketContext } from "../contexts/SocketContext";

function useSocket() {
  return useContext(SocketContext);
}

export { useSocket };
