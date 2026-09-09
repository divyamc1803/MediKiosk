import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
  request?: any;
  timestamp?: string;
  [key: string]: any;
}

function getWebSocketUrl(channel: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  // Vite proxies /api to FastAPI during development. In a production build,
  // use the same host unless VITE_API_HOST is explicitly supplied.
  const apiHost = (window as any).__MEDIKIOSK_WS_HOST__?.trim?.();
  const hostWithPort = apiHost || (window.location.port === '5173' ? `${host}:8000` : window.location.host);

  if (channel.startsWith('ambulance_')) {
    return `${protocol}//${hostWithPort}/api/ambulance/ws/${encodeURIComponent(channel.slice('ambulance_'.length))}`;
  }
  return `${protocol}//${hostWithPort}/api/ambulance/ws/channel/${encodeURIComponent(channel)}`;
}

export function useWebSocket(channel: string | null) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!channel) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = getWebSocketUrl(channel);
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        if (reconnectRef.current) clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          setMessages(prev => [...prev, { ...msg, timestamp: msg.timestamp || new Date().toISOString() }]);
        } catch {
          setMessages(prev => [...prev, { type: 'raw', data: event.data, timestamp: new Date().toISOString() }]);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (channel) reconnectRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => ws.close();
    } catch {
      reconnectRef.current = setTimeout(connect, 2000);
    }
  }, [channel]);

  useEffect(() => {
    setMessages([]);
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    };
  }, [connect]);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(data));
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);
  return { messages, isConnected, sendMessage, clearMessages };
}
