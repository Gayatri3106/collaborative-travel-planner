import { useEffect, useRef, useState } from "react";

export interface WSMessage {
  type: string;
  payload: any;
}

export function useWebSocket(
  tripId: string | undefined,
  userId: string | undefined,
  onItineraryUpdate: () => void,
  onChatMessage: (message: any) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!tripId || !userId) return;

    let reconnectAttempts = 0;

    const connect = () => {
      // Dynamic WS endpoint mapping directly to host port -> no hardcoding!
      const isSecure = window.location.protocol === "https:";
      const wsUrl = `${isSecure ? "wss:" : "ws:"}//${window.location.host}/ws`;

      console.log(`Connecting to WebSocket: ${wsUrl}`);
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected. Sending subscribe packet.");
        setIsConnected(true);
        reconnectAttempts = 0;

        // Send subscribe handshake
        socket.send(
          JSON.stringify({
            type: "SUBSCRIBE",
            payload: { tripId, userId },
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          console.log("WS Client received packet style:", msg.type);

          switch (msg.type) {
            case "ONLINE_MEMBERS":
              if (msg.payload && msg.payload.onlineUserIds) {
                setOnlineUserIds(msg.payload.onlineUserIds);
              }
              break;

            case "CHAT_RECEIVE":
              onChatMessage(msg.payload);
              break;

            case "ITINERARY_LOAD":
              onItineraryUpdate();
              break;

            default:
              console.warn("Unrecognized WS packet type on browser client:", msg.type);
          }
        } catch (err) {
          console.error("Failed to parse incoming WS text payload:", err);
        }
      };

      socket.onclose = (e) => {
        console.warn(`WebSocket connection closed: Code ${e.code}. Initiating retry.`);
        setIsConnected(false);
        setOnlineUserIds([]);

        // Exponential backoff reconnect retry
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        reconnectAttempts++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      socket.onerror = (err) => {
        console.error("WebSocket socket network failure witnessed:", err);
        socket.close();
      };
    };

    connect();

    // Cleanup active sockets on unmount or trip change
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [tripId, userId]);

  // Expose a helper to blast custom edits, moves or chat messages manually
  const sendMessage = (type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.error("Cannot send WS block. Real-time WebSocket not currently active.");
    }
  };

  return {
    onlineUserIds,
    isConnected,
    sendMessage,
  };
}
