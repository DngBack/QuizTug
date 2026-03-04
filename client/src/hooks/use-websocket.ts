import { useEffect, useRef, useCallback, useState } from "react";
import type { WSMessage } from "@shared/schema";

type MessageHandler = (message: WSMessage) => void;

export function useWebSocket(roomId: string | null, playerId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!roomId || !playerId || !mountedRef.current) return;

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?roomId=${roomId}&playerId=${playerId}`);

    ws.onopen = () => {
      if (mountedRef.current) {
        setIsConnected(true);
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        handlersRef.current.forEach(handler => {
          try {
            handler(message);
          } catch (e) {
            console.error("WS handler error:", e);
          }
        });
      } catch (e) {
        console.error("Failed to parse WS message:", e);
      }
    };

    ws.onclose = () => {
      if (mountedRef.current) {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, 2000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [roomId, playerId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const addMessageHandler = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return { isConnected, sendMessage, addMessageHandler };
}
