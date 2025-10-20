import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://task-manager-api-dev.workoto-llc.workers.dev';

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

export function useChatWebSocket(workspaceId: string | null): ChatState {
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const { user } = useAuth();

  const connect = useCallback(() => {
    if (!workspaceId || !user) {
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      // Get WebSocket URL from API
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      // Convert HTTP URL to WebSocket URL
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
      const url = `${wsUrl}/api/chat/workspace/${workspaceId}/connect`;

      const ws = new WebSocket(url);

      // Add authorization token
      ws.addEventListener('open', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Send auth token
        ws.send(JSON.stringify({
          type: 'auth',
          token: token
        }));

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        ws.addEventListener('close', () => {
          clearInterval(pingInterval);
        });
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

      ws.addEventListener('close', () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
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
