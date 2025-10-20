import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://task-manager-api-dev.benjiemalinao879557.workers.dev';

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system';
}

interface OnlineUser {
  userId: string;
  userName: string;
  joinedAt: number;
}

interface ChatState {
  messages: Message[];
  onlineUsers: OnlineUser[];
  isConnected: boolean;
  sendMessage: (content: string) => void;
  sendTypingIndicator: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds

export function useChatWebSocket(workspaceId: string | null): ChatState {
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  const connect = useCallback(() => {
    if (!workspaceId || !user) {
      console.log('Chat: Waiting for workspace and user...', { workspaceId, user: !!user });
      return;
    }

    // Get token first to check if we should proceed
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('Chat: No auth token found in localStorage');
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      // Clean up existing connection properly
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;

      if (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'Reconnecting');
      }
      wsRef.current = null;
    }

    try {
      console.log('Chat: Attempting to connect to workspace:', workspaceId);

      // Convert HTTP URL to WebSocket URL
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
      // Pass token as query parameter (WebSocket can't use Authorization header in browsers)
      const url = `${wsUrl}/api/chat/workspace/${workspaceId}/connect?token=${encodeURIComponent(token)}`;

      console.log('Chat: Connecting to:', url.replace(/token=[^&]+/, 'token=***'));

      const ws = new WebSocket(url);

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('Chat: Connection timeout');
          ws.close(1000, 'Connection timeout');
        }
      }, CONNECTION_TIMEOUT);

      ws.addEventListener('open', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        // Send ping every 30 seconds to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      });

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'history':
              setMessages(data.messages || []);
              break;

            case 'new_message':
              setMessages(prev => [...prev, data.message]);
              break;

            case 'online_users':
              setOnlineUsers(data.onlineUsers || []);
              break;

            case 'user_joined':
              setOnlineUsers(data.onlineUsers || []);
              // Optionally show a system message
              break;

            case 'user_left':
              setOnlineUsers(data.onlineUsers || []);
              break;

            case 'typing':
              // Handle typing indicator if needed
              break;

            case 'pong':
              // Received pong response
              break;

            case 'error':
              console.error('Chat error:', data.message);
              break;

            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      });

      ws.addEventListener('close', (event) => {
        console.log('WebSocket closed', { code: event.code, reason: event.reason });
        setIsConnected(false);
        wsRef.current = null;

        // Clean up intervals and timeouts
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        // Don't reconnect if close was intentional (code 1000)
        if (event.code === 1000 && event.reason === 'Reconnecting') {
          return;
        }

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY
          );
          console.log(`Chat: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('Chat: Max reconnection attempts reached. Please refresh the page.');
        }
      });

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, [workspaceId, user]);

  useEffect(() => {
    connect();

    return () => {
      // Clean up all timers and intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      // Close WebSocket connection properly
      if (wsRef.current) {
        // Remove event listeners to prevent memory leaks
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;

        if (wsRef.current.readyState === WebSocket.OPEN ||
            wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close(1000, 'Component unmounting');
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content
      }));
    }
  }, []);

  const sendTypingIndicator = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing'
      }));
    }
  }, []);

  return {
    messages,
    onlineUsers,
    isConnected,
    sendMessage,
    sendTypingIndicator
  };
}
